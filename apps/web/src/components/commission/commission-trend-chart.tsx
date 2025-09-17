'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts'
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { TrendingUp, LineChart as LineChartIcon, AreaChart as AreaChartIcon, BarChart3, CalendarIcon } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { commissionService, PeriodPreset, CommissionTrendPoint } from "@/services/commission.service"
import { format } from "date-fns"

interface CommissionTrendChartProps {
  language: string
  formatCurrency: (amount: number) => string
  title: string
  type?: "line" | "area" | "bar"
}

// Dynamic chart configuration
const chartConfig = {
  commission: {
    label: "Commission",
    color: "#3b82f6", // Blue
  },
}

export function CommissionTrendChart({
  language,
  formatCurrency,
  title,
  type: initialType = "line"
}: CommissionTrendChartProps) {
  const [chartType, setChartType] = useState<"line" | "area" | "bar">(initialType)
  const [period, setPeriod] = useState<PeriodPreset>('7d')
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [openRange, setOpenRange] = useState(false)
  const [data, setData] = useState<CommissionTrendPoint[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, unknown> = {}

      if (period === 'custom') {
        if (dateRange.from && dateRange.to) {
          params.startDate = format(dateRange.from, 'yyyy-MM-dd')
          params.endDate = format(dateRange.to, 'yyyy-MM-dd')
        } else {
          // Fallback to 7d if custom but no dates
          params.period = '7d'
        }
      } else {
        params.period = period
      }

      const response = await commissionService.getCommissionReports(params)
      setData(response.trends)
    } catch (error) {
      console.error('Failed to fetch commission trend data:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [period, dateRange.from, dateRange.to])

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

  // Format data for chart
  const chartData = data.map(item => {
    const date = new Date(item.date)
    const formattedDate = date.toLocaleDateString(
      language === 'fr' ? 'fr-CA' : 'en-CA',
      { month: 'short', day: 'numeric' }
    )

    return {
      ...item,
      displayDate: formattedDate
    }
  })

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA', {
      month: 'short',
      day: 'numeric'
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-lg border bg-white/95 backdrop-blur-sm p-3 shadow-lg">
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
              <span className="text-sm font-semibold">{formatDate(label || '')}</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">
                  {language === 'fr' ? 'Commission:' : 'Commission:'}
                </span>
                <span className="text-sm font-bold">
                  {formatCurrency(data.commission)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">
                  {language === 'fr' ? 'Commandes:' : 'Orders:'}
                </span>
                <span className="text-sm font-medium">
                  {data.orders}
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
  const totalCommission = data.reduce((sum, item) => sum + item.commission, 0)
  const avgCommission = data.length > 0 ? totalCommission / data.length : 0

  const renderChart = () => {
    switch (chartType) {
      case "area":
        return (
          <ResponsiveContainer width="100%" height="100%">
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
                tickFormatter={(value) => formatCurrency(value)}
              />
              <ChartTooltip content={customTooltip} />
              <Area
                type="monotone"
                dataKey="commission"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )

      case "bar":
        return (
          <ResponsiveContainer width="100%" height="100%">
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
                tickFormatter={(value) => formatCurrency(value)}
              />
              <ChartTooltip content={customTooltip} />
              <Bar
                dataKey="commission"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )

      case "line":
      default:
        return (
          <ResponsiveContainer width="100%" height="100%">
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
                tickFormatter={(value) => formatCurrency(value)}
              />
              <ChartTooltip content={customTooltip} />
              <Line
                type="monotone"
                dataKey="commission"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
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
              {language === 'fr' ? 'Total:' : 'Total:'} {formatCurrency(totalCommission)}
            </span>
            <span>
              {language === 'fr' ? 'Moyenne:' : 'Average:'} {formatCurrency(avgCommission)}
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