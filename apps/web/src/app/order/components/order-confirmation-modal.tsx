"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowLeft, Minus, Plus, Trash2, MapPin, Package, X } from 'lucide-react'
import { useCart } from '../contexts/cart-context'
import { useOrderContext } from '../contexts/order-context'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'
import Image from 'next/image'

interface OrderConfirmationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderType: 'dine_in' | 'takeout'
  onConfirmOrder: (customerInfo: {
    name: string
    phone: string
    email?: string
    address?: string
  }) => void
  isSubmitting?: boolean
}

export function OrderConfirmationModal({
  open,
  onOpenChange,
  orderType,
  onConfirmOrder,
  isSubmitting = false
}: OrderConfirmationModalProps) {
  const {
    items,
    updateQuantity,
    removeItem,
    subtotal,
    tax,
    total
  } = useCart()
  
  const { isQROrder } = useOrderContext()
  const { language } = useLanguage()
  const t = translations[language] || translations.en

  // Customer info state
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  })
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId)
    } else {
      updateQuantity(itemId, newQuantity)
    }
  }

  const handleBackToCart = () => {
    onOpenChange(false)
  }

  const validateCustomerInfo = () => {
    setValidationError(null)

    if (orderType === 'takeout') {
      // Takeout orders require complete delivery info
      if (!customerInfo.name.trim()) {
        setValidationError("Please enter your full name")
        return false
      }
      if (!customerInfo.phone.trim()) {
        setValidationError("Please enter your phone number")
        return false
      }
      if (!customerInfo.address?.trim()) {
        setValidationError("Please enter your delivery address")
        return false
      }
    }
    
    if (orderType === 'dine_in' && !isQROrder) {
      // Web dine-in orders need customer info for contact
      if (!customerInfo.name.trim()) {
        setValidationError("Please enter your name for dine-in service")
        return false
      }
      if (!customerInfo.phone.trim()) {
        setValidationError("Please enter your phone number for dine-in service")
        return false
      }
    }

    return true
  }

  const handleConfirmOrder = () => {
    if (validateCustomerInfo()) {
      onConfirmOrder(customerInfo)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-screen h-screen max-w-none max-h-none rounded-none p-0 gap-0 fixed inset-0 translate-x-0 translate-y-0">
        <VisuallyHidden>
          <DialogTitle>{t.orderPage.checkout.reviewOrder}</DialogTitle>
        </VisuallyHidden>
        {/* Order Confirmation Content */}
        <div className="flex flex-col h-full bg-background">
          {/* Header */}
          <div className="flex items-center gap-4 p-4 border-b border-border bg-card">
            <div className="max-w-6xl mx-auto w-full flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToCart}
                className="p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground">{t.orderPage.checkout.reviewOrder}</h2>
                <p className="text-sm text-muted-foreground">
                  {items.length} {items.length === 1 ? t.orderPage.cart.item : t.orderPage.cart.items}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToCart}
                className="p-2"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sol Taraf - Order Details */}
                <div className="space-y-6">
                  {/* Order Details */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-foreground">Order details</h3>
                      <button className="text-sm text-blue-600 underline">modify</button>
                    </div>
                    
                    {/* Order Type */}
                    <div className="flex items-center gap-2 mb-4">
                      {orderType === 'dine_in' ? (
                        <MapPin className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <Package className="w-5 h-5 text-muted-foreground" />
                      )}
                      <span className="text-foreground">
                        {orderType === 'dine_in' ? 'To dine in' : 'To take away'}
                      </span>
                    </div>

                    {/* Delivery Information */}
                    {(orderType === 'takeout' || (orderType === 'dine_in' && !isQROrder)) && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="customer-name" className="text-sm font-medium text-foreground">
                            {orderType === 'takeout' ? t.orderPage.customerInfo.fullName : t.orderPage.customerInfo.yourName} *
                          </Label>
                          <Input
                            id="customer-name"
                            placeholder={orderType === 'takeout' ? t.orderPage.customerInfo.fullName : t.orderPage.customerInfo.yourName}
                            value={customerInfo.name}
                            onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="customer-phone" className="text-sm font-medium text-foreground">
                            {t.orderPage.customerInfo.phoneNumber} *
                          </Label>
                          <Input
                            id="customer-phone"
                            placeholder={t.orderPage.customerInfo.phoneNumber}
                            type="tel"
                            value={customerInfo.phone}
                            onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                        
                        {orderType === 'takeout' && (
                          <div>
                            <Label htmlFor="customer-address" className="text-sm font-medium text-foreground">
                              {t.orderPage.customerInfo.deliveryAddress} *
                            </Label>
                            <Input
                              id="customer-address"
                              placeholder={t.orderPage.customerInfo.deliveryAddress}
                              value={customerInfo.address}
                              onChange={(e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
                              className="mt-1"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {validationError && (
                      <div className="mt-4 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
                        {validationError}
                      </div>
                    )}
                  </div>

                  {/* Add a tip */}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">Add a tip</h3>
                    <div className="grid grid-cols-5 gap-2 mb-4">
                      <Button variant="outline" className="text-center h-12">
                        <div>
                          <div className="font-medium">None</div>
                          <div className="text-xs text-muted-foreground">$0.00</div>
                        </div>
                      </Button>
                      <Button variant="outline" className="text-center h-12">
                        <div>
                          <div className="font-medium">10%</div>
                          <div className="text-xs text-muted-foreground">${(total * 0.1).toFixed(2)}</div>
                        </div>
                      </Button>
                      <Button variant="outline" className="text-center h-12">
                        <div>
                          <div className="font-medium">15%</div>
                          <div className="text-xs text-muted-foreground">${(total * 0.15).toFixed(2)}</div>
                        </div>
                      </Button>
                      <Button variant="outline" className="text-center h-12">
                        <div>
                          <div className="font-medium">18%</div>
                          <div className="text-xs text-muted-foreground">${(total * 0.18).toFixed(2)}</div>
                        </div>
                      </Button>
                      <Button variant="outline" className="text-center h-12">
                        <div>
                          <div className="font-medium">Other</div>
                        </div>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      100% of the tip supports the restaurant and its staff who prepare and pack your order.
                    </p>
                  </div>

                  {/* Other information */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-lg font-semibold text-foreground">Other information</h3>
                      <span className="text-xs text-muted-foreground border border-muted-foreground/30 px-2 py-1 rounded">Optional</span>
                    </div>
                    <div>
                      <Label htmlFor="order-notes" className="text-sm font-medium text-foreground">
                        Note for the order
                      </Label>
                      <textarea
                        id="order-notes"
                        placeholder="Ex: Put the sauce separately"
                        className="w-full mt-1 p-3 border border-border rounded-lg resize-none h-24 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Sağ Taraf - Order Summary */}
                <div className="space-y-6">
                  {/* Order Summary */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-foreground">Order Summary</h3>
                      <Button variant="ghost" size="sm">
                        <span className="text-sm">▼</span>
                      </Button>
                    </div>

                    {/* Order Items */}
                    <div className="space-y-4">
                      {items.map((item) => (
                        <div key={item.id} className="bg-card border border-border rounded-lg p-4">
                          <div className="flex gap-4">
                            {/* Item Image */}
                            <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0 relative">
                              {item.image_url ? (
                                <Image
                                  src={item.image_url}
                                  alt={item.name}
                                  fill
                                  className="object-cover"
                                  sizes="80px"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-muted">
                                  <span className="text-muted-foreground text-xs">No Image</span>
                                </div>
                              )}
                            </div>

                            {/* Item Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-foreground line-clamp-1">{item.name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {language === 'fr' ? `${item.price.toFixed(2)} $ ${t.orderPage.cart.each}` : `$${item.price.toFixed(2)} each`}
                                  </p>
                                </div>
                                <div className="text-sm font-semibold text-foreground ml-4">
                                  {language === 'fr' ? `${(item.price * item.quantity).toFixed(2)} $` : `$${(item.price * item.quantity).toFixed(2)}`}
                                </div>
                              </div>

                              {/* Notes */}
                              {item.notes && (
                                <p className="text-xs text-muted-foreground/70 mb-3 italic">
                                  {t.orderPage.cart.note}: {item.notes}
                                </p>
                              )}

                              {/* Quantity Controls and Remove */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                    className="w-8 h-8 p-0"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <span className="w-12 text-center text-sm font-medium">
                                    {item.quantity}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                    className="w-8 h-8 p-0"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => removeItem(item.id)}
                                  className="w-8 h-8 p-0 text-red-600 border-red-200 bg-red-50 hover:text-red-700 hover:bg-red-100 hover:border-red-300"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price Details */}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">Price details</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{items.length} Item{items.length !== 1 ? 's' : ''}</span>
                        <span className="font-medium">${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax ({Math.round((tax/subtotal)*100)}%)</span>
                        <span className="font-medium">${tax.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Sticky Footer with Actions */}
          <div className="border-t border-border bg-card p-4 space-y-3">
            <div className="max-w-6xl mx-auto">
              <Button
                onClick={handleConfirmOrder}
                disabled={isSubmitting || items.length === 0}
                className="w-full h-12 text-base font-semibold"
                size="lg"
              >
                {isSubmitting 
                  ? t.orderPage.checkout.placingOrder 
                  : (language === 'fr' 
                      ? `${t.orderPage.checkout.confirmOrder} - ${total.toFixed(2)} $` 
                      : `${t.orderPage.checkout.confirmOrder} - $${total.toFixed(2)}`
                    )
                }
              </Button>
              <Button
                variant="outline"
                onClick={handleBackToCart}
                disabled={isSubmitting}
                className="w-full"
              >
                {t.orderPage.checkout.backToCart}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}