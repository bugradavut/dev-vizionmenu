"use client"

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { RotateCcw, CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'

// Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import toast from 'react-hot-toast'

// Contexts & Utils
import { useLanguage } from '@/contexts/language-context'

// Services
import { campaignsService } from '@/services/campaigns.service'

// Types
import { Campaign, CreateCampaignData } from '@/types/campaign'

// Form validation schema - simplified for repeat (only need dates and code)
const repeatCampaignSchema = z.object({
  code: z.string()
    .min(3, 'Code must be at least 3 characters')
    .max(20, 'Code must be 20 characters or less')
    .regex(/^[A-Z0-9]+$/, 'Code can only contain uppercase letters and numbers'),
  validFrom: z.string().optional(),
  validUntil: z.string().min(1, 'Valid until date is required'),
})

type RepeatCampaignFormData = z.infer<typeof repeatCampaignSchema>

interface RepeatCampaignDialogProps {
  campaign: Campaign | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function RepeatCampaignDialog({ campaign, open, onOpenChange, onSuccess }: RepeatCampaignDialogProps) {
  const { language } = useLanguage()

  const [isLoading, setIsLoading] = useState(false)
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
    setValue,
    reset
  } = useForm<RepeatCampaignFormData>({
    resolver: zodResolver(repeatCampaignSchema),
    defaultValues: {
      validFrom: new Date().toISOString().split('T')[0]
    }
  })

  // Pre-fill form when campaign changes
  useEffect(() => {
    if (campaign && open) {
      // Generate new code based on original
      const newCode = `${campaign.code}_COPY`
      setValue('code', newCode)
      
      // Set dates
      const today = new Date()
      setValidFromDate(today)
      setValue('validFrom', format(today, 'yyyy-MM-dd'))
      
      // Clear until date - user must set
      setValidUntilDate(undefined)
      setValue('validUntil', '')
    }
  }, [campaign, open, setValue])

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
    }
  }, [open, reset])

  const onSubmit = async (data: RepeatCampaignFormData) => {
    if (!campaign) return

    setIsLoading(true)

    try {
      // Prepare campaign data using original campaign settings
      const campaignData: CreateCampaignData = {
        code: data.code.toUpperCase(),
        type: campaign.type,
        value: campaign.value,
        valid_until: data.validUntil,
        ...(data.validFrom && { valid_from: data.validFrom }),
        applicable_categories: campaign.applicable_categories,
        // Note: applicable_items not included as it's not in original campaign interface
      }

      await campaignsService.createCampaign(campaignData)
      
      toast.success(
        language === 'fr' 
          ? 'Campagne répétée avec succès'
          : 'Campaign repeated successfully'
      )
      
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error('Repeat campaign error:', error)
      toast.error(error instanceof Error ? error.message : 
        (language === 'fr' ? 'Échec de la répétition de la campagne' : 'Failed to repeat campaign')
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (!campaign) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            {language === 'fr' ? 'Répéter la campagne' : 'Repeat Campaign'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {language === 'fr' 
              ? `Créer une nouvelle campagne basée sur "${campaign.code}" avec de nouvelles dates`
              : `Create a new campaign based on "${campaign.code}" with new dates`
            }
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            {/* Campaign Code */}
            <div className="space-y-2">
              <Label htmlFor="code">
                {language === 'fr' ? 'Code de campagne' : 'Campaign Code'}
              </Label>
              <Input
                id="code"
                {...register('code')}
                placeholder={language === 'fr' ? 'Code de la campagne' : 'Campaign code'}
                className={errors.code ? 'border-red-500' : ''}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase()
                  setValue('code', value)
                }}
              />
              {errors.code && (
                <p className="text-sm text-red-600">{errors.code.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {language === 'fr' 
                  ? 'Un nouveau code unique sera généré automatiquement'
                  : 'A unique new code will be generated automatically'
                }
              </p>
            </div>

            {/* Original Campaign Details */}
            <div className="p-4 bg-gray-50 rounded-lg border">
              <h4 className="text-sm font-medium mb-2">
                {language === 'fr' ? 'Paramètres copiés depuis:' : 'Settings copied from:'}
              </h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>{language === 'fr' ? 'Type:' : 'Type:'}</strong> {campaign.type === 'percentage' ? 'Percentage' : 'Fixed Amount'}</p>
                <p><strong>{language === 'fr' ? 'Valeur:' : 'Value:'}</strong> {campaign.type === 'percentage' ? `${campaign.value}%` : `$${campaign.value}`}</p>
                <p><strong>{language === 'fr' ? 'Catégories:' : 'Categories:'}</strong> {campaign.applicable_categories ? 'Specific categories' : 'All categories'}</p>
              </div>
            </div>

            {/* Valid Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 relative" ref={validFromRef}>
                <Label>{language === 'fr' ? 'Valide à partir du' : 'Valid From'}</Label>
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
                <Label className="text-red-600">{language === 'fr' ? 'Valide jusqu\'au *' : 'Valid Until *'}</Label>
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
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isLoading} className="min-w-[140px]">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {language === 'fr' ? 'Répétition...' : 'Repeating...'}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  {language === 'fr' ? 'Répéter la campagne' : 'Repeat Campaign'}
                </div>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}