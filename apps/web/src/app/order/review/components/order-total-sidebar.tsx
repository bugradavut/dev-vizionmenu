"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '../../contexts/cart-context'
import { translations } from '@/lib/translations'
import { orderService } from '@/services/order-service'
import { commissionService } from '@/services/commission.service'
import { stripePaymentService } from '@/services/stripe.service'
import { uberDirectService } from '@/services/uber-direct.service'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Loader2, AlertCircle, WifiOff, Check } from 'lucide-react'
import { StripePaymentForm } from '@/components/stripe/payment-form'
import type { CustomerFormData, CustomerValidationResult } from './customer-information-section'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { useOfflineSync } from '@/hooks/use-offline-sync'
import { offlineStorage } from '@/lib/db/offline-storage'
import { offlineSessionStorage } from '@/lib/db/offline-session-storage'
import type { OfflineOrder, OrderPayload } from '@/lib/db/schema'
import { v4 as uuidv4 } from 'uuid'
import { useToast } from '@/hooks/use-toast'
import { jsPDF } from 'jspdf'

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
  // SW-78 FO-116 Step 1: Updated payment method type for Quebec WEB-SRM
  paymentMethod: 'online' | 'cash' | 'card'
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
  // SW-78 FO-114: Add removedItems for Quebec SRS compliance
  const { items, subtotal, tax, total, preOrder, clearCart, removedItems, clearRemovedItems } = useCart()
  const t = translations[language as keyof typeof translations] || translations.en
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [connectedAccountId, setConnectedAccountId] = useState<string | null>(null)  // ✅ For Direct Charge
  const [lastValidatedFormData, setLastValidatedFormData] = useState<CustomerFormData | null>(null)

  // SW-78 FO-104: Network status for offline mode
  const { isOnline, isOffline, wasOffline } = useNetworkStatus()
  const { isSyncing, lastSyncResult } = useOfflineSync()
  const { toast } = useToast()
  const [showOfflineOrderModal, setShowOfflineOrderModal] = useState(false)

  // SW-78 FO-104: Auto-navigate to confirmation AFTER sync completes
  useEffect(() => {

    // Only proceed if modal is open and we have a pending URL
    if (!showOfflineOrderModal) return

    const pendingUrl = sessionStorage.getItem('vizion-pending-confirmation-url')
    if (!pendingUrl) return

    // Wait for sync to complete successfully
    if (lastSyncResult && lastSyncResult.success && !isSyncing) {
      console.log('[OrderTotalSidebar] Sync completed successfully, navigating to confirmation...')
      sessionStorage.removeItem('vizion-pending-confirmation-url')
      setShowOfflineOrderModal(false)
      router.push(pendingUrl)
    }
  }, [showOfflineOrderModal, lastSyncResult, isSyncing, router])

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

  // SW-78 FO-104: Create offline order (save to IndexedDB + print)
  const createOfflineOrder = async (currentFormData: CustomerFormData) => {
    try {
      const orderId = uuidv4()
      const localReceiptNumber = generateLocalReceiptNumber(orderId)

      // Convert to OrderPayload format
      const fullAddress = currentFormData.addressInfo
        ? `${currentFormData.addressInfo.streetAddress}${currentFormData.addressInfo.unitNumber ? ` #${currentFormData.addressInfo.unitNumber}` : ''}, ${currentFormData.addressInfo.city}, ${currentFormData.addressInfo.province} ${currentFormData.addressInfo.postalCode}`
        : undefined

      const orderPayload: OrderPayload = {
        customer_name: currentFormData.customerInfo.name,
        customer_email: currentFormData.customerInfo.email,
        customer_phone: currentFormData.customerInfo.phone,
        customer_address: fullAddress,
        items: items.map((item) => ({
          id: item.id || uuidv4(),
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          modifiers: [],
          special_instructions: item.notes,
        })),
        order_type: (currentFormData.orderType === 'takeaway' ? 'takeout' : currentFormData.orderType) as 'dine_in' | 'delivery' | 'takeout',
        branch_id: orderContext.branchId,
        branch_name: 'Offline Order',
        chain_id: orderContext.chainSlug || 'unknown',
        subtotal: orderTotals.subtotalAfterDiscount,
        tax: orderTotals.gst + orderTotals.qst,
        gst: orderTotals.gst, // ✅ FIX: Store GST separately
        qst: orderTotals.qst, // ✅ FIX: Store QST separately
        tip: orderTotals.tipAmount,
        delivery_fee: orderTotals.applicableDeliveryFee,
        total: orderTotals.finalTotal,
        payment_method: paymentMethod, // SW-78 FO-116: Use selected payment method (cash/card/online)
        notes: orderNotes.trim() || undefined,
        promo_code: appliedDiscount?.code,
        table_number: orderContext.tableNumber?.toString(),
      }

      const offlineOrder: OfflineOrder = {
        id: orderId,
        order_data: orderPayload,
        created_at: Date.now(),
        status: 'pending',
        retry_count: 0,
        local_receipt_number: localReceiptNumber,
      }

      // Save to IndexedDB
      await offlineStorage.saveOrder(offlineOrder)

      console.log('[OrderTotalSidebar] Offline order saved:', localReceiptNumber)

      // SW-78 FO-105: Increment orders count in LOCAL offline session (static import)
      try {
        await offlineSessionStorage.incrementOrdersCreated(orderContext.branchId)
        console.log('[OrderTotalSidebar] Offline session order count incremented')
      } catch (error) {
        console.error('[OrderTotalSidebar] Failed to increment offline session orders:', error)
      }

      // Show success toast
      toast({
        variant: 'success' as any,
        title: '✓ Offline Order Created' as any,
        description: `Order ${localReceiptNumber} saved. Will sync when connection returns.`,
        duration: 5000,
      })

      // SW-78 FO-104: Generate PDF receipt for offline order
      generateOfflineReceiptPDF(offlineOrder)

      // Prepare confirmation data for offline order
      const confirmationData = {
        orderId,
        orderNumber: localReceiptNumber,
        customerName: currentFormData.customerInfo.name,
        customerPhone: currentFormData.customerInfo.phone,
        customerEmail: currentFormData.customerInfo.email,
        orderType: currentFormData.orderType || 'takeaway',
        source: orderContext.source || 'web',
        branchId: orderContext.branchId,
        paymentMethod: paymentMethod, // SW-78 FO-116: Use selected payment method (cash/card/online)
        paymentIntentId: undefined,
        paymentStatus: 'pending_offline',
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
          totalAmount: orderTotals.finalTotal,
        },
        items,
        campaignDiscount: appliedDiscount,
        tipDetails: selectedTip,
        deliveryFee: orderTotals.applicableDeliveryFee,
        deliveryAddress: currentFormData.addressInfo,
        tableNumber: orderContext.tableNumber,
        zone: orderContext.zone,
        is_pre_order: false,
        isOfflineOrder: true, // Flag for confirmation page to skip API calls
      }

      sessionStorage.setItem('vizion-order-confirmation', JSON.stringify(confirmationData))

      console.log('[OrderTotalSidebar] Offline order complete. Showing modal...')
      // Store confirmation URL for when network returns
      sessionStorage.setItem('vizion-pending-confirmation-url', `/order/${orderContext.chainSlug || 'default'}/confirmation?orderId=${orderId}`)

      // Note: We DON'T clear cart here because review page redirects to /order when cart is empty
      // Cart will be cleared on confirmation page instead

      // Show offline order success modal
      setShowOfflineOrderModal(true)
    } catch (error) {
      console.error('[OrderTotalSidebar] Failed to create offline order:', error)
      throw error
    }
  }

  // Generate local receipt number for offline orders
  // Format: First 8 chars of UUID in uppercase (matches system order ID format)
  const generateLocalReceiptNumber = (orderId: string): string => {
    return orderId.substring(0, 8).toUpperCase()
  }

  // Generate PDF receipt for offline order
  const generateOfflineReceiptPDF = (order: OfflineOrder) => {
    try {
      console.log('[OrderTotalSidebar] Generating PDF receipt for offline order...')

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      // Set font
      doc.setFont('helvetica')

      // Header
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('VISION MENU', 105, 20, { align: 'center' })

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text('Order Receipt', 105, 28, { align: 'center' })

      // Offline badge
      doc.setFillColor(255, 238, 238) // Light red
      doc.rect(20, 35, 170, 10, 'F')
      doc.setTextColor(204, 0, 0) // Red text
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('⚠️ OFFLINE ORDER ⚠️', 105, 41, { align: 'center' })

      // Reset color
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')

      // Order info
      let y = 55
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Receipt #:', 20, y)
      doc.setFont('helvetica', 'normal')
      doc.text(order.local_receipt_number, 50, y)

      y += 7
      doc.setFont('helvetica', 'bold')
      doc.text('Date:', 20, y)
      doc.setFont('helvetica', 'normal')
      doc.text(new Date(order.created_at).toLocaleString(), 50, y)

      y += 7
      doc.setFont('helvetica', 'bold')
      doc.text('Customer:', 20, y)
      doc.setFont('helvetica', 'normal')
      doc.text(order.order_data.customer_name || 'N/A', 50, y)

      y += 7
      doc.setFont('helvetica', 'bold')
      doc.text('Phone:', 20, y)
      doc.setFont('helvetica', 'normal')
      doc.text(order.order_data.customer_phone || 'N/A', 50, y)

      y += 7
      doc.setFont('helvetica', 'bold')
      doc.text('Type:', 20, y)
      doc.setFont('helvetica', 'normal')
      doc.text(order.order_data.order_type.toUpperCase(), 50, y)

      // Items section
      y += 12
      doc.setDrawColor(0)
      doc.line(20, y, 190, y) // Top line

      y += 7
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('Items:', 20, y)

      y += 7
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')

      order.order_data.items.forEach((item) => {
        const itemText = `${item.quantity}x ${item.name}`
        const priceText = `$${(item.price * item.quantity).toFixed(2)}`

        doc.text(itemText, 25, y)
        doc.text(priceText, 190, y, { align: 'right' })
        y += 6

        if (item.special_instructions) {
          doc.setFontSize(8)
          doc.setTextColor(100, 100, 100)
          doc.text(`Note: ${item.special_instructions}`, 30, y)
          doc.setTextColor(0, 0, 0)
          doc.setFontSize(10)
          y += 5
        }
      })

      y += 2
      doc.line(20, y, 190, y) // Bottom line

      // Total
      y += 10
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text('TOTAL:', 140, y)
      doc.text(`$${order.order_data.total.toFixed(2)}`, 190, y, { align: 'right' })

      // Footer
      y += 15
      doc.setDrawColor(0)
      doc.line(20, y, 190, y)

      y += 7
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text('This order was created in offline mode.', 105, y, { align: 'center' })

      y += 5
      doc.text('It will be synced to the system when connection returns.', 105, y, { align: 'center' })

      y += 5
      doc.text('Thank you for your order!', 105, y, { align: 'center' })

      // Save PDF
      const filename = `receipt-${order.local_receipt_number}.pdf`
      doc.save(filename)

      console.log(`[OrderTotalSidebar] PDF receipt generated: ${filename}`)

      toast({
        variant: 'success' as any,
        title: '✓ Receipt Downloaded' as any,
        description: `Receipt saved as ${filename}`,
        duration: 3000,
      })
    } catch (error) {
      console.error('[OrderTotalSidebar] PDF generation error:', error)
      toast({
        variant: 'destructive',
        title: 'PDF Error',
        description: 'Failed to generate receipt PDF',
        duration: 3000,
      })
    }
  }

  // Create Uber Direct delivery if needed (backend handles quote + delivery)
  const createUberDirectDelivery = async (
    formData: CustomerFormData,
    orderId: string
  ): Promise<string | null> => {
    if (
      formData.orderType === 'delivery' &&
      formData.addressInfo
    ) {
      try {
        // Backend will handle quote creation + delivery creation automatically
        const result = await uberDirectService.createDelivery(
          orderContext.branchId,
          'auto', // Backend will generate quote automatically
          orderId
        )

        if (result.success) {
          console.log('✅ Uber Direct delivery created:', result.data.delivery_id)
          return result.data.delivery_id
        } else {
          console.error('❌ Failed to create Uber Direct delivery:', result.error)
          // Don't fail the entire order - just log the error
          return null
        }
      } catch (error) {
        console.error('❌ Uber Direct delivery error:', error)
        return null
      }
    }
    return null
  }

  // Submit order after successful payment
  // SW-78 FO-116 Step 1: Support 3 payment methods for Quebec WEB-SRM
  const submitOrderAfterPayment = async (
    paymentIntentId: string,
    latestFormData: CustomerFormData,
    resolvedPaymentMethod: 'online' | 'cash' | 'card'
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
      paymentIntentId,
      // SW-78 FO-114: Quebec SRS compliance - include removed items
      removedItems: removedItems || []
    }

    const result = await orderService.submitOrder(
      orderData,
      orderContext.branchId,
      orderContext.tableNumber,
      orderContext.zone
    )

    if (result.success) {
      // Create Uber Direct delivery after successful order submission
      const deliveryId = await createUberDirectDelivery(latestFormData, result.data.orderId)
      console.log('🚚 Delivery creation result:', deliveryId)

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
        zone: orderContext.zone,
        // Scheduled order fields from API response
        is_pre_order: result.data.isPreOrder || false,
        scheduled_datetime: result.data.scheduledDateTime,
        scheduled_date: result.data.scheduledDate,
        scheduled_time: result.data.scheduledTime
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

    // SW-78 FO-104: Check if offline - create offline order
    if (isOffline) {
      try {
        await createOfflineOrder(currentFormData)
      } catch (error) {
        console.error('[OrderTotalSidebar] Offline order creation failed:', error)
        alert('Failed to create offline order. Please try again.')
      } finally {
        setIsSubmitting(false)
      }
      return
    }

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
        },
        // SW-78 FO-114: Quebec SRS compliance - include removed items
        removedItems: removedItems || []
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
          setConnectedAccountId(paymentIntent.connectedAccountId || null)  // ✅ Store for Direct Charge
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
        // Create Uber Direct delivery after successful order submission
        await createUberDirectDelivery(currentFormData, result.data.orderId)

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
          zone: orderContext.zone,
          // Scheduled order fields from API response
          is_pre_order: result.data.isPreOrder || false,
          scheduled_datetime: result.data.scheduledDateTime,
          scheduled_date: result.data.scheduledDate,
          scheduled_time: result.data.scheduledTime
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

      {/* Offline warning message */}
      {isOffline && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
          <WifiOff className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p className="font-semibold">Offline Mode</p>
            <p className="mt-1">
              {language === 'fr'
                ? 'Votre commande sera enregistrée localement et synchronisée lorsque la connexion reviendra.'
                : 'Your order will be saved locally and synced when connection returns.'}
            </p>
          </div>
        </div>
      )}

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
        ) : isOffline ? (
          <>
            <WifiOff className="h-4 w-4 mr-2" />
            {language === 'fr' ? 'Créer commande hors ligne' : 'Create Offline Order'}
          </>
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
                connectedAccountId={connectedAccountId || undefined}  // ✅ Pass for Direct Charge
                customerEmail={formData?.customerInfo?.email}
                language={language as "en" | "fr"}
              />
            </div>
          </div>
        </div>
      )}

      {/* SW-78 FO-104: Offline Order Success Modal */}
      <Dialog open={showOfflineOrderModal} onOpenChange={setShowOfflineOrderModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <DialogTitle className="text-green-900">
                  {language === 'fr' ? 'Commande créée avec succès!' : 'Order Created Successfully!'}
                </DialogTitle>
                <DialogDescription className="text-green-700">
                  {language === 'fr'
                    ? 'Votre commande hors ligne a été enregistrée'
                    : 'Your offline order has been saved'
                  }
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <WifiOff className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-900 mb-2">
                    {language === 'fr'
                      ? 'Veuillez ne pas fermer cette page'
                      : 'Please do not close this page'
                    }
                  </p>
                  <p className="text-sm text-yellow-800">
                    {language === 'fr'
                      ? 'Lorsque votre connexion Internet sera rétablie, vous serez automatiquement redirigé vers la page de confirmation.'
                      : 'When your internet connection returns, you will be automatically redirected to the confirmation page.'
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">
                  {language === 'fr' ? 'Votre commande :' : 'Your order:'}
                </span>
                <br />
                {language === 'fr'
                  ? '• A été enregistrée localement'
                  : '• Has been saved locally'
                }
                <br />
                {language === 'fr'
                  ? '• Le reçu PDF a été téléchargé'
                  : '• PDF receipt has been downloaded'
                }
                <br />
                {language === 'fr'
                  ? '• Sera synchronisée automatiquement'
                  : '• Will be synced automatically'
                }
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="w-full text-center">
              {isSyncing ? (
                <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="font-semibold">
                    {language === 'fr'
                      ? 'Synchronisation en cours...'
                      : 'Syncing order...'
                    }
                  </span>
                </div>
              ) : !isOnline ? (
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <WifiOff className="h-3 w-3" />
                  <span>
                    {language === 'fr'
                      ? 'En attente de la connexion Internet...'
                      : 'Waiting for internet connection...'
                    }
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  <span className="font-semibold">
                    {language === 'fr'
                      ? 'Redirection en cours...'
                      : 'Redirecting...'
                    }
                  </span>
                </div>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}











