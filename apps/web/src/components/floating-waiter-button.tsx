"use client"

import { useState, useEffect, useCallback } from 'react'
import { WaiterCallButton } from './waiter-call-button'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FloatingWaiterButtonProps {
  branchId: string
  tableNumber: number
  zone?: string
}

export function FloatingWaiterButton({
  branchId,
  tableNumber,
  zone
}: FloatingWaiterButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isScrolling, setIsScrolling] = useState(false)

  // Auto-collapse on scroll detection
  const handleScroll = useCallback(() => {
    setIsScrolling(true)
    setIsExpanded(false)

    // Reset scrolling state after scroll ends
    const scrollTimer = setTimeout(() => {
      setIsScrolling(false)
    }, 150)

    return () => clearTimeout(scrollTimer)
  }, [])

  // Auto-collapse on page interaction (touch/mouse move)
  const handlePageInteraction = useCallback(() => {
    if (isExpanded) {
      setIsExpanded(false)
    }
  }, [isExpanded])

  // Setup scroll and interaction listeners
  useEffect(() => {
    const handleTouchMove = () => handlePageInteraction()
    const handleMouseMove = () => handlePageInteraction()

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('mousemove', handleMouseMove, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [handleScroll, handlePageInteraction])

  // Toggle expanded state
  const handleToggle = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50">
      {/* Collapsed Tab */}
      {!isExpanded && (
        <button
          onClick={handleToggle}
          className={cn(
            "group flex items-center justify-center",
            "bg-gradient-to-l from-orange-500 to-orange-600",
            "hover:from-orange-600 hover:to-orange-700",
            "text-white shadow-lg hover:shadow-xl",
            "rounded-l-xl border-r-0",
            "w-12 h-16 transition-all duration-300",
            "hover:w-14 hover:scale-105",
            isScrolling && "opacity-75"
          )}
          title="Call Waiter"
        >
          <MoreHorizontal
            className="w-5 h-5 transition-transform duration-200 group-hover:scale-110"
            style={{ transform: 'rotate(90deg)' }}
          />
        </button>
      )}

      {/* Expanded Button */}
      {isExpanded && (
        <div className="animate-in slide-in-from-right-full duration-300">
          <WaiterCallButton
            branchId={branchId}
            tableNumber={tableNumber}
            zone={zone}
            className="rounded-l-xl border-r-0 shadow-xl min-w-[200px] h-16 text-base font-semibold"
          />
        </div>
      )}
    </div>
  )
}