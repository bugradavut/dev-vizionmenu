"use client"

import { createContext, useContext, ReactNode } from 'react'

export interface OrderContext {
  chainSlug?: string // NEW: Add chainSlug support
  source: 'qr' | 'web'
  branchId?: string
  tableNumber?: number
  zone?: string
  isQROrder: boolean
  selectedOrderType?: 'dine_in' | 'takeaway' | 'delivery' | null // Also missing this
}

const OrderContextContext = createContext<OrderContext | undefined>(undefined)

interface OrderContextProviderProps {
  value: OrderContext
  children: ReactNode
}

export function OrderContextProvider({ value, children }: OrderContextProviderProps) {
  return (
    <OrderContextContext.Provider value={value}>
      {children}
    </OrderContextContext.Provider>
  )
}

export function useOrderContext(): OrderContext {
  const context = useContext(OrderContextContext)
  if (context === undefined) {
    throw new Error('useOrderContext must be used within an OrderContextProvider')
  }
  return context
}