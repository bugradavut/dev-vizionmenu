'use client'

import { z } from 'zod'

/**
 * Commission rate validation schema
 * Enterprise-grade form validation with Zod
 */

// Individual commission rate schema
export const commissionRateSchema = z.object({
  source_type: z.enum(['website', 'qr', 'mobile_app'], {
    message: 'Invalid source type'
  }),
  
  default_rate: z.number({
    message: 'Default rate must be a number'
  }).min(0, 'Rate cannot be negative').max(100, 'Rate cannot exceed 100%'),
  
  chain_rate: z.number({
    message: 'Chain rate must be a number'
  }).min(0, 'Rate cannot be negative').max(100, 'Rate cannot exceed 100%').nullable(),
  
  effective_rate: z.number({
    message: 'Effective rate must be a number'
  }).min(0, 'Rate cannot be negative').max(100, 'Rate cannot exceed 100%'),
  
  has_override: z.boolean({
    message: 'Override flag must be boolean'
  }),
  
  is_active: z.boolean({
    message: 'Active flag must be boolean'
  })
})

// Commission form data schema
export const commissionFormSchema = z.object({
  rates: z.array(commissionRateSchema, {
    message: 'Commission rates must be an array'
  }).min(1, 'At least one commission rate is required'),
  
  chain_id: z.string({
    message: 'Chain ID must be a string'
  }).uuid('Invalid chain ID format')
})

// Individual rate update schema (for form inputs)
export const rateUpdateSchema = z.object({
  source_type: z.enum(['website', 'qr', 'mobile_app']),
  rate: z.coerce.number({
    message: 'Rate must be a number'
  }).min(0, {
    message: 'Rate cannot be negative'
  }).max(100, {
    message: 'Rate cannot exceed 100%'
  }),
  has_override: z.boolean()
})

// Bulk update schema
export const bulkUpdateSchema = z.object({
  chain_id: z.string().uuid('Invalid chain ID'),
  updates: z.array(z.object({
    sourceType: z.enum(['website', 'qr', 'mobile_app']),
    rate: z.number().min(0).max(100)
  }))
})

// Reset schema
export const resetRatesSchema = z.object({
  chain_id: z.string().uuid('Invalid chain ID'),
  confirm: z.boolean().refine(val => val === true, {
    message: 'You must confirm to reset all rates'
  })
})

// Type exports for TypeScript
export type CommissionRateSchema = z.infer<typeof commissionRateSchema>
export type CommissionFormSchema = z.infer<typeof commissionFormSchema>  
export type RateUpdateSchema = z.infer<typeof rateUpdateSchema>
export type BulkUpdateSchema = z.infer<typeof bulkUpdateSchema>
export type ResetRatesSchema = z.infer<typeof resetRatesSchema>

// Validation helper functions
export const validateCommissionRate = (rate: unknown): CommissionRateSchema => {
  return commissionRateSchema.parse(rate)
}

export const validateCommissionForm = (form: unknown): CommissionFormSchema => {
  return commissionFormSchema.parse(form)
}

export const validateRateUpdate = (update: unknown): RateUpdateSchema => {
  return rateUpdateSchema.parse(update)
}

export const validateBulkUpdate = (update: unknown): BulkUpdateSchema => {
  return bulkUpdateSchema.parse(update)
}

export const validateResetRates = (reset: unknown): ResetRatesSchema => {
  return resetRatesSchema.parse(reset)
}

// Safe validation helpers (return result object instead of throwing)
export const safeValidateCommissionRate = (rate: unknown) => {
  return commissionRateSchema.safeParse(rate)
}

export const safeValidateRateUpdate = (update: unknown) => {
  return rateUpdateSchema.safeParse(update)
}

// Form field validation helpers
export const getFieldError = (error: z.ZodError, fieldPath: string): string | undefined => {
  const fieldError = error.issues.find((err: z.ZodIssue) => 
    err.path.join('.') === fieldPath
  )
  return fieldError?.message
}

export const hasFieldError = (error: z.ZodError, fieldPath: string): boolean => {
  return error.issues.some((err: z.ZodIssue) => err.path.join('.') === fieldPath)
}

// Custom validation rules
export const customValidations = {
  // Check if rate is within business rules
  isValidBusinessRate: (rate: number, sourceType: string): boolean => {
    const businessRules = {
      website: { min: 0, max: 10 },    // Max 10% for website
      qr: { min: 0, max: 5 },          // Max 5% for QR (in-restaurant)
      mobile_app: { min: 0, max: 8 }   // Max 8% for mobile app
    }
    
    const rules = businessRules[sourceType as keyof typeof businessRules]
    return rules ? rate >= rules.min && rate <= rules.max : true
  },
  
  // Check if override makes business sense
  isValidOverride: (defaultRate: number, chainRate: number): boolean => {
    // Override shouldn't be more than 50% different from default
    const maxDifference = Math.max(defaultRate * 0.5, 1) // At least 1% difference allowed
    return Math.abs(chainRate - defaultRate) <= maxDifference
  }
}

const commissionSchemas = {
  commissionRateSchema,
  commissionFormSchema,
  rateUpdateSchema,
  bulkUpdateSchema,
  resetRatesSchema,
  validateCommissionRate,
  validateCommissionForm,
  validateRateUpdate,
  validateBulkUpdate,
  validateResetRates,
  safeValidateCommissionRate,
  safeValidateRateUpdate,
  getFieldError,
  hasFieldError,
  customValidations
}

export default commissionSchemas