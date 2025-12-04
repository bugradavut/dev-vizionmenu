"use client"

import { useState, useEffect } from 'react'
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
import { useCart } from '@/app/order/contexts/cart-context'
import { useLanguage } from '@/contexts/language-context'
import { useCustomerBranchSettings } from '@/hooks/use-customer-branch-settings'
import { migrateRestaurantHours, isRestaurantMarkedAsBusy, type RestaurantHours } from '@/utils/restaurant-hours'
import { RestaurantClosedModal } from '@/components/modals/restaurant-closed-modal'
import { PreOrderModal } from '@/app/order/components/pre-order-modal'
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
    zone?: string
    source: 'qr' | 'web'
    isQROrder: boolean
    orderType?: 'takeout' | 'delivery'
  }
  availableBranches?: Branch[]
  onBranchChange?: (branch: Branch) => void
}

export function MenuExperience({
  chain,
  branch,
  customerMenu,
  orderContext,
  availableBranches = [],
  onBranchChange
}: MenuExperienceProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showCartClearDialog, setShowCartClearDialog] = useState(false)
  const [pendingBranchChange, setPendingBranchChange] = useState<Branch | null>(null)
  const [showRestaurantClosedModal, setShowRestaurantClosedModal] = useState(false)
  const [showPreOrderModal, setShowPreOrderModal] = useState(false)
  const [hasUserDismissedModal, setHasUserDismissedModal] = useState(false)
  const [waiterButtonHidden, setWaiterButtonHidden] = useState(false)

  const { isMobile, isTablet, isDesktop } = useResponsive()
  const { clearCart, itemCount, isRestaurantOpen, setRestaurantHours, preOrder, setPreOrder } = useCart()
  const { language } = useLanguage()

  // Get branch settings for restaurant hours
  const { settings, loading: settingsLoading } = useCustomerBranchSettings({
    branchId: branch.id,
    autoLoad: true
  })

  const allowSchedulingWhenClosed = true // Enable scheduling when restaurant is closed

  // Local state for migrated restaurant hours to pass to PreOrderModal
  const [migratedRestaurantHours, setMigratedRestaurantHours] = useState<RestaurantHours | null>(null)

  // Update cart context with restaurant hours
  useEffect(() => {
    if (!settingsLoading) {
      const migratedHours = settings.restaurantHours ? migrateRestaurantHours(settings.restaurantHours as unknown as RestaurantHours) : null;
      setMigratedRestaurantHours(migratedHours)
      setRestaurantHours(migratedHours);
    }
  }, [settings.restaurantHours, settingsLoading, setRestaurantHours])

  // Show/hide restaurant closed modal based on restaurant status
  useEffect(() => {
    if (!settingsLoading) {
      if (!isRestaurantOpen && !preOrder.isPreOrder && !hasUserDismissedModal) {
        setShowRestaurantClosedModal(true)
      } else if (isRestaurantOpen) {
        setShowRestaurantClosedModal(false)
        setHasUserDismissedModal(false) // Reset dismissal when restaurant opens
      }
    }
  }, [isRestaurantOpen, preOrder.isPreOrder, hasUserDismissedModal, settingsLoading])

  // Branch change handlers
  const handleBranchChange = (branch: Branch) => {
    // If cart has items, show confirmation dialog
    if (itemCount > 0) {
      setPendingBranchChange(branch)
      setShowCartClearDialog(true)
      return
    }
    
    // If no items in cart, proceed with branch change
    executeBranchChange(branch)
  }

  const executeBranchChange = (branch: Branch) => {
    // Clear cart since menu items might be different across branches
    clearCart()
    
    // Call parent handler
    onBranchChange?.(branch)
  }

  const confirmBranchChange = () => {
    if (pendingBranchChange) {
      executeBranchChange(pendingBranchChange)
      setPendingBranchChange(null)
    }
    setShowCartClearDialog(false)
  }

  const cancelBranchChange = () => {
    setPendingBranchChange(null)
    setShowCartClearDialog(false)
  }

  // Pre-order modal handlers
  const handleScheduleOrder = () => {
    setShowRestaurantClosedModal(false)
    setShowPreOrderModal(true)
  }

  const handlePreOrderConfirm = (date: string, time: string) => {
    const scheduledDateTime = new Date(`${date} ${time}`)
    setPreOrder({
      isPreOrder: true,
      scheduledDate: date,
      scheduledTime: time,
      scheduledDateTime
    })
    setShowPreOrderModal(false)
    setShowRestaurantClosedModal(false) // Close restaurant modal
    setHasUserDismissedModal(true)
  }

  const handlePreOrderClose = () => {
    setShowPreOrderModal(false)
  }

  // Branch switcher component
  const BranchSwitcher = ({ className = '' }: { className?: string }) => {
    if (!availableBranches.length || availableBranches.length === 1 || orderContext.isQROrder) {
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
          {availableBranches.map((b) => (
            <DropdownMenuItem
              key={b.id}
              onClick={() => handleBranchChange(b)}
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
    chainSlug: orderContext.chainSlug, // ✅ Pass chainSlug for checkout navigation
    source: orderContext.source,
    branchId: branch.id,
    tableNumber: orderContext.tableNumber,
    zone: orderContext.zone,
    isQROrder: orderContext.isQROrder
  }

  return (
    <OrderContextProvider value={legacyOrderContext}>
      {isDesktop && (
        <div className="h-screen bg-background flex flex-col overflow-hidden">
          {/* Enhanced Header with Chain/Branch Info */}
          <div className="flex-shrink-0 bg-card border-b">
            <div className="flex items-center justify-between p-4">
              {/* Left Side: Logo + Restaurant Info + Minimum Order */}
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
                <div className="flex items-center gap-4">
                  <div>
                    <h1 className="text-lg font-bold">{chain.name}</h1>
                    <BranchSwitcher className="text-sm" />
                  </div>
                  
                  {/* Minimum Order Amount - Desktop */}
                  {orderContext.source === 'web' && (
                    <div className="flex items-center">
                      <OrderHeader 
                        branchName={branch.name}
                        branchId={branch.id}
                        onSearch={() => {}} // We'll handle search on the right side
                        hideTitle={true}
                        showMinimumOrderOnly={true}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Search + Language + Schedule + QR Info */}
              <div className="flex items-center gap-4">
                {/* Search */}
                <div>
                  <OrderHeader 
                    branchName={branch.name}
                    branchId={branch.id}
                    branchAddress={typeof branch.address === 'string' ? branch.address : `${branch.address?.street || ''}, ${branch.address?.city || ''}`}
                    onSearch={setSearchQuery}
                    hideTitle={true}
                  />
                </div>

                {/* QR Table Info */}
                {orderContext.isQROrder && orderContext.tableNumber && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-blue-900">
                      {/* Show "Screen" for Screen zone, hide table number to avoid confusion */}
                      {orderContext.zone === 'Screen' 
                        ? (language === 'fr' ? 'Écran' : 'Screen') 
                        : (language === 'fr' ? `Table ${orderContext.tableNumber}` : `Table ${orderContext.tableNumber}`)
                      }
                    </span>
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
              {/* Left Side: Logo + Restaurant Info + Minimum Order */}
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
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-bold text-base">{chain.name}</div>
                    <BranchSwitcher className="text-sm" />
                  </div>
                  
                  {/* Minimum Order Amount - Tablet */}
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

              {/* Right Side: Search + Language + Schedule + QR Info */}
              <div className="flex items-center gap-3">
                {/* Search */}
                <div>
                  <OrderHeader 
                    branchName={branch.name}
                    branchId={branch.id}
                    branchAddress={typeof branch.address === 'string' ? branch.address : `${branch.address?.street || ''}, ${branch.address?.city || ''}`}
                    onSearch={setSearchQuery}
                    hideTitle={true}
                  />
                </div>

                {/* QR Table Info */}
                {orderContext.isQROrder && orderContext.tableNumber && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-blue-900">
                      {/* Show "Screen" for Screen zone, hide table number to avoid confusion */}
                      {orderContext.zone === 'Screen' 
                        ? (language === 'fr' ? 'Écran' : 'Screen') 
                        : (language === 'fr' ? `Table ${orderContext.tableNumber}` : `Table ${orderContext.tableNumber}`)
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
              {/* Left Side: Logo + Restaurant Info + Minimum Order */}
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
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-base truncate">{chain.name}</div>
                    <BranchSwitcher className="text-sm" />
                  </div>

                  {/* Minimum Order Amount - Mobile */}
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

              {/* QR Table/Zone Info with consistent styling */}
              {orderContext.isQROrder && orderContext.tableNumber && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-md flex-shrink-0">
                  <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {/* Zone-based display logic - consistent with other pages */}
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

            {/* Bottom Row: Search + Language + Schedule */}
            <div>
              <OrderHeader
                branchName={branch.name}
                branchId={branch.id}
                branchAddress={typeof branch.address === 'string' ? branch.address : `${branch.address?.street || ''}, ${branch.address?.city || ''}`}
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


          {/* Mobile Cart with Waiter Button */}
          <MobileCart
            showWaiterButton={orderContext.isQROrder && !!orderContext.tableNumber && !waiterButtonHidden}
            waiterButtonSlot={
              orderContext.isQROrder && orderContext.tableNumber && !waiterButtonHidden ? (
                <FloatingWaiterButton
                  branchId={branch.id}
                  tableNumber={orderContext.tableNumber}
                  zone={orderContext.zone}
                  isHidden={waiterButtonHidden}
                  onWaiterCalled={() => setWaiterButtonHidden(true)}
                />
              ) : undefined
            }
          />
        </div>
      )}

      {/* QR Floating Waiter Call Button - Tablet Only */}
      {orderContext.isQROrder && orderContext.tableNumber && isTablet && !waiterButtonHidden && (
        <FloatingWaiterButton
          branchId={branch.id}
          tableNumber={orderContext.tableNumber}
          zone={orderContext.zone}
          isHidden={waiterButtonHidden}
          onWaiterCalled={() => setWaiterButtonHidden(true)}
        />
      )}

      {/* Cart Clear Confirmation Dialog */}
      <AlertDialog open={showCartClearDialog} onOpenChange={setShowCartClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'fr' ? 'Changer de succursale ?' : 'Switch Branch?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'fr' 
                ? 'Votre panier contient des articles. Changer de succursale effacera votre panier car le menu peut être différent. Voulez-vous continuer ?'
                : 'Your cart contains items. Switching branches will clear your cart since the menu may be different. Do you want to continue?'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelBranchChange}>
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmBranchChange}>
              {language === 'fr' ? 'Continuer' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restaurant Closed Modal */}
      <RestaurantClosedModal
        isOpen={showRestaurantClosedModal}
        onClose={() => {
          // Mark that user has dismissed the modal for this session
          setHasUserDismissedModal(true)
          setShowRestaurantClosedModal(false)
        }}
        onScheduleOrder={allowSchedulingWhenClosed ? handleScheduleOrder : undefined}
        restaurantHours={settings.restaurantHours ? migrateRestaurantHours(settings.restaurantHours as unknown as RestaurantHours) : undefined}
        isBusy={settings.restaurantHours ? isRestaurantMarkedAsBusy(settings.restaurantHours as unknown as RestaurantHours) : false}
        source={orderContext.source}
      />

      {/* Pre-Order Modal */}
      <PreOrderModal
        isOpen={showPreOrderModal}
        onClose={handlePreOrderClose}
        onConfirm={handlePreOrderConfirm}
        currentSchedule={preOrder.isPreOrder ? {
          date: preOrder.scheduledDate || '',
          time: preOrder.scheduledTime || ''
        } : undefined}
        restaurantHours={migratedRestaurantHours}
      />
    </OrderContextProvider>
  )
}