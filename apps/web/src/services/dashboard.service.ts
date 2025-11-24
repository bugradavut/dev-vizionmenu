"use client"

import { apiClient, type ApiResponse } from './api-client';

export interface SalesChartDataPoint {
  date: string
  sales: number
  label: string
}

export interface OrderSourceData {
  source: string
  count: number
  label: string
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  avatar_url?: string
}

export interface RecentOrder {
  id: string
  customer_name?: string
  customer_email?: string
  total_amount: number
  payment_status: string
  created_at: string
}

export interface PopularItem {
  id: string
  name: string
  category?: string
  total_quantity: number
  total_revenue: number
  image_url?: string
}

export interface DashboardStats {
  todaySales: {
    total: number
    changePercent: number
    sparkline: { value: number }[]
  }
  newOrders: {
    count: number
    changePercent: number
    pendingCount: number
    sparkline: { value: number }[]
  }
  activeCoupons: {
    count: number
    expiringCount: number
    changePercent: number
    sparkline: { value: number }[]
  }
  menuItems: {
    total: number
    unavailable: number
    changePercent: number
    sparkline: { value: number }[]
  }
  salesChart?: {
    data: SalesChartDataPoint[]
    weekTotal: number
    changePercent: number
  }
  orderSources?: {
    data: OrderSourceData[]
    totalOrders: number
  }
  teamMembers?: TeamMember[]
  recentOrders?: RecentOrder[]
  popularItems?: PopularItem[]
}

interface DashboardStatsResponse {
  success: boolean
  data: DashboardStats
}

class DashboardService {
  /**
   * Get dashboard stats for the authenticated user's branch
   * Uses API endpoint which bypasses RLS with service_role key
   */
  async getBranchDashboardStats(): Promise<DashboardStats> {
    try {
      const response = await apiClient.get<DashboardStatsResponse>('/api/v1/dashboard/stats')
      const apiData = response.data

      if (apiData?.data) {
        return apiData.data
      }

      if (apiData && 'todaySales' in apiData) {
        return apiData as unknown as DashboardStats
      }

      return this.getDefaultStats()
    } catch (error) {
      throw error
    }
  }

  /**
   * Get default empty stats
   */
  private getDefaultStats(): DashboardStats {
    return {
      todaySales: {
        total: 0,
        changePercent: 0,
        sparkline: []
      },
      newOrders: {
        count: 0,
        changePercent: 0,
        pendingCount: 0,
        sparkline: []
      },
      activeCoupons: {
        count: 0,
        expiringCount: 0,
        changePercent: 0,
        sparkline: []
      },
      menuItems: {
        total: 0,
        unavailable: 0,
        changePercent: 0,
        sparkline: []
      },
      salesChart: {
        data: [],
        weekTotal: 0,
        changePercent: 0
      },
      orderSources: {
        data: [],
        totalOrders: 0
      },
      teamMembers: [],
      recentOrders: [],
      popularItems: []
    }
  }
}

export const dashboardService = new DashboardService()
