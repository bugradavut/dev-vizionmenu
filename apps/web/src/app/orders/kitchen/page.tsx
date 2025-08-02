"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
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
import { Input } from "@/components/ui/input"
import { Clock, ChefHat, CheckCircle2, ChevronDown, ChevronUp, Columns, Table, AlertCircle, Search, X } from "lucide-react"

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
    id: "2", 
    orderNumber: "ORDER-002",
    customerName: "Mike Johnson",
    customerPhone: "+1 647 987 6543",
    status: "preparing",
    orderTime: "12:25",
    isPreOrder: false,
    scheduledFor: null,
    items: [
      { id: "4", name: "Margherita Pizza", quantity: 1, isCompleted: true },
      { id: "5", name: "Caesar Salad", quantity: 1, isCompleted: false }
    ],
    total: 18.75,
    createdAt: "2025-01-31T12:25:00Z"
  },
  {
    id: "3",
    orderNumber: "ORDER-003", 
    customerName: "Sarah Wilson",
    customerPhone: "+1 905 456 7890",
    status: "ready",
    orderTime: "12:20",
    isPreOrder: false,
    scheduledFor: null,
    items: [
      { id: "6", name: "Grilled Chicken", quantity: 2, isCompleted: true, specialInstructions: "Medium well, no spices" },
      { id: "7", name: "Rice Pilaf", quantity: 2, isCompleted: true },
      { id: "8", name: "Mixed Vegetables", quantity: 2, isCompleted: true },
      { id: "9", name: "Caesar Salad", quantity: 1, isCompleted: true, specialInstructions: "Dressing on the side" },
      { id: "10a", name: "Garlic Bread", quantity: 4, isCompleted: true },
      { id: "11a", name: "Chicken Wings", quantity: 8, isCompleted: true, specialInstructions: "Extra hot sauce" },
      { id: "12a", name: "Mozzarella Sticks", quantity: 6, isCompleted: true },
      { id: "13a", name: "Onion Rings", quantity: 1, isCompleted: true },
      { id: "14a", name: "Sweet Potato Fries", quantity: 2, isCompleted: true },
      { id: "15a", name: "Coca Cola", quantity: 3, isCompleted: true },
      { id: "16a", name: "Lemonade", quantity: 2, isCompleted: true },
      { id: "17a", name: "Iced Tea", quantity: 1, isCompleted: true }
    ],
    total: 78.90,
    createdAt: "2025-01-31T12:20:00Z"
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
  },
  {
    id: "5",
    orderNumber: "ORDER-005",
    customerName: "Lisa Martinez",
    customerPhone: "+1 647 345 6789",
    status: "accepted", 
    orderTime: "12:38",
    isPreOrder: false,
    scheduledFor: null,
    items: [
      { id: "13", name: "Fish & Chips", quantity: 1, isCompleted: false },
      { id: "14", name: "Tartar Sauce", quantity: 1, isCompleted: false }
    ],
    total: 16.50,
    createdAt: "2025-01-31T12:38:00Z"
  },
  {
    id: "6",
    orderNumber: "ORDER-006",
    customerName: "Robert Johnson",
    customerPhone: "+1 416 789 1234",
    status: "preparing",
    orderTime: "12:42",
    isPreOrder: false,
    scheduledFor: null,
    items: [
      { id: "15", name: "Large Pizza Margherita", quantity: 2, isCompleted: true, specialInstructions: "Extra cheese, no oregano" },
      { id: "16", name: "Caesar Salad", quantity: 3, isCompleted: false, specialInstructions: "Dressing on the side" },
      { id: "17", name: "Garlic Bread", quantity: 4, isCompleted: false },
      { id: "18", name: "Buffalo Wings", quantity: 1, isCompleted: false, specialInstructions: "Extra spicy" },
      { id: "19", name: "Coca Cola", quantity: 6, isCompleted: false },
      { id: "20", name: "Orange Juice", quantity: 2, isCompleted: false },
      { id: "21", name: "Chocolate Cake", quantity: 1, isCompleted: false, specialInstructions: "Birthday cake - add candles" },
      { id: "22", name: "Tiramisu", quantity: 2, isCompleted: false }
    ],
    total: 145.75,
    createdAt: "2025-01-31T12:42:00Z"
  }
]


export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>(mockKitchenOrders)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [displayedOrderIds, setDisplayedOrderIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [viewType, setViewType] = useState<'kanban' | 'table'>('kanban')
  const [searchQuery, setSearchQuery] = useState("")
  // Removed activeTab - now showing unified view of all orders

  // Infinite scroll configuration (for regular orders only)
  const ordersPerLoad = 12 // Load 12 orders at a time

  // Separate pre-orders from regular orders - memoized to prevent re-creation
  const preOrders = useMemo(() => orders.filter(order => order.isPreOrder), [orders])
  const regularOrders = useMemo(() => orders.filter(order => !order.isPreOrder), [orders])
  
  // Unified view showing all orders (regular + pre-orders) with smart sorting
  const sortedCurrentOrders = useMemo(() => {
    const allOrders = [...regularOrders, ...preOrders] // Always show both types
    
    return allOrders.sort((a, b) => {
      // Pre-orders come first (so staff sees them as reminders)
      if (a.isPreOrder && !b.isPreOrder) return -1
      if (!a.isPreOrder && b.isPreOrder) return 1
      
      // Within same type, sort by order number
      const aNum = parseInt(a.orderNumber.split('-')[1]) || 0
      const bNum = parseInt(b.orderNumber.split('-')[1]) || 0
      return aNum - bNum
    })
  }, [regularOrders, preOrders])
  
  // All orders for display
  const currentOrdersForDisplay = [...regularOrders, ...preOrders]
  
  // Get displayed orders by finding them in the current sorted list
  const displayedOrders = useMemo(() => {
    let orders = displayedOrderIds.map(id => sortedCurrentOrders.find(order => order.id === id)).filter(Boolean) as KitchenOrder[]
    
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
  }, [displayedOrderIds, sortedCurrentOrders, searchQuery])

  // Initialize with first batch based on unified view
  useEffect(() => {
    const initialOrders = sortedCurrentOrders.slice(0, ordersPerLoad)
    setDisplayedOrderIds(initialOrders.map(order => order.id))
    setHasMore(sortedCurrentOrders.length > ordersPerLoad)
  }, [ordersPerLoad, sortedCurrentOrders])

  // Load more orders function
  const loadMoreOrders = useCallback(() => {
    if (loading || !hasMore) return

    setLoading(true)
    
    // Simulate API delay (remove in real implementation)
    setTimeout(() => {
      const currentLength = displayedOrderIds.length
      const nextOrders = sortedCurrentOrders.slice(currentLength, currentLength + ordersPerLoad)
      
      if (nextOrders.length > 0) {
        setDisplayedOrderIds(prev => [...prev, ...nextOrders.map(order => order.id)])
        setHasMore(currentLength + nextOrders.length < sortedCurrentOrders.length)
      } else {
        setHasMore(false)
      }
      
      setLoading(false)
    }, 500) // 500ms delay for smooth UX
  }, [loading, hasMore, displayedOrderIds.length, ordersPerLoad, sortedCurrentOrders])

  // Infinite scroll detection
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      
      // Load more when user is 300px from bottom
      if (scrollTop + windowHeight >= documentHeight - 300) {
        loadMoreOrders()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadMoreOrders])

  // Calculate remaining time for pre-orders
  const getRemainingTime = (scheduledFor: string) => {
    const now = new Date()
    const scheduled = new Date(scheduledFor)
    const diffMs = scheduled.getTime() - now.getTime()
    
    if (diffMs <= 0) return "Ready to start"
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    return `${hours}h ${minutes}m left`
  }

  // Toggle item completion
  const toggleItemCompletion = (orderId: string, itemId: string) => {
    const updateOrder = (order: KitchenOrder) => 
      order.id === orderId
        ? {
            ...order,
            items: order.items.map(item =>
              item.id === itemId
                ? { ...item, isCompleted: !item.isCompleted }
                : item
            )
          }
        : order

    // Update orders (displayedOrders will update automatically via useMemo)
    setOrders(prevOrders => prevOrders.map(updateOrder))
  }

  // Change order status
  const changeOrderStatus = (orderId: string, newStatus: 'accepted' | 'preparing' | 'ready' | 'completed') => {
    if (newStatus === 'completed') {
      // Remove completed orders from kitchen display
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId))
      setDisplayedOrderIds(prevIds => prevIds.filter(id => id !== orderId))
    } else {
      const updateOrder = (order: KitchenOrder) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      
      setOrders(prevOrders => prevOrders.map(updateOrder))
      // displayedOrders will update automatically via useMemo
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

  // Get action button for order status
  const getActionButton = (order: KitchenOrder, isTableView = false) => {
    const canStart = canStartPreOrder(order)
    const baseClasses = isTableView 
      ? "px-3 py-2 text-xs font-medium min-w-[100px] justify-center"
      : "px-4 py-1.5 text-xs font-medium"
    
    switch (order.status) {
      case 'accepted':
        if (order.isPreOrder && !canStart) {
          return (
            <Button disabled className={`${baseClasses} text-gray-500`}>
              <Clock className="h-3 w-3 mr-1" />
              {isTableView ? "Scheduled" : "Scheduled"}
            </Button>
          )
        }
        return (
          <Button 
            onClick={() => changeOrderStatus(order.id, 'preparing')} 
            className={`${baseClasses} hover:bg-primary/90`}
          >
            Start Prep
          </Button>
        )
      case 'preparing':
        const allItemsCompleted = order.items.every(item => item.isCompleted)
        return (
          <Button 
            onClick={() => changeOrderStatus(order.id, 'ready')} 
            disabled={!allItemsCompleted}
            className={`${baseClasses} bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed`}
          >
            Mark Ready
          </Button>
        )
      case 'ready':
        return (
          <div className={`text-center ${isTableView ? 'flex justify-center' : ''}`}>
            <div className={`px-4 py-2 text-xs font-medium text-green-600 border border-green-300 bg-green-50 rounded-md ${
              isTableView ? 'min-w-[100px]' : ''
            }`}>
              Ready
            </div>
          </div>
        )
      default:
        return null
    }
  }

  // Filter displayed orders by status (for overview cards)
  const acceptedOrders = displayedOrders.filter(order => order.status === 'accepted')
  const preparingOrders = displayedOrders.filter(order => order.status === 'preparing')
  const readyOrders = displayedOrders.filter(order => order.status === 'ready')

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
                    <BreadcrumbPage>Kitchen Display</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          
          <div className="flex flex-1 flex-col px-2 sm:px-4 lg:px-6">
            {/* Header Section */}
            <div className="px-2 py-6 sm:px-4 lg:px-6 bg-background">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  <h1 className="text-3xl font-bold tracking-tight">Kitchen Display</h1>
                  <p className="text-muted-foreground mt-2 text-lg">
                    Monitor and manage orders for kitchen preparation
                  </p>
                </div>
                <div className="lg:col-span-4 flex items-center justify-end">
                  {/* View Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">View:</span>
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

            {/* Search Bar - Above Status Cards */}
            <div className="px-2 pb-4 sm:px-4 lg:px-6">
              <div className="flex justify-end">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders, customer"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10 w-80"
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

            {/* Status Overview Cards */}
            <div className="px-2 pb-6 sm:px-4 lg:px-6">
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xl sm:text-2xl font-bold text-blue-600">{acceptedOrders.length}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">To Prepare</div>
                      </div>
                      <div className="bg-blue-100 p-1.5 sm:p-2 rounded-full">
                        <ChefHat className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-orange-500">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xl sm:text-2xl font-bold text-orange-600">{preparingOrders.length}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">In Progress</div>
                      </div>
                      <div className="bg-orange-100 p-1.5 sm:p-2 rounded-full">
                        <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-green-500">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xl sm:text-2xl font-bold text-green-600">{readyOrders.length}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">Ready</div>
                      </div>
                      <div className="bg-green-100 p-1.5 sm:p-2 rounded-full">
                        <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-yellow-500">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xl sm:text-2xl font-bold text-yellow-600">{preOrders.length}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">Pre-Orders</div>
                      </div>
                      <div className="bg-yellow-100 p-1.5 sm:p-2 rounded-full">
                        <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Orders Layout - Kanban and Table Views Only */}
            <div className="flex-1 px-2 py-8 sm:px-4 lg:px-6">
              {viewType === 'kanban' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* To Prepare Column */}
                  <div className="bg-gray-50/50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">TO PREPARE</h3>
                      </div>
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                        {acceptedOrders.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {acceptedOrders.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          <p className="text-sm">No orders to prepare</p>
                        </div>
                      ) : (
                        acceptedOrders.map((order) => (
                          <div key={order.id}>
                            <Card className={`hover:shadow-lg transition-all duration-200 ${
                              order.isPreOrder 
                                ? 'bg-yellow-50 border-yellow-200 border-2' 
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
                              
                              {/* Order Items with Checkboxes */}
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
                                            <Checkbox
                                              id={`kanban-item-${item.id}`}
                                              checked={item.isCompleted}
                                              disabled={order.status === 'accepted' || order.status === 'ready'}
                                              onCheckedChange={() => toggleItemCompletion(order.id, item.id)}
                                              className="mt-0.5 data-[state=checked]:bg-green-600"
                                            />
                                            <label 
                                              htmlFor={`kanban-item-${item.id}`}
                                              className={`flex-1 text-xs ${
                                                order.status === 'accepted' || order.status === 'ready' 
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
                                                Show Less
                                              </>
                                            ) : (
                                              <>
                                                <ChevronDown className="h-3 w-3 mr-1" />
                                                +{hiddenItemsCount} More
                                              </>
                                            )}
                                          </button>
                                        )}
                                      </>
                                    )
                                  })()}
                                </div>
                              </div>
                              
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

                  {/* In Progress Column */}
                  <div className="bg-gray-50/50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">IN PROGRESS</h3>
                      </div>
                      <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
                        {preparingOrders.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {preparingOrders.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          <p className="text-sm">No orders in progress</p>
                        </div>
                      ) : (
                        preparingOrders.map((order) => (
                          <div key={order.id}>
                            <Card className={`hover:shadow-lg transition-all duration-200 ${
                              order.isPreOrder 
                                ? 'bg-yellow-50 border-yellow-200 border-2' 
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
                              
                              {/* Order Items with Checkboxes */}
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
                                            <Checkbox
                                              id={`kanban-prep-item-${item.id}`}
                                              checked={item.isCompleted}
                                              disabled={order.status === 'accepted' || order.status === 'ready'}
                                              onCheckedChange={() => toggleItemCompletion(order.id, item.id)}
                                              className="mt-0.5 data-[state=checked]:bg-green-600"
                                            />
                                            <label 
                                              htmlFor={`kanban-prep-item-${item.id}`}
                                              className={`flex-1 text-xs ${
                                                order.status === 'accepted' || order.status === 'ready' 
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
                                                Show Less
                                              </>
                                            ) : (
                                              <>
                                                <ChevronDown className="h-3 w-3 mr-1" />
                                                +{hiddenItemsCount} More
                                              </>
                                            )}
                                          </button>
                                        )}
                                      </>
                                    )
                                  })()}
                                </div>
                              </div>
                              
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

                  {/* Ready Column */}
                  <div className="bg-gray-50/50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">READY</h3>
                      </div>
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                        {readyOrders.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {readyOrders.map((order) => (
                        <div key={order.id}>
                          <Card className={`hover:shadow-lg transition-all duration-200 ${
                            order.isPreOrder 
                              ? 'bg-yellow-50 border-yellow-200 border-2' 
                              : ''
                          }`}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <div className="text-sm font-bold">{order.orderNumber}</div>
                                  <div className="text-xs text-muted-foreground">{order.orderTime} - {order.customerName}</div>
                                </div>
                                {getStatusBadge(order.status, order.isPreOrder)}
                              </div>
                              <div className="text-sm mb-3">
                                All items completed • ${order.total.toFixed(2)}
                              </div>
                              {getActionButton(order)}
                            </CardContent>
                          </Card>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pre-Orders Column */}
                  <div className="bg-yellow-50/80 rounded-lg p-4 border border-yellow-300/60">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <h3 className="font-semibold text-yellow-900 text-sm uppercase tracking-wide">PRE-ORDERS</h3>
                      </div>
                      <span className="bg-yellow-200 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                        {preOrders.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {preOrders.length === 0 ? (
                        <div className="text-center py-8 text-yellow-600">
                          <p className="text-sm">No pre-orders</p>
                        </div>
                      ) : (
                        preOrders.map((order) => (
                          <div key={order.id}>
                            <Card className="bg-yellow-50 border-yellow-200 border-2 hover:shadow-lg transition-all duration-200">
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
                <div className="w-full max-w-full">
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse" style={{ minWidth: '800px' }}>
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-28">Status</th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-32">Order</th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-40">Customer</th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-20">Time</th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-24">Items</th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide w-24">Total</th>
                          <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide w-32">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {displayedOrders.map((order) => (
                          <React.Fragment key={order.id}>
                            <tr className={`transition-colors duration-150 hover:bg-gray-50 ${
                              order.isPreOrder ? 'bg-yellow-50 hover:bg-yellow-100' : ''
                            }`}>
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
                                  </div>
                                  <button
                                    onClick={() => toggleOrderExpansion(order.id)}
                                    className="ml-2 text-gray-400 hover:text-gray-600"
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
                                <div className="text-sm text-gray-900">{order.items.length} items</div>
                                {order.status === 'preparing' && (
                                  <div className="text-xs text-orange-600">
                                    {order.items.filter(item => item.isCompleted).length}/{order.items.length} completed
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
                              <tr key={`${order.id}-expanded`} className={`border-t-0 ${order.isPreOrder ? 'bg-yellow-50/50' : 'bg-gray-50/50'}`}>
                                <td colSpan={7} className="px-6 py-6">
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="text-sm font-semibold text-gray-900">Order Items</h4>
                                      {order.status === 'preparing' && (
                                        <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                                          {order.items.filter(item => item.isCompleted).length} of {order.items.length} completed
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
                                            disabled={order.status === 'accepted' || order.status === 'ready'}
                                            onCheckedChange={() => toggleItemCompletion(order.id, item.id)}
                                            className="mt-0.5 data-[state=checked]:bg-green-600"
                                          />
                                          <label 
                                            htmlFor={`table-item-${item.id}`}
                                            className={`flex-1 text-sm ${
                                              order.status === 'accepted' || order.status === 'ready' 
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
                                    
                                    {/* Order level special instructions */}
                                    {order.items.some(item => item.specialInstructions) && (
                                      <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                        <div className="flex items-center gap-2 text-orange-700 text-sm font-medium mb-2">
                                          <AlertCircle className="h-4 w-4" />
                                          Special Instructions Summary
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
                </div>
              )}

              
              {/* Loading Indicator */}
              {loading && (
                <div className="flex justify-center items-center py-8">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="text-sm">Loading more orders...</span>
                  </div>
                </div>
              )}
              
              {/* End of Orders */}
              {!hasMore && displayedOrders.length > 0 && (
                <div className="text-center py-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    All orders loaded • {displayedOrders.length} total
                  </div>
                </div>
              )}
              
              {/* No Orders State */}
              {displayedOrders.length === 0 && !loading && (
                <div className="text-center py-12">
                  <ChefHat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground">
                    No Orders
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Kitchen is all caught up! 🎉
                  </p>
                </div>
              )}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}