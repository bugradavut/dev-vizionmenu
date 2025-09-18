"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, Search, Eye, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { ActivityLog, ActivityLogFilters, ActivityLogFilterOptions } from "@/services/activity-logs.service"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { buildChangeRows, labelFor, formatValue } from "@/lib/audit-utils"

type DateRange = { from?: Date; to?: Date }

interface ActivityLogsTableProps {
  logs: ActivityLog[]
  loading: boolean
  error: string | null
  filters: ActivityLogFilters
  onFiltersChange: (filters: ActivityLogFilters) => void
  filterOptions: ActivityLogFilterOptions | null
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
  language: "en" | "fr"
  className?: string
}

export function ActivityLogsTable({
  logs,
  loading,
  error,
  filters,
  onFiltersChange,
  filterOptions,
  dateRange,
  onDateRangeChange,
  language,
  className
}: ActivityLogsTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [openRange, setOpenRange] = useState(false)

  const t = {
    title: language === 'fr' ? "Journaux d'Activité" : 'Activity Logs',
    searchPlaceholder: language === 'fr' ? 'Rechercher des journaux...' : 'Search logs...',
    filters: language === 'fr' ? 'Filtres' : 'Filters',
    dateRange: language === 'fr' ? 'Plage de dates' : 'Date range',
    actionType: language === 'fr' ? "Type d'action" : 'Action type',
    entityType: language === 'fr' ? "Type d'entité" : 'Entity type',
    user: language === 'fr' ? 'Utilisateur' : 'User',
    reset: language === 'fr' ? 'Réinitialiser' : 'Reset',
    details: language === 'fr' ? 'Détails' : 'Details',
    changes: language === 'fr' ? 'Changements' : 'Changes',
    actions: {
      viewChanges: language === 'fr' ? 'Voir Diff' : 'View Diff',
      viewCreated: language === 'fr' ? 'Voir Créé' : 'View Created',
      viewDeleted: language === 'fr' ? 'Voir Supprimé' : 'View Deleted',
      viewDetails: language === 'fr' ? 'Voir Détails' : 'View Details'
    },
    table: {
      date: language === 'fr' ? 'Date' : 'Date',
      user: language === 'fr' ? 'Utilisateur' : 'User',
      email: language === 'fr' ? 'Courriel' : 'Email',
      action: language === 'fr' ? 'Action' : 'Action',
      entity: language === 'fr' ? 'Entité' : 'Entity',
      branch: language === 'fr' ? 'Succursale' : 'Branch',
      actions: language === 'fr' ? 'Actions' : 'Actions',
      noData: language === 'fr' ? 'Aucune donnée' : 'No data',
      field: language === 'fr' ? 'Champ' : 'Field',
      from: language === 'fr' ? 'Avant' : 'From',
      to: language === 'fr' ? 'Après' : 'To',
      value: language === 'fr' ? 'Valeur' : 'Value'
    },
    modal: {
      applyFilters: language === 'fr' ? 'Appliquer les Filtres' : 'Apply Filters',
      filterDesc: language === 'fr' ? "Filtrer les journaux d'activité par action, entité ou utilisateur" : 'Filter activity logs by action, entity, or user',
      allActions: language === 'fr' ? 'Toutes Actions' : 'All Actions',
      allEntities: language === 'fr' ? 'Toutes Entités' : 'All Entities',
      allUsers: language === 'fr' ? 'Tous Utilisateurs' : 'All Users',
      loading: language === 'fr' ? 'Chargement...' : 'Loading...',
      noMatch: language === 'fr' ? 'Aucun journal ne correspond aux critères de recherche' : 'No logs match your search criteria'
    }
  }


  const resetFilters = () => {
    onFiltersChange({ page: 1, limit: 20 })
    onDateRangeChange({})
    setSearchQuery("")
  }

  // Filter logs by search query
  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true
    const searchLower = searchQuery.toLowerCase()
    return (
      log.user?.full_name?.toLowerCase().includes(searchLower) ||
      log.user?.email?.toLowerCase().includes(searchLower) ||
      log.action_type.toLowerCase().includes(searchLower) ||
      log.entity_type.toLowerCase().includes(searchLower) ||
      log.branch?.name?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        {/* Header with Title and Actions */}
        <div className="space-y-4">
          {/* Header with Title and Actions */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">
                {t.title}
              </CardTitle>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Search Input */}
              <div className="relative w-full md:w-full lg:w-auto">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full lg:min-w-[200px]"
                />
              </div>

              {/* Date Range Button */}
              <Popover open={openRange} onOpenChange={setOpenRange}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {dateRange.from && dateRange.to
                      ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`
                      : t.dateRange
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => onDateRangeChange({ from: range?.from, to: range?.to })}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

            {/* Filter Sheet */}
            <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-[#424245] dark:text-[#86868b]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                  </svg>
                </Button>
              </SheetTrigger>
              <SheetContent className="flex flex-col">
                <SheetHeader>
                  <SheetTitle>{t.filters}</SheetTitle>
                  <SheetDescription>
                    {t.modal.filterDesc}
                  </SheetDescription>
                </SheetHeader>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">
                  <div className="grid gap-6 py-6">
                    {/* Action Type */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-foreground">{t.actionType}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onFiltersChange({ ...filters, actionType: undefined, page: 1 })}
                          className={`justify-start ${!filters.actionType
                            ? 'bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'
                            : ''
                            }`}
                        >
                          {t.modal.allActions}
                        </Button>
                        {(filterOptions?.actionTypes || []).map((action) => (
                          <Button
                            key={action}
                            variant="outline"
                            size="sm"
                            onClick={() => onFiltersChange({ ...filters, actionType: action, page: 1 })}
                            className={`justify-start capitalize ${filters.actionType === action
                              ? 'bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'
                              : ''
                              }`}
                          >
                            {action}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Entity Type */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-foreground">{t.entityType}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onFiltersChange({ ...filters, entityType: undefined, page: 1 })}
                          className={`justify-start ${!filters.entityType
                            ? 'bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'
                            : ''
                            }`}
                        >
                          {t.modal.allEntities}
                        </Button>
                        {(filterOptions?.entityTypes || []).map((entity) => (
                          <Button
                            key={entity}
                            variant="outline"
                            size="sm"
                            onClick={() => onFiltersChange({ ...filters, entityType: entity, page: 1 })}
                            className={`justify-start capitalize ${filters.entityType === entity
                              ? 'bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'
                              : ''
                              }`}
                          >
                            {entity.replace('_', ' ')}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* User */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-foreground">{t.user}</h4>
                      <div className="grid grid-cols-1 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onFiltersChange({ ...filters, userId: undefined, page: 1 })}
                          className={`justify-start ${!filters.userId
                            ? 'bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'
                            : ''
                            }`}
                        >
                          {t.modal.allUsers}
                        </Button>
                        {(filterOptions?.users || []).map((user) => (
                          <Button
                            key={user.id}
                            variant="outline"
                            size="sm"
                            onClick={() => onFiltersChange({ ...filters, userId: user.id, page: 1 })}
                            className={`justify-start text-left ${filters.userId === user.id
                              ? 'bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'
                              : ''
                              }`}
                          >
                            {user.full_name || user.email}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fixed Bottom Actions */}
                <div className="flex gap-2 pt-4 border-t bg-background">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                    className="flex-1"
                  >
                    {t.reset}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsFilterSheetOpen(false)}
                    className="flex-1"
                  >
                    {t.modal.applyFilters}
                  </Button>
                </div>
              </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        {error && (
          <div className="mb-4 mx-6 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="rounded-md overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="text-sm text-muted-foreground">{t.modal.loading}</span>
              </div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? t.modal.noMatch : t.table.noData}
            </div>
          ) : (
            <Table className="min-w-[900px]">
              <TableHeader className="bg-muted">
                <TableRow className="hover:bg-muted">
                  <TableHead className="px-4 w-[140px]">{t.table.date}</TableHead>
                  <TableHead className="px-4">{t.table.user}</TableHead>
                  <TableHead className="px-4">{t.table.email}</TableHead>
                  <TableHead className="px-4">{t.table.action}</TableHead>
                  <TableHead className="px-4">{t.table.entity}</TableHead>
                  <TableHead className="px-4">{t.table.branch}</TableHead>
                  <TableHead className="px-4 text-right">{t.table.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium px-4">
                      {new Date(log.created_at).toLocaleDateString('en-CA', {
                        timeZone: 'America/Toronto',
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })}
                    </TableCell>
                    <TableCell className="px-4">
                      {log.user?.full_name || log.user?.email || log.user_id}
                    </TableCell>
                    <TableCell className="px-4 text-sm text-muted-foreground">
                      {log.user?.email || '-'}
                    </TableCell>
                    <TableCell className="capitalize px-4">
                      <span className={cn(
                        "inline-flex items-center px-2 py-1 rounded-lg border text-xs font-medium",
                        log.action_type === 'create' && "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300",
                        log.action_type === 'update' && "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300",
                        log.action_type === 'delete' && "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300"
                      )}>
                        {log.action_type}
                      </span>
                    </TableCell>
                    <TableCell className="capitalize px-4">
                      {log.entity_type.replace('_', ' ')}
                    </TableCell>
                    <TableCell className="px-4">
                      {log.branch?.name ? (
                        <div className="inline-flex items-center px-2 py-1 rounded-lg border text-xs font-medium bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-300">
                          <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {log.branch.name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right px-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          {log.action_type === 'update' ? (
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              {t.actions.viewChanges}
                            </Button>
                          ) : log.action_type === 'create' ? (
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              {t.actions.viewCreated}
                            </Button>
                          ) : log.action_type === 'delete' ? (
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4 mr-1" />
                              {t.actions.viewDeleted}
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              {t.actions.viewDetails}
                            </Button>
                          )}
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{t.changes}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">

                            {/* Change table */}
                            {(() => {
                              const rows = buildChangeRows(log.changes)
                              const hasBeforeAfter = Boolean(log.changes && typeof log.changes === 'object' && 'before' in log.changes && 'after' in log.changes)
                              const showFromTo = hasBeforeAfter
                              return (
                                <div className="border rounded max-h-96 overflow-y-auto overflow-x-hidden">
                                  <Table className="table-fixed w-full">
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="px-3 w-1/3">{t.table.field}</TableHead>
                                        {showFromTo ? (
                                          <>
                                            <TableHead className="px-3 w-1/3">{t.table.from}</TableHead>
                                            <TableHead className="px-3 w-1/3">{t.table.to}</TableHead>
                                          </>
                                        ) : (
                                          <TableHead className="px-3 w-2/3">{t.table.value}</TableHead>
                                        )}
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {rows.map((r, idx) => {
                                        const hasChange = showFromTo && r.from !== undefined && r.from !== r.to
                                        return (
                                          <TableRow key={idx}>
                                            <TableCell className="px-3 w-1/3 break-words">{labelFor(r.field, language)}</TableCell>
                                            {showFromTo ? (
                                              <>
                                                <TableCell className={`px-3 w-1/3 break-words ${hasChange ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' : 'text-muted-foreground'}`}>
                                                  {r.from !== undefined ? formatValue(r.field, r.from, language) : '-'}
                                                </TableCell>
                                                <TableCell className={`px-3 w-1/3 break-words ${hasChange ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' : ''}`}>
                                                  {formatValue(r.field, r.to, language)}
                                                </TableCell>
                                              </>
                                            ) : (
                                              <TableCell className="px-3 w-2/3 break-words" colSpan={2}>{formatValue(r.field, r.to, language)}</TableCell>
                                            )}
                                          </TableRow>
                                        )
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              )
                            })()}

                            {/* Developer Info */}
                            <Accordion type="single" className="w-full">
                              <AccordionItem value="dev-info">
                                <AccordionTrigger className="text-sm text-muted-foreground">
                                  {language === 'fr' ? 'Pour Développeurs' : 'For Developers'}
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="font-medium text-muted-foreground">Log ID:</span>
                                        <span className="ml-2 font-mono text-xs">{log.id}</span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-muted-foreground">Entity ID:</span>
                                        <span className="ml-2 font-mono text-xs">{log.entity_id || '-'}</span>
                                      </div>
                                      <div className="col-span-2">
                                        <span className="font-medium text-muted-foreground">Entity Type:</span>
                                        <span className="ml-2 font-mono text-xs">{log.entity_type}</span>
                                      </div>
                                    </div>
                                    <details className="text-xs">
                                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Raw JSON</summary>
                                      <pre className="whitespace-pre-wrap bg-muted p-3 rounded mt-2 max-h-[30vh] overflow-auto font-mono">
{JSON.stringify(log.changes ?? {}, null, 2)}
                                      </pre>
                                    </details>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

      </CardContent>
    </Card>
  )
}
