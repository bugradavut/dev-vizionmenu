"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Clock, RefreshCw, XCircle, Info } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/translations"

interface WebSrmTransactionDialogProps {
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

export function WebSrmTransactionDialog({ orderId, branchId }: WebSrmTransactionDialogProps) {
  const [status, setStatus] = useState<TransactionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  const text = t.webSrm

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  const fetchStatus = async () => {
    setLoading(true)
    setError(null)

    console.log('[WebSRM Dialog] Fetching for order:', orderId, 'branch:', branchId)

    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        console.log('[WebSRM Dialog] Not authenticated')
        throw new Error('Not authenticated')
      }

      const url = `${API_BASE_URL}/api/v1/websrm/transaction-status/${orderId}?branch_id=${branchId}`
      console.log('[WebSRM Dialog] Fetching from:', url)

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('[WebSRM Dialog] Response status:', response.status)

      if (response.status === 404) {
        // No WebSRM transaction for this order
        console.log('[WebSRM Dialog] No transaction found (404)')
        setStatus(null)
        setLoading(false)
        return
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[WebSRM Dialog] API error:', response.status, errorText)
        throw new Error('Failed to fetch WebSRM transaction status')
      }

      const result = await response.json()
      console.log('[WebSRM Dialog] Transaction found:', result.data)
      setStatus(result.data)

    } catch (err) {
      console.error('[WebSRM Dialog] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Fetch when dialog opens
  useEffect(() => {
    if (open) {
      fetchStatus()
    }
  }, [open])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            {text.completed}
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-500">
            <Clock className="h-3 w-3 mr-1" />
            {text.pending}
          </Badge>
        )
      case 'processing':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-500">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            {text.processing}
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-700 border-red-500">
            <XCircle className="h-3 w-3 mr-1" />
            {text.failed}
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-500">
            {status}
          </Badge>
        )
    }
  }

  // Don't render button if no WebSRM transaction exists
  if (!loading && !status && !error && !open) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Info className="h-4 w-4 mr-2" />
          {text.buttonTitle}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {text.dialogTitle}
          </DialogTitle>
          <DialogDescription>
            {text.dialogDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>{text.loading}</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-destructive py-4">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ) : !status ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">{text.notFound}</p>
              <p className="text-xs mt-2">{text.notFoundDesc}</p>
            </div>
          ) : (
            <>
              {/* Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-muted-foreground">{text.status}:</span>
                {getStatusBadge(status.status)}
              </div>

              <Separator />

              {/* Transaction ID */}
              {status.websrm_transaction_id && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{text.transactionId}:</p>
                  <p className="text-sm font-mono bg-gray-50 p-3 rounded border break-all">
                    {status.websrm_transaction_id}
                  </p>
                </div>
              )}

              {/* Environment Badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-500">
                  {text.environment}: {text.environmentEssai}
                </Badge>
                <Badge variant="outline" className="text-xs bg-gray-100 text-gray-700 border-gray-500">
                  {text.device}: 0000-0000-0000
                </Badge>
              </div>

              {/* Error Information (FO-107) */}
              {status.error_message && (
                <>
                  <Separator />
                  <div className="bg-destructive/10 border border-destructive rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                      <p className="text-xs font-semibold text-destructive">{text.errorDetails}</p>
                    </div>

                    {/* Error Message */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{text.errorMessage}:</p>
                      <p className="text-sm font-medium">{status.error_message}</p>
                    </div>

                    {/* Response Code */}
                    {status.response_code && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{text.returnCode}:</p>
                        <p className="text-sm font-mono bg-white p-2 rounded border">
                          {status.response_code}
                        </p>
                      </div>
                    )}

                    {/* Retry Count */}
                    {status.retry_count > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{text.retryAttempts}:</p>
                        <p className="text-sm">
                          {status.retry_count} / {status.max_retries}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Timestamps */}
              <Separator />
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{text.created}:</span>
                  <span className="font-mono">{new Date(status.created_at).toLocaleString()}</span>
                </div>
                {status.completed_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{text.completedTime}:</span>
                    <span className="font-mono">{new Date(status.completed_at).toLocaleString()}</span>
                  </div>
                )}
                {status.last_error_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{text.lastError}:</span>
                    <span className="font-mono">{new Date(status.last_error_at).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Refresh Button */}
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchStatus}
                  disabled={loading}
                  className="w-full"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  {text.refreshStatus}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
