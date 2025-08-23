"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '../../contexts/cart-context'
import { translations } from '@/lib/translations'
import { orderService } from '@/services/order-service'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface OrderTotalSidebarProps {
  language: string
  isFormValid: boolean
  formData: any
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

export function OrderTotalSidebar({ language, isFormValid, formData, orderContext, onTriggerValidation }: OrderTotalSidebarProps) {
  const router = useRouter()
  const { items, subtotal, tax, total } = useCart()
  const t = translations[language as keyof typeof translations] || translations.en
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const handleConfirmOrder = async () => {
    if (isSubmitting) return
    
    // Skip validation - always proceed
    onTriggerValidation() // Call it but ignore result
    
    setIsSubmitting(true)
    
    try {
      // Debug: Log formData to see what we're getting
      console.log('FormData being sent:', formData)
      
      // Prepare order data
      const orderData = {
        customerInfo: formData.customerInfo,
        addressInfo: formData.orderType === 'delivery' ? formData.address : undefined,
        orderType: formData.orderType,
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
      console.log('About to call orderService.submitOrder with:', {
        orderData,
        branchId: orderContext.branchId,
        tableNumber: orderContext.tableNumber,
        zone: orderContext.zone
      })
      
      const result = await orderService.submitOrder(
        orderData,
        orderContext.branchId,
        orderContext.tableNumber,
        orderContext.zone
      )
      
      console.log('Order service result:', result)
      
      if (result.success) {
        // Navigate to confirmation page with order ID and customer data
        const confirmationParams = new URLSearchParams({
          orderId: result.data.orderId,
          orderNumber: result.data.orderNumber || result.data.orderId.substring(0, 8).toUpperCase(),
          customerName: formData?.customerInfo?.name || 'Customer',
          customerPhone: formData?.customerInfo?.phone || 'N/A',
          customerEmail: formData?.customerInfo?.email || '',
          orderType: formData?.orderType || orderContext.selectedOrderType || 'takeaway',
          source: orderContext.source || 'web',
          ...(orderContext.tableNumber && { table: orderContext.tableNumber.toString() }),
          ...(orderContext.zone && { zone: orderContext.zone })
        });
        
        router.push(`/order/confirmation?${confirmationParams.toString()}`)
      } else {
        // Handle error
        console.error('Order submission failed:', result.error)
        alert(result.error.message) // Replace with proper error handling later
      }
    } catch (error) {
      console.error('Order submission error:', error)
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