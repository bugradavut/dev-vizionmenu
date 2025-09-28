/**
 * Branch ranking service for location-based recommendations
 */

import { calculateDistance, isPointInDeliveryZones, type Coordinates } from '@/utils/geometry'
import type { Branch } from './customer-chains.service'

export interface DeliveryZone {
  id: string
  name: string
  polygon: [number, number][]
  active: boolean
}

export interface DeliveryZonesData {
  enabled: boolean
  zones: DeliveryZone[]
}

export interface BranchWithLocation extends Branch {
  location: {
    lat: number
    lng: number
  }
  deliveryZones?: DeliveryZonesData
}

export interface RankedBranch extends BranchWithLocation {
  distance: number
  isInDeliveryZone: boolean
  priority: number
  deliveryStatus: 'delivers' | 'no_delivery' | 'pickup_only'
  distanceText: string
}

export interface BranchRankingOptions {
  userCoordinates: Coordinates
  branches: BranchWithLocation[]
  language?: 'en' | 'fr'
  orderType?: 'delivery' | 'pickup'
}

class BranchRankingService {
  /**
   * Rank branches based on user location and delivery zones
   */
  rankBranches(options: BranchRankingOptions): RankedBranch[] {
    const { userCoordinates, branches, language = 'en', orderType = 'delivery' } = options

    return branches
      .map(branch => this.calculateBranchMetrics(branch, userCoordinates, language, orderType))
      .sort(this.compareBranches)
  }

  /**
   * Calculate metrics for a single branch
   */
  private calculateBranchMetrics(
    branch: BranchWithLocation,
    userCoordinates: Coordinates,
    language: 'en' | 'fr',
    orderType: 'delivery' | 'pickup'
  ): RankedBranch {
    const branchCoords: Coordinates = {
      lat: branch.location.lat,
      lng: branch.location.lng
    }

    const distance = calculateDistance(userCoordinates, branchCoords)
    const isInDeliveryZone = branch.deliveryZones
      ? isPointInDeliveryZones(userCoordinates, branch.deliveryZones)
      : false

    // Determine delivery status
    let deliveryStatus: 'delivers' | 'no_delivery' | 'pickup_only' = 'no_delivery'

    if (orderType === 'pickup') {
      deliveryStatus = 'pickup_only'
    } else if (branch.deliveryZones?.enabled && isInDeliveryZone) {
      deliveryStatus = 'delivers'
    }

    // Calculate priority (lower number = higher priority)
    let priority = 2 // Default: not in delivery zone

    if (orderType === 'pickup') {
      priority = 1 // Pickup orders don't need delivery zones
    } else if (deliveryStatus === 'delivers') {
      priority = 1 // In delivery zone = highest priority
    }

    return {
      ...branch,
      distance,
      isInDeliveryZone,
      priority,
      deliveryStatus,
      distanceText: this.formatDistance(distance)
    }
  }

  /**
   * Compare function for sorting branches
   */
  private compareBranches(a: RankedBranch, b: RankedBranch): number {
    // First: Sort by priority (1 = highest priority)
    if (a.priority !== b.priority) {
      return a.priority - b.priority
    }

    // Second: Sort by distance (closest first)
    return a.distance - b.distance
  }

  /**
   * Format distance for display
   */
  private formatDistance(distance: number): string {
    if (distance < 1) {
      const meters = Math.round(distance * 1000)
      return `${meters}m`
    }

    const rounded = Math.round(distance * 10) / 10
    return `${rounded}km`
  }

  /**
   * Get delivery status text for UI
   */
  getDeliveryStatusText(
    branch: RankedBranch,
    language: 'en' | 'fr' = 'en'
  ): { text: string; type: 'success' | 'warning' | 'neutral' } {
    switch (branch.deliveryStatus) {
      case 'delivers':
        return {
          text: language === 'fr' ? 'Adresinize teslimat yapıyor' : 'Delivers to you',
          type: 'success'
        }
      case 'no_delivery':
        return {
          text: language === 'fr' ? 'Bu bölgeye teslimat yapmıyor' : 'No delivery to this area',
          type: 'warning'
        }
      case 'pickup_only':
        return {
          text: language === 'fr' ? 'Mağazadan teslim alma' : 'Pickup available',
          type: 'neutral'
        }
      default:
        return {
          text: '',
          type: 'neutral'
        }
    }
  }

  /**
   * Get recommended branch (first in sorted list)
   */
  getRecommendedBranch(rankedBranches: RankedBranch[]): RankedBranch | null {
    return rankedBranches.length > 0 ? rankedBranches[0] : null
  }

  /**
   * Filter branches that deliver to user location
   */
  getBranchesWithDelivery(rankedBranches: RankedBranch[]): RankedBranch[] {
    return rankedBranches.filter(branch => branch.deliveryStatus === 'delivers')
  }

  /**
   * Check if any branch delivers to the location
   */
  hasDeliveryOptions(rankedBranches: RankedBranch[]): boolean {
    return rankedBranches.some(branch => branch.deliveryStatus === 'delivers')
  }
}

export const branchRankingService = new BranchRankingService()
export { BranchRankingService }