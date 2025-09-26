"use client"

import { Clock } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import type { RestaurantHours } from '@/utils/restaurant-hours'
import { migrateRestaurantHours } from '@/utils/restaurant-hours'
import { getCurrentCanadaEasternTime } from '@/lib/timezone'
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
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center border border-red-200 dark:border-red-800 flex-shrink-0">
              <Clock className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>

            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold text-foreground mb-1">
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
                    ? 'Les commandes ne sont pas disponibles pour le moment.'
                    : 'Ordering is currently unavailable.')
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
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                    {language === 'fr' ? 'Nos heures de service' : 'Our Business Hours'}
                  </p>
                  <p className="text-blue-700 dark:text-blue-400 font-semibold">
                    {(() => {
                      const migrated = migrateRestaurantHours(restaurantHours);

                      // Simple mode: use default hours
                      if (migrated.mode === 'simple') {
                        return `${migrated.simpleSchedule.defaultHours.openTime} - ${migrated.simpleSchedule.defaultHours.closeTime}`;
                      }

                      // Advanced mode: show today's hours or next working day
                      const today = getCurrentCanadaEasternTime().getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
                      const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                      const todayKey = dayMap[today];

                      // Try to get today's hours first
                      const todaySchedule = migrated.advancedSchedule[todayKey];
                      if (todaySchedule?.enabled) {
                        return `${todaySchedule.openTime} - ${todaySchedule.closeTime} (Today)`;
                      }

                      // If today is closed, show next working day
                      const nextWorkingDay = Object.entries(migrated.advancedSchedule)
                        .find(([, schedule]) => schedule?.enabled);

                      if (nextWorkingDay) {
                        const [, schedule] = nextWorkingDay;
                        return `${schedule.openTime} - ${schedule.closeTime} (General)`;
                      }

                      // Fallback
                      return 'See schedule';
                    })()}
                  </p>
                </div>
              </div>
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
