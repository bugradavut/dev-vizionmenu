"use client"

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Minus, ShoppingCart, Trash2, AlertTriangle, MapPin, Package, CreditCard, Banknote, CheckCircle } from 'lucide-react'
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
  const { 
    items, 
    updateQuantity, 
    removeItem, 
    subtotal, 
    tax, 
    total, 
    itemCount,
    clearCart 
  } = useCart()
  
  const { isQROrder, tableNumber, zone } = useOrderContext()
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  
  // Centralized responsive state
  const responsiveClasses = useResponsiveClasses()
  
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    email: '',
    address: ''
  })
  
  const [orderType, setOrderType] = useState<'dine_in' | 'takeout'>(
    isQROrder ? 'dine_in' : 'takeout'
  )
  
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  const handleCheckoutClick = () => {
    // Validate order first
    if (!validateOrder()) return
    
    // For takeout orders, skip payment modal (always online payment)
    if (orderType === 'takeout') {
      setPaymentMethod('online')
      submitOrder()
      return
    }
    
    // For dine-in orders, show payment method selection modal
    setShowPaymentModal(true)
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

  const validateOrder = () => {
    if (items.length === 0) {
      setError(t.orderPage.validation.cartEmpty)
      return false
    }

    if (orderType === 'takeout') {
      // Takeout orders require complete delivery info
      if (!customerInfo.name.trim()) {
        setError(t.orderPage.validation.nameRequired)
        return false
      }
      if (!customerInfo.phone.trim()) {
        setError(t.orderPage.validation.phoneRequired)
        return false
      }
      if (!customerInfo.address?.trim()) {
        setError(t.orderPage.validation.addressRequired)
        return false
      }
    }
    
    if (orderType === 'dine_in' && !isQROrder) {
      // Web dine-in orders need customer info for contact (no table number available)
      if (!customerInfo.name.trim()) {
        setError(t.orderPage.validation.dineInNameRequired)
        return false
      }
      if (!customerInfo.phone.trim()) {
        setError(t.orderPage.validation.dineInPhoneRequired)
        return false
      }
    }

    return true
  }

  if (orderSuccess) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <Card className="w-full">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.orderPage.orderSuccess.title}</h3>
            <p className="text-gray-600 mb-4">
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
        <div className={`${responsiveClasses.padding.section} border-b border-gray-200`}>
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
        
        {/* Order Type Info */}
        <div className="mt-3">
          {orderType === 'dine_in' ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
                <MapPin className="w-4 h-4" />
                <span>{t.orderPage.orderType.dineInService}</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                {isQROrder 
                  ? (zone 
                      ? t.orderPage.orderType.tableServiceWithZone.replace('{number}', tableNumber?.toString() || '').replace('{zone}', zone)
                      : t.orderPage.orderType.tableService.replace('{number}', tableNumber?.toString() || '')
                    )
                  : t.orderPage.orderType.tableNumberInfo
                }
              </p>
            </div>
          ) : (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-orange-700 text-sm font-medium">
                <Package className="w-4 h-4" />
                <span>{t.orderPage.orderType.takeoutOrder}</span>
              </div>
              <p className="text-xs text-orange-600 mt-1">
                {t.orderPage.orderType.takeoutInfo}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cart Items or Empty State */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="p-6 text-center">
            <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-gray-500 font-medium mb-2">{t.orderPage.cart.empty}</h3>
            <p className="text-gray-400 text-sm">{t.orderPage.cart.emptyMessage}</p>
          </div>
        ) : (
          <div className={`${responsiveClasses.padding.section} space-y-3`}>
            {/* Cart Items */}
            <div className="space-y-3">
              {items.map((item) => (
                <Card key={item.id} className={responsiveClasses.padding.card}>
                  <div className="flex items-start gap-3">
                    {/* Item Image */}
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
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
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <span className="text-gray-400 text-xs">No Image</span>
                        </div>
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-base text-gray-900 line-clamp-1">
                        {item.name}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {language === 'fr' ? `${item.price.toFixed(2)} $ ${t.orderPage.cart.each}` : `$${item.price.toFixed(2)} each`}
                      </p>
                      
                      {/* Notes */}
                      {item.notes && (
                        <p className="text-xs text-gray-500 mt-1 italic">
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
            <Card className={`${responsiveClasses.padding.card} bg-gray-50`}>
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

          {/* Customer Information - Different fields based on order type */}
          {(orderType === 'takeout' || (orderType === 'dine_in' && !isQROrder)) && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-900">
                {orderType === 'takeout' ? t.orderPage.customerInfo.deliveryInfo : t.orderPage.customerInfo.customerInfo}
              </Label>
              
              <Input
                placeholder={orderType === 'takeout' ? t.orderPage.customerInfo.fullName : t.orderPage.customerInfo.yourName}
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
              />
              
              <Input
                placeholder={t.orderPage.customerInfo.phoneNumber}
                type="tel"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
              />
              
              {orderType === 'takeout' && (
                <Input
                  placeholder={t.orderPage.customerInfo.deliveryAddress}
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
                />
              )}
              
              <Input
                placeholder={t.orderPage.customerInfo.email}
                type="email"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
          )}

          {/* QR Dine-in Info Display */}
          {orderType === 'dine_in' && isQROrder && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
                  <MapPin className="w-4 h-4" />
                  <span>{t.orderPage.qrDineIn.tableServiceInfo}</span>
                </div>
                
                <div className="text-sm text-blue-600">
                  <div className="flex justify-between">
                    <span>{t.orderPage.qrDineIn.tableNumber}:</span>
                    <span className="font-medium">{tableNumber}</span>
                  </div>
                  {zone && (
                    <div className="flex justify-between">
                      <span>{t.orderPage.qrDineIn.zone}:</span>
                      <span className="font-medium">{zone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>{t.orderPage.qrDineIn.orderSource}:</span>
                    <span className="font-medium">{t.orderPage.qrDineIn.qrCode}</span>
                  </div>
                </div>
                
                <p className="text-xs text-blue-600 italic">
                  {t.orderPage.qrDineIn.deliveryInfo}
                </p>
              </div>
            </div>
          )}

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
      {items.length > 0 && (
        <div className="border-t border-gray-200 bg-white p-4 flex-shrink-0">
          <Button
            onClick={handleCheckoutClick}
            disabled={isSubmitting || items.length === 0}
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            {isSubmitting ? t.orderPage.checkout.placingOrder : (language === 'fr' ? `${t.orderPage.checkout.checkout} - ${total.toFixed(2)} $` : `${t.orderPage.checkout.checkout} - $${total.toFixed(2)}`)}
          </Button>
        </div>
      )}
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