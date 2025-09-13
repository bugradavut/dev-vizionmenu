"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Tag, CalendarIcon, Save } from 'lucide-react'
import { format } from 'date-fns'

// Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import toast from 'react-hot-toast'

// Contexts & Utils
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'

// Services
import { campaignsService } from '@/services/campaigns.service'

// Types
import { Campaign } from '@/types/campaign'

// Form validation schema
const editCampaignSchema = z.object({
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
  is_active: z.boolean()
})

type EditCampaignFormData = z.infer<typeof editCampaignSchema>

interface EditCampaignDialogProps {
  campaign: Campaign | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditCampaignDialog({ campaign, open, onOpenChange, onSuccess }: EditCampaignDialogProps) {
  const { language } = useLanguage()
  const t = translations[language] || translations.en

  const [isLoading, setIsLoading] = useState(false)
  const [validFromDate, setValidFromDate] = useState<Date>()
  const [validUntilDate, setValidUntilDate] = useState<Date>()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset
  } = useForm<EditCampaignFormData>({
    resolver: zodResolver(editCampaignSchema),
    defaultValues: {
      is_active: true
    }
  })

  const watchedType = watch('type')
  const watchedValue = watch('value')

  // Initialize form when campaign changes
  useEffect(() => {
    if (campaign && open) {
      setValue('code', campaign.code)
      setValue('type', campaign.type)
      setValue('value', campaign.value)
      setValue('is_active', campaign.is_active)
      
      if (campaign.valid_from) {
        const fromDate = new Date(campaign.valid_from)
        setValidFromDate(fromDate)
        setValue('validFrom', format(fromDate, 'yyyy-MM-dd'))
      }
      
      if (campaign.valid_until) {
        const untilDate = new Date(campaign.valid_until)
        setValidUntilDate(untilDate)
        setValue('validUntil', format(untilDate, 'yyyy-MM-dd'))
      }
    }
  }, [campaign, open, setValue])

  // Validate percentage when type changes
  useEffect(() => {
    if (watchedType === 'percentage' && watchedValue > 100) {
      setValue('value', 100)
    }
  }, [watchedType, watchedValue, setValue])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      reset()
      setValidFromDate(undefined)
      setValidUntilDate(undefined)
    }
  }, [open, reset])

  const onSubmit = async (data: EditCampaignFormData) => {
    if (!campaign) return
    
    setIsLoading(true)
    try {
      await campaignsService.updateCampaign(campaign.id, {
        code: data.code.toUpperCase(),
        type: data.type,
        value: data.value,
        valid_until: data.validUntil,
        ...(data.validFrom && { valid_from: data.validFrom }),
        is_active: data.is_active
      })
      
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error('Update campaign error:', error)
      
      // Extract detailed error message
      let errorMessage = 'Failed to update campaign'
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = error.message as string
      } else if (error && typeof error === 'object' && 'error' in error) {
        const apiError = error as { error?: { message?: string } }
        if (apiError.error && apiError.error.message) {
          errorMessage = apiError.error.message
        }
      }
      
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (!campaign) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            {language === 'fr' ? 'Modifier la campagne' : 'Edit Campaign'}
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
                  const value = e.target.value.toUpperCase()
                  setValue('code', value)
                }}
              />
              {errors.code && (
                <p className="text-sm text-red-600">{errors.code.message}</p>
              )}
            </div>

            {/* Campaign Type & Value */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">{t.campaigns.campaignType}</Label>
                <Select 
                  value={watch('type')} 
                  onValueChange={(value: 'percentage' | 'fixed_amount') => setValue('type', value)}
                >
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
              </div>
            </div>

            {/* Valid Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.campaigns.validFrom}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${!validFromDate && "text-muted-foreground"}`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {validFromDate ? format(validFromDate, "PPP") : 
                        (language === 'fr' ? 'Sélectionner une date' : 'Pick a date')
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={validFromDate}
                      onSelect={(date) => {
                        setValidFromDate(date)
                        setValue('validFrom', date ? format(date, 'yyyy-MM-dd') : '')
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label>{t.campaigns.validUntil} *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${
                        !validUntilDate && "text-muted-foreground"
                      } ${errors.validUntil ? 'border-red-500' : ''}`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {validUntilDate ? format(validUntilDate, "PPP") : 
                        (language === 'fr' ? 'Sélectionner une date' : 'Pick a date')
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={validUntilDate}
                      onSelect={(date) => {
                        setValidUntilDate(date)
                        setValue('validUntil', date ? format(date, 'yyyy-MM-dd') : '')
                      }}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
                {errors.validUntil && (
                  <p className="text-sm text-red-600">{errors.validUntil.message}</p>
                )}
              </div>
            </div>

            {/* Status Toggle */}
            <div className="flex items-center space-x-3">
              <Switch
                id="is_active"
                checked={watch('is_active')}
                onCheckedChange={(checked) => setValue('is_active', checked)}
              />
              <Label htmlFor="is_active" className="text-sm font-medium">
                {language === 'fr' ? 'Campagne active' : 'Campaign active'}
              </Label>
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
                  {language === 'fr' ? 'Mise à jour...' : 'Updating...'}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {language === 'fr' ? 'Sauvegarder' : 'Save Changes'}
                </div>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}