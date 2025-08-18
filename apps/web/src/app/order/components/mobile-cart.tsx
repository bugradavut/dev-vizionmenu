"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '../contexts/cart-context'
import { CartSidebar } from './cart-sidebar'
import { cn } from '@/lib/utils'

export function MobileCart() {
  const { itemCount, total } = useCart()
  const [isOpen, setIsOpen] = useState(false)

  if (itemCount === 0) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button 
            className={cn(
              "w-full h-14 text-base font-medium shadow-lg",
              "bg-blue-600 hover:bg-blue-700 text-white",
              "flex items-center justify-between px-6"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="w-5 h-5" />
                <Badge 
                  className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center bg-white text-blue-600 text-xs font-bold"
                >
                  {itemCount}
                </Badge>
              </div>
              <span>View Cart</span>
            </div>
            
            <div className="flex flex-col items-end">
              <span className="text-sm opacity-90">{itemCount} items</span>
              <span className="font-bold">€{total.toFixed(2)}</span>
            </div>
          </Button>
        </SheetTrigger>
        
        <SheetContent 
          side="bottom" 
          className="h-[85vh] p-0 rounded-t-xl"
        >
          <SheetHeader className="p-4 border-b border-gray-200">
            <SheetTitle className="text-left">Your Order</SheetTitle>
          </SheetHeader>
          
          {/* Reuse the Cart Sidebar content */}
          <div className="h-[calc(85vh-4rem)]">
            <CartSidebar />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}