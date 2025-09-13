'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export interface CustomerInfo {
  name: string
  phone: string
  email?: string
}

export interface AddressInfo {
  addressType: string
  streetAddress: string
  city: string
  province: string
  postalCode: string
  unitNumber?: string
  buzzerCode?: string
  suiteNumber?: string
  deliveryInstructions?: string
}

export interface OrderFormData {
  customerInfo: CustomerInfo
  addressInfo: AddressInfo
  orderType: 'dine_in' | 'takeaway' | 'delivery'
  paymentMethod: 'cash' | 'online'
  tip: number
  notes: string
}

interface OrderFormContextType {
  formData: OrderFormData
  updateCustomerInfo: (info: Partial<CustomerInfo>) => void
  updateAddressInfo: (info: Partial<AddressInfo>) => void
  updateOrderType: (type: 'dine_in' | 'takeaway') => void
  updatePaymentMethod: (method: 'cash' | 'online') => void
  updateTip: (amount: number) => void
  updateNotes: (notes: string) => void
  isFormValid: () => boolean
}

const OrderFormContext = createContext<OrderFormContextType | undefined>(undefined)

const initialFormData: OrderFormData = {
  customerInfo: {
    name: '',
    phone: '',
    email: ''
  },
  addressInfo: {
    addressType: 'home',
    streetAddress: '',
    city: '',
    province: '',
    postalCode: '',
    unitNumber: '',
    buzzerCode: '',
    suiteNumber: '',
    deliveryInstructions: ''
  },
  orderType: 'takeaway',
  paymentMethod: 'cash',
  tip: 0,
  notes: ''
}

export function OrderFormProvider({ children }: { children: ReactNode }) {
  const [formData, setFormData] = useState<OrderFormData>(initialFormData)

  const updateCustomerInfo = (info: Partial<CustomerInfo>) => {
    setFormData(prev => ({
      ...prev,
      customerInfo: { ...prev.customerInfo, ...info }
    }))
  }

  const updateAddressInfo = (info: Partial<AddressInfo>) => {
    setFormData(prev => ({
      ...prev,
      addressInfo: { ...prev.addressInfo, ...info }
    }))
  }

  const updateOrderType = (type: 'dine_in' | 'takeaway') => {
    setFormData(prev => ({ ...prev, orderType: type }))
  }

  const updatePaymentMethod = (method: 'cash' | 'online') => {
    setFormData(prev => ({ ...prev, paymentMethod: method }))
  }

  const updateTip = (amount: number) => {
    setFormData(prev => ({ ...prev, tip: amount }))
  }

  const updateNotes = (notes: string) => {
    setFormData(prev => ({ ...prev, notes }))
  }

  const isFormValid = (): boolean => {
    const { customerInfo, addressInfo, orderType } = formData
    
    // Customer info validation
    if (!customerInfo.name.trim() || !customerInfo.phone.trim()) {
      return false
    }

    // Address validation for takeaway orders
    if (orderType === 'takeaway') {
      if (!addressInfo.streetAddress.trim() || 
          !addressInfo.city.trim() || 
          !addressInfo.province.trim() || 
          !addressInfo.postalCode.trim()) {
        return false
      }
    }

    return true
  }

  const value: OrderFormContextType = {
    formData,
    updateCustomerInfo,
    updateAddressInfo,
    updateOrderType,
    updatePaymentMethod,
    updateTip,
    updateNotes,
    isFormValid
  }

  return (
    <OrderFormContext.Provider value={value}>
      {children}
    </OrderFormContext.Provider>
  )
}

export function useOrderForm() {
  const context = useContext(OrderFormContext)
  if (context === undefined) {
    throw new Error('useOrderForm must be used within an OrderFormProvider')
  }
  return context
}