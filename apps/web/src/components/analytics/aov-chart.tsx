"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, AreaChart, Area, BarChart, Bar, CartesianGrid } from "recharts"
import { TrendingUp, LineChart as LineChartIcon, AreaChart as AreaChartIcon, BarChart3, CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useState, useEffect, useCallback } from "react"
import { analyticsService, PeriodPreset } from "@/services/analytics.service"
import { useEnhancedAuth } from "@/hooks/use-enhanced-auth"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { CHART_COLORS } from "@/utils/chart-colors"

export interface AOVDataPoint {
  date: string
  aov: number
  order_count: number
  total_revenue: number
}

interface AOVChartProps {
  title: string
  language?: "en" | "fr"
  type?: "line" | "area" | "bar"
}

const chartConfig = {
  aov: {
    label: "AOV",
    color: CHART_COLORS.aov, // Green color for AOV
  },
}

export function AOVChart({
  title,
  language = "en",
  type: initialType = "line"
}: AOVChartProps) {
  const { chainId } = useEnhancedAuth()
  const [chartType, setChartType] = useState<"line" | "area" | "bar">(initialType)
  const [period, setPeriod] = useState<PeriodPreset>("7d")
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [openRange, setOpenRange] = useState(false)
  const [data, setData] = useState<AOVDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!chainId) return
    setLoading(true)
    try {
      const response = await analyticsService.getChainAnalytics({
        chainId,
        period: period,
        startDate: period === 'custom' && dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        endDate: period === 'custom' && dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      })
      setData(response.data.aovByDate)
    } catch (error) {
      console.error('Failed to fetch AOV data:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [chainId, period, dateRange.from, dateRange.to])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handlePeriodChange = (newPeriod: PeriodPreset) => {
    setPeriod(newPeriod)
    if (newPeriod !== 'custom') {
      setDateRange({})
    }
    setOpenRange(false)
  }

  // Use consistent green color for AOV charts
  const aovColor = CHART_COLORS.aov

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
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
  const avgAOV = data.length > 0 ? data.reduce((sum, item) => sum + item.aov, 0) / data.length : 0
  const maxAOV = data.length > 0 ? Math.max(...data.map(item => item.aov)) : 0
  const minAOV = data.length > 0 ? Math.min(...data.map(item => item.aov)) : 0

  const renderChart = () => {
    const chartData = data.map(item => ({
      ...item,
      displayDate: formatDate(item.date)
    }))

    switch (chartType) {
      case "area":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAOV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={aovColor} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={aovColor} stopOpacity={0.1}/>
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
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <Area
                type="monotone"
                dataKey="aov"
                stroke={aovColor}
                strokeWidth={2}
                fill="url(#colorAOV)"
              />
              <ChartTooltip
                cursor={false}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as AOVDataPoint
                    return (
                      <div className="rounded-lg border bg-white/95 backdrop-blur-sm p-3 shadow-lg">
                        <div className="grid gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: aovColor }}></div>
                            <span className="text-sm font-semibold">{formatDate(label || '')}</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-sm text-muted-foreground">
                                {language === 'fr' ? 'Valeur Moyenne:' : 'Average Value:'}
                              </span>
                              <span className="text-sm font-bold">
                                {formatCurrency(data.aov)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-xs text-muted-foreground">
                                {language === 'fr' ? 'Commandes:' : 'Orders:'}
                              </span>
                              <span className="text-xs">
                                {data.order_count}
                              </span>
                            </div>
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
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <Bar
                dataKey="aov"
                fill={aovColor}
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
              <ChartTooltip
                cursor={false}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as AOVDataPoint
                    return (
                      <div className="rounded-lg border bg-white/95 backdrop-blur-sm p-3 shadow-lg">
                        <div className="grid gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: aovColor }}></div>
                            <span className="text-sm font-semibold">{formatDate(label || '')}</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-sm text-muted-foreground">
                                {language === 'fr' ? 'Valeur Moyenne:' : 'Average Value:'}
                              </span>
                              <span className="text-sm font-bold">
                                {formatCurrency(data.aov)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-xs text-muted-foreground">
                                {language === 'fr' ? 'Commandes:' : 'Orders:'}
                              </span>
                              <span className="text-xs">
                                {data.order_count}
                              </span>
                            </div>
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
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <Line
                type="monotone"
                dataKey="aov"
                stroke={aovColor}
                strokeWidth={3}
                dot={{
                  fill: aovColor,
                  strokeWidth: 2,
                  stroke: "white",
                  r: 5,
                }}
                activeDot={{
                  r: 7,
                  fill: aovColor,
                  stroke: "white",
                  strokeWidth: 2,
                }}
              />
              <ChartTooltip
                cursor={false}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as AOVDataPoint
                    return (
                      <div className="rounded-lg border bg-white/95 backdrop-blur-sm p-3 shadow-lg">
                        <div className="grid gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: aovColor }}></div>
                            <span className="text-sm font-semibold">{formatDate(label || '')}</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-sm text-muted-foreground">
                                {language === 'fr' ? 'Valeur Moyenne:' : 'Average Value:'}
                              </span>
                              <span className="text-sm font-bold">
                                {formatCurrency(data.aov)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-xs text-muted-foreground">
                                {language === 'fr' ? 'Commandes:' : 'Orders:'}
                              </span>
                              <span className="text-xs">
                                {data.order_count}
                              </span>
                            </div>
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
    <Card className="border">
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
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
              <Select value={chartType} onValueChange={(value: "line" | "area" | "bar") => setChartType(value)}>
                <SelectTrigger className="w-full sm:w-[100px] h-8 min-w-0">
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
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>
              {language === 'fr' ? 'Moyenne:' : 'Average:'} {formatCurrency(avgAOV)}
            </span>
            <span>
              {language === 'fr' ? 'Max:' : 'Max:'} {formatCurrency(maxAOV)}
            </span>
            <span>
              {language === 'fr' ? 'Min:' : 'Min:'} {formatCurrency(minAOV)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        {loading ? (
          <Skeleton className="h-[320px] w-full" />
        ) : data.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[320px] w-full"
          >
            {renderChart()}
          </ChartContainer>
        ) : (
          <div className="flex h-[320px] items-center justify-center">
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