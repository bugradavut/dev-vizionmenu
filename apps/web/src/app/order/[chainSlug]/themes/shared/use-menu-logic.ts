/**
 * Shared Menu Business Logic Hook
 * Contains all business logic used across all theme layouts
 * This ensures DRY principle - logic written once, used everywhere
 */

import { useState, useEffect, useMemo } from 'react'
import { useCart } from '@/app/order/contexts/cart-context'
import { useLanguage } from '@/contexts/language-context'
import { useCustomerBranchSettings } from '@/hooks/use-customer-branch-settings'
import { migrateRestaurantHours, isRestaurantMarkedAsBusy, type RestaurantHours } from '@/utils/restaurant-hours'
import type { Branch, Chain } from '@/services/customer-chains.service'
import type { CustomerMenu } from '@/services/customer-menu.service'

interface UseMenuLogicProps {
  branch: Branch
  chain: Chain
  customerMenu: CustomerMenu
  orderContext: {
    isQROrder: boolean
    tableNumber?: number
    zone?: string
  }
  availableBranches?: Branch[]
  onBranchChange?: (branch: Branch) => void
}

export function useMenuLogic({
  branch,
  chain,
  customerMenu,
  orderContext,
  availableBranches = [],
  onBranchChange
}: UseMenuLogicProps) {
  // State
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showCartClearDialog, setShowCartClearDialog] = useState(false)
  const [pendingBranchChange, setPendingBranchChange] = useState<Branch | null>(null)
  const [showRestaurantClosedModal, setShowRestaurantClosedModal] = useState(false)
  const [showPreOrderModal, setShowPreOrderModal] = useState(false)
  const [hasUserDismissedModal, setHasUserDismissedModal] = useState(false)
  const [waiterButtonHidden, setWaiterButtonHidden] = useState(false)

  // Contexts
  const { clearCart, itemCount, isRestaurantOpen, setRestaurantHours, preOrder, setPreOrder } = useCart()
  const { language } = useLanguage()

  // Branch settings
  const { settings, loading: settingsLoading } = useCustomerBranchSettings({
    branchId: branch.id,
    autoLoad: true
  })

  const allowSchedulingWhenClosed = true

  // Migrate restaurant hours with useMemo for performance
  const migratedRestaurantHours = useMemo(() => {
    return settings.restaurantHours
      ? migrateRestaurantHours(settings.restaurantHours as unknown as RestaurantHours)
      : null
  }, [settings.restaurantHours])

  // Update cart context with restaurant hours
  useEffect(() => {
    if (!settingsLoading && migratedRestaurantHours) {
      setRestaurantHours(migratedRestaurantHours)
    }
  }, [migratedRestaurantHours, settingsLoading, setRestaurantHours])

  // Show/hide restaurant closed modal
  useEffect(() => {
    if (!settingsLoading) {
      if (!isRestaurantOpen && !preOrder.isPreOrder && !hasUserDismissedModal) {
        setShowRestaurantClosedModal(true)
      } else if (isRestaurantOpen) {
        setShowRestaurantClosedModal(false)
        setHasUserDismissedModal(false)
      }
    }
  }, [isRestaurantOpen, preOrder.isPreOrder, hasUserDismissedModal, settingsLoading])

  // Branch change handlers
  const handleBranchChange = (newBranch: Branch) => {
    if (itemCount > 0) {
      setPendingBranchChange(newBranch)
      setShowCartClearDialog(true)
      return
    }
    executeBranchChange(newBranch)
  }

  const executeBranchChange = (newBranch: Branch) => {
    clearCart()
    onBranchChange?.(newBranch)
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

  // Pre-order handlers
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
    setShowRestaurantClosedModal(false)
    setHasUserDismissedModal(true)
  }

  const handlePreOrderClose = () => {
    setShowPreOrderModal(false)
  }

  const handleRestaurantClosedModalClose = () => {
    setHasUserDismissedModal(true)
    setShowRestaurantClosedModal(false)
  }

  return {
    // State
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    waiterButtonHidden,
    setWaiterButtonHidden,

    // Cart
    itemCount,
    isRestaurantOpen,
    preOrder,

    // Branch
    availableBranches,
    handleBranchChange,

    // Modals
    showCartClearDialog,
    confirmBranchChange,
    cancelBranchChange,
    showRestaurantClosedModal,
    handleRestaurantClosedModalClose,
    handleScheduleOrder,
    showPreOrderModal,
    handlePreOrderConfirm,
    handlePreOrderClose,

    // Settings
    settings,
    settingsLoading,
    allowSchedulingWhenClosed,
    migratedRestaurantHours,

    // Language
    language,

    // Data
    chain,
    branch,
    customerMenu,
    orderContext,

    // Utilities
    isRestaurantMarkedAsBusy,
    migrateRestaurantHours
  }
}
