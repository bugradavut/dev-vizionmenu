"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '../../contexts/cart-context'
import { translations } from '@/lib/translations'
import { orderService } from '@/services/order-service'
import { commissionService } from '@/services/commission.service'
import { stripePaymentService } from '@/services/stripe.service'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Loader2, AlertCircle } from 'lucide-react'
import { StripePaymentForm } from '@/components/stripe/payment-form'
import type { CustomerFormData, CustomerValidationResult } from './customer-information-section'

interface OrderTotals {
  itemsTotal: number
  subtotalAfterDiscount: number
  subtotalWithDelivery: number
  subtotalWithDeliveryAndTip: number
  tipAmount: number
  gst: number
  qst: number
  finalTotal: number
  applicableDeliveryFee: number
  isFreeDelivery: boolean
  deliverySavings: number
}

interface CampaignDiscount {
  id: string
  code: string
  discountAmount: number
  campaignType: 'percentage' | 'fixed_amount'
  campaignValue: number
}

interface SelectedTip {
  amount: number
  type: 'percentage' | 'fixed'
  value: number
}

interface OrderTotalSidebarProps {
  language: string
  isFormValid: boolean
  formData: CustomerFormData | null
  paymentMethod: 'counter' | 'online'
  orderNotes?: string
  orderContext: {
    chainSlug?: string
    source: 'qr' | 'web'
    branchId: string
    tableNumber?: number
    zone?: string
    isQROrder: boolean
    selectedOrderType?: 'dine_in' | 'takeaway' | 'delivery' | null
  }
  onTriggerValidation: () => CustomerValidationResult | null
  isMinimumOrderMet?: boolean
  selectedOrderType?: 'takeaway' | 'delivery' | null
  appliedDiscount?: CampaignDiscount | null
  selectedTip?: SelectedTip | null
  deliveryFee?: number
  orderTotals: OrderTotals
}

export function OrderTotalSidebar({
  language,
  formData,
  paymentMethod,
  orderNotes = '',
  orderContext,
  onTriggerValidation,
  isMinimumOrderMet = true,
  selectedOrderType,
  appliedDiscount,
  selectedTip,
  deliveryFee = 0,
  orderTotals
}: OrderTotalSidebarProps) {
  const router = useRouter()
  const { items, subtotal, tax, total, preOrder } = useCart()
  const t = translations[language as keyof typeof translations] || translations.en
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [lastValidatedFormData, setLastValidatedFormData] = useState<CustomerFormData | null>(null)
  
  // Handle successful Stripe payment
  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      if (!lastValidatedFormData) {
        throw new Error('Missing order data for payment submission')
      }

      setShowPaymentForm(false)
      setIsSubmitting(true)

      await submitOrderAfterPayment(paymentIntentId, lastValidatedFormData, paymentMethod)

    } catch (error) {
      console.error('Error after payment success:', error)
      setPaymentStatus('error')
      setPaymentError(error instanceof Error ? error.message : 'Order submission failed after payment')
      setIsSubmitting(false)
    }
  }

  // Handle payment errors
  const handlePaymentError = (error: string) => {
    setPaymentStatus('error')
    setPaymentError(error)
    setShowPaymentForm(false)
    setIsSubmitting(false)
  }

  // Submit order after successful payment
  const submitOrderAfterPayment = async (
    paymentIntentId: string,
    latestFormData: CustomerFormData,
    resolvedPaymentMethod: 'counter' | 'online'
  ) => {
    const customerInfo = latestFormData.customerInfo
    const addressInfo = latestFormData.addressInfo

    const sourceType = orderContext.source === 'qr' ? 'qr' : 'website'
    const commissionData = await commissionService.calculateCommission(
      orderTotals.finalTotal,
      orderContext.branchId,
      sourceType
    )

    const orderData = {
      customerInfo,
      addressInfo,
      orderType: latestFormData.orderType || 'takeaway',
      paymentMethod: resolvedPaymentMethod,
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes || ''
      })),
      subtotal,
      tax,
      total,
      notes: orderNotes.trim() || undefined,
      preOrder: preOrder.isPreOrder ? {
        isPreOrder: preOrder.isPreOrder,
        scheduledDate: preOrder.scheduledDate,
        scheduledTime: preOrder.scheduledTime,
        scheduledDateTime: preOrder.scheduledDateTime && !isNaN(preOrder.scheduledDateTime.getTime())
          ? preOrder.scheduledDateTime
          : undefined
      } : undefined,
      pricing: {
        itemsTotal: orderTotals.itemsTotal,
        discountAmount: appliedDiscount?.discountAmount || 0,
        deliveryFee: latestFormData.orderType === 'delivery' ? deliveryFee : 0,
        gst: orderTotals.gst,
        qst: orderTotals.qst,
        tipAmount: orderTotals.tipAmount,
        finalTotal: orderTotals.finalTotal
      },
      campaign: appliedDiscount ? {
        id: appliedDiscount.id,
        code: appliedDiscount.code,
        discountAmount: appliedDiscount.discountAmount,
        campaignType: appliedDiscount.campaignType,
        campaignValue: appliedDiscount.campaignValue
      } : undefined,
      tipDetails: selectedTip ? {
        amount: selectedTip.amount,
        type: selectedTip.type,
        value: selectedTip.value
      } : undefined,
      commission: {
        orderSource: sourceType,
        commissionRate: commissionData.rate,
        commissionAmount: commissionData.commissionAmount,
        netAmount: commissionData.netAmount
      },
      paymentIntentId
    }

    const result = await orderService.submitOrder(
      orderData,
      orderContext.branchId,
      orderContext.tableNumber,
      orderContext.zone
    )

    if (result.success) {
      const confirmationData = {
        orderId: result.data.orderId,
        orderNumber: result.data.orderNumber || result.data.orderId.substring(0, 8).toUpperCase(),
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        customerEmail: customerInfo.email,
        orderType: latestFormData.orderType || orderContext.selectedOrderType || 'takeaway',
        source: orderContext.source || 'web',
        branchId: orderContext.branchId,
        paymentMethod: resolvedPaymentMethod,
        paymentIntentId,
        paymentStatus: 'completed',
        pricing: {
          itemsTotal: orderTotals.itemsTotal,
          subtotal: orderTotals.subtotalAfterDiscount,
          subtotalWithDelivery: orderTotals.subtotalWithDelivery,
          gst: orderTotals.gst,
          qst: orderTotals.qst,
          tipAmount: orderTotals.tipAmount,
          total: orderTotals.finalTotal,
          subtotalAmount: orderTotals.subtotalAfterDiscount,
          taxAmount: orderTotals.gst + orderTotals.qst,
          totalAmount: orderTotals.finalTotal
        },
        items: items,
        campaignDiscount: appliedDiscount,
        tipDetails: selectedTip,
        deliveryFee: latestFormData.orderType === 'delivery' ? deliveryFee : 0,
        deliveryAddress: latestFormData.orderType === 'delivery' ? addressInfo : undefined,
        tableNumber: orderContext.tableNumber,
        zone: orderContext.zone
      }

      sessionStorage.setItem('vizion-order-confirmation', JSON.stringify(confirmationData))

      const chainSlug = orderContext.chainSlug || 'default'
      const confirmationUrl = `/order/${chainSlug}/confirmation?orderId=${result.data.orderId}`
      router.push(confirmationUrl)
    } else {
      throw new Error(result.error.message || 'Order submission failed')
    }
  }

  const handleConfirmOrder = async () => {
    if (isSubmitting) return

    const validation = onTriggerValidation()
    if (!validation || !validation.isValid) {
      return
    }

    const currentFormData = validation.formData
    const effectiveOrderType = currentFormData.orderType || selectedOrderType || 'takeaway'

    if (effectiveOrderType === 'delivery' && !isMinimumOrderMet) {
      return
    }

    setLastValidatedFormData(currentFormData)
    setIsSubmitting(true)

    try {
      const sourceType = orderContext.source === 'qr' ? 'qr' : 'website'
      const commissionData = await commissionService.calculateCommission(
        orderTotals.finalTotal,
        orderContext.branchId,
        sourceType
      )

      const orderData = {
        customerInfo: currentFormData.customerInfo,
        addressInfo: currentFormData.addressInfo,
        orderType: effectiveOrderType,
        paymentMethod,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          notes: item.notes || ''
        })),
        subtotal,
        tax,
        total,
        notes: orderNotes.trim() || undefined,
        preOrder: preOrder.isPreOrder ? {
          isPreOrder: preOrder.isPreOrder,
          scheduledDate: preOrder.scheduledDate,
          scheduledTime: preOrder.scheduledTime,
          scheduledDateTime: preOrder.scheduledDateTime && !isNaN(preOrder.scheduledDateTime.getTime())
            ? preOrder.scheduledDateTime
            : undefined
        } : undefined,
        pricing: {
          itemsTotal: orderTotals.itemsTotal,
          discountAmount: appliedDiscount?.discountAmount || 0,
          deliveryFee: effectiveOrderType === 'delivery' ? deliveryFee : 0,
          gst: orderTotals.gst,
          qst: orderTotals.qst,
          tipAmount: orderTotals.tipAmount,
          finalTotal: orderTotals.finalTotal
        },
        campaign: appliedDiscount ? {
          id: appliedDiscount.id,
          code: appliedDiscount.code,
          discountAmount: appliedDiscount.discountAmount,
          campaignType: appliedDiscount.campaignType,
          campaignValue: appliedDiscount.campaignValue
        } : undefined,
        tipDetails: selectedTip ? {
          amount: selectedTip.amount,
          type: selectedTip.type,
          value: selectedTip.value
        } : undefined,
        commission: {
          orderSource: sourceType,
          commissionRate: commissionData.rate,
          commissionAmount: commissionData.commissionAmount,
          netAmount: commissionData.netAmount
        }
      }

      if (paymentMethod === 'online') {
        try {
          setPaymentStatus('processing')
          setPaymentError(null)

          const paymentIntent = await stripePaymentService.createPaymentIntent({
            amount: orderTotals.finalTotal,
            commissionAmount: commissionData.commissionAmount,
            orderId: `temp_${Date.now()}`,
            branchId: orderContext.branchId,
            customerEmail: currentFormData.customerInfo.email,
            orderSource: sourceType
          })

          setClientSecret(paymentIntent.clientSecret)
          setPaymentStatus('idle')
          setIsSubmitting(false)
          setShowPaymentForm(true)
          return
        } catch (error) {
          console.error('Stripe payment error:', error)
          setPaymentStatus('error')
          setPaymentError(error instanceof Error ? error.message : 'Payment processing failed')
          setIsSubmitting(false)
          return
        }
      }

      const result = await orderService.submitOrder(
        orderData,
        orderContext.branchId,
        orderContext.tableNumber,
        orderContext.zone
      )

      if (result.success) {
        const confirmationData = {
          orderId: result.data.orderId,
          orderNumber: result.data.orderNumber || result.data.orderId.substring(0, 8).toUpperCase(),
          customerName: currentFormData.customerInfo.name,
          customerPhone: currentFormData.customerInfo.phone,
          customerEmail: currentFormData.customerInfo.email,
          orderType: effectiveOrderType,
          source: orderContext.source || 'web',
          branchId: orderContext.branchId,
          paymentMethod,
          paymentIntentId: undefined,
          paymentStatus: 'completed',
          pricing: {
            itemsTotal: orderTotals.itemsTotal,
            subtotal: orderTotals.subtotalAfterDiscount,
            subtotalWithDelivery: orderTotals.subtotalWithDelivery,
            gst: orderTotals.gst,
            qst: orderTotals.qst,
            tipAmount: orderTotals.tipAmount,
            total: orderTotals.finalTotal,
            subtotalAmount: orderTotals.subtotalAfterDiscount,
            taxAmount: orderTotals.gst + orderTotals.qst,
            totalAmount: orderTotals.finalTotal
          },
          items: items,
          campaignDiscount: appliedDiscount,
          tipDetails: selectedTip,
          deliveryFee: effectiveOrderType === 'delivery' ? deliveryFee : 0,
          deliveryAddress: effectiveOrderType === 'delivery' ? currentFormData.addressInfo : undefined,
          tableNumber: orderContext.tableNumber,
          zone: orderContext.zone
        }

        sessionStorage.setItem('vizion-order-confirmation', JSON.stringify(confirmationData))

        const chainSlug = orderContext.chainSlug || 'default'
        const confirmationUrl = `/order/${chainSlug}/confirmation?orderId=${result.data.orderId}`
        router.push(confirmationUrl)
      } else {
        alert(result.error.message || 'Order submission failed')
      }
    } catch (error) {
      console.error('Failed to submit order:', error)
      alert('Failed to submit order. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 sticky top-8">
      <h2 className="text-lg font-semibold text-foreground mb-6">
        Complete Order
      </h2>

      <Button
        onClick={handleConfirmOrder}
        disabled={isSubmitting || (selectedOrderType === 'delivery' && !isMinimumOrderMet)}
        className="w-full h-12 text-base font-semibold"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {paymentStatus === 'processing' 
              ? (language === 'fr' ? 'Traitement du paiement...' : 'Processing Payment...')
              : (language === 'fr' ? 'Traitement...' : 'Processing...')
            }
          </>
        ) : selectedOrderType === 'delivery' && !isMinimumOrderMet ? (
          language === 'fr' ? 'Minimum requis non atteint' : 'Minimum Order Not Met'
        ) : (
          t.orderPage.checkout.confirmOrder || "Confirm Order"
        )}
      </Button>


      
      <Button 
        variant="outline"
        onClick={() => router.back()}
        className="w-full h-12 mt-3 text-base font-medium"
        size="lg"
      >
        {t.orderPage.checkout.backToCart || "Back to Cart"}
      </Button>

      {/* Payment Error Dialog */}
      <Dialog open={paymentStatus === 'error' && !!paymentError} onOpenChange={() => {
        setPaymentStatus('idle')
        setPaymentError(null)
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-red-900">
                  {language === 'fr' ? 'Erreur de paiement' : 'Payment Error'}
                </DialogTitle>
                <DialogDescription className="text-red-700">
                  {language === 'fr'
                    ? 'Le paiement n\'a pas pu être traité'
                    : 'Your payment could not be processed'
                  }
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{paymentError}</p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPaymentStatus('idle')
                setPaymentError(null)
              }}
              className="w-full sm:w-auto"
            >
              {language === 'fr' ? 'Fermer' : 'Close'}
            </Button>
            <Button
              onClick={() => {
                setPaymentStatus('idle')
                setPaymentError(null)
                // Trigger the payment flow again
                handleConfirmOrder()
              }}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
            >
              {language === 'fr' ? 'Réessayer' : 'Try Again'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stripe Payment Form Modal */}
      {showPaymentForm && clientSecret && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  {language === 'fr' ? 'Paiement sécurisé' : 'Secure Payment'}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowPaymentForm(false)
                    setPaymentStatus('idle')
                    setIsSubmitting(false)
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </Button>
              </div>
              
              <StripePaymentForm
                clientSecret={clientSecret}
                amount={orderTotals.finalTotal}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
                isProcessing={paymentStatus === 'processing'}
                customerEmail={formData?.customerInfo?.email}
                language={language as "en" | "fr"}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}











