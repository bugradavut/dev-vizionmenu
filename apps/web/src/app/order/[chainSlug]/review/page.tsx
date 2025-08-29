"use client"

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCart } from '../../contexts/cart-context'
import { OrderContextProvider } from '../../contexts/order-context'
import { OrderReviewContainer } from '../../review/components/order-review-container'

interface OrderReviewPageProps {
  params: Promise<{ chainSlug: string }>
}

function OrderReviewContent({ chainSlug }: { chainSlug: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { items } = useCart()

  // Order context from URL parameters - NOW WITH chainSlug
  const orderContext = {
    chainSlug, // NEW: Add chainSlug from URL parameter
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

function OrderReviewContentWrapper({ params }: { params: Promise<{ chainSlug: string }> }) {
  const [chainSlug, setChainSlug] = useState<string>('')
  
  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      setChainSlug(resolvedParams.chainSlug)
    }
    getParams()
  }, [params])
  
  if (!chainSlug) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  return <OrderReviewContent chainSlug={chainSlug} />
}

export default function OrderReviewPage({ params }: OrderReviewPageProps) {
  // We'll handle async params inside the component
  
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[--primary]"></div>
      </div>
    }>
      <OrderReviewContentWrapper params={params} />
    </Suspense>
  );
}