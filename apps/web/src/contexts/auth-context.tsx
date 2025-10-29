"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useInactivityTimeout } from '@/hooks/use-inactivity-timeout'

interface SignUpMetadata {
  [key: string]: string | number | boolean
}

interface AuthResult {
  data: {
    user: User | null
    session: Session | null
  } | null
  error: AuthError | null
}

interface ResetPasswordResult {
  data: Record<string, unknown> | null
  error: AuthError | null
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, metadata?: SignUpMetadata) => Promise<AuthResult>
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<AuthResult>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<ResetPasswordResult>
  isRemembered: boolean
  hasRecentLogin: boolean
  inactivityWarning: boolean
  inactivityRemainingTime: number
  resetInactivityTimer: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Constants for localStorage keys
const REMEMBER_ME_KEY = 'vizion-menu-remember-me'
const USER_CREDENTIALS_KEY = 'vizion-menu-user-credentials'
const RECENT_LOGIN_KEY = 'vizion-menu-recent-login'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRemembered, setIsRemembered] = useState(false)
  const [hasRecentLogin, setHasRecentLogin] = useState(false)

  // Quick sync check on mount - optimize initial loading
  useEffect(() => {
    const quickCheck = () => {
      const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) === 'true'
      const recentLogin = sessionStorage.getItem(RECENT_LOGIN_KEY) === 'true'
      
      setIsRemembered(rememberMe)
      setHasRecentLogin(recentLogin)
      
      // If no auth preferences, can skip heavy session check initially
      if (!rememberMe && !recentLogin) {
        setLoading(false)
      }
    }
    
    quickCheck()
  }, [])

  useEffect(() => {
    // Check remember me and recent login status
    const checkAuthStatus = async () => {
      try {
        const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) === 'true'
        const recentLogin = sessionStorage.getItem(RECENT_LOGIN_KEY) === 'true'
        
        setIsRemembered(rememberMe)
        setHasRecentLogin(recentLogin)

        // Quick check: if no rememberMe and no recentLogin, skip session check for speed
        if (!rememberMe && !recentLogin) {
          setLoading(false)
          return
        }

        // Get initial session with timeout for performance
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 2000)
        )
        
        const result = await Promise.race([sessionPromise, timeoutPromise])
        const { data: { session } } = result as { data: { session: Session | null } }
        
        if (session) {
          setSession(session)
          setUser(session.user)
        } else if (rememberMe) {
          // Only refresh if remember me is enabled and quick check failed
          try {
            const { data: { session: refreshedSession } } = await supabase.auth.refreshSession()
            if (refreshedSession) {
              setSession(refreshedSession)
              setUser(refreshedSession.user)
            }
          } catch (refreshError) {
            console.warn('Session refresh failed:', refreshError)
          }
        }
      } catch (error) {
        console.warn('Auth check failed, continuing without session:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuthStatus()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      // Clear remember me if user signs out
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem(REMEMBER_ME_KEY)
        localStorage.removeItem(USER_CREDENTIALS_KEY)
        sessionStorage.removeItem(RECENT_LOGIN_KEY)
        setIsRemembered(false)
        setHasRecentLogin(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, metadata?: SignUpMetadata): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    return { data, error }
  }

  const signIn = async (email: string, password: string, rememberMe = false): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (data.session && !error) {
      // Set remember me preference
      setIsRemembered(rememberMe)
      setHasRecentLogin(true)
      
      if (rememberMe) {
        localStorage.setItem(REMEMBER_ME_KEY, 'true')
        localStorage.setItem(USER_CREDENTIALS_KEY, JSON.stringify({
          email: email,
          lastLogin: new Date().toISOString()
        }))
      } else {
        localStorage.removeItem(REMEMBER_ME_KEY)
        localStorage.removeItem(USER_CREDENTIALS_KEY)
      }
      
      // Set recent login flag (for this session only)
      sessionStorage.setItem(RECENT_LOGIN_KEY, 'true')
    }

    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    // Clear all auth data
    localStorage.removeItem(REMEMBER_ME_KEY)
    localStorage.removeItem(USER_CREDENTIALS_KEY)
    sessionStorage.removeItem(RECENT_LOGIN_KEY)
    setIsRemembered(false)
    setHasRecentLogin(false)
  }

  const resetPassword = async (email: string): Promise<ResetPasswordResult> => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    return { data, error }
  }

  // Inactivity timeout - auto logout after inactivity
  // For SW-78 FO-103 compliance (sleep mode requirement)
  // TODO: Make this configurable by platform admin
  const {
    showWarning: inactivityWarning,
    remainingTime: inactivityRemainingTime,
    resetTimer: resetInactivityTimer,
  } = useInactivityTimeout({
    timeout: 30 * 60 * 1000, // 30 minutes inactivity threshold (SW-78 default)
    warningTime: 30 * 1000, // 30 seconds warning
    enabled: !!user && !loading, // Only active when user is logged in
    onTimeout: async () => {
      // Auto logout on inactivity
      await signOut();
    },
    onWarning: () => {
      // Warning will be handled by UI component
    },
  });

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    isRemembered,
    hasRecentLogin,
    inactivityWarning,
    inactivityRemainingTime,
    resetInactivityTimer,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 
