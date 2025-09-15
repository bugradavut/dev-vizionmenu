"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useLanguage } from "@/contexts/language-context"
import { useEnhancedAuth, usePermissions } from "@/hooks/use-enhanced-auth"
import { activityLogsService, type ActivityLog, type ActivityLogFilters, type ActivityLogFilterOptions } from "@/services/activity-logs.service"
import { ApiClientError } from "@/services/api-client"
import { format } from "date-fns"
import { ActivityLogsTable } from "@/components/analytics/activity-logs-table"

// Types for better type safety
interface ActivityLogsState {
  logs: ActivityLog[]
  filterOptions: ActivityLogFilterOptions | null
  loading: {
    logs: boolean
    options: boolean
  }
  error: {
    logs: string | null
    options: string | null
  }
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface DateRange {
  from?: Date
  to?: Date
}

// Constants
const INITIAL_STATE: ActivityLogsState = {
  logs: [],
  filterOptions: null,
  loading: {
    logs: true,
    options: true,
  },
  error: {
    logs: null,
    options: null,
  },
  pagination: {
    page: 1,
    limit: 1000,
    total: 0,
    totalPages: 1,
  },
}

export default function ActivityLogsPage() {
  const { language } = useLanguage()
  const { chainId, session, loading: authLoading } = useEnhancedAuth()
  const { canViewReports } = usePermissions()

  // Translations
  const t = useMemo(() => ({
    title: language === 'fr' ? "Journaux d'Activité" : 'Activity Logs',
    subtitle: language === 'fr' ? "Suivez les changements des utilisateurs et les activités système" : 'Track user changes and system activities',
    errors: {
      accessDenied: language === 'fr' ? "Accès refusé: l'utilisateur n'est pas associé à une succursale active ou n'a pas la permission des rapports." : 'Access denied: user is not linked to an active branch or lacks reports permission.',
      loadFailed: language === 'fr' ? 'Échec du chargement des données' : 'Failed to load data',
    }
  }), [language])

  // State management
  const [state, setState] = useState<ActivityLogsState>(INITIAL_STATE)
  const [dateRange, setDateRange] = useState<DateRange>({})
  const [filters, setFilters] = useState<ActivityLogFilters>({
    page: 1,
    limit: 1000
  })

  // Derived state
  const isAuthenticated = useMemo(() =>
    !authLoading && !!chainId && !!session && canViewReports,
    [authLoading, chainId, session, canViewReports]
  )

  // API calls with proper error handling
  const loadFilterOptions = useCallback(async () => {
    if (!isAuthenticated) return

    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, options: true },
      error: { ...prev.error, options: null }
    }))

    try {
      const response = await activityLogsService.getFilterOptions(chainId!)

      setState(prev => ({
        ...prev,
        filterOptions: response.data,
        loading: { ...prev.loading, options: false }
      }))
    } catch (error) {
      console.error('Failed to load filter options:', error)

      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, options: false },
        error: { ...prev.error, options: 'Failed to load filter options' }
      }))
    }
  }, [isAuthenticated, chainId])

  const loadLogs = useCallback(async () => {
    if (!isAuthenticated) return

    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, logs: true },
      error: { ...prev.error, logs: null }
    }))

    try {
      const requestFilters = {
        ...filters,
        startDate: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        endDate: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      }

      const response = await activityLogsService.getActivityLogs(chainId!, requestFilters)

      setState(prev => ({
        ...prev,
        logs: response.data.logs,
        pagination: {
          ...prev.pagination,
          total: response.data.total,
          totalPages: response.data.totalPages,
          page: response.data.page,
        },
        loading: { ...prev.loading, logs: false }
      }))
    } catch (error) {
      console.error('Failed to load activity logs:', error)

      const errorMessage = error instanceof ApiClientError && error.status === 403
        ? t.errors.accessDenied
        : t.errors.loadFailed

      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, logs: false },
        error: { ...prev.error, logs: errorMessage }
      }))
    }
  }, [isAuthenticated, chainId, filters, dateRange, t.errors])

  // Effects
  useEffect(() => {
    if (isAuthenticated) {
      loadFilterOptions()
    }
  }, [isAuthenticated, loadFilterOptions])

  useEffect(() => {
    if (isAuthenticated) {
      loadLogs()
    }
  }, [isAuthenticated, loadLogs])

  // Event handlers

  const handleFiltersChange = useCallback((newFilters: ActivityLogFilters) => {
    setFilters(newFilters)
  }, [])

  const handleDateRangeChange = useCallback((range: DateRange) => {
    setDateRange(range)
  }, [])

  return (
    <AuthGuard requireAuth={true} requireRememberOrRecent={true} redirectTo="/login">
      <DashboardLayout>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <DynamicBreadcrumb />
            </div>
          </header>

          <div className="flex flex-1 flex-col px-2 sm:px-4 lg:px-6">
            {/* Header Section */}
            <div className="px-2 py-6 sm:px-4 lg:px-6 bg-background">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
                  <p className="text-muted-foreground mt-2 text-lg">{t.subtitle}</p>
                </div>
                <div className="lg:col-span-4 flex items-center justify-end">
                  {/* Header actions can go here if needed */}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 px-2 py-8 sm:px-4 lg:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Activity Logs Table */}
                <div className="lg:col-span-12">
                  <ActivityLogsTable
                    logs={state.logs}
                    loading={state.loading.logs}
                    error={state.error.logs}
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                    filterOptions={state.filterOptions}
                    dateRange={dateRange}
                    onDateRangeChange={handleDateRangeChange}
                    language={language}
                  />
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </DashboardLayout>
    </AuthGuard>
  )
}