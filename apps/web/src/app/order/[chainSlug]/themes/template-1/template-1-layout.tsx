"use client"

import { useEffect, useState } from 'react'
import { MapPin, ChevronDown, Store, ShoppingCart, Plus } from 'lucide-react'
import { OrderHeader } from '@/app/order/components/order-header'
import { CartSidebar } from '@/app/order/components/cart-sidebar'
import { MobileCart } from '@/app/order/components/mobile-cart'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
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
  const { addItem } = useCart()
  const [selectedItem, setSelectedItem] = useState<any>(null)

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

  // Quick add to cart handler
  const handleQuickAdd = (item: any) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      image_url: item.image_url,
      notes: '',
      selectedOptions: []
    })
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
        <div className="h-screen bg-[#f5f5f5] flex flex-col overflow-hidden">
          {/* Top Navigation */}
          <div className="flex-shrink-0 bg-white border-b shadow-sm">
            <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between">
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

          {/* Hero Section */}
          <div className="flex-shrink-0 relative bg-gradient-to-r from-amber-50 via-orange-50 to-red-50 overflow-hidden" style={{ height: '300px' }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center z-10">
                <div className="inline-block bg-primary text-white px-6 py-2 rounded-full font-bold text-3xl mb-4 shadow-lg">
                  Special Offer
                </div>
                <h2 className="text-5xl font-bold text-gray-800 mb-2">{chain.name}</h2>
                <p className="text-2xl text-gray-600">Discover Our Menu</p>
              </div>
            </div>
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5" style={{
              backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
              backgroundSize: '30px 30px'
            }} />
          </div>

          {/* Category Bar - Pizzaro Style */}
          <div className="flex-shrink-0 bg-primary shadow-lg">
            <div className="max-w-screen-2xl mx-auto">
              <div className="flex items-center justify-center gap-1 py-2 overflow-x-auto">
                {categories.map((category) => {
                  const Icon = getIconComponent(category.icon || 'Grid3X3')
                  const isSelected = logic.selectedCategory === category.id
                  return (
                    <button
                      key={category.id}
                      onClick={() => logic.setSelectedCategory(category.id)}
                      className={cn(
                        "flex flex-col items-center justify-center px-6 py-3 min-w-[100px] transition-all",
                        isSelected
                          ? "bg-white/20 text-white"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Icon className="w-6 h-6 mb-1" />
                      <span className="text-sm font-medium">{category.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex flex-1 min-h-0">
            {/* Products Area */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="max-w-screen-2xl mx-auto px-6 py-8">
                  <div className="grid grid-cols-4 gap-6">
                    {menuItems.map((item) => (
                      <div
                        key={item.id}
                        className="group bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
                        onClick={() => setSelectedItem(item)}
                      >
                        {/* Image */}
                        <div className="relative aspect-square bg-gray-100 overflow-hidden">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              No Image
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-4 text-center">
                          <h3 className="font-bold text-lg mb-2 line-clamp-1">{item.name}</h3>
                          {item.description && (
                            <p className="text-sm text-gray-500 mb-3 line-clamp-2 min-h-[40px]">{item.description}</p>
                          )}
                          <div className="flex items-center justify-center gap-3">
                            <span className="text-xl font-bold text-primary">${item.price.toFixed(2)}</span>
                            <Button
                              size="sm"
                              className="bg-primary hover:bg-primary/90"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleQuickAdd(item)
                              }}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {menuItems.length === 0 && (
                    <div className="text-center py-20">
                      <p className="text-gray-500 text-lg">No items found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Cart Sidebar */}
            <div className="w-96 bg-white border-l shadow-lg">
              <ScrollArea className="h-full">
                <CartSidebar />
              </ScrollArea>
            </div>
          </div>
        </div>
      )}

      {/* Tablet Layout */}
      {isTablet && (
        <div className="h-screen bg-[#f5f5f5] flex flex-col overflow-hidden">
          <div className="flex-shrink-0 bg-white border-b px-4 py-3">
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

          <div className="flex-shrink-0 bg-primary">
            <div className="flex gap-1 py-2 px-4 overflow-x-auto">
              {categories.map((category) => {
                const Icon = getIconComponent(category.icon || 'Grid3X3')
                const isSelected = logic.selectedCategory === category.id
                return (
                  <button
                    key={category.id}
                    onClick={() => logic.setSelectedCategory(category.id)}
                    className={cn(
                      "flex flex-col items-center px-4 py-2 min-w-[80px] transition-all whitespace-nowrap",
                      isSelected ? "bg-white/20 text-white" : "text-white/80"
                    )}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span className="text-xs">{category.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 grid grid-cols-3 gap-4">
                  {menuItems.map((item) => (
                    <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                      <div className="aspect-square bg-gray-100">
                        {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />}
                      </div>
                      <div className="p-3 text-center">
                        <h3 className="font-semibold mb-1 line-clamp-1">{item.name}</h3>
                        <p className="text-sm text-gray-500 mb-2 line-clamp-1">{item.description}</p>
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-bold text-primary">${item.price.toFixed(2)}</span>
                          <Button size="sm" onClick={() => handleQuickAdd(item)}>Add</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="w-80 bg-white border-l">
              <ScrollArea className="h-full">
                <CartSidebar />
              </ScrollArea>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Layout */}
      {isMobile && (
        <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
          <div className="bg-white border-b p-4">
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

          <div className="bg-primary">
            <div className="flex gap-1 py-2 px-4 overflow-x-auto">
              {categories.map((category) => {
                const Icon = getIconComponent(category.icon || 'Grid3X3')
                const isSelected = logic.selectedCategory === category.id
                return (
                  <button
                    key={category.id}
                    onClick={() => logic.setSelectedCategory(category.id)}
                    className={cn(
                      "flex flex-col items-center px-3 py-2 min-w-[70px] whitespace-nowrap",
                      isSelected ? "bg-white/20 text-white" : "text-white/80"
                    )}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span className="text-xs">{category.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3">
              {menuItems.map((item) => (
                <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="aspect-square bg-gray-100">
                    {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="p-3 text-center">
                    <h3 className="font-semibold text-sm mb-1 line-clamp-1">{item.name}</h3>
                    <span className="font-bold text-primary text-sm">${item.price.toFixed(2)}</span>
                    <Button size="sm" className="w-full mt-2" onClick={() => handleQuickAdd(item)}>Add</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <MobileCart
            showWaiterButton={orderContext.isQROrder && !!orderContext.tableNumber && !logic.waiterButtonHidden}
            waiterButtonSlot={
              orderContext.isQROrder && orderContext.tableNumber && !logic.waiterButtonHidden ? (
                <FloatingWaiterButton branchId={branch.id} tableNumber={orderContext.tableNumber} zone={orderContext.zone} isHidden={logic.waiterButtonHidden} onWaiterCalled={() => logic.setWaiterButtonHidden(true)} />
              ) : undefined
            }
          />
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
    </OrderContextProvider>
  )
}
