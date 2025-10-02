"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CarFront } from "lucide-react"

interface DeliveryFeeCardProps {
  deliveryFee: number
  deliveryFeeInput: string
  freeDeliveryThreshold: number
  freeDeliveryThresholdInput: string
  onDeliveryFeeChange: (value: string) => void
  onFreeDeliveryThresholdChange: (value: string) => void
  translations: {
    title: string
    description: string
    standardDeliveryFee: string
    noDeliveryFee: string
    deliveryFeeApplied: string
    freeDeliveryThreshold: string
    noFreeDelivery: string
    freeDeliveryEnabled: string
  }
}

export function DeliveryFeeCard({
  deliveryFee,
  deliveryFeeInput,
  freeDeliveryThreshold,
  freeDeliveryThresholdInput,
  onDeliveryFeeChange,
  onFreeDeliveryThresholdChange,
  translations
}: DeliveryFeeCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-50 rounded-lg">
            <CarFront className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <CardTitle className="text-base">{translations.title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {translations.description}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Base Delivery Fee Input */}
          <div className="space-y-2">
            <Label htmlFor="delivery-fee" className="text-sm font-medium">{translations.standardDeliveryFee} ($CAD)</Label>
            <div className="relative">
              <Input
                id="delivery-fee"
                type="number"
                value={deliveryFeeInput}
                onChange={(e) => onDeliveryFeeChange(e.target.value)}
                className="pr-12"
                placeholder="0.00"
                min="0"
                max="100"
                step="0.01"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-sm text-muted-foreground">CAD</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {deliveryFee === 0 ? (
                <span className="text-green-600">
                  • {translations.noDeliveryFee}
                </span>
              ) : (
                <span className="text-blue-600">
                  • {translations.deliveryFeeApplied.replace('{amount}', `$${deliveryFee.toFixed(2)}`)}
                </span>
              )}
            </div>
          </div>

          {/* Divider + Free Delivery Threshold */}
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-2 pl-4">
              <Label htmlFor="free-delivery-threshold" className="text-sm font-medium">
                {translations.freeDeliveryThreshold} ($CAD)
              </Label>
              <div className="relative">
                <Input
                  id="free-delivery-threshold"
                  type="number"
                  value={freeDeliveryThresholdInput}
                  onChange={(e) => onFreeDeliveryThresholdChange(e.target.value)}
                  className="pr-12"
                  placeholder="0.00"
                  min="0"
                  max="10000"
                  step="0.01"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-sm text-muted-foreground">CAD</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {freeDeliveryThreshold === 0 ? (
                  <span className="text-blue-600">
                    • {translations.noFreeDelivery}
                  </span>
                ) : (
                  <span className="text-blue-600">
                    • {translations.freeDeliveryEnabled.replace('{amount}', `$${freeDeliveryThreshold.toFixed(2)}`)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
