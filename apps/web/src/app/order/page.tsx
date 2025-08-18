"use client"

import { use, useState, useEffect } from 'react'
import { OrderHeader } from './components/order-header'
import { CategorySidebar } from './components/category-sidebar'
import { MenuGrid } from './components/menu-grid'
import { CartSidebar } from './components/cart-sidebar'
import { MobileCart } from './components/mobile-cart'
import { OrderContextProvider } from './contexts/order-context'
import { CartContextProvider } from './contexts/cart-context'
import { ScrollArea } from '@/components/ui/scroll-area'
import { customerMenuService, type CustomerMenu } from '@/services/customer-menu.service'

interface OrderPageProps {
  searchParams: Promise<{
    source?: string
    branch?: string
    table?: string
    zone?: string
  }>
}

function OrderPageContent({ searchParams }: { searchParams: Promise<{
  source?: string
  branch?: string
  table?: string
  zone?: string
}> }) {
  const resolvedSearchParams = use(searchParams)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isMobile, setIsMobile] = useState(false)
  const [customerMenu, setCustomerMenu] = useState<CustomerMenu | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Create order context from URL parameters with enhanced validation
  const orderContext = {
    source: (resolvedSearchParams.source as 'qr' | 'web') || 'web',
    branchId: resolvedSearchParams.branch || '550e8400-e29b-41d4-a716-446655440002', // Default branch for MVP
    tableNumber: resolvedSearchParams.table ? parseInt(resolvedSearchParams.table) : undefined,
    zone: resolvedSearchParams.zone,
    isQROrder: resolvedSearchParams.source === 'qr'
  }

  // Enhanced validation for QR orders
  if (orderContext.isQROrder && !orderContext.tableNumber) {
    console.warn('QR order detected but no table number provided')
  }

  // Fetch customer menu data
  useEffect(() => {
    const fetchMenu = async () => {
      if (!orderContext.branchId) return

      try {
        setLoading(true)
        setError(null)
        const menu = await customerMenuService.getCustomerMenu(orderContext.branchId)
        setCustomerMenu(menu)
      } catch (err) {
        console.error('Failed to fetch customer menu:', err)
        setError(err instanceof Error ? err.message : 'Failed to load menu')
      } finally {
        setLoading(false)
      }
    }

    fetchMenu()
  }, [orderContext.branchId])

  // Enhanced branch validation (Disabled for MVP)
  // if (!orderContext.branchId) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-gray-50">
  //       <div className="max-w-md mx-auto text-center p-6">
  //         <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
  //           <span className="text-2xl">🏪</span>
  //         </div>
  //         <h1 className="text-2xl font-bold text-gray-900 mb-4">Branch Required</h1>
  //         <p className="text-gray-600 mb-6">
  //           {orderContext.isQROrder 
  //             ? 'Invalid QR code. Please scan a valid restaurant QR code.'
  //             : 'Please select a branch to view the menu.'
  //           }
  //         </p>
  //         <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
  //           <p className="text-sm text-blue-800">
  //             <strong>QR Code Format:</strong><br />
  //             /order?source=qr&branch=BRANCH_ID&table=TABLE_NUMBER<br />
  //             <strong>Web Access:</strong><br />
  //             /order?branch=BRANCH_ID
  //           </p>
  //         </div>
  //       </div>
  //     </div>
  //   )
  // }

  // Handle menu loading error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Unable to Load Menu</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <OrderContextProvider value={orderContext}>
      <CartContextProvider>
        {/* Desktop Layout */}
        {!isMobile && (
          <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0">
              <OrderHeader 
                branchName={customerMenu?.metadata.branchName}
                branchAddress={customerMenu?.metadata.branchAddress}
                onSearch={setSearchQuery}
              />
            </div>
            
            {/* Main Layout */}
            <div className="flex flex-1 min-h-0">
              {/* Left Sidebar - Categories */}
              <div className="w-64 bg-white border-r border-gray-200">
                <CategorySidebar 
                  selectedCategory={selectedCategory}
                  onCategorySelect={setSelectedCategory}
                  customerMenu={customerMenu}
                  loading={loading}
                />
              </div>
              
              {/* Center - Menu Grid */}
              <div className="flex-1">
                <ScrollArea className="h-full">
                  <MenuGrid 
                    selectedCategory={selectedCategory} 
                    customerMenu={customerMenu}
                    loading={loading}
                    searchQuery={searchQuery}
                  />
                </ScrollArea>
              </div>
              
              {/* Right Sidebar - Cart */}
              <div className="w-80 bg-white border-l border-gray-200">
                <ScrollArea className="h-full">
                  <CartSidebar />
                </ScrollArea>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Layout */}
        {isMobile && (
          <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <OrderHeader 
              branchName={customerMenu?.metadata.branchName}
              branchAddress={customerMenu?.metadata.branchAddress}
              onSearch={setSearchQuery}
            />
            
            {/* Category tabs */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
              <CategorySidebar 
                selectedCategory={selectedCategory}
                onCategorySelect={setSelectedCategory}
                customerMenu={customerMenu}
                loading={loading}
                isMobile={true}
              />
            </div>
            
            {/* Menu Grid */}
            <div className="flex-1 overflow-y-auto">
              <MenuGrid 
                selectedCategory={selectedCategory} 
                customerMenu={customerMenu}
                loading={loading}
                searchQuery={searchQuery}
              />
            </div>
            
            {/* Mobile Cart */}
            <MobileCart />
          </div>
        )}
      </CartContextProvider>
    </OrderContextProvider>
  )
}

export default function OrderPage({ searchParams }: OrderPageProps) {
  return <OrderPageContent searchParams={searchParams} />
}