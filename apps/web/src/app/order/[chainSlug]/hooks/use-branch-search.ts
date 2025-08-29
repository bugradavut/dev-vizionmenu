"use client"

import { useState, useCallback } from 'react'
import { 
  UseBranchSearchReturn, 
  Branch,
  BranchesResponse
} from '../types/order-flow.types'

/**
 * Custom hook for simple branch loading
 * Handles basic branch fetching for simplified flow
 */
export function useBranchSearch(chainSlug: string): UseBranchSearchReturn {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  const loadBranches = useCallback(async (): Promise<Branch[]> => {
    if (!chainSlug) {
      throw new Error('Chain slug is required')
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/customer/chains/${chainSlug}/branches`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to load branches: ${response.statusText}`)
      }

      const data: BranchesResponse = await response.json()
      const foundBranches = data.data.branches

      setBranches(foundBranches)
      return foundBranches
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load branches'
      setError(errorMessage)
      setBranches([])
      throw err
    } finally {
      setLoading(false)
    }
  }, [chainSlug, API_BASE_URL])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    branches,
    loading,
    error,
    loadBranches,
    clearError,
  }
}