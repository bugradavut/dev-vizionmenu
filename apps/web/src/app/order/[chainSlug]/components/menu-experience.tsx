"use client"

import { useState } from 'react'
import { MapPin } from 'lucide-react'
import { OrderHeader } from '@/app/order/components/order-header'
import { CategorySidebar } from '@/app/order/components/category-sidebar' 
import { MenuGrid } from '@/app/order/components/menu-grid'
import { CartSidebar } from '@/app/order/components/cart-sidebar'
import { MobileCart } from '@/app/order/components/mobile-cart'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useResponsive } from '@/hooks/use-responsive'
import { OrderContextProvider } from '@/app/order/contexts/order-context'
import type { Chain, Branch } from '@/services/customer-chains.service'
import type { CustomerMenu } from '@/services/customer-menu.service'

interface MenuExperienceProps {
  chain: Chain
  branch: Branch
  customerMenu: CustomerMenu
  orderContext: {
    chainSlug: string
    branchId?: string
    tableNumber?: number
    source: 'qr' | 'web'
    isQROrder: boolean
    orderType?: 'takeout' | 'delivery'
  }
}

export function MenuExperience({
  chain,
  branch, 
  customerMenu,
  orderContext
}: MenuExperienceProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const { isMobile, isTablet, isDesktop } = useResponsive()


  // Create order context for existing components
  const legacyOrderContext = {
    source: orderContext.source,
    branchId: branch.id,
    tableNumber: orderContext.tableNumber,
    zone: undefined,
    isQROrder: orderContext.isQROrder
  }

  return (
    <OrderContextProvider value={legacyOrderContext}>
      {isDesktop && (
        <div className="h-screen bg-background flex flex-col overflow-hidden">
          {/* Enhanced Header with Chain/Branch Info */}
          <div className="flex-shrink-0 bg-card border-b">
            <div className="flex items-center justify-between p-4">
              {/* Left Side: Logo + Restaurant Info */}
              <div className="flex items-center gap-4">
                {/* Logo */}
                {chain.logo_url && (
                  <img 
                    src={chain.logo_url} 
                    alt={chain.name}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                
                {/* Restaurant Info */}
                <div>
                  <h1 className="text-lg font-bold">{chain.name}</h1>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{branch.name}</span>
                  </div>
                </div>
              </div>

              {/* Right Side: Search + Language + Schedule + QR Info */}
              <div className="flex items-center gap-4">
                {/* Search */}
                <div>
                  <OrderHeader 
                    branchName={branch.name}
                    branchAddress={branch.address}
                    onSearch={setSearchQuery}
                    hideTitle={true}
                  />
                </div>

                {/* QR Table Info */}
                {orderContext.isQROrder && orderContext.tableNumber && (
                  <div className="text-sm bg-primary/10 px-3 py-2 rounded-lg">
                    Table {orderContext.tableNumber}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Main Layout */}
          <div className="flex flex-1 min-h-0">
            {/* Left Sidebar - Categories */}
            <div className="w-64 bg-card border-r border-border">
              <CategorySidebar 
                selectedCategory={selectedCategory}
                onCategorySelect={setSelectedCategory}
                customerMenu={customerMenu}
                loading={false}
              />
            </div>
            
            {/* Center - Menu Grid */}
            <div className="flex-1">
              <ScrollArea className="h-full">
                <MenuGrid 
                  selectedCategory={selectedCategory} 
                  customerMenu={customerMenu}
                  loading={false}
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
          {/* Header with chain/branch info */}
          <div className="flex-shrink-0 bg-card border-b">
            <div className="flex items-center justify-between p-4">
              {/* Left Side: Logo + Restaurant Info */}
              <div className="flex items-center gap-3">
                {/* Logo */}
                {chain.logo_url && (
                  <img 
                    src={chain.logo_url} 
                    alt={chain.name} 
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                
                {/* Restaurant Info */}
                <div>
                  <div className="font-bold text-base">{chain.name}</div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{branch.name}</span>
                  </div>
                </div>
              </div>

              {/* Right Side: Search + Language + Schedule + QR Info */}
              <div className="flex items-center gap-3">
                {/* Search */}
                <div>
                  <OrderHeader 
                    branchName={branch.name}
                    branchAddress={branch.address}
                    onSearch={setSearchQuery}
                    hideTitle={true}
                  />
                </div>

                {/* QR Table Info */}
                {orderContext.isQROrder && orderContext.tableNumber && (
                  <div className="text-sm bg-primary/10 px-3 py-2 rounded-lg">
                    Table {orderContext.tableNumber}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Category Horizontal Tabs */}
          <div className="bg-card border-b border-border px-4 py-3 flex-shrink-0">
            <CategorySidebar 
              selectedCategory={selectedCategory}
              onCategorySelect={setSelectedCategory}
              customerMenu={customerMenu}
              loading={false}
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
                  loading={false}
                  searchQuery={searchQuery}
                />
              </ScrollArea>
            </div>
            
            {/* Cart Sidebar - Narrower than desktop */}
            <div className="w-72 bg-card border-l border-border">
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
          {/* Mobile header with chain/branch info */}
          <div className="bg-card border-b p-4">
            {/* Top Row: Logo + Restaurant Info + QR Info */}
            <div className="flex items-center justify-between mb-3">
              {/* Left Side: Logo + Restaurant Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Logo */}
                {chain.logo_url && (
                  <img 
                    src={chain.logo_url} 
                    alt={chain.name} 
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                
                {/* Restaurant Info */}
                <div className="min-w-0">
                  <div className="font-bold text-base truncate">{chain.name}</div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{branch.name}</span>
                  </div>
                </div>
              </div>

              {/* QR Table Info */}
              {orderContext.isQROrder && orderContext.tableNumber && (
                <div className="text-sm bg-primary/10 px-3 py-2 rounded-lg flex-shrink-0">
                  Table {orderContext.tableNumber}
                </div>
              )}
            </div>
            
            {/* Bottom Row: Search + Language + Schedule */}
            <div>
              <OrderHeader 
                branchName={branch.name}
                branchAddress={branch.address}
                onSearch={setSearchQuery}
                hideTitle={true}
              />
            </div>
          </div>
          
          {/* Category tabs */}
          <div className="bg-card border-b border-border px-4 py-3 flex-shrink-0">
            <CategorySidebar 
              selectedCategory={selectedCategory}
              onCategorySelect={setSelectedCategory}
              customerMenu={customerMenu}
              loading={false}
              isMobile={true}
            />
          </div>
          
          {/* Menu Grid */}
          <div className="flex-1 overflow-y-auto">
            <MenuGrid 
              selectedCategory={selectedCategory} 
              customerMenu={customerMenu}
              loading={false}
              searchQuery={searchQuery}
            />
          </div>
          
          {/* Mobile Cart */}
          <MobileCart />
        </div>
      )}
    </OrderContextProvider>
  )
}