"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Clock, RefreshCw, XCircle, Receipt } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/translations"

interface WebSrmTransactionDialogProps {
  orderId: string
  branchId: string
}

interface Transaction {
  id: string
  order_id: string
  tenant_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  websrm_transaction_id: string | null
  response_code: string | null
  error_message: string | null
  retry_count: number
  max_retries: number
  created_at: string
  completed_at: string | null
  last_error_at: string | null
  metadata?: {
    transaction_type?: 'VEN' | 'REM'
    original_payment_method?: string
    change_to?: string
    refund_type?: string
    amount?: number
  }
}

export function WebSrmTransactionDialog({ orderId, branchId }: WebSrmTransactionDialogProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  const text = t.webSrm

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  const fetchTransactionHistory = async () => {
    setLoading(true)
    setError(null)

    console.log('[WebSRM Dialog] Fetching transaction history for order:', orderId, 'branch:', branchId)

    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        console.log('[WebSRM Dialog] Not authenticated')
        throw new Error('Not authenticated')
      }

      const url = `${API_BASE_URL}/api/v1/websrm/transaction-history/${orderId}?branch_id=${branchId}`
      console.log('[WebSRM Dialog] Fetching from:', url)

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('[WebSRM Dialog] Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[WebSRM Dialog] API error:', response.status, errorText)
        throw new Error('Failed to fetch WebSRM transaction history')
      }

      const result = await response.json()
      console.log('[WebSRM Dialog] Transactions found:', result.data.count, 'transactions')
      setTransactions(result.data.transactions || [])

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
      fetchTransactionHistory()
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

  const getTransactionTypeLabel = (transaction: Transaction) => {
    const txType = transaction.metadata?.transaction_type
    if (txType === 'REM') {
      return language === 'fr' ? 'Remboursement' : 'Refund'
    }
    return language === 'fr' ? 'Vente' : 'Sale'
  }

  const getPaymentMethodLabel = (method?: string) => {
    if (!method) return 'N/A'
    switch (method) {
      case 'cash': return language === 'fr' ? 'Comptant' : 'Cash'
      case 'card': return language === 'fr' ? 'Carte' : 'Card'
      case 'online': return 'Online'
      default: return method.toUpperCase()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Receipt className="h-4 w-4 mr-2" />
          {language === 'fr' ? 'Faturalar' : 'Receipts'}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {language === 'fr' ? 'Fatura Geçmişi' : 'Receipt History'}
          </DialogTitle>
          <DialogDescription>
            {loading
              ? (language === 'fr' ? 'Chargement...' : 'Loading...')
              : transactions.length > 0
              ? (language === 'fr'
                  ? `${transactions.length} transaction(s) fiscale(s)`
                  : `${transactions.length} fiscal transaction(s)`)
              : (language === 'fr' ? 'Aucune transaction' : 'No transactions')}
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
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm font-medium">
                {language === 'fr' ? 'Aucune transaction trouvée' : 'No transactions found'}
              </p>
              <p className="text-xs mt-2 text-gray-500">
                {language === 'fr'
                  ? 'Cette commande n\'a pas encore de transactions fiscales.'
                  : 'This order does not have any fiscal transactions yet.'}
              </p>
            </div>
          ) : (
            <>
              {/* Transaction List */}
              <div className="space-y-3">
                {transactions.map((tx, index) => (
                  <div key={tx.id} className="border rounded-lg overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-900">
                          #{index + 1} - {getTransactionTypeLabel(tx)}
                        </span>
                        {tx.metadata?.refund_type === 'payment_change' && (
                          <span className="text-xs text-orange-600">
                            ({language === 'fr' ? 'Changement de paiement' : 'Payment change'})
                          </span>
                        )}
                      </div>
                      {getStatusBadge(tx.status)}
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      {/* Transaction ID */}
                      {tx.websrm_transaction_id && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">{text.transactionId}:</p>
                          <p className="text-xs font-mono bg-gray-50 p-2 rounded border break-all">
                            {tx.websrm_transaction_id}
                          </p>
                        </div>
                      )}

                      {/* Payment Method Change Info */}
                      {tx.metadata?.transaction_type === 'REM' && tx.metadata?.original_payment_method && (
                        <div className="text-sm text-gray-700 bg-orange-50 border border-orange-200 rounded p-2">
                          {language === 'fr' ? 'Paiement' : 'Payment'}: {getPaymentMethodLabel(tx.metadata.original_payment_method)}
                          {tx.metadata.change_to && (
                            <> → {getPaymentMethodLabel(tx.metadata.change_to)}</>
                          )}
                        </div>
                      )}

                      {/* Error Information */}
                      {tx.error_message && (
                        <div className="bg-red-50 border border-red-200 rounded p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                            <p className="text-sm font-semibold text-red-900">{text.errorDetails}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">{text.errorMessage}:</p>
                            <p className="text-sm text-gray-900">{tx.error_message}</p>
                          </div>
                          {tx.response_code && (
                            <div>
                              <p className="text-xs text-gray-600 mb-1">{text.returnCode}:</p>
                              <p className="text-xs font-mono bg-white p-2 rounded border">
                                {tx.response_code}
                              </p>
                            </div>
                          )}
                          {tx.retry_count > 0 && (
                            <div>
                              <p className="text-xs text-gray-600 mb-1">{text.retryAttempts}:</p>
                              <p className="text-sm text-gray-900">
                                {tx.retry_count} / {tx.max_retries}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Timestamps */}
                      <div className="pt-2 border-t space-y-1 text-xs text-gray-500">
                        <div className="flex justify-between">
                          <span>{text.created}:</span>
                          <span className="font-mono text-gray-700">{new Date(tx.created_at).toLocaleString()}</span>
                        </div>
                        {tx.completed_at && (
                          <div className="flex justify-between">
                            <span>{text.completedTime}:</span>
                            <span className="font-mono text-gray-700">{new Date(tx.completed_at).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Refresh Button */}
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchTransactionHistory}
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
