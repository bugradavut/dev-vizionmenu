"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, AreaChart, Area, BarChart, Bar, CartesianGrid } from "recharts"
import { BarChart3, LineChart as LineChartIcon, AreaChart as AreaChartIcon, CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useState, useEffect, useCallback } from "react"
import { analyticsService, PeriodPreset } from "@/services/analytics.service"
import { useEnhancedAuth } from "@/hooks/use-enhanced-auth"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { CHART_COLORS } from "@/utils/chart-colors"

export interface VolumeDataPoint {
  date: string
  order_count: number
}

interface VolumeChartProps {
  title: string
  language?: "en" | "fr"
  type?: "line" | "area" | "bar"
  data?: VolumeDataPoint[]
  loading?: boolean
  hideControls?: boolean
  branchId?: string
}

const chartConfig = {
  orders: {
    label: "Orders",
    color: CHART_COLORS.volume, // Blue color for volume
  },
}

export function VolumeChart({
  title,
  language = "en",
  type: initialType = "bar",
  data: propData,
  loading: propLoading,
  branchId
}: VolumeChartProps) {
  const { chainId } = useEnhancedAuth()
  const [chartType, setChartType] = useState<"line" | "area" | "bar">(initialType)
  const [period, setPeriod] = useState<PeriodPreset>("7d")
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [openRange, setOpenRange] = useState(false)
  const [data, setData] = useState<VolumeDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  // Use prop data if provided, otherwise use internal state
  const displayData = propData || data
  const isLoading = propLoading !== undefined ? propLoading : loading

  // Use consistent blue color for volume charts
  const volumeColor = CHART_COLORS.volume

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
      setData(response.data.ordersByDate)
    } catch (error) {
      console.error('Failed to fetch volume data:', error)
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
    setOpenRange(false) // Always close on quick select
  }

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

  // Calculate summary stats
  const totalOrders = displayData.reduce((sum, item) => sum + item.order_count, 0)
  const avgPerDay = displayData.length > 0 ? Math.round(totalOrders / displayData.length) : 0
  const maxDay = displayData.length > 0 ? displayData.reduce((max, item) =>
    item.order_count > max.order_count ? item : max
  ) : null

  const renderChart = () => {
    const chartData = displayData.map(item => ({
      ...item,
      displayDate: formatDate(item.date)
    }))

    switch (chartType) {
      case "area":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={volumeColor} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={volumeColor} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
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
                stroke={volumeColor}
                strokeWidth={2}
                fill="url(#colorOrders)"
              />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-white/95 backdrop-blur-sm p-3 shadow-lg">
                        <div className="grid gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: volumeColor }}></div>
                            <span className="text-sm font-semibold">{formatDate(label || '')}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-sm text-muted-foreground">
                              {language === 'fr' ? 'Commandes:' : 'Orders:'}
                            </span>
                            <span className="text-sm font-bold">
                              {payload[0].value}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )

      case "bar":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
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
                fill={volumeColor}
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
              <ChartTooltip
                cursor={false}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-white/95 backdrop-blur-sm p-3 shadow-lg">
                        <div className="grid gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: volumeColor }}></div>
                            <span className="text-sm font-semibold">{formatDate(label || '')}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-sm text-muted-foreground">
                              {language === 'fr' ? 'Commandes:' : 'Orders:'}
                            </span>
                            <span className="text-sm font-bold">
                              {payload[0].value}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        )

      case "line":
      default:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
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
                stroke={volumeColor}
                strokeWidth={3}
                dot={{
                  fill: volumeColor,
                  strokeWidth: 2,
                  stroke: "white",
                  r: 4,
                }}
                activeDot={{
                  r: 6,
                  fill: volumeColor,
                  stroke: "white",
                  strokeWidth: 2,
                }}
              />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-white/95 backdrop-blur-sm p-3 shadow-lg">
                        <div className="grid gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: volumeColor }}></div>
                            <span className="text-sm font-semibold">{formatDate(label || '')}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-sm text-muted-foreground">
                              {language === 'fr' ? 'Commandes:' : 'Orders:'}
                            </span>
                            <span className="text-sm font-bold">
                              {payload[0].value}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        )
    }
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
                    {dateRange.from && dateRange.to
                      ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`
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
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">
                          {language === 'fr' ? 'Plage personnalisée' : 'Custom Range'}
                        </div>
                        {(dateRange.from || dateRange.to) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => {
                              setDateRange({})
                              setPeriod('7d') // Reset to default period
                            }}
                          >
                            {language === 'fr' ? 'Effacer' : 'Clear'}
                          </Button>
                        )}
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
              <Select value={chartType} onValueChange={(value: "line" | "area" | "bar") => setChartType(value)}>
                <SelectTrigger className="h-8 flex-1 sm:flex-none sm:w-[100px] min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>{language === 'fr' ? 'Barre' : 'Bar'}</span>
                    </div>
                  </SelectItem>
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
                </SelectContent>
              </Select>
            </div>
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
      <CardContent className="px-2 sm:p-6 flex-1 flex flex-col">
        {isLoading ? (
          <Skeleton className="h-[320px] w-full" />
        ) : displayData.length > 0 ? (
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