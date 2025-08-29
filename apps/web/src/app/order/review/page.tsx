"use client"

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCart } from '../contexts/cart-context'
import { OrderContextProvider } from '../contexts/order-context'
import { OrderReviewContainer } from './components/order-review-container'

function OrderReviewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { items } = useCart()

  // Order context from URL parameters
  const orderContext = {
    source: (searchParams.get('source') as 'qr' | 'web') || 'web',
    branchId: searchParams.get('branch') || '550e8400-e29b-41d4-a716-446655440002',
    tableNumber: searchParams.get('table') ? parseInt(searchParams.get('table')!) : undefined,
    zone: searchParams.get('zone') || undefined,
    isQROrder: searchParams.get('source') === 'qr',
    selectedOrderType: searchParams.get('orderType') as 'dine_in' | 'takeaway' | 'delivery' | null
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

  return (
    <OrderContextProvider value={orderContext}>
      <OrderReviewContainer orderContext={orderContext} />
    </OrderContextProvider>
  )
}

export default function OrderReviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[--primary]"></div>
      </div>
    }>
      <OrderReviewContent />
    </Suspense>
  );
}