"use client"

import { useCart } from '../../contexts/cart-context'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'
import { OrderSummary } from './order-summary'
import { CustomerInformationSection } from './customer-information-section'
import { PaymentMethodSection } from './payment-method-section'
import { TipSection } from './tip-section'
import { OrderNotesSection } from './order-notes-section'
import { PriceDetailsSection } from './price-details-section'
import { OrderTotalSidebar } from './order-total-sidebar'

export function OrderReviewContainer() {
  const { items, total } = useCart()
  const { language } = useLanguage()
  const t = translations[language] || translations.en

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t.orderPage.review.title || "Review Your Order"}
          </h1>
          <p className="text-muted-foreground">
            {t.orderPage.review.subtitle || "Please review your order details before confirming"}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Customer Information & Preferences */}
          <div className="space-y-6">
            <CustomerInformationSection />
            <PaymentMethodSection />
            <TipSection />
          </div>

          {/* Right Side - Order Summary & Details */}
          <div className="space-y-6">
            <OrderSummary items={items} language={language} />
            <PriceDetailsSection subtotal={total} language={language} />
            <OrderNotesSection />
            <OrderTotalSidebar total={total} language={language} />
          </div>
        </div>
      </div>
    </div>
  )
}