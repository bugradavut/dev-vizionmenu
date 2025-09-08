'use client'

import { useForm, useFieldArray, UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { 
  commissionFormSchema, 
  type CommissionFormSchema, 
  type CommissionRateSchema,
  customValidations,
  safeValidateRateUpdate
} from '@/schemas/commission.schema'
import { useLanguage } from '@/contexts/language-context'

interface UseCommissionFormProps {
  initialData?: CommissionFormSchema
  onSubmit: (data: CommissionFormSchema) => Promise<void>
  onReset?: () => Promise<void>
}

interface CommissionFormActions {
  updateRate: (index: number, rate: number, hasOverride: boolean) => void
  resetRate: (index: number) => void
  resetAllRates: () => Promise<void>
  validateRate: (sourceType: string, rate: number) => string | null
}

type UseCommissionFormReturn = {
  form: UseFormReturn<CommissionFormSchema>
  isSubmitting: boolean
  isDirty: boolean
  errors: Record<string, string>
  handleSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>
  actions: CommissionFormActions
}

/**
 * Enterprise-grade form management for commission settings
 * 
 * Features:
 * - React Hook Form integration
 * - Zod validation with custom business rules
 * - Field-level validation
 * - Dirty state tracking
 * - Form submission handling
 * - Custom validation messages
 */
export const useCommissionForm = ({
  initialData,
  onSubmit,
  onReset
}: UseCommissionFormProps): UseCommissionFormReturn => {
  const { toast } = useToast()
  const { language } = useLanguage()
  
  // Initialize form with React Hook Form + Zod resolver
  const form = useForm<CommissionFormSchema>({
    resolver: zodResolver(commissionFormSchema),
    defaultValues: initialData || {
      rates: [],
      chain_id: ''
    },
    mode: 'onChange', // Validate on change for better UX
  })
  
  const { fields, update } = useFieldArray({
    control: form.control,
    name: 'rates'
  })
  
  // Update form when initial data changes
  useEffect(() => {
    if (initialData) {
      form.reset(initialData)
    }
  }, [initialData, form])
  
  // Custom validation for business rules
  const validateRate = useCallback((sourceType: string, rate: number): string | null => {
    // Basic validation
    const basicValidation = safeValidateRateUpdate({
      source_type: sourceType,
      rate: rate,
      has_override: true
    })
    
    if (!basicValidation.success) {
      return basicValidation.error.issues[0]?.message || 'Invalid rate'
    }
    
    // Business rule validation
    if (!customValidations.isValidBusinessRate(rate, sourceType)) {
      const maxRates = {
        website: 10,
        qr: 5,
        mobile_app: 8
      }
      const max = maxRates[sourceType as keyof typeof maxRates] || 100
      
      return language === 'fr' 
        ? `Le taux pour ${sourceType} ne peut pas dépasser ${max}%`
        : `Rate for ${sourceType} cannot exceed ${max}%`
    }
    
    return null
  }, [language])
  
  // Update individual rate
  const updateRate = useCallback((index: number, rate: number, hasOverride: boolean) => {
    const currentRate = fields[index]
    if (!currentRate) return
    
    // Validate before updating
    const validationError = validateRate(currentRate.source_type, rate)
    if (validationError && hasOverride) {
      toast({
        title: 'Validation Error',
        description: validationError,
        variant: 'destructive'
      })
      return
    }
    
    // Update the rate
    const updatedRate: CommissionRateSchema = {
      ...currentRate,
      chain_rate: hasOverride ? rate : null,
      effective_rate: hasOverride ? rate : currentRate.default_rate,
      has_override: hasOverride
    }
    
    update(index, updatedRate)
    
    // Custom validation for override logic
    if (hasOverride && currentRate.default_rate !== null) {
      const isValidOverride = customValidations.isValidOverride(
        currentRate.default_rate, 
        rate
      )
      
      if (!isValidOverride) {
        toast({
          title: language === 'fr' ? 'Avertissement' : 'Warning',
          description: language === 'fr'
            ? 'Ce taux personnalisé diffère significativement du taux par défaut'
            : 'This custom rate differs significantly from the default rate',
          variant: 'default'
        })
      }
    }
  }, [fields, update, validateRate, toast, language])
  
  // Reset individual rate to default
  const resetRate = useCallback((index: number) => {
    const currentRate = fields[index]
    if (!currentRate) return
    
    const resetRate: CommissionRateSchema = {
      ...currentRate,
      chain_rate: null,
      effective_rate: currentRate.default_rate,
      has_override: false
    }
    
    update(index, resetRate)
  }, [fields, update])
  
  // Reset all rates to defaults
  const resetAllRates = useCallback(async () => {
    try {
      if (onReset) {
        await onReset()
      }
      
      // Reset form state
      const resetData = {
        ...form.getValues(),
        rates: fields.map(rate => ({
          ...rate,
          chain_rate: null,
          effective_rate: rate.default_rate,
          has_override: false
        }))
      }
      
      form.reset(resetData)
      
      toast({
        title: 'Success',
        description: language === 'fr' 
          ? 'Tous les taux ont été réinitialisés aux valeurs par défaut'
          : 'All rates have been reset to default values'
      })
      
    } catch (error) {
      console.error('Failed to reset rates:', error)
      toast({
        title: 'Error',
        description: language === 'fr'
          ? 'Erreur lors de la réinitialisation des taux'
          : 'Failed to reset commission rates',
        variant: 'destructive'
      })
    }
  }, [onReset, form, fields, toast, language])
  
  // Handle form submission
  const handleSubmit = form.handleSubmit(async (data: CommissionFormSchema) => {
    try {
      console.log('🚀 Submitting commission form:', data)
      await onSubmit(data)
      
      toast({
        title: 'Success',
        description: language === 'fr'
          ? 'Les taux de commission ont été mis à jour'
          : 'Commission rates have been updated'
      })
      
    } catch (error) {
      console.error('❌ Form submission failed:', error)
      toast({
        title: 'Error',
        description: error instanceof Error 
          ? error.message 
          : (language === 'fr' 
              ? 'Erreur lors de la sauvegarde des taux'
              : 'Failed to save commission rates'
            ),
        variant: 'destructive'
      })
    }
  })
  
  // Extract form errors for easier access
  const errors = Object.keys(form.formState.errors).reduce((acc, key) => {
    const error = form.formState.errors[key as keyof CommissionFormSchema]
    if (error?.message) {
      acc[key] = error.message
    }
    return acc
  }, {} as Record<string, string>)
  
  return {
    form,
    isSubmitting: form.formState.isSubmitting,
    isDirty: form.formState.isDirty,
    errors,
    handleSubmit,
    actions: {
      updateRate,
      resetRate,
      resetAllRates,
      validateRate
    }
  }
}

export default useCommissionForm