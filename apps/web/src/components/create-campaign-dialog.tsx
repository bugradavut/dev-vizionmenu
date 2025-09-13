"use client"

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Plus, Tag, CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'

// Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import toast from 'react-hot-toast'

// Contexts & Utils
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'

// Services
import { campaignsService, MenuCategory, MenuItem } from '@/services/campaigns.service'

// Types
import { CreateCampaignData } from '@/types/campaign'

// Form validation schema
const createCampaignSchema = z.object({
  code: z.string()
    .min(3, 'Code must be at least 3 characters')
    .max(20, 'Code must be 20 characters or less')
    .regex(/^[A-Z0-9]+$/, 'Code can only contain uppercase letters and numbers'),
  type: z.enum(['percentage', 'fixed_amount']),
  value: z.number()
    .min(0.01, 'Value must be greater than 0')
    .refine((val) => val <= 100, {
      message: 'Percentage cannot exceed 100%'
    }),
  validFrom: z.string().optional(),
  validUntil: z.string().min(1, 'Valid until date is required'),
  applicableCategories: z.array(z.string()).optional(),
  applicableItems: z.array(z.string()).optional(),
  allCategories: z.boolean(),
  allItems: z.boolean()
})

type CreateCampaignFormData = z.infer<typeof createCampaignSchema>

interface CreateCampaignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateCampaignDialog({ open, onOpenChange, onSuccess }: CreateCampaignDialogProps) {
  const { language } = useLanguage()
  const t = translations[language] || translations.en

  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [items, setItems] = useState<MenuItem[]>([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [validFromDate, setValidFromDate] = useState<Date>()
  const [validUntilDate, setValidUntilDate] = useState<Date>()
  const [showValidFromCalendar, setShowValidFromCalendar] = useState(false)
  const [showValidUntilCalendar, setShowValidUntilCalendar] = useState(false)
  const validFromRef = useRef<HTMLDivElement>(null)
  const validUntilRef = useRef<HTMLDivElement>(null)


  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
    reset
  } = useForm<CreateCampaignFormData>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: {
      allCategories: true,
      allItems: true,
      applicableCategories: [],
      applicableItems: [],
      validFrom: new Date().toISOString().split('T')[0]
    }
  })

  const watchedType = watch('type')
  const watchedValue = watch('value')
  const watchedAllCategories = watch('allCategories')
  const watchedAllItems = watch('allItems')

  // Fetch menu categories and items
  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        try {
          // Fetch categories
          const categoriesResponse = await campaignsService.getCategories()
          const activeCategories = categoriesResponse.data?.filter((cat: MenuCategory) => cat.is_active) || []
          setCategories(activeCategories)
          
          // Fetch menu items
          const itemsResponse = await campaignsService.getMenuItems()
          const availableItems = itemsResponse.data?.filter((item: MenuItem) => item.is_available) || []
          setItems(availableItems)
        } catch (error) {
          console.error('Failed to fetch data:', error)
        } finally {
          setLoadingCategories(false)
          setLoadingItems(false)
        }
      }

      fetchData()
    }
  }, [open])

  // Validate percentage when type changes
  useEffect(() => {
    if (watchedType === 'percentage' && watchedValue > 100) {
      setValue('value', 100)
    }
  }, [watchedType, watchedValue, setValue])


  // Close calendars when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (validFromRef.current && !validFromRef.current.contains(event.target as Node)) {
        setShowValidFromCalendar(false)
      }
      if (validUntilRef.current && !validUntilRef.current.contains(event.target as Node)) {
        setShowValidUntilCalendar(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      reset()
      setValidFromDate(undefined)
      setValidUntilDate(undefined)
      setShowValidFromCalendar(false)
      setShowValidUntilCalendar(false)
      setLoadingCategories(true)
      setLoadingItems(true)
    }
  }, [open, reset])

  const onSubmit = async (data: CreateCampaignFormData) => {
    setIsLoading(true)

    try {
      // Prepare campaign data
      const campaignData: CreateCampaignData = {
        code: data.code.toUpperCase(),
        type: data.type,
        value: data.value,
        valid_until: data.validUntil,
        ...(data.validFrom && { valid_from: data.validFrom }),
        applicable_categories: data.allCategories ? null : data.applicableCategories,
        applicable_items: data.allItems ? null : data.applicableItems
      }

      await campaignsService.createCampaign(campaignData)
      
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error('Create campaign error:', error)
      toast.error(error instanceof Error ? error.message : t.campaigns.createFailed)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate discount preview
  const getDiscountPreview = () => {
    if (!watchedValue || !watchedType) return null
    
    const sampleAmount = 50 // $50 sample order
    if (watchedType === 'percentage') {
      const discount = (sampleAmount * watchedValue) / 100
      return language === 'fr' 
        ? `Exemple: ${discount.toFixed(2)} $ de remise sur une commande de ${sampleAmount} $`
        : `Sample: $${discount.toFixed(2)} off a $${sampleAmount} order`
    } else {
      const discount = Math.min(watchedValue, sampleAmount)
      return language === 'fr'
        ? `Exemple: ${discount.toFixed(2)} $ de remise sur une commande de ${sampleAmount} $`
        : `Sample: $${discount.toFixed(2)} off a $${sampleAmount} order`
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            {t.campaigns.createPageTitle}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            {/* Campaign Code */}
            <div className="space-y-2">
              <Label htmlFor="code">{t.campaigns.campaignCode}</Label>
              <Input
                id="code"
                {...register('code')}
                placeholder={t.campaigns.campaignCodePlaceholder}
                className={errors.code ? 'border-red-500' : ''}
                onChange={(e) => {
                  // Convert to uppercase automatically
                  const value = e.target.value.toUpperCase()
                  setValue('code', value)
                }}
              />
              {errors.code && (
                <p className="text-sm text-red-600">{errors.code.message}</p>
              )}
            </div>

            {/* Campaign Type & Value in a row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">{t.campaigns.campaignType}</Label>
                <Select onValueChange={(value: 'percentage' | 'fixed_amount') => setValue('type', value)}>
                  <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select discount type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{t.campaigns.percentage}</SelectItem>
                    <SelectItem value="fixed_amount">{t.campaigns.fixedAmount}</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-sm text-red-600">{errors.type.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">{t.campaigns.discountValue}</Label>
                <div className="relative">
                  {watchedType === 'percentage' && (
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">%</span>
                  )}
                  {watchedType === 'fixed_amount' && (
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  )}
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={watchedType === 'percentage' ? 100 : undefined}
                    {...register('value', { valueAsNumber: true })}
                    className={`${errors.value ? 'border-red-500' : ''} ${
                      watchedType === 'fixed_amount' ? 'pl-8' : 'pr-8'
                    }`}
                    placeholder={watchedType === 'percentage' ? '20' : '5.00'}
                  />
                </div>
                {errors.value && (
                  <p className="text-sm text-red-600">{errors.value.message}</p>
                )}
                {getDiscountPreview() && (
                  <p className="text-sm text-muted-foreground">{getDiscountPreview()}</p>
                )}
              </div>
            </div>

            {/* Valid Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 relative" ref={validFromRef}>
                <Label>{t.campaigns.validFrom}</Label>
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${!validFromDate && "text-muted-foreground"}`}
                  onClick={() => {
                    setShowValidFromCalendar(!showValidFromCalendar)
                    setShowValidUntilCalendar(false)
                  }}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {validFromDate ? format(validFromDate, "PPP") : 
                    (language === 'fr' ? 'Sélectionner une date' : 'Pick a date')
                  }
                </Button>
                {showValidFromCalendar && (
                  <div className="absolute top-full left-0 z-[9999] mt-1 border rounded-lg bg-popover shadow-lg">
                    <Calendar
                      mode="single"
                      selected={validFromDate}
                      onSelect={(date) => {
                        setValidFromDate(date)
                        setValue('validFrom', date ? format(date, 'yyyy-MM-dd') : '')
                        setShowValidFromCalendar(false)
                      }}
                      className="p-3"
                    />
                  </div>
                )}
                {errors.validFrom && (
                  <p className="text-sm text-red-600">{errors.validFrom.message}</p>
                )}
              </div>
              <div className="space-y-2 relative" ref={validUntilRef}>
                <Label>{t.campaigns.validUntil} *</Label>
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${
                    !validUntilDate && "text-muted-foreground"
                  } ${errors.validUntil ? 'border-red-500' : ''}`}
                  onClick={() => {
                    setShowValidUntilCalendar(!showValidUntilCalendar)
                    setShowValidFromCalendar(false)
                  }}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {validUntilDate ? format(validUntilDate, "PPP") : 
                    (language === 'fr' ? 'Sélectionner une date' : 'Pick a date')
                  }
                </Button>
                {showValidUntilCalendar && (
                  <div className="absolute top-full left-0 z-[9999] mt-1 border rounded-lg bg-popover shadow-lg">
                    <Calendar
                      mode="single"
                      selected={validUntilDate}
                      onSelect={(date) => {
                        setValidUntilDate(date)
                        setValue('validUntil', date ? format(date, 'yyyy-MM-dd') : '')
                        setShowValidUntilCalendar(false)
                      }}
                      disabled={(date) => date < new Date()}
                      className="p-3"
                    />
                  </div>
                )}
                {errors.validUntil && (
                  <p className="text-sm text-red-600">{errors.validUntil.message}</p>
                )}
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-3">
              <Label>{t.campaigns.applicableCategories}</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Switch
                    id="allCategories"
                    checked={watchedAllCategories}
                    onCheckedChange={(checked) => setValue('allCategories', checked)}
                  />
                  <Label htmlFor="allCategories" className="text-sm font-medium">
                    {t.campaigns.allCategories}
                  </Label>
                </div>

                {!watchedAllCategories && (
                  <div className="mt-3 p-4 border border-border rounded-lg bg-muted/30">
                    <p className="text-sm font-medium text-foreground mb-3">
                      {t.campaigns.selectCategories}:
                    </p>
                    <div className="max-h-32 overflow-y-auto space-y-2">
                      {loadingCategories ? (
                        <p className="text-sm text-muted-foreground">Loading categories...</p>
                      ) : categories.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {language === 'fr' ? 'Aucune catégorie trouvée' : 'No categories found'}
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2">
                          {categories.map((category) => (
                            <div key={category.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`category-${category.id}`}
                                onCheckedChange={(checked) => {
                                  const currentCategories = getValues('applicableCategories') || []
                                  if (checked) {
                                    setValue('applicableCategories', [...currentCategories, category.id])
                                  } else {
                                    setValue('applicableCategories', currentCategories.filter(id => id !== category.id))
                                  }
                                }}
                              />
                              <Label htmlFor={`category-${category.id}`} className="text-sm">
                                {category.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3">
              <Label>{language === 'fr' ? 'Articles applicables' : 'Applicable Items'}</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Switch
                    id="allItems"
                    checked={watchedAllItems}
                    onCheckedChange={(checked) => setValue('allItems', checked)}
                  />
                  <Label htmlFor="allItems" className="text-sm font-medium">
                    {language === 'fr' ? 'Tous les articles' : 'All menu items'}
                  </Label>
                </div>

                {!watchedAllItems && (
                  <div className="mt-3 p-4 border border-border rounded-lg bg-muted/30">
                    <p className="text-sm font-medium text-foreground mb-3">
                      {language === 'fr' ? 'Sélectionner des articles:' : 'Select specific items:'}
                    </p>
                    <div className="max-h-32 overflow-y-auto space-y-2">
                      {loadingItems ? (
                        <p className="text-sm text-muted-foreground">{language === 'fr' ? 'Chargement des articles...' : 'Loading items...'}</p>
                      ) : items.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {language === 'fr' ? 'Aucun article trouvé' : 'No items found'}
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2">
                          {items.map((item) => (
                            <div key={item.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`item-${item.id}`}
                                onCheckedChange={(checked) => {
                                  const currentItems = getValues('applicableItems') || []
                                  if (checked) {
                                    setValue('applicableItems', [...currentItems, item.id])
                                  } else {
                                    setValue('applicableItems', currentItems.filter(id => id !== item.id))
                                  }
                                }}
                              />
                              <Label htmlFor={`item-${item.id}`} className="text-sm">
                                {item.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.campaigns.cancel}
            </Button>
            <Button type="submit" disabled={isLoading} className="min-w-[120px]">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {language === 'fr' ? 'Création...' : 'Creating...'}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  {t.campaigns.createCampaign}
                </div>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}