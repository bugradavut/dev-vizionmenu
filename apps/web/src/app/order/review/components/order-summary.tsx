"use client"

import Image from 'next/image'
import { Plus, Minus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  // SW-78 FO-114: Add cart manipulation functions for review page
  onUpdateQuantity?: (itemId: string, quantity: number) => void
  onRemoveItem?: (itemId: string) => void
}

export function OrderSummary({ items, language, onUpdateQuantity, onRemoveItem }: OrderSummaryProps) {
  const t = translations[language as keyof typeof translations] || translations.en

  // SW-78 FO-114: Handle quantity increase
  const handleIncreaseQuantity = (itemId: string, currentQuantity: number) => {
    if (onUpdateQuantity) {
      onUpdateQuantity(itemId, currentQuantity + 1)
    }
  }

  // SW-78 FO-114: Handle quantity decrease
  const handleDecreaseQuantity = (itemId: string, currentQuantity: number) => {
    if (onUpdateQuantity) {
      if (currentQuantity > 1) {
        onUpdateQuantity(itemId, currentQuantity - 1)
      } else {
        // If quantity is 1 and user decreases, remove the item
        if (onRemoveItem) {
          onRemoveItem(itemId)
        }
      }
    }
  }

  // SW-78 FO-114: Handle item removal
  const handleRemoveItem = (itemId: string) => {
    if (onRemoveItem) {
      onRemoveItem(itemId)
    }
  }

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
                {language === 'fr' ? `${item.price.toFixed(2)} $` : `$${item.price.toFixed(2)}`}
              </p>
            </div>

            {/* SW-78 FO-114: Quantity controls for Quebec SRS compliance */}
            {onUpdateQuantity && onRemoveItem && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDecreaseQuantity(item.id, item.quantity)}
                  aria-label={language === 'fr' ? 'Diminuer la quantité' : 'Decrease quantity'}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleIncreaseQuantity(item.id, item.quantity)}
                  aria-label={language === 'fr' ? 'Augmenter la quantité' : 'Increase quantity'}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleRemoveItem(item.id)}
                  aria-label={language === 'fr' ? 'Supprimer l\'article' : 'Remove item'}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="text-right min-w-[80px]">
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