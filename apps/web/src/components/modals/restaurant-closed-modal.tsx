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
import { WeeklyHoursDisplay } from '@/components/modals/weekly-hours-display'

interface RestaurantClosedModalProps {
  isOpen: boolean
  onClose: () => void
  onScheduleOrder?: () => void
  restaurantHours?: RestaurantHours
  isBusy?: boolean
}

export function RestaurantClosedModal({
  isOpen,
  onClose,
  onScheduleOrder,
  restaurantHours,
  isBusy = false
}: RestaurantClosedModalProps) {
  const { language } = useLanguage()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center border border-red-200 dark:border-red-800 flex-shrink-0">
              <Clock className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>

            <div className="flex-1 text-left">
              <DialogTitle className="text-xl font-semibold text-foreground mb-1 text-left">
                {isBusy
                  ? (language === 'fr' ? 'Temporairement indisponible' : 'Temporarily Unavailable')
                  : (language === 'fr' ? 'Restaurant fermé' : 'Restaurant Closed')
                }
              </DialogTitle>
              <p className="text-muted-foreground text-sm">
                {isBusy
                  ? (language === 'fr'
                    ? 'Nous ne acceptons pas de nouvelles commandes pour le moment.'
                    : 'We are not accepting new orders at this time.')
                  : (language === 'fr'
                    ? 'Nos heures d\'ouverture sont:'
                    : 'Our opening hours are:')
                }
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Opening Hours or Back Soon Message */}
          {isBusy ? (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-orange-900 dark:text-orange-300">
                  {language === 'fr' ? 'Nous reviendrons bientôt' : 'We will come back soon'}
                </p>
                <p className="text-orange-700 dark:text-orange-400 text-sm">
                  {language === 'fr'
                    ? 'Merci pour votre patience.'
                    : 'Thank you for your patience.'
                  }
                </p>
              </div>
            </div>
          ) : (
            restaurantHours && (
              <WeeklyHoursDisplay
                restaurantHours={restaurantHours}
                language={language}
                highlightCurrentDay={true}
              />
            )
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
