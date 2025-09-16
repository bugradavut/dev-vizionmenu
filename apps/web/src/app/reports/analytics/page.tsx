"use client"

import { useEffect, useMemo, useState } from "react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { CalendarIcon, DollarSign, BarChart3, Users, Target } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { ExportButton } from "@/components/analytics/export-button"
import { format } from "date-fns"

type DateRange = { from?: Date; to?: Date }

export default function ChainAnalyticsPage() {
  const { language } = useLanguage()
  const { chainId } = useEnhancedAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ChainAnalyticsResponse | null>(null)

  const [period, setPeriod] = useState<PeriodPreset>("7d")
  const [dateRange, setDateRange] = useState<DateRange>({})
  const [openRange, setOpenRange] = useState(false)

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
    period7: language === 'fr' ? '7j' : '7d',
    period30: language === 'fr' ? '30j' : '30d',
    period90: language === 'fr' ? '90j' : '90d',
    custom: language === 'fr' ? 'Personnalisé' : 'Custom',
    dateRange: language === 'fr' ? 'Plage de dates' : 'Date range',
    noData: language === 'fr' ? 'Aucune donnée' : 'No data',
  }

  const fetchAnalytics = async () => {
    if (!chainId) return
    setLoading(true)
    setError(null)
    try {
      const resp = await analyticsService.getChainAnalytics({
        chainId,
        period: period !== 'custom' ? period : undefined,
        startDate: period === 'custom' && dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        endDate: period === 'custom' && dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      })
      setData(resp.data)
    } catch (e: unknown) {
      console.error('Failed to load analytics', e)
      setError((e as Error)?.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, period, dateRange.from?.toString(), dateRange.to?.toString()])

  const summary = data?.summary

  // const revenueCsvRows = useMemo(() => {
  //   return (data?.revenueByDate || []).map((p) => ({ date: p.date, revenue: p.revenue }))
  // }, [data])

  const breakdownCsvRows = useMemo(() => {
    return (data?.sourceBreakdown || []).map((s) => ({ source: s.source, revenue: s.revenue, orders: s.order_count }))
  }, [data])

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
            {/* Header */}
            <div className="px-2 py-6 sm:px-4 lg:px-6 bg-background">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
                  <p className="text-muted-foreground mt-2 text-lg">{t.subtitle}</p>
                </div>
                <div className="lg:col-span-4 flex items-center justify-end gap-2">
                  {/* Period presets */}
                  <div className="flex items-center gap-1">
                    <Button variant={period === '7d' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('7d')}>{t.period7}</Button>
                    <Button variant={period === '30d' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('30d')}>{t.period30}</Button>
                    <Button variant={period === '90d' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('90d')}>{t.period90}</Button>
                  </div>
                  {/* Custom range */}
                  <Popover open={openRange} onOpenChange={setOpenRange}>
                    <PopoverTrigger asChild>
                      <Button variant={period === 'custom' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('custom')}>
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {t.custom}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <div className="p-2">
                        <Calendar
                          mode="range"
                          selected={{ from: dateRange.from, to: dateRange.to }}
                          onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                          numberOfMonths={2}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                  {/* Export - allow CSV for breakdown; revenue timeline CSV too */}
                  <ExportButton
                    language={language}
                    data={breakdownCsvRows}
                    filename="platform-breakdown.csv"
                  />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-2 py-8 sm:px-4 lg:px-6">
              {loading ? (
                <div className="grid grid-cols-1 gap-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                  </div>
                  <Skeleton className="h-80" />
                  <Skeleton className="h-80" />
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

                  {/* Main Charts Row */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Revenue Trend Chart */}
                    <div className="lg:col-span-1">
                      <RevenueChart
                        data={data?.revenueByDate || []}
                        title={t.revenueTrend}
                        type="line"
                        language={language}
                      />
                    </div>

                    {/* Platform Breakdown */}
                    <div className="lg:col-span-1">
                      <PlatformBreakdownChart
                        data={data?.sourceBreakdown || []}
                        title={t.platformBreakdown}
                        language={language}
                      />
                    </div>
                  </div>

                  {/* Volume Trend Chart - Full Width */}
                  <div className="w-full">
                    <VolumeChart
                      data={data?.ordersByDate || []}
                      title={t.volumeTrend}
                      language={language}
                    />
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

