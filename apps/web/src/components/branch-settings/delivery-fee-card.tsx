"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Bike, Settings } from "lucide-react"

interface DeliveryFeeCardProps {
  deliveryFee: number
  deliveryFeeInput: string
  freeDeliveryThreshold: number
  freeDeliveryThresholdInput: string
  isUberDirectEnabled: boolean
  onDeliveryFeeChange: (value: string) => void
  onFreeDeliveryThresholdChange: (value: string) => void
  onUberDirectClick: () => void
  translations: {
    title: string
    description: string
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
  isUberDirectEnabled,
  onDeliveryFeeChange,
  onFreeDeliveryThresholdChange,
  onUberDirectClick,
  translations
}: DeliveryFeeCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3 relative">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-50 rounded-lg">
            <Bike className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <CardTitle className="text-base">{translations.title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {translations.description}
            </p>
          </div>
        </div>
        <div className="absolute top-3 right-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onUberDirectClick}
            className="h-8 w-8 p-0 border-gray-300 relative"
          >
            <Settings className="h-4 w-4" />
            {isUberDirectEnabled && (
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-orange-500 rounded-full border-2 border-white animate-pulse"></div>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Base Delivery Fee Input */}
        <div className="space-y-2">
          <Label htmlFor="delivery-fee" className="text-sm font-medium">Base Fee ($CAD)</Label>
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

        {/* Free Delivery Threshold Input */}
        <div className="space-y-2">
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
      </CardContent>
    </Card>
  )
}
