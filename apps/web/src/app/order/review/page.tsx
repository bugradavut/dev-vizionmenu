"use client"

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCart } from '../contexts/cart-context'
import { OrderReviewContainer } from './components/order-review-container'

export default function OrderReviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { items } = useCart()

  // Order context from URL parameters
  const orderContext = {
    source: (searchParams.get('source') as 'qr' | 'web') || 'web',
    branchId: searchParams.get('branch') || '550e8400-e29b-41d4-a716-446655440002',
    tableNumber: searchParams.get('table') ? parseInt(searchParams.get('table')!) : undefined,
    zone: searchParams.get('zone'),
    isQROrder: searchParams.get('source') === 'qr'
  }

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.push('/order')
    }
  }, [items.length, router])

  if (items.length === 0) {
    return null // Will redirect
  }

  return <OrderReviewContainer orderContext={orderContext} />
}