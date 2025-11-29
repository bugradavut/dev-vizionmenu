"use client"

import { useEffect } from 'react'
import { MapPin, ChevronDown, Store } from 'lucide-react'
import { OrderHeader } from '@/app/order/components/order-header'
import { CategorySidebar } from '@/app/order/components/category-sidebar'
import { MenuGrid } from '@/app/order/components/menu-grid'
import { CartSidebar } from '@/app/order/components/cart-sidebar'
import { MobileCart } from '@/app/order/components/mobile-cart'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { FloatingWaiterButton } from '@/components/floating-waiter-button'
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
import type { ThemeLayoutProps } from '../theme.types'

export default function DefaultLayout(props: ThemeLayoutProps) {
  const { chain, branch, customerMenu, orderContext, availableBranches = [], onBranchChange } = props

  const { isMobile, isTablet, isDesktop } = useResponsive()

  // Use shared business logic
  const logic = useMenuLogic({
    branch,
    chain,
    customerMenu,
    orderContext,
    availableBranches,
    onBranchChange
  })

  // Apply primary color as CSS variable
  const primaryColor = branch.theme_config?.colors?.primary

  useEffect(() => {
    if (primaryColor) {
      document.documentElement.style.setProperty('--primary', primaryColor)
    }
    return () => {
      if (primaryColor) {
        document.documentElement.style.removeProperty('--primary')
      }
    }
  }, [primaryColor])

  // Branch switcher component
  const BranchSwitcher = ({ className = '' }: { className?: string }) => {
    if (!logic.availableBranches.length || logic.availableBranches.length === 1 || orderContext.isQROrder) {
      return (
        <div className={`flex items-center gap-1 text-muted-foreground ${className}`}>
          <MapPin className="w-4 h-4" />
          <span className="truncate">{branch.name}</span>
        </div>
      )
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className={`h-auto p-0 hover:bg-transparent ${className}`}>
            <div className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <MapPin className="w-4 h-4" />
              <span className="truncate">{branch.name}</span>
              <ChevronDown className="w-3 h-3 ml-1" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {logic.availableBranches.map((b) => (
            <DropdownMenuItem
              key={b.id}
              onClick={() => logic.handleBranchChange(b)}
              className="flex items-center gap-2"
              disabled={b.id === branch.id}
            >
              <Store className="w-4 h-4" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{b.name}</div>
                {b.address && (
                  <div className="text-xs text-muted-foreground truncate">
                    {typeof b.address === 'string' ? b.address : `${b.address.street}, ${b.address.city}`}
                  </div>
                )}
              </div>
              {b.id === branch.id && (
                <div className="w-2 h-2 rounded-full bg-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Create order context for existing components
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
      {/* Desktop Layout */}
      {isDesktop && (
        <div className="h-screen bg-background flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 bg-card border-b">
            <div className="flex items-center justify-between p-4">
              {/* Left Side */}
              <div className="flex items-center gap-4">
                {chain.logo_url && (
                  <img
                    src={chain.logo_url}
                    alt={chain.name}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  />
                )}

                <div className="flex items-center gap-4">
                  <div>
                    <h1 className="text-lg font-bold">{chain.name}</h1>
                    <BranchSwitcher className="text-sm" />
                  </div>

                  {orderContext.source === 'web' && (
                    <div className="flex items-center">
                      <OrderHeader
                        branchName={branch.name}
                        branchId={branch.id}
                        onSearch={() => {}}
                        hideTitle={true}
                        showMinimumOrderOnly={true}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side */}
              <div className="flex items-center gap-4">
                <div>
                  <OrderHeader
                    branchName={branch.name}
                    branchId={branch.id}
                    branchAddress={typeof branch.address === 'string' ? branch.address : `${branch.address?.street || ''}, ${branch.address?.city || ''}`}
                    onSearch={logic.setSearchQuery}
                    hideTitle={true}
                  />
                </div>

                {orderContext.isQROrder && orderContext.tableNumber && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-blue-900">
                      {orderContext.zone === 'Screen'
                        ? (logic.language === 'fr' ? 'Écran' : 'Screen')
                        : (logic.language === 'fr' ? `Table ${orderContext.tableNumber}` : `Table ${orderContext.tableNumber}`)
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Layout: Categories | Menu | Cart */}
          <div className="flex flex-1 min-h-0">
            {/* Left Sidebar - Categories */}
            <div className="w-64 bg-card border-r border-border">
              <CategorySidebar
                selectedCategory={logic.selectedCategory}
                onCategorySelect={logic.setSelectedCategory}
                customerMenu={customerMenu}
                loading={false}
              />
            </div>

            {/* Center - Menu Grid */}
            <div className="flex-1">
              <ScrollArea className="h-full">
                <MenuGrid
                  selectedCategory={logic.selectedCategory}
                  customerMenu={customerMenu}
                  loading={false}
                  searchQuery={logic.searchQuery}
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
          <div className="flex-shrink-0 bg-card border-b">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {chain.logo_url && (
                  <img
                    src={chain.logo_url}
                    alt={chain.name}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                )}

                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-bold text-base">{chain.name}</div>
                    <BranchSwitcher className="text-sm" />
                  </div>

                  {orderContext.source === 'web' && (
                    <OrderHeader
                      branchName={branch.name}
                      branchId={branch.id}
                      onSearch={() => {}}
                      hideTitle={true}
                      showMinimumOrderOnly={true}
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <OrderHeader
                    branchName={branch.name}
                    branchId={branch.id}
                    branchAddress={typeof branch.address === 'string' ? branch.address : `${branch.address?.street || ''}, ${branch.address?.city || ''}`}
                    onSearch={logic.setSearchQuery}
                    hideTitle={true}
                  />
                </div>

                {orderContext.isQROrder && orderContext.tableNumber && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-blue-900">
                      {orderContext.zone === 'Screen'
                        ? (logic.language === 'fr' ? 'Écran' : 'Screen')
                        : (logic.language === 'fr' ? `Table ${orderContext.tableNumber}` : `Table ${orderContext.tableNumber}`)
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Category Horizontal Tabs */}
          <div className="bg-card border-b border-border px-4 py-3 flex-shrink-0">
            <CategorySidebar
              selectedCategory={logic.selectedCategory}
              onCategorySelect={logic.setSelectedCategory}
              customerMenu={customerMenu}
              loading={false}
              isMobile={true}
            />
          </div>

          {/* Main Layout - Menu + Cart Side by Side */}
          <div className="flex flex-1 min-h-0">
            <div className="flex-1">
              <ScrollArea className="h-full">
                <MenuGrid
                  selectedCategory={logic.selectedCategory}
                  customerMenu={customerMenu}
                  loading={false}
                  searchQuery={logic.searchQuery}
                />
              </ScrollArea>
            </div>

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
          {/* Mobile header */}
          <div className="bg-card border-b p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {chain.logo_url && (
                  <img
                    src={chain.logo_url}
                    alt={chain.name}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                )}

                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-base truncate">{chain.name}</div>
                    <BranchSwitcher className="text-sm" />
                  </div>

                  {orderContext.source === 'web' && (
                    <div className="flex-shrink-0">
                      <OrderHeader
                        branchName={branch.name}
                        branchId={branch.id}
                        onSearch={() => {}}
                        hideTitle={true}
                        showMinimumOrderOnly={true}
                      />
                    </div>
                  )}
                </div>
              </div>

              {orderContext.isQROrder && orderContext.tableNumber && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-md flex-shrink-0">
                  <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {orderContext.zone === 'Screen'
                      ? 'Screen'
                      : orderContext.zone
                        ? `Table ${orderContext.tableNumber} - ${orderContext.zone}`
                        : `Table ${orderContext.tableNumber}`
                    }
                  </span>
                </div>
              )}
            </div>

            <div>
              <OrderHeader
                branchName={branch.name}
                branchId={branch.id}
                branchAddress={typeof branch.address === 'string' ? branch.address : `${branch.address?.street || ''}, ${branch.address?.city || ''}`}
                onSearch={logic.setSearchQuery}
                hideTitle={true}
              />
            </div>
          </div>

          {/* Category tabs */}
          <div className="bg-card border-b border-border px-4 py-3 flex-shrink-0">
            <CategorySidebar
              selectedCategory={logic.selectedCategory}
              onCategorySelect={logic.setSelectedCategory}
              customerMenu={customerMenu}
              loading={false}
              isMobile={true}
            />
          </div>

          {/* Menu Grid */}
          <div className="flex-1 overflow-y-auto">
            <MenuGrid
              selectedCategory={logic.selectedCategory}
              customerMenu={customerMenu}
              loading={false}
              searchQuery={logic.searchQuery}
            />
          </div>

          {/* Mobile Cart */}
          <MobileCart
            showWaiterButton={orderContext.isQROrder && !!orderContext.tableNumber && !logic.waiterButtonHidden}
            waiterButtonSlot={
              orderContext.isQROrder && orderContext.tableNumber && !logic.waiterButtonHidden ? (
                <FloatingWaiterButton
                  branchId={branch.id}
                  tableNumber={orderContext.tableNumber}
                  zone={orderContext.zone}
                  isHidden={logic.waiterButtonHidden}
                  onWaiterCalled={() => logic.setWaiterButtonHidden(true)}
                />
              ) : undefined
            }
          />
        </div>
      )}

      {/* QR Floating Waiter Call Button - Tablet Only */}
      {orderContext.isQROrder && orderContext.tableNumber && isTablet && !logic.waiterButtonHidden && (
        <FloatingWaiterButton
          branchId={branch.id}
          tableNumber={orderContext.tableNumber}
          zone={orderContext.zone}
          isHidden={logic.waiterButtonHidden}
          onWaiterCalled={() => logic.setWaiterButtonHidden(true)}
        />
      )}

      {/* Cart Clear Confirmation Dialog */}
      <AlertDialog open={logic.showCartClearDialog} onOpenChange={() => {}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {logic.language === 'fr' ? 'Changer de succursale ?' : 'Switch Branch?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {logic.language === 'fr'
                ? 'Votre panier contient des articles. Changer de succursale effacera votre panier car le menu peut être différent. Voulez-vous continuer ?'
                : 'Your cart contains items. Switching branches will clear your cart since the menu may be different. Do you want to continue?'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={logic.cancelBranchChange}>
              {logic.language === 'fr' ? 'Annuler' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={logic.confirmBranchChange}>
              {logic.language === 'fr' ? 'Continuer' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restaurant Closed Modal */}
      <RestaurantClosedModal
        isOpen={logic.showRestaurantClosedModal}
        onClose={logic.handleRestaurantClosedModalClose}
        onScheduleOrder={logic.allowSchedulingWhenClosed ? logic.handleScheduleOrder : undefined}
        restaurantHours={logic.migratedRestaurantHours ?? undefined}
        isBusy={logic.migratedRestaurantHours ? logic.isRestaurantMarkedAsBusy(logic.migratedRestaurantHours) : false}
      />

      {/* Pre-Order Modal */}
      <PreOrderModal
        isOpen={logic.showPreOrderModal}
        onClose={logic.handlePreOrderClose}
        onConfirm={logic.handlePreOrderConfirm}
        currentSchedule={logic.preOrder.isPreOrder ? {
          date: logic.preOrder.scheduledDate || '',
          time: logic.preOrder.scheduledTime || ''
        } : undefined}
        restaurantHours={logic.migratedRestaurantHours}
      />
    </OrderContextProvider>
  )
}
