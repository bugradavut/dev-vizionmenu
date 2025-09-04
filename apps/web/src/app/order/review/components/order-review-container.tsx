"use client"

import { useState, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCart } from '../../contexts/cart-context'
import { useLanguage } from '@/contexts/language-context'
import { useMinimumOrder } from '@/hooks/use-minimum-order'
import { useDeliveryFee } from '@/hooks/use-delivery-fee'
import { translations } from '@/lib/translations'
import { OrderSummary } from './order-summary'
import { CustomerInformationSection } from './customer-information-section'
import { PaymentMethodSection } from './payment-method-section'
import { TipSection } from './tip-section'
import { OrderNotesSection } from './order-notes-section'
import { PriceDetailsSection } from './price-details-section'
import { PromoCodeSection } from './promo-code-section'
import { OrderTotalSidebar } from './order-total-sidebar'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'

interface OrderContext {
  source: 'qr' | 'web'
  branchId: string
  tableNumber?: number
  zone?: string
  isQROrder: boolean
  selectedOrderType?: 'dine_in' | 'takeaway' | 'delivery' | null
}

export function OrderReviewContainer({ orderContext }: { orderContext: OrderContext }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { items } = useCart()
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  
  // Initialize order type from URL params
  const initialOrderType = (searchParams.get('orderType') as 'takeaway' | 'delivery') || null
  
  // Form validation state
  const [isFormValid, setIsFormValid] = useState(false)
  const [formData, setFormData] = useState<object | null>(null)
  const [orderNotes, setOrderNotes] = useState<string>('')
  const [selectedOrderType, setSelectedOrderType] = useState<'takeaway' | 'delivery' | null>(initialOrderType)
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string
    discountAmount: number
    campaignType: 'percentage' | 'fixed_amount'
    campaignValue: number
  } | null>(null)
  const [selectedTip, setSelectedTip] = useState<{
    amount: number
    type: 'percentage' | 'fixed'
    value: number
  } | null>(null)
  const customerInfoRef = useRef<{ triggerValidation: () => boolean } | null>(null)
  
  // Fetch minimum order amount for delivery validation
  const { minimumOrderAmount, isLoading: isMinimumOrderLoading } = useMinimumOrder({
    branchId: orderContext.branchId,
    enabled: orderContext.source === 'web' // Only for web users
  })
  
  // Fetch delivery fee for the branch
  const { deliveryFee } = useDeliveryFee({
    branchId: orderContext.branchId,
    enabled: true // Always enabled for all users
  })
  
  const handleValidationChange = (isValid: boolean, data: object) => {
    setIsFormValid(isValid)
    setFormData(data)
  }
  
  // Handle order type change from customer information section
  const handleOrderTypeChange = (orderType: 'takeaway' | 'delivery' | null) => {
    setSelectedOrderType(orderType)
  }
  
  // Calculate order totals for minimum order validation
  const orderTotals = useMemo(() => {
    const itemsTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const discountAmount = appliedDiscount?.discountAmount || 0
    const subtotalAfterDiscount = itemsTotal - discountAmount
    
    // Add delivery fee for delivery orders only
    const applicableDeliveryFee = selectedOrderType === 'delivery' ? deliveryFee : 0
    const subtotalWithDelivery = subtotalAfterDiscount + applicableDeliveryFee
    
    // Quebec taxes: GST (5%) + QST (9.975%) - calculated on food + delivery only (tip is NOT taxable)
    const gst = subtotalWithDelivery * 0.05
    const qst = subtotalWithDelivery * 0.09975
    
    // Add tip amount AFTER taxes (tip is not taxable in Canada)
    const tipAmount = selectedTip?.amount || 0
    const finalTotal = subtotalWithDelivery + gst + qst + tipAmount
    
    return {
      itemsTotal,
      subtotalAfterDiscount,
      subtotalWithDelivery,
      tipAmount,
      gst,
      qst,
      finalTotal
    }
  }, [items, appliedDiscount, selectedOrderType, deliveryFee, selectedTip])
  
  // Check if minimum order requirement is met for delivery orders
  const isMinimumOrderMet = useMemo(() => {
    // Takeaway orders don't have minimum requirements
    if (selectedOrderType !== 'delivery') return true
    
    // No minimum set or still loading
    if (!minimumOrderAmount || isMinimumOrderLoading) return true
    
    // Only check food subtotal (after discounts) against minimum, exclude delivery fee and taxes
    return orderTotals.subtotalAfterDiscount >= minimumOrderAmount
  }, [selectedOrderType, minimumOrderAmount, isMinimumOrderLoading, orderTotals.subtotalAfterDiscount])
  
  // Handle tip selection changes
  const handleTipChange = (tipAmount: number, tipType: 'percentage' | 'fixed', tipValue: number) => {
    if (tipAmount > 0) {
      setSelectedTip({
        amount: tipAmount,
        type: tipType,
        value: tipValue
      })
    } else {
      setSelectedTip(null)
    }
  }

  // Function to trigger validation from child components
  const triggerFormValidation = () => {
    if (customerInfoRef.current && customerInfoRef.current.triggerValidation) {
      return customerInfoRef.current.triggerValidation()
    }
    return false
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center gap-2 px-3 py-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {t.orderPage.review.title || "Review Your Order"}
              </h1>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Customer Information & Preferences */}
          <div className="space-y-6">
            <CustomerInformationSection 
              ref={customerInfoRef}
              language={language} 
              orderContext={orderContext}
              onValidationChange={handleValidationChange}
              onOrderTypeChange={handleOrderTypeChange}
            />
            <PaymentMethodSection />
            <TipSection 
              subtotal={orderTotals.subtotalAfterDiscount} 
              onTipChange={handleTipChange}
            />
          </div>

          {/* Right Side - Order Summary & Details */}
          <div className="space-y-6">
            <OrderSummary items={items} language={language} />
            <PriceDetailsSection 
              items={items} 
              language={language} 
              appliedDiscount={appliedDiscount}
              selectedOrderType={selectedOrderType}
              minimumOrderAmount={minimumOrderAmount}
              isMinimumOrderLoading={isMinimumOrderLoading}
              isMinimumOrderMet={isMinimumOrderMet}
              deliveryFee={deliveryFee}
              selectedTip={selectedTip}
            />
            <PromoCodeSection 
              items={items} 
              language={language} 
              branchId={orderContext.branchId}
              onDiscountChange={setAppliedDiscount}
            />
            <OrderNotesSection 
              value={orderNotes}
              onChange={setOrderNotes}
            />
            <OrderTotalSidebar 
              language={language}
              isFormValid={isFormValid}
              formData={formData || {}}
              orderNotes={orderNotes}
              orderContext={orderContext}
              onTriggerValidation={triggerFormValidation}
              isMinimumOrderMet={isMinimumOrderMet}
              selectedOrderType={selectedOrderType}
            />
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  )
}