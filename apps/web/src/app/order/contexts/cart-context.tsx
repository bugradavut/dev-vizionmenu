"use client"

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react'
import { shouldBlockOrders } from '@/utils/restaurant-hours'
import type { RestaurantHours } from '@/utils/restaurant-hours'

export interface CartItem {
  id: string
  name: string
  description: string
  price: number
  quantity: number
  image_url?: string
  category_id: string
  notes?: string
  customizations?: CartCustomization[]
}

export interface CartCustomization {
  id: string
  name: string
  price: number
}

export interface PreOrderData {
  isPreOrder: boolean
  scheduledDate?: string
  scheduledTime?: string
  scheduledDateTime?: Date
}

// SW-78 FO-114: Track removed items for Quebec SRS compliance
export interface RemovedCartItem {
  item: CartItem
  removedAt: string
  reason: 'user_removed' | 'quantity_decreased'
  originalQuantity: number
  removedQuantity: number
}

export interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  updateNotes: (itemId: string, notes: string) => void
  clearCart: () => void
  getItemQuantity: (itemId: string) => number
  subtotal: number
  tax: number
  total: number
  itemCount: number
  // Pre-order functions
  preOrder: PreOrderData
  setPreOrder: (preOrderData: PreOrderData) => void
  clearPreOrder: () => void
  // Restaurant status functions
  isRestaurantOpen: boolean
  canAddToCart: boolean
  setRestaurantHours: (hours: RestaurantHours | null) => void
  clearCartIfClosed: () => void
  // SW-78 FO-114: Removed items tracking for Quebec SRS compliance
  removedItems: RemovedCartItem[]
  clearRemovedItems: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

interface CartContextProviderProps {
  children: ReactNode
}

const TAX_RATE = 0.13 // 13% HST (Canadian tax)
const CART_STORAGE_KEY = 'vizion-menu-cart'
const PRE_ORDER_STORAGE_KEY = 'vizion-menu-pre-order'
const REMOVED_ITEMS_STORAGE_KEY = 'vizion-menu-removed-items' // SW-78 FO-114

// Helper functions for localStorage
const loadCartFromStorage = (): CartItem[] => {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Failed to load cart from localStorage:', error)
    return []
  }
}

const saveCartToStorage = (items: CartItem[]) => {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  } catch (error) {
    console.error('Failed to save cart to localStorage:', error)
  }
}

// Helper functions for pre-order localStorage
const loadPreOrderFromStorage = (): PreOrderData => {
  if (typeof window === 'undefined') return { isPreOrder: false }
  
  try {
    const stored = localStorage.getItem(PRE_ORDER_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Convert scheduledDateTime back to Date object if it exists
      if (parsed.scheduledDateTime) {
        const dateObj = new Date(parsed.scheduledDateTime)
        // Check if the date is valid
        if (isNaN(dateObj.getTime())) {
          console.warn('Invalid scheduledDateTime found in localStorage, removing pre-order data')
          // Clear invalid pre-order data
          localStorage.removeItem(PRE_ORDER_STORAGE_KEY)
          return { isPreOrder: false }
        }
        parsed.scheduledDateTime = dateObj
      }
      return parsed
    }
    return { isPreOrder: false }
  } catch (error) {
    console.error('Failed to load pre-order from localStorage:', error)
    return { isPreOrder: false }
  }
}

const savePreOrderToStorage = (preOrderData: PreOrderData) => {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(PRE_ORDER_STORAGE_KEY, JSON.stringify(preOrderData))
  } catch (error) {
    console.error('Failed to save pre-order to localStorage:', error)
  }
}

// SW-78 FO-114: Helper functions for removed items localStorage
const loadRemovedItemsFromStorage = (): RemovedCartItem[] => {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(REMOVED_ITEMS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Failed to load removed items from localStorage:', error)
    return []
  }
}

const saveRemovedItemsToStorage = (removedItems: RemovedCartItem[]) => {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(REMOVED_ITEMS_STORAGE_KEY, JSON.stringify(removedItems))
  } catch (error) {
    console.error('Failed to save removed items to localStorage:', error)
  }
}

export function CartContextProvider({ children }: CartContextProviderProps) {
  const [items, setItems] = useState<CartItem[]>([])
  const [preOrder, setPreOrderState] = useState<PreOrderData>({ isPreOrder: false })
  const [removedItems, setRemovedItems] = useState<RemovedCartItem[]>([]) // SW-78 FO-114
  const [isLoaded, setIsLoaded] = useState(false)
  const [isRestaurantOpen, setIsRestaurantOpen] = useState(true) // Default to open for safety
  const [restaurantHours, setRestaurantHours] = useState<RestaurantHours | null>(null)

  // Load cart, pre-order, and removed items from localStorage on mount
  useEffect(() => {
    const savedCart = loadCartFromStorage()
    const savedPreOrder = loadPreOrderFromStorage()
    const savedRemovedItems = loadRemovedItemsFromStorage() // SW-78 FO-114
    setItems(savedCart)
    setPreOrderState(savedPreOrder)
    setRemovedItems(savedRemovedItems) // SW-78 FO-114
    setIsLoaded(true)
  }, [])

  // Save cart to localStorage whenever items change (but not on initial load)
  useEffect(() => {
    if (isLoaded) {
      saveCartToStorage(items)
    }
  }, [items, isLoaded])

  // Save pre-order to localStorage whenever it changes (but not on initial load)
  useEffect(() => {
    if (isLoaded) {
      savePreOrderToStorage(preOrder)
    }
  }, [preOrder, isLoaded])

  // SW-78 FO-114: Save removed items to localStorage whenever they change (but not on initial load)
  useEffect(() => {
    if (isLoaded) {
      saveRemovedItemsToStorage(removedItems)
    }
  }, [removedItems, isLoaded])

  // Check restaurant status whenever hours change
  useEffect(() => {
    if (!restaurantHours) {
      setIsRestaurantOpen(true) // Default to open when no hours configured
      return
    }

    const isCurrentlyBlocked = shouldBlockOrders(restaurantHours)
    setIsRestaurantOpen(!isCurrentlyBlocked)
  }, [restaurantHours])

  // Auto-check restaurant status on focus/visibility change
  useEffect(() => {
    const handleFocus = () => {
      if (restaurantHours) {
        const isCurrentlyBlocked = shouldBlockOrders(restaurantHours)
        setIsRestaurantOpen(!isCurrentlyBlocked)
      }
    }

    const handleVisibilityChange = () => {
      if (!document.hidden && restaurantHours) {
        const isCurrentlyBlocked = shouldBlockOrders(restaurantHours)
        setIsRestaurantOpen(!isCurrentlyBlocked)
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [restaurantHours])

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    setItems(prev => {
      const existingIndex = prev.findIndex(cartItem => cartItem.id === item.id)

      if (existingIndex >= 0) {
        // Update existing item quantity
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity
        }
        return updated
      } else {
        // Add new item
        const newItem = { ...item, quantity }
        return [...prev, newItem]
      }
    })
  }, [])

  // SW-78 FO-114: Track removed items for Quebec SRS compliance
  const removeItem = useCallback((itemId: string) => {
    setItems(prev => {
      const itemToRemove = prev.find(item => item.id === itemId)

      if (itemToRemove) {
        // Log the removed item
        setRemovedItems(prevRemoved => [
          ...prevRemoved,
          {
            item: itemToRemove,
            removedAt: new Date().toISOString(),
            reason: 'user_removed',
            originalQuantity: itemToRemove.quantity,
            removedQuantity: itemToRemove.quantity
          }
        ])
      }

      return prev.filter(item => item.id !== itemId)
    })
  }, [])

  // SW-78 FO-114: Track quantity changes for Quebec SRS compliance
  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId)
      return
    }

    setItems(prev => {
      const existingItem = prev.find(item => item.id === itemId)

      // Track if quantity decreased (partial removal)
      if (existingItem && quantity < existingItem.quantity) {
        const removedQty = existingItem.quantity - quantity
        setRemovedItems(prevRemoved => [
          ...prevRemoved,
          {
            item: existingItem,
            removedAt: new Date().toISOString(),
            reason: 'quantity_decreased',
            originalQuantity: existingItem.quantity,
            removedQuantity: removedQty
          }
        ])
      }

      return prev.map(item =>
        item.id === itemId
          ? { ...item, quantity }
          : item
      )
    })
  }, [removeItem])

  const updateNotes = useCallback((itemId: string, notes: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, notes }
          : item
      )
    )
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    // Also clear from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CART_STORAGE_KEY)
    }
  }, [])

  // SW-78 FO-114: Clear removed items (typically after order is created)
  const clearRemovedItems = useCallback(() => {
    setRemovedItems([])
    // Also clear from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(REMOVED_ITEMS_STORAGE_KEY)
    }
  }, [])

  const setPreOrder = useCallback((preOrderData: PreOrderData) => {
    setPreOrderState(preOrderData)
  }, [])

  const clearPreOrder = useCallback(() => {
    const emptyPreOrder = { isPreOrder: false }
    setPreOrderState(emptyPreOrder)
    // Also clear from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(PRE_ORDER_STORAGE_KEY)
    }
  }, [])

  const getItemQuantity = useCallback((itemId: string) => {
    const item = items.find(item => item.id === itemId)
    return item?.quantity || 0
  }, [items])

  // Restaurant status functions
  const setRestaurantHoursCallback = useCallback((hours: RestaurantHours | null) => {
    setRestaurantHours(hours)
  }, [])

  const clearCartIfClosed = useCallback(() => {
    // Only clear cart if restaurant is closed AND no pre-order is active
    if (!isRestaurantOpen && !preOrder.isPreOrder && items.length > 0) {
      setItems([])
      // Clear localStorage as well
      if (typeof window !== 'undefined') {
        localStorage.removeItem(CART_STORAGE_KEY)
      }
    }
  }, [isRestaurantOpen, preOrder.isPreOrder, items.length])

  // Auto-clear cart when restaurant becomes closed
  useEffect(() => {
    clearCartIfClosed()
  }, [clearCartIfClosed])

  // Block adding items when restaurant is closed
  const canAddToCart = isRestaurantOpen || preOrder.isPreOrder

  // Calculate totals
  const subtotal = items.reduce((total, item) => total + (item.price * item.quantity), 0)
  const tax = subtotal * TAX_RATE
  const total = subtotal + tax
  const itemCount = items.reduce((count, item) => count + item.quantity, 0)

  // Override addItem to check restaurant status
  const safeAddItem = useCallback((item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    if (!canAddToCart) {
      console.warn('Cannot add items to cart: Restaurant is closed')
      return
    }
    addItem(item, quantity)
  }, [canAddToCart, addItem])

  const value: CartContextType = {
    items,
    addItem: safeAddItem,
    removeItem,
    updateQuantity,
    updateNotes,
    clearCart,
    getItemQuantity,
    subtotal,
    tax,
    total,
    itemCount,
    // Pre-order functions
    preOrder,
    setPreOrder,
    clearPreOrder,
    // Restaurant status functions
    isRestaurantOpen,
    canAddToCart,
    setRestaurantHours: setRestaurantHoursCallback,
    clearCartIfClosed,
    // SW-78 FO-114: Removed items tracking for Quebec SRS compliance
    removedItems,
    clearRemovedItems
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextType {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartContextProvider')
  }
  return context
}

