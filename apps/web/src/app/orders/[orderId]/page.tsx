"use client"

import { use } from "react"
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
import { ArrowLeft, Clock, MapPin, User, CheckCircle, Circle, AlertCircle, Package, Receipt } from "lucide-react"
import { getSourceIcon } from "@/assets/images"
import Image from "next/image"
import Link from "next/link"

// Types
interface TimelineStep {
  status: string;
  timestamp: string | null;
  message: string;
  completed: boolean;
}

// Mock order data - will be replaced with real API call
const mockOrderData = {
  id: "1",
  orderNumber: "ORDER-001",
  customerName: "John Doe",
  customerPhone: "+1 416 555 1234",
  customerEmail: "john.doe@email.com",
  deliveryAddress: {
    street: "123 Queen Street W",
    city: "Toronto",
    province: "ON",
    postalCode: "M5H 2M9"
  },
  source: "qr_code",
  status: "preparing",
  total: 125.50,
  subtotal: 112.50,
  tax: 13.00,
  tip: 15.00,
  deliveryFee: 3.99,
  createdAt: "2025-01-28T10:30:00Z",
  updatedAt: "2025-01-28T10:45:00Z",
  estimatedTime: "15-20 minutes",
  tableNumber: "A-12",
  specialInstructions: "Please deliver to the back entrance. Ring doorbell twice.",
  paymentMethod: "Credit Card",
  items: [
    {
      id: "1",
      name: "Margherita Pizza",
      quantity: 1,
      price: 18.99,
      notes: "Extra cheese, no mushrooms",
      variants: ["Large", "Thin Crust"]
    },
    {
      id: "2", 
      name: "Caesar Salad",
      quantity: 1,
      price: 12.99,
      notes: "Dressing on the side",
      variants: ["Regular"]
    },
    {
      id: "3",
      name: "Garlic Bread",
      quantity: 2,
      price: 8.99,
      notes: "",
      variants: ["Regular"]
    }
  ],
  timeline: [
    {
      status: "placed",
      timestamp: "2025-01-28T10:30:00Z",
      message: "Order placed by customer",
      completed: true
    },
    {
      status: "confirmed", 
      timestamp: "2025-01-28T10:32:00Z",
      message: "Order confirmed by restaurant",
      completed: true
    },
    {
      status: "preparing",
      timestamp: "2025-01-28T10:35:00Z", 
      message: "Kitchen started preparing",
      completed: true
    },
    {
      status: "ready",
      timestamp: null,
      message: "Ready for pickup/delivery",
      completed: false
    },
    {
      status: "completed",
      timestamp: null,
      message: "Order delivered/completed",
      completed: false
    }
  ],
  staff: {
    name: "Sarah Johnson",
    role: "Branch Manager",
    avatar: null
  },
  branch: {
    name: "Downtown Branch",
    phone: "+1 416 555 0100",
    email: "downtown@vizionmenu.com"
  }
}

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
  
  // For now, using mock data regardless of orderId
  // TODO: Fetch order data using orderId
  const order = mockOrderData
  console.log('Order ID:', orderId) // Temporary usage to avoid ESLint error

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

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "text-orange-700 border-orange-300 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700",
      preparing: "text-blue-700 border-blue-300 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700",
      ready: "text-green-700 border-green-400 bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700",
      completed: "text-gray-600 border-gray-200 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-700"
    }

    return (
      <Badge variant="outline" className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
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
    const completedSteps = order.timeline.filter(step => step.completed).length
    return (completedSteps / order.timeline.length) * 100
  }

  const renderTimelineIcon = (step: TimelineStep) => {
    if (step.completed) {
      return <CheckCircle className="h-5 w-5 text-green-600" />
    } else if (step.status === order.status) {
      return <AlertCircle className="h-5 w-5 text-blue-600" />
    } else {
      return <Circle className="h-5 w-5 text-gray-400" />
    }
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
                  <h1 className="text-3xl font-bold tracking-tight">{order.orderNumber}</h1>
                  {getStatusBadge(order.status)}
                </div>
                <div className="flex items-center gap-4">
                  {renderSourceIcon(order.source)}
                  {order.tableNumber && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Table {order.tableNumber}</span>
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
                                  <span>20%</span>
                                  <span>40%</span>
                                  <span>60%</span>
                                  <span>80%</span>
                                  <span>100%</span>
                                </div>
                              </div>
                              <div className="space-y-3">
                                {order.timeline.map((step) => (
                                  <div key={step.status} className="flex items-center gap-3">
                                    {renderTimelineIcon(step)}
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between">
                                        <p className={`text-sm font-medium ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                                          {step.message}
                                        </p>
                                        {step.timestamp && (
                                          <p className="text-xs text-muted-foreground">
                                            {new Date(step.timestamp).toLocaleString('en-CA')}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
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
                            <span className="font-medium">Order Items ({order.items.length})</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-0 pb-0">
                          <Separator />
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              {order.items.map((item, index) => (
                                <div key={item.id} className={`flex justify-between items-start pb-4 ${index < order.items.length - 1 || order.specialInstructions ? 'border-b border-border/40' : ''}`}>
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{item.name}</span>
                                      <span className="text-sm text-muted-foreground">x{item.quantity}</span>
                                    </div>
                                    {item.variants && item.variants.length > 0 && (
                                      <div className="flex gap-1 flex-wrap">
                                        {item.variants.map((variant, idx) => (
                                          <Badge key={idx} variant="secondary" className="text-xs">
                                            {variant}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                    {item.notes && (
                                      <p className="text-sm text-muted-foreground">{item.notes}</p>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <div className="font-medium">${(item.price * item.quantity).toFixed(2)}</div>
                                    {item.quantity > 1 && (
                                      <div className="text-xs text-muted-foreground">${item.price.toFixed(2)} each</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                              
                              {/* Special Instructions for Order */}
                              {order.specialInstructions && (
                                <div className="pt-2">
                                  <label className="text-sm text-muted-foreground block mb-2">Special Instructions</label>
                                  <div className="p-3 bg-muted/30 rounded-md">
                                    <p className="text-sm">{order.specialInstructions}</p>
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
                                <p className="font-medium">{order.customerName}</p>
                              </div>
                              
                              {/* Contact Row */}
                              <div className="flex items-center justify-between py-3 border-b border-border/40">
                                <label className="text-sm text-muted-foreground">Contact</label>
                                <p className="text-sm">{order.customerPhone}</p>
                              </div>
                              
                              {/* Order Type Row */}
                              <div className="flex items-center justify-between py-3 border-b border-border/40">
                                <label className="text-sm text-muted-foreground">Order Type</label>
                                <p className="text-sm">{order.source === 'qr_code' ? 'Dine In' : 'Delivery'}</p>
                              </div>
                              
                              {/* Payment Row */}
                              <div className="flex items-center justify-between py-3 border-b border-border/40">
                                <label className="text-sm text-muted-foreground">Payment</label>
                                <p className="text-sm">{order.paymentMethod}</p>
                              </div>
                              
                              {/* Email Row */}
                              <div className={`flex items-center justify-between py-3 ${order.deliveryAddress ? 'border-b border-border/40' : ''}`}>
                                <label className="text-sm text-muted-foreground">Email Address</label>
                                <p className="text-sm">{order.customerEmail}</p>
                              </div>
                              
                              {/* Delivery Address Row */}
                              {order.deliveryAddress && (
                                <div className="flex items-start justify-between py-3">
                                  <label className="text-sm text-muted-foreground">Delivery Address</label>
                                  <div className="text-right text-sm">
                                    <p>{order.deliveryAddress.street}</p>
                                    <p>{order.deliveryAddress.city}, {order.deliveryAddress.province} {order.deliveryAddress.postalCode}</p>
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
                        <Receipt className="h-5 w-5" />
                        Payment Summary
                      </CardTitle>
                    </CardHeader>
                    <Separator />
                    <CardContent className="space-y-3 p-6">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>${order.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Tax (HST)</span>
                        <span>${order.tax.toFixed(2)}</span>
                      </div>
                      {order.tip > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Tip</span>
                          <span>${order.tip.toFixed(2)}</span>
                        </div>
                      )}
                      {order.deliveryFee > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Delivery Fee</span>
                          <span>${order.deliveryFee.toFixed(2)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-medium text-lg">
                        <span>Total</span>
                        <span>${order.total.toFixed(2)}</span>
                      </div>
                      <div className="text-center text-sm text-muted-foreground mt-2">
                        Paid via {order.paymentMethod}
                      </div>
                      <Separator className="my-3" />
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Order Date</span>
                          <span>{new Date(order.createdAt).toLocaleDateString('en-CA')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Order Time</span>
                          <span>{new Date(order.createdAt).toLocaleTimeString('en-CA')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Est. Time</span>
                          <span>{order.estimatedTime}</span>
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
                      {order.status === 'ready' && (
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg transition-colors">
                          Mark as Delivered
                        </Button>
                      )}
                      {order.status === 'preparing' && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm font-medium">
                            Kitchen is preparing...
                          </div>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Status will update when ready for pickup/delivery
                          </p>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full justify-center py-2.5 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          Print Receipt
                        </Button>
                        <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg transition-colors">
                          Cancel Order
                        </Button>
                      </div>
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