"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function PaymentMethodSection() {
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'counter'>('online')
  const [isCounterPaymentEnabled] = useState(false) // This will come from restaurant settings

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant={paymentMethod === 'online' ? 'default' : 'outline'}
          onClick={() => setPaymentMethod('online')}
          className="w-full"
        >
          Pay online
        </Button>
        <Button
          variant={paymentMethod === 'counter' ? 'default' : 'outline'}
          onClick={() => setPaymentMethod('counter')}
          disabled={!isCounterPaymentEnabled}
          className={`w-full ${!isCounterPaymentEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Pay at the counter
        </Button>
      </div>
    </div>
  )
}