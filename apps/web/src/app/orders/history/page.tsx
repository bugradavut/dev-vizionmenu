"use client"

import { useState, useEffect, useCallback } from "react"
import { type DateRange } from "react-day-picker"
import { format } from "date-fns"
import { AuthGuard } from "@/components/auth-guard"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table2, LayoutGrid, ArrowRight, CalendarIcon, ArrowUpDown, Search, X, RefreshCw, AlertCircle, QrCode, CornerUpLeft } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import Calendar04 from "@/components/ui/calendar-04"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSourceIcon } from "@/assets/images"
import Image from "next/image"
import Link from "next/link"
import { useOrders } from "@/hooks/use-orders"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/translations"
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
// Order type imported but used in future implementations


type ViewMode = 'table' | 'card'

export default function OrderHistoryPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all') // New: QR filter
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [searchQuery, setSearchQuery] = useState("")
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false) // New: Sheet state
  const { language } = useLanguage()
  const t = translations[language] || translations.en

  // Initialize orders hook with history orders filter
  const { 
    orders, 
    loading, 
    error, 
    fetchOrders, 
    refetch,
    clearError 
  } = useOrders({
    status: 'completed,cancelled,rejected',
    limit: 50
  })

  // Load saved view mode from localStorage on component mount
  useEffect(() => {
    const savedViewMode = localStorage.getItem('orderHistoryViewMode') as ViewMode
    if (savedViewMode && (savedViewMode === 'table' || savedViewMode === 'card')) {
      setViewMode(savedViewMode)
    }
  }, [])

  // Save view mode to localStorage when it changes
  const handleViewModeChange = (newViewMode: ViewMode) => {
    setViewMode(newViewMode)
    localStorage.setItem('orderHistoryViewMode', newViewMode)
  }

  // Handle filter changes
  const handleFiltersChange = useCallback(async () => {
    const params: Record<string, string | number> = {
      limit: 50
    }

    // Status filter
    if (statusFilter === 'all') {
      params.status = 'completed,cancelled,rejected'
    } else {
      params.status = statusFilter
    }

    // Date range filter
    if (dateRange?.from) {
      params.date_from = format(dateRange.from, 'yyyy-MM-dd')
      if (dateRange.to) {
        params.date_to = format(dateRange.to, 'yyyy-MM-dd')
      }
    }

    // Search filter
    if (searchQuery.trim()) {
      params.search = searchQuery.trim()
    }

    await fetchOrders(params)
  }, [fetchOrders, statusFilter, dateRange, searchQuery])


  // Trigger API call when filters change
  useEffect(() => {
    const timeoutId = setTimeout(handleFiltersChange, 300)
    return () => clearTimeout(timeoutId)
  }, [statusFilter, dateRange, searchQuery, handleFiltersChange])

  // Note: Manual auto-refresh removed - Order History is loaded on-demand and refreshed via manual refresh button


  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'qr_code': return 'QR Code'
      case 'uber_eats': return 'Uber Eats'
      case 'doordash': return 'DoorDash'
      case 'phone': return 'Phone'
      case 'web': return 'Web'
      default: return 'Unknown'
    }
  }

  const renderSourceIcon = (source: string) => {
    const iconSrc = getSourceIcon(source)
    const label = getSourceLabel(source)
    return (
      <div className="flex items-center gap-2">
        <Image 
          src={iconSrc}
          alt={`${source} icon`}
          width={32}
          height={32}
          className="w-8 h-8 flex-shrink-0"
        />
        <span className="text-base text-muted-foreground">{label}</span>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      rejected: "destructive",
      cancelled: "destructive"
    }
    
    const colors: Record<string, string> = {
      completed: "text-green-700 border-green-500 bg-green-100",
      cancelled: "text-red-700 border-red-300 bg-red-100",
      rejected: "text-red-700 border-red-300 bg-red-100"
    }

    const getStatusText = (status: string) => {
      switch(status) {
        case 'completed': return t.orderHistory.statusCompleted
        case 'cancelled': return t.orderHistory.statusCancelled
        case 'rejected': return t.orderHistory.statusRejected
        default: return status.charAt(0).toUpperCase() + status.slice(1)
      }
    }

    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {getStatusText(status)}
      </Badge>
    )
  }

  const getFilteredOrders = () => {
    // Sort orders client-side (API filtering is handled server-side)
    let filteredOrders = [...orders]
    
    // Client-side search filter for immediate response
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filteredOrders = filteredOrders.filter(order => 
        order.id.toLowerCase().includes(query) ||
        order.orderNumber.toLowerCase().includes(query) ||
        (order.customer?.name && order.customer.name.toLowerCase().includes(query)) ||
        (order.customer?.phone && order.customer.phone.toLowerCase().includes(query)) ||
        (order.customer?.email && order.customer.email.toLowerCase().includes(query))
      )
    }
    
    // Client-side source filter for QR/Web filtering
    if (sourceFilter !== 'all') {
      filteredOrders = filteredOrders.filter(order => {
        if (sourceFilter === 'qr') {
          // QR orders have source 'qr_code' or have table_number
          return order.source === 'qr_code' || (order.order_type === 'dine_in' && order.table_number)
        } else if (sourceFilter === 'web') {
          // Web orders don't have QR indicators
          return order.source !== 'qr_code' && !(order.order_type === 'dine_in' && order.table_number)
        }
        return true
      })
    }
    
    // Sort orders
    const sortedOrders = filteredOrders.sort((a, b) => {
      const dateA = new Date(a.created_at)
      const dateB = new Date(b.created_at)
      return sortOrder === 'newest' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime()
    })

    return sortedOrders
  }


  const setQuickDateRange = (days: number) => {
    const today = new Date()
    const startDate = new Date()
    startDate.setDate(today.getDate() - days)
    
    setDateRange({
      from: startDate,
      to: today
    })
  }


  const setLastMonth = () => {
    const today = new Date()
    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
    
    setDateRange({
      from: firstDayLastMonth,
      to: lastDayLastMonth
    })
  }

  const renderFilterButtons = () => (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 border-b pb-4">
      {/* Left side: Refresh only */}
      <div className="flex items-center gap-2">
        {/* Refresh Button - Live Orders style */}
        <Button
          variant="outline"
          onClick={refetch}
          className="h-9 px-3 text-sm"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {language === 'fr' ? 'Actualiser' : 'Refresh'}
        </Button>
      </div>
      
      {/* Date Range & Search - Right side on desktop, separate rows on mobile/tablet */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-2">
        {/* Date Range only */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-9 text-sm font-medium min-w-[140px] justify-between flex-shrink-0">
                {formatDateRange()}
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="flex flex-col">
                <div className="flex h-[300px]">
                  {/* Quick Date Buttons */}
                  <div className="flex flex-col justify-between p-3 h-full">
                    <div className="flex flex-col gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="justify-start text-xs h-8"
                        onClick={() => setQuickDateRange(1)}
                      >
                        Yesterday
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="justify-start text-xs h-8"
                        onClick={() => setQuickDateRange(7)}
                      >
                        Last 7 Days
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="justify-start text-xs h-8"
                        onClick={() => setQuickDateRange(15)}
                      >
                        Last 15 Days
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="justify-start text-xs h-8"
                        onClick={() => setQuickDateRange(30)}
                      >
                        Last 30 Days
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="justify-start text-xs h-8"
                        onClick={setLastMonth}
                      >
                        Last Month
                      </Button>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="justify-start text-xs h-8 text-red-600 border-red-300 hover:text-red-700 hover:bg-red-50 hover:border-red-400 mt-4"
                      onClick={() => setDateRange(undefined)}
                    >
                      Reset Range
                    </Button>
                  </div>
                  
                  {/* Calendar */}
                  <Calendar04 selected={dateRange} onSelect={setDateRange} />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Search Bar with Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.orderHistory.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 w-full h-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Sheet - User management style */}
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
                <SheetTitle>{language === 'fr' ? 'Filtrer les Commandes' : 'Filter Orders'}</SheetTitle>
                <SheetDescription>
                  {language === 'fr' ? 'Filtrer par statut, source et tri' : 'Filter by status, source and sorting'}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto">
                <div className="grid gap-6 py-6">
                  {/* Status Filter */}
                  <div className="space-y-3">
                    <h4 className="text-base font-medium text-foreground">
                      {language === 'fr' ? 'Statut' : 'Status'}
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStatusFilter('all')}
                        className={`justify-start ${
                          statusFilter === 'all'
                            ? 'bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'
                            : ''
                        }`}
                      >
                        {t.orderHistory.filterAll}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStatusFilter('completed')}
                        className={`justify-start ${
                          statusFilter === 'completed'
                            ? 'bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'
                            : ''
                        }`}
                      >
                        {t.orderHistory.filterCompleted}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStatusFilter('cancelled')}
                        className={`justify-start ${
                          statusFilter === 'cancelled'
                            ? 'bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'
                            : ''
                        }`}
                      >
                        {t.orderHistory.filterCancelled}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStatusFilter('rejected')}
                        className={`justify-start ${
                          statusFilter === 'rejected'
                            ? 'bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'
                            : ''
                        }`}
                      >
                        {t.orderHistory.filterRejected}
                      </Button>
                    </div>
                  </div>

                  {/* Source Filter - NEW QR FILTERING */}
                  <div className="space-y-3">
                    <h4 className="text-base font-medium text-foreground">
                      {language === 'fr' ? 'Source' : 'Order Source'}
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSourceFilter('all')}
                        className={`justify-start ${
                          sourceFilter === 'all'
                            ? 'bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'
                            : ''
                        }`}
                      >
                        {language === 'fr' ? 'Toutes les Sources' : 'All Sources'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSourceFilter('qr')}
                        className={`justify-start ${
                          sourceFilter === 'qr'
                            ? 'bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'
                            : ''
                        }`}
                      >
                        {language === 'fr' ? 'Commandes QR' : 'QR Orders'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSourceFilter('web')}
                        className={`justify-start ${
                          sourceFilter === 'web'
                            ? 'bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'
                            : ''
                        }`}
                      >
                        {language === 'fr' ? 'Commandes Web' : 'Web Orders'}
                      </Button>
                    </div>
                  </div>

                  {/* Sort Order */}
                  <div className="space-y-3">
                    <h4 className="text-base font-medium text-foreground">
                      {language === 'fr' ? 'Tri' : 'Sort Order'}
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSortOrder('newest')}
                        className={`justify-start gap-2 ${
                          sortOrder === 'newest'
                            ? 'bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'
                            : ''
                        }`}
                      >
                        <ArrowUpDown className="h-4 w-4" />
                        {t.orderHistory.sortNewest}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSortOrder('oldest')}
                        className={`justify-start gap-2 ${
                          sortOrder === 'oldest'
                            ? 'bg-slate-100 border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'
                            : ''
                        }`}
                      >
                        <ArrowUpDown className="h-4 w-4" />
                        {t.orderHistory.sortOldest}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4 border-t bg-background">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('all');
                    setSourceFilter('all');
                    setSortOrder('newest');
                    setIsFilterSheetOpen(false);
                  }}
                  className="flex-1"
                >
                  {language === 'fr' ? 'Effacer' : 'Clear Filters'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsFilterSheetOpen(false)}
                  className="flex-1"
                >
                  {language === 'fr' ? 'Appliquer' : 'Apply Filters'}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  )

  const formatDateRange = () => {
    if (!dateRange?.from) return t.orderHistory.dateRange
    if (!dateRange.to) return format(dateRange.from, "MMM dd")
    if (dateRange.from.getTime() === dateRange.to.getTime()) {
      return format(dateRange.from, "MMM dd")
    }
    return `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd")}`
  }

  const renderTableView = () => {
    const filteredOrders = getFilteredOrders()
    
    return (
      <div className="space-y-4">
        {renderFilterButtons()}
        
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearError}
                className="ml-2"
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">{t.orderHistory.tableHeaderChannel}</TableHead>
                <TableHead className="w-[120px]">{t.orderHistory.tableHeaderOrder}</TableHead>
                <TableHead className="w-[200px]">{t.orderHistory.tableHeaderCustomer}</TableHead>
                <TableHead className="w-[100px]">{t.orderHistory.tableHeaderStatus}</TableHead>
                <TableHead className="w-[90px]">{t.orderHistory.tableHeaderTotal}</TableHead>
                <TableHead className="w-[80px]">{t.orderHistory.tableHeaderDate}</TableHead>
                <TableHead className="w-[70px] text-center">{t.orderHistory.tableHeaderAction}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      {t.orderHistory.loading}
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <p className="text-muted-foreground">{t.orderHistory.noOrdersFound}</p>
                      <p className="text-base text-muted-foreground mt-1">
                        Try adjusting your filters or date range
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        {renderSourceIcon(order.source)}
                        {/* QR Order Badge - Show table/zone for QR orders */}
                        {(order.source === 'qr_code' || (order.order_type === 'dine_in' && order.table_number)) && (
                          <Badge variant="outline" className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border-blue-200">
                            <QrCode className="h-3 w-3 mr-1" />
                            {order.zone === 'Screen' 
                              ? 'Screen' 
                              : order.zone 
                                ? `Table ${order.table_number} - ${order.zone}`
                                : `Table ${order.table_number}`
                            }
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-base text-muted-foreground">{order.orderNumber}</TableCell>
                    <TableCell>
                      <div>
                        <div className="text-base text-foreground font-medium">{order.customer.name}</div>
                        <div className="text-base text-muted-foreground">{order.customer.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-base text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span>${order.pricing.total.toFixed(2)}</span>
                        {(order.total_refunded ?? 0) > 0 && (
                          <Badge variant="outline" className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border-amber-300">
                            <CornerUpLeft className="h-3 w-3 mr-1" />
                            Partial Refund
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-base text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('en-CA', {
                        timeZone: order.branch_timezone || 'America/Toronto'
                      })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Link href={`/orders/${order.orderNumber}?context=history`}>
                        <button className="p-2 bg-orange-50 hover:bg-orange-100 rounded-md border border-orange-200 transition-colors">
                          <ArrowRight className="h-4 w-4 text-orange-600" />
                        </button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }


  const renderCardView = () => {
    const filteredOrders = getFilteredOrders()
    
    return (
      <div className="space-y-4">
        {renderFilterButtons()}
        
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearError}
                className="ml-2"
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {loading && filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              Loading order history...
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center justify-center">
              <p className="text-lg text-muted-foreground">No orders found</p>
              <p className="text-base text-muted-foreground mt-2">
                Try adjusting your filters or date range
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-lg transition-all duration-200">
                <CardContent className="p-5">
                  {/* Header - Channel and Status */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center gap-2 flex-wrap">
                      {renderSourceIcon(order.source)}
                      {/* QR Order Badge - Show table/zone for QR orders */}
                      {(order.source === 'qr_code' || (order.order_type === 'dine_in' && order.table_number)) && (
                        <Badge variant="outline" className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border-blue-200">
                          <QrCode className="h-3 w-3 mr-1" />
                          {order.zone === 'Screen' 
                            ? 'Screen' 
                            : order.zone 
                              ? `Table ${order.table_number} - ${order.zone}`
                              : `Table ${order.table_number}`
                          }
                        </Badge>
                      )}
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                  
                  {/* Customer Info */}
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <div className="text-base font-medium text-foreground">{order.customer.name}</div>
                        <div className="text-xs text-muted-foreground">{order.customer.phone}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-foreground">{order.orderNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('en-CA', {
                        timeZone: order.branch_timezone || 'America/Toronto'
                      })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleTimeString('en-CA', {
                            timeZone: order.branch_timezone || 'America/Toronto',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Total and Action */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="text-xl font-bold text-foreground">
                        ${order.pricing.total.toFixed(2)}
                      </div>
                      {(order.total_refunded ?? 0) > 0 && (
                        <Badge variant="outline" className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border-amber-300 w-fit">
                          <CornerUpLeft className="h-3 w-3 mr-1" />
                          Partial Refund
                        </Badge>
                      )}
                    </div>
                    <Link href={`/orders/${order.orderNumber}?context=history`}>
                      <button className="px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors text-base font-medium text-gray-700">
                        {t.orderHistory.viewDetails}
                      </button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
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
                  <h1 className="text-3xl font-bold tracking-tight">{t.orderHistory.pageTitle}</h1>
                  <p className="text-muted-foreground mt-2 text-lg">
                    {t.orderHistory.pageSubtitle}
                  </p>
                </div>
                <div className="lg:col-span-4 flex items-center justify-end">
                  {/* View Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-base text-muted-foreground">{t.orderHistory.viewLabel}</span>
                    <Button
                      variant={viewMode === 'table' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleViewModeChange('table')}
                      aria-label="Table view"
                    >
                      <Table2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'card' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleViewModeChange('card')}
                      aria-label="Card view"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 px-2 py-8 sm:px-4 lg:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-12">
                  {viewMode === 'table' ? renderTableView() : renderCardView()}
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </DashboardLayout>
    </AuthGuard>
  )
}