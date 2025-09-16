"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

type MetricsCardProps = {
  label: string
  value: string | number
  className?: string
  trendValue?: number
  trendLabel?: string
  subtitle?: string
  icon?: ReactNode
}

export function MetricsCard({
  label,
  value,
  className,
  trendValue,
  trendLabel,
  subtitle,
  icon
}: MetricsCardProps) {
  const getTrendIcon = () => {
    if (trendValue === undefined) return null
    if (trendValue > 0) return <TrendingUp className="h-3 w-3" />
    if (trendValue < 0) return <TrendingDown className="h-3 w-3" />
    return <Minus className="h-3 w-3" />
  }

  const getTrendColor = () => {
    if (trendValue === undefined) return "text-muted-foreground"
    if (trendValue > 0) return "text-emerald-600"
    if (trendValue < 0) return "text-red-600"
    return "text-muted-foreground"
  }

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="space-y-2">
          {/* Header: Title + Trend Percentage */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
              <h3 className="tracking-tight text-sm font-medium text-muted-foreground">
                {label}
              </h3>
            </div>
            {trendValue !== undefined && (
              <div className={cn(
                "flex items-center text-xs font-medium px-2 py-1 rounded-full border bg-background",
                getTrendColor()
              )}>
                <span className="mr-1">{getTrendIcon()}</span>
                {trendValue > 0 ? "+" : ""}{trendValue}%
              </div>
            )}
          </div>

          {/* Main Value */}
          <div className="text-2xl font-bold tracking-tight">
            {value}
          </div>

          {/* Footer: Trend Label + Subtitle */}
          <div className="space-y-1">
            {trendLabel && (
              <p className={cn("text-xs font-medium", getTrendColor())}>
                {trendLabel}
              </p>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

