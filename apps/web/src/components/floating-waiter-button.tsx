"use client"

import { useState, useEffect, useRef } from 'react'
import { waiterCallsService } from '@/services/waiter-calls.service'
import { HandPlatter, CheckCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { cn } from '@/lib/utils'

interface FloatingWaiterButtonProps {
  branchId: string
  tableNumber: number
  zone?: string
}

type SimpleState = 'collapsed' | 'expanded' | 'calling' | 'success' | 'hidden'

export function FloatingWaiterButton({
  branchId,
  tableNumber,
  zone
}: FloatingWaiterButtonProps) {
  const [state, setState] = useState<SimpleState>('collapsed')
  const { language } = useLanguage()
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-collapse when clicking outside or scrolling
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (state === 'expanded' && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setState('collapsed')
      }
    }

    const handleScroll = () => {
      if (state === 'expanded') {
        setState('collapsed')
      }
    }

    // Add event listeners when expanded
    if (state === 'expanded') {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('scroll', handleScroll, { passive: true })
      window.addEventListener('scroll', handleScroll, { passive: true })
    }

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('scroll', handleScroll)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [state])

  // Handle tab click
  const handleTabClick = () => {
    if (state === 'collapsed') {
      setState('expanded')
    }
  }

  // Handle call waiter click
  const handleCallWaiter = async () => {
    try {
      setState('calling')

      await waiterCallsService.createWaiterCall({
        branch_id: branchId,
        table_number: tableNumber,
        zone
      })

      // Show success message
      setState('success')

      // Hide after 3 seconds
      setTimeout(() => {
        setState('hidden')
      }, 3000)

    } catch (error) {
      console.error('Failed to call waiter:', error)
      // Go back to expanded on error
      setState('expanded')
    }
  }

  // Don't render if hidden
  if (state === 'hidden') {
    return null
  }

  return (
    <div ref={containerRef} className="fixed -right-2 top-1/2 -translate-y-1/2 z-50">
      {/* Collapsed Tab */}
      {state === 'collapsed' && (
        <button
          onClick={handleTabClick}
          className="group flex items-center justify-center bg-gradient-to-l from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-md hover:shadow-lg rounded-l-lg border-r-0 w-8 h-12 transition-all duration-300 ease-out hover:w-10 hover:h-14"
          title="Call Waiter"
        >
          <HandPlatter
            className="w-4 h-4 transition-all duration-200 group-hover:w-5 group-hover:h-5"
            style={{ transform: 'scaleX(-1)' }}
          />
        </button>
      )}

      {/* Expanded / Calling / Success States */}
      {(state === 'expanded' || state === 'calling' || state === 'success') && (
        <div className="animate-in slide-in-from-right-2 duration-300 ease-out">
          <button
            onClick={state === 'expanded' ? handleCallWaiter : undefined}
            disabled={state === 'calling' || state === 'success'}
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-l-lg border-r-0 shadow-xl min-w-[180px] h-12 text-sm font-medium transition-all duration-200",
              state === 'expanded' && "bg-teal-500 hover:bg-teal-600 text-white cursor-pointer",
              state === 'calling' && "bg-blue-500 text-white cursor-not-allowed",
              state === 'success' && "bg-green-500 text-white cursor-not-allowed"
            )}
          >
            {state === 'expanded' && (
              <>
                <HandPlatter className="w-5 h-5" style={{ transform: 'scaleX(-1)' }} />
                <span>{language === 'fr' ? 'Appeler le serveur' : 'Call waiter'}</span>
              </>
            )}
            {state === 'calling' && (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                <span>{language === 'fr' ? 'Appel...' : 'Calling...'}</span>
              </>
            )}
            {state === 'success' && (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>{language === 'fr' ? 'Serveur notifié!' : 'Waiter notified!'}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}