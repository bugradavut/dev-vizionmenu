"use client"

import { useState, useEffect, useCallback } from "react"
import { dashboardService, DashboardStats } from "@/services/dashboard.service"
import { useEnhancedAuth } from "./use-enhanced-auth"

interface UseDashboardStatsReturn {
  stats: DashboardStats | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// Default empty stats
const DEFAULT_STATS: DashboardStats = {
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
  }
}

export function useDashboardStats(): UseDashboardStatsReturn {
  const { user, loading: authLoading } = useEnhancedAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAuthenticated = !!user

  const fetchStats = useCallback(async () => {
    if (authLoading) return

    if (!isAuthenticated) {
      setStats(DEFAULT_STATS)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await dashboardService.getBranchDashboardStats()
      setStats(data)
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch stats")
      setStats(DEFAULT_STATS)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  }
}
