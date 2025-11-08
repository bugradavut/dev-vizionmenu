"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Smartphone } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/translations"

interface OnlinePaymentCardProps {
  allowOnlinePayment: boolean
  onOnlinePaymentChange: (enabled: boolean) => void
}

export function OnlinePaymentCard({
  allowOnlinePayment,
  onOnlinePaymentChange
}: OnlinePaymentCardProps) {
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  const paymentT = t.settingsBranch.paymentMethods

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Smartphone className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{paymentT.onlinePayment}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {paymentT.onlinePaymentDesc}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div>
            <Label htmlFor="online-payment" className="text-sm font-medium">
              {paymentT.onlinePaymentDesc}
            </Label>
          </div>
          <Switch
            id="online-payment"
            checked={allowOnlinePayment}
            onCheckedChange={onOnlinePaymentChange}
          />
        </div>
      </CardContent>
    </Card>
  )
}
