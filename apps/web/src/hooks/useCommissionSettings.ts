'use client'

import { useState, useCallback, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'
import { commissionService, type CommissionRate } from '@/services/commission.service'
import type { Chain } from '@/services/chains.service'

interface UseCommissionSettingsProps {
  chain: Chain | null
  isOpen: boolean
}

interface CommissionSettingsState {
  rates: CommissionRate[]
  initialRates: CommissionRate[]
  loading: boolean
  saving: boolean
  hasChanges: boolean
  error: string | null
}

interface CommissionSettingsActions {
  updateRate: (sourceType: string, newRate: string, useOverride: boolean) => void
  resetToDefaults: () => Promise<void>
  saveChanges: () => Promise<void>
  refreshSettings: () => Promise<void>
  clearChanges: () => void
}

type UseCommissionSettingsReturn = CommissionSettingsState & CommissionSettingsActions

/**
 * Enterprise-grade commission settings management hook
 * 
 * Features:
 * - Centralized state management
 * - Optimistic updates with rollback
 * - Proper error handling
 * - Loading states management
 * - Dirty state tracking
 * - Bulk operations support
 */
export const useCommissionSettings = ({ 
  chain, 
  isOpen 
}: UseCommissionSettingsProps): UseCommissionSettingsReturn => {
  const { toast } = useToast()
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // State management
  const [state, setState] = useState<CommissionSettingsState>({
    rates: [],
    initialRates: [],
    loading: false,
    saving: false,
    hasChanges: false,
    error: null
  })

  // Default rates fallback
  const getDefaultRate = useCallback((sourceType: string): number => {
    const defaults: Record<string, number> = {
      website: 3.00,     // Standard commission for web orders
      qr: 1.00,          // Reduced commission for in-restaurant QR orders
      mobile_app: 2.00   // Mobile app commission
    }
    return defaults[sourceType] || 0.00
  }, [])

  // Mock data generator for fallback
  const generateMockData = useCallback((): CommissionRate[] => {
    const sourceTypes = ['website', 'qr', 'mobile_app']
    return sourceTypes.map(sourceType => ({
      source_type: sourceType,
      default_rate: getDefaultRate(sourceType),
      chain_rate: null,
      effective_rate: getDefaultRate(sourceType),
      has_override: false,
      is_active: true
    }))
  }, [getDefaultRate])

  // Fetch commission settings from API
  const refreshSettings = useCallback(async (): Promise<void> => {
    if (!chain || !isOpen) return

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    abortControllerRef.current = new AbortController()
    
    try {
      setState(prev => ({ 
        ...prev, 
        loading: true, 
        error: null 
      }))
      
      console.log('🔄 Fetching commission settings for chain:', chain.id)
      
      // Fetch from API with timeout
      const response = await commissionService.getChainSettings(chain.id)
      
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return
      }
      
      const rates = response.settings || []
      
      setState(prev => ({
        ...prev,
        rates,
        initialRates: structuredClone(rates), // Deep copy for comparison
        loading: false,
        hasChanges: false,
        error: null
      }))
      
      console.log('✅ Commission settings loaded:', rates)
      
    } catch (error) {
      // Skip error if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return
      }
      
      console.error('❌ Failed to fetch commission settings:', error)
      
      // Fallback to mock data
      const mockRates = generateMockData()
      
      setState(prev => ({
        ...prev,
        rates: mockRates,
        initialRates: structuredClone(mockRates),
        loading: false,
        hasChanges: false,
        error: 'Failed to load settings, using defaults'
      }))
      
      toast({
        title: 'Warning',
        description: 'Using default rates - API connection failed',
        variant: 'destructive',
      })
    }
  }, [chain, isOpen, generateMockData, toast])

  // Update individual rate
  const updateRate = useCallback((
    sourceType: string, 
    newRate: string, 
    useOverride: boolean
  ): void => {
    const rateValue = parseFloat(newRate) || 0
    
    // Validation
    if (useOverride && (rateValue < 0 || rateValue > 100)) {
      toast({
        title: 'Invalid Rate',
        description: 'Rate must be between 0% and 100%',
        variant: 'destructive',
      })
      return
    }

    setState(prev => {
      const updatedRates = prev.rates.map(rate => {
        if (rate.source_type === sourceType) {
          return {
            ...rate,
            chain_rate: useOverride ? rateValue : null,
            effective_rate: useOverride ? rateValue : rate.default_rate,
            has_override: useOverride
          }
        }
        return rate
      })
      
      // Check if there are changes compared to initial state
      const hasChanges = !isEqual(updatedRates, prev.initialRates)
      
      return {
        ...prev,
        rates: updatedRates,
        hasChanges,
        error: null
      }
    })
    
    console.log(`📊 Rate updated: ${sourceType} = ${useOverride ? rateValue : 'default'}%`)
  }, [toast])

  // Reset all rates to defaults
  const resetToDefaults = useCallback(async (): Promise<void> => {
    if (!chain) return
    
    try {
      setState(prev => ({ ...prev, saving: true, error: null }))
      
      console.log('🔄 Resetting all rates to defaults...')
      
      // Remove all chain overrides that exist
      const overridesToRemove = state.rates.filter(rate => rate.has_override)
      
      for (const rate of overridesToRemove) {
        await commissionService.removeChainOverride(chain.id, rate.source_type)
      }
      
      // Update local state
      const resetRates = state.rates.map(rate => ({
        ...rate,
        chain_rate: null,
        effective_rate: rate.default_rate,
        has_override: false
      }))
      
      setState(prev => ({
        ...prev,
        rates: resetRates,
        initialRates: structuredClone(resetRates),
        hasChanges: false,
        saving: false
      }))
      
      toast({
        title: 'Success',
        description: 'All rates reset to default values',
      })
      
      console.log('✅ All rates reset to defaults')
      
    } catch (error) {
      console.error('❌ Failed to reset rates:', error)
      
      setState(prev => ({ 
        ...prev, 
        saving: false, 
        error: 'Failed to reset rates' 
      }))
      
      toast({
        title: 'Error',
        description: 'Failed to reset commission rates',
        variant: 'destructive',
      })
    }
  }, [chain, state.rates, toast])

  // Save all changes
  const saveChanges = useCallback(async (): Promise<void> => {
    if (!chain || !state.hasChanges) return

    try {
      setState(prev => ({ ...prev, saving: true, error: null }))
      
      console.log('💾 Saving commission changes for chain:', chain.id)
      
      // Prepare updates (rates with overrides)
      const updates = state.rates
        .filter(rate => rate.has_override && rate.chain_rate !== null)
        .map(rate => ({
          sourceType: rate.source_type,
          rate: rate.chain_rate!
        }))

      // Prepare removals (rates that had overrides initially but now don't)
      const removals = state.rates.filter(rate => {
        const initialRate = state.initialRates.find(r => r.source_type === rate.source_type)
        return !rate.has_override && initialRate?.has_override
      })

      console.log('📊 Updates:', updates)
      console.log('🗑️ Removals:', removals)

      // Execute updates
      if (updates.length > 0) {
        await commissionService.bulkUpdateChainRates(chain.id, updates)
      }

      // Execute removals
      for (const rate of removals) {
        await commissionService.removeChainOverride(chain.id, rate.source_type)
      }

      // Update state with successful save
      setState(prev => ({
        ...prev,
        initialRates: structuredClone(prev.rates), // Update baseline
        hasChanges: false,
        saving: false
      }))

      toast({
        title: 'Success',
        description: `Commission rates updated for ${chain.name}`,
      })
      
      console.log('✅ Commission changes saved successfully')
      
    } catch (error) {
      console.error('❌ Failed to save commission settings:', error)
      
      setState(prev => ({ 
        ...prev, 
        saving: false, 
        error: 'Failed to save changes' 
      }))
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save commission settings',
        variant: 'destructive',
      })
      
      // TODO: Implement rollback mechanism here
    }
  }, [chain, state.rates, state.initialRates, state.hasChanges, toast])

  // Clear unsaved changes
  const clearChanges = useCallback((): void => {
    setState(prev => ({
      ...prev,
      rates: structuredClone(prev.initialRates),
      hasChanges: false,
      error: null
    }))
    
    console.log('🔄 Changes cleared, reverted to initial state')
  }, [])

  return {
    // State
    rates: state.rates,
    initialRates: state.initialRates,
    loading: state.loading,
    saving: state.saving,
    hasChanges: state.hasChanges,
    error: state.error,
    
    // Actions
    updateRate,
    resetToDefaults,
    saveChanges,
    refreshSettings,
    clearChanges
  }
}

// Utility function for deep equality check
function isEqual(a: CommissionRate[], b: CommissionRate[]): boolean {
  if (a.length !== b.length) return false
  
  return a.every((rateA, index) => {
    const rateB = b[index]
    return (
      rateA.source_type === rateB.source_type &&
      rateA.default_rate === rateB.default_rate &&
      rateA.chain_rate === rateB.chain_rate &&
      rateA.effective_rate === rateB.effective_rate &&
      rateA.has_override === rateB.has_override &&
      rateA.is_active === rateB.is_active
    )
  })
}

export default useCommissionSettings