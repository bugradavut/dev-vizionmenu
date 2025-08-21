"use client"

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Minus, Trash2, AlertTriangle, MapPin, Package, CreditCard, Banknote, CheckCircle, ShoppingBag, Loader2 } from 'lucide-react'
import { useCart } from '../contexts/cart-context'
import { useOrderContext } from '../contexts/order-context'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'
import { useResponsiveClasses } from '@/hooks/use-responsive'

interface CustomerInfo {
  name: string
  phone: string
  email?: string
  address?: string
}

export function CartSidebar() {
  const router = useRouter()
  const { 
    items, 
    updateQuantity, 
    removeItem, 
    subtotal, 
    tax, 
    total, 
    clearCart 
  } = useCart()
  
  const { isQROrder, tableNumber, zone } = useOrderContext()
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  
  // Centralized responsive state
  const responsiveClasses = useResponsiveClasses()
  
  const [customerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    email: '',
    address: ''
  })
  
  const [orderType, setOrderType] = useState<'dine_in' | 'takeout'>(
    isQROrder ? 'dine_in' : 'takeout'
  )
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash')

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId)
    } else {
      updateQuantity(itemId, newQuantity)
    }
  }

  const handleCheckoutClick = async () => {
    // Simple validation: just check if cart has items
    if (items.length === 0) {
      return
    }
    
    // Set loading state
    setIsNavigating(true)
    
    // Small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Navigate to review page
    router.push('/order/review')
    
    // Reset loading state after navigation
    setTimeout(() => setIsNavigating(false), 500)
  }

  const submitOrder = async () => {
    setIsSubmitting(true)
    setError(null)
    setShowPaymentModal(false)

    try {

      // Prepare order data for customer API
      const orderData = {
        branchId: '550e8400-e29b-41d4-a716-446655440002', // MVP default branch
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          notes: item.notes || ''
        })),
        orderType: orderType === 'takeout' ? 'takeaway' : orderType,
        source: isQROrder ? 'qr' : 'web',
        paymentMethod: paymentMethod,
        subtotal,
        tax,
        total,
        ...(isQROrder && orderType === 'dine_in' ? {
          // QR Dine-in: Table info only, no customer details needed
          tableNumber,
          zone: zone || undefined
        } : {
          // All other cases: Customer info required
          customerInfo: {
            name: customerInfo.name.trim(),
            phone: customerInfo.phone.trim(),
            email: customerInfo.email?.trim() || undefined,
            ...(orderType === 'takeout' ? {
              address: customerInfo.address?.trim()
            } : {})
          }
        })
      }

      // Make API call to place order
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/v1/customer/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `HTTP ${response.status}: Failed to place order`)
      }

      const result = await response.json()
      
      // Success
      setOrderSuccess(true)
      clearCart()
      
      console.log('Order placed successfully:', result.data)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order')
    } finally {
      setIsSubmitting(false)
    }
  }


  if (orderSuccess) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <Card className="w-full">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{t.orderPage.orderSuccess.title}</h3>
            <p className="text-muted-foreground mb-4">
              {t.orderPage.orderSuccess.message}
            </p>
            <Button 
              onClick={() => setOrderSuccess(false)} 
              className="w-full"
            >
              {t.orderPage.orderSuccess.placeAnother}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Order Type Selection */}
        <div className={`${responsiveClasses.padding.section} border-b border-border`}>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={orderType === 'dine_in' ? 'default' : 'outline'}
            onClick={() => setOrderType('dine_in')}
            className="flex items-center gap-2 h-12 text-sm font-medium justify-start px-3"
            // Both QR and Web users can select dine in
          >
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">{t.orderPage.orderType.dineIn}</span>
            {orderType === 'dine_in' && <div className="w-2 h-2 bg-white rounded-full flex-shrink-0" />}
          </Button>
          
          <Button
            variant={orderType === 'takeout' ? 'default' : 'outline'}
            onClick={() => setOrderType('takeout')}
            className="flex items-center gap-2 h-12 text-sm font-medium justify-start px-3"
          >
            <Package className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">{t.orderPage.orderType.takeout}</span>
            {orderType === 'takeout' && <div className="w-2 h-2 bg-white rounded-full flex-shrink-0" />}
          </Button>
        </div>
      </div>

      {/* Cart Items or Empty State */}
      <div className="flex-1 overflow-y-auto pb-[100px]">
        {items.length === 0 ? (
          <div className="h-full flex items-center justify-center pt-16">
            <div className="text-center px-6">
              <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
                <ShoppingBag className="w-10 h-10 text-muted-foreground/40" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">{t.orderPage.cart.empty}</h3>
              <p className="text-base text-muted-foreground/80 leading-relaxed">{t.orderPage.cart.emptyMessage}</p>
            </div>
          </div>
        ) : (
          <div className={`${responsiveClasses.padding.section} space-y-3`}>
            {/* Cart Items */}
            <div className="space-y-3">
              {items.map((item) => (
                <Card key={item.id} className={responsiveClasses.padding.card}>
                  <div className="flex items-start gap-3">
                    {/* Item Image */}
                    <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0 relative">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="64px"
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
                      <h4 className="font-medium text-base text-foreground line-clamp-1">
                        {item.name}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {language === 'fr' ? `${item.price.toFixed(2)} $ ${t.orderPage.cart.each}` : `$${item.price.toFixed(2)} each`}
                      </p>
                      
                      {/* Notes */}
                      {item.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          {t.orderPage.cart.note}: {item.notes}
                        </p>
                      )}

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            className="w-8 h-8 p-0"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-10 text-center text-sm font-medium">
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

                        {/* Remove Button - Back to original position with styling */}
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
                </Card>
              ))}
            </div>

          </div>
        )}

        {/* Customer Info Section - Inside Scrollable Area */}
        {items.length > 0 && (
          <div className={`${responsiveClasses.padding.section} space-y-3`}>
            {/* Order Summary */}
            <Card className={`${responsiveClasses.padding.card} bg-muted`}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t.orderPage.pricing.subtotal}</span>
                <span>{language === 'fr' ? `${subtotal.toFixed(2)} $` : `$${subtotal.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between">
                <span>{t.orderPage.pricing.tax}</span>
                <span>{language === 'fr' ? `${tax.toFixed(2)} $` : `$${tax.toFixed(2)}`}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-base">
                <span>{t.orderPage.pricing.total}</span>
                <span>{language === 'fr' ? `${total.toFixed(2)} $` : `$${total.toFixed(2)}`}</span>
              </div>
            </div>
          </Card>


          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          </div>
        )}
      </div>

      {/* Sticky Checkout Footer */}
      <div className="border-t border-border bg-card p-4 flex-shrink-0 absolute bottom-0 w-full">
        <Button
          onClick={handleCheckoutClick}
          disabled={isSubmitting || isNavigating || items.length === 0}
          className="w-full h-12 text-base font-semibold"
          size="lg"
        >
          {items.length === 0 
            ? t.orderPage.checkout.checkout
            : isNavigating
              ? <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading...
                </>
              : isSubmitting 
                ? t.orderPage.checkout.placingOrder 
                : (language === 'fr' ? `${t.orderPage.checkout.checkout} - ${total.toFixed(2)} $` : `${t.orderPage.checkout.checkout} - $${total.toFixed(2)}`)
          }
        </Button>
      </div>
    </div>

      {/* Payment Method Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle>{t.orderPage.payment.selectPaymentMethod}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="text-sm text-gray-600 mb-4">
              {t.orderPage.payment.howToPay}
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {/* Cash Payment */}
              <div
                onClick={() => setPaymentMethod('cash')}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Banknote className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{t.orderPage.payment.payAtCounter}</div>
                    <div className="text-sm text-gray-500">
                      {orderType === 'dine_in' ? t.orderPage.payment.payWhenLeaving : t.orderPage.payment.payWhenPickup}
                    </div>
                  </div>
                  {paymentMethod === 'cash' && (
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  )}
                </div>
              </div>

              {/* Online Payment */}
              <div
                onClick={() => setPaymentMethod('online')}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  paymentMethod === 'online'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{t.orderPage.payment.payOnline}</div>
                    <div className="text-sm text-gray-500">
                      {t.orderPage.payment.creditCardInfo}
                    </div>
                  </div>
                  {paymentMethod === 'online' && (
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <Button
                onClick={submitOrder}
                disabled={isSubmitting}
                className="w-full h-12"
                size="lg"
              >
                {isSubmitting ? t.orderPage.checkout.placingOrder : (language === 'fr' ? `${t.orderPage.checkout.confirmOrder} - ${total.toFixed(2)} $` : `${t.orderPage.checkout.confirmOrder} - $${total.toFixed(2)}`)}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowPaymentModal(false)}
                disabled={isSubmitting}
                className="w-full"
              >
                {t.orderPage.checkout.backToCart}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}