"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { GenericSkeleton } from "@/components/skeletons/generic-skeleton"

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean // Sadece giriş kontrolü
  requireRememberOrRecent?: boolean // Dashboard için: remember me VEYA recent login gerekli
  redirectTo?: string
}

export function AuthGuard({ 
  children, 
  requireAuth = true,
  requireRememberOrRecent = false,
  redirectTo = "/login" 
}: AuthGuardProps) {
  const { user, session, loading, isRemembered, hasRecentLogin } = useAuth()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [showSkeleton, setShowSkeleton] = useState(false)

  useEffect(() => {
    // Quick optimistic check - if we have basic auth data, show content immediately
    const hasBasicAuth = user && session
    const hasQuickAuth = isRemembered || hasRecentLogin
    
    if (hasBasicAuth && (!requireRememberOrRecent || hasQuickAuth)) {
      setIsAuthorized(true)
      setShowSkeleton(false)
      return
    }

    // If loading, start skeleton timer (only show skeleton after 200ms delay)
    if (loading) {
      const skeletonTimer = setTimeout(() => {
        setShowSkeleton(true)
      }, 200)
      
      return () => clearTimeout(skeletonTimer)
    }

    // Full auth check when loading is complete
    if (!loading) {
      // Temel authentication kontrolü
      if (requireAuth && (!user || !session)) {
        router.push(redirectTo)
        return
      }

      // Dashboard için özel kontrol: remember me VEYA recent login olmalı
      if (requireRememberOrRecent && (!isRemembered && !hasRecentLogin)) {
        router.push(redirectTo)
        return
      }

      // Tüm kontroller geçildiyse authorized
      setIsAuthorized(true)
      setShowSkeleton(false)
    }
  }, [user, session, loading, isRemembered, hasRecentLogin, requireAuth, requireRememberOrRecent, router, redirectTo])

  // Show skeleton only if loading takes too long
  if (loading && showSkeleton) {
    return <GenericSkeleton />
  }

  // If authorized or optimistically showing content
  if (isAuthorized || (user && session)) {
    return <>{children}</>
  }

  // Fallback skeleton for edge cases
  if (loading) {
    return <GenericSkeleton />
  }

  // Should not reach here normally
  return null
} 