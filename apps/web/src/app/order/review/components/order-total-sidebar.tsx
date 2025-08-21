"use client"

import { useRouter } from 'next/navigation'
import { translations } from '@/lib/translations'

interface OrderTotalSidebarProps {
  total: number
  language: string
}

export function OrderTotalSidebar({ total, language }: OrderTotalSidebarProps) {
  const router = useRouter()
  const t = translations[language as keyof typeof translations] || translations.en

  return (
    <div className="bg-card rounded-lg border border-border p-6 sticky top-8">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        {t.orderPage.pricing.orderTotal || "Order Total"}
      </h2>
      
      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{language === 'fr' ? `${total.toFixed(2)} $` : `$${total.toFixed(2)}`}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax</span>
          <span>{language === 'fr' ? `${(total * 0.13).toFixed(2)} $` : `$${(total * 0.13).toFixed(2)}`}</span>
        </div>
        <div className="border-t border-border pt-2 flex justify-between font-semibold">
          <span>Total</span>
          <span>{language === 'fr' ? `${(total * 1.13).toFixed(2)} $` : `$${(total * 1.13).toFixed(2)}`}</span>
        </div>
      </div>

      <button className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors">
        {t.orderPage.checkout.confirmOrder || "Confirm Order"}
      </button>
      
      <button 
        onClick={() => router.back()}
        className="w-full mt-3 bg-secondary text-secondary-foreground py-3 rounded-lg font-medium hover:bg-secondary/90 transition-colors"
      >
        {t.orderPage.checkout.backToCart || "Back to Cart"}
      </button>
    </div>
  )
}