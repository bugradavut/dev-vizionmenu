"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, RadialBarChart, RadialBar, Legend } from "recharts"
import { BarChart3, PieChart as PieChartIcon, Target, CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useState, useEffect, useCallback } from "react"
import { analyticsService, PeriodPreset } from "@/services/analytics.service"
import { useEnhancedAuth } from "@/hooks/use-enhanced-auth"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { getPlatformColor } from "@/utils/chart-colors"

export interface PlatformBreakdownDataPoint {
  source: string
  revenue: number
  order_count: number
}

interface PlatformBreakdownChartProps {
  title: string
  language?: "en" | "fr"
  type?: "pie" | "bar" | "radial"
  data?: PlatformBreakdownDataPoint[]
  loading?: boolean
  hideControls?: boolean
  branchId?: string
}

// Dynamic chart configuration
const chartConfig = {
  platforms: {
    label: "Platforms",
    color: "dynamic", // Uses getPlatformColor function
  },
}

export function PlatformBreakdownChart({
  title,
  language = "en",
  type: initialType = "pie",
  data: propData,
  loading: propLoading,
  branchId
}: PlatformBreakdownChartProps) {
  const { chainId } = useEnhancedAuth()
  const [chartType, setChartType] = useState<"pie" | "bar" | "radial">(initialType)
  const [period, setPeriod] = useState<PeriodPreset>("7d")
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [openRange, setOpenRange] = useState(false)
  const [data, setData] = useState<PlatformBreakdownDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  // Use prop data if provided, otherwise use internal state
  const displayData = propData || data
  const isLoading = propLoading !== undefined ? propLoading : loading

  const fetchData = useCallback(async () => {
    if (!chainId) return
    setLoading(true)
    try {
      const response = await analyticsService.getChainAnalytics({
        chainId,
        period: period,
        startDate: period === 'custom' && dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        endDate: period === 'custom' && dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
        branchId
      })
      setData(response.data.sourceBreakdown)
    } catch (error) {
      console.error('Failed to fetch platform breakdown data:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [chainId, period, dateRange.from, dateRange.to, branchId])

  useEffect(() => {
    // Only fetch if prop data is not provided
    if (!propData) {
      fetchData()
    }
  }, [fetchData, propData])

  const handlePeriodChange = (newPeriod: PeriodPreset) => {
    setPeriod(newPeriod)
    if (newPeriod !== 'custom') {
      setDateRange({})
    }
    setOpenRange(false)
  }
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
  const chartData = displayData.map((item, index) => ({
    ...item,
    displayName: getSourceLabel(item.source),
    fill: getPlatformColor(item.source, index),
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
    <Card className="border flex flex-col flex-1">
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              {title}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              {/* Date Range Selector */}
              <Popover open={openRange} onOpenChange={setOpenRange}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 flex-1 sm:flex-none">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {period === 'custom' && dateRange.from && dateRange.to
                      ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`
                      : period === '7d' ? (language === 'fr' ? '7 jours' : '7 days')
                      : period === '30d' ? (language === 'fr' ? '30 jours' : '30 days')
                      : (language === 'fr' ? '90 jours' : '90 days')
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-3 space-y-3">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">
                        {language === 'fr' ? 'Raccourcis' : 'Quick Select'}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={period === '7d' ? 'default' : 'outline'}
                          size="sm"
                          className="justify-start h-8"
                          onClick={() => handlePeriodChange('7d')}
                        >
                          {language === 'fr' ? '7 jours' : '7 days'}
                        </Button>
                        <Button
                          variant={period === '30d' ? 'default' : 'outline'}
                          size="sm"
                          className="justify-start h-8"
                          onClick={() => handlePeriodChange('30d')}
                        >
                          {language === 'fr' ? '30 jours' : '30 days'}
                        </Button>
                        <Button
                          variant={period === '90d' ? 'default' : 'outline'}
                          size="sm"
                          className="justify-start h-8"
                          onClick={() => handlePeriodChange('90d')}
                        >
                          {language === 'fr' ? '90 jours' : '90 days'}
                        </Button>
                        <Button
                          variant={period === 'custom' ? 'default' : 'outline'}
                          size="sm"
                          className="justify-start h-8"
                          onClick={() => setPeriod('custom')}
                        >
                          {language === 'fr' ? 'Personnalisé' : 'Custom'}
                        </Button>
                      </div>
                    </div>
                    <div className="border-t pt-3">
                      <div className="text-sm font-medium mb-2">
                        {language === 'fr' ? 'Plage personnalisée' : 'Custom Range'}
                      </div>
                      <Calendar
                        mode="range"
                        selected={{ from: dateRange.from, to: dateRange.to }}
                        onSelect={(range) => {
                          setDateRange({ from: range?.from, to: range?.to })
                          // Auto-set to custom period when date range is selected
                          if (range?.from && range?.to) {
                            setPeriod('custom')
                          }
                        }}
                        numberOfMonths={2}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Chart Type Selector */}
              <Select value={chartType} onValueChange={(value: "pie" | "bar" | "radial") => setChartType(value)}>
                <SelectTrigger className="h-8 flex-1 sm:flex-none sm:w-[100px] min-w-0">
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
      <CardContent className="px-2 sm:p-6 flex-1 flex flex-col">
        {isLoading ? (
          <Skeleton className="h-[320px] w-full" />
        ) : chartData.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto flex-1 w-full min-h-[320px]"
          >
            {renderChart()}
          </ChartContainer>
        ) : (
          <div className="flex flex-1 items-center justify-center min-h-[320px]">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">
                {language === 'fr' ? 'Aucune donnée disponible' : 'No data available'}
              </p>
              <p className="text-xs text-muted-foreground">
                {period === 'custom' && dateRange.from && dateRange.to
                  ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`
                  : period === '7d' ? (language === 'fr' ? 'pour les 7 derniers jours' : 'for the last 7 days')
                  : period === '30d' ? (language === 'fr' ? 'pour les 30 derniers jours' : 'for the last 30 days')
                  : (language === 'fr' ? 'pour les 90 derniers jours' : 'for the last 90 days')
                }
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}