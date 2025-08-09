"use client"

import { useState, useEffect } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table2, LayoutGrid, ArrowRight, Search, X, RefreshCw, AlertCircle } from "lucide-react"
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
import { useOrderTimer } from "@/hooks/use-order-timer"
import { useEnhancedAuth } from "@/hooks/use-enhanced-auth"
import { useBranchSettings } from "@/hooks/use-branch-settings"
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/translations"
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
// Order type imported for future use

type ViewMode = 'table' | 'card'

export default function LiveOrdersPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState("")
  const { language } = useLanguage()
  const t = translations[language] || translations.en

  // Get branch context and settings
  const { branchId } = useEnhancedAuth()
  const { settings } = useBranchSettings({ branchId: branchId || undefined })

  // Initialize orders hook with live orders filter
  const { 
    orders, 
    loading, 
    error, 
    fetchOrders, 
    refetch,
    clearError 
  } = useOrders({
    status: 'pending,preparing,ready',
    limit: 50
  })

  // Initialize timer service for auto-ready functionality
  const {
    error: timerError,
    startTimer,
    stopTimer,
    runManualCheck,
    clearError: clearTimerError
  } = useOrderTimer()


  // Load saved view mode from localStorage on component mount
  useEffect(() => {
    const savedViewMode = localStorage.getItem('liveOrdersViewMode') as ViewMode
    if (savedViewMode && (savedViewMode === 'table' || savedViewMode === 'card')) {
      setViewMode(savedViewMode)
    }
  }, [])

  // Auto-start timer service when component mounts
  useEffect(() => {
    startTimer()
    
    // Cleanup: stop timer when component unmounts
    return () => {
      stopTimer()
    }
  }, [startTimer, stopTimer])

  // Save view mode to localStorage when it changes
  const handleViewModeChange = (newViewMode: ViewMode) => {
    setViewMode(newViewMode)
    localStorage.setItem('liveOrdersViewMode', newViewMode)
  }

  // Handle status filter changes
  const handleStatusFilterChange = async (newStatus: string) => {
    setStatusFilter(newStatus)
    
    const statusParam = newStatus === 'all' ? 'pending,preparing,ready' : newStatus
    await fetchOrders({
      status: statusParam,
      search: searchQuery || undefined,
      limit: 50
    })
  }

  // Handle search changes with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      const statusParam = statusFilter === 'all' ? 'pending,preparing,ready' : statusFilter
      await fetchOrders({
        status: statusParam,
        search: searchQuery || undefined,
        limit: 50
      })
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, statusFilter, fetchOrders])

  // Note: Auto-refresh removed - now using Supabase Realtime for instant updates!

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
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      preparing: "secondary", 
      ready: "default",
      completed: "default",
      rejected: "destructive",
      cancelled: "destructive"
    }
    
    const colors: Record<string, string> = {
      pending: "text-orange-700 border-orange-300 bg-orange-100",
      preparing: "text-blue-700 border-blue-300 bg-blue-100",
      ready: "text-green-700 border-green-400 bg-green-100",
      completed: "text-gray-600 border-gray-200 bg-gray-50",
      rejected: "text-red-700 border-red-300 bg-red-100",
      cancelled: "text-red-700 border-red-300 bg-red-100"
    }

    const getStatusText = (status: string) => {
      switch(status) {
        case 'pending': return t.liveOrders.statusPending
        case 'preparing': return t.liveOrders.statusPreparing
        case 'ready': return t.liveOrders.statusReady
        case 'completed': return t.liveOrders.statusCompleted
        case 'rejected': return t.liveOrders.statusRejected
        case 'cancelled': return t.liveOrders.statusCancelled
        default: return status.charAt(0).toUpperCase() + status.slice(1)
      }
    }

    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {getStatusText(status)}
      </Badge>
    )
  }

  // Filter orders client-side for immediate UI response
  const getFilteredOrders = () => {
    let filteredOrders = orders
    
    // Client-side status filter (backend already filters, but this handles 'all' case)
    if (statusFilter !== 'all') {
      filteredOrders = filteredOrders.filter(order => order.status === statusFilter)
    }
    
    // Client-side search filter for immediate response
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filteredOrders = filteredOrders.filter(order => 
        order.id.toLowerCase().includes(query) ||
        (order.customer?.name && order.customer.name.toLowerCase().includes(query)) ||
        (order.customer?.phone && order.customer.phone.toLowerCase().includes(query)) ||
        (order.customer?.email && order.customer.email.toLowerCase().includes(query))
      )
    }
    
    return filteredOrders
  }

  const renderFilterButtons = () => (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6 pb-4 border-b">
      {/* Filter Buttons - Left Side */}
      <div className="flex items-center gap-2">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleStatusFilterChange('all')}
          className="h-9 text-sm"
          disabled={loading}
        >
          {t.liveOrders.filterAll}
        </Button>
        <Button
          variant={statusFilter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleStatusFilterChange('pending')}
          className="h-9 text-sm"
          disabled={loading}
        >
          {t.liveOrders.filterNewOrders}
        </Button>
        <Button
          variant={statusFilter === 'preparing' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleStatusFilterChange('preparing')}
          className="h-9 text-sm"
          disabled={loading}
        >
          {t.liveOrders.filterPreparing}
        </Button>
        <Button
          variant={statusFilter === 'ready' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleStatusFilterChange('ready')}
          className="h-9 text-sm"
          disabled={loading}
        >
          {t.liveOrders.filterReady}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            // Refresh orders and run manual timer check
            await Promise.all([
              refetch(),
              runManualCheck()
            ]);
          }}
          className="h-9 text-sm ml-2"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
        
      </div>
      
      {/* Search Bar - Right Side */}
      <div className="relative flex-1 min-w-0 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t.liveOrders.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10 w-full"
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
    </div>
  )

  const renderTableView = () => {
    const filteredOrders = getFilteredOrders()
    
    return (
      <div className="space-y-4">
        {renderFilterButtons()}
        
        {/* Error Alerts */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Orders Error: {error}
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

        {timerError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Timer Service Error: {timerError}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearTimerError}
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
                <TableHead className="w-[140px]">{t.liveOrders.tableHeaderChannel}</TableHead>
                <TableHead className="w-[120px]">{t.liveOrders.tableHeaderOrder}</TableHead>
                <TableHead className="w-[200px]">{t.liveOrders.tableHeaderCustomer}</TableHead>
                <TableHead className="w-[100px]">{t.liveOrders.tableHeaderStatus}</TableHead>
                <TableHead className="w-[90px]">{t.liveOrders.tableHeaderTotal}</TableHead>
                <TableHead className="w-[80px]">{t.liveOrders.tableHeaderTime}</TableHead>
                <TableHead className="w-[70px] text-center">{t.liveOrders.tableHeaderAction}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Loading orders...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <p className="text-muted-foreground">No live orders found</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        New orders will appear here automatically
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell>
                      {renderSourceIcon(order.source)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{order.orderNumber}</TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm text-foreground font-medium">{order.customer.name}</div>
                        <div className="text-sm text-muted-foreground">{order.customer.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">${order.pricing.total.toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleTimeString('tr-TR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Link href={`/orders/${order.orderNumber}?context=live`}>
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
              Loading orders...
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center justify-center">
              <p className="text-lg text-muted-foreground">No live orders found</p>
              <p className="text-sm text-muted-foreground mt-2">
                New orders will appear here automatically
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
                    <div className="flex items-center gap-2">
                      {renderSourceIcon(order.source)}
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                  
                  {/* Customer Info */}
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <div className="text-sm font-medium text-foreground">{order.customer.name}</div>
                        <div className="text-xs text-muted-foreground">{order.customer.phone}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-foreground">{order.orderNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleTimeString('tr-TR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Total and Action */}
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-bold text-foreground">
                      ${order.pricing.total.toFixed(2)}
                    </div>
                    <Link href={`/orders/${order.orderNumber}?context=live`}>
                      <button className="px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors text-sm font-medium text-gray-700">
                        View Details
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
            <div className="flex items-center justify-between w-full px-4">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <DynamicBreadcrumb />
              </div>
              
              {/* Simplified Mode Badge */}
              {settings.orderFlow === 'simplified' && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-blue-700 font-medium">
                    {t.liveOrders.simplifiedModeActive}
                  </span>
                </div>
              )}
            </div>
          </header>
          <div className="flex flex-1 flex-col px-2 sm:px-4 lg:px-6">
            {/* Header Section */}
            <div className="px-2 py-6 sm:px-4 lg:px-6 bg-background">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  <h1 className="text-3xl font-bold tracking-tight">{t.liveOrders.pageTitle}</h1>
                  <p className="text-muted-foreground mt-2 text-lg">
                    {t.liveOrders.pageSubtitle}
                  </p>
                </div>
                <div className="lg:col-span-4 flex items-center justify-end">
                  {/* View Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{t.liveOrders.viewLabel}</span>
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