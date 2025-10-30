"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useCustomerBranchSettings } from '@/hooks/use-customer-branch-settings'
import { useOrderContext } from '../../contexts/order-context'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { WifiOff } from 'lucide-react'

interface PaymentMethodSectionProps {
  onPaymentMethodChange?: (method: 'online' | 'counter') => void
}

export function PaymentMethodSection({ onPaymentMethodChange }: PaymentMethodSectionProps) {
  const { branchId } = useOrderContext()
  const { settings } = useCustomerBranchSettings({ branchId: branchId || undefined })
  const { isOffline } = useNetworkStatus()

  const [paymentMethod, setPaymentMethod] = useState<'online' | 'counter'>('online')

  // Get counter payment enabled status from branch settings
  const isCounterPaymentEnabled = settings?.paymentSettings?.allowCounterPayment ?? false
  const isOnlinePaymentEnabled = settings?.paymentSettings?.allowOnlinePayment ?? true

  // Auto-select counter payment when offline
  useEffect(() => {
    if (isOffline && paymentMethod === 'online') {
      setPaymentMethod('counter')
      onPaymentMethodChange?.('counter')
    }
  }, [isOffline])

  const handlePaymentMethodChange = (method: 'online' | 'counter') => {
    setPaymentMethod(method)
    onPaymentMethodChange?.(method)
  }

  // Disable online payment when offline
  const isOnlinePaymentAvailable = isOnlinePaymentEnabled && !isOffline

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      {isOffline && (
        <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
          <WifiOff className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-yellow-800">
            Online payment is unavailable in offline mode. Counter payment has been selected.
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant={paymentMethod === 'online' ? 'default' : 'outline'}
          onClick={() => handlePaymentMethodChange('online')}
          disabled={!isOnlinePaymentAvailable}
          className={`w-full h-11 rounded-lg transition-all ${
            !isOnlinePaymentAvailable
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