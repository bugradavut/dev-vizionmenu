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
import { Plus, Minus, ShoppingCart, Trash2, AlertTriangle, MapPin, Package } from 'lucide-react'
import { useCart } from '../contexts/cart-context'
import { useOrderContext } from '../contexts/order-context'

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

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId)
    } else {
      updateQuantity(itemId, newQuantity)
    }
  }

  const submitOrder = async () => {
    // Validate order first
    if (!validateOrder()) return
    
    setIsSubmitting(true)
    setError(null)

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
        orderType: orderType,
        source: isQROrder ? 'qr' : 'web',
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
      setError('Please add items to your cart')
      return false
    }

    if (orderType === 'takeout') {
      // Takeout orders require complete delivery info
      if (!customerInfo.name.trim()) {
        setError('Please enter your full name')
        return false
      }
      if (!customerInfo.phone.trim()) {
        setError('Please enter your phone number')
        return false
      }
      if (!customerInfo.address?.trim()) {
        setError('Please enter your delivery address')
        return false
      }
    }
    
    if (orderType === 'dine_in' && !isQROrder) {
      // Web dine-in orders need customer info for contact (no table number available)
      if (!customerInfo.name.trim()) {
        setError('Please enter your name for dine-in service')
        return false
      }
      if (!customerInfo.phone.trim()) {
        setError('Please enter your phone number for dine-in service')
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
              <ShoppingCart className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Order Placed!</h3>
            <p className="text-gray-600 mb-4">
              Your order has been received and is being prepared.
            </p>
            <Button 
              onClick={() => setOrderSuccess(false)} 
              className="w-full"
            >
              Place Another Order
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Order Summary
          </h2>
          {itemCount > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Badge>
          )}
        </div>
        
      </div>

      {/* Order Type Selection */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={orderType === 'dine_in' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setOrderType('dine_in')}
            className="flex items-center gap-2 h-10"
            // Both QR and Web users can select dine in
          >
            <MapPin className="w-4 h-4" />
            <span>Dine In</span>
            {orderType === 'dine_in' && <div className="w-2 h-2 bg-white rounded-full ml-auto" />}
          </Button>
          
          <Button
            variant={orderType === 'takeout' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setOrderType('takeout')}
            className="flex items-center gap-2 h-10"
          >
            <Package className="w-4 h-4" />
            <span>Takeout</span>
            {orderType === 'takeout' && <div className="w-2 h-2 bg-white rounded-full ml-auto" />}
          </Button>
        </div>
        
        {/* Order Type Info */}
        <div className="mt-3">
          {orderType === 'dine_in' ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
                <MapPin className="w-4 h-4" />
                <span>Dine In Service</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                {isQROrder 
                  ? `Your order will be served to Table ${tableNumber}${zone ? ` in ${zone}` : ''}`
                  : 'Please let staff know your table number when ordering'
                }
              </p>
            </div>
          ) : (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-orange-700 text-sm font-medium">
                <Package className="w-4 h-4" />
                <span>Takeout Order</span>
              </div>
              <p className="text-xs text-orange-600 mt-1">
                Your order will be prepared for pickup/delivery
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
            <h3 className="text-gray-500 font-medium mb-2">Your cart is empty</h3>
            <p className="text-gray-400 text-sm">Add items from the menu to get started</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Cart Items */}
            <div className="space-y-3">
              {items.map((item) => (
                <Card key={item.id} className="p-4">
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
                        ${item.price.toFixed(2)} each
                      </p>
                      
                      {/* Notes */}
                      {item.notes && (
                        <p className="text-xs text-gray-500 mt-1 italic">
                          Note: {item.notes}
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

            {/* Order Summary */}
            <Card className="p-4 bg-gray-50">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (13%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Customer Info & Checkout */}
      {items.length > 0 && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Customer Information - Different fields based on order type */}
          {(orderType === 'takeout' || (orderType === 'dine_in' && !isQROrder)) && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-900">
                {orderType === 'takeout' ? 'Delivery Information' : 'Customer Information'}
              </Label>
              
              <Input
                placeholder={orderType === 'takeout' ? "Full Name" : "Your Name"}
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
              />
              
              <Input
                placeholder="Phone Number"
                type="tel"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
              />
              
              {orderType === 'takeout' && (
                <Input
                  placeholder="Delivery Address"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
                />
              )}
              
              <Input
                placeholder="Email (optional)"
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
                  <span>Table Service Information</span>
                </div>
                
                <div className="text-sm text-blue-600">
                  <div className="flex justify-between">
                    <span>Table Number:</span>
                    <span className="font-medium">{tableNumber}</span>
                  </div>
                  {zone && (
                    <div className="flex justify-between">
                      <span>Zone:</span>
                      <span className="font-medium">{zone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Order Source:</span>
                    <span className="font-medium">QR Code</span>
                  </div>
                </div>
                
                <p className="text-xs text-blue-600 italic">
                  Your order will be delivered directly to your table. No additional information required.
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

          {/* Checkout Button */}
          <Button
            onClick={submitOrder}
            disabled={isSubmitting || items.length === 0}
            className="w-full h-12 text-base font-medium"
            size="lg"
          >
            {isSubmitting ? "Placing Order..." : `Checkout - $${total.toFixed(2)}`}
          </Button>
        </div>
      )}
    </div>
  )
}