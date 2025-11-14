"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Clock, ChefHat, CheckCircle2, ChevronDown, ChevronUp, Columns, Table, AlertCircle, Search, X, RefreshCw, Utensils, ClockPlus } from "lucide-react"
import { useOrders } from "@/hooks/use-orders"
import { useEnhancedAuth } from "@/hooks/use-enhanced-auth"
import { useBranchSettings } from "@/hooks/use-branch-settings"
import { useOrderTimer } from "@/hooks/use-order-timer"
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/translations"
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
import type { Order } from "@/services/orders.service"
import { ordersService } from "@/services/orders.service"

// Kitchen Display interfaces - compatible with Order API types
interface KitchenOrderItem {
  id: string
  name: string
  quantity: number
  isCompleted: boolean
  specialInstructions?: string
}

// Map API Order to Kitchen Display format
const transformOrderForKitchen = (order: Order): KitchenOrder => {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customer?.name || 'Unknown Customer',
    customerPhone: order.customer?.phone || '',
    status: mapApiStatusToKitchenStatus(order.status),
    orderTime: new Date(order.created_at).toLocaleTimeString('en-CA', {
      timeZone: order.branch_timezone || 'America/Toronto',
      hour: '2-digit',
      minute: '2-digit'
    }),
    isPreOrder: order.status === 'scheduled', // Scheduled orders are pre-orders in kitchen display
    scheduledFor: order.status === 'scheduled' ? (order.scheduled_datetime || order.estimated_ready_time || null) : null,
    items: order.items?.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      isCompleted: false, // Kitchen completion tracking
      specialInstructions: item.special_instructions
    })) || [],
    total: order.pricing.total,
    createdAt: order.created_at
  }
}

// Map API order status to kitchen display status
const mapApiStatusToKitchenStatus = (apiStatus: Order['status']): KitchenOrder['status'] => {
  switch (apiStatus) {
    case 'preparing':
      return 'preparing' // Show in "In Progress" - ready for Mark Completed button
    case 'scheduled':
      return 'accepted' // Show scheduled orders as accepted (ready for start prep)
    default:
      return 'preparing'
  }
}

interface KitchenOrder {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  status: 'accepted' | 'preparing'
  orderTime: string
  isPreOrder: boolean
  scheduledFor: string | null
  items: KitchenOrderItem[]
  total: number
  createdAt: string
}


export default function KitchenDisplayPage() {
  const { branchId } = useEnhancedAuth()
  const { settings: branchSettings } = useBranchSettings({ branchId: branchId || undefined })
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  // Timer hook for simplified flow automation
  const { startTimer, stopTimer, runManualCheck } = useOrderTimer()

  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrder[]>([])
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [viewType, setViewType] = useState<'kanban' | 'table'>('kanban')
  const [searchQuery, setSearchQuery] = useState("")
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set())
  const [timingLoading, setTimingLoading] = useState<Set<string>>(new Set())
  const [optimisticAdjustments, setOptimisticAdjustments] = useState<Map<string, number>>(new Map())

  // Local storage utilities for kitchen item completion state
  const getCompletedItems = useCallback((orderId: string): string[] => {
    if (typeof window === 'undefined') return [];
    const key = `kitchen_items_${orderId}`;
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  }, []);

  const markItemCompleted = useCallback((orderId: string, itemId: string, completed: boolean) => {
    if (typeof window === 'undefined') return;
    const key = `kitchen_items_${orderId}`;
    const completedItems = getCompletedItems(orderId);
    
    if (completed && !completedItems.includes(itemId)) {
      completedItems.push(itemId);
    } else if (!completed) {
      const index = completedItems.indexOf(itemId);
      if (index > -1) completedItems.splice(index, 1);
    }
    
    localStorage.setItem(key, JSON.stringify(completedItems));
  }, [getCompletedItems]);

  const clearOrderItems = useCallback((orderId: string) => {
    if (typeof window === 'undefined') return;
    const key = `kitchen_items_${orderId}`;
    localStorage.removeItem(key);
  }, []);

  // Use orders hook for kitchen display with Realtime (preparing and scheduled orders)
  const { 
    orders: apiOrders, 
    loading, 
    error, 
    updateOrderStatus,
    refetch,
    clearError 
  } = useOrders({
    status: 'preparing,scheduled', // Include both preparing and scheduled orders
    limit: 100 // Show more orders for kitchen
  })

  // Transform API orders to kitchen format with local storage merge
  useEffect(() => {
    if (apiOrders.length > 0) {
      
      const transformedOrders = apiOrders.map(order => {
        const kitchenOrder = transformOrderForKitchen(order);
        
        // Merge with local storage completion state
        const completedItemIds = getCompletedItems(kitchenOrder.id);
        const mergedItems = kitchenOrder.items.map(item => ({
          ...item,
          isCompleted: completedItemIds.includes(item.id)
        }));
        
        return {
          ...kitchenOrder,
          items: mergedItems
        };
      });
      
      setKitchenOrders(transformedOrders)
      
      // Clear optimistic adjustments when fresh data arrives from server
      setOptimisticAdjustments(prev => {
        const newMap = new Map(prev);
        apiOrders.forEach(order => {
          if (newMap.has(order.id)) {
            // Clear optimistic state when we receive fresh data from server
            // This ensures the real DB value is displayed
            newMap.delete(order.id);
          }
        });
        return newMap;
      });
    } else {
      setKitchenOrders([])
    }
  }, [apiOrders, getCompletedItems])

  // Auto-start timer service when auto-ready is enabled
  useEffect(() => {
    if (branchSettings?.timingSettings?.autoReady) {
      startTimer()
    } else {
      stopTimer()
    }
    
    return () => stopTimer()
  }, [branchSettings?.timingSettings?.autoReady, startTimer, stopTimer])

  // Note: Auto-refresh removed - now using Supabase Realtime for instant kitchen updates!

  // Separate pre-orders from regular orders - memoized to prevent re-creation
  const preOrders = useMemo(() => kitchenOrders.filter(order => order.isPreOrder), [kitchenOrders])
  const regularOrders = useMemo(() => kitchenOrders.filter(order => !order.isPreOrder), [kitchenOrders])
  
  // Unified view showing all orders (regular + pre-orders) with smart sorting
  const sortedCurrentOrders = useMemo(() => {
    const allOrders = [...regularOrders, ...preOrders] // Always show both types
    
    return allOrders.sort((a, b) => {
      // Pre-orders come first (so staff sees them as reminders)
      if (a.isPreOrder && !b.isPreOrder) return -1
      if (!a.isPreOrder && b.isPreOrder) return 1
      
      // Within same type, sort by creation time (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [regularOrders, preOrders])
  
  // Apply search filter to displayed orders
  const displayedOrders = useMemo(() => {
    let orders = sortedCurrentOrders
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      orders = orders.filter(order => 
        (order.id && order.id.toLowerCase().includes(query)) ||
        (order.orderNumber && order.orderNumber.toLowerCase().includes(query)) ||
        (order.customerName && order.customerName.toLowerCase().includes(query)) ||
        (order.customerPhone && order.customerPhone.toLowerCase().includes(query))
      )
    }
    
    return orders
  }, [sortedCurrentOrders, searchQuery])

  // Calculate remaining time for pre-orders
  const getRemainingTime = (scheduledFor: string) => {
    const now = new Date()
    const scheduled = new Date(scheduledFor)
    const diffMs = scheduled.getTime() - now.getTime()
    
    if (diffMs <= 0) return t.kitchenDisplay.readyToStart
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    return `${hours}${t.kitchenDisplay.hoursLeft} ${minutes}${t.kitchenDisplay.minutesLeft}`
  }

  // Real-time state for smooth timer updates
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Polling ref for auto-completion detection
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Update timer every second for smooth progress bar
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000) // Update every second

    return () => clearInterval(interval)
  }, [])

  // Clean up local storage when orders are completed (no longer shown in kitchen display)
  useEffect(() => {
    // Since we only show 'preparing' orders, completed orders are automatically removed from view
    // No cleanup needed here as orders move directly from preparing to completed
  }, [apiOrders, clearOrderItems]) // Run when orders change

  // Calculate timer progress for orders with auto-ready enabled
  const getTimerProgress = useCallback((order: KitchenOrder) => {
    if (!branchSettings || !branchSettings.timingSettings?.autoReady || order.status !== 'preparing') {
      return null
    }

    const timingSettings = branchSettings.timingSettings
    // Find the corresponding API order to get updated_at timestamp and individual adjustment
    const apiOrder = apiOrders.find(o => o.id === order.id)
    if (!apiOrder) return null

    // Kitchen prep time - base + temporary + individual adjustment
    const baseKitchenPrepTime = timingSettings.baseDelay + timingSettings.temporaryBaseDelay
    const individualAdjustment = apiOrder.individual_timing_adjustment || 0
    const totalKitchenPrepTime = baseKitchenPrepTime + individualAdjustment

    const prepStartTime = new Date(apiOrder.updated_at)
    const elapsedMs = currentTime.getTime() - prepStartTime.getTime() // Use currentTime for real-time updates
    const elapsedMinutes = elapsedMs / (1000 * 60)
    
    const progressPercent = Math.min((elapsedMinutes / totalKitchenPrepTime) * 100, 100)
    const remainingMs = Math.max(0, (totalKitchenPrepTime * 60 * 1000) - elapsedMs)
    const remainingMinutes = Math.floor(remainingMs / (1000 * 60))
    const remainingSeconds = Math.floor((remainingMs % (1000 * 60)) / 1000)
    
    // Calculate elapsed minutes for display - should show completed minutes only
    const elapsedDisplayMinutes = Math.floor(elapsedMinutes) // Use floor to show only completed minutes
    
    // Check if third-party order (requires manual completion)
    const isThirdParty = apiOrder.source && ['uber_eats', 'doordash', 'phone'].includes(apiOrder.source)
    
    return {
      progressPercent,
      remainingMinutes,
      remainingSeconds,
      totalMinutes: totalKitchenPrepTime,
      baseMinutes: baseKitchenPrepTime,
      adjustment: individualAdjustment,
      elapsedMinutes: elapsedDisplayMinutes,
      isOverdue: elapsedMinutes >= totalKitchenPrepTime,
      isThirdParty,
      canAutoComplete: !isThirdParty && elapsedMinutes >= totalKitchenPrepTime,
      remainingTimeFormatted: remainingMs > 0 
        ? `${String(remainingMinutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
        : '00:00'
    }
  }, [branchSettings, currentTime, apiOrders])

  // Auto-completion detection for orders with completed timers
  useEffect(() => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    if (branchSettings?.timingSettings?.autoReady && kitchenOrders.length > 0) {
      // Check for orders that need auto-completion detection
      const preparingOrders = kitchenOrders.filter(order => order.status === 'preparing')
      const ordersWithCompletedTimers = preparingOrders.filter(order => {
        const timerData = getTimerProgress(order)
        return timerData?.canAutoComplete // Only auto-completable orders
      })

      if (ordersWithCompletedTimers.length > 0) {
        // Start polling to detect backend auto-completion
        pollingIntervalRef.current = setInterval(async () => {
          try {
            await refetch()
          } catch (error) {
            console.debug('Auto-completion polling failed:', error)
          }
        }, 5000) // Poll every 5 seconds for faster detection
      }
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [kitchenOrders, branchSettings?.timingSettings?.autoReady, getTimerProgress, refetch])

  // Toggle item completion with local storage persistence
  const toggleItemCompletion = (orderId: string, itemId: string) => {
    // Find current completion state
    const currentOrder = kitchenOrders.find(order => order.id === orderId);
    const currentItem = currentOrder?.items.find(item => item.id === itemId);
    const newCompletedState = !currentItem?.isCompleted;
    
    // Update local storage
    markItemCompleted(orderId, itemId, newCompletedState);
    
    // Update local state
    setKitchenOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId
          ? {
              ...order,
              items: order.items.map(item =>
                item.id === itemId
                  ? { ...item, isCompleted: newCompletedState }
                  : item
              )
            }
          : order
      )
    )
  }

  // Change order status with API integration
  const changeOrderStatus = async (orderId: string, newStatus: 'accepted' | 'preparing' | 'completed') => {
    // Add to updating orders set
    setUpdatingOrders(prev => new Set(prev).add(orderId))
    
    try {
      // Map kitchen status to API status
      const apiStatus = mapKitchenStatusToApiStatus(newStatus)
      
      if (newStatus === 'completed') {
        const success = await updateOrderStatus(orderId, { status: apiStatus })
        if (success) {
          // Clear local storage for completed order
          clearOrderItems(orderId)
          // Remove completed orders from kitchen display
          setKitchenOrders(prevOrders => prevOrders.filter(order => order.id !== orderId))
        }
      } else {
        const success = await updateOrderStatus(orderId, { status: apiStatus })
        if (success) {
          // Update local kitchen order status
          setKitchenOrders(prevOrders => 
            prevOrders.map(order =>
              order.id === orderId ? { ...order, status: newStatus } : order
            )
          )
        }
      }
    } catch (error) {
      console.error('Failed to update order status:', error)
    } finally {
      // Remove from updating orders set
      setUpdatingOrders(prev => {
        const newSet = new Set(prev)
        newSet.delete(orderId)
        return newSet
      })
    }
  }

  // Map kitchen status to API status
  const mapKitchenStatusToApiStatus = (kitchenStatus: 'accepted' | 'preparing' | 'completed'): Order['status'] => {
    switch (kitchenStatus) {
      case 'accepted':
        return 'preparing' // This shouldn't be used - fallback
      case 'preparing':
        return 'preparing' // Kitchen "Start Prep" → API "preparing"
      case 'completed':
        return 'completed' // Kitchen "Mark Completed" → API "completed"
      default:
        return 'preparing'
    }
  }

  // Toggle expanded state for orders
  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  // Check if pre-order can start
  const canStartPreOrder = (order: KitchenOrder) => {
    if (!order.isPreOrder || !order.scheduledFor) return true
    const now = new Date()
    const scheduled = new Date(order.scheduledFor)
    return now >= scheduled
  }

  // Get status badge
  const getStatusBadge = (status: string, isPreOrder: boolean) => {
    if (isPreOrder && status === 'accepted') {
      return (
        <Badge variant="outline" className="text-yellow-700 border-yellow-400 bg-yellow-50">
          <Clock className="h-3 w-3 mr-1" />
          {t.kitchenDisplay.preOrder}
        </Badge>
      )
    }
    
    const variants = {
      accepted: { variant: "outline" as const, className: "text-blue-700 border-blue-400 bg-blue-50" },
      preparing: { variant: "outline" as const, className: "text-orange-700 border-orange-400 bg-orange-50" },
      ready: { variant: "outline" as const, className: "text-green-700 border-green-400 bg-green-50" }
    }
    
    const config = variants[status as keyof typeof variants]
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  // Get action button for order status
  const getActionButton = (order: KitchenOrder, isTableView = false) => {
    const canStart = canStartPreOrder(order)
    const baseClasses = isTableView 
      ? "px-3 py-2 text-xs font-medium min-w-[100px] justify-center"
      : "px-4 py-1.5 text-xs font-medium"
    
    switch (order.status) {
      case 'accepted':
        // This case shouldn't happen with new workflow, but keeping for pre-orders
        if (order.isPreOrder && !canStart) {
          return (
            <Button disabled className={`${baseClasses} text-gray-500`}>
              <Clock className="h-3 w-3 mr-1" />
              {t.kitchenDisplay.scheduled}
            </Button>
          )
        }
        return (
          <Button 
            onClick={() => changeOrderStatus(order.id, 'preparing')} 
            className={`${baseClasses} hover:bg-primary/90`}
          >
            {t.kitchenDisplay.startPrep}
          </Button>
        )
      case 'preparing':
        // Order is already being prepared, show Mark Completed button
        const allItemsCompleted = order.items.every(item => item.isCompleted)
        const isUpdating = updatingOrders.has(order.id)
        return (
          <Button 
            onClick={() => changeOrderStatus(order.id, 'completed')} 
            disabled={!allItemsCompleted || isUpdating}
            className={`${baseClasses} bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed disabled:shadow-none`}
          >
            {isUpdating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                {t.orderDetail.completing}
              </>
            ) : (
              t.orderDetail.markCompleted
            )}
          </Button>
        )
      default:
        return null
    }
  }

  // Filter displayed orders by status (for overview cards)
  const preparingOrders = displayedOrders.filter(order => order.status === 'preparing')
  // No ready orders column in new simplified flow - orders go directly from preparing to completed

  return (
    <AuthGuard requireAuth={true} requireRememberOrRecent={true} redirectTo="/login">
      <DashboardLayout>
        <AppSidebar />
        <SidebarInset className="overflow-x-hidden">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center justify-between w-full px-4">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <DynamicBreadcrumb />
              </div>
              
              {/* Auto-Ready Mode Badge */}
              {branchSettings?.timingSettings?.autoReady && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-blue-700 font-medium">
                    Auto-Ready: Active
                  </span>
                </div>
              )}
            </div>
          </header>
          
          <div className="flex flex-1 flex-col px-2 sm:px-4 lg:px-6 overflow-x-hidden min-w-0">
            {/* Header Section */}
            <div className="px-2 py-6 sm:px-4 lg:px-6 bg-background">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  <h1 className="text-3xl font-bold tracking-tight">{t.kitchenDisplay.pageTitle}</h1>
                  <p className="text-muted-foreground mt-2 text-lg">
                    {t.kitchenDisplay.pageSubtitle}
                  </p>
                </div>
                <div className="lg:col-span-4 flex items-center justify-end">
                  {/* View Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{t.kitchenDisplay.viewLabel}</span>
                    <Button
                      variant={viewType === 'kanban' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewType('kanban')}
                      className="flex items-center gap-2"
                    >
                      <Columns className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant={viewType === 'table' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewType('table')}
                      className="flex items-center gap-2"
                    >
                      <Table className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
            </div>

            {/* Search Bar and Error Alert */}
            <div className="px-2 pb-4 sm:px-4 lg:px-6 space-y-4 ">
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
                      {t.kitchenDisplay.dismiss}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refetch}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    {t.kitchenDisplay.refresh}
                  </Button>
                </div>
                
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t.kitchenDisplay.searchPlaceholder}
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
            </div>

            {/* Status Overview Cards - Show only in Table view */}
            {viewType === 'table' && (
              <div className="px-2 pb-6 sm:px-4 lg:px-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-orange-500">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xl sm:text-2xl font-bold text-orange-600">{preparingOrders.length}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">{t.kitchenDisplay.inProgress}</div>
                      </div>
                      <div className="bg-orange-100 p-1.5 sm:p-2 rounded-full">
                        <Utensils className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-yellow-500">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xl sm:text-2xl font-bold text-yellow-600">{preOrders.length}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">{t.kitchenDisplay.preOrders}</div>
                      </div>
                      <div className="bg-yellow-100 p-1.5 sm:p-2 rounded-full">
                        <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </div>
              </div>
            )}

            {/* Orders Layout - Kanban and Table Views Only */}
            <div className="flex-1 px-2 py-8 sm:px-4 lg:px-6 min-w-0 overflow-x-hidden">
              {viewType === 'kanban' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* In Progress Column */}
                  <div className="bg-gray-50/50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">{t.kitchenDisplay.inProgressColumn}</h3>
                      </div>
                      <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
                        {preparingOrders.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {preparingOrders.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          <p className="text-sm">{t.kitchenDisplay.noOrdersInProgress}</p>
                        </div>
                      ) : (
                        preparingOrders.map((order) => (
                          <div 
                            key={`preparing-${order.id}`}
                            className="animate-in fade-in-0 slide-in-from-left-2 duration-500"
                          >
                            <Card className={`relative hover:shadow-lg transition-all duration-300 ease-in-out ${
                              order.isPreOrder 
                                ? 'bg-white border-yellow-200 border-2' 
                                : ''
                            }`}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-200">
                                <div>
                                  <div className="text-sm font-bold">{order.orderNumber}</div>
                                  <div className="text-xs text-muted-foreground">{order.orderTime} - {order.customerName}</div>
                                </div>
                                {getStatusBadge(order.status, order.isPreOrder)}
                              </div>
                              
                              {/* Auto-Ready Timer Progress Bar */}
                              {(() => {
                                const timerData = getTimerProgress(order)
                                if (!timerData) return null
                                
                                return (
                                  <div className="mb-3 pb-3 border-b border-gray-200">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-3 w-3 text-gray-500" />
                                        <span className={`text-xs font-mono font-medium ${
                                          timerData.isOverdue ? 'text-green-600' : 'text-gray-600'
                                        }`}>
                                          {timerData.isOverdue ? '00:00' : timerData.remainingTimeFormatted}
                                        </span>
                                      </div>
                                      <span className="text-xs text-gray-500">
                                        {timerData.isOverdue 
                                          ? "Ready for completion"
                                          : `${timerData.elapsedMinutes}m / ${timerData.totalMinutes}m`
                                        }
                                      </span>
                                    </div>
                                    <Progress 
                                      value={Math.min(timerData.progressPercent, 100)} 
                                      className={`h-2 bg-gray-300 ${
                                        timerData.isOverdue ? '[&>div]:bg-green-500 [&>div]:animate-pulse' : '[&>div]:bg-orange-500'
                                      }`}
                                    />
                                    
                                    {/* Third-party order notice */}
                                    {timerData.isThirdParty && timerData.isOverdue && (
                                      <div className="mt-1 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1">
                                        Third-party orders require manual completion
                                      </div>
                                    )}
                                    {timerData.isOverdue && (
                                      <div className="mt-2">
                                        <Button 
                                          size="sm" 
                                          disabled={updatingOrders.has(order.id)}
                                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                                          onClick={async () => {
                                            setUpdatingOrders(prev => new Set(prev).add(order.id))
                                            try {
                                              const success = await updateOrderStatus(order.id, { status: 'completed' })
                                              if (success) {
                                                // Clear local storage when order is completed
                                                clearOrderItems(order.id)
                                              }
                                              await runManualCheck() // Update timer results
                                            } catch (error) {
                                              console.error('Failed to mark order completed:', error)
                                            } finally {
                                              setUpdatingOrders(prev => {
                                                const newSet = new Set(prev)
                                                newSet.delete(order.id)
                                                return newSet
                                              })
                                            }
                                          }}
                                        >
                                          {updatingOrders.has(order.id) ? (
                                            <>
                                              <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                                              {t.orderDetail.completing}
                                            </>
                                          ) : (
                                            <>
                                              <CheckCircle2 className="h-3 w-3 mr-1" />
                                              {t.orderDetail.markCompleted}
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )
                              })()}
                              
                              {/* Order Items with Checkboxes */}
                              <div className="mb-3 pb-3 border-b border-gray-200">
                                <div className="space-y-2 relative">
                                  {/* Timing Adjustment Popover - Top Right Corner */}
                                  <div className="absolute top-0 right-0">
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button 
                                          size="sm" 
                                          variant="ghost" 
                                          className="h-6 w-6 p-0 hover:bg-gray-100 rounded-full"
                                          title="Timing Adjustment"
                                        >
                                          <Clock className="h-3 w-3 text-gray-500" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-64 p-4" align="end">
                                        <div className="space-y-3">
                                          {/* Current Adjustment Display */}
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-600">Current Adjustment:</span>
                                            <div className="relative">
                                              {timingLoading.has(order.id) ? (
                                                <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded">
                                                  <div className="flex space-x-0.5">
                                                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                                                  </div>
                                                  <span className="text-xs text-blue-700 font-medium">...</span>
                                                </div>
                                              ) : (
                                                <span className="text-xs font-bold text-gray-700 bg-gray-100 border border-gray-200 px-2 py-1 rounded">
                                                  {(() => {
                                                    const apiOrder = apiOrders.find(o => o.id === order.id);
                                                    const dbAdjustment = apiOrder?.individual_timing_adjustment || 0;
                                                    const optimisticAdjustment = optimisticAdjustments.get(order.id);
                                                    // Use optimistic value only if it exists, otherwise use DB value
                                                    const currentAdjustment = optimisticAdjustment !== undefined ? optimisticAdjustment : dbAdjustment;
                                                    return `${currentAdjustment > 0 ? '+' : ''}${currentAdjustment} min`;
                                                  })()}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          
                                          {/* Timing Adjustment Buttons */}
                                          <div className="border-t border-gray-200 pt-3">
                                            <div className="grid grid-cols-2 gap-3">
                                              <button
                                                disabled={timingLoading.has(order.id)}
                                                className="inline-flex items-center justify-center gap-1 px-4 py-2 bg-gray-50 hover:bg-gray-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded-md border border-gray-200 transition-colors text-sm font-medium text-gray-700 w-full"
                                                onClick={async () => {
                                                  try {
                                                    setTimingLoading(prev => new Set(prev).add(order.id));
                                                    
                                                    // Optimistic update - update local state immediately
                                                    const apiOrder = apiOrders.find(o => o.id === order.id);
                                                    const currentAdjustment = apiOrder?.individual_timing_adjustment || 0;
                                                    const newAdjustment = currentAdjustment + 5;
                                                    setOptimisticAdjustments(prev => new Map(prev).set(order.id, newAdjustment));
                                                    
                                                    // Then make API call and refetch fresh data
                                                    await ordersService.updateOrderTiming(order.id, 5);
                                                    // Refetch fresh data to show real DB value
                                                    await refetch();
                                                  } catch (error) {
                                                    console.error('Failed to add 5 minutes:', error);
                                                    // Revert optimistic update on error
                                                    setOptimisticAdjustments(prev => {
                                                      const newMap = new Map(prev);
                                                      newMap.delete(order.id);
                                                      return newMap;
                                                    });
                                                  } finally {
                                                    setTimingLoading(prev => {
                                                      const newSet = new Set(prev);
                                                      newSet.delete(order.id);
                                                      return newSet;
                                                    });
                                                  }
                                                }}
                                              >
                                                <ClockPlus className="h-3 w-3" />
                                                5min
                                              </button>
                                              
                                              <button
                                                disabled={timingLoading.has(order.id)}
                                                className="inline-flex items-center justify-center gap-1 px-4 py-2 bg-gray-50 hover:bg-gray-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded-md border border-gray-200 transition-colors text-sm font-medium text-gray-700 w-full"
                                                onClick={async () => {
                                                  try {
                                                    setTimingLoading(prev => new Set(prev).add(order.id));
                                                    
                                                    // Optimistic update - update local state immediately
                                                    const apiOrder = apiOrders.find(o => o.id === order.id);
                                                    const currentAdjustment = apiOrder?.individual_timing_adjustment || 0;
                                                    const newAdjustment = currentAdjustment + 10;
                                                    setOptimisticAdjustments(prev => new Map(prev).set(order.id, newAdjustment));
                                                    
                                                    // Then make API call and refetch fresh data
                                                    await ordersService.updateOrderTiming(order.id, 10);
                                                    // Refetch fresh data to show real DB value
                                                    await refetch();
                                                  } catch (error) {
                                                    console.error('Failed to add 10 minutes:', error);
                                                    // Revert optimistic update on error
                                                    setOptimisticAdjustments(prev => {
                                                      const newMap = new Map(prev);
                                                      newMap.delete(order.id);
                                                      return newMap;
                                                    });
                                                  } finally {
                                                    setTimingLoading(prev => {
                                                      const newSet = new Set(prev);
                                                      newSet.delete(order.id);
                                                      return newSet;
                                                    });
                                                  }
                                                }}
                                              >
                                                <ClockPlus className="h-3 w-3" />
                                                10min
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                  {(() => {
                                    const isExpanded = expandedOrders.has(order.id)
                                    const maxVisibleItems = 2
                                    const visibleItems = isExpanded ? order.items : order.items.slice(0, maxVisibleItems)
                                    const hiddenItemsCount = order.items.length - maxVisibleItems
                                    
                                    return (
                                      <>
                                        {visibleItems.map((item) => (
                                          <div key={item.id} className="flex items-start space-x-2">
                                            <Checkbox
                                              id={`kanban-prep-item-${item.id}`}
                                              checked={item.isCompleted}
                                              disabled={order.status === 'accepted'}
                                              onCheckedChange={() => toggleItemCompletion(order.id, item.id)}
                                              className="mt-0.5 data-[state=checked]:bg-green-600"
                                            />
                                            <label 
                                              htmlFor={`kanban-prep-item-${item.id}`}
                                              className={`flex-1 text-xs ${
                                                order.status === 'accepted' 
                                                  ? 'cursor-not-allowed opacity-50' 
                                                  : 'cursor-pointer'
                                              } ${
                                                item.isCompleted ? 'line-through text-muted-foreground' : ''
                                              }`}
                                            >
                                              {item.quantity}x {item.name}
                                              {item.specialInstructions && (
                                                <div className="text-xs text-orange-600 mt-1">
                                                  ⚠️ {item.specialInstructions}
                                                </div>
                                              )}
                                            </label>
                                          </div>
                                        ))}
                                        
                                        {order.items.length > maxVisibleItems && (
                                          <button
                                            onClick={() => toggleOrderExpansion(order.id)}
                                            className="flex items-center justify-center w-full py-1 text-xs text-muted-foreground hover:text-foreground transition-colors border border-dashed border-gray-300 rounded-md hover:border-gray-400"
                                          >
                                            {isExpanded ? (
                                              <>
                                                <ChevronUp className="h-3 w-3 mr-1" />
                                                {t.kitchenDisplay.showLess}
                                              </>
                                            ) : (
                                              <>
                                                <ChevronDown className="h-3 w-3 mr-1" />
                                                +{hiddenItemsCount} {t.kitchenDisplay.more}
                                              </>
                                            )}
                                          </button>
                                        )}
                                      </>
                                    )
                                  })()}
                                </div>
                              </div>
                              
                              {/* Order Notes for Kanban View - In Progress Orders */}
                              {(() => {
                                const apiOrder = apiOrders.find(o => o.id === order.id)
                                return apiOrder?.notes && (
                                  <div className="mb-3 pb-3 border-b border-gray-200">
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                      <div className="text-xs text-blue-700">
                                        {apiOrder.notes}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })()}
                              
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-bold">${order.total.toFixed(2)}</div>
                                {getActionButton(order)}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Pre-Orders Column */}
                  <div className="bg-yellow-50/80 rounded-lg p-4 border border-yellow-300/60">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <h3 className="font-semibold text-yellow-900 text-sm uppercase tracking-wide">{t.kitchenDisplay.preOrdersColumn}</h3>
                      </div>
                      <span className="bg-yellow-200 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                        {preOrders.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {preOrders.length === 0 ? (
                        <div className="text-center py-8 text-yellow-600">
                          <p className="text-sm">{t.kitchenDisplay.noPreOrders}</p>
                        </div>
                      ) : (
                        preOrders.map((order) => (
                          <div 
                            key={`preorder-${order.id}`}
                            className="animate-in fade-in-0 slide-in-from-top-2 duration-500"
                          >
                            <Card className="bg-white border-yellow-200 border-2 hover:shadow-lg transition-all duration-300 ease-in-out">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-200">
                                <div>
                                  <div className="text-sm font-bold">{order.orderNumber}</div>
                                  <div className="text-xs text-muted-foreground">{order.orderTime} - {order.customerName}</div>
                                </div>
                                {getStatusBadge(order.status, order.isPreOrder)}
                              </div>
                              
                              {order.scheduledFor && (
                                <div className="mb-3 pb-3 border-b border-gray-200">
                                  <div className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {getRemainingTime(order.scheduledFor)}
                                  </div>
                                </div>
                              )}
                              
                              {/* Order Items for Pre-Orders (read-only) */}
                              <div className="mb-3 pb-3 border-b border-gray-200">
                                <div className="space-y-2">
                                  {(() => {
                                    const isExpanded = expandedOrders.has(order.id)
                                    const maxVisibleItems = 2
                                    const visibleItems = isExpanded ? order.items : order.items.slice(0, maxVisibleItems)
                                    const hiddenItemsCount = order.items.length - maxVisibleItems
                                    
                                    return (
                                      <>
                                        {visibleItems.map((item) => (
                                          <div key={item.id} className="flex items-start space-x-2">
                                            <div className="w-4 h-4 rounded border border-gray-300 bg-gray-50 mt-0.5 flex-shrink-0"></div>
                                            <div className="flex-1 text-xs">
                                              <div className="font-medium text-gray-700">
                                                {item.quantity}x {item.name}
                                              </div>
                                              {item.specialInstructions && (
                                                <div className="text-xs text-orange-600 mt-1">
                                                  ⚠️ {item.specialInstructions}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                        
                                        {order.items.length > maxVisibleItems && (
                                          <button
                                            onClick={() => toggleOrderExpansion(order.id)}
                                            className="flex items-center justify-center w-full py-1 text-xs text-muted-foreground hover:text-foreground transition-colors border border-dashed border-gray-300 rounded-md hover:border-gray-400"
                                          >
                                            {isExpanded ? (
                                              <>
                                                <ChevronUp className="h-3 w-3 mr-1" />
                                                {t.kitchenDisplay.showLess}
                                              </>
                                            ) : (
                                              <>
                                                <ChevronDown className="h-3 w-3 mr-1" />
                                                +{hiddenItemsCount} {t.kitchenDisplay.more}
                                              </>
                                            )}
                                          </button>
                                        )}
                                      </>
                                    )
                                  })()}
                                </div>
                              </div>
                              
                              {/* Order Notes for Kanban View - In Progress Orders */}
                              {(() => {
                                const apiOrder = apiOrders.find(o => o.id === order.id)
                                return apiOrder?.notes && (
                                  <div className="mb-3 pb-3 border-b border-gray-200">
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                      <div className="text-xs text-blue-700">
                                        {apiOrder.notes}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })()}
                              
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-bold">${order.total.toFixed(2)}</div>
                                {getActionButton(order)}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {viewType === 'table' && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-28">{t.kitchenDisplay.status}</th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-32">{t.kitchenDisplay.order}</th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-40">{t.kitchenDisplay.customer}</th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-20">{t.kitchenDisplay.time}</th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-24">{t.kitchenDisplay.items}</th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-24">{t.kitchenDisplay.total}</th>
                          <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide w-32">{t.kitchenDisplay.action}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {displayedOrders.map((order) => (
                          <React.Fragment key={order.id}>
                            <tr className={`transition-colors duration-150 hover:bg-gray-50 ${
                              order.isPreOrder ? 'hover:bg-yellow-50' : ''
                            }`} style={{
                              backgroundColor: order.isPreOrder ? '#fffef5' : undefined // Very light yellow
                            }}>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className={`w-2 h-2 rounded-full mr-2 ${
                                    order.status === 'accepted' ? 'bg-blue-500' :
                                    order.status === 'preparing' ? 'bg-orange-500' :
                                    'bg-green-500'
                                  }`} />
                                  {getStatusBadge(order.status, order.isPreOrder)}
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                                    {order.isPreOrder && order.scheduledFor && (
                                      <div className="text-xs text-yellow-600">
                                        <Clock className="h-3 w-3 mr-1 inline" />
                                        {getRemainingTime(order.scheduledFor)}
                                      </div>
                                    )}
                                    {/* Auto-Ready Timer Progress */}
                                    {(() => {
                                      const timerData = getTimerProgress(order)
                                      if (!timerData) return null
                                      
                                      return (
                                        <div className="mt-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <div className="flex-1">
                                              <Progress 
                                                value={Math.min(timerData.progressPercent, 100)} 
                                                className={`h-2 bg-gray-300 ${
                                                  timerData.isOverdue ? '[&>div]:bg-green-500 [&>div]:animate-pulse' : '[&>div]:bg-orange-500'
                                                }`}
                                              />
                                            </div>
                                            <span className={`text-xs font-mono font-medium whitespace-nowrap ${
                                              timerData.isOverdue ? 'text-green-600' : 'text-gray-600'
                                            }`}>
                                              {timerData.isOverdue ? '00:00' : timerData.remainingTimeFormatted}
                                            </span>
                                          </div>
                                          
                                          {/* Third-party order notice */}
                                          {timerData.isThirdParty && timerData.isOverdue && (
                                            <div className="mt-1 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1">
                                              Third-party orders require manual completion
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })()}
                                  </div>
                                  <button
                                    onClick={() => toggleOrderExpansion(order.id)}
                                    className="ml-2 p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                                  >
                                    {expandedOrders.has(order.id) ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{order.customerName}</div>
                                <div className="text-xs text-gray-500">{order.customerPhone}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                {order.orderTime}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{order.items.length} {t.kitchenDisplay.items}</div>
                                {order.status === 'preparing' && (
                                  <div className="text-xs text-orange-600">
                                    {order.items.filter(item => item.isCompleted).length}/{order.items.length} {t.kitchenDisplay.completed}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                ${order.total.toFixed(2)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex justify-center">
                                  {getActionButton(order, true)}
                                </div>
                              </td>
                            </tr>
                            
                            {/* Expanded row with items */}
                            {expandedOrders.has(order.id) && (
                              <tr key={`${order.id}-expanded`} className={`border-t-0 ${order.isPreOrder ? 'bg-yellow-50/30' : 'bg-gray-50/50'}`}>
                                <td colSpan={7} className="px-6 py-6">
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center gap-3">
                                        <h4 className="text-sm font-semibold text-gray-900">{t.kitchenDisplay.orderItems}</h4>
                                        
                                        {/* Timing Adjustment Popover - Next to Order Items title */}
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <Button 
                                              size="sm" 
                                              variant="ghost" 
                                              className="h-6 w-6 p-0 hover:bg-gray-100 rounded-full"
                                              title="Timing Adjustment"
                                            >
                                              <Clock className="h-3 w-3 text-gray-500" />
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-64 p-4" align="start">
                                            <div className="space-y-3">
                                              {/* Current Adjustment Display */}
                                              <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium text-gray-600">Current Adjustment:</span>
                                                <div className="relative">
                                                  {timingLoading.has(order.id) ? (
                                                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded">
                                                      <div className="flex space-x-0.5">
                                                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                                                      </div>
                                                      <span className="text-xs text-blue-700 font-medium">...</span>
                                                    </div>
                                                  ) : (
                                                    <span className="text-xs font-bold text-gray-700 bg-gray-100 border border-gray-200 px-2 py-1 rounded">
                                                      {(() => {
                                                        const apiOrder = apiOrders.find(o => o.id === order.id);
                                                        const dbAdjustment = apiOrder?.individual_timing_adjustment || 0;
                                                        const optimisticAdjustment = optimisticAdjustments.get(order.id);
                                                        // Use optimistic value only if it exists, otherwise use DB value
                                                        const currentAdjustment = optimisticAdjustment !== undefined ? optimisticAdjustment : dbAdjustment;
                                                        return `${currentAdjustment > 0 ? '+' : ''}${currentAdjustment} min`;
                                                      })()}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                              
                                              {/* Timing Adjustment Buttons */}
                                              <div className="border-t border-gray-200 pt-3">
                                                <div className="grid grid-cols-2 gap-3">
                                                  <button
                                                    disabled={timingLoading.has(order.id)}
                                                    className="inline-flex items-center justify-center gap-1 px-4 py-2 bg-gray-50 hover:bg-gray-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded-md border border-gray-200 transition-colors text-sm font-medium text-gray-700 w-full"
                                                    onClick={async () => {
                                                      try {
                                                        setTimingLoading(prev => new Set(prev).add(order.id));
                                                        
                                                        // Optimistic update - update local state immediately
                                                        const apiOrder = apiOrders.find(o => o.id === order.id);
                                                        const currentAdjustment = apiOrder?.individual_timing_adjustment || 0;
                                                        const newAdjustment = currentAdjustment + 5;
                                                        setOptimisticAdjustments(prev => new Map(prev).set(order.id, newAdjustment));
                                                        
                                                        // Then make API call and refetch fresh data
                                                        await ordersService.updateOrderTiming(order.id, 5);
                                                        // Refetch fresh data to show real DB value
                                                        await refetch();
                                                      } catch (error) {
                                                        console.error('Failed to add 5 minutes:', error);
                                                        // Revert optimistic update on error
                                                        setOptimisticAdjustments(prev => {
                                                          const newMap = new Map(prev);
                                                          newMap.delete(order.id);
                                                          return newMap;
                                                        });
                                                      } finally {
                                                        setTimingLoading(prev => {
                                                          const newSet = new Set(prev);
                                                          newSet.delete(order.id);
                                                          return newSet;
                                                        });
                                                      }
                                                    }}
                                                  >
                                                    <ClockPlus className="h-3 w-3" />
                                                    5min
                                                  </button>
                                                  
                                                  <button
                                                    disabled={timingLoading.has(order.id)}
                                                    className="inline-flex items-center justify-center gap-1 px-4 py-2 bg-gray-50 hover:bg-gray-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded-md border border-gray-200 transition-colors text-sm font-medium text-gray-700 w-full"
                                                    onClick={async () => {
                                                      try {
                                                        setTimingLoading(prev => new Set(prev).add(order.id));
                                                        
                                                        // Optimistic update - update local state immediately
                                                        const apiOrder = apiOrders.find(o => o.id === order.id);
                                                        const currentAdjustment = apiOrder?.individual_timing_adjustment || 0;
                                                        const newAdjustment = currentAdjustment + 10;
                                                        setOptimisticAdjustments(prev => new Map(prev).set(order.id, newAdjustment));
                                                        
                                                        // Then make API call and refetch fresh data
                                                        await ordersService.updateOrderTiming(order.id, 10);
                                                        // Refetch fresh data to show real DB value
                                                        await refetch();
                                                      } catch (error) {
                                                        console.error('Failed to add 10 minutes:', error);
                                                        // Revert optimistic update on error
                                                        setOptimisticAdjustments(prev => {
                                                          const newMap = new Map(prev);
                                                          newMap.delete(order.id);
                                                          return newMap;
                                                        });
                                                      } finally {
                                                        setTimingLoading(prev => {
                                                          const newSet = new Set(prev);
                                                          newSet.delete(order.id);
                                                          return newSet;
                                                        });
                                                      }
                                                    }}
                                                  >
                                                    <ClockPlus className="h-3 w-3" />
                                                    10min
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          </PopoverContent>
                                        </Popover>
                                      </div>
                                      
                                      {order.status === 'preparing' && (
                                        <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                                          {order.items.filter(item => item.isCompleted).length} {t.kitchenDisplay.of} {order.items.length} {t.kitchenDisplay.completed}
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                      {order.items.map((item) => (
                                        <div key={item.id} className={`flex items-start space-x-3 p-4 rounded-lg border transition-all duration-200 ${
                                          item.isCompleted 
                                            ? 'bg-green-50 border-green-200' 
                                            : 'bg-white border-gray-200 hover:border-gray-300'
                                        }`}>
                                          <Checkbox
                                            id={`table-item-${item.id}`}
                                            checked={item.isCompleted}
                                            disabled={order.status === 'accepted'}
                                            onCheckedChange={() => toggleItemCompletion(order.id, item.id)}
                                            className="mt-0.5 data-[state=checked]:bg-green-600"
                                          />
                                          <label 
                                            htmlFor={`table-item-${item.id}`}
                                            className={`flex-1 text-sm ${
                                              order.status === 'accepted' 
                                                ? 'cursor-not-allowed opacity-50' 
                                                : 'cursor-pointer'
                                            } ${
                                              item.isCompleted ? 'line-through text-muted-foreground' : ''
                                            }`}
                                          >
                                            <div className="font-medium">{item.quantity}x {item.name}</div>
                                            {item.specialInstructions && (
                                              <div className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                {item.specialInstructions}
                                              </div>
                                            )}
                                          </label>
                                        </div>
                                      ))}
                                    </div>
                                    
                                    {/* Order Notes */}
                                    {(() => {
                                      const apiOrder = apiOrders.find(o => o.id === order.id)
                                      return apiOrder?.notes && (
                                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                          <div className="text-sm text-blue-700">
                                            {apiOrder.notes}
                                          </div>
                                        </div>
                                      )
                                    })()}

                                    {/* Order level special instructions */}
                                    {order.items.some(item => item.specialInstructions) && (
                                      <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                        <div className="flex items-center gap-2 text-orange-700 text-sm font-medium mb-2">
                                          <AlertCircle className="h-4 w-4" />
                                          {t.kitchenDisplay.specialInstructionsSummary}
                                        </div>
                                        <div className="text-xs text-orange-600 space-y-1">
                                          {order.items
                                            .filter(item => item.specialInstructions)
                                            .map(item => (
                                              <div key={item.id}>
                                                <strong>{item.name}:</strong> {item.specialInstructions}
                                              </div>
                                            ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                      </table>
                    </div>
                </div>
              )}

              
              {/* Loading Indicator */}
              {loading && displayedOrders.length === 0 && (
                <div className="flex justify-center items-center py-12">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                    <span className="text-sm">{t.kitchenDisplay.loadingKitchenOrders}</span>
                  </div>
                </div>
              )}
              
              {/* Orders loaded successfully */}
              {!loading && displayedOrders.length > 0 && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    {displayedOrders.length} {displayedOrders.length !== 1 ? t.kitchenDisplay.activeOrders : t.kitchenDisplay.activeOrder}
                  </div>
                </div>
              )}
              
              {/* No Orders State */}
              {!loading && displayedOrders.length === 0 && (
                <div className="text-center py-12">
                  <ChefHat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground">
                    {t.kitchenDisplay.noActiveOrders}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t.kitchenDisplay.kitchenCaughtUp}
                  </p>
                </div>
              )}
            </div>
          </div>
        </SidebarInset>
      </DashboardLayout>
    </AuthGuard>
  )
}