"use client"

import { useMemo } from 'react'
import { Check, X } from 'lucide-react'
import type { RestaurantHours } from '@/utils/restaurant-hours'
import { getWeeklySchedule, getDayLabel, getCurrentDay, formatTime } from '@/utils/restaurant-hours'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface WeeklyHoursDisplayProps {
  restaurantHours: RestaurantHours
  language: 'en' | 'fr'
  highlightCurrentDay?: boolean
  variant?: 'default' | 'compact'
}

export function WeeklyHoursDisplay({
  restaurantHours,
  language,
  highlightCurrentDay = true,
  variant = 'default'
}: WeeklyHoursDisplayProps) {
  // Get weekly schedule and current day
  const weeklySchedule = useMemo(
    () => getWeeklySchedule(restaurantHours),
    [restaurantHours]
  )
  const currentDay = useMemo(() => getCurrentDay(), [])

  // Translations
  const translations = {
    sectionTitle: language === 'fr' ? 'Nos heures de service' : 'Our Business Hours',
    closed: language === 'fr' ? 'Fermé' : 'Closed',
    today: language === 'fr' ? "Aujourd'hui" : 'Today',
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/30 dark:to-gray-800/30 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-4 shadow-sm">
      {/* Weekly Schedule List with Scroll */}
      <div className="max-h-[280px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300/40 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-gray-600/30">
        <div className="space-y-2 px-0.5">
          {weeklySchedule.map(({ day, isOpen, hours }) => {
            const isCurrentDay = highlightCurrentDay && day === currentDay
            const dayLabel = getDayLabel(day, language, 'short')

            return (
              <div
                key={day}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200",
                  "border",
                  isCurrentDay
                    ? "bg-gray-100 dark:bg-gray-800/60 border-gray-300 dark:border-gray-600 shadow-sm"
                    : isOpen
                    ? "bg-white/60 dark:bg-gray-900/30 border-gray-200/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-900/50"
                    : "bg-gray-50/50 dark:bg-gray-900/20 border-gray-200/50 dark:border-gray-700/50"
                )}
              >
                {/* Left Side: Day + Status Icon */}
                <div className="flex items-center gap-2.5">
                  {/* Status Icon */}
                  <div className={cn(
                    "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center",
                    isOpen
                      ? "bg-emerald-100 dark:bg-emerald-900/40"
                      : "bg-red-100 dark:bg-red-900/40"
                  )}>
                    {isOpen ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-red-600 dark:text-red-400 stroke-[3]" />
                    )}
                  </div>

                  {/* Day Label */}
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-semibold text-sm",
                      isCurrentDay
                        ? "text-gray-900 dark:text-gray-100"
                        : "text-gray-700 dark:text-gray-300"
                    )}>
                      {dayLabel}
                    </span>

                    {/* Today Badge */}
                    {isCurrentDay && (
                      <Badge
                        variant="outline"
                        className="h-5 px-1.5 text-[10px] font-medium bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                      >
                        {translations.today}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Right Side: Hours or Closed */}
                <div>
                  {isOpen && hours ? (
                    <span className={cn(
                      "text-sm font-medium tabular-nums",
                      isCurrentDay
                        ? "text-gray-900 dark:text-gray-100"
                        : "text-gray-600 dark:text-gray-400"
                    )}>
                      {formatTime(hours.openTime)} - {formatTime(hours.closeTime)}
                    </span>
                  ) : (
                    <Badge
                      variant="outline"
                      className="h-6 px-2 text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                    >
                      {translations.closed}
                    </Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
