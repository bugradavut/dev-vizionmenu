"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, Eye, WifiOff, Wifi, Clock } from "lucide-react"
import { format, formatDistanceStrict } from "date-fns"
import { cn } from "@/lib/utils"

type DateRange = { from?: Date; to?: Date }

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

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface OfflineSessionsTableProps {
  sessions: OfflineSession[]
  loading: boolean
  error: string | null
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
  pagination: Pagination
  onPageChange: (page: number) => void
  language: "en" | "fr"
  className?: string
}

export function OfflineSessionsTable({
  sessions,
  loading,
  error,
  dateRange,
  onDateRangeChange,
  pagination,
  onPageChange,
  language,
  className
}: OfflineSessionsTableProps) {
  const [openRange, setOpenRange] = useState(false)
  const [selectedSession, setSelectedSession] = useState<OfflineSession | null>(null)

  const t = {
    title: language === 'fr' ? "Sessions Hors Ligne" : 'Offline Sessions',
    dateRange: language === 'fr' ? 'Plage de dates' : 'Date range',
    reset: language === 'fr' ? 'Réinitialiser' : 'Reset',
    table: {
      activatedAt: language === 'fr' ? 'Activation' : 'Activated At',
      deactivatedAt: language === 'fr' ? 'Désactivation' : 'Deactivated At',
      duration: language === 'fr' ? 'Durée' : 'Duration',
      ordersCreated: language === 'fr' ? 'Commandes Créées' : 'Orders Created',
      status: language === 'fr' ? 'Statut' : 'Status',
      actions: language === 'fr' ? 'Actions' : 'Actions',
      noData: language === 'fr' ? 'Aucune session trouvée' : 'No sessions found',
      active: language === 'fr' ? 'Active' : 'Active',
      completed: language === 'fr' ? 'Terminée' : 'Completed',
    },
    details: {
      title: language === 'fr' ? 'Détails de la Session' : 'Session Details',
      viewDetails: language === 'fr' ? 'Voir Détails' : 'View Details',
      sessionId: language === 'fr' ? 'ID Session' : 'Session ID',
      branchId: language === 'fr' ? 'ID Succursale' : 'Branch ID',
      activatedAt: language === 'fr' ? 'Activée à' : 'Activated At',
      deactivatedAt: language === 'fr' ? 'Désactivée à' : 'Deactivated At',
      duration: language === 'fr' ? 'Durée' : 'Duration',
      ordersCreated: language === 'fr' ? 'Commandes Créées' : 'Orders Created',
      syncAttempts: language === 'fr' ? 'Tentatives de Sync' : 'Sync Attempts',
      lastStatus: language === 'fr' ? 'Dernier Statut' : 'Last Status',
      deviceInfo: language === 'fr' ? 'Info Appareil' : 'Device Info',
      userAgent: language === 'fr' ? 'User Agent' : 'User Agent',
      notAvailable: language === 'fr' ? 'Non disponible' : 'Not available',
      stillActive: language === 'fr' ? 'Toujours active' : 'Still active',
    },
    loading: language === 'fr' ? 'Chargement...' : 'Loading...',
    error: language === 'fr' ? 'Erreur de chargement' : 'Loading error',
  }

  const resetFilters = () => {
    onDateRangeChange({})
  }

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return '-'

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      const date = new Date(dateStr)
      // Format: "31 Oct 2025, 00:58"
      return format(date, 'dd MMM yyyy, HH:mm')
    } catch {
      return dateStr
    }
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{t.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">
            {t.error}: {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={cn("border-none shadow-none", className)}>
        <CardContent className="p-0">
          {/* Filters */}
          <div className="flex items-center justify-end gap-2 mb-4">
            {/* Date Range Filter */}
            <Popover open={openRange} onOpenChange={setOpenRange}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>{t.dateRange}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    onDateRangeChange({ from: range?.from, to: range?.to })
                    if (range?.from && range?.to) {
                      setOpenRange(false)
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {/* Reset Button */}
            {(dateRange.from || dateRange.to) && (
              <Button variant="outline" onClick={resetFilters}>
                {t.reset}
              </Button>
            )}
          </div>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t.loading}
            </div>
          ) : !sessions || sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t.table.noData}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.table.status}</TableHead>
                    <TableHead>{t.table.activatedAt}</TableHead>
                    <TableHead>{t.table.deactivatedAt}</TableHead>
                    <TableHead>{t.table.duration}</TableHead>
                    <TableHead className="text-center">{t.table.ordersCreated}</TableHead>
                    <TableHead className="text-right">{t.table.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        {session.deactivated_at ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <Wifi className="h-4 w-4" />
                            <span className="text-xs font-medium">{t.table.completed}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-orange-600">
                            <WifiOff className="h-4 w-4" />
                            <span className="text-xs font-medium">{t.table.active}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateTime(session.activated_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {session.deactivated_at ? formatDateTime(session.deactivated_at) : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDuration(session.duration_seconds)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                          {session.orders_created}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedSession(session)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              {t.details.viewDetails}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="text-xl">{t.details.title}</DialogTitle>
                            </DialogHeader>
                            {selectedSession && (
                              <div className="space-y-6">
                                {/* Session Info Card */}
                                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                                  <h3 className="text-sm font-semibold text-foreground mb-3">Session Information</h3>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">{t.details.sessionId}</p>
                                      <p className="text-sm font-mono text-foreground break-all">{selectedSession.id}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">{t.details.branchId}</p>
                                      <p className="text-sm font-mono text-foreground break-all">{selectedSession.branch_id}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Time Info Card */}
                                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                                  <h3 className="text-sm font-semibold text-foreground mb-3">Timeline</h3>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">{t.details.activatedAt}</p>
                                      <p className="text-sm text-foreground">{formatDateTime(selectedSession.activated_at)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">{t.details.deactivatedAt}</p>
                                      <p className="text-sm text-foreground">
                                        {selectedSession.deactivated_at
                                          ? formatDateTime(selectedSession.deactivated_at)
                                          : <span className="text-orange-600 font-medium">{t.details.stillActive}</span>
                                        }
                                      </p>
                                    </div>
                                  </div>
                                  <div className="pt-2 border-t border-border">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">{t.details.duration}</p>
                                    <p className="text-sm font-semibold text-foreground">{formatDuration(selectedSession.duration_seconds)}</p>
                                  </div>
                                </div>

                                {/* Stats Card */}
                                <div className="bg-muted/50 p-4 rounded-lg">
                                  <h3 className="text-sm font-semibold text-foreground mb-3">Statistics</h3>
                                  <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center p-3 bg-background rounded-md">
                                      <p className="text-2xl font-bold text-primary">{selectedSession.orders_created}</p>
                                      <p className="text-xs text-muted-foreground mt-1">{t.details.ordersCreated}</p>
                                    </div>
                                    <div className="text-center p-3 bg-background rounded-md">
                                      <p className="text-2xl font-bold text-blue-600">{selectedSession.sync_attempts}</p>
                                      <p className="text-xs text-muted-foreground mt-1">{t.details.syncAttempts}</p>
                                    </div>
                                    <div className="text-center p-3 bg-background rounded-md">
                                      <p className="text-sm font-bold text-green-600 capitalize">{selectedSession.last_network_status || '-'}</p>
                                      <p className="text-xs text-muted-foreground mt-1">{t.details.lastStatus}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Device Info Card */}
                                {selectedSession.device_info && (
                                  <div className="bg-muted/50 p-4 rounded-lg">
                                    <h3 className="text-sm font-semibold text-foreground mb-3">{t.details.deviceInfo}</h3>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div>
                                        <p className="text-xs text-muted-foreground">Screen</p>
                                        <p className="text-foreground font-mono">
                                          {selectedSession.device_info.screen?.width} × {selectedSession.device_info.screen?.height}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Language</p>
                                        <p className="text-foreground">{selectedSession.device_info.language || t.details.notAvailable}</p>
                                      </div>
                                    </div>
                                    {selectedSession.user_agent && (
                                      <div className="mt-3 pt-3 border-t border-border">
                                        <p className="text-xs text-muted-foreground mb-2">Browser</p>
                                        <p className="text-xs font-mono text-muted-foreground leading-relaxed break-words bg-background p-2 rounded">
                                          {selectedSession.user_agent}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
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
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {language === 'fr'
                  ? `Page ${pagination.page} sur ${pagination.totalPages}`
                  : `Page ${pagination.page} of ${pagination.totalPages}`
                }
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  {language === 'fr' ? 'Précédent' : 'Previous'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  {language === 'fr' ? 'Suivant' : 'Next'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
