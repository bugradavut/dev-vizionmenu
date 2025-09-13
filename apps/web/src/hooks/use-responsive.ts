"use client"

import { useState, useEffect } from 'react'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

interface ResponsiveState {
  breakpoint: Breakpoint
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  width: number
}

const getBreakpoint = (width: number): Breakpoint => {
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

/**
 * Centralized responsive hook for Order Page
 * Replaces multiple event listeners with single optimized listener
 * 
 * Breakpoints:
 * - Mobile: < 768px (iPhone, small screens)
 * - Tablet: 768px - 1023px (iPad Air/Mini)
 * - Desktop: ≥ 1024px (Laptop, Desktop)
 */
export const useResponsive = (): ResponsiveState => {
  const [state, setState] = useState<ResponsiveState>(() => {
    // Server-side safe initial state - assume desktop to prevent layout shift
    return {
      breakpoint: 'desktop',
      isMobile: false,
      isTablet: false, 
      isDesktop: true,
      width: 1024
    }
  })
  
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Set mounted to true on client side
    setMounted(true)
    
    const handleResize = () => {
      const width = window.innerWidth
      const breakpoint = getBreakpoint(width)
      
      setState({
        breakpoint,
        isMobile: breakpoint === 'mobile',
        isTablet: breakpoint === 'tablet',
        isDesktop: breakpoint === 'desktop',
        width
      })
    }

    // Throttled resize handler for better performance
    let timeoutId: NodeJS.Timeout
    const throttledResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(handleResize, 100)
    }

    window.addEventListener('resize', throttledResize, { passive: true })
    
    // Initial check on mount (only on client side)
    handleResize()

    return () => {
      window.removeEventListener('resize', throttledResize)
      clearTimeout(timeoutId)
    }
  }, [])
  
  // Return server-safe state until component mounts
  return mounted ? state : {
    breakpoint: 'desktop',
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    width: 1024
  }
}

/**
 * Hook for getting responsive classes based on current breakpoint
 * Useful for conditional styling
 */
export const useResponsiveClasses = () => {
  const { breakpoint } = useResponsive()
  
  return {
    // Spacing classes
    padding: {
      container: breakpoint === 'desktop' ? 'p-6' : breakpoint === 'tablet' ? 'p-4' : 'p-3',
      card: breakpoint === 'desktop' ? 'p-4' : 'p-3',
      section: breakpoint === 'desktop' ? 'p-4' : 'p-3'
    },
    
    // Layout classes
    grid: {
      cols: breakpoint === 'desktop' ? 'lg:grid-cols-3 xl:grid-cols-4' : 'lg:grid-cols-2',
      gap: breakpoint === 'desktop' ? 'gap-6' : 'gap-4'
    },
    
    // Size classes
    button: {
      height: breakpoint === 'desktop' ? 'h-12' : breakpoint === 'tablet' ? 'h-11' : 'h-10',
      text: breakpoint === 'desktop' ? 'text-base' : 'text-sm'
    },
    
    // Width classes
    sidebar: {
      cart: breakpoint === 'desktop' ? 'w-80' : 'w-72'
    }
  }
}