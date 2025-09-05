"use client"

import { useState, useEffect, useCallback } from "react"
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
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSourceIcon } from "@/assets/images"
import Image from "next/image"
import Link from "next/link"
import { useOrders } from "@/hooks/use-orders"
import type { Order } from "@/services/orders.service"
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
  // Status filter removed - only showing preparing orders
  const [searchQuery, setSearchQuery] = useState("")
  const [currentTime, setCurrentTime] = useState(new Date())
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
    status: 'preparing,scheduled', // Include both preparing and scheduled orders
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

  // Timer service runs in background - no automatic refresh needed

  // Timer calculation for each order
  const getOrderTimerInfo = useCallback((order: Order) => {
    if (!order || order.status !== 'preparing' || !settings.timingSettings?.autoReady) {
      return null
    }

    const timingSettings = settings.timingSettings
    const baseKitchenPrepTime = timingSettings.baseDelay + timingSettings.temporaryBaseDelay
    const individualAdjustment = order.individual_timing_adjustment || 0
    const totalKitchenPrepTime = baseKitchenPrepTime + individualAdjustment
    
    // Use updated_at as reference time (when order moved to preparing)
    const prepStartTime = new Date(order.updated_at)
    const elapsedMinutes = (currentTime.getTime() - prepStartTime.getTime()) / (1000 * 60)
    const remainingMinutes = Math.max(0, totalKitchenPrepTime - elapsedMinutes)
    
    const isComplete = remainingMinutes <= 0
    const progressPercent = Math.min(100, (elapsedMinutes / totalKitchenPrepTime) * 100)
    
    return {
      progressPercent,
      isComplete,
      remainingMinutes: Math.floor(remainingMinutes),
      baseTime: baseKitchenPrepTime,
      adjustment: individualAdjustment,
      totalTime: totalKitchenPrepTime
    }
  }, [currentTime, settings.timingSettings])

  // Update current time every second for progress bars
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    
    return () => clearInterval(interval)
  }, [])

  // Save view mode to localStorage when it changes
  const handleViewModeChange = (newViewMode: ViewMode) => {
    setViewMode(newViewMode)
    localStorage.setItem('liveOrdersViewMode', newViewMode)
  }

  // Status filter removed - only showing preparing orders in new flow

  // Handle search changes with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      const statusParam = 'preparing,scheduled' // Include both preparing and scheduled orders
      await fetchOrders({
        status: statusParam,
        search: searchQuery || undefined,
        limit: 50
      })
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, fetchOrders])

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

  const renderSourceIcon = (source: string, order?: Order) => {
    const iconSrc = getSourceIcon(source)
    const label = getSourceLabel(source)
    return (
      <div className="flex items-center gap-3">
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
        {/* Show table/zone badge for QR orders - SIMPLE RULE: Screen = show "Screen" only */}
        {source === 'qr_code' && (order?.tableNumber || order?.table_number) && (
          <Badge variant="outline" className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border-blue-200">
            {/* SIMPLE RULE: Screen zone = show "Screen" only, no table number */}
            {order.zone === 'Screen' 
              ? 'Screen' 
              : order.zone 
                ? `Table ${order.tableNumber || order.table_number} - ${order.zone}`
                : `Table ${order.tableNumber || order.table_number}`
            }
          </Badge>
        )}
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      preparing: "secondary", 
      scheduled: "outline", // Pre-orders scheduled for later
      completed: "default",
      rejected: "destructive",
      cancelled: "destructive"
    }
    
    const colors: Record<string, string> = {
      preparing: "text-blue-700 border-blue-300 bg-blue-100",
      scheduled: "text-yellow-800 border-yellow-300 bg-yellow-100", // Medium yellow for scheduled orders
      completed: "text-gray-600 border-gray-200 bg-gray-50",
      rejected: "text-red-700 border-red-300 bg-red-100",
      cancelled: "text-red-700 border-red-300 bg-red-100"
    }

    const getStatusText = (status: string) => {
      switch(status) {
        case 'preparing': return t.liveOrders.statusPreparing
        case 'scheduled': return 'Scheduled' // Pre-order scheduled for later
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
      {/* Refresh Button - Left Side */}
      <div className="flex items-center gap-3">
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
          className="h-9 px-3 text-sm"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t.kitchenDisplay.refresh}
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
                  <TableRow key={order.id} className={`transition-colors ${
                    order.status === 'scheduled' 
                      ? 'border-yellow-300 hover:bg-yellow-100' 
                      : 'bg-white hover:bg-gray-50'
                  }`} style={{
                    backgroundColor: order.status === 'scheduled' ? '#fefce8' : undefined // Custom yellow between 50 and 100
                  }}>
                    <TableCell>
                      {renderSourceIcon(order.source, order)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1.5">
                        <div className="text-sm text-muted-foreground">{order.orderNumber}</div>
                        {(() => {
                          const timerInfo = getOrderTimerInfo(order)
                          if (timerInfo && settings.timingSettings?.autoReady) {
                            return (
                              <div className="flex items-center gap-2">
                                <div className="w-12">
                                  <Progress 
                                    value={timerInfo.progressPercent} 
                                    className="h-1.5 bg-gray-300" 
                                  />
                                </div>
                                <div className="text-xs text-orange-600 font-mono">
                                  {timerInfo.isComplete ? '0m' : `${timerInfo.remainingMinutes}m`}
                                </div>
                              </div>
                            )
                          }
                          return null
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm text-foreground font-medium">{order.customer.name}</div>
                        <div className="text-sm text-muted-foreground">{order.customer.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">${order.pricing.total.toFixed(2)}</TableCell>
                    <TableCell className="text-sm">
                      {order.status === 'scheduled' ? (
                        <div className="text-sm font-semibold text-orange-800">
                            {(() => {
                              // Build from separate date and time fields for accurate display
                              if (order.scheduled_date && order.scheduled_time) {
                                // Parse date and time separately to avoid timezone issues
                                const dateStr = order.scheduled_date; // '2025-08-28'
                                const timeStr = order.scheduled_time; // '11:45:00'
                                
                                // Create date object in local time (not UTC)
                                const [year, month, day] = dateStr.split('-').map(Number);
                                const [hour, minute] = timeStr.split(':').map(Number);
                                
                                const scheduledDate = new Date(year, month - 1, day, hour, minute);
                                const today = new Date();
                                const tomorrow = new Date(today);
                                tomorrow.setDate(today.getDate() + 1);
                                
                                // Check if it's today or tomorrow
                                if (scheduledDate.toDateString() === today.toDateString()) {
                                  return `Today ${scheduledDate.toLocaleTimeString('en-CA', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  })}`;
                                } else if (scheduledDate.toDateString() === tomorrow.toDateString()) {
                                  return `Tomorrow ${scheduledDate.toLocaleTimeString('en-CA', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  })}`;
                                } else {
                                  return scheduledDate.toLocaleString('en-CA', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  });
                                }
                              }
                              
                              // Fallback to scheduled_datetime if separate fields not available
                              if (order.scheduled_datetime) {
                                const scheduledDate = new Date(order.scheduled_datetime);
                                const today = new Date();
                                const tomorrow = new Date(today);
                                tomorrow.setDate(today.getDate() + 1);
                                
                                if (scheduledDate.toDateString() === today.toDateString()) {
                                  return `Today ${scheduledDate.toLocaleTimeString('en-CA', {
                                    timeZone: 'America/Toronto',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  })}`;
                                } else if (scheduledDate.toDateString() === tomorrow.toDateString()) {
                                  return `Tomorrow ${scheduledDate.toLocaleTimeString('en-CA', {
                                    timeZone: 'America/Toronto',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  })}`;
                                } else {
                                  return scheduledDate.toLocaleString('en-CA', {
                                    timeZone: 'America/Toronto',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  });
                                }
                              }
                              
                              return 'Time not specified';
                            })()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          {new Date(order.created_at).toLocaleTimeString('en-CA', { 
                            timeZone: 'America/Toronto',
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      )}
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
              <Card key={order.id} className={`hover:shadow-lg transition-all duration-200 ${
                order.status === 'scheduled' 
                  ? 'border-yellow-300 hover:bg-yellow-100' 
                  : 'bg-white border-gray-200'
              }`} style={{
                backgroundColor: order.status === 'scheduled' ? '#fefce8' : undefined // Custom yellow between 50 and 100
              }}>
                <CardContent className="p-5">
                  {/* Header - Channel and Status */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      {renderSourceIcon(order.source, order)}
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
                        <div className="space-y-1.5">
                          <div className="text-sm font-bold text-foreground">{order.orderNumber}</div>
{(() => {
                            const timerInfo = getOrderTimerInfo(order)
                            if (timerInfo && settings.timingSettings?.autoReady) {
                              return (
                                <div className="flex items-center gap-1 justify-end">
                                  <div className="w-12">
                                    <Progress 
                                      value={timerInfo.progressPercent} 
                                      className="h-1.5 bg-gray-300" 
                                    />
                                  </div>
                                  <div className="text-xs text-orange-600 font-mono">
                                    {timerInfo.isComplete ? '0m' : `${timerInfo.remainingMinutes}m`}
                                  </div>
                                </div>
                              )
                            }
                            return null
                          })()}
                          {order.status === 'scheduled' ? (
                            <div className="text-sm font-bold text-orange-800">
                              {(() => {
                                if (order.scheduled_date && order.scheduled_time) {
                                  const dateStr = order.scheduled_date;
                                  const timeStr = order.scheduled_time;
                                  
                                  const [year, month, day] = dateStr.split('-').map(Number);
                                  const [hour, minute] = timeStr.split(':').map(Number);
                                  
                                  const scheduledDate = new Date(year, month - 1, day, hour, minute);
                                  const today = new Date();
                                  const tomorrow = new Date(today);
                                  tomorrow.setDate(today.getDate() + 1);
                                  
                                  if (scheduledDate.toDateString() === today.toDateString()) {
                                    return `Today ${scheduledDate.toLocaleTimeString('en-CA', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    })}`;
                                  } else if (scheduledDate.toDateString() === tomorrow.toDateString()) {
                                    return `Tomorrow ${scheduledDate.toLocaleTimeString('en-CA', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    })}`;
                                  } else {
                                    return scheduledDate.toLocaleString('en-CA', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    });
                                  }
                                }
                                
                                if (order.scheduled_datetime) {
                                  const scheduledDate = new Date(order.scheduled_datetime);
                                  const today = new Date();
                                  const tomorrow = new Date(today);
                                  tomorrow.setDate(today.getDate() + 1);
                                  
                                  if (scheduledDate.toDateString() === today.toDateString()) {
                                    return `Today ${scheduledDate.toLocaleTimeString('en-CA', {
                                      timeZone: 'America/Toronto',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    })}`;
                                  } else if (scheduledDate.toDateString() === tomorrow.toDateString()) {
                                    return `Tomorrow ${scheduledDate.toLocaleTimeString('en-CA', {
                                      timeZone: 'America/Toronto',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    })}`;
                                  } else {
                                    return scheduledDate.toLocaleString('en-CA', {
                                      timeZone: 'America/Toronto',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    });
                                  }
                                }
                                
                                return 'Time not specified';
                              })()}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleTimeString('en-CA', { 
                                timeZone: 'America/Toronto',
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Total, Timing, and Action */}
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
              
              {/* Auto-Ready Mode Badge - Show when auto-ready is enabled */}
              {settings.timingSettings?.autoReady && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-blue-700 font-medium">
                    Auto-Ready: Active
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