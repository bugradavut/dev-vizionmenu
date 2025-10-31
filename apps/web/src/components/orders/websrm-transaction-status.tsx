"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, Clock, RefreshCw, XCircle } from "lucide-react"
import { Separator } from "@/components/ui/separator"

interface WebSrmTransactionStatusProps {
  orderId: string
  branchId: string
}

interface TransactionStatus {
  order_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  websrm_transaction_id: string | null
  response_code: string | null
  error_message: string | null
  retry_count: number
  max_retries: number
  created_at: string
  completed_at: string | null
  last_error_at: string | null
}

export function WebSrmTransactionStatus({ orderId, branchId }: WebSrmTransactionStatusProps) {
  const [status, setStatus] = useState<TransactionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  const fetchStatus = async () => {
    setLoading(true)
    setError(null)

    console.log('[WebSRM Status] Fetching for order:', orderId, 'branch:', branchId)

    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        console.log('[WebSRM Status] Not authenticated')
        throw new Error('Not authenticated')
      }

      const url = `${API_BASE_URL}/api/v1/websrm/transaction-status/${orderId}?branch_id=${branchId}`
      console.log('[WebSRM Status] Fetching from:', url)

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('[WebSRM Status] Response status:', response.status)

      if (response.status === 404) {
        // No WebSRM transaction for this order (not all orders have WebSRM)
        console.log('[WebSRM Status] No transaction found (404) - this order has no WebSRM transaction')
        setStatus(null)
        setLoading(false)
        return
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[WebSRM Status] API error:', response.status, errorText)
        throw new Error('Failed to fetch WebSRM transaction status')
      }

      const result = await response.json()
      console.log('[WebSRM Status] Transaction found:', result.data)
      setStatus(result.data)

    } catch (err) {
      console.error('[WebSRM Status] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [orderId, branchId])

  // Don't render if no WebSRM transaction (not all orders have WebSRM)
  if (!loading && !status && !error) {
    console.log('[WebSRM Status] Not rendering card - no transaction found for this order')
    return null
  }

  console.log('[WebSRM Status] Rendering card - loading:', loading, 'status:', status, 'error:', error)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
      case 'processing':
        return (
          <Badge variant="secondary" className="bg-blue-500">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Processing
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold">WebSRM Fiscal Transaction</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchStatus}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : status ? (
          <>
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status:</span>
              {getStatusBadge(status.status)}
            </div>

            <Separator />

            {/* Transaction ID */}
            {status.websrm_transaction_id && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Transaction ID:</p>
                <p className="text-sm font-mono">{status.websrm_transaction_id}</p>
              </div>
            )}

            {/* Error Information (FO-107) */}
            {status.error_message && (
              <>
                <Separator />
                <div className="bg-destructive/10 border border-destructive rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <p className="text-xs font-semibold text-destructive">Error Details (SW-78 FO-107)</p>
                  </div>

                  {/* Error Message */}
                  <div>
                    <p className="text-xs text-muted-foreground">Error Message:</p>
                    <p className="text-sm font-medium">{status.error_message}</p>
                  </div>

                  {/* Response Code */}
                  {status.response_code && (
                    <div>
                      <p className="text-xs text-muted-foreground">Return Code:</p>
                      <p className="text-sm font-mono">{status.response_code}</p>
                    </div>
                  )}

                  {/* Retry Count */}
                  <div>
                    <p className="text-xs text-muted-foreground">Retry Attempts:</p>
                    <p className="text-sm">
                      {status.retry_count} / {status.max_retries}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Timestamps */}
            <Separator />
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground">Created:</span>{' '}
                {new Date(status.created_at).toLocaleString()}
              </div>
              {status.completed_at && (
                <div>
                  <span className="text-muted-foreground">Completed:</span>{' '}
                  {new Date(status.completed_at).toLocaleString()}
                </div>
              )}
              {status.last_error_at && (
                <div>
                  <span className="text-muted-foreground">Last Error:</span>{' '}
                  {new Date(status.last_error_at).toLocaleString()}
                </div>
              )}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
