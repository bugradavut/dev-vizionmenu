"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '../../contexts/cart-context'
import { translations } from '@/lib/translations'
import { orderService } from '@/services/order-service'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface OrderFormData {
  customerInfo?: {
    name: string;
    phone: string;
    email?: string;
  };
  orderType?: string;
  address?: object;
}

interface OrderTotals {
  itemsTotal: number
  subtotalAfterDiscount: number
  subtotalWithDelivery: number
  tipAmount: number
  gst: number
  qst: number
  finalTotal: number
}

interface CampaignDiscount {
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
  orderTotals
}: OrderTotalSidebarProps) {
  const router = useRouter()
  const { items, subtotal, tax, total, preOrder } = useCart()
  const t = translations[language as keyof typeof translations] || translations.en
  const [isSubmitting, setIsSubmitting] = useState(false)
  
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
      // Prepare order data - ensure we have the latest formData
      const customerInfo = formData?.customerInfo || { name: 'Customer', phone: '0000000000' }
      
      // Map delivery address from frontend format to backend format
      const addressInfo = formData.orderType === 'delivery' && formData.address ? {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        addressType: (formData.address as any).type || 'home',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        streetAddress: `${(formData.address as any).streetNumber || ''} ${(formData.address as any).streetName || ''}`.trim(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        city: (formData.address as any).city || '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        province: (formData.address as any).province || '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        postalCode: (formData.address as any).postalCode || '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        unitNumber: (formData.address as any).unitNumber || undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        buzzerCode: (formData.address as any).buzzerCode || undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        deliveryInstructions: (formData.address as any).deliveryInstructions || undefined
      } : undefined

      const orderData = {
        customerInfo,
        addressInfo,
        orderType: (formData.orderType as 'dine_in' | 'takeaway' | 'delivery') || 'takeaway',
        paymentMethod: 'cash' as const, // Default for now
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
        notes: orderNotes.trim() || undefined, // Add order notes
        // NEW: Pre-order data from cart context
        preOrder: preOrder.isPreOrder ? {
          isPreOrder: preOrder.isPreOrder,
          scheduledDate: preOrder.scheduledDate,
          scheduledTime: preOrder.scheduledTime,
          scheduledDateTime: preOrder.scheduledDateTime
        } : undefined
      }
      
      // Submit order
      const result = await orderService.submitOrder(
        orderData,
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
          
          // Delivery fee
          deliveryFee: selectedOrderType === 'delivery' ? deliveryFee : 0,
          
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
          deliveryAddress: addressInfo ? {
            addressType: addressInfo.addressType,
            streetAddress: addressInfo.streetAddress,
            city: addressInfo.city,
            province: addressInfo.province,
            postalCode: addressInfo.postalCode,
            unitNumber: addressInfo.unitNumber,
            buzzerCode: addressInfo.buzzerCode,
            deliveryInstructions: addressInfo.deliveryInstructions
          } : undefined,
          timestamp: Date.now() // For cleanup
        };
        
        // Store in sessionStorage (cleared when browser closed)
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('vizion-order-confirmation', JSON.stringify(confirmationData));
        }
        
        // UPDATED: Navigate to confirmation page with chainSlug
        const confirmationUrl = orderContext.chainSlug 
          ? `/order/${orderContext.chainSlug}/confirmation?orderId=${result.data.orderId}`
          : `/order/confirmation?orderId=${result.data.orderId}` // Fallback for backward compatibility
        
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
            {language === 'fr' ? 'Traitement...' : 'Processing...'}
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
    </div>
  )
}