"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Clock, Timer, Plus, Minus } from "lucide-react"

interface TimingCardsGroupProps {
  baseDelay: number
  baseDelayInput: string
  deliveryDelay: number
  deliveryDelayInput: string
  temporaryBaseDelay: number
  temporaryDeliveryDelay: number
  onBaseTimeChange: (value: string) => void
  onDeliveryTimeChange: (value: string) => void
  onBaseDelayAdjustment: (increment: number) => void
  onDeliveryDelayAdjustment: (increment: number) => void
}

export function TimingCardsGroup({
  baseDelay,
  baseDelayInput,
  deliveryDelay,
  deliveryDelayInput,
  temporaryBaseDelay,
  temporaryDeliveryDelay,
  onBaseTimeChange,
  onDeliveryTimeChange,
  onBaseDelayAdjustment,
  onDeliveryDelayAdjustment
}: TimingCardsGroupProps) {
  // Calculate total time
  const totalTime = Math.max(0, baseDelay + temporaryBaseDelay + deliveryDelay + temporaryDeliveryDelay)

  return (
    <div className="space-y-6">
      {/* Kitchen & Delivery Timing Cards Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Kitchen Timing Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Clock className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-sm">Kitchen Prep Time</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Time to prepare orders
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="base-initial" className="text-xs font-medium">Base Time (min)</Label>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onBaseDelayAdjustment(-5)}
                  className="h-8 w-8 p-0"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  id="base-initial"
                  type="number"
                  value={baseDelayInput}
                  onChange={(e) => onBaseTimeChange(e.target.value)}
                  className="h-8 flex-1 text-center"
                  min="0"
                  max="120"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onBaseDelayAdjustment(5)}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Timing Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Timer className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-sm">Delivery Time</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Time for pickup/delivery
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="delivery-initial" className="text-xs font-medium">Base Time (min)</Label>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDeliveryDelayAdjustment(-5)}
                  className="h-8 w-8 p-0"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  id="delivery-initial"
                  type="number"
                  value={deliveryDelayInput}
                  onChange={(e) => onDeliveryTimeChange(e.target.value)}
                  className="h-8 flex-1 text-center"
                  min="0"
                  max="120"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDeliveryDelayAdjustment(5)}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expected Total Time Card */}
      <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-orange-100">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-orange-900">Expected Total Time</h3>
                <p className="text-xs text-orange-700">
                  Total time customers will see for completion
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-orange-600">
                {totalTime}
              </p>
              <p className="text-xs font-medium text-orange-600">MINUTES</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
