"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Masonry from "react-masonry-css"
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
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Clock, ChefHat, CheckCircle2, ChevronDown, ChevronUp, FileText, Grid3X3, Columns3 } from "lucide-react"

interface OrderItem {
  id: string
  name: string
  quantity: number
  isCompleted: boolean
  specialInstructions?: string
}

interface KitchenOrder {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  status: 'accepted' | 'preparing' | 'ready'
  orderTime: string
  isPreOrder: boolean
  scheduledFor: string | null
  items: OrderItem[]
  total: number
  createdAt: string
}

// Mock data for kitchen orders with different states (expanded for swipe testing)
const mockKitchenOrders: KitchenOrder[] = [
  {
    id: "1",
    orderNumber: "ORDER-001",
    customerName: "Jane Doe",
    customerPhone: "+1 416 555 1234",
    status: "accepted",
    orderTime: "12:30",
    isPreOrder: false,
    scheduledFor: null,
    items: [
      { id: "1", name: "Classic Burger", quantity: 1, isCompleted: false, specialInstructions: "No onions" },
      { id: "2", name: "French Fries", quantity: 1, isCompleted: false },
      { id: "3", name: "Coca Cola", quantity: 1, isCompleted: false }
    ],
    total: 25.50,
    createdAt: "2025-01-31T12:30:00Z"
  },
  {
    id: "4",
    orderNumber: "PRE-004",
    customerName: "David Brown",
    customerPhone: "+1 416 234 5678", 
    status: "accepted",
    orderTime: "12:35",
    isPreOrder: true,
    scheduledFor: "2025-01-31T16:30:00Z", // 4 hours later
    items: [
      { id: "10", name: "BBQ Ribs", quantity: 2, isCompleted: false, specialInstructions: "Extra BBQ sauce" },
      { id: "11", name: "Coleslaw", quantity: 2, isCompleted: false },
      { id: "12", name: "Corn Bread", quantity: 4, isCompleted: false }
    ],
    total: 48.90,
    createdAt: "2025-01-31T12:35:00Z"
  }
]

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>(mockKitchenOrders)
  const [layoutType, setLayoutType] = useState<'masonry' | 'kanban'>('kanban')
  const [activeKanbanTab, setActiveKanbanTab] = useState<'accepted' | 'preparing' | 'ready' | 'scheduled'>('accepted')

  // Helper function to check if pre-order can start
  const canStartPreOrder = (order: KitchenOrder) => {
    if (!order.isPreOrder || !order.scheduledFor) return true
    const now = new Date()
    const scheduled = new Date(order.scheduledFor)
    return now >= scheduled
  }

  // Filter orders by status
  const acceptedOrders = orders.filter(order => order.status === 'accepted')
  const preparingOrders = orders.filter(order => order.status === 'preparing')
  const readyOrders = orders.filter(order => order.status === 'ready')
  const preOrders = orders.filter(order => order.isPreOrder)

  // Get status badge
  const getStatusBadge = (status: string, isPreOrder: boolean) => {
    if (isPreOrder) {
      return (
        <Badge variant="outline" className="text-yellow-800 border-yellow-500 bg-yellow-100 font-semibold">
          <Clock className="h-4 w-4 mr-1" />
          PRE-ORDER
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

  return (
    <AuthGuard requireAuth={true} requireRememberOrRecent={true} redirectTo="/login">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="w-full max-w-full overflow-x-hidden">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b">
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
                    <BreadcrumbPage>Kitchen Display</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          
          <div className="flex flex-1 flex-col w-full max-w-full overflow-x-hidden">
            {/* Header */}
            <div className="px-6 py-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold">Kitchen Display</h1>
                  <p className="text-muted-foreground">Monitor and manage orders</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={layoutType === 'kanban' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLayoutType('kanban')}
                  >
                    <Columns3 className="h-4 w-4 mr-2" />
                    Kanban
                  </Button>
                  <Button
                    variant={layoutType === 'masonry' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLayoutType('masonry')}
                  >
                    <Grid3X3 className="h-4 w-4 mr-2" />
                    Cards
                  </Button>
                </div>
              </div>
            </div>

            {/* Status Overview */}
            <div className="px-6 pb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">{acceptedOrders.length}</div>
                    <div className="text-sm text-muted-foreground">To Prepare</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-orange-600">{preparingOrders.length}</div>
                    <div className="text-sm text-muted-foreground">In Progress</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">{readyOrders.length}</div>
                    <div className="text-sm text-muted-foreground">Ready</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-yellow-600">{preOrders.length}</div>
                    <div className="text-sm text-muted-foreground">Pre-Orders</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 px-6 py-6">
              {layoutType === 'kanban' ? (
                <div>
                  {/* Tablet Tabs */}
                  <div className="block lg:hidden mb-6">
                    <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                      <button
                        onClick={() => setActiveKanbanTab('accepted')}
                        className={`flex-1 flex items-center justify-center px-2 py-2 rounded-md text-xs font-medium transition-all ${
                          activeKanbanTab === 'accepted'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Prep ({acceptedOrders.length})
                      </button>
                      <button
                        onClick={() => setActiveKanbanTab('preparing')}
                        className={`flex-1 flex items-center justify-center px-2 py-2 rounded-md text-xs font-medium transition-all ${
                          activeKanbanTab === 'preparing'
                            ? 'bg-orange-600 text-white'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <ChefHat className="h-3 w-3 mr-1" />
                        Cook ({preparingOrders.length})
                      </button>
                      <button
                        onClick={() => setActiveKanbanTab('ready')}
                        className={`flex-1 flex items-center justify-center px-2 py-2 rounded-md text-xs font-medium transition-all ${
                          activeKanbanTab === 'ready'
                            ? 'bg-green-600 text-white'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Ready ({readyOrders.length})
                      </button>
                    </div>
                  </div>

                  {/* Desktop Columns */}
                  <div className="hidden lg:grid lg:grid-cols-3 gap-6">
                    <div>
                      <h3 className="font-semibold mb-4">To Prepare</h3>
                      <div className="space-y-4">
                        {acceptedOrders.map((order) => (
                          <Card key={order.id}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div className="font-medium">{order.orderNumber}</div>
                                {getStatusBadge(order.status, order.isPreOrder)}
                              </div>
                              <div className="text-sm text-muted-foreground">{order.customerName}</div>
                              <div className="mt-2 font-bold">${order.total.toFixed(2)}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-4">In Progress</h3>
                      <div className="space-y-4">
                        {preparingOrders.map((order) => (
                          <Card key={order.id}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div className="font-medium">{order.orderNumber}</div>
                                {getStatusBadge(order.status, order.isPreOrder)}
                              </div>
                              <div className="text-sm text-muted-foreground">{order.customerName}</div>
                              <div className="mt-2 font-bold">${order.total.toFixed(2)}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-4">Ready</h3>
                      <div className="space-y-4">
                        {readyOrders.map((order) => (
                          <Card key={order.id}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div className="font-medium">{order.orderNumber}</div>
                                {getStatusBadge(order.status, order.isPreOrder)}
                              </div>
                              <div className="text-sm text-muted-foreground">{order.customerName}</div>
                              <div className="mt-2 font-bold">${order.total.toFixed(2)}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Tablet Single Column */}
                  <div className="block lg:hidden">
                    {activeKanbanTab === 'accepted' && (
                      <div className="space-y-4">
                        {acceptedOrders.map((order) => (
                          <Card key={order.id}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div className="font-medium">{order.orderNumber}</div>
                                {getStatusBadge(order.status, order.isPreOrder)}
                              </div>
                              <div className="text-sm text-muted-foreground">{order.customerName}</div>
                              <div className="mt-2 font-bold">${order.total.toFixed(2)}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                    
                    {activeKanbanTab === 'preparing' && (
                      <div className="space-y-4">
                        {preparingOrders.map((order) => (
                          <Card key={order.id}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div className="font-medium">{order.orderNumber}</div>
                                {getStatusBadge(order.status, order.isPreOrder)}
                              </div>
                              <div className="text-sm text-muted-foreground">{order.customerName}</div>
                              <div className="mt-2 font-bold">${order.total.toFixed(2)}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                    
                    {activeKanbanTab === 'ready' && (
                      <div className="space-y-4">
                        {readyOrders.map((order) => (
                          <Card key={order.id}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div className="font-medium">{order.orderNumber}</div>
                                {getStatusBadge(order.status, order.isPreOrder)}
                              </div>
                              <div className="text-sm text-muted-foreground">{order.customerName}</div>
                              <div className="mt-2 font-bold">${order.total.toFixed(2)}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
                  {orders.map((order) => (
                    <Card key={order.id} className="mb-6 break-inside-avoid">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium">{order.orderNumber}</div>
                          {getStatusBadge(order.status, order.isPreOrder)}
                        </div>
                        <div className="text-sm text-muted-foreground">{order.customerName}</div>
                        <div className="mt-2 font-bold">${order.total.toFixed(2)}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}