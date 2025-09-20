"use client"

import { Clock } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import type { RestaurantHours } from '@/utils/restaurant-hours'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface RestaurantClosedModalProps {
  isOpen: boolean
  onClose: () => void
  onScheduleOrder?: () => void
  restaurantHours?: RestaurantHours
}

export function RestaurantClosedModal({
  isOpen,
  onClose,
  onScheduleOrder,
  restaurantHours
}: RestaurantClosedModalProps) {
  const { language } = useLanguage()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center border border-red-200 dark:border-red-800 flex-shrink-0">
              <Clock className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>

            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold text-foreground mb-1">
                {language === 'fr' ? 'Restaurant fermé' : 'Restaurant Closed'}
              </DialogTitle>
              <p className="text-muted-foreground text-sm">
                {language === 'fr'
                  ? 'Les commandes ne sont pas disponibles pour le moment.'
                  : 'Ordering is currently unavailable.'
                }
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Opening Hours */}
          {restaurantHours && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                  {language === 'fr' ? 'Heures d\'ouverture' : 'Opening Hours'}
                </p>
                <p className="text-blue-700 dark:text-blue-400 font-semibold">
                  {restaurantHours.defaultHours.openTime} - {restaurantHours.defaultHours.closeTime}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {onScheduleOrder && (
              <Button
                onClick={onScheduleOrder}
                className="w-full h-11 bg-orange-500 text-white hover:bg-orange-600"
                size="lg"
              >
                {language === 'fr' ? 'Programmer une commande' : 'Schedule Order'}
              </Button>
            )}

            <Button
              onClick={onClose}
              variant="outline"
              className="w-full h-11 border-gray-300 text-gray-700 hover:bg-gray-50"
              size="lg"
            >
              {language === 'fr' ? 'Parcourir le menu' : 'Browse Menu'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
