"use client"

import { use, useState, useEffect } from 'react'
import { OrderHeader } from './components/order-header'
import { CategorySidebar } from './components/category-sidebar'
import { MenuGrid } from './components/menu-grid'
import { CartSidebar } from './components/cart-sidebar'
import { MobileCart } from './components/mobile-cart'
import { ScrollArea } from '@/components/ui/scroll-area'
import { customerMenuService, type CustomerMenu } from '@/services/customer-menu.service'
import { useResponsive, useResponsiveClasses } from '@/hooks/use-responsive'
import { OrderContextProvider } from './contexts/order-context'

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
  const [customerMenu, setCustomerMenu] = useState<CustomerMenu | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  // Centralized responsive state management
  const { isMobile, isTablet, isDesktop } = useResponsive()
  const responsiveClasses = useResponsiveClasses()


  // Create order context from URL parameters with enhanced validation
  const orderContext = {
    source: (resolvedSearchParams.source as 'qr' | 'web') || 'web',
    branchId: resolvedSearchParams.branch, // No fallback - require explicit branch
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


  // Branch validation - redirect to chain selection
  if (!orderContext.branchId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🏪</span>
          </div>
          <h1 className="text-2xl font-bold mb-4">Chain Selection Required</h1>
          <p className="text-muted-foreground mb-6">
            {orderContext.isQROrder 
              ? 'This QR code appears to be from an older format. Please scan a new QR code from the restaurant.'
              : 'Please use the new ordering system by selecting a restaurant chain first.'
            }
          </p>
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
            <p className="text-sm text-foreground">
              <strong>New URL Format:</strong><br />
              /order/chain-name → Select branch → Menu<br />
              <strong>QR Code Format:</strong><br />
              /order/chain-name?branch=BRANCH_ID&table=TABLE
            </p>
          </div>
          <button 
            onClick={() => window.location.href = '/'} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Return to Home
          </button>
        </div>
      </div>
    )
  }

  // Handle menu loading error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Unable to Load Menu</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <OrderContextProvider value={orderContext}>
      <>
        {/* Desktop Layout */}
        {isDesktop && (
          <div className="h-screen bg-background flex flex-col overflow-hidden">
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
              <div className="w-64 bg-card border-r border-border">
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
              <div className="w-80 bg-card border-l border-border">
                <ScrollArea className="h-full">
                  <CartSidebar />
                </ScrollArea>
              </div>
            </div>
          </div>
        )}

        {/* Tablet Layout */}
        {isTablet && (
          <div className="h-screen bg-background flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0">
              <OrderHeader 
                branchName={customerMenu?.metadata.branchName}
                branchAddress={customerMenu?.metadata.branchAddress}
                onSearch={setSearchQuery}
              />
            </div>
            
            {/* Category Horizontal Tabs */}
            <div className="bg-card border-b border-border px-4 py-3 flex-shrink-0">
              <CategorySidebar 
                selectedCategory={selectedCategory}
                onCategorySelect={setSelectedCategory}
                customerMenu={customerMenu}
                loading={loading}
                isMobile={true}
              />
            </div>
            
            {/* Main Layout - Menu + Cart Side by Side */}
            <div className="flex flex-1 min-h-0">
              {/* Menu Grid - Takes more space */}
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
              
              {/* Cart Sidebar - Narrower than desktop */}
              <div className={`${responsiveClasses.sidebar.cart} bg-card border-l border-border`}>
                <ScrollArea className="h-full">
                  <CartSidebar />
                </ScrollArea>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Layout */}
        {isMobile && (
          <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <OrderHeader 
              branchName={customerMenu?.metadata.branchName}
              branchAddress={customerMenu?.metadata.branchAddress}
              onSearch={setSearchQuery}
            />
            
            {/* Category tabs */}
            <div className="bg-card border-b border-border px-4 py-3 flex-shrink-0">
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
      </>
    </OrderContextProvider>
  )
}

export default function OrderPage({ searchParams }: OrderPageProps) {
  return <OrderPageContent searchParams={searchParams} />
}