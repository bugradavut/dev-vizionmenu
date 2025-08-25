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
  orderNotes?: string
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

export function OrderTotalSidebar({ language, formData, orderNotes = '', orderContext, onTriggerValidation }: OrderTotalSidebarProps) {
  const router = useRouter()
  const { items, subtotal, tax, total } = useCart()
  const t = translations[language as keyof typeof translations] || translations.en
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const handleConfirmOrder = async () => {
    if (isSubmitting) return
    
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
        notes: orderNotes.trim() || undefined // Add order notes
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