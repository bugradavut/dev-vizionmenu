"use client"

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react'

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
  setRestaurantStatus: (isOpen: boolean) => void
  clearCartIfClosed: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

interface CartContextProviderProps {
  children: ReactNode
}

const TAX_RATE = 0.13 // 13% HST (Canadian tax)
const CART_STORAGE_KEY = 'vizion-menu-cart'
const PRE_ORDER_STORAGE_KEY = 'vizion-menu-pre-order'

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
        parsed.scheduledDateTime = new Date(parsed.scheduledDateTime)
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

export function CartContextProvider({ children }: CartContextProviderProps) {
  const [items, setItems] = useState<CartItem[]>([])
  const [preOrder, setPreOrderState] = useState<PreOrderData>({ isPreOrder: false })
  const [isLoaded, setIsLoaded] = useState(false)
  const [isRestaurantOpen, setIsRestaurantOpen] = useState(true) // Default to open for safety

  // Load cart and pre-order from localStorage on mount
  useEffect(() => {
    const savedCart = loadCartFromStorage()
    const savedPreOrder = loadPreOrderFromStorage()
    setItems(savedCart)
    setPreOrderState(savedPreOrder)
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
        return [...prev, { ...item, quantity }]
      }
    })
  }, [])

  const removeItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId))
  }, [])

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId)
      return
    }

    setItems(prev => 
      prev.map(item =>
        item.id === itemId
          ? { ...item, quantity }
          : item
      )
    )
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
  const setRestaurantStatus = useCallback((isOpen: boolean) => {
    setIsRestaurantOpen(isOpen)
  }, [])

  const clearCartIfClosed = useCallback(() => {
    if (!isRestaurantOpen && items.length > 0) {
      setItems([])
      // Clear localStorage as well
      if (typeof window !== 'undefined') {
        localStorage.removeItem(CART_STORAGE_KEY)
      }
    }
  }, [isRestaurantOpen, items.length])

  // Auto-clear cart when restaurant becomes closed
  useEffect(() => {
    clearCartIfClosed()
  }, [clearCartIfClosed])

  // Block adding items when restaurant is closed
  const canAddToCart = isRestaurantOpen

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
    setRestaurantStatus,
    clearCartIfClosed
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