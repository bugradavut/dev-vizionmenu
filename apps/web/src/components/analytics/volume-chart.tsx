"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { BarChart3 } from "lucide-react"

export interface VolumeDataPoint {
  date: string
  order_count: number
}

interface VolumeChartProps {
  data: VolumeDataPoint[]
  title: string
  language?: "en" | "fr"
}

const chartConfig = {
  orders: {
    label: "Orders",
    color: "hsl(var(--chart-1))",
  },
}

export function VolumeChart({
  data,
  title,
  language = "en"
}: VolumeChartProps) {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return new Intl.DateTimeFormat(language === 'fr' ? 'fr-CA' : 'en-US', {
        month: 'short',
        day: 'numeric',
      }).format(date)
    } catch {
      return dateStr
    }
  }

  const customTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{formatDate(label || '')}</span>
            </div>
            <div className="grid gap-0.5 text-xs">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  {language === 'fr' ? 'Commandes:' : 'Orders:'}
                </span>
                <span className="font-mono font-medium">
                  {data.value}
                </span>
              </div>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  // Calculate summary stats
  const totalOrders = data.reduce((sum, item) => sum + item.order_count, 0)
  const avgPerDay = data.length > 0 ? Math.round(totalOrders / data.length) : 0
  const maxDay = data.length > 0 ? data.reduce((max, item) =>
    item.order_count > max.order_count ? item : max
  ) : null

  return (
    <Card className="border">
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            {title}
          </CardTitle>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>
              {language === 'fr' ? 'Total:' : 'Total:'} {totalOrders}
            </span>
            <span>
              {language === 'fr' ? 'Moyenne:' : 'Average:'} {avgPerDay}/
              {language === 'fr' ? 'jour' : 'day'}
            </span>
            {maxDay && (
              <span>
                {language === 'fr' ? 'Pic:' : 'Peak:'} {maxDay.order_count} ({formatDate(maxDay.date)})
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        {data.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-[3/2] max-h-[300px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{
                  top: 10,
                  right: 30,
                  left: 0,
                  bottom: 0,
                }}
              >
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Line
                  type="monotone"
                  dataKey="order_count"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={3}
                  dot={{
                    fill: "hsl(var(--chart-1))",
                    strokeWidth: 2,
                    stroke: "hsl(var(--background))",
                    r: 4,
                  }}
                  activeDot={{
                    r: 6,
                    fill: "hsl(var(--chart-1))",
                    stroke: "hsl(var(--background))",
                    strokeWidth: 2,
                  }}
                />
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <ChartTooltip content={customTooltip as any} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {language === 'fr' ? 'Aucune donnée disponible' : 'No data available'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}