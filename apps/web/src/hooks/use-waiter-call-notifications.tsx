"use client"

import { useCallback, useEffect, useRef } from 'react'
import { waiterCallsService, type WaiterCall } from '@/services/waiter-calls.service'
import { useEnhancedAuth } from '@/hooks/use-enhanced-auth'
import { useNotificationSound } from '@/hooks/use-notification-sound'
import { useLanguage } from '@/contexts/language-context'
import toast from 'react-hot-toast'

export interface WaiterCallNotificationOptions {
  enabled?: boolean
  soundEnabled?: boolean
  pollingInterval?: number
}

/**
 * Simplified waiter call notifications hook
 * Integrates with existing notification context
 */
export const useWaiterCallNotifications = (
  options: WaiterCallNotificationOptions = {}
) => {
  const {
    enabled = true,
    soundEnabled = true,
    pollingInterval = 15000 // 15 seconds - same as order notifications
  } = options

  const { branchId, user } = useEnhancedAuth()
  const { language } = useLanguage()

  // Audio notification hook
  const { playSound } = useNotificationSound({
    enabled: soundEnabled,
    volume: 1.0,
    fallbackToBeep: true
  })

  // State for tracking seen calls
  const seenCallsRef = useRef<Set<string>>(new Set())
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Show simple persistent waiter call notification
  const showWaiterCallNotification = useCallback((waiterCall: WaiterCall) => {
    // Play sound
    if (soundEnabled) {
      try {
        playSound()
      } catch {
        // Silent fail
      }
    }

    // Create persistent toast notification
    toast.custom((toastProps) => (
      <div className="bg-orange-50 dark:bg-orange-950/90 border border-orange-200 dark:border-orange-800 p-4 rounded-lg shadow-lg max-w-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            <h3 className="font-semibold text-orange-900 dark:text-orange-100 text-sm">
              {language === 'fr' ? 'Appel de serveur' : 'Waiter Call'}
            </h3>
          </div>
        </div>

        <div className="text-sm text-gray-700 dark:text-gray-300 mb-3">
          <span className="font-bold text-orange-700 dark:text-orange-400">
            {waiterCall.zone === 'Screen'
              ? (language === 'fr' ? 'Écran' : 'Screen')
              : waiterCall.zone
                ? `Table ${waiterCall.table_number} - ${waiterCall.zone}`
                : `Table ${waiterCall.table_number}`
            }
          </span>
          {language === 'fr' ? ' demande de l\'assistance.' : ' needs assistance.'}
        </div>

        <button
          onClick={async () => {
            try {
              await waiterCallsService.resolveWaiterCall(waiterCall.id)
              toast.dismiss(toastProps.id)
            } catch (error) {
              console.error('Failed to resolve waiter call:', error)
            }
          }}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-3 rounded text-sm transition-colors"
        >
          {language === 'fr' ? 'Résoudre' : 'Resolve'}
        </button>
      </div>
    ), {
      duration: Infinity, // Never auto-dismiss
      position: 'top-right',
    })

  }, [language, soundEnabled, playSound])

  // Polling function to check for new waiter calls
  const pollWaiterCalls = useCallback(async () => {
    if (!enabled || !branchId || !user) {
      return
    }

    try {
      const pendingCalls = await waiterCallsService.getPendingWaiterCalls()

      // Find new calls (not seen before)
      const newCalls = pendingCalls.filter(call => !seenCallsRef.current.has(call.id))

      // Update seen calls
      pendingCalls.forEach(call => {
        seenCallsRef.current.add(call.id)
      })

      // Show notifications for new calls
      newCalls.forEach(call => {
        showWaiterCallNotification(call)
      })

    } catch (error) {
      console.error('Failed to poll waiter calls:', error)
      // Silent fail for polling errors
    }
  }, [enabled, branchId, user, showWaiterCallNotification])

  // Start/stop polling
  useEffect(() => {
    if (!enabled || !branchId || !user) {
      return
    }

    // Initial poll
    pollWaiterCalls()

    // Set up polling interval
    pollingIntervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        pollWaiterCalls()
      }
    }, pollingInterval)

    // Cleanup
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [enabled, branchId, user, pollingInterval, pollWaiterCalls])

  return {
    // Simple interface
    enabled
  }
}