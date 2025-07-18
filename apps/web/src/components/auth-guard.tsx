"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

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

  useEffect(() => {
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
    }
  }, [user, session, loading, isRemembered, hasRecentLogin, requireAuth, requireRememberOrRecent, router, redirectTo])

  // Loading durumunda spinner göster
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-lg">Loading...</span>
        </div>
      </div>
    )
  }

  // Yetkili değilse boş döndür (redirect zaten yapıldı)
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-lg">Redirecting...</span>
        </div>
      </div>
    )
  }

  return <>{children}</>
} 