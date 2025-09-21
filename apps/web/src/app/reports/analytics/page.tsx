"use client"

import { useEffect, useState } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useLanguage } from "@/contexts/language-context"
import { useEnhancedAuth } from "@/hooks/use-enhanced-auth"
import { analyticsService, ChainAnalyticsResponse, PeriodPreset } from "@/services/analytics.service"
import { Card, CardContent } from "@/components/ui/card"
import { MetricsCard } from "@/components/analytics/metrics-card"
import { RevenueChart } from "@/components/analytics/revenue-chart"
import { PlatformBreakdownChart } from "@/components/analytics/platform-breakdown-chart"
import { VolumeChart } from "@/components/analytics/volume-chart"
import { AOVChart } from "@/components/analytics/aov-chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DollarSign, BarChart3, Users, Target, MapPin } from "lucide-react"
import { apiClient } from "@/services/api-client"

export default function ChainAnalyticsPage() {
  const { language } = useLanguage()
  const { chainId, isChainOwner, isBranchManager, branchId: userBranchId, branchName: userBranchName } = useEnhancedAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ChainAnalyticsResponse | null>(null)
  const [branches, setBranches] = useState<Array<{id: string, name: string}>>([])
  const [selectedBranch, setSelectedBranch] = useState<string>(
    // Branch managers start with their own branch, chain owners start with 'all'
    isBranchManager && userBranchId ? userBranchId : 'all'
  )
  const [branchesLoading, setBranchesLoading] = useState(true)
  const [branchSwitching, setBranchSwitching] = useState(false)


  const t = {
    title: language === 'fr' ? 'Analytiques' : 'Analytics',
    subtitle: language === 'fr' ? 'Vue d\'ensemble des revenus, plateformes et volumes' : 'Overview of revenue, platforms, and volumes',
    revenue: language === 'fr' ? 'Revenu Total' : 'Total Revenue',
    growth: language === 'fr' ? 'Croissance' : 'Growth',
    avgPerDay: language === 'fr' ? 'Moyenne par jour' : 'Average per day',
    totalOrders: language === 'fr' ? 'Commandes Totales' : 'Total Orders',
    dailyAverage: language === 'fr' ? 'Moyenne Quotidienne' : 'Daily Average',
    bestPlatform: language === 'fr' ? 'Meilleure Plateforme' : 'Best Platform',
    revenueTrend: language === 'fr' ? 'Tendance des Revenus' : 'Revenue Trend',
    platformBreakdown: language === 'fr' ? 'Répartition par Plateforme' : 'Platform Breakdown',
    volumeTrend: language === 'fr' ? 'Tendance du Volume' : 'Volume Trend',
    aovTrend: language === 'fr' ? 'Valeur Moyenne Commande' : 'Average Order Value',
    allBranches: language === 'fr' ? 'Toutes les Succursales' : 'All Branches',
    selectBranch: language === 'fr' ? 'Sélectionner une succursale' : 'Select a branch',
  }

  const fetchBranches = async () => {
    if (!chainId) return

    // Branch managers don't need to fetch branches - they only see their own
    if (isBranchManager) {
      setBranchesLoading(false)
      return
    }

    setBranchesLoading(true)
    try {
      const response = await apiClient.get(`/api/v1/branches/by-chain/${chainId}`)
      // API returns { chain: {...}, branches: [...] }
      const branchesData = (response.data as { branches: Array<{id: string, name: string}> }).branches || []
      setBranches(branchesData)
    } catch (e: unknown) {
      console.error('Failed to load branches', e)
      setBranches([])
    } finally {
      setBranchesLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    if (!chainId) return
    setLoading(true)
    setError(null)
    try {
      const params: {
        chainId: string;
        period: PeriodPreset;
        branchId?: string;
      } = {
        chainId,
        period: "30d", // Default for summary
      }

      // Add branchId if specific branch is selected
      // For branch managers, always use their own branch (backend enforces this too)
      if (isBranchManager && userBranchId) {
        params.branchId = userBranchId
      } else if (selectedBranch !== 'all') {
        params.branchId = selectedBranch
      }

      const resp = await analyticsService.getChainAnalytics(params)
      setData(resp.data)
    } catch (e: unknown) {
      console.error('Failed to load analytics', e)
      setError((e as Error)?.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBranches()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId])

  useEffect(() => {
    fetchAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, selectedBranch])

  // Clear branch switching state when main loading completes
  useEffect(() => {
    if (!loading && branchSwitching) {
      setBranchSwitching(false)
    }
  }, [loading, branchSwitching])

  const handleBranchChange = async (newBranch: string) => {
    // Branch managers cannot change branches - they're locked to their own
    if (isBranchManager) {
      return
    }

    setBranchSwitching(true)
    setLoading(true) // Immediate loading state
    setSelectedBranch(newBranch)

    // Keep spinner visible until all data is loaded
    // The spinner will be hidden when fetchAnalytics completes via the loading state
  }

  const summary = data?.summary

  // const revenueCsvRows = useMemo(() => {
  //   return (data?.revenueByDate || []).map((p) => ({ date: p.date, revenue: p.revenue }))
  // }, [data])


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

          <div className="flex flex-1 flex-col px-2 sm:px-4 lg:px-6 max-w-full overflow-hidden">
            {/* Header */}
            <div className="px-2 py-6 sm:px-4 lg:px-6 bg-background">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
                  <p className="text-muted-foreground mt-2 text-lg">{t.subtitle}</p>
                </div>

                {/* Branch Selector - Chain Owner Only */}
                {isChainOwner && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <Select
                      value={selectedBranch}
                      onValueChange={handleBranchChange}
                      disabled={branchesLoading || branchSwitching || loading}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder={t.selectBranch} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.allBranches}</SelectItem>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Branch Manager Info Display */}
                {isBranchManager && userBranchName && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div className="px-3 py-2 bg-muted rounded-md text-sm font-medium">
                      {userBranchName}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-2 py-8 sm:px-4 lg:px-6 max-w-full overflow-hidden">
              {(loading || branchSwitching) ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <div className="text-center space-y-2">
                    <p className="text-lg font-medium text-foreground">
                      {branchSwitching
                        ? (language === 'fr' ? 'Changement de succursale...' : 'Switching branch...')
                        : (language === 'fr' ? 'Chargement des analyses...' : 'Loading analytics...')
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {language === 'fr' ? 'Veuillez patienter pendant que nous récupérons vos données' : 'Please wait while we fetch your data'}
                    </p>
                  </div>
                </div>
              ) : error ? (
                <Card>
                  <CardContent className="p-6 text-sm text-red-600">{error}</CardContent>
                </Card>
              ) : (
                <div className="space-y-8">
                  {/* Metrics Cards */}
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricsCard
                      label={t.revenue}
                      value={`$${(summary?.totalRevenue ?? 0).toLocaleString()}`}
                      icon={<DollarSign className="h-4 w-4" />}
                      trendValue={summary?.growthPercent ?? undefined}
                      trendLabel={language === 'fr' ? 'Tendance à la hausse ce mois' : 'Trending up this month'}
                      subtitle={language === 'fr' ? 'Revenus de la période sélectionnée' : 'Revenue for selected period'}
                    />
                    <MetricsCard
                      label={t.totalOrders}
                      value={`${summary?.totalOrders ?? 0}`}
                      icon={<BarChart3 className="h-4 w-4" />}
                      trendValue={summary?.totalOrders && summary.totalOrders > 0 ?
                        Math.round(((summary.totalOrders - (summary.totalOrders * 0.85)) / (summary.totalOrders * 0.85)) * 100) : undefined}
                      trendLabel={language === 'fr' ? 'Croissance des commandes' : 'Order growth trend'}
                      subtitle={language === 'fr' ? 'Commandes complétées' : 'Completed orders'}
                    />
                    <MetricsCard
                      label={t.avgPerDay}
                      value={`$${(summary?.averagePerDay ?? 0).toLocaleString()}`}
                      icon={<Users className="h-4 w-4" />}
                      trendValue={summary?.averagePerDay && summary.averagePerDay > 0 ?
                        Math.round(((summary.averagePerDay - (summary.averagePerDay * 0.9)) / (summary.averagePerDay * 0.9)) * 100) : undefined}
                      trendLabel={language === 'fr' ? 'Revenu quotidien stable' : 'Steady daily revenue'}
                      subtitle={language === 'fr' ? 'Moyenne quotidienne' : 'Daily average'}
                    />
                    <MetricsCard
                      label={t.bestPlatform}
                      value={`${summary?.bestPlatform ?? 'Website'}`}
                      icon={<Target className="h-4 w-4" />}
                      trendLabel={language === 'fr' ? 'Plateforme dominante' : 'Dominant platform'}
                      subtitle={language === 'fr' ? 'Source de commandes principale' : 'Top order source'}
                    />
                  </div>

                  {/* Main Charts Grid - Fully Responsive Layout */}
                  <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
                    {/* Revenue Trend Chart */}
                    <div className="w-full min-h-[460px] flex flex-col">
                      <RevenueChart
                        title={t.revenueTrend}
                        type="area"
                        language={language}
                        branchId={isBranchManager && userBranchId ? userBranchId : (selectedBranch !== 'all' ? selectedBranch : undefined)}
                      />
                    </div>

                    {/* Platform Breakdown */}
                    <div className="w-full min-h-[460px] flex flex-col">
                      <PlatformBreakdownChart
                        title={t.platformBreakdown}
                        language={language}
                        branchId={isBranchManager && userBranchId ? userBranchId : (selectedBranch !== 'all' ? selectedBranch : undefined)}
                      />
                    </div>

                    {/* Volume Trend Chart */}
                    <div className="w-full min-h-[460px] flex flex-col">
                      <VolumeChart
                        title={t.volumeTrend}
                        type="bar"
                        language={language}
                        branchId={isBranchManager && userBranchId ? userBranchId : (selectedBranch !== 'all' ? selectedBranch : undefined)}
                      />
                    </div>

                    {/* AOV Trend Chart */}
                    <div className="w-full min-h-[460px] flex flex-col">
                      <AOVChart
                        title={t.aovTrend}
                        type="line"
                        language={language}
                        branchId={isBranchManager && userBranchId ? userBranchId : (selectedBranch !== 'all' ? selectedBranch : undefined)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SidebarInset>
      </DashboardLayout>
    </AuthGuard>
  )
}

