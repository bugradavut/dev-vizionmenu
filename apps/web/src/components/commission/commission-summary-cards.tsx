'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DollarSign,
  ShoppingCart,
  Percent,
  TrendingUp
} from "lucide-react"

interface CommissionData {
  totalCommission: number
  totalOrders: number
  averageCommissionRate: number
  breakdown: {
    website: { orders: number; commission: number; rate: number }
    qr: { orders: number; commission: number; rate: number }
    mobile_app: { orders: number; commission: number; rate: number }
  }
}

interface CommissionSummaryCardsProps {
  data: CommissionData | null
  loading: boolean
  formatCurrency: (amount: number) => string
  language: string
}

export function CommissionSummaryCards({
  data,
  loading,
  formatCurrency,
  language
}: CommissionSummaryCardsProps) {
  const isLoading = loading || !data

  const cards = [
    {
      title: language === 'fr' ? 'Commission Totale' : 'Total Commission',
      value: isLoading ? null : formatCurrency(data.totalCommission),
      icon: DollarSign,
      description: language === 'fr' ? 'Revenus de commission générés' : 'Commission revenue generated',
      color: 'text-green-600'
    },
    {
      title: language === 'fr' ? 'Commandes Totales' : 'Total Orders',
      value: isLoading ? null : data.totalOrders.toLocaleString(),
      icon: ShoppingCart,
      description: language === 'fr' ? 'Commandes avec commission' : 'Orders with commission',
      color: 'text-blue-600'
    },
    {
      title: language === 'fr' ? 'Taux Moyen' : 'Average Rate',
      value: isLoading ? null : `${data.averageCommissionRate.toFixed(2)}%`,
      icon: Percent,
      description: language === 'fr' ? 'Taux de commission moyen' : 'Average commission rate',
      color: 'text-purple-600'
    },
    {
      title: language === 'fr' ? 'Commission par Commande' : 'Per Order',
      value: isLoading ? null : formatCurrency(data.totalOrders > 0 ? data.totalCommission / data.totalOrders : 0),
      icon: TrendingUp,
      description: language === 'fr' ? 'Commission moyenne par commande' : 'Average commission per order',
      color: 'text-orange-600'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {cards.map((card, index) => {
        const IconComponent = card.icon

        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <IconComponent className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  card.value
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}