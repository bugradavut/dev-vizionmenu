"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Clock, AlertTriangle, ClockPlus } from 'lucide-react'
import { ordersService, type UpdateTimingResponse } from '@/services/orders.service'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/contexts/language-context'

interface OrderTimingButtonProps {
  orderId: string
  currentAdjustment?: number
  orderStatus: string
  onUpdate?: () => void
  className?: string
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'secondary'
  showAdjustment?: boolean
}

export function OrderTimingButton({
  orderId,
  currentAdjustment = 0,
  orderStatus,
  onUpdate,
  className = '',
  size = 'sm',
  variant = 'outline',
  showAdjustment = true
}: OrderTimingButtonProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()
  const { language } = useLanguage()

  // Only show for active orders
  const validStatuses = ['preparing', 'confirmed']
  if (!validStatuses.includes(orderStatus)) {
    return null
  }

  const handleAddTime = async (minutes: number) => {
    if (isUpdating) return

    setIsUpdating(true)
    try {
      const result: UpdateTimingResponse = await ordersService.updateOrderTiming(orderId, minutes)
      
      // Success toast
      toast({
        title: language === 'fr' ? 'Temps ajusté' : 'Time Adjusted',
        description: result.message,
        duration: 3000,
      })

      // Trigger refresh callback
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Failed to update order timing:', error)
      
      // Error toast
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: error instanceof Error ? error.message : (language === 'fr' ? 'Impossible de mettre à jour le temps' : 'Failed to update timing'),
        variant: 'destructive',
        duration: 5000,
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Current Adjustment Badge */}
      {showAdjustment && currentAdjustment !== 0 && (
        <Badge 
          variant="secondary" 
          className={`text-xs ${currentAdjustment > 0 ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}
        >
          <Clock className="h-3 w-3 mr-1" />
          {currentAdjustment > 0 ? '+' : ''}{currentAdjustment}min
        </Badge>
      )}

      {/* +5 Min Button */}
      <Button
        size={size}
        variant={variant}
        onClick={() => handleAddTime(5)}
        disabled={isUpdating}
        className="h-8 px-3 text-xs font-medium"
        title={language === 'fr' ? 'Ajouter 5 minutes' : 'Add 5 minutes'}
      >
        {isUpdating ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <>
            <ClockPlus className="h-3 w-3 mr-1" />
            5min
          </>
        )}
      </Button>

      {/* Optional: Add more timing buttons */}
      {size !== 'sm' && (
        <>
          {/* +10 Min Button (for larger sizes) */}
          <Button
            size={size}
            variant="outline"
            onClick={() => handleAddTime(10)}
            disabled={isUpdating}
            className="h-8 px-3 text-xs font-medium text-orange-600 border-orange-200 hover:bg-orange-50"
            title={language === 'fr' ? 'Ajouter 10 minutes' : 'Add 10 minutes'}
          >
            {isUpdating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <ClockPlus className="h-3 w-3 mr-1" />
                10min
              </>
            )}
          </Button>

          {/* -5 Min Button (reduce time if needed) */}
          {currentAdjustment > 0 && (
            <Button
              size={size}
              variant="outline"
              onClick={() => handleAddTime(-5)}
              disabled={isUpdating}
              className="h-8 px-3 text-xs font-medium text-green-600 border-green-200 hover:bg-green-50"
              title={language === 'fr' ? 'Réduire 5 minutes' : 'Reduce 5 minutes'}
            >
              {isUpdating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  -5min
                </>
              )}
            </Button>
          )}
        </>
      )}
    </div>
  )
}