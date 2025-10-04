"use client"

import { useState } from 'react'
import { waiterCallsService } from '@/services/waiter-calls.service'
import { HandPlatter, CheckCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface FloatingWaiterButtonProps {
  branchId: string
  tableNumber: number
  zone?: string
  isHidden?: boolean
  onWaiterCalled?: () => void
}

type ButtonState = 'idle' | 'calling' | 'success'

export function FloatingWaiterButton({
  branchId,
  tableNumber,
  zone,
  isHidden = false,
  onWaiterCalled
}: FloatingWaiterButtonProps) {
  const [state, setState] = useState<ButtonState>('idle')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isSliding, setIsSliding] = useState(false)
  const { language } = useLanguage()

  // Don't render if hidden from parent
  if (isHidden) {
    return null
  }

  // Handle button click - show confirmation dialog
  const handleButtonClick = () => {
    if (state !== 'idle') return
    setShowConfirmDialog(true)
  }

  // Handle confirmed call waiter
  const handleConfirmCallWaiter = async () => {
    setShowConfirmDialog(false)

    try {
      setState('calling')

      await waiterCallsService.createWaiterCall({
        branch_id: branchId,
        table_number: tableNumber,
        zone
      })

      // Show success message
      setState('success')

      // After 2 seconds, start slide-out animation
      setTimeout(() => {
        setIsSliding(true)
      }, 2000)

      // After animation completes (2s + 500ms animation), notify parent to hide
      setTimeout(() => {
        onWaiterCalled?.()
      }, 2500)

    } catch (error) {
      console.error('Failed to call waiter:', error)
      // Go back to idle on error
      setState('idle')
    }
  }

  return (
    <>
      <button
        onClick={handleButtonClick}
        disabled={state !== 'idle'}
        className={cn(
          "group relative flex items-center justify-center w-16 h-16 rounded-full shadow-2xl transition-all duration-500 ease-out flex-shrink-0",
          state === 'idle' && "bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 hover:scale-105 active:scale-95",
          state === 'calling' && "bg-blue-500 cursor-not-allowed",
          state === 'success' && "bg-green-500 cursor-not-allowed scale-105",
          isSliding && "translate-x-32 opacity-0"
        )}
        title={language === 'fr' ? 'Appeler le serveur' : 'Call Waiter'}
      >
        {/* Pulse animation ring when idle */}
        {state === 'idle' && (
          <span className="absolute inset-0 rounded-full bg-teal-400 animate-ping opacity-75" />
        )}

        {/* Icon content */}
        <div className="relative z-10">
          {state === 'idle' && (
            <HandPlatter
              className="w-7 h-7 text-white transition-transform duration-200 group-hover:scale-110"
              strokeWidth={2.5}
            />
          )}
          {state === 'calling' && (
            <div className="w-7 h-7 border-3 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {state === 'success' && (
            <CheckCircle className="w-7 h-7 text-white animate-in zoom-in duration-200" strokeWidth={2.5} />
          )}
        </div>

        {/* Success message tooltip - positioned above and to the left */}
        {state === 'success' && (
          <div className="absolute bottom-full mb-2 right-0 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg whitespace-nowrap animate-in slide-in-from-bottom-2 duration-200">
            {language === 'fr' ? 'Serveur notifié!' : 'Waiter notified!'}
            <div className="absolute top-full right-4 w-0 h-0 border-8 border-transparent border-t-green-600" />
          </div>
        )}
      </button>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'fr' ? 'Appeler le serveur ?' : 'Call Waiter?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'fr'
                ? `Voulez-vous vraiment appeler le serveur pour la table ${tableNumber}${zone ? ` (${zone})` : ''} ?`
                : `Would you like to call a waiter to Table ${tableNumber}${zone ? ` (${zone})` : ''}?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCallWaiter}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {language === 'fr' ? 'Oui, appeler' : 'Yes, call waiter'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}