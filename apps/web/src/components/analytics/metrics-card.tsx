"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

type MetricsCardProps = {
  label: string
  value: string | number
  icon?: ReactNode
  className?: string
  hint?: string
}

export function MetricsCard({ label, value, icon, className, hint }: MetricsCardProps) {
  return (
    <Card className={cn("border", className)}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{value}</p>
            {hint ? (
              <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
            ) : null}
          </div>
          {icon ? <div className="text-muted-foreground">{icon}</div> : null}
        </div>
      </CardContent>
    </Card>
  )
}

