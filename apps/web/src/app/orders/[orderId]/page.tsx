"use client"

import { use, useState, useEffect, useCallback, useMemo, useRef } from "react"
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
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ArrowLeft, Clock, MapPin, User, CheckCircle, CheckCircle2, Circle, AlertCircle, Package, RefreshCw, Wallet, XCircle, Timer, ClockPlus, TicketPercent, Minus, Plus, Trash2, ClipboardList } from "lucide-react"
import { ordersService } from "@/services/orders.service"
import { refundsService } from "@/services/refunds.service"
import { getSourceIcon } from "@/assets/images"
import Image from "next/image"
import Link from "next/link"
import { useOrderDetail } from "@/hooks/use-orders"
import type { Order, OrderItem } from "@/services/orders.service"
import { useEnhancedAuth } from "@/hooks/use-enhanced-auth"
import { useBranchSettings } from "@/hooks/use-branch-settings"
import { useOrderTimer } from "@/hooks/use-order-timer"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/translations"
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
import { WebSrmTransactionDialog } from "@/components/orders/websrm-transaction-dialog"
import { PaymentMethodChangeDialog } from "@/components/orders/payment-method-change-dialog"
import { PrintBill } from "@/components/orders/print-bill"
// import { UberDeliveryStatus } from "@/components/delivery/uber-delivery-status"

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
  const { settings, branchName } = useBranchSettings({ branchId: branchId || undefined })
  
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
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({})
  const [refundSuccess, setRefundSuccess] = useState(false)
  const [showRefundDialog, setShowRefundDialog] = useState(false)
  const [refundLoading, setRefundLoading] = useState(false)
  const [refundError, setRefundError] = useState<string | null>(null)

  // Custom amount refund state (FO-116 Step 2)
  const [refundMode, setRefundMode] = useState<'items' | 'custom'>('items')
  const [customAmount, setCustomAmount] = useState<string>('')

  // Payment method change dialog state
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  
  // Reject confirmation state
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  
  // Status update loading state
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  
  // Polling ref for cleanup
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  

  // Partial refund handlers
  const getRefundableQuantity = useCallback((item: OrderItem) => {
    const totalQuantity = Number(item.quantity ?? 0);
    const refundedQuantity = Number(item.refunded_quantity ?? 0);
    return Math.max(0, totalQuantity - refundedQuantity);
  }, []);

  const eligibleItems = useMemo(() => {
    if (!order?.items) return [];
    return order.items.filter(item => getRefundableQuantity(item) > 0);
  }, [order?.items, getRefundableQuantity]);

  const handleItemSelect = (item: OrderItem, checked: boolean) => {
    const refundableQty = getRefundableQuantity(item);

    setSelectedItems(prev => {
      if (!checked || refundableQty <= 0) {
        if (!(item.id in prev)) return prev;
        const { [item.id]: _removed, ...rest } = prev;
        return rest;
      }

      const desiredQuantity = Math.min(refundableQty, Math.max(prev[item.id] ?? refundableQty, 1));
      if (prev[item.id] === desiredQuantity) return prev;

      return { ...prev, [item.id]: desiredQuantity };
    });
  };

  const handleQuantityChange = (itemId: string, value: string, maxQuantity: number) => {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) return;

    const clampedValue = Math.min(Math.max(Math.floor(numericValue), 1), Math.max(maxQuantity, 1));

    setSelectedItems(prev => {
      if (!(itemId in prev)) return prev;
      if (prev[itemId] === clampedValue) return prev;
      return { ...prev, [itemId]: clampedValue };
    });
  };

  const handleQuantityStep = (itemId: string, delta: number, maxQuantity: number) => {
    setSelectedItems(prev => {
      if (!(itemId in prev)) return prev;
      const current = prev[itemId];
      const nextValue = Math.min(
        Math.max(current + delta, 1),
        Math.max(maxQuantity, 1)
      );

      if (nextValue === current) return prev;
      return { ...prev, [itemId]: nextValue };
    });
  };

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      const selections: Record<string, number> = {};
      eligibleItems.forEach(item => {
        const refundableQty = getRefundableQuantity(item);
        if (refundableQty > 0) {
          selections[item.id] = refundableQty;
        }
      });
      setSelectedItems(selections);
    } else {
      setSelectedItems({});
    }
  };

  const getSelectedAmount = () => {
    if (!order?.items) return 0;

    return Object.entries(selectedItems).reduce((total, [itemId, quantity]) => {
      const item = order.items?.find(orderItem => orderItem.id === itemId);
      if (!item) return total;
      return total + item.price * quantity;
    }, 0);
  };

  // Calculate proportional taxes for selected items refund
  const getRefundTaxes = () => {
    if (!order) return { gst: 0, qst: 0, total: 0 };

    const itemsTotal = getSelectedAmount();
    if (itemsTotal <= 0) return { gst: 0, qst: 0, total: 0 };

    // Calculate proportional ratio based on items subtotal
    const orderItemsSubtotal = parseFloat(order.pricing?.itemsTotal?.toString() || '0');
    const refundRatio = orderItemsSubtotal > 0 ? itemsTotal / orderItemsSubtotal : 0;

    // Calculate proportional taxes using pricing.gst and pricing.qst
    const orderGst = parseFloat(order.pricing?.gst?.toString() || '0');
    const orderQst = parseFloat(order.pricing?.qst?.toString() || '0');

    const gst = parseFloat((orderGst * refundRatio).toFixed(2));
    const qst = parseFloat((orderQst * refundRatio).toFixed(2));
    const total = parseFloat((itemsTotal + gst + qst).toFixed(2));

    return { gst, qst, total };
  };

  const selectedItemEntries = useMemo(() => Object.entries(selectedItems), [selectedItems]);
  const selectedCount = selectedItemEntries.length;
  const totalSelectedUnits = useMemo(
    () => selectedItemEntries.reduce((sum, [, qty]) => sum + qty, 0),
    [selectedItemEntries]
  );
  const selectAllChecked =
    eligibleItems.length > 0 &&
    eligibleItems.every(item => (selectedItems[item.id] ?? 0) > 0);

  useEffect(() => {
    if (!order?.items || order.items.length === 0) {
      setSelectedItems(prev => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }

    setSelectedItems(prev => {
      const itemsMap = new Map(order.items?.map(item => [item.id, item]));
      const next: Record<string, number> = {};
      let changed = false;

      Object.entries(prev).forEach(([itemId, quantity]) => {
        const item = itemsMap.get(itemId);
        if (!item) {
          changed = true;
          return;
        }

        const refundableQty = getRefundableQuantity(item);
        if (refundableQty <= 0) {
          changed = true;
          return;
        }

        const normalizedQty = Math.min(Math.max(Math.floor(quantity), 1), refundableQty);
        if (normalizedQty !== quantity) {
          changed = true;
        }
        next[itemId] = normalizedQty;
      });

      if (Object.keys(next).length !== Object.keys(prev).length) {
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [order?.items, getRefundableQuantity]);

  // Get max refundable amount for order
  const getMaxRefundable = () => {
    if (!order) return 0;
    const totalAmount = parseFloat(order.total_amount?.toString() || '0');
    const alreadyRefunded = parseFloat(order.total_refunded?.toString() || '0');
    return Math.max(0, totalAmount - alreadyRefunded);
  };

  const handleRefundClick = () => {
    setShowRefundDialog(true)
    setRefundError(null)
  }

  const handleConfirmRefund = async () => {
    if (!order?.id) return;

    setRefundLoading(true);
    setRefundError(null);

    try {
      let refundAmount: number;
      let refundedItems: Array<{ itemId: string; quantity: number; amount: number }> = [];

      if (refundMode === 'custom') {
        // Custom amount mode (FO-116 Step 2)
        const amount = parseFloat(customAmount);
        const maxRefundable = getMaxRefundable();

        if (isNaN(amount) || amount <= 0) {
          setRefundError('Please enter a valid refund amount');
          setRefundLoading(false);
          return;
        }

        if (amount > maxRefundable) {
          setRefundError(`Refund amount cannot exceed $${maxRefundable.toFixed(2)}`);
          setRefundLoading(false);
          return;
        }

        refundAmount = amount;
        // Empty refundedItems for custom amount refund
      } else {
        // Item selection mode (FO-116 Step 3, 4)
        if (!order.items) {
          setRefundLoading(false);
          return;
        }

        // Use total with taxes included
        const refundTaxes = getRefundTaxes();
        refundAmount = refundTaxes.total;

        if (refundAmount <= 0) {
          setRefundError('Please select items to refund');
          setRefundLoading(false);
          return;
        }

        refundedItems = selectedItemEntries
          .map(([itemId, quantity]) => {
            const item = order.items?.find(orderItem => orderItem.id === itemId);
            if (!item) return null;

            const refundableQty = getRefundableQuantity(item);
            const safeQuantity = Math.min(quantity, refundableQty);
            if (safeQuantity <= 0) return null;

            return {
              itemId: item.id,
              quantity: safeQuantity,
              amount: item.price * safeQuantity
            };
          })
          .filter(Boolean) as Array<{ itemId: string; quantity: number; amount: number }>;

        if (refundedItems.length === 0) {
          setRefundLoading(false);
          return;
        }
      }

      await refundsService.processRefund(
        order.id,
        refundAmount,
        'requested_by_customer',
        refundedItems
      );

      setRefundSuccess(true);
      setSelectedItems({});
      setCustomAmount('');
      setShowRefundDialog(false);

      await refetch();

      setTimeout(() => {
        setRefundSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Refund failed:', error);
      setRefundError(error instanceof Error ? error.message : 'Failed to process refund');
    } finally {
      setRefundLoading(false);
    }
  }

  // Handle order status updates
  const handleStatusUpdate = async (newStatus: 'preparing' | 'ready' | 'completed' | 'cancelled' | 'rejected') => {
    console.log('🚀 handleStatusUpdate called with status:', newStatus);
    console.log('📦 Order data:', {
      payment_method: order?.payment_method,
      payment_status: order?.payment_status,
      payment_intent_id: order?.payment_intent_id,
      total_amount: order?.total_amount
    });

    setUpdatingStatus(newStatus)
    try {
      const success = await updateStatus({ status: newStatus });
      console.log('✅ Status update result:', success);

      if (success) {
        // Auto-refund if rejected + online payment
        if (newStatus === 'rejected' &&
            order?.payment_method === 'online' &&
            order?.payment_status === 'succeeded' &&
            order?.total_amount) {

          console.log('🔴 Order rejected - Processing full refund...');

          try {
            await refundsService.processRefund(
              order.id,  // Use full UUID from order object, not URL param
              order.total_amount,
              'requested_by_customer'  // Stripe-valid reason
            );
            console.log('✅ Full refund processed successfully');
          } catch (refundError) {
            console.error('❌ Refund failed:', refundError);
            // Don't fail the status update - order is still rejected
          }
        } else {
          console.log('⚠️ Refund skipped. Reason:', {
            isRejected: newStatus === 'rejected',
            isOnline: order?.payment_method === 'online',
            isSucceeded: order?.payment_status === 'succeeded'
          });
        }

        // Refresh order data
        await refetch();
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
                                      checked={selectAllChecked}
                                      disabled={eligibleItems.length === 0}
                                      onCheckedChange={handleSelectAll}
                                    />
                                    <label
                                      htmlFor="select-all"
                                      className={`text-xs ${eligibleItems.length === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 cursor-pointer'}`}
                                    >
                                      {t.orderDetail.selectAll}
                                    </label>
                                  </div>
                                </div>
                                
                                {/* Refund button - always visible */}
                                <div className="mt-3 pt-3 border-t border-gray-300">
                                  <div className="flex items-center justify-between">
                                    {selectedCount > 0 ? (
                                      <div className="text-sm text-blue-700">
                                        <span>
                                          {selectedCount} {t.orderDetail.itemsSelected}
                                        </span>
                                        {totalSelectedUnits > selectedCount && (
                                          <span className="ml-2 text-xs text-blue-600/80">
                                            ({t.orderDetail.unitsSelected.replace("{count}", totalSelectedUnits.toString())})
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-gray-500">
                                        {language === 'fr' ? 'Sélectionnez des articles ou utilisez un montant personnalisé' : 'Select items or use custom amount'}
                                      </div>
                                    )}
                                    <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
                                      <DialogTrigger asChild>
                                        <Button
                                          size="sm"
                                          onClick={handleRefundClick}
                                          className="bg-blue-600 hover:bg-blue-700"
                                          disabled={refundLoading}
                                        >
                                          {selectedCount > 0
                                            ? `${t.orderDetail.refund} $${getRefundTaxes().total.toFixed(2)}`
                                            : (language === 'fr' ? 'Rembourser' : 'Refund')
                                          }
                                        </Button>
                                      </DialogTrigger>
                                        
                                        <DialogContent className="max-w-lg">
                                          <DialogHeader>
                                            <DialogTitle className="flex items-center gap-2">
                                              <AlertCircle className="h-5 w-5 text-red-600" />
                                              {language === 'fr' ? 'Traiter le remboursement' : 'Process Refund'}
                                            </DialogTitle>
                                            <DialogDescription>
                                              {language === 'fr' ? 'Sélectionnez la méthode de remboursement' : 'Select refund method'}
                                            </DialogDescription>
                                          </DialogHeader>

                                          <Tabs value={refundMode} onValueChange={(v) => setRefundMode(v as 'items' | 'custom')} className="w-full">
                                            <TabsList className="grid w-full grid-cols-2">
                                              <TabsTrigger value="items">
                                                {language === 'fr' ? 'Par articles' : 'Select Items'}
                                              </TabsTrigger>
                                              <TabsTrigger value="custom">
                                                {language === 'fr' ? 'Montant personnalisé' : 'Custom Amount'}
                                              </TabsTrigger>
                                            </TabsList>

                                            {/* Item Selection Mode */}
                                            <TabsContent value="items" className="space-y-4">
                                              {selectedCount > 0 ? (
                                                <div className="space-y-2">
                                                  <h4 className="font-medium text-sm">{t.orderDetail.itemsToRefund}</h4>
                                                  <div className="space-y-1 max-h-40 overflow-y-auto border rounded-md p-2 bg-gray-50">
                                                    {order.items
                                                      ?.filter(item => (selectedItems[item.id] ?? 0) > 0)
                                                      .map(item => {
                                                        const selectedQuantity = selectedItems[item.id] ?? 0;
                                                        return (
                                                          <div key={item.id} className="flex justify-between text-sm bg-white p-2 rounded border">
                                                            <span>{item.name} x{selectedQuantity}</span>
                                                            <span className="font-medium">${(item.price * selectedQuantity).toFixed(2)}</span>
                                                          </div>
                                                        );
                                                      })}
                                                  </div>

                                                  {/* Tax Breakdown */}
                                                  <div className="pt-3 border-t space-y-2">
                                                    <div className="flex justify-between items-center text-sm text-gray-600">
                                                      <span>{language === 'fr' ? 'Sous-total articles:' : 'Items Subtotal:'}</span>
                                                      <span className="font-medium">${getSelectedAmount().toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm text-gray-600">
                                                      <span>GST (5%):</span>
                                                      <span className="font-medium">${getRefundTaxes().gst.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm text-gray-600">
                                                      <span>QST (9.975%):</span>
                                                      <span className="font-medium">${getRefundTaxes().qst.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center pt-2 border-t">
                                                      <span className="font-bold text-base">{language === 'fr' ? 'Total (taxes incluses):' : 'Total (taxes included):'}</span>
                                                      <span className="font-bold text-lg text-red-600">${getRefundTaxes().total.toFixed(2)}</span>
                                                    </div>
                                                  </div>
                                                </div>
                                              ) : (
                                                <div className="text-center py-6 text-muted-foreground">
                                                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                                  <p className="text-sm">
                                                    {language === 'fr'
                                                      ? 'Veuillez sélectionner des articles à rembourser'
                                                      : 'Please select items to refund'}
                                                  </p>
                                                </div>
                                              )}
                                            </TabsContent>

                                            {/* Custom Amount Mode */}
                                            <TabsContent value="custom" className="space-y-4">
                                              <div className="space-y-3">
                                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                                                  <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-blue-900">{language === 'fr' ? 'Total de la commande:' : 'Order Total:'}</span>
                                                    <span className="font-semibold text-blue-900">${order.total_amount?.toFixed(2)}</span>
                                                  </div>
                                                  <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-blue-900">{language === 'fr' ? 'Déjà remboursé:' : 'Already Refunded:'}</span>
                                                    <span className="font-semibold text-red-600">-${(order.total_refunded || 0).toFixed(2)}</span>
                                                  </div>
                                                  <div className="flex justify-between text-sm pt-2 border-t border-blue-300">
                                                    <span className="font-bold text-blue-900">{language === 'fr' ? 'Max remboursable:' : 'Max Refundable:'}</span>
                                                    <span className="font-bold text-green-600">${getMaxRefundable().toFixed(2)}</span>
                                                  </div>
                                                </div>

                                                <div className="space-y-2">
                                                  <Label htmlFor="custom-amount" className="text-sm font-medium">
                                                    {language === 'fr' ? 'Montant du remboursement' : 'Refund Amount'}
                                                  </Label>
                                                  <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                                    <Input
                                                      id="custom-amount"
                                                      type="number"
                                                      min="0.01"
                                                      max={getMaxRefundable()}
                                                      step="0.01"
                                                      value={customAmount}
                                                      onChange={(e) => setCustomAmount(e.target.value)}
                                                      placeholder="0.00"
                                                      className="pl-7"
                                                    />
                                                  </div>
                                                  <p className="text-xs text-muted-foreground">
                                                    {language === 'fr'
                                                      ? 'Par exemple: $1.00 pour corriger une erreur de prix'
                                                      : 'e.g., $1.00 to correct a pricing error'}
                                                  </p>
                                                </div>

                                                {parseFloat(customAmount) > 0 && (
                                                  <div className="p-3 bg-gray-50 border rounded-md">
                                                    <div className="flex justify-between items-center">
                                                      <span className="font-semibold text-sm">{language === 'fr' ? 'Montant à rembourser:' : 'Amount to Refund:'}</span>
                                                      <span className="font-bold text-lg text-red-600">${parseFloat(customAmount).toFixed(2)}</span>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            </TabsContent>
                                          </Tabs>

                                          {/* Error Message */}
                                          {refundError && (
                                            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                              <div className="flex items-center gap-2">
                                                <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                                                <p className="text-sm text-red-700">{refundError}</p>
                                              </div>
                                            </div>
                                          )}

                                          <DialogFooter>
                                            <Button
                                              variant="outline"
                                              onClick={() => {
                                                setShowRefundDialog(false)
                                                setRefundError(null)
                                                setCustomAmount('')
                                              }}
                                              disabled={refundLoading}
                                            >
                                              {t.orderDetail.cancel}
                                            </Button>
                                            <Button
                                              onClick={handleConfirmRefund}
                                              disabled={refundLoading || (refundMode === 'items' && selectedCount === 0) || (refundMode === 'custom' && (!customAmount || parseFloat(customAmount) <= 0))}
                                              className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
                                            >
                                              {refundLoading ? (
                                                <div className="flex items-center gap-2">
                                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                                  {language === 'fr' ? 'Traitement...' : 'Processing...'}
                                                </div>
                                              ) : (
                                                <>
                                                  {t.orderDetail.confirmRefund} ${refundMode === 'items' ? getRefundTaxes().total.toFixed(2) : (parseFloat(customAmount) || 0).toFixed(2)}
                                                </>
                                              )}
                                            </Button>
                                          </DialogFooter>
                                        </DialogContent>
                                      </Dialog>
                                    </div>
                                  </div>

                                {eligibleItems.length === 0 && (
                                  <div className="mt-3 text-xs text-gray-500">
                                    {t.orderDetail.noItemsEligible}
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
                              {order.items?.map((item) => {
                                const refundableQty = getRefundableQuantity(item);
                                const isRefundable =
                                  (order.status === 'completed' || order.status === 'cancelled') && refundableQty > 0;
                                const selectedQty = selectedItems[item.id] ?? 0;
                                const isSelected = selectedQty > 0;
                                const refundedQty = Number(item.refunded_quantity ?? 0);

                                return (
                                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-white">
                                    {isRefundable && (
                                      <div className="pt-1">
                                        <Checkbox
                                          id={`item-${item.id}`}
                                          checked={isSelected}
                                          onCheckedChange={(checked) => handleItemSelect(item, checked === true)}
                                        />
                                      </div>
                                    )}
                                    
                                    <div className="flex-1 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-gray-900">
                                            {item.quantity}x {item.name}
                                          </span>
                                          {refundedQty > 0 && (
                                            <Badge
                                              variant="outline"
                                              className="text-xs border-primary text-primary bg-primary/10"
                                            >
                                              {t.orderDetail.refundedBadge}
                                            </Badge>
                                          )}
                                        </div>
                                        <span className="font-medium text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
                                      </div>
                                      
                                      {item.variants && item.variants.length > 0 && (
                                        <div className="flex gap-2 flex-wrap">
                                          {item.variants?.map((variant, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                                              {typeof variant === 'string' ? variant : variant.name}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {item.special_instructions && (
                                        <div className="text-sm text-primary italic">
                                          {item.special_instructions}
                                        </div>
                                      )}
                                      
                                      {item.quantity > 1 && (
                                        <div className="text-xs text-gray-500">
                                          ${item.price.toFixed(2)} {t.orderDetail.each}
                                        </div>
                                      )}

                                      {item.quantity > 1 && refundedQty > 0 && refundableQty > 0 && (
                                        <div className="text-xs text-gray-500">
                                          {t.orderDetail.refundRemainingInfo
                                            .replace("{refunded}", refundedQty.toString())
                                            .replace("{total}", item.quantity.toString())
                                            .replace("{remaining}", refundableQty.toString())}
                                        </div>
                                      )}

                                      {isRefundable && isSelected && refundableQty > 1 && (
                                        <div className="flex flex-col gap-2 pt-3 sm:flex-row sm:items-center sm:gap-3">
                                          <span className="text-xs font-medium text-gray-600">
                                            {t.orderDetail.quantityToRefund}
                                          </span>
                                          <div className="inline-flex items-center gap-2">
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="icon"
                                              onClick={() => handleQuantityStep(item.id, -1, refundableQty)}
                                              disabled={selectedQty <= 1}
                                              aria-label={t.orderDetail.decreaseQuantity}
                                            >
                                              <Minus className="h-4 w-4" />
                                            </Button>
                                            <Input
                                              id={`refund-qty-${item.id}`}
                                              type="number"
                                              min={1}
                                              max={refundableQty}
                                              value={selectedQty}
                                              onChange={(event) =>
                                                handleQuantityChange(item.id, event.target.value, refundableQty)
                                              }
                                              className="h-9 w-16 text-center text-sm font-medium [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                            />
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="icon"
                                              onClick={() => handleQuantityStep(item.id, 1, refundableQty)}
                                              disabled={selectedQty >= refundableQty}
                                              aria-label={t.orderDetail.increaseQuantity}
                                            >
                                              <Plus className="h-4 w-4" />
                                            </Button>
                                            <span className="text-xs text-gray-500">
                                              {t.orderDetail.maxRefundable.replace("{max}", refundableQty.toString())}
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}

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

                    {/* SW-78 FO-114: Transaction Changes - Quebec SRS Compliance */}
                    {order.removedItems && order.removedItems.length > 0 && (() => {
                      // Calculate grouped count for display
                      const groupedCount = [...new Set(order.removedItems.map(item => `${item.item_id}-${item.reason}`))].length;

                      return (
                      <AccordionItem value="removed-items" className="border-none">
                        <Card>
                          <AccordionTrigger className="hover:no-underline px-6">
                            <div className="flex items-center gap-2">
                              <ClipboardList className="h-5 w-5" />
                              <span className="font-medium">
                                {language === 'fr' ? 'Modifications de transaction' : 'Transaction Changes'} ({groupedCount})
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-0 pb-0">
                            <Separator />
                            <CardContent className="p-6">
                              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                <p className="text-sm text-blue-700">
                                  {language === 'fr'
                                    ? 'Ces modifications ont été effectuées avant le paiement.'
                                    : 'These modifications were made before payment.'}
                                </p>
                              </div>

                              <div className="space-y-3">
                                {(() => {
                                  // SW-78 FO-114: Group removed items by item_id and reason for cleaner display
                                  const groupRemovedItems = (items: typeof order.removedItems) => {
                                    const grouped = items.reduce((acc, item) => {
                                      const key = `${item.item_id}-${item.reason}`;
                                      if (!acc[key]) {
                                        acc[key] = { ...item };
                                      } else {
                                        // Sum up the quantities
                                        acc[key].removed_quantity += item.removed_quantity;
                                        // Keep the most recent timestamp
                                        if (new Date(item.removed_at) > new Date(acc[key].removed_at)) {
                                          acc[key].removed_at = item.removed_at;
                                        }
                                      }
                                      return acc;
                                    }, {} as Record<string, typeof items[0]>);

                                    return Object.values(grouped);
                                  };

                                  const groupedRemovedItems = groupRemovedItems(order.removedItems);

                                  return groupedRemovedItems.map((removedItem) => {
                                  const isIncrease = removedItem.reason === 'quantity_increased';
                                  const isDecrease = removedItem.reason === 'quantity_decreased';
                                  const isRemoved = removedItem.reason === 'user_removed';

                                  const borderColor = isIncrease ? 'border-green-300' : isRemoved ? 'border-red-200' : 'border-orange-200';
                                  const bgColor = isIncrease ? 'bg-green-50/50' : isRemoved ? 'bg-red-50/50' : 'bg-orange-50/50';
                                  const iconColor = isIncrease ? 'text-green-600' : isRemoved ? 'text-red-600' : 'text-orange-600';
                                  const badgeBorder = isIncrease ? 'border-green-400' : isRemoved ? 'border-red-400' : 'border-orange-400';
                                  const badgeText = isIncrease ? 'text-green-700' : isRemoved ? 'text-red-700' : 'text-orange-700';
                                  const badgeBg = isIncrease ? 'bg-green-100' : isRemoved ? 'bg-red-100' : 'bg-orange-100';

                                  const Icon = isIncrease ? Plus : isRemoved ? Trash2 : Minus;

                                  return (
                                    <div key={removedItem.id} className={`flex items-start gap-3 p-3 rounded-lg border ${borderColor} ${bgColor}`}>
                                      <div className="pt-1">
                                        <Icon className={`h-4 w-4 ${iconColor}`} />
                                      </div>

                                      <div className="flex-1 space-y-2">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900">
                                              {removedItem.removed_quantity}x {removedItem.item_name}
                                            </span>
                                            <Badge
                                              variant="outline"
                                              className={`text-xs ${badgeBorder} ${badgeText} ${badgeBg}`}
                                            >
                                              {removedItem.reason === 'user_removed'
                                                ? (language === 'fr' ? 'Retiré' : 'Removed')
                                                : removedItem.reason === 'quantity_increased'
                                                ? (language === 'fr' ? 'Quantité augmentée' : 'Qty Increased')
                                                : (language === 'fr' ? 'Quantité réduite' : 'Qty Decreased')
                                              }
                                            </Badge>
                                          </div>
                                          <span className="font-medium text-gray-900">
                                            {isIncrease ? '+' : ''}${(removedItem.item_price * removedItem.removed_quantity).toFixed(2)}
                                          </span>
                                        </div>

                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-gray-600">
                                          <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            <span>
                                              {new Date(removedItem.removed_at).toLocaleString('en-CA', {
                                                timeZone: order.branch_timezone || 'America/Toronto',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                              })}
                                            </span>
                                          </div>

                                          {(isDecrease || isIncrease) && (
                                            <div className="text-xs text-gray-500">
                                              {language === 'fr'
                                                ? `Quantité originale: ${removedItem.original_quantity}`
                                                : `Original quantity: ${removedItem.original_quantity}`
                                              }
                                            </div>
                                          )}

                                          <div className="text-xs text-gray-500">
                                            ${removedItem.item_price.toFixed(2)} {language === 'fr' ? 'chacun' : 'each'}
                                          </div>
                                        </div>

                                        {removedItem.notes && (
                                          <div className={`text-sm italic ${isIncrease ? 'text-green-700' : isRemoved ? 'text-red-700' : 'text-orange-700'}`}>
                                            {removedItem.notes}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })})()}
                              </div>
                            </CardContent>
                          </AccordionContent>
                        </Card>
                      </AccordionItem>
                      );
                    })()}

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
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">{language === 'fr' ? 'Méthode de paiement' : 'Payment Method'}</span>
                          <div className="flex items-center gap-2">
                            {!order.payment_method_changed && order.payment_method && (
                              (order.payment_method === 'online' && order.payment_status === 'succeeded') ||
                              (['cash', 'card'].includes(order.payment_method) && ['preparing', 'ready', 'completed'].includes(order.status))
                            ) && (
                              <TooltipProvider delayDuration={100}>
                                <Tooltip open={isPaymentDialogOpen ? false : undefined}>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <PaymentMethodChangeDialog
                                        orderId={order.id}
                                        currentPaymentMethod={order.payment_method}
                                        orderNumber={order.id.substring(0, 8).toUpperCase()}
                                        totalAmount={order.total_amount}
                                        onSuccess={refetch}
                                        onOpenChange={setIsPaymentDialogOpen}
                                      />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="left">
                                    <p>{t.orderDetail.changePaymentMethod}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
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
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t.orderDetail.orderDate}</span>
                          <span>{new Date(order.created_at).toLocaleDateString('en-CA', {
                            timeZone: order.branch_timezone || 'America/Toronto'
                          })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t.orderDetail.orderTime}</span>
                          <span>{new Date(order.created_at).toLocaleTimeString('en-CA', {
                            timeZone: order.branch_timezone || 'America/Toronto',
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
                                    timeZone: order.branch_timezone || 'America/Toronto',
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
                                    timeZone: order.branch_timezone || 'America/Toronto',
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
                                  timeZone: order.branch_timezone || 'America/Toronto',
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
                                  timeZone: order.branch_timezone || 'America/Toronto',
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
                        <div>
                          {/* FO-129: Print Bill with Timezone Notation */}
                          <PrintBill order={order} branchName={branchName || undefined} />
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

                  {/* WebSRM Transaction (SW-78 FO-107) */}
                  {branchId && order?.id && (
                    <WebSrmTransactionDialog
                      orderId={order.id}
                      branchId={branchId}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </DashboardLayout>
    </AuthGuard>
  )
}
