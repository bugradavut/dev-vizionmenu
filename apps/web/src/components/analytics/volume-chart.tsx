"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, AreaChart, Area, BarChart, Bar, CartesianGrid } from "recharts"
import { BarChart3, LineChart as LineChartIcon, AreaChart as AreaChartIcon } from "lucide-react"
import { useState } from "react"

export interface VolumeDataPoint {
  date: string
  order_count: number
}

interface VolumeChartProps {
  data: VolumeDataPoint[]
  title: string
  language?: "en" | "fr"
  type?: "line" | "area" | "bar"
}

const chartConfig = {
  orders: {
    label: "Orders",
    color: "#ea580c", // Orange primary color
  },
}

export function VolumeChart({
  data,
  title,
  language = "en",
  type: initialType = "area"
}: VolumeChartProps) {
  const [chartType, setChartType] = useState<"line" | "area" | "bar">(initialType)
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const displayDate = chartType === "bar" ? formatDate(data.payload?.date || label || '') : formatDate(label || '')

      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ea580c' }}></div>
              <span className="text-sm font-semibold">{displayDate}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">
                {language === 'fr' ? 'Commandes:' : 'Orders:'}
              </span>
              <span className="text-sm font-bold">
                {data.value}
              </span>
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

  const renderChart = () => {
    const chartData = data.map(item => ({
      ...item,
      displayDate: formatDate(item.date)
    }))

    switch (chartType) {
      case "area":
        return (
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="displayDate"
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
            <Area
              type="monotone"
              dataKey="order_count"
              stroke="#ea580c"
              fill="#ea580c"
              fillOpacity={0.2}
              strokeWidth={3}
            />
            <ChartTooltip content={customTooltip} />
          </AreaChart>
        )

      case "bar":
        return (
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="displayDate"
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
            <Bar
              dataKey="order_count"
              fill="#ea580c"
              radius={[4, 4, 0, 0]}
            />
            <ChartTooltip content={customTooltip} />
          </BarChart>
        )

      case "line":
      default:
        return (
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="displayDate"
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
              stroke="#ea580c"
              strokeWidth={3}
              dot={{
                fill: "#ea580c",
                strokeWidth: 2,
                stroke: "hsl(var(--background))",
                r: 4,
              }}
              activeDot={{
                r: 6,
                fill: "#ea580c",
                stroke: "hsl(var(--background))",
                strokeWidth: 2,
              }}
            />
            <ChartTooltip content={customTooltip} />
          </LineChart>
        )
    }
  }

  return (
    <Card className="border">
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              {title}
            </CardTitle>
            <Select value={chartType} onValueChange={(value: "line" | "area" | "bar") => setChartType(value)}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">
                  <div className="flex items-center gap-2">
                    <LineChartIcon className="h-4 w-4" />
                    <span>{language === 'fr' ? 'Ligne' : 'Line'}</span>
                  </div>
                </SelectItem>
                <SelectItem value="area">
                  <div className="flex items-center gap-2">
                    <AreaChartIcon className="h-4 w-4" />
                    <span>{language === 'fr' ? 'Zone' : 'Area'}</span>
                  </div>
                </SelectItem>
                <SelectItem value="bar">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>{language === 'fr' ? 'Barre' : 'Bar'}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
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
            className="aspect-auto h-[280px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
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