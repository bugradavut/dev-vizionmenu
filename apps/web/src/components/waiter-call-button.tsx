"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { HandPlatter, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { waiterCallsService } from '@/services/waiter-calls.service'
import { useLanguage } from '@/contexts/language-context'
import { cn } from '@/lib/utils'

interface WaiterCallButtonProps {
  branchId: string
  tableNumber: number
  zone?: string
  className?: string
  onHidden?: () => void
  onStateChange?: (state: ButtonState) => void
}

type ButtonState = 'ready' | 'loading' | 'success' | 'cooldown' | 'error' | 'hidden'

export function WaiterCallButton({
  branchId,
  tableNumber,
  zone,
  className,
  onHidden,
  onStateChange
}: WaiterCallButtonProps) {
  const { language } = useLanguage()

  // State management
  const [buttonState, setButtonStateInternal] = useState<ButtonState>('ready')
  const [waitTime, setWaitTime] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  // Wrapper to notify parent of state changes
  const setButtonState = (newState: ButtonState) => {
    setButtonStateInternal(newState)
    onStateChange?.(newState)
  }

  // Countdown timer for cooldown state
  useEffect(() => {
    if (buttonState === 'cooldown' && waitTime > 0) {
      const timer = setInterval(() => {
        setWaitTime(prev => {
          if (prev <= 1) {
            setButtonState('ready')
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [buttonState, waitTime])

  const handleCallWaiter = async () => {
    try {
      setButtonState('loading')
      setErrorMessage('')

      await waiterCallsService.createWaiterCall({
        branch_id: branchId,
        table_number: tableNumber,
        zone
      })

      // Success state
      setButtonState('success')

      // Show success message longer, then hide button completely
      setTimeout(() => {
        setButtonState('hidden')
        onHidden?.() // Notify parent component
      }, 4000) // 4 seconds to ensure user sees the message

    } catch (error: unknown) {
      console.error('Failed to call waiter:', error)

      // Handle rate limit error
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStatus = error && typeof error === 'object' && 'status' in error ? (error as { status: number }).status : null

      if (errorMessage.includes('wait before calling') || errorStatus === 429) {
        setButtonState('cooldown')
        setWaitTime(120) // 2 minutes cooldown
        return
      }

      setButtonState('error')
      setErrorMessage(
        errorMessage ||
        (language === 'fr' ? 'Échec de l\'appel du serveur' : 'Failed to call waiter')
      )

      // Reset to ready after 3 seconds
      setTimeout(() => {
        setButtonState('ready')
        setErrorMessage('')
      }, 3000)
    }
  }

  // Check if this is a floating bubble (circular button)
  const isFloatingBubble = className?.includes('rounded-full')

  // Button content based on state
  const getButtonContent = () => {
    switch (buttonState) {
      case 'loading':
        return {
          icon: <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />,
          text: language === 'fr' ? 'Appel en cours...' : 'Calling waiter...',
          disabled: true,
          variant: 'default' as const,
          className: 'bg-blue-600 hover:bg-blue-600'
        }

      case 'success':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          text: language === 'fr' ? 'Serveur notifié!' : 'Waiter notified!',
          disabled: true,
          variant: 'default' as const,
          className: 'bg-green-500 hover:bg-green-500'
        }

      case 'cooldown':
        return {
          icon: <Clock className="w-5 h-5" />,
          text: language === 'fr'
            ? `Veuillez patienter (${Math.floor(waitTime / 60)}:${(waitTime % 60).toString().padStart(2, '0')})`
            : `Please wait (${Math.floor(waitTime / 60)}:${(waitTime % 60).toString().padStart(2, '0')})`,
          disabled: true,
          variant: 'secondary' as const,
          className: 'bg-gray-400 hover:bg-gray-400 text-gray-700'
        }

      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          text: errorMessage || (language === 'fr' ? 'Erreur - Réessayer' : 'Error - Try again'),
          disabled: false,
          variant: 'destructive' as const,
          className: 'bg-red-600 hover:bg-red-700'
        }

      default: // ready
        return {
          icon: <HandPlatter className="w-5 h-5" style={{ transform: 'scaleX(-1)' }} />,
          text: language === 'fr' ? 'Appeler le serveur' : 'Call waiter',
          disabled: false,
          variant: 'default' as const,
          className: 'bg-teal-500 hover:bg-teal-600'
        }
    }
  }

  const buttonContent = getButtonContent()

  // Hide button completely if in hidden state
  if (buttonState === 'hidden') {
    return null
  }

  return (
    <Button
      onClick={handleCallWaiter}
      disabled={buttonContent.disabled}
      variant={buttonContent.variant}
      className={cn(
        'font-medium shadow-lg transition-all duration-200',
        isFloatingBubble
          ? 'p-0' // No padding for circular floating button
          : 'flex items-center gap-2 min-w-[180px] h-12', // Full width button with text
        buttonContent.className,
        className
      )}
      title={isFloatingBubble ? buttonContent.text : undefined} // Tooltip for floating button
    >
      {buttonContent.icon}
      {!isFloatingBubble && (
        <span className="text-sm">{buttonContent.text}</span>
      )}
    </Button>
  )
}