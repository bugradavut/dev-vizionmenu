"use client"

import { useRouter } from 'next/navigation'
import { translations } from '@/lib/translations'

interface OrderTotalSidebarProps {
  language: string
}

export function OrderTotalSidebar({ language }: OrderTotalSidebarProps) {
  const router = useRouter()
  const t = translations[language as keyof typeof translations] || translations.en

  return (
    <div className="bg-card rounded-lg border border-border p-6 sticky top-8">
      <h2 className="text-lg font-semibold text-foreground mb-6">
        Complete Order
      </h2>

      <button className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
        {t.orderPage.checkout.confirmOrder || "Confirm Order"}
      </button>
      
      <button 
        onClick={() => router.back()}
        className="w-full h-12 mt-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
      >
        {t.orderPage.checkout.backToCart || "Back to Cart"}
      </button>
    </div>
  )
}