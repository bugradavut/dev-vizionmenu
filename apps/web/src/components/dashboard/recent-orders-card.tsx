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

interface RecentOrder {
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

const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'paid':
    case 'succeeded':
      return 'border-green-200 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-300 dark:bg-green-900/20'
    case 'pending':
      return 'border-yellow-200 text-yellow-700 bg-yellow-50 dark:border-yellow-700 dark:text-yellow-300 dark:bg-yellow-900/20'
    case 'failed':
    case 'cancelled':
      return 'border-red-200 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-300 dark:bg-red-900/20'
    default:
      return 'border-gray-200 text-gray-700 bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:bg-gray-900/20'
  }
}

const getStatusLabel = (status: string, language: string): string => {
  const labels: Record<string, { en: string; fr: string }> = {
    paid: { en: 'Paid', fr: 'Payé' },
    succeeded: { en: 'Paid', fr: 'Payé' },
    pending: { en: 'Pending', fr: 'En attente' },
    failed: { en: 'Failed', fr: 'Échoué' },
    cancelled: { en: 'Cancelled', fr: 'Annulé' }
  }

  const label = labels[status.toLowerCase()] || { en: status, fr: status }
  return language === 'fr' ? label.fr : label.en
}

interface RecentOrdersCardProps {
  onRefresh?: () => Promise<void>
  refreshing?: boolean
}

export function RecentOrdersCard({ onRefresh, refreshing: externalRefreshing }: RecentOrdersCardProps = {}) {
  const { language } = useLanguage()
  const locale = language === 'fr' ? fr : enUS
  const [orders, setOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [internalRefreshing, setInternalRefreshing] = useState(false)

  const refreshing = externalRefreshing ?? internalRefreshing

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setInternalRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      // Get last 24 hours
      const yesterday = new Date()
      yesterday.setHours(yesterday.getHours() - 24)

      console.log('[Live Orders] Fetching orders from:', yesterday.toISOString())

      const response = await ordersService.getLiveOrders({
        limit: 10,
        date_from: yesterday.toISOString()
      })

      console.log('[Live Orders] Response:', response)

      // Response structure: { data: Order[], meta: {...} }
      // Data is directly an array, not { orders: [...] }
      const ordersArray = Array.isArray(response.data) ? response.data : (response.data?.orders || [])
      console.log('[Live Orders] Orders count:', ordersArray.length)

      setOrders(ordersArray)
    } catch (error) {
      console.error('[Live Orders] Failed to fetch:', error)
    } finally {
      setLoading(false)
      setInternalRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleRefresh = async () => {
    if (onRefresh) {
      // Use global refresh handler
      await onRefresh()
      // Also refresh local data
      await fetchOrders(true)
    } else {
      // Fallback to local refresh only
      fetchOrders(true)
    }
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
          {language === 'fr' ? 'Commandes en Direct' : 'Live Orders'}
        </CardTitle>
        <CardDescription>
          {language === 'fr'
            ? 'Dernières 24 heures'
            : 'Last 24 hours'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden pb-4">
        {orders.length > 0 ? (
          <>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-700 dark:[&::-webkit-scrollbar-thumb]:hover:bg-gray-600">
              {orders.map((order) => {
                const customerDisplay = order.customerName || order.customer?.name || order.customer?.email || 'Guest'
                const totalAmount = order.total_amount || order.totalAmount || order.pricing?.total || 0
                const paymentStatus = order.payment_status || order.paymentStatus || 'pending'
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
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${getStatusColor(paymentStatus)}`}>
                        {getStatusLabel(paymentStatus, language)}
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
              <Link href="/orders/live">
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium group">
                  {language === 'fr' ? 'Voir toutes' : 'View All'}
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
              <div className="text-4xl mb-2">📦</div>
              <p className="text-sm text-muted-foreground">
                {language === 'fr'
                  ? 'Aucune commande récente'
                  : 'No recent orders'}
              </p>
            </div>
            <div className="pt-4 mt-4 border-t shrink-0 flex items-center justify-between">
              <Link href="/orders/live">
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium group">
                  {language === 'fr' ? 'Voir toutes' : 'View All'}
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
