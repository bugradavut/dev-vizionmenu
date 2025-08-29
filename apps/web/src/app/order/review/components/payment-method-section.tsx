"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCustomerBranchSettings } from '@/hooks/use-customer-branch-settings'
import { useOrderContext } from '../../contexts/order-context'

interface PaymentMethodSectionProps {
  onPaymentMethodChange?: (method: 'online' | 'counter') => void
}

export function PaymentMethodSection({ onPaymentMethodChange }: PaymentMethodSectionProps) {
  const { branchId } = useOrderContext()
  const { settings } = useCustomerBranchSettings({ branchId: branchId || undefined })
  
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'counter'>('online')
  
  // Get counter payment enabled status from branch settings
  const isCounterPaymentEnabled = settings?.paymentSettings?.allowCounterPayment ?? false
  const isOnlinePaymentEnabled = settings?.paymentSettings?.allowOnlinePayment ?? true

  const handlePaymentMethodChange = (method: 'online' | 'counter') => {
    setPaymentMethod(method)
    onPaymentMethodChange?.(method)
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant={paymentMethod === 'online' ? 'default' : 'outline'}
          onClick={() => handlePaymentMethodChange('online')}
          disabled={!isOnlinePaymentEnabled}
          className={`w-full h-11 rounded-lg transition-all ${
            !isOnlinePaymentEnabled 
              ? 'cursor-not-allowed bg-gray-50 text-gray-500 border-2 border-gray-200' 
              : paymentMethod === 'online' 
                ? 'bg-orange-50 text-[#FF6922] border-2 border-[#FF6922] hover:bg-orange-100' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Pay online
        </Button>
        <Button
          variant={paymentMethod === 'counter' ? 'default' : 'outline'}
          onClick={() => handlePaymentMethodChange('counter')}
          disabled={!isCounterPaymentEnabled}
          className={`w-full h-11 rounded-lg transition-all ${
            !isCounterPaymentEnabled 
              ? 'cursor-not-allowed bg-gray-50 text-gray-500 border-2 border-gray-200' 
              : paymentMethod === 'counter'
                ? 'bg-orange-50 text-[#FF6922] border-2 border-[#FF6922] hover:bg-orange-100'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Pay at the counter
        </Button>
      </div>
    </div>
  )
}