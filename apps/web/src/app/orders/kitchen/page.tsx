"use client"

import { useState, useEffect, useCallback } from "react"
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
import { Clock, ChefHat, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react"

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
      { id: "6", name: "Grilled Chicken", quantity: 1, isCompleted: true },
      { id: "7", name: "Rice Pilaf", quantity: 1, isCompleted: true },
      { id: "8", name: "Mixed Vegetables", quantity: 1, isCompleted: true },
      { id: "9", name: "Lemonade", quantity: 1, isCompleted: true }
    ],
    total: 32.25,
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
  },
  {
    id: "7",
    orderNumber: "ORDER-007",
    customerName: "Emily Davis",
    customerPhone: "+1 416 555 7890",
    status: "accepted",
    orderTime: "12:45",
    isPreOrder: false,
    scheduledFor: null,
    items: [
      { id: "23", name: "Chicken Wings", quantity: 12, isCompleted: false, specialInstructions: "Extra hot sauce" },
      { id: "24", name: "Blue Cheese Dip", quantity: 2, isCompleted: false },
      { id: "25", name: "Celery Sticks", quantity: 1, isCompleted: false }
    ],
    total: 28.50,
    createdAt: "2025-01-31T12:45:00Z"
  },
  {
    id: "8",
    orderNumber: "ORDER-008",
    customerName: "Tom Wilson",
    customerPhone: "+1 647 123 4567",
    status: "preparing",
    orderTime: "12:47",
    isPreOrder: false,
    scheduledFor: null,
    items: [
      { id: "26", name: "Beef Burger", quantity: 1, isCompleted: true, specialInstructions: "Medium rare" },
      { id: "27", name: "Sweet Potato Fries", quantity: 1, isCompleted: false }
    ],
    total: 22.75,
    createdAt: "2025-01-31T12:47:00Z"
  },
  {
    id: "9",
    orderNumber: "ORDER-009",
    customerName: "Anna Martinez",
    customerPhone: "+1 905 987 6543",
    status: "ready",
    orderTime: "12:50",
    isPreOrder: false,
    scheduledFor: null,
    items: [
      { id: "28", name: "Vegetarian Pizza", quantity: 1, isCompleted: true },
      { id: "29", name: "Garden Salad", quantity: 1, isCompleted: true },
      { id: "30", name: "Sparkling Water", quantity: 2, isCompleted: true }
    ],
    total: 26.00,
    createdAt: "2025-01-31T12:50:00Z"
  },
  {
    id: "10",
    orderNumber: "ORDER-010",
    customerName: "James Brown",
    customerPhone: "+1 416 789 0123",
    status: "accepted",
    orderTime: "12:52",
    isPreOrder: false,
    scheduledFor: null,
    items: [
      { id: "31", name: "Steak Dinner", quantity: 1, isCompleted: false, specialInstructions: "Well done, no mushrooms" },
      { id: "32", name: "Mashed Potatoes", quantity: 1, isCompleted: false },
      { id: "33", name: "Steamed Broccoli", quantity: 1, isCompleted: false },
      { id: "34", name: "Red Wine", quantity: 1, isCompleted: false }
    ],
    total: 45.00,
    createdAt: "2025-01-31T12:52:00Z"
  },
  {
    id: "11",
    orderNumber: "ORDER-011",
    customerName: "Sophie Clark",
    customerPhone: "+1 647 456 7890",
    status: "preparing",
    orderTime: "12:55",
    isPreOrder: false,
    scheduledFor: null,
    items: [
      { id: "35", name: "Fish Tacos", quantity: 3, isCompleted: true },
      { id: "36", name: "Guacamole", quantity: 1, isCompleted: false },
      { id: "37", name: "Corn Chips", quantity: 1, isCompleted: false }
    ],
    total: 19.50,
    createdAt: "2025-01-31T12:55:00Z"
  },
  {
    id: "12",
    orderNumber: "ORDER-012",
    customerName: "Mark Thompson",
    customerPhone: "+1 905 234 5678",
    status: "accepted",
    orderTime: "12:58",
    isPreOrder: false,
    scheduledFor: null,
    items: [
      { id: "38", name: "Breakfast Burrito", quantity: 2, isCompleted: false },
      { id: "39", name: "Hash Browns", quantity: 2, isCompleted: false },
      { id: "40", name: "Orange Juice", quantity: 2, isCompleted: false }
    ],
    total: 24.00,
    createdAt: "2025-01-31T12:58:00Z"
  },
  {
    id: "13",
    orderNumber: "ORDER-013",
    customerName: "Grace Lee",
    customerPhone: "+1 416 345 6789",
    status: "ready",
    orderTime: "13:02",
    isPreOrder: false,
    scheduledFor: null,
    items: [
      { id: "41", name: "Sushi Combo", quantity: 1, isCompleted: true },
      { id: "42", name: "Miso Soup", quantity: 1, isCompleted: true },
      { id: "43", name: "Green Tea", quantity: 1, isCompleted: true }
    ],
    total: 35.00,
    createdAt: "2025-01-31T13:02:00Z"
  },
  {
    id: "14",
    orderNumber: "ORDER-014",
    customerName: "Alex Rodriguez",
    customerPhone: "+1 647 567 8901",
    status: "accepted",
    orderTime: "13:05",
    isPreOrder: false,
    scheduledFor: null,
    items: [
      { id: "44", name: "Chicken Quesadilla", quantity: 2, isCompleted: false },
      { id: "45", name: "Sour Cream", quantity: 1, isCompleted: false },
      { id: "46", name: "Salsa Verde", quantity: 1, isCompleted: false },
      { id: "47", name: "Mexican Beer", quantity: 2, isCompleted: false }
    ],
    total: 28.75,
    createdAt: "2025-01-31T13:05:00Z"
  },
  {
    id: "15",
    orderNumber: "ORDER-015",
    customerName: "Rachel Green",
    customerPhone: "+1 905 678 9012",
    status: "preparing",
    orderTime: "13:08",
    isPreOrder: false,
    scheduledFor: null,
    items: [
      { id: "48", name: "Quinoa Salad", quantity: 1, isCompleted: true },
      { id: "49", name: "Grilled Salmon", quantity: 1, isCompleted: false },
      { id: "50", name: "Lemon Water", quantity: 1, isCompleted: false }
    ],
    total: 42.50,
    createdAt: "2025-01-31T13:08:00Z"
  },
  {
    id: "16",
    orderNumber: "ORDER-016",
    customerName: "Kevin Chen",
    customerPhone: "+1 416 789 0123",
    status: "accepted",
    orderTime: "13:12",
    isPreOrder: false,
    scheduledFor: null,
    items: [
      { id: "51", name: "Pad Thai", quantity: 1, isCompleted: false, specialInstructions: "Extra spicy, no peanuts" },
      { id: "52", name: "Spring Rolls", quantity: 3, isCompleted: false },
      { id: "53", name: "Thai Iced Tea", quantity: 1, isCompleted: false }
    ],
    total: 26.00,
    createdAt: "2025-01-31T13:12:00Z"
  },
  {
    id: "17",
    orderNumber: "ORDER-017",
    customerName: "Monica Patel",
    customerPhone: "+1 647 890 1234",
    status: "preparing",
    orderTime: "13:15",
    isPreOrder: false,
    scheduledFor: null,
    items: [
      { id: "54", name: "Lamb Curry", quantity: 1, isCompleted: true, specialInstructions: "Medium spice level" },
      { id: "55", name: "Basmati Rice", quantity: 2, isCompleted: true },
      { id: "56", name: "Naan Bread", quantity: 2, isCompleted: false },
      { id: "57", name: "Mango Lassi", quantity: 1, isCompleted: false }
    ],
    total: 38.25,
    createdAt: "2025-01-31T13:15:00Z"
  },
  {
    id: "18",
    orderNumber: "ORDER-018",
    customerName: "Tyler Johnson",
    customerPhone: "+1 905 901 2345",
    status: "ready",
    orderTime: "13:18",
    isPreOrder: false,
    scheduledFor: null,
    items: [
      { id: "58", name: "BBQ Pulled Pork Sandwich", quantity: 1, isCompleted: true },
      { id: "59", name: "Coleslaw", quantity: 1, isCompleted: true },
      { id: "60", name: "Baked Beans", quantity: 1, isCompleted: true },
      { id: "61", name: "Root Beer", quantity: 1, isCompleted: true }
    ],
    total: 21.50,
    createdAt: "2025-01-31T13:18:00Z"
  },
  {
    id: "19",
    orderNumber: "ORDER-019",
    customerName: "Jessica Kim",
    customerPhone: "+1 416 012 3456",
    status: "accepted",
    orderTime: "13:22",
    isPreOrder: false,
    scheduledFor: null,
    items: [
      { id: "62", name: "Korean BBQ Bowl", quantity: 1, isCompleted: false },
      { id: "63", name: "Kimchi", quantity: 1, isCompleted: false },
      { id: "64", name: "Sesame Oil", quantity: 1, isCompleted: false, specialInstructions: "On the side" }
    ],
    total: 24.75,
    createdAt: "2025-01-31T13:22:00Z"
  },
  {
    id: "20",
    orderNumber: "ORDER-020",
    customerName: "Daniel Smith",
    customerPhone: "+1 647 123 4567",
    status: "preparing",
    orderTime: "13:25",
    isPreOrder: false,
    scheduledFor: null,
    items: [
      { id: "65", name: "Ribeye Steak", quantity: 1, isCompleted: false, specialInstructions: "Medium rare, no salt" },
      { id: "66", name: "Grilled Asparagus", quantity: 1, isCompleted: false },
      { id: "67", name: "Garlic Mashed Potatoes", quantity: 1, isCompleted: false },
      { id: "68", name: "Cabernet Wine", quantity: 1, isCompleted: false }
    ],
    total: 65.00,
    createdAt: "2025-01-31T13:25:00Z"
  },
  {
    id: "21",
    orderNumber: "PRE-021",
    customerName: "Hannah Wilson",
    customerPhone: "+1 905 234 5678",
    status: "accepted",
    orderTime: "13:28",
    isPreOrder: true,
    scheduledFor: "2025-01-31T17:00:00Z", // 3.5 hours later
    items: [
      { id: "69", name: "Birthday Cake", quantity: 1, isCompleted: false, specialInstructions: "Happy Birthday Sarah - 25 candles" },
      { id: "70", name: "Ice Cream", quantity: 6, isCompleted: false },
      { id: "71", name: "Sparkling Cider", quantity: 2, isCompleted: false }
    ],
    total: 45.00,
    createdAt: "2025-01-31T13:28:00Z"
  },
  {
    id: "22",
    orderNumber: "ORDER-022",
    customerName: "Chris Taylor",
    customerPhone: "+1 416 345 6789",
    status: "accepted",
    orderTime: "13:32",
    isPreOrder: false,
    scheduledFor: null,
    items: [
      { id: "72", name: "Fish and Chips", quantity: 2, isCompleted: false },
      { id: "73", name: "Mushy Peas", quantity: 2, isCompleted: false },
      { id: "74", name: "Malt Vinegar", quantity: 1, isCompleted: false }
    ],
    total: 31.00,
    createdAt: "2025-01-31T13:32:00Z"
  },
  {
    id: "23",
    orderNumber: "ORDER-023",
    customerName: "Amanda Davis",
    customerPhone: "+1 647 456 7890",
    status: "ready",
    orderTime: "13:35",
    isPreOrder: false,
    scheduledFor: null,
    items: [
      { id: "75", name: "Chicken Caesar Wrap", quantity: 1, isCompleted: true },
      { id: "76", name: "Sweet Potato Chips", quantity: 1, isCompleted: true },
      { id: "77", name: "Iced Coffee", quantity: 1, isCompleted: true }
    ],
    total: 18.25,
    createdAt: "2025-01-31T13:35:00Z"
  },
  {
    id: "24",
    orderNumber: "ORDER-024",
    customerName: "Ryan Murphy",
    customerPhone: "+1 905 567 8901",
    status: "preparing",
    orderTime: "13:38",
    isPreOrder: false,
    scheduledFor: null,
    items: [
      { id: "78", name: "Pepperoni Pizza", quantity: 1, isCompleted: true, specialInstructions: "Extra cheese, thin crust" },
      { id: "79", name: "Buffalo Wings", quantity: 8, isCompleted: false },
      { id: "80", name: "Ranch Dressing", quantity: 2, isCompleted: false },
      { id: "81", name: "Pepsi", quantity: 2, isCompleted: false }
    ],
    total: 34.50,
    createdAt: "2025-01-31T13:38:00Z"
  }
]


export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>(mockKitchenOrders)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [displayedOrders, setDisplayedOrders] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [activeTab, setActiveTab] = useState<'active' | 'scheduled'>('active')
  
  // Masonry breakpoint configuration
  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1
  }

  // Infinite scroll configuration (for regular orders only)
  const ordersPerLoad = 12 // Load 12 orders at a time

  // Initialize with first batch based on active tab
  useEffect(() => {
    const currentOrdersForDisplay = activeTab === 'active' ? regularOrders : preOrders
    const sortedCurrentOrders = currentOrdersForDisplay.sort((a, b) => {
      const aNum = parseInt(a.orderNumber.split('-')[1]) || 0
      const bNum = parseInt(b.orderNumber.split('-')[1]) || 0
      return aNum - bNum
    })
    const initialOrders = sortedCurrentOrders.slice(0, ordersPerLoad)
    setDisplayedOrders(initialOrders)
    setHasMore(sortedCurrentOrders.length > ordersPerLoad)
  }, [activeTab, orders, ordersPerLoad]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load more orders function
  const loadMoreOrders = useCallback(() => {
    if (loading || !hasMore) return

    setLoading(true)
    
    // Simulate API delay (remove in real implementation)
    setTimeout(() => {
      const currentOrdersForDisplay = activeTab === 'active' ? regularOrders : preOrders
      const sortedCurrentOrders = currentOrdersForDisplay.sort((a, b) => {
        const aNum = parseInt(a.orderNumber.split('-')[1]) || 0
        const bNum = parseInt(b.orderNumber.split('-')[1]) || 0
        return aNum - bNum
      })
      const currentLength = displayedOrders.length
      const nextOrders = sortedCurrentOrders.slice(currentLength, currentLength + ordersPerLoad)
      
      if (nextOrders.length > 0) {
        setDisplayedOrders(prev => [...prev, ...nextOrders])
        setHasMore(currentLength + nextOrders.length < sortedCurrentOrders.length)
      } else {
        setHasMore(false)
      }
      
      setLoading(false)
    }, 500) // 500ms delay for smooth UX
  }, [loading, hasMore, displayedOrders.length, activeTab, orders, ordersPerLoad]) // eslint-disable-line react-hooks/exhaustive-deps

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

    // Update both orders and displayedOrders
    setOrders(prevOrders => prevOrders.map(updateOrder))
    setDisplayedOrders(prevDisplayed => prevDisplayed.map(updateOrder))
  }

  // Change order status
  const changeOrderStatus = (orderId: string, newStatus: 'accepted' | 'preparing' | 'ready' | 'completed') => {
    if (newStatus === 'completed') {
      // Remove completed orders from kitchen display
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId))
      setDisplayedOrders(prevDisplayed => prevDisplayed.filter(order => order.id !== orderId))
    } else {
      const updateOrder = (order: KitchenOrder) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      
      setOrders(prevOrders => prevOrders.map(updateOrder))
      setDisplayedOrders(prevDisplayed => prevDisplayed.map(updateOrder))
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
  const getActionButton = (order: KitchenOrder) => {
    const canStart = canStartPreOrder(order)
    
    switch (order.status) {
      case 'accepted':
        if (order.isPreOrder && !canStart) {
          return (
            <Button disabled className="px-4 py-1.5 text-xs font-medium">
              <Clock className="h-3 w-3 mr-1" />
              Scheduled
            </Button>
          )
        }
        return (
          <Button 
            onClick={() => changeOrderStatus(order.id, 'preparing')} 
            className="px-4 py-1.5 text-xs font-medium hover:bg-primary/90"
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
            className="px-4 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
          >
            Mark Ready
          </Button>
        )
      case 'ready':
        return (
          <div className="text-center">
            <div className="px-4 py-1.5 text-xs font-medium text-green-600 border border-green-300 bg-green-50 rounded-md">
              Ready for Pickup
            </div>
          </div>
        )
      default:
        return null
    }
  }

  // Separate pre-orders from regular orders
  const preOrders = orders.filter(order => order.isPreOrder)
  const regularOrders = orders.filter(order => !order.isPreOrder)
  
  // Current orders based on active tab
  const currentOrdersForDisplay = activeTab === 'active' ? regularOrders : preOrders
  

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
                <div className="lg:col-span-4">
                  {/* Order Counter */}
                  <div className="flex items-center justify-end">
                    <div className="text-sm text-muted-foreground">
                      Showing {displayedOrders.length} of {currentOrdersForDisplay.length} orders
                      {loading && " • Loading..."}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="px-2 pb-6 sm:px-4 lg:px-6">
              <div className="flex items-center gap-2 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'active'
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ChefHat className="h-4 w-4" />
                    Active Orders ({regularOrders.length})
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('scheduled')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'scheduled'
                      ? 'border-yellow-500 text-yellow-600 bg-yellow-50'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pre-Orders ({preOrders.length})
                  </div>
                </button>
              </div>
            </div>

            {/* Status Overview Cards */}
            <div className="px-2 pb-6 sm:px-4 lg:px-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">{acceptedOrders.length}</div>
                        <div className="text-sm text-muted-foreground">To Prepare</div>
                      </div>
                      <div className="bg-blue-100 p-2 rounded-full">
                        <ChefHat className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-orange-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-orange-600">{preparingOrders.length}</div>
                        <div className="text-sm text-muted-foreground">In Progress</div>
                      </div>
                      <div className="bg-orange-100 p-2 rounded-full">
                        <Clock className="h-5 w-5 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-green-600">{readyOrders.length}</div>
                        <div className="text-sm text-muted-foreground">Ready</div>
                      </div>
                      <div className="bg-green-100 p-2 rounded-full">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Orders Masonry Grid */}
            <div className="flex-1 px-2 py-8 sm:px-4 lg:px-6">
              <Masonry
                breakpointCols={breakpointColumnsObj}
                className="flex w-auto -ml-6"
                columnClassName="pl-6 bg-clip-padding"
              >
                {displayedOrders.map((order) => (
                  <div key={order.id} className="mb-6">
                    <Card className="hover:shadow-lg transition-all duration-200">
                      <CardContent className="p-5">
                        {/* Header - Order Info and Status */}
                        <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
                          <div>
                            <div className="text-sm font-bold text-foreground">{order.orderNumber}</div>
                            <div className="text-xs text-muted-foreground">{order.orderTime} - {order.customerName}</div>
                          </div>
                          {getStatusBadge(order.status, order.isPreOrder)}
                        </div>
                        
                        {/* Pre-order timing */}
                        {order.isPreOrder && order.scheduledFor && (
                          <div className="mb-4 pb-4 border-b border-gray-200">
                            <div className="text-sm text-yellow-700 bg-yellow-100 px-2 py-1 rounded flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {getRemainingTime(order.scheduledFor)}
                            </div>
                          </div>
                        )}
                        
                        {/* Order Items with Checkboxes */}
                        <div className="mb-4 pb-4 border-b border-gray-200">
                          <div className="space-y-2">
                            {(() => {
                              const isExpanded = expandedOrders.has(order.id)
                              const maxVisibleItems = 3
                              const visibleItems = isExpanded ? order.items : order.items.slice(0, maxVisibleItems)
                              const hiddenItemsCount = order.items.length - maxVisibleItems
                              
                              return (
                                <>
                                  {visibleItems.map((item) => (
                                    <div key={item.id} className="flex items-start space-x-3">
                                      <Checkbox
                                        id={`item-${item.id}`}
                                        checked={item.isCompleted}
                                        onCheckedChange={() => toggleItemCompletion(order.id, item.id)}
                                        className="mt-0.5 data-[state=checked]:bg-green-600"
                                      />
                                      <label 
                                        htmlFor={`item-${item.id}`}
                                        className={`flex-1 text-sm cursor-pointer ${
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
                                      className="flex items-center justify-center w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors border border-dashed border-gray-300 rounded-md hover:border-gray-400"
                                    >
                                      {isExpanded ? (
                                        <>
                                          <ChevronUp className="h-3 w-3 mr-1" />
                                          Show Less
                                        </>
                                      ) : (
                                        <>
                                          <ChevronDown className="h-3 w-3 mr-1" />
                                          Show {hiddenItemsCount} More Items
                                        </>
                                      )}
                                    </button>
                                  )}
                                </>
                              )
                            })()}
                          </div>
                        </div>
                        
                        {/* Total and Action */}
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="text-xl font-bold text-foreground">
                            ${order.total.toFixed(2)}
                          </div>
                          <div className="flex justify-center min-w-0 flex-shrink-0">
                            {getActionButton(order)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </Masonry>
              
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
                    All {activeTab === 'active' ? 'active orders' : 'pre-orders'} loaded • {displayedOrders.length} total
                  </div>
                </div>
              )}
              
              {/* No Orders State */}
              {displayedOrders.length === 0 && !loading && (
                <div className="text-center py-12">
                  <ChefHat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground">
                    No {activeTab === 'active' ? 'Active' : 'Scheduled'} Orders
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {activeTab === 'active' ? 'Kitchen is all caught up! 🎉' : 'No pre-orders scheduled 📅'}
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