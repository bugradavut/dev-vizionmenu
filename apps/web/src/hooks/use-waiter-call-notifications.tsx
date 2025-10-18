"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { waiterCallsService, type WaiterCall } from '@/services/waiter-calls.service'
import { useEnhancedAuth } from '@/hooks/use-enhanced-auth'
import { useNotificationSound } from '@/hooks/use-notification-sound'
import { useLanguage } from '@/contexts/language-context'
import { HandPlatter } from 'lucide-react'
import toast from 'react-hot-toast'

export interface WaiterCallNotificationOptions {
  enabled?: boolean
  soundEnabled?: boolean
  pollingInterval?: number
  soundUrl?: string
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
    pollingInterval = 15000, // 15 seconds - same as order notifications
    soundUrl
  } = options

  const { branchId, user } = useEnhancedAuth()
  const { language } = useLanguage()

  // Audio notification hook
  const { playSound } = useNotificationSound({
    soundUrl,
    enabled: soundEnabled,
    volume: 1.0,
    fallbackToBeep: false  // Use actual sound file from settings
  })

  // Independent localStorage-based tracking (no context dependency)
  const [seenCalls, setSeenCalls] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('vision-menu-waiter-calls-seen');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Clean up old entries (older than 2 hours)
        const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
        const validCalls = new Set<string>();

        parsed.calls?.forEach((callData: { id: string; timestamp: number }) => {
          if (callData.timestamp > twoHoursAgo) {
            validCalls.add(callData.id);
          }
        });

        return validCalls;
      }
    } catch (error) {
      console.warn('Failed to load seen waiter calls:', error);
    }
    return new Set();
  });

  // Add seen call with persistence
  const addSeenCall = useCallback((callId: string) => {
    setSeenCalls(prev => {
      const newSeenCalls = new Set([...prev, callId]);

      // Persist to localStorage with timestamp
      try {
        const callsData = {
          calls: Array.from(newSeenCalls).map(id => ({
            id,
            timestamp: Date.now()
          })),
          savedAt: Date.now()
        };
        localStorage.setItem('vision-menu-waiter-calls-seen', JSON.stringify(callsData));
      } catch (error) {
        console.warn('Failed to save seen waiter calls:', error);
      }

      return newSeenCalls;
    });
  }, []);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Show modern waiter call notification matching order notification style
  const showWaiterCallNotification = useCallback((waiterCall: WaiterCall) => {
    // Play sound
    if (soundEnabled) {
      try {
        playSound()
      } catch {
        // Silent fail
      }
    }

    // Custom dismiss function with exit animation
    const handleDismiss = (toastId: string) => {
      // First trigger exit animation
      const toastElement = document.querySelector(`[data-toast-id="${toastId}"]`);
      if (toastElement) {
        toastElement.classList.remove('toast-enter');
        toastElement.classList.add('toast-exit');

        // Wait for animation to complete, then dismiss
        setTimeout(() => {
          toast.dismiss(toastId);
        }, 250); // Match CSS animation duration
      } else {
        // Fallback: immediate dismiss if element not found
        toast.dismiss(toastId);
      }
    };

    toast.custom((toastProps) => (
      <div data-toast-id={toastProps.id}>
        <div className="bg-white dark:bg-gray-900 p-0 overflow-hidden toast-enter"
             style={{
               width: '320px',
               maxWidth: '320px',
               minWidth: '320px',
               borderRadius: '20px',
               border: '1px solid rgba(0, 0, 0, 0.08)',
               boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 10px 25px -5px rgba(0, 0, 0, 0.1)'
             }}>
          {/* Header */}
          <div className="flex items-center gap-2 p-4 pb-3">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {language === 'fr' ? 'Appel de serveur' : 'Waiter Call'}
            </h3>
          </div>

          {/* Content */}
          <div className="px-4 pb-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              <span className="font-bold text-orange-600 dark:text-orange-400">
                {waiterCall.zone === 'Screen'
                  ? (language === 'fr' ? 'Écran' : 'Screen')
                  : waiterCall.zone
                    ? `Table ${waiterCall.table_number} - ${waiterCall.zone}`
                    : `Table ${waiterCall.table_number}`
                }
              </span>
              {language === 'fr' ? ' demande de l\'assistance. Veuillez vous rendre à la table pour aider le client.' : ' needs assistance. Please go to the table to help the customer.'}
            </div>

            {/* Action Button */}
            <button
              onClick={async () => {
                try {
                  await waiterCallsService.resolveWaiterCall(waiterCall.id)
                  // Add to seen calls when resolved
                  addSeenCall(waiterCall.id)
                  handleDismiss(toastProps.id)
                } catch (error) {
                  console.error('Failed to resolve waiter call:', error)
                }
              }}
              className="w-full text-white font-medium py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
              style={{ backgroundColor: '#ea580c' }}
              onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#c2410c'}
              onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#ea580c'}
            >
              {language === 'fr' ? 'J\'arrive' : 'On my way'}
              <HandPlatter className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    ), {
      duration: Infinity, // Never auto-dismiss - only manual resolve
      position: 'top-right',
    })

    // No auto-dismiss - notification stays until manually resolved

  }, [language, soundEnabled, playSound, addSeenCall])

  // Polling function to check for new waiter calls
  const pollWaiterCalls = useCallback(async () => {
    if (!enabled || !branchId || !user) {
      return
    }

    try {
      const pendingCalls = await waiterCallsService.getPendingWaiterCalls()

      // Find new calls (not seen before) using independent state
      const newCalls = pendingCalls.filter(call => !seenCalls.has(call.id))

      // Add new calls to seen calls
      newCalls.forEach(call => {
        addSeenCall(call.id)
      })

      // Show notifications for new calls
      newCalls.forEach(call => {
        showWaiterCallNotification(call)
      })

      console.debug('🔔 Waiter calls poll:', {
        total: pendingCalls.length,
        new: newCalls.length,
        seen: seenCalls.size
      })

    } catch (error) {
      console.error('Failed to poll waiter calls:', error)
      // Silent fail for polling errors
    }
  }, [enabled, branchId, user, showWaiterCallNotification, seenCalls, addSeenCall])

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