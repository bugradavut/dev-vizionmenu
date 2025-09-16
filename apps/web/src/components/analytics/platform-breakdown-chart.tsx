"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, RadialBarChart, RadialBar, Legend } from "recharts"
import { BarChart3, PieChart as PieChartIcon, Target } from "lucide-react"
import { useState } from "react"

export interface PlatformBreakdownDataPoint {
  source: string
  revenue: number
  order_count: number
}

interface PlatformBreakdownChartProps {
  data: PlatformBreakdownDataPoint[]
  title: string
  language?: "en" | "fr"
  type?: "pie" | "bar" | "radial"
}

// Chart color configuration - VizionMenu brand colors
const chartConfig = {
  website: {
    label: "Website",
    color: "#ea580c", // Orange primary
  },
  qr: {
    label: "QR Code",
    color: "#dc2626", // Red
  },
  mobile_app: {
    label: "Mobile App",
    color: "#2563eb", // Blue
  },
  uber_eats: {
    label: "Uber Eats",
    color: "#16a34a", // Green
  },
  doordash: {
    label: "DoorDash",
    color: "#ca8a04", // Yellow
  },
  skipthedishes: {
    label: "Skip The Dishes",
    color: "#7c3aed", // Purple
  },
  takeaway: {
    label: "Takeaway",
    color: "#db2777", // Pink
  },
  delivery: {
    label: "Delivery",
    color: "#0891b2", // Cyan
  },
}

export function PlatformBreakdownChart({
  data,
  title,
  language = "en",
  type: initialType = "pie"
}: PlatformBreakdownChartProps) {
  const [chartType, setChartType] = useState<"pie" | "bar" | "radial">(initialType)
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
  const customTooltip = ({ active, payload }: any) => {
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

  const renderChart = () => {
    if (chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="displayName"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
            <ChartTooltip content={customTooltip} />
            <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={`cell-${entry.source}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )
    }

    if (chartType === "radial") {
      const radialData = chartData.map((item) => ({
        ...item,
        fill: item.fill,
        angle: item.percentage * 3.6, // Convert percentage to degrees
      }))

      return (
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="80%" data={radialData}>
            <RadialBar
              dataKey="percentage"
              cornerRadius={4}
              fill="#ea580c"
            />
            <ChartTooltip content={customTooltip} />
            <Legend
              iconSize={12}
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ paddingTop: '20px' }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
      )
    }

    return (
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
            {chartData.map((entry) => (
              <Cell key={`cell-${entry.source}`} fill={entry.fill} />
            ))}
          </Pie>
          <ChartTooltip content={customTooltip} />
        </PieChart>
      </ResponsiveContainer>
    )
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
            <Select value={chartType} onValueChange={(value: "pie" | "bar" | "radial") => setChartType(value)}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pie">
                  <div className="flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4" />
                    <span>{language === 'fr' ? 'Secteur' : 'Pie'}</span>
                  </div>
                </SelectItem>
                <SelectItem value="bar">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>{language === 'fr' ? 'Barre' : 'Bar'}</span>
                  </div>
                </SelectItem>
                <SelectItem value="radial">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    <span>{language === 'fr' ? 'Radial' : 'Radial'}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
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
            className={chartType === "bar" ? "aspect-auto h-[320px] w-full" : "aspect-auto h-[320px] w-full"}
          >
            {renderChart()}</ChartContainer>
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