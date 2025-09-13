"use client"

import Image from 'next/image'
import { translations } from '@/lib/translations'

interface OrderSummaryProps {
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
    image_url?: string
  }>
  language: string
}

export function OrderSummary({ items, language }: OrderSummaryProps) {
  const t = translations[language as keyof typeof translations] || translations.en

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        {t.orderPage.review.orderSummary || "Order Summary"}
      </h2>
      
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 pb-4 border-b border-border last:border-b-0 last:pb-0">
            <div className="w-12 h-12 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
              {item.image_url ? (
                <Image
                  src={item.image_url}
                  alt={item.name}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">No Image</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-foreground">{item.name}</h3>
              <p className="text-sm text-muted-foreground">
                Quantity: {item.quantity} × {language === 'fr' ? `${item.price.toFixed(2)} $` : `$${item.price.toFixed(2)}`}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium text-foreground">
                {language === 'fr' ? `${(item.price * item.quantity).toFixed(2)} $` : `$${(item.price * item.quantity).toFixed(2)}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}