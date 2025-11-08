"use client"

import { useState, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCart } from '../../contexts/cart-context'
import { useLanguage } from '@/contexts/language-context'
import { useCustomerBranchSettings } from '@/hooks/use-customer-branch-settings'
import { translations } from '@/lib/translations'
import { OrderSummary } from './order-summary'
import { CustomerInformationSection, type CustomerFormData, type CustomerInformationSectionHandle, type CustomerValidationResult } from './customer-information-section'
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
  chainSlug?: string
  tableNumber?: number
  zone?: string
  isQROrder: boolean
  selectedOrderType?: 'dine_in' | 'takeaway' | 'delivery' | null
}

export function OrderReviewContainer({ orderContext }: { orderContext: OrderContext }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  // SW-78 FO-114: Add updateQuantity and removeItem for Quebec SRS compliance
  const { items, updateQuantity, removeItem } = useCart()
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  
  // Initialize order type from URL params
  const initialOrderType = (searchParams.get('orderType') as 'takeaway' | 'delivery') || null
  
  // Form validation state
  const [isFormValid, setIsFormValid] = useState(false)
  const [formData, setFormData] = useState<CustomerFormData | null>(null)
  const [orderNotes, setOrderNotes] = useState<string>('')
  // SW-78 FO-116 Step 1: Updated payment method type to support cash/card distinction
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'online' | 'cash' | 'card'>('online')
  const [selectedOrderType, setSelectedOrderType] = useState<'takeaway' | 'delivery' | null>(initialOrderType)
  const [appliedDiscount, setAppliedDiscount] = useState<{
    id: string
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
  const customerInfoRef = useRef<CustomerInformationSectionHandle | null>(null)
  
  // Fetch minimum order amount for delivery validation
  // Fetch branch settings
  const { settings, loading: isSettingsLoading } = useCustomerBranchSettings({
    branchId: orderContext.branchId,
    autoLoad: true
  })

  const minimumOrderAmount = settings.minimumOrderAmount
  const deliveryFee = settings.deliveryFee
  const freeDeliveryThreshold = settings.freeDeliveryThreshold
  const isMinimumOrderLoading = isSettingsLoading
  
  const handleValidationChange = (result: { isValid: boolean; formData: CustomerFormData }) => {
    setIsFormValid(result.isValid)
    setFormData(result.formData)
  }
  
  // Handle order type change from customer information section
  const handleOrderTypeChange = (orderType: 'takeaway' | 'delivery' | null) => {
    setSelectedOrderType(orderType)
  }
  
  // Calculate order totals with dynamic delivery fee calculation
  const orderTotals = useMemo(() => {
    const itemsTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const discountAmount = appliedDiscount?.discountAmount || 0
    const subtotalAfterDiscount = itemsTotal - discountAmount
    
    // ✅ NEW: Calculate dynamic delivery fee based on free delivery threshold
    const calculateDeliveryFee = () => {
      if (selectedOrderType !== 'delivery') return 0;
      if (freeDeliveryThreshold > 0 && subtotalAfterDiscount >= freeDeliveryThreshold) {
        return 0; // FREE DELIVERY! 🎉
      }
      return deliveryFee; // Normal delivery fee
    };
    
    const applicableDeliveryFee = calculateDeliveryFee();
    const subtotalWithDelivery = subtotalAfterDiscount + applicableDeliveryFee
    
    // ✅ NEW CANADA TAX RULES: Add tip amount BEFORE taxes (tip is now taxable)
    const tipAmount = selectedTip?.amount || 0
    const subtotalWithDeliveryAndTip = subtotalWithDelivery + tipAmount
    
    // Quebec taxes: GST (5%) + QST (9.975%) - calculated on food + delivery + tip
    const gst = subtotalWithDeliveryAndTip * 0.05
    const qst = subtotalWithDeliveryAndTip * 0.09975
    
    // Final total: subtotal + tip + taxes
    const finalTotal = subtotalWithDeliveryAndTip + gst + qst
    
    // ✅ NEW: Free delivery metadata
    const isFreeDelivery = selectedOrderType === 'delivery' && freeDeliveryThreshold > 0 && subtotalAfterDiscount >= freeDeliveryThreshold;
    const deliverySavings = isFreeDelivery ? deliveryFee : 0;
    
    return {
      itemsTotal,
      subtotalAfterDiscount,
      subtotalWithDelivery,
      subtotalWithDeliveryAndTip,
      tipAmount,
      gst,
      qst,
      finalTotal,
      applicableDeliveryFee, // ✅ NEW: Calculated delivery fee
      isFreeDelivery, // ✅ NEW: Free delivery flag
      deliverySavings // ✅ NEW: Amount saved on delivery
    }
  }, [items, appliedDiscount, selectedOrderType, deliveryFee, freeDeliveryThreshold, selectedTip])
  
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

  // Handle payment method changes
  // SW-78 FO-116 Step 1: Support 3 payment methods for Quebec WEB-SRM
  const handlePaymentMethodChange = (method: 'online' | 'cash' | 'card') => {
    setSelectedPaymentMethod(method)
    console.log('Payment method changed to:', method)
  }

  // Function to trigger validation from child components
  const triggerFormValidation = (): CustomerValidationResult | null => {
    if (customerInfoRef.current && customerInfoRef.current.triggerValidation) {
      return customerInfoRef.current.triggerValidation()
    }
    return null
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
            <PaymentMethodSection 
              onPaymentMethodChange={handlePaymentMethodChange}
            />
            <TipSection 
              subtotal={orderTotals.subtotalAfterDiscount} 
              onTipChange={handleTipChange}
            />
          </div>

          {/* Right Side - Order Summary & Details */}
          <div className="space-y-6">
            {/* SW-78 FO-114: Pass cart manipulation functions for Quebec SRS compliance */}
            <OrderSummary
              items={items}
              language={language}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeItem}
            />
            <PriceDetailsSection 
              items={items} 
              language={language} 
              appliedDiscount={appliedDiscount}
              selectedOrderType={selectedOrderType}
              minimumOrderAmount={minimumOrderAmount}
              isMinimumOrderLoading={isMinimumOrderLoading}
              isMinimumOrderMet={isMinimumOrderMet}
              deliveryFee={orderTotals.applicableDeliveryFee}
              baseDeliveryFee={deliveryFee}
              freeDeliveryThreshold={freeDeliveryThreshold}
              isFreeDelivery={orderTotals.isFreeDelivery}
              selectedTip={selectedTip}
              userSource={orderContext.source}
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
              formData={formData}
              paymentMethod={selectedPaymentMethod}
              orderNotes={orderNotes}
              orderContext={orderContext}
              onTriggerValidation={triggerFormValidation}
              isMinimumOrderMet={isMinimumOrderMet}
              selectedOrderType={selectedOrderType}
              appliedDiscount={appliedDiscount}
              selectedTip={selectedTip}
              deliveryFee={orderTotals.applicableDeliveryFee}
              orderTotals={orderTotals}
            />
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  )
}





