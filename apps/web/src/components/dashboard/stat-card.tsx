"use client"

import { memo, useId, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, ArrowRight, LucideIcon } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer } from "recharts"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  change?: {
    value: number
    type: "increase" | "decrease"
  }
  icon?: LucideIcon
  sparklineData?: { value: number }[]
  href?: string
  linkText?: string
  className?: string
}

export const StatCard = memo(function StatCard({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  sparklineData,
  href,
  linkText = "Details",
  className,
}: StatCardProps) {
  const gradientId = useId()

  const isPositive = change?.type === "increase"
  const changeColor = isPositive ? "text-emerald-500" : "text-red-500"
  const TrendIcon = isPositive ? TrendingUp : TrendingDown
  const sparklineColor = isPositive ? "#10b981" : "#ef4444"

  const sparklineChart = useMemo(() => {
    if (!sparklineData || sparklineData.length === 0) return null

    return (
      <div className="h-12 w-20">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparklineData}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={sparklineColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={sparklineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={sparklineColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )
  }, [sparklineData, sparklineColor, gradientId])

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {Icon && (
            <div className="flex items-center justify-center h-6 w-6 rounded-sm border bg-muted/50">
              <Icon className="h-3.5 w-3.5" />
            </div>
          )}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="text-3xl font-bold tracking-tight">{value}</div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {sparklineChart}
        </div>

        <div className="flex items-center justify-between pt-4 mt-4 border-t">
          {href ? (
            <Link href={href}>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-medium group"
              >
                {linkText}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          ) : (
            <span className="text-sm text-muted-foreground">{linkText}</span>
          )}

          {change && (
            <div className={cn("flex items-center gap-1 text-sm font-medium", changeColor)}>
              <span>{isPositive ? "+" : ""}{change.value.toFixed(2)}%</span>
              <TrendIcon className="h-4 w-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
})
