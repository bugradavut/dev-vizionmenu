"use client"

import { createContext, useContext, useState, ReactNode, useCallback } from 'react'

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
}

const CartContext = createContext<CartContextType | undefined>(undefined)

interface CartContextProviderProps {
  children: ReactNode
}

const TAX_RATE = 0.13 // 13% HST (Canadian tax)

export function CartContextProvider({ children }: CartContextProviderProps) {
  const [items, setItems] = useState<CartItem[]>([])

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
  }, [])

  const getItemQuantity = useCallback((itemId: string) => {
    const item = items.find(item => item.id === itemId)
    return item?.quantity || 0
  }, [items])

  // Calculate totals
  const subtotal = items.reduce((total, item) => total + (item.price * item.quantity), 0)
  const tax = subtotal * TAX_RATE
  const total = subtotal + tax
  const itemCount = items.reduce((count, item) => count + item.quantity, 0)

  const value: CartContextType = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    updateNotes,
    clearCart,
    getItemQuantity,
    subtotal,
    tax,
    total,
    itemCount
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