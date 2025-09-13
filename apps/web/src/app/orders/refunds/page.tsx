"use client"

import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '@/contexts/language-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Loader2, RefreshCw, AlertCircle, DollarSign, Calendar, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { format } from 'date-fns'

interface EligibleOrder {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  total_amount: number
  commission_rate: number
  payment_status: string
  order_type: 'dine_in' | 'takeaway' | 'delivery'
  maxRefundable: number
  alreadyRefunded: number
  orderAge: number
  created_at: string
  order_items: Array<{
    quantity: number
    price: number
    menu_items: { name: string }
  }>
}

interface RefundHistory {
  id: string
  refund_id: string
  amount: number
  commission_refund: number
  reason: string
  status: string
  initiated_by: string
  created_at: string
  orders: {
    order_number: string
    customer_name: string
  }
}

interface RefundAnalytics {
  totalRefunds: number
  totalCommissionRefunded: number
  refundCount: number
  averageRefundAmount: number
  period: string
}

export default function RefundsPage() {
  const { language } = useLanguage()
  const { toast } = useToast()

  const [eligibleOrders, setEligibleOrders] = useState<EligibleOrder[]>([])
  const [refundHistory, setRefundHistory] = useState<RefundHistory[]>([])
  const [analytics, setAnalytics] = useState<RefundAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<EligibleOrder | null>(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [processingRefund, setProcessingRefund] = useState(false)

  const fetchEligibleOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/refunds/eligible', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setEligibleOrders(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching eligible orders:', error)
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: language === 'fr' ? 'Erreur lors du chargement des commandes remboursables' : 'Failed to load refundable orders',
        variant: 'destructive'
      })
    }
  }, [language, toast])

  const fetchRefundHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/refunds/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setRefundHistory(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching refund history:', error)
    }
  }, [])

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/refunds/analytics?days=7', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    }
  }, [])

  const loadAllData = useCallback(async () => {
    setLoading(true)
    await Promise.all([
      fetchEligibleOrders(),
      fetchRefundHistory(),
      fetchAnalytics()
    ])
    setLoading(false)
  }, [fetchEligibleOrders, fetchRefundHistory, fetchAnalytics])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  const handleOpenRefundDialog = (order: EligibleOrder) => {
    setSelectedOrder(order)
    setRefundAmount(order.maxRefundable.toString())
    setRefundReason('requested_by_customer')
    setRefundDialogOpen(true)
  }

  const handleProcessRefund = async () => {
    if (!selectedOrder || !refundAmount) return

    setProcessingRefund(true)
    try {
      const response = await fetch(`/api/v1/refunds/orders/${selectedOrder.id}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          amount: parseFloat(refundAmount),
          reason: refundReason
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: language === 'fr' ? 'Succès' : 'Success',
          description: data.message,
        })
        setRefundDialogOpen(false)
        loadAllData() // Refresh all data
      } else {
        const error = await response.json()
        toast({
          title: language === 'fr' ? 'Erreur' : 'Error',
          description: error.details || (language === 'fr' ? 'Erreur lors du remboursement' : 'Refund failed'),
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error processing refund:', error)
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: language === 'fr' ? 'Erreur lors du remboursement' : 'Refund failed',
        variant: 'destructive'
      })
    } finally {
      setProcessingRefund(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />{language === 'fr' ? 'Réussi' : 'Success'}</Badge>
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{language === 'fr' ? 'En attente' : 'Pending'}</Badge>
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />{language === 'fr' ? 'Échoué' : 'Failed'}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getOrderTypeBadge = (orderType: string) => {
    const types = {
      dine_in: language === 'fr' ? 'Sur place' : 'Dine In',
      takeaway: language === 'fr' ? 'À emporter' : 'Takeaway', 
      delivery: language === 'fr' ? 'Livraison' : 'Delivery'
    }
    return <Badge variant="outline">{types[orderType as keyof typeof types] || orderType}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">{language === 'fr' ? 'Chargement...' : 'Loading...'}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {language === 'fr' ? 'Gestion des remboursements' : 'Refund Management'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'fr' ? 'Gérez les remboursements des 7 derniers jours' : 'Manage refunds for orders from the last 7 days'}
          </p>
        </div>
        <Button onClick={loadAllData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          {language === 'fr' ? 'Actualiser' : 'Refresh'}
        </Button>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{language === 'fr' ? 'Remboursements totaux' : 'Total Refunds'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analytics.totalRefunds.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">{analytics.period}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{language === 'fr' ? 'Commissions remboursées' : 'Commission Refunded'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analytics.totalCommissionRefunded.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">{language === 'fr' ? 'Retourné à la plateforme' : 'Returned to platform'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{language === 'fr' ? 'Nombre de remboursements' : 'Refund Count'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.refundCount}</div>
              <div className="text-xs text-muted-foreground">{analytics.period}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{language === 'fr' ? 'Montant moyen' : 'Average Amount'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analytics.averageRefundAmount.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">{language === 'fr' ? 'Par remboursement' : 'Per refund'}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="eligible" className="space-y-4">
        <TabsList>
          <TabsTrigger value="eligible">
            {language === 'fr' ? 'Commandes remboursables' : 'Eligible Orders'} ({eligibleOrders.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            {language === 'fr' ? 'Historique' : 'History'} ({refundHistory.length})
          </TabsTrigger>
        </TabsList>

        {/* Eligible Orders Tab */}
        <TabsContent value="eligible" className="space-y-4">
          {eligibleOrders.length > 0 ? (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {language === 'fr' 
                    ? 'Seules les commandes des 7 derniers jours peuvent être remboursées. Les commissions sont automatiquement ajustées.'
                    : 'Only orders from the last 7 days can be refunded. Commissions are automatically adjusted.'
                  }
                </AlertDescription>
              </Alert>
              
              <Card>
                <CardHeader>
                  <CardTitle>{language === 'fr' ? 'Commandes remboursables' : 'Refundable Orders'}</CardTitle>
                  <CardDescription>
                    {language === 'fr' ? 'Commandes payées en ligne des 7 derniers jours' : 'Online paid orders from the last 7 days'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'fr' ? 'Commande' : 'Order'}</TableHead>
                        <TableHead>{language === 'fr' ? 'Client' : 'Customer'}</TableHead>
                        <TableHead>{language === 'fr' ? 'Type' : 'Type'}</TableHead>
                        <TableHead>{language === 'fr' ? 'Total' : 'Total'}</TableHead>
                        <TableHead>{language === 'fr' ? 'Remboursable' : 'Refundable'}</TableHead>
                        <TableHead>{language === 'fr' ? 'Âge' : 'Age'}</TableHead>
                        <TableHead>{language === 'fr' ? 'Actions' : 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eligibleOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <div className="font-medium">#{order.order_number}</div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(order.created_at), 'MMM d, HH:mm')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>{order.customer_name || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground">{order.customer_phone || ''}</div>
                          </TableCell>
                          <TableCell>{getOrderTypeBadge(order.order_type)}</TableCell>
                          <TableCell>
                            <div>${order.total_amount.toFixed(2)}</div>
                            {order.alreadyRefunded > 0 && (
                              <div className="text-xs text-red-600">
                                -{order.alreadyRefunded.toFixed(2)} {language === 'fr' ? 'remboursé' : 'refunded'}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-green-600">${order.maxRefundable.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">
                              {((order.commission_rate || 0) * order.maxRefundable / 100).toFixed(2)} {language === 'fr' ? 'commission' : 'commission'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={order.orderAge >= 6 ? "destructive" : "secondary"}>
                              {order.orderAge} {language === 'fr' ? 'j' : 'd'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              onClick={() => handleOpenRefundDialog(order)}
                              disabled={order.maxRefundable <= 0}
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              {language === 'fr' ? 'Rembourser' : 'Refund'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {language === 'fr' ? 'Aucune commande remboursable' : 'No Refundable Orders'}
                </h3>
                <p className="text-muted-foreground">
                  {language === 'fr' 
                    ? 'Aucune commande payée en ligne des 7 derniers jours trouvée.'
                    : 'No online paid orders from the last 7 days found.'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>{language === 'fr' ? 'Historique des remboursements' : 'Refund History'}</CardTitle>
              <CardDescription>
                {language === 'fr' ? 'Tous les remboursements traités' : 'All processed refunds'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {refundHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'fr' ? 'Commande' : 'Order'}</TableHead>
                      <TableHead>{language === 'fr' ? 'Client' : 'Customer'}</TableHead>
                      <TableHead>{language === 'fr' ? 'Montant' : 'Amount'}</TableHead>
                      <TableHead>{language === 'fr' ? 'Commission' : 'Commission'}</TableHead>
                      <TableHead>{language === 'fr' ? 'Raison' : 'Reason'}</TableHead>
                      <TableHead>{language === 'fr' ? 'Statut' : 'Status'}</TableHead>
                      <TableHead>{language === 'fr' ? 'Date' : 'Date'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {refundHistory.map((refund) => (
                      <TableRow key={refund.id}>
                        <TableCell>
                          <div className="font-medium">#{refund.orders.order_number}</div>
                          <div className="text-xs text-muted-foreground">{refund.refund_id}</div>
                        </TableCell>
                        <TableCell>{refund.orders.customer_name}</TableCell>
                        <TableCell>
                          <div className="font-medium">${refund.amount.toFixed(2)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-red-600">${refund.commission_refund.toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">{language === 'fr' ? 'retourné' : 'returned'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {refund.reason === 'requested_by_customer' ? (language === 'fr' ? 'Demande client' : 'Customer Request') : refund.reason}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(refund.status)}</TableCell>
                        <TableCell>
                          {format(new Date(refund.created_at), 'MMM d, HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {language === 'fr' ? 'Aucun remboursement' : 'No Refunds'}
                  </h3>
                  <p className="text-muted-foreground">
                    {language === 'fr' ? 'Aucun remboursement traité pour le moment.' : 'No refunds have been processed yet.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'fr' ? 'Traiter le remboursement' : 'Process Refund'}
            </DialogTitle>
            <DialogDescription>
              {language === 'fr' 
                ? `Commande #${selectedOrder?.order_number} - Client: ${selectedOrder?.customer_name}`
                : `Order #${selectedOrder?.order_number} - Customer: ${selectedOrder?.customer_name}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              {/* Order Summary */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{language === 'fr' ? 'Total original:' : 'Original Total:'}</span>
                  <span>${selectedOrder.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{language === 'fr' ? 'Déjà remboursé:' : 'Already Refunded:'}</span>
                  <span className="text-red-600">-${selectedOrder.alreadyRefunded.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>{language === 'fr' ? 'Remboursable max:' : 'Max Refundable:'}</span>
                  <span className="text-green-600">${selectedOrder.maxRefundable.toFixed(2)}</span>
                </div>
              </div>

              {/* Refund Amount */}
              <div className="space-y-2">
                <Label htmlFor="refund-amount">
                  {language === 'fr' ? 'Montant à rembourser' : 'Refund Amount'}
                </Label>
                <Input
                  id="refund-amount"
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  max={selectedOrder.maxRefundable}
                  min="0.01"
                  step="0.01"
                />
                {refundAmount && (
                  <div className="text-sm text-muted-foreground">
                    {language === 'fr' ? 'Commission à retourner:' : 'Commission to return:'} ${((parseFloat(refundAmount) || 0) * (selectedOrder.commission_rate || 0) / 100).toFixed(2)}
                  </div>
                )}
              </div>

              {/* Refund Reason */}
              <div className="space-y-2">
                <Label htmlFor="refund-reason">
                  {language === 'fr' ? 'Raison du remboursement' : 'Refund Reason'}
                </Label>
                <Select value={refundReason} onValueChange={setRefundReason}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="requested_by_customer">
                      {language === 'fr' ? 'Demande du client' : 'Customer Request'}
                    </SelectItem>
                    <SelectItem value="duplicate">
                      {language === 'fr' ? 'Commande en double' : 'Duplicate Order'}
                    </SelectItem>
                    <SelectItem value="quality_issue">
                      {language === 'fr' ? 'Problème de qualité' : 'Quality Issue'}
                    </SelectItem>
                    <SelectItem value="wrong_order">
                      {language === 'fr' ? 'Commande incorrecte' : 'Wrong Order'}
                    </SelectItem>
                    <SelectItem value="other">
                      {language === 'fr' ? 'Autre' : 'Other'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleProcessRefund} 
              disabled={processingRefund || !refundAmount || parseFloat(refundAmount) <= 0}
            >
              {processingRefund && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {language === 'fr' ? 'Traiter le remboursement' : 'Process Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}