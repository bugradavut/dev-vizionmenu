"use client"

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function OrderReviewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // UPDATED: Redirect to new chainSlug-based URL
  useEffect(() => {
    const branchId = searchParams.get('branch')
    
    if (!branchId) {
      // No branch ID, redirect to general order page
      router.replace('/order')
      return
    }

    // Try to find chain from localStorage branch selections
    const findChainSlug = () => {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('selected-branch-')) {
            const branchData = JSON.parse(localStorage.getItem(key) || '{}');
            if (branchData.id === branchId) {
              return key.replace('selected-branch-', '');
            }
          }
        }
      } catch (error) {
        console.error('Error finding chain slug:', error);
      }
      return null;
    }

    const chainSlug = findChainSlug()
    
    if (chainSlug) {
      // Redirect to new chainSlug-based URL
      const newUrl = `/order/${chainSlug}/review?${searchParams.toString()}`
      router.replace(newUrl)
    } else {
      // Fallback: redirect to general order page
      router.replace('/order')
    }
  }, [searchParams, router])

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
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