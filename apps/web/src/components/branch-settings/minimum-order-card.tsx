"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DollarSign } from "lucide-react"

interface MinimumOrderCardProps {
  minimumOrderAmount: number
  minimumOrderInput: string
  onMinimumOrderChange: (value: string) => void
  translations: {
    title: string
    description: string
    noMinimumSet: string
    minimumOrderWarning: string
  }
}

export function MinimumOrderCard({
  minimumOrderAmount,
  minimumOrderInput,
  onMinimumOrderChange,
  translations
}: MinimumOrderCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-50 rounded-lg">
            <DollarSign className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <CardTitle className="text-base">{translations.title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {translations.description}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="minimum-order" className="text-sm font-medium">Amount ($CAD)</Label>
          <div className="relative">
            <Input
              id="minimum-order"
              type="number"
              value={minimumOrderInput}
              onChange={(e) => onMinimumOrderChange(e.target.value)}
              className="pr-12"
              placeholder="0.00"
              min="0"
              max="1000"
              step="0.01"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-sm text-muted-foreground">CAD</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {minimumOrderAmount === 0 ? (
              <span className="text-green-600">
                • {translations.noMinimumSet}
              </span>
            ) : (
              <span className="text-blue-600">
                • {translations.minimumOrderWarning.replace('{amount}', `$${minimumOrderAmount.toFixed(2)}`)}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
