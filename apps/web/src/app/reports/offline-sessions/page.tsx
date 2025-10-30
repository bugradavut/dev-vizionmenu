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
import { OfflineSessionsTable } from "@/components/analytics/offline-sessions-table"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

// Types
interface OfflineSession {
  id: string
  branch_id: string
  activated_at: string
  deactivated_at: string | null
  duration_seconds: number | null
  orders_created: number
  device_info: any
  user_agent: string | null
  last_network_status: string
  sync_attempts: number
  created_at: string
  updated_at: string
}

interface OfflineSessionsState {
  sessions: OfflineSession[]
  loading: boolean
  error: string | null
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
const INITIAL_STATE: OfflineSessionsState = {
  sessions: [],
  loading: true,
  error: null,
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  },
}

export default function OfflineSessionsPage() {
  const { language } = useLanguage()
  const { branchId, session, loading: authLoading } = useEnhancedAuth()
  const { canViewReports } = usePermissions()

  // Translations
  const t = useMemo(() => ({
    title: language === 'fr' ? "Sessions Hors Ligne" : 'Offline Sessions',
    subtitle: language === 'fr' ? "Historique d'activation et désactivation du mode hors ligne" : 'Offline mode activation and deactivation history',
    errors: {
      accessDenied: language === 'fr' ? "Accès refusé: l'utilisateur n'est pas associé à une succursale active ou n'a pas la permission des rapports." : 'Access denied: user is not linked to an active branch or lacks reports permission.',
      loadFailed: language === 'fr' ? 'Échec du chargement des sessions' : 'Failed to load sessions',
    },
    noSessions: language === 'fr' ? 'Aucune session hors ligne trouvée' : 'No offline sessions found',
  }), [language])

  // State management
  const [state, setState] = useState<OfflineSessionsState>(INITIAL_STATE)
  const [dateRange, setDateRange] = useState<DateRange>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [pageLimit] = useState(50)

  // Derived state
  const isAuthenticated = useMemo(() =>
    !authLoading && !!branchId && !!session && canViewReports,
    [authLoading, branchId, session, canViewReports]
  )

  // API calls
  const loadSessions = useCallback(async () => {
    if (!isAuthenticated) return

    setState(prev => ({
      ...prev,
      loading: true,
      error: null
    }))

    try {
      // Get session token from Supabase
      const { supabase } = await import('@/lib/supabase')
      const { data: { session: supabaseSession } } = await supabase.auth.getSession()

      if (!supabaseSession?.access_token) {
        throw new Error(t.errors.accessDenied)
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageLimit.toString(),
      })

      if (dateRange.from) {
        params.append('startDate', dateRange.from.toISOString())
      }
      if (dateRange.to) {
        params.append('endDate', dateRange.to.toISOString())
      }

      const response = await fetch(
        `${API_BASE_URL}/api/v1/offline-events?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${supabaseSession.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(t.errors.accessDenied)
        }
        throw new Error(t.errors.loadFailed)
      }

      const result = await response.json()

      setState(prev => ({
        ...prev,
        sessions: result.data.sessions,
        pagination: {
          ...prev.pagination,
          total: result.data.total,
          totalPages: result.data.totalPages,
          page: result.data.page,
        },
        loading: false
      }))
    } catch (error) {
      console.error('[OfflineSessions] Failed to load sessions:', error)

      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : t.errors.loadFailed
      }))
    }
  }, [isAuthenticated, currentPage, pageLimit, dateRange, t.errors])

  // Effects
  useEffect(() => {
    if (isAuthenticated) {
      loadSessions()
    }
  }, [isAuthenticated, loadSessions])

  // Event handlers
  const handleDateRangeChange = useCallback((range: DateRange) => {
    setDateRange(range)
    setCurrentPage(1) // Reset to first page when filter changes
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
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
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 px-2 py-8 sm:px-4 lg:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Offline Sessions Table */}
                <div className="lg:col-span-12">
                  <OfflineSessionsTable
                    sessions={state.sessions}
                    loading={state.loading}
                    error={state.error}
                    dateRange={dateRange}
                    onDateRangeChange={handleDateRangeChange}
                    pagination={state.pagination}
                    onPageChange={handlePageChange}
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
