"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { CreditCard } from "lucide-react"

interface PaymentSettings {
  allowOnlinePayment: boolean
  allowCounterPayment: boolean
  defaultPaymentMethod: "online" | "counter"
}

interface PaymentMethodsCardProps {
  paymentSettings: Partial<PaymentSettings>
  onPaymentSettingsChange: (settings: PaymentSettings) => void
}

export function PaymentMethodsCard({
  paymentSettings,
  onPaymentSettingsChange
}: PaymentMethodsCardProps) {
  const handleOnlinePaymentChange = (enabled: boolean) => {
    onPaymentSettingsChange({
      ...paymentSettings,
      allowOnlinePayment: enabled,
      allowCounterPayment: paymentSettings?.allowCounterPayment ?? false,
      defaultPaymentMethod: paymentSettings?.defaultPaymentMethod ?? 'online'
    })
  }

  const handleCounterPaymentChange = (enabled: boolean) => {
    onPaymentSettingsChange({
      ...paymentSettings,
      allowOnlinePayment: paymentSettings?.allowOnlinePayment ?? true,
      allowCounterPayment: enabled,
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
              Configure payment options for customers
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Online Payment Toggle */}
        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div>
            <Label htmlFor="online-payment" className="text-sm font-medium">Pay Online</Label>
            <p className="text-xs text-muted-foreground">Credit card payments</p>
          </div>
          <Switch
            id="online-payment"
            checked={paymentSettings?.allowOnlinePayment ?? true}
            onCheckedChange={handleOnlinePaymentChange}
          />
        </div>

        {/* Counter Payment Toggle */}
        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div>
            <Label htmlFor="counter-payment" className="text-sm font-medium">Pay at Counter</Label>
            <p className="text-xs text-muted-foreground">Cash or card at pickup</p>
          </div>
          <Switch
            id="counter-payment"
            checked={paymentSettings?.allowCounterPayment ?? false}
            onCheckedChange={handleCounterPaymentChange}
          />
        </div>
      </CardContent>
    </Card>
  )
}
