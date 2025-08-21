"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '../contexts/cart-context'
import { OrderReviewContainer } from './components/order-review-container'

export default function OrderReviewPage() {
  const router = useRouter()
  const { items } = useCart()

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.push('/order')
    }
  }, [items.length, router])

  if (items.length === 0) {
    return null // Will redirect
  }

  return <OrderReviewContainer />
}