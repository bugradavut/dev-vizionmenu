"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '../../contexts/cart-context'
import { translations } from '@/lib/translations'
import { orderService } from '@/services/order-service'
import { commissionService } from '@/services/commission.service'
import { stripePaymentService } from '@/services/stripe.service'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { StripePaymentForm } from '@/components/stripe/payment-form'
import { OrderFormData } from '@/contexts/order-form-context'

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
  formData: OrderFormData
  orderNotes?: string
  orderContext: {
    chainSlug?: string // NEW: Add chainSlug support
    source: 'qr' | 'web'
    branchId: string
    tableNumber?: number
    zone?: string
    isQROrder: boolean
    selectedOrderType?: 'dine_in' | 'takeaway' | 'delivery' | null
  }
  onTriggerValidation: () => boolean
  isMinimumOrderMet?: boolean
  selectedOrderType?: 'takeaway' | 'delivery' | null
  appliedDiscount?: CampaignDiscount | null
  selectedTip?: SelectedTip | null
  deliveryFee?: number
  baseDeliveryFee?: number
  freeDeliveryThreshold?: number
  orderTotals: OrderTotals
}

export function OrderTotalSidebar({ 
  language, 
  formData, 
  orderNotes = '', 
  orderContext, 
  onTriggerValidation,
  isMinimumOrderMet = true,
  selectedOrderType,
  appliedDiscount,
  selectedTip,
  deliveryFee = 0,
  baseDeliveryFee = 0,
  freeDeliveryThreshold = 0,
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
  
  // Handle successful Stripe payment
  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      // Don't show success status, directly submit order and redirect
      setShowPaymentForm(false)
      setIsSubmitting(true)
      
      // Continue with order submission after successful payment
      await submitOrderAfterPayment(paymentIntentId)
      
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
  }

  // Submit order after successful payment
  const submitOrderAfterPayment = async (paymentIntentId: string) => {
    // Reconstruct order data (similar to original flow)
    const typedFormData = formData as OrderFormData
    const customerInfo = typedFormData?.customerInfo
    const addressInfo = typedFormData?.addressInfo
    const paymentMethod = typedFormData?.paymentMethod || 'cash'

    // Calculate commission
    const sourceType = orderContext.source === 'qr' ? 'qr' : 'website';
    const commissionData = await commissionService.calculateCommission(
      orderTotals.finalTotal,
      orderContext.branchId,
      sourceType
    );

    const orderData = {
      customerInfo,
      addressInfo,
      orderType: (formData.orderType as 'dine_in' | 'takeaway' | 'delivery') || 'takeaway',
      paymentMethod: paymentMethod as 'cash' | 'online',
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
      
      // Pre-order data from cart context
      preOrder: preOrder.isPreOrder ? {
        isPreOrder: preOrder.isPreOrder,
        scheduledDate: preOrder.scheduledDate,
        scheduledTime: preOrder.scheduledTime,
        scheduledDateTime: preOrder.scheduledDateTime
      } : undefined,
      
      // Pricing breakdown
      pricing: {
        itemsTotal: orderTotals.itemsTotal,
        discountAmount: appliedDiscount?.discountAmount || 0,
        deliveryFee: selectedOrderType === 'delivery' ? deliveryFee : 0,
        gst: orderTotals.gst,
        qst: orderTotals.qst,
        tipAmount: orderTotals.tipAmount,
        finalTotal: orderTotals.finalTotal
      },
      
      // Campaign discount
      campaign: appliedDiscount ? {
        id: appliedDiscount.id,
        code: appliedDiscount.code,
        discountAmount: appliedDiscount.discountAmount,
        campaignType: appliedDiscount.campaignType,
        campaignValue: appliedDiscount.campaignValue
      } : undefined,
      
      // Tip details
      tipDetails: selectedTip ? {
        amount: selectedTip.amount,
        type: selectedTip.type,
        value: selectedTip.value
      } : undefined,
      
      // Commission data
      commission: {
        orderSource: sourceType,
        commissionRate: commissionData.rate,
        commissionAmount: commissionData.commissionAmount,
        netAmount: commissionData.netAmount
      },
      
      paymentIntentId // Add payment intent ID
    }

    // Submit order
    const result = await orderService.submitOrder(
      orderData,
      orderContext.branchId,
      orderContext.tableNumber,
      orderContext.zone
    )
    
    if (result.success) {
      // Store confirmation data and redirect
      const confirmationData = {
        orderId: result.data.orderId,
        orderNumber: result.data.orderNumber || result.data.orderId.substring(0, 8).toUpperCase(),
        customerName: customerInfo?.name || 'Customer',
        customerPhone: customerInfo?.phone || 'N/A', 
        customerEmail: customerInfo?.email || '',
        orderType: formData?.orderType || orderContext.selectedOrderType || 'takeaway',
        source: orderContext.source || 'web',
        branchId: orderContext.branchId,
        
        // Payment information
        paymentMethod: paymentMethod,
        paymentIntentId: paymentIntentId,
        paymentStatus: 'completed',
        
        // Pricing and other data...
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
        deliveryFee: selectedOrderType === 'delivery' ? deliveryFee : 0,
        orderNotes: orderNotes.trim(),
        deliveryAddress: selectedOrderType === 'delivery' ? addressInfo : undefined,
        tableNumber: orderContext.tableNumber,
        zone: orderContext.zone
      }

      // Store in session storage
      sessionStorage.setItem('vizion-order-confirmation', JSON.stringify(confirmationData))
      
      // Navigate to confirmation using chainSlug
      const chainSlug = orderContext.chainSlug || 'default'
      const confirmationUrl = `/order/${chainSlug}/confirmation?orderId=${result.data.orderId}`
      router.push(confirmationUrl)
    } else {
      throw new Error(result.error.message || 'Order submission failed')
    }
  }

  const handleConfirmOrder = async () => {
    if (isSubmitting) return
    
    // Check minimum order requirement first (for delivery orders)
    if (selectedOrderType === 'delivery' && !isMinimumOrderMet) {
      // Don't proceed if minimum order is not met
      // The warning is already shown in PriceDetailsSection
      return
    }
    
    // Trigger validation and check if it passes
    const isValid = onTriggerValidation()
    
    if (!isValid) {
      return // Don't proceed if validation fails
    }
    
    setIsSubmitting(true)
    
    try {
      // Calculate commission for this order
      const sourceType = orderContext.source === 'qr' ? 'qr' : 'website';
      const commissionData = await commissionService.calculateCommission(
        orderTotals.finalTotal,
        orderContext.branchId,
        sourceType
      );
      
      // Prepare order data - ensure we have the latest formData
      const typedFormData = formData as OrderFormData
      const customerInfo = typedFormData?.customerInfo || { name: 'Customer', phone: '0000000000' }
      
      // Map delivery address from frontend format to backend format
      const addressInfoForOrder = typedFormData.orderType === 'delivery' && typedFormData.addressInfo ? {
        addressType: typedFormData.addressInfo.addressType || 'home',
        streetAddress: typedFormData.addressInfo.streetAddress || '',
        city: typedFormData.addressInfo.city || '',
        province: typedFormData.addressInfo.province || '',
        postalCode: typedFormData.addressInfo.postalCode || '',
        unitNumber: typedFormData.addressInfo.unitNumber || undefined,
        buzzerCode: typedFormData.addressInfo.buzzerCode || undefined,
        deliveryInstructions: typedFormData.addressInfo.deliveryInstructions || undefined
      } : undefined

      // Determine payment method based on form data
      const paymentMethod = typedFormData.paymentMethod || 'cash'
      
      const orderData = {
        customerInfo,
        addressInfo: addressInfoForOrder,
        orderType: typedFormData.orderType || 'takeaway',
        paymentMethod: paymentMethod as 'cash' | 'online',
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
        
        // Pre-order data from cart context
        preOrder: preOrder.isPreOrder ? {
          isPreOrder: preOrder.isPreOrder,
          scheduledDate: preOrder.scheduledDate,
          scheduledTime: preOrder.scheduledTime,
          scheduledDateTime: preOrder.scheduledDateTime
        } : undefined,
        
        // NEW: Comprehensive pricing breakdown (Phase 1)
        pricing: {
          itemsTotal: orderTotals.itemsTotal,
          discountAmount: appliedDiscount?.discountAmount || 0,
          deliveryFee: selectedOrderType === 'delivery' ? deliveryFee : 0,
          gst: orderTotals.gst,
          qst: orderTotals.qst,
          tipAmount: orderTotals.tipAmount,
          finalTotal: orderTotals.finalTotal
        },
        
        // Campaign/discount details
        campaign: appliedDiscount ? {
          id: appliedDiscount.id,
          code: appliedDiscount.code,
          discountAmount: appliedDiscount.discountAmount,
          campaignType: appliedDiscount.campaignType,
          campaignValue: appliedDiscount.campaignValue
        } : undefined,
        
        // Tip details
        tipDetails: selectedTip ? {
          amount: selectedTip.amount,
          type: selectedTip.type,
          value: selectedTip.value
        } : undefined,
        
        // Commission data (NEW)
        commission: {
          orderSource: sourceType,
          commissionRate: commissionData.rate,
          commissionAmount: commissionData.commissionAmount,
          netAmount: commissionData.netAmount
        }
      }
      
      // Handle Stripe payment processing if payment method is 'online'
      let paymentIntentId: string | undefined
      if (paymentMethod === 'online') {
        try {
          setPaymentStatus('processing')
          setPaymentError(null)
          
          // Create Payment Intent with commission split
          const paymentIntent = await stripePaymentService.createPaymentIntent({
            amount: orderTotals.finalTotal,
            commissionAmount: commissionData.commissionAmount,
            orderId: `temp_${Date.now()}`, // Temporary ID, will be updated after order creation
            branchId: orderContext.branchId,
            customerEmail: customerInfo.email,
            orderSource: sourceType
          })
          
          paymentIntentId = paymentIntent.paymentIntentId
          setClientSecret(paymentIntent.clientSecret)
          
          // Show Stripe payment form for real card processing
          setShowPaymentForm(true)
          setPaymentStatus('idle')
          setIsSubmitting(false)
          
          // Exit early - payment will continue in form handlers
          return
          
        } catch (error) {
          console.error('Stripe payment error:', error)
          setPaymentStatus('error')
          setPaymentError(error instanceof Error ? error.message : 'Payment processing failed')
          setIsSubmitting(false)
          return
        }
      }
      
      // Submit order (after successful payment if online)
      const result = await orderService.submitOrder(
        {
          ...orderData,
          paymentIntentId // Add payment intent ID to order data
        },
        orderContext.branchId,
        orderContext.tableNumber,
        orderContext.zone
      )
      
      if (result.success) {
        // Store order confirmation data in sessionStorage (temporary) with comprehensive pricing details
        const confirmationData = {
          orderId: result.data.orderId,
          orderNumber: result.data.orderNumber || result.data.orderId.substring(0, 8).toUpperCase(),
          customerName: customerInfo?.name || 'Customer',
          customerPhone: customerInfo?.phone || 'N/A', 
          customerEmail: customerInfo?.email || '',
          orderType: formData?.orderType || orderContext.selectedOrderType || 'takeaway',
          source: orderContext.source || 'web',
          branchId: orderContext.branchId, // Add branch ID for new order navigation
          
          // Payment information
          paymentMethod: paymentMethod,
          paymentIntentId: paymentIntentId,
          paymentStatus: paymentStatus === 'success' ? 'completed' : 'pending',
          
          // Comprehensive pricing breakdown
          pricing: {
            itemsTotal: orderTotals.itemsTotal,
            subtotal: orderTotals.subtotalAfterDiscount,
            subtotalWithDelivery: orderTotals.subtotalWithDelivery,
            gst: orderTotals.gst,
            qst: orderTotals.qst,
            tipAmount: orderTotals.tipAmount,
            total: orderTotals.finalTotal,
            // Legacy fields for backward compatibility
            subtotalAmount: orderTotals.subtotalAfterDiscount,
            taxAmount: orderTotals.gst + orderTotals.qst,
            totalAmount: orderTotals.finalTotal
          },
          
          // Discount details
          campaignDiscount: appliedDiscount ? {
            code: appliedDiscount.code,
            discountAmount: appliedDiscount.discountAmount,
            campaignType: appliedDiscount.campaignType,
            campaignValue: appliedDiscount.campaignValue
          } : null,
          
          // Delivery fee information  
          deliveryFee: selectedOrderType === 'delivery' ? orderTotals.applicableDeliveryFee || 0 : 0,
          deliveryInfo: selectedOrderType === 'delivery' ? {
            appliedFee: orderTotals.applicableDeliveryFee || 0,
            baseFee: baseDeliveryFee,
            isFree: orderTotals.isFreeDelivery || false,
            threshold: freeDeliveryThreshold,
            savings: orderTotals.deliverySavings || 0
          } : null,
          
          // Tip details
          tipDetails: selectedTip ? {
            amount: selectedTip.amount,
            type: selectedTip.type,
            value: selectedTip.value
          } : null,
          
          items: items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image_url: item.image_url,
            description: item.description
          })),
          tableNumber: orderContext.tableNumber,
          zone: orderContext.zone,
          orderNotes: orderNotes.trim() || '',  // Add order notes to sessionStorage
          deliveryAddress: addressInfoForOrder ? {
            addressType: addressInfoForOrder.addressType,
            streetAddress: addressInfoForOrder.streetAddress,
            city: addressInfoForOrder.city,
            province: addressInfoForOrder.province,
            postalCode: addressInfoForOrder.postalCode,
            unitNumber: addressInfoForOrder.unitNumber,
            buzzerCode: addressInfoForOrder.buzzerCode,
            deliveryInstructions: addressInfoForOrder.deliveryInstructions
          } : undefined,
          timestamp: Date.now() // For cleanup
        };
        
        // Store in sessionStorage (cleared when browser closed)
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('vizion-order-confirmation', JSON.stringify(confirmationData));
        }
        
        // Navigate to confirmation page with chainSlug (required)
        const chainSlug = orderContext.chainSlug || 'default'
        const confirmationUrl = `/order/${chainSlug}/confirmation?orderId=${result.data.orderId}`
        
        router.push(confirmationUrl)
      } else {
        // Handle error
        alert(result.error.message) // Replace with proper error handling later
      }
    } catch {
      alert('Failed to submit order. Please try again.') // Replace with proper error handling later
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

      {/* Payment Error Message */}
      {paymentStatus === 'error' && paymentError && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 font-medium">
            {language === 'fr' ? 'Erreur de paiement' : 'Payment Error'}
          </p>
          <p className="text-xs text-red-600 mt-1">{paymentError}</p>
          <Button
            onClick={() => {
              setPaymentStatus('idle')
              setPaymentError(null)
            }}
            variant="outline"
            size="sm"
            className="mt-2 text-xs"
          >
            {language === 'fr' ? 'Réessayer' : 'Try Again'}
          </Button>
        </div>
      )}

      
      <Button 
        variant="outline"
        onClick={() => router.back()}
        className="w-full h-12 mt-3 text-base font-medium"
        size="lg"
      >
        {t.orderPage.checkout.backToCart || "Back to Cart"}
      </Button>

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