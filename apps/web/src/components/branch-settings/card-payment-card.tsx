"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { CreditCard } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/translations"

interface CardPaymentCardProps {
  allowCardPayment: boolean
  onCardPaymentChange: (enabled: boolean) => void
}

export function CardPaymentCard({
  allowCardPayment,
  onCardPaymentChange
}: CardPaymentCardProps) {
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  const paymentT = t.settingsBranch.paymentMethods

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-50 rounded-lg">
            <CreditCard className="h-5 w-5 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{paymentT.cardPayment}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {paymentT.cardPaymentDesc}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div>
            <Label htmlFor="card-payment" className="text-sm font-medium">
              {paymentT.cardPaymentDesc}
            </Label>
          </div>
          <Switch
            id="card-payment"
            checked={allowCardPayment}
            onCheckedChange={onCardPaymentChange}
          />
        </div>
      </CardContent>
    </Card>
  )
}
