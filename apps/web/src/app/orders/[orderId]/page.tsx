"use client"

import { use, useState, useEffect, useCallback, useRef } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ArrowLeft, Clock, MapPin, User, CheckCircle, CheckCircle2, Circle, AlertCircle, Package, RefreshCw, Wallet, XCircle, Timer, ClockPlus, TicketPercent } from "lucide-react"
import { ordersService } from "@/services/orders.service"
import { getSourceIcon } from "@/assets/images"
import Image from "next/image"
import Link from "next/link"
import { useOrderDetail } from "@/hooks/use-orders"
import type { Order } from "@/services/orders.service"
import { useEnhancedAuth } from "@/hooks/use-enhanced-auth"
import { useBranchSettings } from "@/hooks/use-branch-settings"
import { useOrderTimer } from "@/hooks/use-order-timer"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/translations"
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
import { UberDeliveryStatus } from "@/components/delivery/uber-delivery-status"

// Types - Clean and simple interface definitions

interface OrderDetailPageProps {
  params: Promise<{
    orderId: string
  }>
  searchParams: Promise<{
    context?: string
  }>
}

export default function OrderDetailPage({ params, searchParams }: OrderDetailPageProps) {
  const { orderId } = use(params)
  const { context = 'live' } = use(searchParams)
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  
  // Get branch context
  const { branchId } = useEnhancedAuth()
  const { settings } = useBranchSettings({ branchId: branchId || undefined })
  
  // Initialize timer service for auto-completion
  const { startTimer, stopTimer, runManualCheck } = useOrderTimer()
  
  // Real API integration
  const { 
    order, 
    loading, 
    error, 
    refetch,
    clearError,
    updateStatus,
    setOrder
  } = useOrderDetail(orderId)
  
  // Timer state
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Timing adjustment loading state
  const [timingLoading, setTimingLoading] = useState(false)
  
  // Auto-ready state
  const [isAutoCompleting, setIsAutoCompleting] = useState(false)
  
  // Partial refund state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [refundSuccess, setRefundSuccess] = useState(false)
  const [showRefundDialog, setShowRefundDialog] = useState(false)
  
  // Reject confirmation state
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  
  // Status update loading state
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  
  // Polling ref for cleanup
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  

  // Partial refund handlers
  const handleItemSelect = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems)
    if (checked) {
      newSelected.add(itemId)
    } else {
      newSelected.delete(itemId)
    }
    setSelectedItems(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked && order?.items) {
      const allItemIds = new Set(order.items.map(item => item.id))
      setSelectedItems(allItemIds)
    } else {
      setSelectedItems(new Set())
    }
  }

  const getSelectedAmount = () => {
    if (!order?.items) return 0;
    return order.items
      .filter(item => selectedItems.has(item.id))
      .reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const handleRefundClick = () => {
    setShowRefundDialog(true)
  }

  const handleConfirmRefund = () => {
    // Mock refund action
    setRefundSuccess(true)
    setSelectedItems(new Set())
    setShowRefundDialog(false)
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setRefundSuccess(false)
    }, 3000)
  }

  // Handle order status updates
  const handleStatusUpdate = async (newStatus: 'preparing' | 'ready' | 'completed' | 'cancelled' | 'rejected') => {
    setUpdatingStatus(newStatus)
    try {
      const success = await updateStatus({ status: newStatus });
      if (success) {
        // Optionally show success message
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
    } finally {
      setUpdatingStatus(null)
    }
  }

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'qr_code': return 'QR Code'
      case 'uber_eats': return 'Uber Eats'
      case 'doordash': return 'DoorDash'
      case 'phone': return 'Phone'
      case 'web': return 'Web'
      default: return t.orderDetail.unknown
    }
  }

  const getOrderTypeLabel = (orderType: string) => {
    switch (orderType?.toLowerCase()) {
      case 'dine_in': return t.orderDetail.dineIn
      case 'takeaway': return t.orderDetail.takeaway
      case 'delivery': return t.orderDetail.delivery
      case 'pickup': return t.orderDetail.pickup
      default: return orderType || t.orderDetail.unknown
    }
  }



  const getStatusBadge = (status: string) => {
    // Ensure status is a valid string
    const safeStatus = (typeof status === 'string' && status) ? status : 'pending';
    
    const colors: Record<string, string> = {
      pending: "text-orange-700 border-orange-300 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700",
      preparing: "text-blue-700 border-blue-300 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700",
      scheduled: "text-yellow-800 border-yellow-300 bg-yellow-100", // Medium yellow for scheduled orders
      ready: "text-green-700 border-green-400 bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700",
      completed: "text-gray-600 border-gray-200 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-700",
      rejected: "text-red-700 border-red-300 bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700",
      cancelled: "text-red-700 border-red-300 bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700"
    }

    return (
      <Badge variant="outline" className={colors[safeStatus] || colors.pending}>
        {safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1)}
      </Badge>
    )
  }

  const renderSourceIcon = (source: string) => {
    const iconSrc = getSourceIcon(source)
    const label = getSourceLabel(source)
    return (
      <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
        <Image 
          src={iconSrc}
          alt={`${source} icon`}
          width={24}
          height={24}
          className="w-6 h-6 flex-shrink-0"
        />
        <span className="text-sm font-medium">{label}</span>
      </div>
    )
  }

  // Progress calculation now handled directly in JSX with 2-step progress bars

  const renderTimelineIcon = (status: string) => {
    if (!order) return <Circle className="h-5 w-5 text-gray-400" />;
    const statusOrder = ['preparing', 'completed']
    const currentOrderStatus = order.status === 'ready' ? 'completed' : order.status
    const currentIndex = statusOrder.indexOf(currentOrderStatus)
    const stepIndex = statusOrder.indexOf(status)
    
    if (stepIndex <= currentIndex) {
      return <CheckCircle className="h-5 w-5 text-green-600" />
    } else if (stepIndex === currentIndex + 1) {
      return <AlertCircle className="h-5 w-5 text-blue-600" />
    } else {
      return <Circle className="h-5 w-5 text-gray-400" />
    }
  }

  // Calculate timer information for auto-ready
  const getTimerInfo = useCallback(() => {
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
    
    // Calculate remaining seconds for countdown
    const remainingSeconds = isComplete ? 0 : Math.floor(((totalKitchenPrepTime * 60) - (elapsedMinutes * 60)) % 60)
    const remainingMins = isComplete ? 0 : Math.floor(remainingMinutes)

    // Check if third-party order (requires manual completion)
    const isThirdParty = order.source && ['uber_eats', 'doordash', 'phone'].includes(order.source)
    
    return {
      kitchenPrepTime: totalKitchenPrepTime,
      baseTime: baseKitchenPrepTime,
      adjustment: individualAdjustment,
      elapsedMinutes: Math.floor(elapsedMinutes),
      remainingMinutes: remainingMins,
      remainingSeconds,
      isComplete,
      progressPercent,
      isThirdParty,
      canAutoComplete: !isThirdParty && isComplete
    }
  }, [order, currentTime, settings.timingSettings])

  const timerInfo = getTimerInfo()

  // Auto-complete with 10-second delay
  useEffect(() => {
    let delayTimer: NodeJS.Timeout | null = null

    const handleAutoComplete = async () => {
      if (isAutoCompleting) return
      
      try {
        setIsAutoCompleting(true)
        await runManualCheck()
        await refetch()
      } catch {
        // Silent error handling
      } finally {
        setIsAutoCompleting(false)
      }
    }

    // Only auto-complete when timer is ready
    if (
      timerInfo?.isComplete && 
      timerInfo?.canAutoComplete && 
      order?.status === 'preparing' &&
      !isAutoCompleting
    ) {
      // 10 second delay before auto-completion
      delayTimer = setTimeout(() => {
        handleAutoComplete()
      }, 10000)
    }

    return () => {
      if (delayTimer) {
        clearTimeout(delayTimer)
      }
    }
  }, [timerInfo?.isComplete, timerInfo?.canAutoComplete, order?.status, isAutoCompleting, runManualCheck, refetch])

  // Timer for visual countdown ONLY - NO POLLING, NO REFETCHING
  useEffect(() => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    // Only visual countdown timer for preparing orders - NO DATA FETCHING
    if (order?.status === 'preparing' && settings.timingSettings?.autoReady) {
      // Visual countdown timer (every second) - ONLY updates currentTime state
      const visualTimer = setInterval(() => {
        setCurrentTime(new Date())
      }, 1000)
      
      return () => {
        clearInterval(visualTimer)
      }
    }
    
    // NO POLLING - Payment Summary stays stable, no disappearing
  }, [order?.status, settings.timingSettings?.autoReady])
  
  // Start timer service for auto-completion
  useEffect(() => {
    if (settings.timingSettings?.autoReady) {
      startTimer()
    } else {
      stopTimer()
    }
    
    return () => stopTimer()
  }, [settings.timingSettings?.autoReady, startTimer, stopTimer])
  
  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [])


  // Loading and error states
  if (loading) {
    return (
      <AuthGuard requireAuth={true} requireRememberOrRecent={true} redirectTo="/login">
        <DashboardLayout>
          <AppSidebar />
          <SidebarInset>
            <div className="flex items-center justify-center h-screen">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>{t.orderDetail.loading}</span>
              </div>
            </div>
          </SidebarInset>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  if (error) {
    return (
      <AuthGuard requireAuth={true} requireRememberOrRecent={true} redirectTo="/login">
        <DashboardLayout>
          <AppSidebar />
          <SidebarInset>
            <div className="flex flex-col items-center justify-center h-screen gap-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <div className="text-center">
                <h2 className="text-lg font-semibold">{t.orderDetail.failedToLoad}</h2>
                <p className="text-muted-foreground">{error}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={refetch} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t.orderDetail.retry}
                </Button>
                <Button onClick={clearError} variant="ghost">
                  {t.orderDetail.dismiss}
                </Button>
              </div>
            </div>
          </SidebarInset>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  if (!order) {
    return (
      <AuthGuard requireAuth={true} requireRememberOrRecent={true} redirectTo="/login">
        <DashboardLayout>
          <AppSidebar />
          <SidebarInset>
            <div className="flex flex-col items-center justify-center h-screen gap-4">
              <Package className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <h2 className="text-lg font-semibold">{t.orderDetail.orderNotFound}</h2>
                <p className="text-muted-foreground">{t.orderDetail.orderNotFoundDesc}</p>
              </div>
              <Button asChild>
                <Link href="/orders">{t.orderDetail.backToOrders}</Link>
              </Button>
            </div>
          </SidebarInset>
        </DashboardLayout>
      </AuthGuard>
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
              <div className="flex items-center justify-between mb-6">
                <Link href={`/orders/${context}`}>
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {context === 'live' ? t.orderDetail.backToLive : t.orderDetail.backToHistory}
                  </Button>
                </Link>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight">#{order.orderNumber}</h1>
                  {getStatusBadge(order.status)}
                </div>
                <div className="flex items-center gap-4">
                  {renderSourceIcon(order.source)}
                  {order.source === 'qr_code' && order.table_number && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-md">
                      <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        {/* Zone-based display logic - consistent with /order page blue styling */}
                        {order.zone === 'Screen' 
                          ? 'Screen'
                          : order.zone 
                            ? `${t.orderDetail.table} ${order.table_number} - ${order.zone}`
                            : `${t.orderDetail.table} ${order.table_number}`
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 px-2 py-4 sm:px-4 lg:px-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 group-has-[[data-state=collapsed]]/sidebar-wrapper:md:grid-cols-12 group-has-[[data-state=expanded]]/sidebar-wrapper:grid-cols-1 group-has-[[data-state=expanded]]/sidebar-wrapper:lg:grid-cols-12">
                {/* Left Column - Order Information */}
                <div className="md:col-span-8 group-has-[[data-state=expanded]]/sidebar-wrapper:col-span-12 group-has-[[data-state=expanded]]/sidebar-wrapper:lg:col-span-8">
                  <Accordion type="multiple" defaultValue={["items", "customer", "progress"]} className="space-y-4">
                    {/* Order Progress */}
                    <AccordionItem value="progress" className="border-none">
                      <Card>
                        <AccordionTrigger className="hover:no-underline px-6">
                          <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            <span className="font-medium">{t.orderDetail.orderProgress}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-0 pb-0">
                          <Separator />
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              {/* Two-Step Progress Bar */}
                              <div className="mb-4">
                                <div className="flex gap-2">
                                  {/* Step 1: Preparing */}
                                  <div className="flex-1">
                                    <div className="mb-2 text-left">
                                      <span className="text-xs text-muted-foreground">{t.orderDetail.preparing}</span>
                                    </div>
                                    <Progress 
                                      value={order.status === 'preparing' || order.status === 'ready' || order.status === 'completed' ? 100 : 0} 
                                      className="h-3 bg-gray-300" 
                                    />
                                  </div>
                                  
                                  {/* Step 2: Completed */}
                                  <div className="flex-1">
                                    <div className="mb-2 text-right">
                                      <span className="text-xs text-muted-foreground">{t.orderDetail.completed}</span>
                                    </div>
                                    <Progress 
                                      value={order.status === 'completed' || order.status === 'ready' ? 100 : 0} 
                                      className="h-3 bg-gray-300" 
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-3">
                                {['preparing', 'completed'].map((status) => {
                                  const statusOrder = ['preparing', 'completed']
                                  const currentIndex = statusOrder.indexOf(order.status === 'ready' ? 'completed' : order.status)
                                  const stepIndex = statusOrder.indexOf(status)
                                  const isCompleted = stepIndex <= currentIndex
                                  
                                  return (
                                    <div key={status} className="flex items-center gap-3">
                                      {renderTimelineIcon(status)}
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <p className={`text-sm font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                                            {status === 'preparing' && t.orderDetail.orderPreparing}
                                            {status === 'completed' && t.orderDetail.orderCompleted}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </CardContent>
                        </AccordionContent>
                      </Card>
                    </AccordionItem>

                    {/* Order Items */}
                    <AccordionItem value="items" className="border-none">
                      <Card>
                        <AccordionTrigger className="hover:no-underline px-6">
                          <div className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            <span className="font-medium">{t.orderDetail.orderItems} ({order.items?.length || 0})</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-0 pb-0">
                          <Separator />
                          <CardContent className="p-6">
                            {/* Refund Header - Show only when refund is possible */}
                            {(order.status === 'completed' || order.status === 'cancelled') && (
                              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <RefreshCw className="h-4 w-4 text-gray-600" />
                                    <span className="text-sm text-gray-700">{t.orderDetail.selectItemsRefund}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id="select-all"
                                      checked={selectedItems.size > 0 && selectedItems.size === (order.items?.length || 0)}
                                      onCheckedChange={handleSelectAll}
                                    />
                                    <label htmlFor="select-all" className="text-xs text-gray-600 cursor-pointer">
                                      {t.orderDetail.selectAll}
                                    </label>
                                  </div>
                                </div>
                                
                                {/* Show selected items summary */}
                                {selectedItems.size > 0 && (
                                  <div className="mt-3 pt-3 border-t border-gray-300">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-blue-700">
                                        {selectedItems.size} {t.orderDetail.itemsSelected}
                                      </span>
                                      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
                                        <DialogTrigger asChild>
                                          <Button 
                                            size="sm" 
                                            onClick={handleRefundClick}
                                            className="bg-blue-600 hover:bg-blue-700"
                                          >
                                            {t.orderDetail.refund} ${getSelectedAmount().toFixed(2)}
                                          </Button>
                                        </DialogTrigger>
                                        
                                        <DialogContent className="max-w-md">
                                          <DialogHeader>
                                            <DialogTitle className="flex items-center gap-2">
                                              <AlertCircle className="h-5 w-5 text-red-600" />
                                              {t.orderDetail.confirmPartialRefund}
                                            </DialogTitle>
                                            <DialogDescription>
                                              {t.orderDetail.refundDescription} {selectedItems.size} {t.orderDetail.refundDescriptionItems} ${getSelectedAmount().toFixed(2)}.
                                              {t.orderDetail.refundCannotUndo}
                                            </DialogDescription>
                                          </DialogHeader>
                                          
                                          <div className="py-4">
                                            <div className="space-y-2">
                                              <h4 className="font-medium text-sm">{t.orderDetail.itemsToRefund}</h4>
                                              <div className="space-y-1 max-h-40 overflow-y-auto border rounded-md p-2 bg-gray-50">
                                                {order.items
                                                  ?.filter(item => selectedItems.has(item.id))
                                                  .map(item => (
                                                    <div key={item.id} className="flex justify-between text-sm bg-white p-2 rounded border">
                                                      <span>{item.name} x{item.quantity}</span>
                                                      <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                                                    </div>
                                                  ))}
                                              </div>
                                            </div>
                                          </div>

                                          <DialogFooter>
                                            <Button 
                                              variant="outline" 
                                              onClick={() => setShowRefundDialog(false)}
                                            >
                                              {t.orderDetail.cancel}
                                            </Button>
                                            <Button 
                                              onClick={handleConfirmRefund}
                                              className="bg-red-600 hover:bg-red-700"
                                            >
                                              {t.orderDetail.confirmRefund} ${getSelectedAmount().toFixed(2)}
                                            </Button>
                                          </DialogFooter>
                                        </DialogContent>
                                      </Dialog>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Success Message */}
                            {refundSuccess && (
                              <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-md">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                      <span className="text-sm font-medium text-green-800">
                                        {t.orderDetail.refundSuccess}
                                      </span>
                                    </div>
                              </div>
                            )}

                            <div className="space-y-3">
                              {order.items?.map((item) => (
                                <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-white">
                                  {/* Checkbox for refund selection */}
                                  {(order.status === 'completed' || order.status === 'cancelled') && (
                                    <div className="pt-1">
                                      <Checkbox
                                        id={`item-${item.id}`}
                                        checked={selectedItems.has(item.id)}
                                        onCheckedChange={(checked) => handleItemSelect(item.id, checked as boolean)}
                                      />
                                    </div>
                                  )}
                                  
                                  {/* Item Details */}
                                  <div className="flex-1 space-y-2">
                                    {/* Item Name and Quantity - Kitchen Display format */}
                                    <div className="flex items-center justify-between">
                                      <div className="font-medium text-gray-900">
                                        {item.quantity}x {item.name}
                                      </div>
                                      <span className="font-medium text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                    
                                    {/* Variants - Show as badges only if they exist */}
                                    {item.variants && item.variants.length > 0 && (
                                      <div className="flex gap-2 flex-wrap">
                                        {item.variants?.map((variant, idx) => (
                                          <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                                            {typeof variant === 'string' ? variant : variant.name}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {/* Special Instructions - Kitchen Display format */}
                                    {item.special_instructions && (
                                      <div className="text-sm text-primary italic">
                                        {item.special_instructions}
                                      </div>
                                    )}
                                    
                                    {/* Show unit price if quantity > 1 */}
                                    {item.quantity > 1 && (
                                      <div className="text-xs text-gray-500">
                                        ${item.price.toFixed(2)} {t.orderDetail.each}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                              
                              {/* Notes and Special Instructions for Order */}
                              {(order.notes || order.special_instructions) && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <h4 className="font-medium text-gray-900 mb-2">{t.orderDetail.orderNotes}</h4>
                                  <div className="space-y-3">
                                    {order.notes && (
                                      <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                                        <p className="text-sm text-blue-700">{order.notes}</p>
                                      </div>
                                    )}
                                    {order.special_instructions && (
                                      <div className="p-3 bg-orange-50 rounded-md border border-orange-200">
                                        <h5 className="text-sm font-medium text-orange-900 mb-1">{t.orderDetail.specialInstructions}</h5>
                                        <p className="text-sm text-orange-700">{order.special_instructions}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </AccordionContent>
                      </Card>
                    </AccordionItem>

                    {/* Customer Information */}
                    <AccordionItem value="customer" className="border-none">
                      <Card>
                        <AccordionTrigger className="hover:no-underline px-6">
                          <div className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            <span className="font-medium">{t.orderDetail.customerInformation}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-0 pb-0">
                          <Separator />
                          <CardContent className="px-6 py-2">
                            <div className="space-y-0">
                              {/* Customer Name Row */}
                              <div className="flex items-center justify-between py-3 border-b border-border/40">
                                <label className="text-sm text-muted-foreground">{t.orderDetail.customerName}</label>
                                <p className="text-md font-medium">{order.customer?.name || t.orderDetail.walkInCustomer}</p>
                              </div>
                              
                              {/* Contact Row */}
                              <div className="flex items-center justify-between py-3 border-b border-border/40">
                                <label className="text-sm text-muted-foreground">{t.orderDetail.contact}</label>
                                <p className="text-md font-medium">{order.customer?.phone || t.orderDetail.notProvided}</p>
                              </div>
                              
                              {/* Email Row */}
                              <div className="flex items-center justify-between py-3 border-b border-border/40">
                                <label className="text-sm text-muted-foreground">{t.orderDetail.emailAddress}</label>
                                <p className="text-md font-medium">{order.customer.email || t.orderDetail.notProvided}</p>
                              </div>
                              
                              {/* Order Type Row */}
                              <div className={`flex items-center justify-between py-3 ${order.delivery_address ? 'border-b border-border/40' : ''}`}>
                                <label className="text-sm text-muted-foreground">{t.orderDetail.orderType}</label>
                                <p className="text-md font-medium">{getOrderTypeLabel(order.order_type)}</p>
                              </div>
                              
                              {/* Delivery Address Row */}
                              {order.delivery_address && (
                                <div className="flex items-start justify-between py-3">
                                  <label className="text-sm text-muted-foreground">{t.orderDetail.deliveryAddress}</label>
                                  <div className="text-right text-sm">
                                    <p className="text-md font-medium">
                                      {order.delivery_address.street || 'Address not provided'}
                                    </p>
                                    {order.delivery_address.unitNumber && (
                                      <p className="text-md font-medium">Unit {order.delivery_address.unitNumber}</p>
                                    )}
                                    <p className="text-sm font-medium">{order.delivery_address.city}, {order.delivery_address.province} {order.delivery_address.postalCode}</p>
                                    {order.delivery_address.buzzerCode && (
                                      <p className="text-md text-muted-foreground mt-1">Buzzer: {order.delivery_address.buzzerCode}</p>
                                    )}
                                    {order.delivery_address.deliveryInstructions && (
                                      <p className="text-md text-muted-foreground mt-1 italic">{order.delivery_address.deliveryInstructions}</p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </AccordionContent>
                      </Card>
                    </AccordionItem>


                    {/* Delivery Status - COMMENTED OUT FOR UI ADJUSTMENT */}
                    {/* {order.order_type === 'delivery' && order.uber_delivery_id && (
                      <AccordionItem value="delivery" className="border-none">
                        <UberDeliveryStatus
                          uberDeliveryId={order.uber_delivery_id}
                          deliveryStatus={order.delivery_status}
                          courierInfo={order.courier_info}
                          deliveryEta={order.delivery_eta}
                          statusHistory={order.status_history}
                          trackingUrl={order.tracking_url}
                          onRefresh={refetch}
                          className="shadow-none border-0"
                        />
                      </AccordionItem>
                    )} */}

                  </Accordion>
                </div>

                {/* Right Column - Payment Summary & Actions */}
                <div className="md:col-span-4 group-has-[[data-state=expanded]]/sidebar-wrapper:col-span-12 group-has-[[data-state=expanded]]/sidebar-wrapper:lg:col-span-4 space-y-6">
                  {/* Payment Summary */}
                  <Card>
                    <CardHeader className="px-6 py-4">
                      <CardTitle className="flex items-center gap-2 text-base font-medium">
                        <Wallet className="h-5 w-5" />
                        {t.orderDetail.paymentSummary}
                      </CardTitle>
                    </CardHeader>
                    <Separator />
                    <CardContent className="space-y-3 p-6">
                      {/* Show comprehensive breakdown if available, otherwise show simple subtotal */}
                      {(order.pricing.itemsTotal || 0) > 0 ? (
                        <>
                          {/* Items Total */}
                          <div className="flex justify-between text-sm">
                            <span>{language === 'fr' ? 'Articles' : 'Items'}</span>
                            <span>${(order.pricing.itemsTotal || 0).toFixed(2)}</span>
                          </div>
                          
                          {/* Campaign Discount */}
                          {order.campaignDiscount && (order.pricing.discountAmount || 0) > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="flex items-center gap-1 text-green-600">
                                <TicketPercent className="h-4 w-4" />
                                {order.campaignDiscount.code}
                              </span>
                              <span className="text-green-600">
                                -${(order.pricing.discountAmount || 0).toFixed(2)}
                              </span>
                            </div>
                          )}
                          
                          {/* ✅ NEW: Tip shown AFTER items but BEFORE delivery fees (new Canada tax rules) */}
                          {order.tipDetails && (order.pricing.tipAmount || 0) > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="flex items-center gap-1">
                                {language === 'fr' ? 'Pourboire' : 'Tip'}
                                <span className="text-xs text-gray-500">
                                  ({order.tipDetails.type === 'percentage' 
                                    ? `${order.tipDetails.value}%` 
                                    : language === 'fr' ? 'fixe' : 'fixed'
                                  })
                                </span>
                              </span>
                              <span>${(order.pricing.tipAmount || 0).toFixed(2)}</span>
                            </div>
                          )}
                          
                          {/* ✅ NEW: Enhanced Delivery Fee with Free Delivery Support */}
                          {(order.pricing.delivery_fee > 0 || order.deliveryInfo?.isFree || order.order_type?.toLowerCase() === 'delivery') && (
                            <div className="flex justify-between text-sm">
                              <span className="flex items-center gap-2">
                                {language === 'fr' ? 'Frais de livraison' : 'Delivery fee'}
                                {order.deliveryInfo?.isFree && (
                                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                                    {language === 'fr' ? 'GRATUIT!' : 'FREE!'}
                                  </span>
                                )}
                              </span>
                              <div className="flex items-center gap-2">
                                {order.deliveryInfo?.isFree && order.deliveryInfo?.baseFee > 0 && (
                                  <span className="text-gray-500 line-through text-sm">
                                    ${order.deliveryInfo.baseFee.toFixed(2)}
                                  </span>
                                )}
                                <span className={`${order.deliveryInfo?.isFree ? 'text-green-600 font-medium' : ''}`}>
                                  ${(order.pricing.delivery_fee || 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {/* Service Fee */}
                          {order.pricing.service_fee > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>{t.orderDetail.serviceFee}</span>
                              <span>${order.pricing.service_fee.toFixed(2)}</span>
                            </div>
                          )}
                          
                          {/* Subtotal (calculated: items - discount + delivery + service fees + tip) - NEW TAX RULES */}
                          <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                            <span>{t.orderDetail.subtotal}</span>
                            <span>${((order.pricing.itemsTotal || 0) - (order.pricing.discountAmount || 0) + (order.pricing.delivery_fee || 0) + (order.pricing.service_fee || 0) + (order.pricing.tipAmount || 0)).toFixed(2)}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Legacy pricing - show delivery fee if it exists OR if it's a delivery order */}
                          {(order.pricing.delivery_fee > 0 || order.deliveryInfo?.isFree || order.order_type?.toLowerCase() === 'delivery') && (
                            <div className="flex justify-between text-sm">
                              <span className="flex items-center gap-2">
                                {language === 'fr' ? 'Frais de livraison' : 'Delivery fee'}
                                {order.deliveryInfo?.isFree && (
                                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                                    {language === 'fr' ? 'GRATUIT!' : 'FREE!'}
                                  </span>
                                )}
                              </span>
                              <div className="flex items-center gap-2">
                                {order.deliveryInfo?.isFree && order.deliveryInfo?.baseFee > 0 && (
                                  <span className="text-gray-500 line-through text-sm">
                                    ${order.deliveryInfo.baseFee.toFixed(2)}
                                  </span>
                                )}
                                <span className={`${order.deliveryInfo?.isFree ? 'text-green-600 font-medium' : ''}`}>
                                  ${(order.pricing.delivery_fee || 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {/* Legacy simple subtotal display */}
                          <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                            <span>{t.orderDetail.subtotal}</span>
                            <span>${order.pricing.subtotal.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                      
                      {/* Tax Breakdown: Show GST/QST if available, otherwise fallback to combined tax */}
                      {(order.pricing.gst || 0) > 0 && (order.pricing.qst || 0) > 0 ? (
                        <>
                          <div className="flex justify-between text-sm">
                            <span>GST</span>
                            <span>${(order.pricing.gst || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>QST</span>
                            <span>${(order.pricing.qst || 0).toFixed(2)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between text-sm">
                          <span>{t.orderDetail.tax}</span>
                          <span>${order.pricing.tax_amount.toFixed(2)}</span>
                        </div>
                      )}
                      
                      <Separator />
                      <div className="flex justify-between font-medium text-lg">
                        <span>{t.orderDetail.total}</span>
                        <div className="text-right">
                          {order.campaignDiscount && (order.pricing.discountAmount || 0) > 0 ? (
                            <>
                              <span className="text-sm text-gray-500 line-through mr-2">
                                ${(order.pricing.total + (order.pricing.discountAmount || 0)).toFixed(2)}
                              </span>
                              <br />
                            </>
                          ) : null}
                          <span>${order.pricing.total.toFixed(2)}</span>
                        </div>
                      </div>
                      {/* Savings Messages */}
                      <div className="space-y-1">
                        {order.campaignDiscount && (order.pricing.discountAmount || 0) > 0 && (
                          <p className="text-sm text-green-600 text-right">
                            {language === 'fr' 
                              ? `Économisé ${(order.pricing.discountAmount || 0).toFixed(2)} $ avec ${order.campaignDiscount.code}` 
                              : `Saved $${(order.pricing.discountAmount || 0).toFixed(2)} with ${order.campaignDiscount.code}`
                            }
                          </p>
                        )}
                        {/* ✅ NEW: Free Delivery Savings */}
                        {order.deliveryInfo?.isFree && order.deliveryInfo?.savings > 0 && (
                          <p className="text-sm text-green-600 text-right">
                            {language === 'fr' 
                              ? `Économisé ${order.deliveryInfo.savings.toFixed(2)} $ sur la livraison` 
                              : `Saved $${order.deliveryInfo.savings.toFixed(2)} on delivery`
                            }
                          </p>
                        )}
                      </div>
                      <Separator className="my-3" />
                      <div className="space-y-2 text-sm">
                        {/* Payment Method */}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{language === 'fr' ? 'Méthode de paiement' : 'Payment Method'}</span>
                          <span>
                            {(() => {
                              const method = order.payment_method?.toLowerCase();
                              if (method === 'counter') {
                                return language === 'fr' ? 'À la caisse' : 'Pay at Counter';
                              } else if (method === 'online') {
                                return language === 'fr' ? 'Paiement en ligne' : 'Online Payment';
                              } else if (method === 'cash') {
                                return language === 'fr' ? 'Comptant' : 'Cash';
                              } else if (method === 'card') {
                                return language === 'fr' ? 'Carte' : 'Card';
                              } else {
                                return order.payment_method || (language === 'fr' ? 'Non spécifié' : 'Not specified');
                              }
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t.orderDetail.orderDate}</span>
                          <span>{new Date(order.created_at).toLocaleDateString('en-CA', {
                            timeZone: 'America/Toronto'
                          })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t.orderDetail.orderTime}</span>
                          <span>{new Date(order.created_at).toLocaleTimeString('en-CA', {
                            timeZone: 'America/Toronto',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                        </div>
                        {/* Pre-order scheduled time */}
                        {order.status === 'scheduled' && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{language === 'fr' ? 'Programmé pour' : 'Scheduled For'}</span>
                            <span className="font-medium text-yellow-700">
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
                                  
                                  return scheduledDate.toLocaleString('en-CA', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  });
                                }
                                
                                // Fallback to scheduled_datetime if separate fields not available
                                if (order.scheduled_datetime) {
                                  return new Date(order.scheduled_datetime).toLocaleString('en-CA', {
                                    timeZone: 'America/Toronto',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  });
                                }
                                
                                // Fallback to estimated_ready_time
                                if (order.estimated_ready_time) {
                                  return new Date(order.estimated_ready_time).toLocaleString('en-CA', {
                                    timeZone: 'America/Toronto',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  });
                                }
                                
                                return language === 'fr' ? 'Non spécifié' : 'Not specified';
                              })()}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pre-order schedule info - shown after payment summary for scheduled orders */}
                  {order.status === 'scheduled' && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-800">
                              {language === 'fr' ? 'Commande programmée' : 'Pre-Order Scheduled'}
                            </span>
                          </div>
                          <div className="text-sm text-yellow-700">
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
                                
                                return scheduledDate.toLocaleString('en-CA', {
                                  weekday: 'long',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                });
                              }
                              
                              // Fallback to scheduled_datetime if separate fields not available
                              if (order.scheduled_datetime) {
                                return new Date(order.scheduled_datetime).toLocaleString('en-CA', {
                                  timeZone: 'America/Toronto',
                                  weekday: 'long',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                });
                              }
                              
                              // Fallback to estimated_ready_time
                              if (order.estimated_ready_time) {
                                return new Date(order.estimated_ready_time).toLocaleString('en-CA', {
                                  timeZone: 'America/Toronto',
                                  weekday: 'long',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                });
                              }
                              
                              return language === 'fr' ? 'Heure non spécifiée' : 'Time not specified';
                            })()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Timing Adjustment Card - Show for active orders only */}
                  {(order.status === 'preparing' || order.status === 'scheduled') && (
                    <Card>
                      <CardHeader className="px-6 py-4">
                        <CardTitle className="flex items-center gap-2 text-base font-medium">
                          <Clock className="h-5 w-5" />
                          {language === 'fr' ? 'Ajustement de Timing' : 'Timing Adjustment'}
                        </CardTitle>
                      </CardHeader>
                      <Separator />
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {/* Current adjustment display - top, justified */}
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-gray-700">
                              {language === 'fr' ? 'Ajustement actuel:' : 'Current Adjustment:'}
                            </span>
                            <div className="relative">
                              {timingLoading ? (
                                <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                                  <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce"></div>
                                  </div>
                                  <span className="text-sm text-gray-600 font-medium">Updating...</span>
                                </div>
                              ) : (
                                <span className="text-lg font-bold text-gray-700 bg-gray-100 border border-gray-200 px-3 py-1 rounded-lg">
                                  {(order.individual_timing_adjustment || 0) > 0 ? '+' : ''}
                                  {order.individual_timing_adjustment || 0} min
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Preparation Timer - show when timer is available */}
                          {timerInfo && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Timer className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm font-medium text-gray-700">
                                    Preparation Timer
                                  </span>
                                </div>
                                <div className="text-sm font-mono font-bold text-gray-600">
                                  {timerInfo.isComplete ? (
                                    <span className="text-primary animate-pulse">00:00</span>
                                  ) : (
                                    <span>
                                      {String(timerInfo.remainingMinutes).padStart(2, '0')}:
                                      {String(timerInfo.remainingSeconds).padStart(2, '0')}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Progress bar */}
                              <div className="w-full bg-gray-300 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-500 ${
                                    timerInfo.isComplete 
                                      ? 'bg-primary animate-pulse' 
                                      : 'bg-primary'
                                  }`}
                                  style={{ width: `${Math.min(timerInfo.progressPercent, 100)}%` }}
                                ></div>
                              </div>
                              
                              {/* Status text - only show when timer is complete or auto-completing */}
                              {(timerInfo.isComplete || isAutoCompleting) && (
                                <div className="text-xs text-gray-500">
                                  {isAutoCompleting ? (
                                    <span className="font-medium text-primary animate-pulse">Auto-completing order...</span>
                                  ) : timerInfo.canAutoComplete ? (
                                    <span className="font-medium text-primary">Ready for completion</span>
                                  ) : (
                                    <span className="font-medium">Manual completion required (third-party order)</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Separator between timer/adjustment and buttons */}
                          <div className="border-t border-gray-200"></div>
                          
                          {/* Timing buttons - bottom, full width */}
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              disabled={timingLoading}
                              className="inline-flex items-center justify-center gap-1 px-4 py-2 bg-gray-50 hover:bg-gray-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded-md border border-gray-200 transition-colors text-sm font-medium text-gray-700"
                              onClick={async () => {
                                try {
                                  setTimingLoading(true);
                                  
                                  // Optimistic update - update local state immediately
                                  const newAdjustment = (order.individual_timing_adjustment || 0) + 5;
                                  setOrder((prev: Order | null) => prev ? { ...prev, individual_timing_adjustment: newAdjustment } : null);
                                  
                                  // Then make API call
                                  await ordersService.updateOrderTiming(order.id, 5);
                                } catch (error) {
                                  console.error('Failed to add 5 minutes:', error);
                                  // Revert optimistic update on error
                                  refetch();
                                } finally {
                                  setTimingLoading(false);
                                }
                              }}
                            >
                              <ClockPlus className="w-4 h-4" />
                              5min
                            </button>
                            
                            <button
                              disabled={timingLoading}
                              className="inline-flex items-center justify-center gap-1 px-4 py-2 bg-gray-50 hover:bg-gray-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded-md border border-gray-200 transition-colors text-sm font-medium text-gray-700"
                              onClick={async () => {
                                try {
                                  setTimingLoading(true);
                                  
                                  // Optimistic update - update local state immediately
                                  const newAdjustment = (order.individual_timing_adjustment || 0) + 10;
                                  setOrder((prev: Order | null) => prev ? { ...prev, individual_timing_adjustment: newAdjustment } : null);
                                  
                                  // Then make API call
                                  await ordersService.updateOrderTiming(order.id, 10);
                                } catch (error) {
                                  console.error('Failed to add 10 minutes:', error);
                                  // Revert optimistic update on error
                                  refetch();
                                } finally {
                                  setTimingLoading(false);
                                }
                              }}
                            >
                              <ClockPlus className="w-4 h-4" />
                              10min
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Quick Actions */}
                  <Card>
                    <CardHeader className="px-6 py-4">
                      <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
                    </CardHeader>
                    <Separator />
                    <CardContent className="space-y-3 p-6">
                      {/* Timer moved to Timing Adjustment section for better organization */}

                      {/* Order Status Actions */}
                      {order.status === 'scheduled' && (
                        <div className="space-y-3">
                          {/* Start Preparing Button */}
                          <Button 
                            onClick={() => handleStatusUpdate('preparing')}
                            disabled={updatingStatus !== null}
                            className="w-full text-white font-medium py-3 rounded-lg transition-colors duration-200 hover:opacity-90"
                            style={{ backgroundColor: 'var(--primary)' }}
                            onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#e6440a'}
                            onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary)'}
                          >
                            {updatingStatus === 'preparing' ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                {language === 'fr' ? 'Démarrage...' : 'Starting...'}
                              </>
                            ) : (
                              language === 'fr' ? 'Commencer la préparation' : 'Start Preparing'
                            )}
                          </Button>
                          <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                            <DialogTrigger asChild>
                              <Button 
                                disabled={updatingStatus !== null}
                                variant="outline" 
                                className="w-full border-red-300 text-red-700 hover:bg-red-50 py-2.5 rounded-lg transition-colors"
                              >
                                {t.orderDetail.rejectOrder}
                              </Button>
                            </DialogTrigger>
                            
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <AlertCircle className="h-5 w-5 text-red-600" />
                                  {t.orderDetail.rejectOrder}
                                </DialogTitle>
                                <DialogDescription>
                                  {t.orderDetail.rejectConfirm}
                                </DialogDescription>
                              </DialogHeader>
                              
                              <DialogFooter className="gap-2">
                                <Button 
                                  variant="outline" 
                                  onClick={() => setShowRejectDialog(false)}
                                  disabled={updatingStatus !== null}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  onClick={() => {
                                    handleStatusUpdate('rejected')
                                    setShowRejectDialog(false)
                                  }}
                                  disabled={updatingStatus !== null}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  {updatingStatus === 'rejected' ? (
                                    <>
                                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                      {t.orderDetail.rejecting}
                                    </>
                                  ) : (
                                    t.orderDetail.yesRejectOrder
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                      
                      {order.status === 'preparing' && (
                        <div className="space-y-3">
                          {/* Mark Ready Button */}
                          <Button 
                            onClick={() => handleStatusUpdate('completed')}
                            disabled={updatingStatus !== null || isAutoCompleting}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors"
                          >
                            {(updatingStatus === 'completed' || isAutoCompleting) ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                {isAutoCompleting ? 'Auto-completing...' : t.orderDetail.markingReady}
                              </>
                            ) : (
                              t.orderDetail.markReady
                            )}
                          </Button>
                          <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                            <DialogTrigger asChild>
                              <Button 
                                disabled={updatingStatus !== null}
                                variant="outline" 
                                className="w-full border-red-300 text-red-700 hover:bg-red-50 py-2.5 rounded-lg transition-colors"
                              >
                                {t.orderDetail.rejectOrder}
                              </Button>
                            </DialogTrigger>
                            
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <AlertCircle className="h-5 w-5 text-red-600" />
                                  {t.orderDetail.rejectOrder}
                                </DialogTitle>
                                <DialogDescription>
                                  {t.orderDetail.rejectConfirm}
                                </DialogDescription>
                              </DialogHeader>
                              
                              <DialogFooter className="gap-2">
                                <Button 
                                  variant="outline" 
                                  onClick={() => setShowRejectDialog(false)}
                                  disabled={updatingStatus !== null}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  onClick={() => {
                                    handleStatusUpdate('rejected')
                                    setShowRejectDialog(false)
                                  }}
                                  disabled={updatingStatus !== null}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  {updatingStatus === 'rejected' ? (
                                    <>
                                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                      {t.orderDetail.rejecting}
                                    </>
                                  ) : (
                                    t.orderDetail.yesRejectOrder
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                      
                      {/* Preparing status info removed - direct ready button only */}
                      
                      {order.status === 'ready' && (
                        <div className="space-y-3">
                          <Button 
                            onClick={() => handleStatusUpdate('completed')}
                            disabled={updatingStatus !== null}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg transition-colors"
                          >
                            {updatingStatus === 'completed' ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                {t.orderDetail.completing}
                              </>
                            ) : (
                              t.orderDetail.markCompleted
                            )}
                          </Button>
                          <Button 
                            onClick={() => handleStatusUpdate('cancelled')}
                            disabled={updatingStatus !== null}
                            variant="outline" 
                            className="w-full border-red-300 text-red-700 hover:bg-red-50 py-2.5 rounded-lg transition-colors"
                          >
                            {updatingStatus === 'cancelled' ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                {t.orderDetail.cancelling}
                              </>
                            ) : (
                              t.orderDetail.cancelOrder
                            )}
                          </Button>
                        </div>
                      )}
                      
                      {order.status === 'completed' && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 text-center">
                          <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300 font-medium">
                            <CheckCircle2 className="h-5 w-5" />
                            {t.orderDetail.orderCompleted2}
                          </div>
                        </div>
                      )}
                      
                      {order.status === 'cancelled' && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 text-center">
                          <div className="flex items-center justify-center gap-2 text-red-700 dark:text-red-300 font-medium">
                            <XCircle className="h-5 w-5" />
                            {t.orderDetail.orderCancelled}
                          </div>
                        </div>
                      )}
                      
                      {order.status === 'rejected' && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 text-center">
                          <div className="flex items-center justify-center gap-2 text-red-700 dark:text-red-300 font-medium">
                            <XCircle className="h-5 w-5" />
                            {t.orderDetail.orderRejected}
                          </div>
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {t.orderDetail.orderRejectedDesc}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </DashboardLayout>
    </AuthGuard>
  )
}