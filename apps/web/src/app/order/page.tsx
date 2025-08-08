"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Minus, ShoppingCart, Check } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Simple menu items for testing
const MENU_ITEMS = [
  {
    id: "1",
    name: "Margherita Pizza",
    description: "Fresh tomatoes, mozzarella, basil",
    price: 16.99,
    category: "Pizza"
  },
  {
    id: "2", 
    name: "Pepperoni Pizza",
    description: "Pepperoni, mozzarella, tomato sauce",
    price: 18.99,
    category: "Pizza"
  },
  {
    id: "3",
    name: "Caesar Salad",
    description: "Romaine lettuce, croutons, parmesan",
    price: 12.99,
    category: "Salad"
  },
  {
    id: "4",
    name: "Chicken Wings",
    description: "Spicy buffalo wings with ranch",
    price: 14.99,
    category: "Appetizer"
  },
  {
    id: "5",
    name: "Coca Cola",
    description: "Classic refreshing drink",
    price: 2.99,
    category: "Drink"
  }
]

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

interface CustomerInfo {
  name: string
  phone: string
}

export default function OrderPage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({ name: "", phone: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Add item to cart
  const addToCart = (item: typeof MENU_ITEMS[0]) => {
    setCart(prev => {
      const existing = prev.find(cartItem => cartItem.id === item.id)
      if (existing) {
        return prev.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }]
    })
  }

  // Remove item from cart
  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(cartItem => cartItem.id === itemId)
      if (existing && existing.quantity > 1) {
        return prev.map(cartItem =>
          cartItem.id === itemId
            ? { ...cartItem, quantity: cartItem.quantity - 1 }
            : cartItem
        )
      }
      return prev.filter(cartItem => cartItem.id !== itemId)
    })
  }

  // Calculate total
  const getTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  // Submit order
  const submitOrder = async () => {
    if (!customerInfo.name || !customerInfo.phone) {
      setError("Please fill in your name and phone number")
      return
    }

    if (cart.length === 0) {
      setError("Please add items to your cart")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Create order payload
      const orderData = {
        branchId: "550e8400-e29b-41d4-a716-446655440002", // Downtown Branch (with simplified flow)
        customer: {
          name: customerInfo.name,
          phone: customerInfo.phone,
          email: `${customerInfo.phone}@customer.com` // Generate fake email
        },
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          notes: ""
        })),
        orderType: "dine_in",
        source: "web",
        third_party_platform: null,
        pricing: {
          subtotal: getTotal(),
          tax: getTotal() * 0.13, // 13% HST
          total: getTotal() * 1.13
        }
      }

      // Submit to API
      const response = await fetch("http://localhost:3001/api/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(orderData)
      })

      if (!response.ok) {
        throw new Error(`Failed to create order: ${response.status}`)
      }

      const result = await response.json()
      console.log("Order created:", result)

      // Success!
      setOrderSuccess(true)
      setCart([])
      setCustomerInfo({ name: "", phone: "" })

    } catch (err) {
      console.error("Order submission error:", err)
      setError(err instanceof Error ? err.message : "Failed to submit order")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h2>
            <p className="text-gray-600 mb-6">
              Your order has been received and is being prepared.
            </p>
            <Button onClick={() => setOrderSuccess(false)} className="w-full">
              Place Another Order
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Vision Menu</h1>
            <p className="text-gray-600">Downtown Branch - Order Online</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Menu Items */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Menu</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {MENU_ITEMS.map((item) => (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                        <Badge variant="outline">{item.category}</Badge>
                      </div>
                      <p className="text-gray-600 text-sm mb-4">{item.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xl font-bold text-gray-900">${item.price}</span>
                        <Button onClick={() => addToCart(item)} size="sm">
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Cart & Checkout */}
            <div className="lg:col-span-1">
              <Card className="sticky top-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Your Order
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Cart Items */}
                  {cart.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Your cart is empty</p>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{item.name}</h4>
                            <p className="text-gray-600 text-sm">${item.price} each</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => removeFromCart(item.id)}
                              size="sm"
                              variant="outline"
                              className="w-8 h-8 p-0"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              onClick={() => addToCart(MENU_ITEMS.find(menuItem => menuItem.id === item.id)!)}
                              size="sm"
                              variant="outline"
                              className="w-8 h-8 p-0"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Total */}
                  {cart.length > 0 && (
                    <div className="border-t pt-4">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total (with tax):</span>
                        <span>${(getTotal() * 1.13).toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Customer Info */}
                  <div className="border-t pt-4 space-y-3">
                    <h3 className="font-semibold">Customer Information</h3>
                    <Input
                      placeholder="Your Name"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                    />
                    <Input
                      placeholder="Phone Number"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>

                  {/* Error Message */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Submit Button */}
                  <Button
                    onClick={submitOrder}
                    disabled={isSubmitting || cart.length === 0}
                    className="w-full"
                    size="lg"
                  >
                    {isSubmitting ? "Placing Order..." : "Place Order"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}