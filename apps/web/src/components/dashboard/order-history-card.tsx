"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/contexts/language-context"
import { ArrowRight, Clock, RefreshCw } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { enUS, fr } from "date-fns/locale"
import { ordersService } from "@/services/orders.service"

interface HistoryOrder {
  id: string
  customerName?: string
  customer?: { name?: string; email?: string }
  total_amount?: number
  totalAmount?: number
  pricing?: { total: number }
  payment_status?: string
  paymentStatus?: string
  order_status?: string
  status?: string
  created_at?: string
  createdAt?: string
}

const formatOrderNumber = (id: string): string => {
  // Use last 6 characters of UUID
  return id.slice(-6).toUpperCase()
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

const getOrderStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'border-green-200 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-300 dark:bg-green-900/20'
    case 'cancelled':
    case 'rejected':
      return 'border-red-200 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-300 dark:bg-red-900/20'
    default:
      return 'border-gray-200 text-gray-700 bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:bg-gray-900/20'
  }
}

const getOrderStatusLabel = (status: string, language: string): string => {
  const labels: Record<string, { en: string; fr: string }> = {
    completed: { en: 'Completed', fr: 'Terminé' },
    cancelled: { en: 'Cancelled', fr: 'Annulé' },
    rejected: { en: 'Rejected', fr: 'Rejeté' }
  }

  const label = labels[status.toLowerCase()] || { en: status, fr: status }
  return language === 'fr' ? label.fr : label.en
}

export function OrderHistoryCard() {
  const { language } = useLanguage()
  const locale = language === 'fr' ? fr : enUS
  const [orders, setOrders] = useState<HistoryOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      console.log('[Order History] Fetching last 10 orders')

      const response = await ordersService.getOrderHistory({
        limit: 10
      })

      console.log('[Order History] Response:', response)

      // Response structure: { data: Order[], meta: {...} }
      // Data is directly an array, not { orders: [...] }
      const ordersArray = Array.isArray(response.data) ? response.data : (response.data?.orders || [])
      console.log('[Order History] Orders count:', ordersArray.length)

      setOrders(ordersArray)
    } catch (error) {
      console.error('[Order History] Failed to fetch:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleRefresh = () => {
    fetchOrders(true)
  }

  if (loading) {
    return (
      <Card className="flex flex-col h-[420px]">
        <CardHeader className="pb-3 shrink-0">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden pb-4">
          <div className="flex-1 space-y-3 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2 p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-32" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
          <div className="pt-4 mt-4 border-t shrink-0">
            <Skeleton className="h-8 w-32" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col h-[420px]">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-base font-medium">
          {language === 'fr' ? 'Historique des Commandes' : 'Order History'}
        </CardTitle>
        <CardDescription>
          {language === 'fr'
            ? '10 dernières commandes'
            : 'Last 10 orders'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden pb-4">
        {orders.length > 0 ? (
          <>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700 dark:[&::-webkit-scrollbar-thumb]:hover:bg-gray-600">
              {orders.map((order) => {
                const customerDisplay = order.customerName || order.customer?.name || order.customer?.email || 'Guest'
                const totalAmount = order.total_amount || order.totalAmount || order.pricing?.total || 0
                const orderStatus = order.order_status || order.status || 'completed'
                const createdAt = order.created_at || order.createdAt || new Date().toISOString()

                const timeAgo = formatDistanceToNow(new Date(createdAt), {
                  addSuffix: true,
                  locale
                })

                return (
                  <div
                    key={order.id}
                    className="p-2.5 border rounded-lg space-y-1.5"
                  >
                    {/* Row 1: Order ID + Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">#{formatOrderNumber(order.id)}</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${getOrderStatusColor(orderStatus)}`}>
                        {getOrderStatusLabel(orderStatus, language)}
                      </span>
                    </div>

                    {/* Row 2: Customer name + Time */}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground truncate">{customerDisplay}</p>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                        <Clock className="h-2.5 w-2.5" />
                        {timeAgo}
                      </span>
                    </div>

                    {/* Row 3: Amount + View button */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{formatCurrency(totalAmount)}</span>
                      <Link href={`/orders/${order.id}`}>
                        <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] gap-1 group">
                          {language === 'fr' ? 'Voir Commande' : 'View Order'}
                          <ArrowRight className="h-2.5 w-2.5 transition-transform group-hover:translate-x-0.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="pt-4 mt-4 border-t shrink-0 flex items-center justify-between">
              <Link href="/orders/history">
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium group">
                  {language === 'fr' ? 'Voir tout' : 'View All'}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-sm text-muted-foreground">
                {language === 'fr'
                  ? 'Aucun historique'
                  : 'No history'}
              </p>
            </div>
            <div className="pt-4 mt-4 border-t shrink-0 flex items-center justify-between">
              <Link href="/orders/history">
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium group">
                  {language === 'fr' ? 'Voir tout' : 'View All'}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
