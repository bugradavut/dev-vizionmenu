"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { BarChart3 } from "lucide-react"

export interface PlatformBreakdownDataPoint {
  source: string
  revenue: number
  order_count: number
}

interface PlatformBreakdownChartProps {
  data: PlatformBreakdownDataPoint[]
  title: string
  language?: "en" | "fr"
}

// Chart color configuration
const chartConfig = {
  website: {
    label: "Website",
    color: "hsl(var(--chart-1))",
  },
  qr: {
    label: "QR Code",
    color: "hsl(var(--chart-2))",
  },
  mobile_app: {
    label: "Mobile App",
    color: "hsl(var(--chart-3))",
  },
  uber_eats: {
    label: "Uber Eats",
    color: "hsl(var(--chart-4))",
  },
  doordash: {
    label: "DoorDash",
    color: "hsl(var(--chart-5))",
  },
  skipthedishes: {
    label: "Skip The Dishes",
    color: "hsl(var(--chart-1))",
  },
  takeaway: {
    label: "Takeaway",
    color: "hsl(var(--chart-2))",
  },
  delivery: {
    label: "Delivery",
    color: "hsl(var(--chart-3))",
  },
}

export function PlatformBreakdownChart({
  data,
  title,
  language = "en"
}: PlatformBreakdownChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getSourceLabel = (source: string) => {
    const sourceMap = {
      'website': language === 'fr' ? 'Site Web' : 'Website',
      'qr': language === 'fr' ? 'Code QR' : 'QR Code',
      'mobile_app': language === 'fr' ? 'App Mobile' : 'Mobile App',
      'uber_eats': 'Uber Eats',
      'doordash': 'DoorDash',
      'skipthedishes': 'Skip The Dishes',
      'takeaway': language === 'fr' ? 'À emporter' : 'Takeaway',
      'delivery': language === 'fr' ? 'Livraison' : 'Delivery',
    }
    return sourceMap[source as keyof typeof sourceMap] || source
  }

  // Prepare chart data with colors and labels
  const chartData = data.map((item, index) => ({
    ...item,
    displayName: getSourceLabel(item.source),
    fill: chartConfig[item.source as keyof typeof chartConfig]?.color || `hsl(var(--chart-${(index % 5) + 1}))`,
    percentage: 0 // Will be calculated
  }))

  // Calculate percentages
  const totalRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0)
  chartData.forEach(item => {
    item.percentage = totalRevenue > 0 ? Math.round((item.revenue / totalRevenue) * 100) : 0
  })

  // Custom tooltip formatter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: any }>; label?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: data.fill }}
                />
                <span className="text-sm font-medium">{data.displayName}</span>
              </div>
            </div>
            <div className="grid gap-0.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {language === 'fr' ? 'Revenu:' : 'Revenue:'}
                </span>
                <span className="font-mono font-medium">
                  {formatCurrency(data.revenue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {language === 'fr' ? 'Commandes:' : 'Orders:'}
                </span>
                <span className="font-mono font-medium">
                  {data.order_count}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {language === 'fr' ? 'Pourcentage:' : 'Percentage:'}
                </span>
                <span className="font-mono font-medium">
                  {data.percentage}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const topPlatform = chartData.length > 0 ? chartData.reduce((max, item) =>
    item.revenue > max.revenue ? item : max
  ) : null

  return (
    <Card className="border">
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            {title}
          </CardTitle>
          {topPlatform && (
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>
                {language === 'fr' ? 'Meilleure:' : 'Top:'} {topPlatform.displayName}
              </span>
              <span>
                {formatCurrency(topPlatform.revenue)} ({topPlatform.percentage}%)
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        {chartData.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-square max-h-[300px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="revenue"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <ChartTooltip content={customTooltip as any} />
                <ChartLegend
                  content={
                    <ChartLegendContent
                      nameKey="displayName"
                      className="flex flex-wrap gap-2 justify-center mt-4"
                    />
                  }
                />
              </PieChart>
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