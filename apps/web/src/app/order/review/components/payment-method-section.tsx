"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useCustomerBranchSettings } from '@/hooks/use-customer-branch-settings'
import { useOrderContext } from '../../contexts/order-context'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'
import { WifiOff } from 'lucide-react'

// SW-78 FO-116 Step 1: Updated payment method types for Quebec WEB-SRM compliance
// Changed from binary 'online' | 'counter' to specific payment types: 'online' | 'cash' | 'card'
type PaymentMethodType = 'online' | 'cash' | 'card'

interface PaymentMethodSectionProps {
  onPaymentMethodChange?: (method: PaymentMethodType) => void
}

export function PaymentMethodSection({ onPaymentMethodChange }: PaymentMethodSectionProps) {
  const { branchId } = useOrderContext()
  const { settings } = useCustomerBranchSettings({ branchId: branchId || undefined })
  const { isOffline } = useNetworkStatus()
  const { language } = useLanguage()
  const t = translations[language] || translations.en

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('online')

  // SW-78 FO-116: Get payment method enabled status from branch settings
  const isOnlinePaymentEnabled = settings?.paymentSettings?.allowOnlinePayment ?? true
  const isCashPaymentEnabled = settings?.paymentSettings?.allowCashPayment ??
    (settings?.paymentSettings?.allowCounterPayment ?? false) // Fallback to legacy setting
  const isCardPaymentEnabled = settings?.paymentSettings?.allowCardPayment ??
    (settings?.paymentSettings?.allowCounterPayment ?? false) // Fallback to legacy setting

  // Auto-select cash payment when offline (default counter payment)
  useEffect(() => {
    if (isOffline && paymentMethod === 'online') {
      setPaymentMethod('cash')
      onPaymentMethodChange?.('cash')
    }
  }, [isOffline])

  const handlePaymentMethodChange = (method: PaymentMethodType) => {
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
            {t.orderPage.paymentMethods.offlineWarning}
          </p>
        </div>
      )}

      {/* SW-78 FO-116 Step 1: 3 payment methods for Quebec WEB-SRM compliance */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">
          {t.orderPage.paymentMethods.title}
        </p>

        <div className="grid grid-cols-3 gap-3">
          {/* Online Payment (En ligne / MVO) */}
          <Button
            variant={paymentMethod === 'online' ? 'default' : 'outline'}
            onClick={() => handlePaymentMethodChange('online')}
            disabled={!isOnlinePaymentAvailable}
            className={`flex items-center justify-center h-11 rounded-lg transition-all ${
              !isOnlinePaymentAvailable
                ? 'cursor-not-allowed bg-gray-50 text-gray-400 border-2 border-gray-200'
                : paymentMethod === 'online'
                  ? 'bg-orange-50 text-[#FF6922] border-2 border-[#FF6922] hover:bg-orange-100'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span className="font-medium">{t.orderPage.paymentMethods.online}</span>
          </Button>

          {/* Cash Payment (Comptant / ARG) */}
          <Button
            variant={paymentMethod === 'cash' ? 'default' : 'outline'}
            onClick={() => handlePaymentMethodChange('cash')}
            disabled={!isCashPaymentEnabled}
            className={`flex items-center justify-center h-11 rounded-lg transition-all ${
              !isCashPaymentEnabled
                ? 'cursor-not-allowed bg-gray-50 text-gray-400 border-2 border-gray-200'
                : paymentMethod === 'cash'
                  ? 'bg-orange-50 text-[#FF6922] border-2 border-[#FF6922] hover:bg-orange-100'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span className="font-medium">{t.orderPage.paymentMethods.cash}</span>
          </Button>

          {/* Card at Counter (Carte / CRE) */}
          <Button
            variant={paymentMethod === 'card' ? 'default' : 'outline'}
            onClick={() => handlePaymentMethodChange('card')}
            disabled={!isCardPaymentEnabled}
            className={`flex items-center justify-center h-11 rounded-lg transition-all ${
              !isCardPaymentEnabled
                ? 'cursor-not-allowed bg-gray-50 text-gray-400 border-2 border-gray-200'
                : paymentMethod === 'card'
                  ? 'bg-orange-50 text-[#FF6922] border-2 border-[#FF6922] hover:bg-orange-100'
                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span className="font-medium">{t.orderPage.paymentMethods.card}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}