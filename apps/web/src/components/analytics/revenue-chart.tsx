"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { TrendingUp, AreaChart as AreaChartIcon, BarChart3, LineChart as LineChartIcon, CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Skeleton } from "@/components/ui/skeleton"
import { useState, useEffect, useCallback } from "react"
import { analyticsService, PeriodPreset } from "@/services/analytics.service"
import { useEnhancedAuth } from "@/hooks/use-enhanced-auth"
import { format } from "date-fns"

export interface RevenueDataPoint {
  date: string
  revenue: number
}

interface RevenueChartProps {
  title: string
  type?: "line" | "bar" | "area"
  language?: "en" | "fr"
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "#ea580c", // Orange primary color
  },
}

export function RevenueChart({
  title,
  type: initialType = "area",
  language = "en"
}: RevenueChartProps) {
  const { chainId } = useEnhancedAuth()
  const [chartType, setChartType] = useState<"line" | "bar" | "area">(initialType)
  const [period, setPeriod] = useState<PeriodPreset>("7d")
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [openRange, setOpenRange] = useState(false)
  const [data, setData] = useState<RevenueDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!chainId) return
    setLoading(true)
    try {
      const params = {
        chainId,
        period: period,
        startDate: period === 'custom' && dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        endDate: period === 'custom' && dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      }

      const response = await analyticsService.getChainAnalytics(params)
      setData(response.data.revenueByDate)
    } catch (error) {
      console.error('Failed to fetch revenue data:', error)
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
    setOpenRange(false) // Always close on quick select
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const renderChart = () => {
    const chartData = data.map(item => ({
      ...item,
      displayDate: formatDate(item.date)
    }))

    switch (chartType) {
      case "line":
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="displayDate"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#ea580c"
              strokeWidth={2}
              dot={{ fill: "#ea580c", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: "#ea580c", strokeWidth: 2 }}
            />
          </LineChart>
        )

      case "bar":
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="displayDate"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
                />
              }
            />
            <Bar
              dataKey="revenue"
              fill="#ea580c"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        )

      case "area":
      default:
        return (
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="displayDate"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#ea580c"
              fill="#ea580c"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        )
    }
  }

  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0)
  const avgRevenue = data.length > 0 ? totalRevenue / data.length : 0

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
              <Select value={chartType} onValueChange={(value: "line" | "bar" | "area") => setChartType(value)}>
                <SelectTrigger className="h-8 flex-1 sm:flex-none sm:w-[100px] min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="area">
                    <div className="flex items-center gap-2">
                      <AreaChartIcon className="h-4 w-4" />
                      <span>{language === 'fr' ? 'Zone' : 'Area'}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="line">
                    <div className="flex items-center gap-2">
                      <LineChartIcon className="h-4 w-4" />
                      <span>{language === 'fr' ? 'Ligne' : 'Line'}</span>
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
              {language === 'fr' ? 'Total:' : 'Total:'} {formatCurrency(totalRevenue)}
            </span>
            <span>
              {language === 'fr' ? 'Moyenne:' : 'Average:'} {formatCurrency(avgRevenue)}
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