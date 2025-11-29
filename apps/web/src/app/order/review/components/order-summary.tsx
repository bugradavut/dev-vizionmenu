"use client"

import { useState } from 'react'
import Image from 'next/image'
import { Plus, Minus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  onClearCart?: () => void
}

export function OrderSummary({ items, language, onUpdateQuantity, onRemoveItem, onClearCart }: OrderSummaryProps) {
  const t = translations[language as keyof typeof translations] || translations.en
  const [showClearCartDialog, setShowClearCartDialog] = useState(false)

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

  // Handle trash button click - show confirmation dialog
  const handleTrashClick = () => {
    setShowClearCartDialog(true)
  }

  // Handle clear cart confirmation
  const handleConfirmClearCart = () => {
    if (onClearCart) {
      onClearCart()
    }
    setShowClearCartDialog(false)
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        {t.orderPage.review.orderSummary || "Order Summary"}
      </h2>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="pb-4 border-b border-border last:border-b-0 last:pb-0">
            {/* Mobile: Stacked layout, Desktop: Horizontal layout */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              {/* Image + Name/Price (flex row on all screens) */}
              <div className="flex items-center gap-3 flex-1">
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
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {language === 'fr' ? `${item.price.toFixed(2)} $` : `$${item.price.toFixed(2)}`}
                  </p>
                </div>
              </div>

              {/* Quantity controls + Total price (flex row, aligned to right on mobile) */}
              <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                {/* SW-78 FO-114: Quantity controls for Quebec SRS compliance */}
                {onUpdateQuantity && onRemoveItem && (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      onClick={() => handleDecreaseQuantity(item.id, item.quantity)}
                      disabled={item.quantity === 1}
                      aria-label={language === 'fr' ? 'Diminuer la quantité' : 'Decrease quantity'}
                    >
                      <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <span className="w-6 sm:w-8 text-center font-medium text-sm sm:text-base">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      onClick={() => handleIncreaseQuantity(item.id, item.quantity)}
                      aria-label={language === 'fr' ? 'Augmenter la quantité' : 'Increase quantity'}
                    >
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8 text-destructive border border-transparent hover:text-destructive hover:bg-gray-100 hover:border-gray-400"
                      onClick={handleTrashClick}
                      aria-label={language === 'fr' ? 'Supprimer l\'article' : 'Remove item'}
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                )}

                <div className="text-right min-w-[70px] sm:min-w-[80px]">
                  <p className="font-semibold text-foreground">
                    {language === 'fr' ? `${(item.price * item.quantity).toFixed(2)} $` : `$${(item.price * item.quantity).toFixed(2)}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation dialog for clearing cart */}
      <AlertDialog open={showClearCartDialog} onOpenChange={setShowClearCartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'fr' ? 'Vider le panier ?' : 'Clear Cart?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'fr'
                ? 'Tous les articles seront supprimés de votre panier et vous serez redirigé vers le menu. Êtes-vous sûr ?'
                : 'All items will be removed from your cart and you will be redirected to the menu. Are you sure?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClearCart} className="bg-destructive text-white hover:bg-red-700 transition-colors">
              {language === 'fr' ? 'Oui, vider le panier' : 'Yes, Clear Cart'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}