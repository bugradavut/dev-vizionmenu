"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { CreditCard } from "lucide-react"

// SW-78 FO-116 Step 1: Updated payment settings to support cash/card distinction
interface PaymentSettings {
  allowOnlinePayment: boolean
  allowCashPayment: boolean
  allowCardPayment: boolean
  // Legacy field for backward compatibility
  allowCounterPayment?: boolean
  defaultPaymentMethod: "online" | "cash" | "card"
}

interface PaymentMethodsCardProps {
  paymentSettings: Partial<PaymentSettings>
  onPaymentSettingsChange: (settings: PaymentSettings) => void
}

export function PaymentMethodsCard({
  paymentSettings,
  onPaymentSettingsChange
}: PaymentMethodsCardProps) {
  // SW-78 FO-116: Migrate legacy allowCounterPayment to new cash/card settings
  const allowCashPayment = paymentSettings?.allowCashPayment ??
    (paymentSettings?.allowCounterPayment ?? false)
  const allowCardPayment = paymentSettings?.allowCardPayment ??
    (paymentSettings?.allowCounterPayment ?? false)

  const handleOnlinePaymentChange = (enabled: boolean) => {
    onPaymentSettingsChange({
      allowOnlinePayment: enabled,
      allowCashPayment,
      allowCardPayment,
      defaultPaymentMethod: paymentSettings?.defaultPaymentMethod ?? 'online'
    })
  }

  const handleCashPaymentChange = (enabled: boolean) => {
    onPaymentSettingsChange({
      allowOnlinePayment: paymentSettings?.allowOnlinePayment ?? true,
      allowCashPayment: enabled,
      allowCardPayment,
      defaultPaymentMethod: paymentSettings?.defaultPaymentMethod ?? 'online'
    })
  }

  const handleCardPaymentChange = (enabled: boolean) => {
    onPaymentSettingsChange({
      allowOnlinePayment: paymentSettings?.allowOnlinePayment ?? true,
      allowCashPayment,
      allowCardPayment: enabled,
      defaultPaymentMethod: paymentSettings?.defaultPaymentMethod ?? 'online'
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-50 rounded-lg">
            <CreditCard className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <CardTitle className="text-base">Payment Methods</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Configure payment options for customers (Quebec WEB-SRM)
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Online Payment Toggle */}
        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div>
            <Label htmlFor="online-payment" className="text-sm font-medium">
              Pay Online (En ligne)
            </Label>
            <p className="text-xs text-muted-foreground">Credit card payments (MVO)</p>
          </div>
          <Switch
            id="online-payment"
            checked={paymentSettings?.allowOnlinePayment ?? true}
            onCheckedChange={handleOnlinePaymentChange}
          />
        </div>

        {/* Cash Payment Toggle - SW-78 FO-116 */}
        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div>
            <Label htmlFor="cash-payment" className="text-sm font-medium">
              Pay Cash (Comptant)
            </Label>
            <p className="text-xs text-muted-foreground">Cash at counter (ARG)</p>
          </div>
          <Switch
            id="cash-payment"
            checked={allowCashPayment}
            onCheckedChange={handleCashPaymentChange}
          />
        </div>

        {/* Card Payment Toggle - SW-78 FO-116 */}
        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div>
            <Label htmlFor="card-payment" className="text-sm font-medium">
              Pay with Card (Carte)
            </Label>
            <p className="text-xs text-muted-foreground">Card at counter (CRE)</p>
          </div>
          <Switch
            id="card-payment"
            checked={allowCardPayment}
            onCheckedChange={handleCardPaymentChange}
          />
        </div>
      </CardContent>
    </Card>
  )
}
