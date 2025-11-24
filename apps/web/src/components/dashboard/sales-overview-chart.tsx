"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { ArrowRight, TrendingUp, TrendingDown, RefreshCw } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"

interface SalesDataPoint {
  date: string
  sales: number
  label: string
}

interface SalesOverviewChartProps {
  data: SalesDataPoint[]
  totalSales: number
  changePercent: number
  loading?: boolean
  onRefresh?: () => void
  refreshing?: boolean
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

const chartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(25, 95%, 53%)", // Orange color
  },
} satisfies ChartConfig

export function SalesOverviewChart({ data, totalSales, changePercent, loading, onRefresh, refreshing }: SalesOverviewChartProps) {
  const { language } = useLanguage()

  if (loading) {
    return (
      <Card className="flex flex-col h-[420px]">
        <CardHeader className="pb-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="text-right space-y-2">
              <Skeleton className="h-8 w-28 ml-auto" />
              <Skeleton className="h-4 w-20 ml-auto" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col pb-4">
          <Skeleton className="flex-1 w-full" />
          <div className="pt-4 mt-4 border-t shrink-0">
            <Skeleton className="h-8 w-32" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const isPositive = changePercent >= 0

  return (
    <Card className="flex flex-col h-[420px]">
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium">
              {language === 'fr' ? 'Aperçu des Ventes' : 'Sales Overview'}
            </CardTitle>
            <CardDescription>
              {language === 'fr' ? '7 derniers jours' : 'Last 7 days'}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
            <div className={`flex items-center justify-end gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{isPositive ? '+' : ''}{changePercent.toFixed(1)}%</span>
              <span className="text-muted-foreground">
                {language === 'fr' ? 'vs sem. dernière' : 'vs last week'}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pb-4 overflow-hidden">
        <ChartContainer config={chartConfig} className="flex-1 w-full min-h-0">
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              tickFormatter={(value) => `$${value}`}
              width={50}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <span className="font-medium">{formatCurrency(Number(value))}</span>
                  )}
                  labelFormatter={(label) => label}
                />
              }
            />
            <defs>
              <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-sales)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-sales)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area
              dataKey="sales"
              type="monotone"
              fill="url(#fillSales)"
              fillOpacity={0.4}
              stroke="var(--color-sales)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
        <div className="pt-4 mt-4 border-t shrink-0 flex items-center justify-between">
          <Link href="/reports/analytics">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium group">
              {language === 'fr' ? 'Voir Analytics' : 'View Analytics'}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
