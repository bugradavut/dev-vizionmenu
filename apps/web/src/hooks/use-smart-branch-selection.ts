/**
 * Smart branch selection hook combining location and delivery zone logic
 */

import { useState, useCallback, useEffect } from 'react'
import { customerChainsService } from '@/services/customer-chains.service'
import { branchRankingService, type RankedBranch, type BranchWithLocation } from '@/services/branch-ranking.service'
import { useCustomerLocation, type UseCustomerLocationReturn } from './use-customer-location'
import type { Coordinates } from '@/utils/geometry'

export interface SmartBranchSelectionOptions {
  chainSlug: string
  orderType?: 'delivery' | 'pickup'
  language?: 'en' | 'fr'
}

export interface SmartBranchSelectionState {
  branches: RankedBranch[]
  loading: boolean
  error: string | null
  hasDeliveryOptions: boolean
  recommendedBranch: RankedBranch | null
}

export interface UseSmartBranchSelectionReturn {
  state: SmartBranchSelectionState
  location: UseCustomerLocationReturn
  rankBranches: (userCoordinates: Coordinates) => void
  refreshBranches: () => Promise<void>
}

export function useSmartBranchSelection(
  options: SmartBranchSelectionOptions
): UseSmartBranchSelectionReturn {
  const { chainSlug, orderType = 'delivery', language = 'en' } = options

  const [state, setState] = useState<SmartBranchSelectionState>({
    branches: [],
    loading: false,
    error: null,
    hasDeliveryOptions: false,
    recommendedBranch: null,
  })

  const [rawBranches, setRawBranches] = useState<BranchWithLocation[]>([])
  const location = useCustomerLocation()

  /**
   * Fetch branches from API with delivery zones
   */
  const fetchBranches = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const chainData = await customerChainsService.getChainBranchesWithDeliveryZones(chainSlug)

      // Filter branches with valid locations and convert to BranchWithLocation
      const branchesWithLocation: BranchWithLocation[] = chainData.branches
        .filter((branch): branch is BranchWithLocation =>
          Boolean(branch.location?.lat && branch.location?.lng)
        )
        .map(branch => ({
          ...branch,
          location: {
            lat: branch.location!.lat,
            lng: branch.location!.lng,
          }
        }))

      setRawBranches(branchesWithLocation)

      // If we don't have user location yet, just set branches without ranking
      if (!location.location.coordinates) {
        setState(prev => ({
          ...prev,
          branches: branchesWithLocation.map(branch => ({
            ...branch,
            distance: 0,
            isInDeliveryZone: false,
            priority: 2,
            deliveryStatus: 'no_delivery' as const,
            distanceText: '',
          })),
          loading: false,
          hasDeliveryOptions: false,
          recommendedBranch: null,
        }))
        return
      }

      // Rank branches with user location
      rankBranchesInternal(branchesWithLocation, location.location.coordinates)

    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load branches',
      }))
    }
  }, [chainSlug, location.location.coordinates])

  /**
   * Rank branches based on user coordinates
   */
  const rankBranchesInternal = useCallback(
    (branches: BranchWithLocation[], userCoordinates: Coordinates) => {
      const rankedBranches = branchRankingService.rankBranches({
        userCoordinates,
        branches,
        language,
        orderType,
      })

      const hasDeliveryOptions = branchRankingService.hasDeliveryOptions(rankedBranches)
      const recommendedBranch = branchRankingService.getRecommendedBranch(rankedBranches)

      setState(prev => ({
        ...prev,
        branches: rankedBranches,
        loading: false,
        hasDeliveryOptions,
        recommendedBranch,
      }))
    },
    [language, orderType]
  )

  /**
   * Public method to rank branches with new coordinates
   */
  const rankBranches = useCallback(
    (userCoordinates: Coordinates) => {
      if (rawBranches.length > 0) {
        rankBranchesInternal(rawBranches, userCoordinates)
      }
    },
    [rawBranches, rankBranchesInternal]
  )

  /**
   * Refresh branches from API
   */
  const refreshBranches = useCallback(async () => {
    await fetchBranches()
  }, [fetchBranches])

  // Auto-rank when user location becomes available
  useEffect(() => {
    if (location.location.coordinates && rawBranches.length > 0) {
      rankBranchesInternal(rawBranches, location.location.coordinates)
    }
  }, [location.location.coordinates, rawBranches, rankBranchesInternal])

  // Initial fetch
  useEffect(() => {
    fetchBranches()
  }, [fetchBranches])

  return {
    state,
    location,
    rankBranches,
    refreshBranches,
  }
}