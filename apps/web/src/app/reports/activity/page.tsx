"use client"

import { useEffect, useMemo, useState } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useLanguage } from "@/contexts/language-context"
import { useEnhancedAuth, usePermissions } from "@/hooks/use-enhanced-auth"
import { activityLogsService, type ActivityLog, type ActivityLogFilters, type ActivityLogFilterOptions, type ActivityLogStats } from "@/services/activity-logs.service"
import { ApiClientError } from "@/services/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, CalendarIcon, FileText, Filter } from "lucide-react"
import { format } from "date-fns"
import { MetricsCard } from "@/components/analytics/metrics-card"
import { ExportButton } from "@/components/analytics/export-button"

type DateRange = { from?: Date; to?: Date }

export default function ActivityLogsPage() {
  const { language } = useLanguage()
  const { chainId, session, loading: authLoading } = useEnhancedAuth()
  const { canViewReports } = usePermissions()

  const t = {
    title: language === 'fr' ? "Journaux d'Activité" : 'Activity Logs',
    subtitle: language === 'fr' ? "Suivez les changements des utilisateurs et les activités système" : 'Track user changes and system activities',
    dateRange: language === 'fr' ? 'Plage de dates' : 'Date range',
    actionType: language === 'fr' ? "Type d'action" : 'Action type',
    entityType: language === 'fr' ? "Type d'entité" : 'Entity type',
    user: language === 'fr' ? 'Utilisateur' : 'User',
    filters: language === 'fr' ? 'Filtres' : 'Filters',
    reset: language === 'fr' ? 'Réinitialiser' : 'Reset',
    changes: language === 'fr' ? 'Changements' : 'Changes',
    details: language === 'fr' ? 'Détails' : 'Details',
    table: {
      date: language === 'fr' ? 'Date' : 'Date',
      user: language === 'fr' ? 'Utilisateur' : 'User',
      action: language === 'fr' ? 'Action' : 'Action',
      entity: language === 'fr' ? 'Entité' : 'Entity',
      branch: language === 'fr' ? 'Succursale' : 'Branch',
      // ip removed
      view: language === 'fr' ? 'Voir' : 'View',
      noData: language === 'fr' ? 'Aucune donnée' : 'No data',
    },
    stats: {
      total: language === 'fr' ? 'Total Journaux' : 'Total Logs',
      today: language === 'fr' ? "Journaux d'Aujourd'hui" : 'Logs Today',
      topUser: language === 'fr' ? 'Utilisateur le plus actif' : 'Most Active User',
    }
  }

  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [options, setOptions] = useState<ActivityLogFilterOptions | null>(null)
  const [stats, setStats] = useState<ActivityLogStats | null>(null)

  const [dateRange, setDateRange] = useState<DateRange>({})
  const [openRange, setOpenRange] = useState(false)
  const [filters, setFilters] = useState<ActivityLogFilters>({ page: 1, limit })

  const loadOptions = async () => {
    if (authLoading || !chainId || !session || !canViewReports) return
    try {
      const resp = await activityLogsService.getFilterOptions(chainId)
      setOptions(resp.data)
    } catch (e) {
      console.error('Failed to load filter options', e)
    }
  }

  const loadStats = async () => {
    if (authLoading || !chainId || !session || !canViewReports) return
    setStatsLoading(true)
    try {
      const resp = await activityLogsService.getActivityStats(
        chainId,
        dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      )
      setStats(resp.data)
    } catch (e: unknown) {
      console.error('Failed to load activity stats', e)
      if (e instanceof ApiClientError && e.status === 403) {
        setError(language === 'fr' ? "Accès refusé: l'utilisateur n'est pas associé à une succursale active ou n'a pas la permission des rapports." : 'Access denied: user is not linked to an active branch or lacks reports permission.')
      }
    } finally {
      setStatsLoading(false)
    }
  }

  const loadLogs = async () => {
    if (authLoading || !chainId || !session || !canViewReports) return
    setLoading(true)
    setError(null)
    try {
      const resp = await activityLogsService.getActivityLogs(chainId, {
        ...filters,
        page,
        limit,
        startDate: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        endDate: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      })
      setLogs(resp.data.logs)
      setTotal(resp.data.total)
      setTotalPages(resp.data.totalPages)
    } catch (e: unknown) {
      console.error('Failed to load activity logs', e)
      if (e instanceof ApiClientError && e.status === 403) {
        setError(language === 'fr' ? "Accès refusé: l'utilisateur n'est pas associé à une succursale active ou n'a pas la permission des rapports." : 'Access denied: user is not linked to an active branch or lacks reports permission.')
      } else {
        setError((e as Error)?.message || 'Failed to load logs')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOptions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, authLoading, session, canViewReports])

  useEffect(() => {
    loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, authLoading, session, canViewReports, dateRange.from?.toString(), dateRange.to?.toString()])

  useEffect(() => {
    loadLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, authLoading, session, canViewReports, page, limit, filters.actionType, filters.entityType, filters.userId, dateRange.from?.toString(), dateRange.to?.toString()])

  const csvRows = useMemo(() => {
    return logs.map((l) => ({
      id: l.id,
      date: l.created_at,
      user: l.user?.full_name || l.user?.email || l.user_id,
      action: l.action_type,
      entity: l.entity_type,
      entity_id: l.entity_id || '',
      branch: l.branch?.name || l.branch_id || '',
    }))
  }, [logs])

  const canPrev = page > 1
  const canNext = page < totalPages

  const resetFilters = () => {
    setFilters({ page: 1, limit })
    setDateRange({})
    setPage(1)
  }

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
                <div className="lg:col-span-4 flex items-center justify-end gap-2">
                  <ExportButton language={language} data={csvRows} filename="activity-logs.csv" />
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 px-2 py-8 sm:px-4 lg:px-6">
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {statsLoading ? (
                  <>
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                  </>
                ) : (
                  <>
                    <MetricsCard label={t.stats.total} value={stats?.totalLogs ?? 0} />
                    <MetricsCard label={t.stats.today} value={stats?.logsToday ?? 0} />
                    <MetricsCard label={t.stats.topUser} value={stats?.mostActiveUser?.full_name || '-'} />
                  </>
                )}
              </div>

              {/* Filters */}
              <Card className="border mb-6">
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center gap-2"><Filter className="h-4 w-4" /> {t.filters}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    {/* Date Range */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground">{t.dateRange}</label>
                      <Popover open={openRange} onOpenChange={setOpenRange}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {dateRange.from && dateRange.to ? `${format(dateRange.from, 'yyyy-MM-dd')} - ${format(dateRange.to, 'yyyy-MM-dd')}` : t.dateRange}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
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
                    </div>

                    {/* Action Type */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground">{t.actionType}</label>
                      <Select value={filters.actionType ?? 'all'} onValueChange={(v) => { setPage(1); setFilters((f) => ({ ...f, actionType: v === 'all' ? undefined : v })) }}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {(options?.actionTypes || []).map((a) => (
                            <SelectItem key={a} value={a}>{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Entity Type */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground">{t.entityType}</label>
                      <Select value={filters.entityType ?? 'all'} onValueChange={(v) => { setPage(1); setFilters((f) => ({ ...f, entityType: v === 'all' ? undefined : v })) }}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {(options?.entityTypes || []).map((e) => (
                            <SelectItem key={e} value={e}>{e}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* User */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground">{t.user}</label>
                      <Select value={filters.userId ?? 'all'} onValueChange={(v) => { setPage(1); setFilters((f) => ({ ...f, userId: v === 'all' ? undefined : v })) }}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {(options?.users || []).map((u) => (
                            <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Reset */}
                    <div className="flex gap-2">
                      <Button variant="outline" className="h-9" onClick={resetFilters}>{t.reset}</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Logs Table */}
              <Card className="border">
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> {t.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {loading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-8" />
                      <Skeleton className="h-8" />
                      <Skeleton className="h-8" />
                    </div>
                  ) : error ? (
                    <div className="text-sm text-red-600">{error}</div>
                  ) : logs.length === 0 ? (
                    <div className="text-sm text-muted-foreground">{t.table.noData}</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[140px]">{t.table.date}</TableHead>
                            <TableHead>{t.table.user}</TableHead>
                            <TableHead>{t.table.action}</TableHead>
                            <TableHead>{t.table.entity}</TableHead>
                            <TableHead>{t.table.branch}</TableHead>
                            <TableHead className="text-right">{t.details}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {logs.map((l) => (
                            <TableRow key={l.id}>
                              <TableCell className="font-medium">{format(new Date(l.created_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                              <TableCell>{l.user?.full_name || l.user?.email || l.user_id}</TableCell>
                              <TableCell className="capitalize">{l.action_type}</TableCell>
                              <TableCell className="capitalize">{l.entity_type}</TableCell>
                              <TableCell>{l.branch?.name || '-'}</TableCell>
                              <TableCell className="text-right">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">{t.details}</Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>{t.changes}</DialogTitle>
                                    </DialogHeader>
                                    <pre className="whitespace-pre-wrap text-xs bg-muted p-3 rounded max-h-[60vh] overflow-auto">
{JSON.stringify(l.changes ?? {}, null, 2)}
                                    </pre>
                                  </DialogContent>
                                </Dialog>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-xs text-muted-foreground">
                      {total} items • Page {page} / {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={!canPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" disabled={!canNext} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </SidebarInset>
      </DashboardLayout>
    </AuthGuard>
  )
}
