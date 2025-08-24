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

interface OrderTotalSidebarProps {
  language: string
  isFormValid: boolean
  formData: OrderFormData
  orderContext: {
    source: 'qr' | 'web'
    branchId: string
    tableNumber?: number
    zone?: string
    isQROrder: boolean
    selectedOrderType?: 'dine_in' | 'takeaway' | 'delivery' | null
  }
  onTriggerValidation: () => boolean
}

export function OrderTotalSidebar({ language, formData, orderContext, onTriggerValidation }: OrderTotalSidebarProps) {
  const router = useRouter()
  const { items, subtotal, tax, total } = useCart()
  const t = translations[language as keyof typeof translations] || translations.en
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const handleConfirmOrder = async () => {
    if (isSubmitting) return
    
    // Trigger validation
    onTriggerValidation()
    
    setIsSubmitting(true)
    
    try {
      // Prepare order data - ensure we have the latest formData
      const customerInfo = formData?.customerInfo || { name: 'Customer', phone: '0000000000' }
      
      const orderData = {
        customerInfo,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        addressInfo: formData.orderType === 'delivery' ? (formData.address as any) : undefined,
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
        total
      }
      
      // Submit order
      const result = await orderService.submitOrder(
        orderData,
        orderContext.branchId,
        orderContext.tableNumber,
        orderContext.zone
      )
      
      if (result.success) {
        
        // Store order confirmation data in sessionStorage (temporary)
        const confirmationData = {
          orderId: result.data.orderId,
          orderNumber: result.data.orderNumber || result.data.orderId.substring(0, 8).toUpperCase(),
          customerName: customerInfo?.name || 'Customer',
          customerPhone: customerInfo?.phone || 'N/A', 
          customerEmail: customerInfo?.email || '',
          orderType: formData?.orderType || orderContext.selectedOrderType || 'takeaway',
          source: orderContext.source || 'web',
          subtotalAmount: subtotal.toFixed(2),
          taxAmount: tax.toFixed(2),
          totalAmount: total.toFixed(2),
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
          timestamp: Date.now() // For cleanup
        };
        
        // Store in sessionStorage (cleared when browser closed)
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('vizion-order-confirmation', JSON.stringify(confirmationData));
        }
        
        // Navigate with minimal URL params
        router.push(`/order/confirmation?orderId=${result.data.orderId}`)
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
        disabled={isSubmitting}
        className="w-full h-12 text-base font-semibold"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {language === 'fr' ? 'Traitement...' : 'Processing...'}
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
    </div>
  )
}