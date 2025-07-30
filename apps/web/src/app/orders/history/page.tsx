"use client"

import { useState, useEffect } from "react"
import { type DateRange } from "react-day-picker"
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
import { Table2, LayoutGrid, ArrowRight, CalendarIcon, ArrowUpDown } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import Calendar04 from "@/components/ui/calendar-04"
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

// Mock data for testing - completed and cancelled orders with various dates
const mockOrders = [
  // Today's orders
  {
    id: "1",
    orderNumber: "ORDER-001",
    customerName: "John Doe",
    customerPhone: "+1 416 555 1234",
    source: "qr_code",
    status: "completed",
    total: 125.50,
    createdAt: "2025-01-30T10:30:00Z",
    completedAt: "2025-01-30T11:15:00Z"
  },
  {
    id: "2", 
    orderNumber: "ORDER-002",
    customerName: "Jane Smith",
    customerPhone: "+1 647 987 6543",
    source: "uber_eats",
    status: "completed",
    total: 89.75,
    createdAt: "2025-01-30T08:15:00Z",
    completedAt: "2025-01-30T09:00:00Z"
  },
  
  // Yesterday's orders
  {
    id: "3",
    orderNumber: "ORDER-003", 
    customerName: "Mike Johnson",
    customerPhone: "+1 905 456 7890",
    source: "phone",
    status: "cancelled",
    total: 156.25,
    createdAt: "2025-01-29T19:45:00Z",
    cancelledAt: "2025-01-29T19:50:00Z"
  },
  {
    id: "4",
    orderNumber: "ORDER-004", 
    customerName: "Sarah Wilson",
    customerPhone: "+1 416 234 5678",
    source: "web",
    status: "completed",
    total: 78.90,
    createdAt: "2025-01-29T12:30:00Z",
    completedAt: "2025-01-29T13:15:00Z"
  },
  
  // Last week (7 days ago)
  {
    id: "5",
    orderNumber: "ORDER-005", 
    customerName: "David Brown",
    customerPhone: "+1 647 345 6789",
    source: "doordash",
    status: "completed",
    total: 203.75,
    createdAt: "2025-01-23T16:20:00Z",
    completedAt: "2025-01-23T17:05:00Z"
  },
  {
    id: "6",
    orderNumber: "ORDER-006", 
    customerName: "Lisa Garcia",
    customerPhone: "+1 416 789 0123",
    source: "qr_code",
    status: "cancelled",
    total: 95.40,
    createdAt: "2025-01-22T14:20:00Z",
    cancelledAt: "2025-01-22T14:25:00Z"
  },
  
  // 15 days ago
  {
    id: "7",
    orderNumber: "ORDER-007", 
    customerName: "Robert Chen",
    customerPhone: "+1 647 456 7890",
    source: "uber_eats",
    status: "completed",
    total: 167.25,
    createdAt: "2025-01-15T11:30:00Z",
    completedAt: "2025-01-15T12:15:00Z"
  },
  {
    id: "8",
    orderNumber: "ORDER-008", 
    customerName: "Amanda Taylor",
    customerPhone: "+1 905 234 5678",
    source: "web",
    status: "completed",
    total: 142.80,
    createdAt: "2025-01-14T18:45:00Z",
    completedAt: "2025-01-14T19:30:00Z"
  },
  
  // 30 days ago
  {
    id: "9",
    orderNumber: "ORDER-009", 
    customerName: "Kevin Martinez",
    customerPhone: "+1 416 567 8901",
    source: "phone",
    status: "completed",
    total: 88.50,
    createdAt: "2024-12-31T20:15:00Z",
    completedAt: "2024-12-31T21:00:00Z"
  },
  {
    id: "10",
    orderNumber: "ORDER-010", 
    customerName: "Emily Davis",
    customerPhone: "+1 647 890 1234",
    source: "doordash",
    status: "cancelled",
    total: 234.90,
    createdAt: "2024-12-30T13:20:00Z",
    cancelledAt: "2024-12-30T13:25:00Z"
  },
  
  // Last month (December 2024)
  {
    id: "11",
    orderNumber: "ORDER-011", 
    customerName: "James Wilson",
    customerPhone: "+1 905 345 6789",
    source: "qr_code",
    status: "completed",
    total: 156.75,
    createdAt: "2024-12-15T16:30:00Z",
    completedAt: "2024-12-15T17:15:00Z"
  },
  {
    id: "12",
    orderNumber: "ORDER-012", 
    customerName: "Sophie Anderson",
    customerPhone: "+1 416 678 9012",
    source: "web",
    status: "completed",
    total: 198.40,
    createdAt: "2024-12-10T19:45:00Z",
    completedAt: "2024-12-10T20:30:00Z"
  }
]

type ViewMode = 'table' | 'card'

export default function OrderHistoryPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')

  // Load saved view mode from localStorage on component mount
  useEffect(() => {
    const savedViewMode = localStorage.getItem('orderHistoryViewMode') as ViewMode
    if (savedViewMode && (savedViewMode === 'table' || savedViewMode === 'card')) {
      setViewMode(savedViewMode)
    }
  }, [])

  // Save view mode to localStorage when it changes
  const handleViewModeChange = (newViewMode: ViewMode) => {
    setViewMode(newViewMode)
    localStorage.setItem('orderHistoryViewMode', newViewMode)
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
      completed: "text-green-700 border-green-300 bg-green-100",
      cancelled: "text-red-700 border-red-300 bg-red-100"
    }

    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getFilteredOrders = () => {
    let filtered = mockOrders

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    // Filter by date range
    if (dateRange?.from) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.createdAt)
        const fromDate = new Date(dateRange.from!)
        const toDate = dateRange.to ? new Date(dateRange.to) : new Date()
        
        // Set time to start/end of day for proper comparison
        fromDate.setHours(0, 0, 0, 0)
        toDate.setHours(23, 59, 59, 999)
        
        return orderDate >= fromDate && orderDate <= toDate
      })
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt)
      const dateB = new Date(b.createdAt)
      return sortOrder === 'newest' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime()
    })

    return filtered
  }

  const formatDateRange = () => {
    if (!dateRange?.from) return "Date Range"
    
    const fromDate = dateRange.from.toLocaleDateString('en-CA', { 
      month: 'short', 
      day: 'numeric' 
    })
    
    if (!dateRange.to) {
      return `${fromDate} - ...`
    }
    
    const toDate = dateRange.to.toLocaleDateString('en-CA', { 
      month: 'short', 
      day: 'numeric' 
    })
    
    return `${fromDate} - ${toDate}`
  }

  const setQuickDateRange = (days: number) => {
    const today = new Date()
    const startDate = new Date()
    startDate.setDate(today.getDate() - days)
    
    setDateRange({
      from: startDate,
      to: today
    })
  }

  const setLastMonth = () => {
    const today = new Date()
    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
    
    setDateRange({
      from: firstDayLastMonth,
      to: lastDayLastMonth
    })
  }

  const renderFilterButtons = () => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
          className="h-9 text-sm"
        >
          All
        </Button>
        <Button
          variant={statusFilter === 'completed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('completed')}
          className="h-9 text-sm"
        >
          Completed
        </Button>
        <Button
          variant={statusFilter === 'cancelled' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('cancelled')}
          className="h-9 text-sm"
        >
          Cancelled
        </Button>
      </div>
      
      {/* Sort & Date Range */}
      <div className="flex flex-wrap items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 h-9 text-sm"
          onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
        >
          <ArrowUpDown className="h-4 w-4" />
          <span className="hidden sm:inline">{sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
          <span className="sm:hidden">{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</span>
        </Button>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-9 text-sm font-medium min-w-[140px] justify-between">
              {formatDateRange()}
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex flex-col">
            <div className="flex">
              {/* Quick Date Buttons */}
              <div className="flex flex-col gap-1 p-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="justify-start text-xs h-8"
                  onClick={() => setQuickDateRange(1)}
                >
                  Yesterday
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="justify-start text-xs h-8"
                  onClick={() => setQuickDateRange(7)}
                >
                  Last 7 Days
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="justify-start text-xs h-8"
                  onClick={() => setQuickDateRange(15)}
                >
                  Last 15 Days
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="justify-start text-xs h-8"
                  onClick={() => setQuickDateRange(30)}
                >
                  Last 30 Days
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="justify-start text-xs h-8"
                  onClick={setLastMonth}
                >
                  Last Month
                </Button>
              </div>
              
              {/* Calendar */}
              <Calendar04 selected={dateRange} onSelect={setDateRange} />
            </div>
            
            {/* Reset Range Button - Bottom */}
            <div className="border-t border-gray-200 p-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-center text-xs h-8 text-red-600 border-red-300 hover:text-red-700 hover:bg-red-50 hover:border-red-400"
                onClick={() => setDateRange(undefined)}
              >
                Reset Range
              </Button>
            </div>
          </div>
        </PopoverContent>
        </Popover>
      </div>
    </div>
  )

  const renderTableView = () => {
    const filteredOrders = getFilteredOrders()
    
    return (
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
              <TableHead className="w-[80px]">Completed</TableHead>
              <TableHead className="w-[70px] text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-muted-foreground">No orders found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Try adjusting your filters or date range
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
                      <div className="text-sm text-foreground font-medium">{order.customerName}</div>
                      <div className="text-sm text-muted-foreground">{order.customerPhone}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">${order.total.toFixed(2)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {order.status === 'completed' && order.completedAt && 
                      new Date(order.completedAt).toLocaleDateString('en-CA')
                    }
                    {order.status === 'cancelled' && order.cancelledAt && 
                      new Date(order.cancelledAt).toLocaleDateString('en-CA')
                    }
                  </TableCell>
                  <TableCell className="text-center">
                    <Link href={`/orders/${order.orderNumber}?context=history`}>
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
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center justify-center">
              <p className="text-lg text-muted-foreground">No orders found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your filters or date range
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-lg transition-all duration-200">
                <CardContent className="p-5">
                  {/* Header - Channel and Status */}
                  <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
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
                          {new Date(order.createdAt).toLocaleDateString('en-CA')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleTimeString('en-CA', { 
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
                    <Link href={`/orders/${order.orderNumber}?context=history`}>
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
                    <BreadcrumbPage>Order History</BreadcrumbPage>
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
                  <h1 className="text-3xl font-bold tracking-tight">Order History</h1>
                  <p className="text-muted-foreground mt-2 text-lg">
                    View completed and cancelled orders
                  </p>
                </div>
                <div className="lg:col-span-4 flex items-center justify-end">
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