"use client"

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '../contexts/cart-context'
import { CartSidebar } from './cart-sidebar'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'

interface MobileCartProps {
  showWaiterButton?: boolean
  waiterButtonSlot?: React.ReactNode
}

export function MobileCart({ showWaiterButton = false, waiterButtonSlot }: MobileCartProps) {
  const { itemCount, subtotal } = useCart()
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  const [isOpen, setIsOpen] = useState(false)

  if (itemCount === 0 && !showWaiterButton) {
    return null
  }

  // If only waiter button should show (no cart items)
  if (itemCount === 0 && showWaiterButton) {
    return (
      <div className="fixed bottom-4 left-0 right-0 z-50 px-2">
        <div className="flex items-center justify-end gap-2">
          {waiterButtonSlot}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 px-2">
      <div className="flex items-center gap-2">
        {/* Cart Button - Takes most space */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <div className="flex-1 bg-white rounded-xl shadow-lg border-2 border-gray-200 p-4 transition-all duration-200 hover:shadow-xl hover:border-orange-200 active:scale-[0.98]">
              <div className="flex items-center justify-between">
                {/* Left: Icon + Cart Info */}
                <div className="flex items-center gap-3">
                  <div className="relative p-2 bg-orange-50 rounded-lg">
                    <ShoppingCart className="w-5 h-5 text-orange-500" />
                    <Badge
                      className="rounded-full absolute -top-1 -right-1 w-4 h-4 p-2 flex items-center justify-center bg-orange-500 text-white text-xs font-bold border-2 border-white"
                    >
                      {itemCount}
                    </Badge>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-600 text-sm font-medium">{t.orderPage.cart.viewCart}</span>
                    <span className="text-gray-400 text-xs">{itemCount} {itemCount === 1 ? t.orderPage.cart.item : t.orderPage.cart.items}</span>
                  </div>
                </div>

                {/* Right: Price */}
                <div className="flex flex-col items-end">
                  <span className="text-gray-900 text-xl font-bold">{language === 'fr' ? `${subtotal.toFixed(2)} $` : `$${subtotal.toFixed(2)}`}</span>
                  <span className="text-orange-500 text-sm font-medium">{language === 'fr' ? 'Appuyer pour réviser' : 'Tap to review'}</span>
                </div>
              </div>
            </div>
          </SheetTrigger>

          <SheetContent
            side="bottom"
            className="h-[85vh] p-0 rounded-t-xl"
          >
            <SheetHeader className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <SheetTitle className="text-left">{t.orderPage.cart.orderSummary}</SheetTitle>
                {itemCount > 0 && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {itemCount} {itemCount === 1 ? t.orderPage.cart.item : t.orderPage.cart.items}
                  </Badge>
                )}
              </div>
            </SheetHeader>

            {/* Reuse the Cart Sidebar content */}
            <div className="h-[calc(85vh-4rem)]">
              <CartSidebar />
            </div>
          </SheetContent>
        </Sheet>

        {/* Waiter Button Slot - Fixed width */}
        {showWaiterButton && waiterButtonSlot}
      </div>
    </div>
  )
}