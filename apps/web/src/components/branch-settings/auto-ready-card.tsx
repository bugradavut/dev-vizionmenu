"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { CheckCircle, Settings, AlertCircle } from "lucide-react"

interface AutoReadyCardProps {
  autoReady: boolean
  onAutoReadyChange: (enabled: boolean) => void
}

export function AutoReadyCard({ autoReady, onAutoReadyChange }: AutoReadyCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Settings className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base">Auto-Ready System</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Automatically complete orders when time expires
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 pt-1">
            <Switch
              checked={autoReady}
              onCheckedChange={onAutoReadyChange}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {autoReady ? (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 text-sm mb-2">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Auto-Ready is enabled</span>
            </div>
            <p className="text-xs text-green-600">
              Orders automatically move to &quot;Ready&quot; status when kitchen preparation time expires. Staff can still manually mark orders ready at any time.
            </p>
          </div>
        ) : (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Manual mode active</span>
            </div>
            <p className="text-xs text-gray-500">
              Staff must manually change order status to &quot;Ready&quot;. Kitchen timing settings are used for customer time estimates only.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
