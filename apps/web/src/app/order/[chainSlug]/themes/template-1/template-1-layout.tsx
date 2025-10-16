"use client"

import { useEffect, useState } from 'react'
import { MapPin, ChevronDown, Store, ShoppingCart, Plus, ShoppingBag, ChevronRight } from 'lucide-react'
import { OrderHeader } from '@/app/order/components/order-header'
import { CartSidebar } from '@/app/order/components/cart-sidebar'
import { MobileCart } from '@/app/order/components/mobile-cart'
import { ItemModal } from '@/app/order/components/item-modal'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FloatingWaiterButton } from '@/components/floating-waiter-button'
import { cn } from '@/lib/utils'
import { getIconComponent } from '@/lib/category-icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { useResponsive } from '@/hooks/use-responsive'
import { OrderContextProvider } from '@/app/order/contexts/order-context'
import { RestaurantClosedModal } from '@/components/modals/restaurant-closed-modal'
import { PreOrderModal } from '@/app/order/components/pre-order-modal'
import { useMenuLogic } from '../shared/use-menu-logic'
import { customerMenuService } from '@/services/customer-menu.service'
import { useCart } from '@/app/order/contexts/cart-context'
import type { ThemeLayoutProps } from '../theme.types'

export default function Template1Layout(props: ThemeLayoutProps) {
  const { chain, branch, customerMenu, orderContext, availableBranches = [], onBranchChange } = props

  const { isMobile, isTablet, isDesktop } = useResponsive()
  const { addItem, items, getItemQuantity } = useCart()
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCartExpanded, setIsCartExpanded] = useState(false) // Start collapsed

  // Use shared business logic
  const logic = useMenuLogic({
    branch,
    chain,
    customerMenu,
    orderContext,
    availableBranches,
    onBranchChange
  })

  // Apply primary color as CSS variable - default to orange (#ff4f01)
  const primaryColor = branch.theme_config?.colors?.primary || '#ff4f01'

  useEffect(() => {
    document.documentElement.style.setProperty('--primary', primaryColor)
    return () => {
      document.documentElement.style.removeProperty('--primary')
    }
  }, [primaryColor])

  // Auto-expand cart when first item is added
  useEffect(() => {
    if (items.length > 0 && !isCartExpanded) {
      setIsCartExpanded(true)
    }
  }, [items.length])

  // Get categories
  const categories = customerMenuService.getCategoriesWithCounts(customerMenu)

  // Get menu items for selected category
  const menuItems = customerMenuService.getItemsByCategory(customerMenu, logic.selectedCategory)
    .filter(item => {
      if (!logic.searchQuery) return true
      return item.name.toLowerCase().includes(logic.searchQuery.toLowerCase()) ||
             item.description?.toLowerCase().includes(logic.searchQuery.toLowerCase())
    })

  // Branch switcher
  const BranchSwitcher = ({ className = '' }: { className?: string }) => {
    if (!logic.availableBranches.length || logic.availableBranches.length === 1 || orderContext.isQROrder) {
      return (
        <div className={`flex items-center gap-1.5 text-sm ${className}`}>
          <MapPin className="w-3.5 h-3.5" />
          <span className="truncate">{branch.name}</span>
        </div>
      )
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-auto p-0 hover:bg-transparent">
            <div className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">{branch.name}</span>
              <ChevronDown className="w-3 h-3" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {logic.availableBranches.map((b) => (
            <DropdownMenuItem
              key={b.id}
              onClick={() => logic.handleBranchChange(b)}
              disabled={b.id === branch.id}
            >
              <Store className="w-4 h-4 mr-2" />
              <span className="flex-1 truncate">{b.name}</span>
              {b.id === branch.id && <div className="w-2 h-2 rounded-full bg-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Handle item click to open modal
  const handleItemClick = (item: any) => {
    setSelectedItem(item)
    setIsModalOpen(true)
  }

  // Handle modal close
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedItem(null)
  }

  const legacyOrderContext = {
    chainSlug: orderContext.chainSlug,
    source: orderContext.source,
    branchId: branch.id,
    tableNumber: orderContext.tableNumber,
    zone: orderContext.zone,
    isQROrder: orderContext.isQROrder
  }

  return (
    <OrderContextProvider value={legacyOrderContext}>
      {/* Desktop Layout - Pizzaro Style */}
      {isDesktop && (
        <div className="h-screen bg-[#f5f5f5] flex flex-col overflow-hidden relative">
          {/* Background Pattern */}
          <div
            className="fixed inset-0 z-0 opacity-5"
            style={{
              backgroundImage: 'url(/Food Bg.png)',
              backgroundRepeat: 'repeat',
              backgroundSize: '400px 400px',
            }}
          />
          {/* Top Navigation */}
          <div className="flex-shrink-0 bg-white border-b shadow-sm relative z-10">
            <div className="px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-6">
                {chain.logo_url && (
                  <img src={chain.logo_url} alt={chain.name} className="h-12 w-auto object-contain" />
                )}
                <div>
                  <h1 className="text-xl font-bold">{chain.name}</h1>
                  <BranchSwitcher />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <OrderHeader
                  branchName={branch.name}
                  branchId={branch.id}
                  branchAddress={typeof branch.address === 'string' ? branch.address : ''}
                  onSearch={logic.setSearchQuery}
                  hideTitle={true}
                />
                {orderContext.isQROrder && orderContext.tableNumber && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Table {orderContext.tableNumber}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content with Sticky Category Bar */}
          <div className="flex flex-1 min-h-0 relative z-10">
            {/* Products Area */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                {/* Hero Banner Section - 80% of viewport height */}
                <div
                  className="relative w-full overflow-hidden"
                  style={{
                    height: '65vh',
                    background: 'linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), url("/food_bg_icon.png")',
                    backgroundSize: 'cover'
                  }}
                >
                  {branch.theme_config?.bannerImage ? (
                    <img
                      src={branch.theme_config.bannerImage}
                      alt="Special Offer Banner"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    // Default banner - example image
                    <img
                      src="https://img.pikbest.com/templates/20240602/food-burger-restaurant-special-offer-web-banner-layout_10587350.jpg!w700wp"
                      alt="Special Offer Banner"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>

                {/* Category Bar - Sticky */}
                <div className="sticky top-0 z-20 bg-primary shadow-lg">
                  <div className="flex items-center justify-center py-2">
                    {categories.map((category, index) => {
                      const Icon = getIconComponent(category.icon || 'Grid3X3')
                      const isSelected = logic.selectedCategory === category.id
                      return (
                        <div key={category.id} className="flex items-center relative">
                          <button
                            onClick={() => logic.setSelectedCategory(category.id)}
                            className={cn(
                              "flex flex-col items-center justify-center px-6 py-2 min-w-[100px] transition-all",
                              isSelected
                                ? "text-white"
                                : "text-white/40 hover:text-white/60"
                            )}
                          >
                            <Icon className="w-7 h-7 mb-1" />
                            <span className={cn(
                              "text-sm transition-all",
                              isSelected ? "font-bold" : "font-normal"
                            )}>{category.name}</span>
                          </button>
                          {/* Triangle arrow below selected category */}
                          {isSelected && (
                            <svg
                              className="absolute left-1/2 -translate-x-1/2 pointer-events-none text-primary"
                              style={{ bottom: '-20px' }}
                              width="24"
                              height="14"
                              viewBox="0 0 24 14"
                              fill="none"
                            >
                              <path
                                d="M0 0H24L14.5 11C13.5 12.5 10.5 12.5 9.5 11L0 0Z"
                                fill="currentColor"
                              />
                            </svg>
                          )}
                          {index < categories.length - 1 && (
                            <div className="h-12 w-px bg-white/20" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Products Grid - Restaurant Style Horizontal Cards */}
                <div className="max-w-screen-2xl mx-auto px-6 py-8 pb-32">
                  <div className="grid grid-cols-3 gap-4">
                    {menuItems.map((item) => {
                      const itemQuantity = getItemQuantity(item.id)

                      return (
                        <div
                          key={item.id}
                          className="group bg-white rounded-lg overflow-hidden shadow-sm transition-all duration-200 cursor-pointer border border-gray-200 hover:border-primary/40 flex relative"
                          onClick={() => handleItemClick(item)}
                        >
                          {/* Quantity Badge - Card Top Right */}
                          {itemQuantity > 0 && (
                            <div className="absolute top-2 right-2 z-10">
                              <div className="bg-primary text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white shadow-md">
                                {itemQuantity}
                              </div>
                            </div>
                          )}

                          {/* Image - Left Side */}
                          <div className="relative w-32 h-32 flex-shrink-0 bg-gray-100 overflow-hidden">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gradient-to-br from-gray-50 to-gray-100">
                                <ShoppingBag className="w-12 h-12" />
                              </div>
                            )}
                          </div>

                          {/* Content - Right Side */}
                          <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                            <div className="flex-1 min-h-0">
                              <h3 className="font-semibold text-base mb-1 line-clamp-1 text-gray-900">{item.name}</h3>
                              {item.description && (
                                <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                              )}
                            </div>

                            {/* Price & Arrow */}
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xl font-bold text-primary">${item.price.toFixed(2)}</span>
                              <div className="w-8 h-8 rounded-full bg-primary/10 group-hover:bg-primary flex items-center justify-center transition-colors">
                                <ChevronRight className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {menuItems.length === 0 && (
                    <div className="text-center py-20">
                      <p className="text-gray-500 text-lg">No items found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Collapsible Cart Sidebar */}
            <div
              className={cn(
                "bg-white border-l shadow-lg transition-all duration-300 ease-in-out relative",
                isCartExpanded ? "w-96" : "w-16"
              )}
            >
              {/* Toggle Button */}
              <button
                onClick={() => setIsCartExpanded(!isCartExpanded)}
                className="absolute top-8 -left-3 z-10 bg-black hover:bg-gray-900 text-white rounded-full p-1.5 shadow-lg hover:scale-110 transition-transform"
              >
                {isCartExpanded ? (
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                ) : (
                  <ChevronDown className="w-4 h-4 rotate-90" />
                )}
              </button>

              {isCartExpanded ? (
                <ScrollArea className="h-full">
                  <CartSidebar />
                </ScrollArea>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setIsCartExpanded(true)}>
                  {/* Shopping Bag with Badge */}
                  <div className="relative">
                    <ShoppingBag className="w-8 h-8 text-gray-700" strokeWidth={1.5} />
                    {items.length > 0 && (
                      <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-md">
                        {items.length}
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="w-8 h-px bg-gray-200" />

                  {/* Price */}
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider">Total</span>
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold text-gray-800 leading-tight">
                        {items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500">$</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tablet Layout */}
      {isTablet && (
        <div className="h-screen bg-[#f5f5f5] flex flex-col overflow-hidden relative">
          {/* Background Pattern */}
          <div
            className="fixed inset-0 z-0 opacity-20"
            style={{
              backgroundImage: 'url(/Food Bg.png)',
              backgroundRepeat: 'repeat',
              backgroundSize: '300px 300px',
            }}
          />
          <div className="flex-shrink-0 bg-white border-b px-4 py-3 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {chain.logo_url && <img src={chain.logo_url} alt={chain.name} className="h-10 w-auto" />}
                <div>
                  <div className="font-bold">{chain.name}</div>
                  <BranchSwitcher />
                </div>
              </div>
              <OrderHeader branchName={branch.name} branchId={branch.id} onSearch={logic.setSearchQuery} hideTitle={true} />
            </div>
          </div>

          <div className="flex flex-1 min-h-0 relative z-10">
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                {/* Hero Banner Section - 30vh for tablet */}
                <div
                  className="relative w-full overflow-hidden"
                  style={{
                    height: '35vh',
                    background: 'linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), url("/food_bg_icon.png")',
                    backgroundSize: 'cover'
                  }}
                >
                  {branch.theme_config?.bannerImage ? (
                    <img
                      src={branch.theme_config.bannerImage}
                      alt="Special Offer Banner"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    // Default banner - example image
                    <img
                      src="https://img.pikbest.com/templates/20240602/food-burger-restaurant-special-offer-web-banner-layout_10587350.jpg!w700wp"
                      alt="Special Offer Banner"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>

                {/* Category Bar - Sticky */}
                <div className="sticky top-0 z-20 bg-primary shadow-lg">
                  <div className="flex items-center justify-center py-2">
                    {categories.map((category, index) => {
                      const Icon = getIconComponent(category.icon || 'Grid3X3')
                      const isSelected = logic.selectedCategory === category.id
                      return (
                        <div key={category.id} className="flex items-center relative">
                          <button
                            onClick={() => logic.setSelectedCategory(category.id)}
                            className={cn(
                              "flex flex-col items-center justify-center px-4 py-2 min-w-[80px] transition-all",
                              isSelected
                                ? "text-white"
                                : "text-white/40 hover:text-white/60"
                            )}
                          >
                            <Icon className="w-6 h-6 mb-1" />
                            <span className={cn(
                              "text-xs transition-all",
                              isSelected ? "font-bold" : "font-normal"
                            )}>{category.name}</span>
                          </button>
                          {/* Triangle arrow below selected category */}
                          {isSelected && (
                            <svg
                              className="absolute left-1/2 -translate-x-1/2 pointer-events-none text-primary"
                              style={{ bottom: '-16px' }}
                              width="20"
                              height="12"
                              viewBox="0 0 20 12"
                              fill="none"
                            >
                              <path
                                d="M0 0H20L12 9C11 10.5 9 10.5 8 9L0 0Z"
                                fill="currentColor"
                              />
                            </svg>
                          )}
                          {index < categories.length - 1 && (
                            <div className="h-10 w-px bg-white/20" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Products Grid - Restaurant Style 1 Column */}
                <div className="p-4 pb-32 space-y-3">
                  {menuItems.map((item) => {
                    const itemQuantity = getItemQuantity(item.id)

                    return (
                      <div
                        key={item.id}
                        className="group bg-white rounded-lg overflow-hidden shadow-sm transition-all duration-200 cursor-pointer border border-gray-200 hover:border-primary/40 flex relative"
                        onClick={() => handleItemClick(item)}
                      >
                        {/* Quantity Badge - Card Top Right */}
                        {itemQuantity > 0 && (
                          <div className="absolute top-2 right-2 z-10">
                            <div className="bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white shadow-md">
                              {itemQuantity}
                            </div>
                          </div>
                        )}

                        {/* Image - Left Side */}
                        <div className="relative w-24 h-24 flex-shrink-0 bg-gray-100 overflow-hidden">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gradient-to-br from-gray-50 to-gray-100">
                              <ShoppingBag className="w-10 h-10" />
                            </div>
                          )}
                        </div>

                        {/* Content - Right Side */}
                        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                          <div className="flex-1 min-h-0">
                            <h3 className="font-semibold text-sm mb-1 line-clamp-1 text-gray-900">{item.name}</h3>
                            {item.description && (
                              <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
                            )}
                          </div>

                          {/* Price & Arrow */}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-lg font-bold text-primary">${item.price.toFixed(2)}</span>
                            <div className="w-7 h-7 rounded-full bg-primary/10 group-hover:bg-primary flex items-center justify-center transition-colors">
                              <ChevronRight className="w-4 h-4 text-primary group-hover:text-white transition-colors" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {menuItems.length === 0 && (
                    <div className="text-center py-12 col-span-3">
                      <p className="text-gray-500">No items found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Collapsible Cart Sidebar - Tablet */}
            <div
              className={cn(
                "bg-white border-l shadow-lg transition-all duration-300 ease-in-out relative",
                isCartExpanded ? "w-80" : "w-16"
              )}
            >
              {/* Toggle Button */}
              <button
                onClick={() => setIsCartExpanded(!isCartExpanded)}
                className="absolute top-4 -left-3 z-10 bg-black hover:bg-gray-900 text-white rounded-full p-1.5 shadow-lg hover:scale-110 transition-transform"
              >
                {isCartExpanded ? (
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                ) : (
                  <ChevronDown className="w-4 h-4 rotate-90" />
                )}
              </button>

              {isCartExpanded ? (
                <ScrollArea className="h-full">
                  <CartSidebar />
                </ScrollArea>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setIsCartExpanded(true)}>
                  {/* Shopping Bag with Badge */}
                  <div className="relative">
                    <ShoppingBag className="w-8 h-8 text-gray-700" strokeWidth={1.5} />
                    {items.length > 0 && (
                      <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-md">
                        {items.length}
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="w-8 h-px bg-gray-200" />

                  {/* Price */}
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider">Total</span>
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold text-gray-800 leading-tight">
                        {items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500">$</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Layout */}
      {isMobile && (
        <div className="min-h-screen bg-[#f5f5f5] flex flex-col relative">
          {/* Background Pattern */}
          <div
            className="fixed inset-0 z-0 opacity-20"
            style={{
              backgroundImage: 'url(/Food Bg.png)',
              backgroundRepeat: 'repeat',
              backgroundSize: '200px 200px',
            }}
          />
          <div className="bg-white border-b p-4 relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {chain.logo_url && <img src={chain.logo_url} alt={chain.name} className="h-8 w-auto" />}
                <div>
                  <div className="font-bold text-sm">{chain.name}</div>
                  <BranchSwitcher />
                </div>
              </div>
            </div>
            <OrderHeader branchName={branch.name} branchId={branch.id} onSearch={logic.setSearchQuery} hideTitle={true} />
          </div>

          {/* Hero Banner Section - 30vh for mobile */}
          <div
            className="relative w-full overflow-hidden z-10"
            style={{
              height: '35vh',
              background: 'linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), url("/food_bg_icon.png")',
              backgroundSize: 'cover'
            }}
          >
            {branch.theme_config?.bannerImage ? (
              <img
                src={branch.theme_config.bannerImage}
                alt="Special Offer Banner"
                className="w-full h-full object-contain"
              />
            ) : (
              // Default banner - example image
              <img
                src="https://img.pikbest.com/templates/20240602/food-burger-restaurant-special-offer-web-banner-layout_10587350.jpg!w700wp"
                alt="Special Offer Banner"
                className="w-full h-full object-contain"
              />
            )}
          </div>

          {/* Category Bar - Sticky */}
          <div className="sticky top-0 z-20 bg-primary shadow-lg">
            <div className="flex items-center gap-2 py-2 px-4 overflow-x-auto scrollbar-hide">
              {categories.map((category) => {
                const Icon = getIconComponent(category.icon || 'Grid3X3')
                const isSelected = logic.selectedCategory === category.id
                return (
                  <button
                    key={category.id}
                    onClick={() => logic.setSelectedCategory(category.id)}
                    className={cn(
                      "flex flex-col items-center justify-center px-3 py-2 min-w-[70px] transition-all rounded-lg flex-shrink-0",
                      isSelected
                        ? "bg-white/20 text-white"
                        : "text-white/40 hover:text-white/60"
                    )}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span className={cn(
                      "text-xs transition-all whitespace-nowrap",
                      isSelected ? "font-bold" : "font-normal"
                    )}>{category.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 pb-32 relative z-10">
            <div className="space-y-2">
              {menuItems.map((item) => {
                const itemQuantity = getItemQuantity(item.id)

                return (
                  <div
                    key={item.id}
                    className="group bg-white rounded-lg overflow-hidden shadow-sm transition-all cursor-pointer border border-gray-200 active:border-primary/40 flex relative"
                    onClick={() => handleItemClick(item)}
                  >
                    {/* Quantity Badge - Card Top Right */}
                    {itemQuantity > 0 && (
                      <div className="absolute top-1 right-1 z-10">
                        <div className="bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white shadow-md">
                          {itemQuantity}
                        </div>
                      </div>
                    )}

                    {/* Image - Left Side */}
                    <div className="relative w-20 h-20 flex-shrink-0 bg-gray-100 overflow-hidden">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gradient-to-br from-gray-50 to-gray-100">
                          <ShoppingBag className="w-8 h-8" />
                        </div>
                      )}
                    </div>

                    {/* Content - Right Side */}
                    <div className="flex-1 p-2 flex flex-col justify-between min-w-0">
                      <div className="flex-1 min-h-0">
                        <h3 className="font-semibold text-sm mb-0.5 line-clamp-1 text-gray-900">{item.name}</h3>
                        {item.description && (
                          <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                        )}
                      </div>

                      {/* Price & Arrow */}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-base font-bold text-primary">${item.price.toFixed(2)}</span>
                        <div className="w-6 h-6 rounded-full bg-primary/10 active:bg-primary flex items-center justify-center transition-colors">
                          <ChevronRight className="w-4 h-4 text-primary group-active:text-white transition-colors" />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {menuItems.length === 0 && (
                <div className="text-center py-8 col-span-2">
                  <p className="text-gray-500">No items found</p>
                </div>
              )}
            </div>
          </div>

          <div className="relative z-10">
            <MobileCart
              showWaiterButton={orderContext.isQROrder && !!orderContext.tableNumber && !logic.waiterButtonHidden}
              waiterButtonSlot={
                orderContext.isQROrder && orderContext.tableNumber && !logic.waiterButtonHidden ? (
                  <FloatingWaiterButton branchId={branch.id} tableNumber={orderContext.tableNumber} zone={orderContext.zone} isHidden={logic.waiterButtonHidden} onWaiterCalled={() => logic.setWaiterButtonHidden(true)} />
                ) : undefined
              }
            />
          </div>
        </div>
      )}

      {orderContext.isQROrder && orderContext.tableNumber && isTablet && !logic.waiterButtonHidden && (
        <FloatingWaiterButton branchId={branch.id} tableNumber={orderContext.tableNumber} zone={orderContext.zone} isHidden={logic.waiterButtonHidden} onWaiterCalled={() => logic.setWaiterButtonHidden(true)} />
      )}

      <AlertDialog open={logic.showCartClearDialog} onOpenChange={() => {}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch Branch?</AlertDialogTitle>
            <AlertDialogDescription>Your cart will be cleared when switching branches.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={logic.cancelBranchChange}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={logic.confirmBranchChange}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RestaurantClosedModal isOpen={logic.showRestaurantClosedModal} onClose={logic.handleRestaurantClosedModalClose} onScheduleOrder={logic.allowSchedulingWhenClosed ? logic.handleScheduleOrder : undefined} restaurantHours={logic.settings.restaurantHours ? logic.migrateRestaurantHours(logic.settings.restaurantHours as any) : undefined} isBusy={logic.settings.restaurantHours ? logic.isRestaurantMarkedAsBusy(logic.settings.restaurantHours as any) : false} />

      <PreOrderModal isOpen={logic.showPreOrderModal} onClose={logic.handlePreOrderClose} onConfirm={logic.handlePreOrderConfirm} currentSchedule={logic.preOrder.isPreOrder ? { date: logic.preOrder.scheduledDate || '', time: logic.preOrder.scheduledTime || '' } : undefined} />

      {/* Item Detail Modal */}
      <ItemModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </OrderContextProvider>
  )
}
