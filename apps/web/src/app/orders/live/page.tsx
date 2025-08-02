"use client"

import { useState, useEffect } from "react"
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
import { Input } from "@/components/ui/input"
import { Table2, LayoutGrid, ArrowRight, Search, X } from "lucide-react"
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
import { getSourceIcon } from "@/assets/images"
import Image from "next/image"
import Link from "next/link"

// Mock data for testing
const mockOrders = [
  {
    id: "1",
    orderNumber: "ORDER-001",
    customerName: "John Doe",
    customerPhone: "+1 416 555 1234",
    source: "qr_code",
    status: "pending",
    total: 125.50,
    createdAt: "2025-01-26T10:30:00Z"
  },
  {
    id: "2", 
    orderNumber: "ORDER-002",
    customerName: "Jane Smith",
    customerPhone: "+1 647 987 6543",
    source: "uber_eats",
    status: "preparing",
    total: 89.75,
    createdAt: "2025-01-26T10:15:00Z"
  },
  {
    id: "3",
    orderNumber: "ORDER-003", 
    customerName: "Mike Johnson",
    customerPhone: "+1 905 456 7890",
    source: "phone",
    status: "ready",
    total: 156.25,
    createdAt: "2025-01-26T09:45:00Z"
  },
  {
    id: "4",
    orderNumber: "ORDER-004", 
    customerName: "Sarah Wilson",
    customerPhone: "+1 416 234 5678",
    source: "web",
    status: "preparing",
    total: 78.90,
    createdAt: "2025-01-26T09:30:00Z"
  },
  {
    id: "5",
    orderNumber: "ORDER-005", 
    customerName: "David Brown",
    customerPhone: "+1 647 345 6789",
    source: "doordash",
    status: "pending",
    total: 203.75,
    createdAt: "2025-01-26T09:20:00Z"
  }
]

type ViewMode = 'table' | 'card'

export default function LiveOrdersPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState("")

  // Load saved view mode from localStorage on component mount
  useEffect(() => {
    const savedViewMode = localStorage.getItem('liveOrdersViewMode') as ViewMode
    if (savedViewMode && (savedViewMode === 'table' || savedViewMode === 'card')) {
      setViewMode(savedViewMode)
    }
  }, [])

  // Save view mode to localStorage when it changes
  const handleViewModeChange = (newViewMode: ViewMode) => {
    setViewMode(newViewMode)
    localStorage.setItem('liveOrdersViewMode', newViewMode)
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
      completed: "default"
    }
    
    const colors: Record<string, string> = {
      pending: "text-orange-700 border-orange-300 bg-orange-100",
      preparing: "text-blue-700 border-blue-300 bg-blue-100",
      ready: "text-green-700 border-green-400 bg-green-100",
      completed: "text-gray-600 border-gray-200 bg-gray-50"
    }

    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getFilteredOrders = () => {
    let orders = mockOrders
    
    // Apply status filter
    if (statusFilter !== 'all') {
      orders = orders.filter(order => order.status === statusFilter)
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      orders = orders.filter(order => 
        order.orderNumber.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        order.customerPhone.toLowerCase().includes(query)
      )
    }
    
    return orders
  }

  const renderFilterButtons = () => (
    <div className="flex items-center justify-between mb-6">
      {/* Filter Buttons - Left Side */}
      <div className="flex items-center gap-2">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
          className="h-9 text-sm"
        >
          All
        </Button>
        <Button
          variant={statusFilter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('pending')}
          className="h-9 text-sm"
        >
          New Orders
        </Button>
        <Button
          variant={statusFilter === 'preparing' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('preparing')}
          className="h-9 text-sm"
        >
          Preparing
        </Button>
        <Button
          variant={statusFilter === 'ready' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('ready')}
          className="h-9 text-sm"
        >
          Ready
        </Button>
      </div>
      
      {/* Search Bar - Right Side */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search orders, customer, phone"
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
  )

  const renderTableView = () => (
    <div className="space-y-4">
      {renderFilterButtons()}
      <div className="rounded-md border">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">Channel</TableHead>
            <TableHead className="w-[120px]">Order</TableHead>
            <TableHead className="w-[200px]">Customer</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[90px]">Total</TableHead>
            <TableHead className="w-[80px]">Time</TableHead>
            <TableHead className="w-[70px] text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {getFilteredOrders().map((order) => (
            <TableRow key={order.id} className="hover:bg-gray-50 transition-colors">
              <TableCell>
                {renderSourceIcon(order.source)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{order.orderNumber}</TableCell>
              <TableCell>
                <div>
                  <div className="text-sm text-foreground font-medium">{order.customerName}</div>
                  <div className="text-sm text-muted-foreground">{order.customerPhone}</div>
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(order.status)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">${order.total.toFixed(2)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(order.createdAt).toLocaleTimeString('tr-TR', { 
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
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  )


  const renderCardView = () => (
    <div className="space-y-4">
      {renderFilterButtons()}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {getFilteredOrders().map((order) => (
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
                    <div className="text-sm font-medium text-foreground">{order.customerName}</div>
                    <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-foreground">{order.orderNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleTimeString('tr-TR', { 
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
                  ${order.total.toFixed(2)}
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
    </div>
  )

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
                    <BreadcrumbPage>Live Orders</BreadcrumbPage>
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
                  <h1 className="text-3xl font-bold tracking-tight">Live Orders</h1>
                  <p className="text-muted-foreground mt-2 text-lg">
                    Monitor and manage active orders in real-time
                  </p>
                </div>
                <div className="lg:col-span-4 flex items-center justify-end">
                  {/* View Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">View:</span>
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
      </SidebarProvider>
    </AuthGuard>
  )
}