"use client"

import { useRouter } from 'next/navigation'
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
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  const { items } = useCart()
  const { language } = useLanguage()
  const t = translations[language] || translations.en

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
            <CustomerInformationSection language={language} orderContext={orderContext} />
            <PaymentMethodSection />
            <TipSection />
          </div>

          {/* Right Side - Order Summary & Details */}
          <div className="space-y-6">
            <OrderSummary items={items} language={language} />
            <PriceDetailsSection items={items} language={language} />
            <OrderNotesSection />
            <OrderTotalSidebar language={language} />
          </div>
        </div>
      </div>
    </div>
  )
}