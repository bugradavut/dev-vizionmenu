"use client"

import { use, useState } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ArrowLeft, Clock, MapPin, User, CheckCircle, CheckCircle2, Circle, AlertCircle, Package, RefreshCw, Wallet } from "lucide-react"
import { getSourceIcon } from "@/assets/images"
import Image from "next/image"
import Link from "next/link"
import { useOrderDetail } from "@/hooks/use-orders"

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
  
  // Real API integration
  const { 
    order, 
    loading, 
    error, 
    refetch,
    clearError,
    updateStatus 
  } = useOrderDetail(orderId)
  
  // Partial refund state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [refundSuccess, setRefundSuccess] = useState(false)
  const [showRefundDialog, setShowRefundDialog] = useState(false)

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
  const handleStatusUpdate = async (newStatus: 'preparing' | 'ready' | 'completed' | 'cancelled') => {
    try {
      const success = await updateStatus({ status: newStatus });
      if (success) {
        // Optionally show success message
        console.log(`Order status updated to: ${newStatus}`);
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  }

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

  const getOrderTypeLabel = (orderType: string) => {
    switch (orderType?.toLowerCase()) {
      case 'dine_in': return 'Dine In'
      case 'takeaway': return 'Takeaway'
      case 'delivery': return 'Delivery'
      case 'pickup': return 'Pickup'
      default: return orderType || 'Unknown'
    }
  }

  const getPaymentMethodLabel = (paymentMethod: string) => {
    switch (paymentMethod?.toLowerCase()) {
      case 'credit_card': return 'Credit Card'
      case 'debit_card': return 'Debit Card'
      case 'cash': return 'Cash'
      case 'paypal': return 'PayPal'
      case 'apple_pay': return 'Apple Pay'
      case 'google_pay': return 'Google Pay'
      default: return paymentMethod || 'Not specified'
    }
  }

  const formatEstimatedTime = (timestamp: string) => {
    if (!timestamp) return 'Not specified'
    
    try {
      const date = new Date(timestamp)
      const now = new Date()
      
      // If it's today, show time only
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('en-CA', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        })
      }
      
      // If it's different day, show date and time
      return date.toLocaleString('en-CA', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    } catch {
      return 'Invalid time'
    }
  }

  const getStatusBadge = (status: string) => {
    // Ensure status is a valid string
    const safeStatus = (typeof status === 'string' && status) ? status : 'pending';
    
    const colors: Record<string, string> = {
      pending: "text-orange-700 border-orange-300 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700",
      preparing: "text-blue-700 border-blue-300 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700",
      ready: "text-green-700 border-green-400 bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700",
      completed: "text-gray-600 border-gray-200 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-700"
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
      <div className="flex items-center gap-2">
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

  const getProgressValue = () => {
    if (!order) return 0;
    const statusOrder = ['pending', 'preparing', 'ready', 'completed']
    const currentIndex = statusOrder.indexOf(order.status)
    return currentIndex >= 0 ? ((currentIndex + 1) / statusOrder.length) * 100 : 0
  }

  const renderTimelineIcon = (status: string) => {
    if (!order) return <Circle className="h-5 w-5 text-gray-400" />;
    const statusOrder = ['pending', 'preparing', 'ready', 'completed']
    const currentIndex = statusOrder.indexOf(order.status)
    const stepIndex = statusOrder.indexOf(status)
    
    if (stepIndex <= currentIndex) {
      return <CheckCircle className="h-5 w-5 text-green-600" />
    } else if (stepIndex === currentIndex + 1) {
      return <AlertCircle className="h-5 w-5 text-blue-600" />
    } else {
      return <Circle className="h-5 w-5 text-gray-400" />
    }
  }

  // Loading and error states
  if (loading) {
    return (
      <AuthGuard requireAuth={true} requireRememberOrRecent={true} redirectTo="/login">
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <div className="flex items-center justify-center h-screen">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading order details...</span>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </AuthGuard>
    )
  }

  if (error) {
    return (
      <AuthGuard requireAuth={true} requireRememberOrRecent={true} redirectTo="/login">
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <div className="flex flex-col items-center justify-center h-screen gap-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <div className="text-center">
                <h2 className="text-lg font-semibold">Failed to load order</h2>
                <p className="text-muted-foreground">{error}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={refetch} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
                <Button onClick={clearError} variant="ghost">
                  Dismiss
                </Button>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </AuthGuard>
    )
  }

  if (!order) {
    return (
      <AuthGuard requireAuth={true} requireRememberOrRecent={true} redirectTo="/login">
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <div className="flex flex-col items-center justify-center h-screen gap-4">
              <Package className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <h2 className="text-lg font-semibold">Order not found</h2>
                <p className="text-muted-foreground">The order you&rsquo;re looking for doesn&rsquo;t exist.</p>
              </div>
              <Button asChild>
                <Link href="/orders">Back to Orders</Link>
              </Button>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requireAuth={true} requireRememberOrRecent={true} redirectTo="/login">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/orders">Orders</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href={`/orders/${context}`}>
                      {context === 'live' ? 'Live Orders' : 'Order History'}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{order.orderNumber}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          
          <div className="flex flex-1 flex-col px-2 sm:px-4 lg:px-6">
            {/* Header Section */}
            <div className="px-2 py-6 sm:px-4 lg:px-6 bg-background">
              <div className="flex items-center justify-between mb-6">
                <Link href={`/orders/${context}`}>
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to {context === 'live' ? 'Live Orders' : 'Order History'}
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
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Table {order.table_number}</span>
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
                            <span className="font-medium">Order Progress ({Math.round(getProgressValue())}% Complete)</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-0 pb-0">
                          <Separator />
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              <div className="mb-4 relative">
                                <Progress value={getProgressValue()} className="h-3" />
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                  <span>0%</span>
                                  <span>25%</span>
                                  <span>50%</span>
                                  <span>75%</span>
                                  <span>100%</span>
                                </div>
                              </div>
                              <div className="space-y-3">
                                {['pending', 'preparing', 'ready', 'completed'].map((status) => {
                                  const statusOrder = ['pending', 'preparing', 'ready', 'completed']
                                  const currentIndex = statusOrder.indexOf(order.status)
                                  const stepIndex = statusOrder.indexOf(status)
                                  const isCompleted = stepIndex <= currentIndex
                                  
                                  return (
                                    <div key={status} className="flex items-center gap-3">
                                      {renderTimelineIcon(status)}
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <p className={`text-sm font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                                            {status === 'pending' && 'Order received and pending confirmation'}
                                            {status === 'preparing' && 'Kitchen is preparing your order'}
                                            {status === 'ready' && 'Order is ready for pickup/delivery'}
                                            {status === 'completed' && 'Order has been completed'}
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
                            <span className="font-medium">Order Items ({order.items?.length || 0})</span>
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
                                    <span className="text-sm text-gray-700">Select items below to refund</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id="select-all"
                                      checked={selectedItems.size > 0 && selectedItems.size === (order.items?.length || 0)}
                                      onCheckedChange={handleSelectAll}
                                    />
                                    <label htmlFor="select-all" className="text-xs text-gray-600 cursor-pointer">
                                      Select All
                                    </label>
                                  </div>
                                </div>
                                
                                {/* Show selected items summary */}
                                {selectedItems.size > 0 && (
                                  <div className="mt-3 pt-3 border-t border-gray-300">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-blue-700">
                                        {selectedItems.size} item(s) selected
                                      </span>
                                      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
                                        <DialogTrigger asChild>
                                          <Button 
                                            size="sm" 
                                            onClick={handleRefundClick}
                                            className="bg-blue-600 hover:bg-blue-700"
                                          >
                                            Refund ${getSelectedAmount().toFixed(2)}
                                          </Button>
                                        </DialogTrigger>
                                        
                                        <DialogContent className="max-w-md">
                                          <DialogHeader>
                                            <DialogTitle className="flex items-center gap-2">
                                              <AlertCircle className="h-5 w-5 text-red-600" />
                                              Confirm Partial Refund
                                            </DialogTitle>
                                            <DialogDescription>
                                              You are about to refund {selectedItems.size} item(s) for a total amount of ${getSelectedAmount().toFixed(2)}.
                                              This action cannot be undone.
                                            </DialogDescription>
                                          </DialogHeader>
                                          
                                          <div className="py-4">
                                            <div className="space-y-2">
                                              <h4 className="font-medium text-sm">Items to be refunded:</h4>
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
                                              Cancel
                                            </Button>
                                            <Button 
                                              onClick={handleConfirmRefund}
                                              className="bg-red-600 hover:bg-red-700"
                                            >
                                              Confirm Refund ${getSelectedAmount().toFixed(2)}
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
                                        Refund processed successfully! Funds will be returned within 3-5 business days.
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
                                      <div className="text-sm text-orange-600 italic">
                                        {item.special_instructions}
                                      </div>
                                    )}
                                    
                                    {/* Show unit price if quantity > 1 */}
                                    {item.quantity > 1 && (
                                      <div className="text-xs text-gray-500">
                                        ${item.price.toFixed(2)} each
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                              
                              {/* Notes and Special Instructions for Order */}
                              {(order.notes || order.special_instructions) && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <h4 className="font-medium text-gray-900 mb-2">Order Notes & Instructions</h4>
                                  <div className="space-y-3">
                                    {order.notes && (
                                      <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                                        <h5 className="text-sm font-medium text-blue-900 mb-1">Notes</h5>
                                        <p className="text-sm text-blue-700">{order.notes}</p>
                                      </div>
                                    )}
                                    {order.special_instructions && (
                                      <div className="p-3 bg-orange-50 rounded-md border border-orange-200">
                                        <h5 className="text-sm font-medium text-orange-900 mb-1">Special Instructions</h5>
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
                            <span className="font-medium">Customer Information</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-0 pb-0">
                          <Separator />
                          <CardContent className="p-6">
                            <div className="space-y-0">
                              {/* Customer Name Row */}
                              <div className="flex items-center justify-between py-3 border-b border-border/40">
                                <label className="text-sm text-muted-foreground">Customer Name</label>
                                <p className="font-medium">{order.customer?.name || 'Walk-in Customer'}</p>
                              </div>
                              
                              {/* Contact Row */}
                              <div className="flex items-center justify-between py-3 border-b border-border/40">
                                <label className="text-sm text-muted-foreground">Contact</label>
                                <p className="text-sm">{order.customer?.phone || 'Not provided'}</p>
                              </div>
                              
                              {/* Email Row */}
                              <div className="flex items-center justify-between py-3 border-b border-border/40">
                                <label className="text-sm text-muted-foreground">Email Address</label>
                                <p className="text-sm">{order.customer.email || 'Not provided'}</p>
                              </div>
                              
                              {/* Order Type Row */}
                              <div className="flex items-center justify-between py-3">
                                <label className="text-sm text-muted-foreground">Order Type</label>
                                <p className="text-sm">{getOrderTypeLabel(order.order_type)}</p>
                              </div>
                              
                              {/* Delivery Address Row */}
                              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                              {(order as any).deliveryAddress && (
                                <div className="flex items-start justify-between py-3">
                                  <label className="text-sm text-muted-foreground">Delivery Address</label>
                                  <div className="text-right text-sm">
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    <p>{(order as any).deliveryAddress.street}</p>
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    <p>{(order as any).deliveryAddress.city}, {(order as any).deliveryAddress.province} {(order as any).deliveryAddress.postalCode}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </AccordionContent>
                      </Card>
                    </AccordionItem>

                  </Accordion>
                </div>

                {/* Right Column - Payment Summary & Actions */}
                <div className="md:col-span-4 group-has-[[data-state=expanded]]/sidebar-wrapper:col-span-12 group-has-[[data-state=expanded]]/sidebar-wrapper:lg:col-span-4 space-y-6">
                  {/* Payment Summary */}
                  <Card>
                    <CardHeader className="px-6 py-4">
                      <CardTitle className="flex items-center gap-2 text-base font-medium">
                        <Wallet className="h-5 w-5" />
                        Payment Summary
                      </CardTitle>
                    </CardHeader>
                    <Separator />
                    <CardContent className="space-y-3 p-6">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>${order.pricing.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Tax (HST)</span>
                        <span>${order.pricing.tax_amount.toFixed(2)}</span>
                      </div>
                      {order.pricing.service_fee > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Service Fee</span>
                          <span>${order.pricing.service_fee.toFixed(2)}</span>
                        </div>
                      )}
                      {order.pricing.delivery_fee > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Delivery Fee</span>
                          <span>${order.pricing.delivery_fee.toFixed(2)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-medium text-lg">
                        <span>Total</span>
                        <span>${order.pricing.total.toFixed(2)}</span>
                      </div>
                      <div className="text-center text-sm text-muted-foreground mt-2">
                        Payment: {getPaymentMethodLabel(order.payment_method || 'cash')}
                      </div>
                      <Separator className="my-3" />
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Order Date</span>
                          <span>{new Date(order.created_at).toLocaleDateString('en-CA')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Order Time</span>
                          <span>{new Date(order.created_at).toLocaleTimeString('en-CA')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Est. Time</span>
                          <span>{formatEstimatedTime(order.estimated_ready_time || '')}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card>
                    <CardHeader className="px-6 py-4">
                      <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
                    </CardHeader>
                    <Separator />
                    <CardContent className="space-y-3 p-6">
                      {/* Order Status Actions */}
                      {order.status === 'pending' && (
                        <div className="space-y-3">
                          <Button 
                            onClick={() => handleStatusUpdate('preparing')}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 rounded-lg transition-colors"
                          >
                            Accept Order
                          </Button>
                          <Button 
                            onClick={() => handleStatusUpdate('cancelled')}
                            variant="outline" 
                            className="w-full border-red-300 text-red-700 hover:bg-red-50 py-2.5 rounded-lg transition-colors"
                          >
                            Reject Order
                          </Button>
                        </div>
                      )}
                      
                      {order.status === 'preparing' && (
                        <div className="space-y-3">
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-orange-700">
                              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                              <span className="font-medium">Kitchen is preparing this order</span>
                            </div>
                            <p className="text-sm text-orange-600 mt-1">
                              Waiting for kitchen to mark as ready...
                            </p>
                          </div>
                          <Button 
                            onClick={() => handleStatusUpdate('cancelled')}
                            variant="outline" 
                            className="w-full border-red-300 text-red-700 hover:bg-red-50 py-2.5 rounded-lg transition-colors"
                          >
                            Cancel Order
                          </Button>
                        </div>
                      )}
                      
                      {order.status === 'ready' && (
                        <div className="space-y-3">
                          <Button 
                            onClick={() => handleStatusUpdate('completed')}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg transition-colors"
                          >
                            Mark as Completed
                          </Button>
                          <Button 
                            onClick={() => handleStatusUpdate('cancelled')}
                            variant="outline" 
                            className="w-full border-red-300 text-red-700 hover:bg-red-50 py-2.5 rounded-lg transition-colors"
                          >
                            Cancel Order
                          </Button>
                        </div>
                      )}
                      
                      {order.status === 'completed' && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 text-center">
                          <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300 font-medium">
                            <CheckCircle2 className="h-5 w-5" />
                            Order Completed
                          </div>
                        </div>
                      )}
                      
                      {order.status === 'cancelled' && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 text-center">
                          <div className="text-red-700 dark:text-red-300 font-medium">
                            ❌ Order Cancelled
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
      </SidebarProvider>
    </AuthGuard>
  )
}