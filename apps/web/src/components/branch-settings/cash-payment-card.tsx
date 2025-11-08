"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Banknote } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/translations"

interface CashPaymentCardProps {
  allowCashPayment: boolean
  onCashPaymentChange: (enabled: boolean) => void
}

export function CashPaymentCard({
  allowCashPayment,
  onCashPaymentChange
}: CashPaymentCardProps) {
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  const paymentT = t.settingsBranch.paymentMethods

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg">
            <Banknote className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{paymentT.cashPayment}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {paymentT.cashPaymentDesc}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div>
            <Label htmlFor="cash-payment" className="text-sm font-medium">
              {paymentT.cashPaymentDesc}
            </Label>
          </div>
          <Switch
            id="cash-payment"
            checked={allowCashPayment}
            onCheckedChange={onCashPaymentChange}
          />
        </div>
      </CardContent>
    </Card>
  )
}
