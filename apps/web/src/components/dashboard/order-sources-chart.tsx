"use client"

import { Pie, PieChart, Cell, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useLanguage } from "@/contexts/language-context"
import { Skeleton } from "@/components/ui/skeleton"

interface OrderSourceData {
  source: string
  count: number
  label: string
}

interface OrderSourcesChartProps {
  data: OrderSourceData[]
  totalOrders: number
  loading?: boolean
}

const COLORS = [
  "hsl(25, 95%, 53%)",   // Orange
  "hsl(142, 71%, 45%)",  // Green
  "hsl(221, 83%, 53%)",  // Blue
  "hsl(262, 83%, 58%)",  // Purple
  "hsl(0, 84%, 60%)",    // Red
]

const sourceLabels: Record<string, { en: string; fr: string }> = {
  website: { en: "Website", fr: "Site Web" },
  qr_menu: { en: "QR Menu", fr: "Menu QR" },
  counter: { en: "Counter", fr: "Comptoir" },
  phone: { en: "Phone", fr: "Téléphone" },
  app: { en: "Mobile App", fr: "App Mobile" },
  other: { en: "Other", fr: "Autre" },
}

const chartConfig = {
  count: {
    label: "Orders",
  },
} satisfies ChartConfig

export function OrderSourcesChart({ data, totalOrders, loading }: OrderSourcesChartProps) {
  const { language } = useLanguage()

  if (loading) {
    return (
      <Card className="flex flex-col h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24 mt-1" />
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center pb-4">
          <Skeleton className="h-[200px] w-[200px] rounded-full" />
        </CardContent>
      </Card>
    )
  }

  // If no data, show empty state
  const hasData = data && data.length > 0 && totalOrders > 0

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          {language === 'fr' ? 'Sources des Commandes' : 'Order Sources'}
        </CardTitle>
        <CardDescription>
          {language === 'fr' ? 'Répartition par canal' : 'Breakdown by channel'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        {hasData ? (
          <>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <span className="font-medium">
                          {value} {language === 'fr' ? 'commandes' : 'orders'}
                        </span>
                      )}
                    />
                  }
                />
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            {/* Legend */}
            <div className="flex flex-col gap-2 mt-4">
              {data.map((item, index) => {
                const percentage = totalOrders > 0 ? ((item.count / totalOrders) * 100).toFixed(0) : 0
                const sourceLabel = sourceLabels[item.source]?.[language === 'fr' ? 'fr' : 'en'] || item.label

                return (
                  <div key={item.source} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{sourceLabel}</span>
                    </div>
                    <span className="font-medium">{percentage}%</span>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center h-[280px] text-center">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-sm text-muted-foreground">
              {language === 'fr'
                ? 'Aucune donnée disponible'
                : 'No data available'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
