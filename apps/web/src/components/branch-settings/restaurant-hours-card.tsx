"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarDays, Clock, Lock, ChevronLeft, Check as CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// Custom Time Picker Component
interface CustomTimePickerProps {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
  id,
  value,
  onChange,
  disabled,
  placeholder
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const hours = value ? value.split(':')[0] : '00'
  const minutes = value ? value.split(':')[1] : '00'

  const handleTimeSelect = (selectedTime: string) => {
    onChange(selectedTime)
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-center text-center font-normal",
            !value && "text-muted-foreground"
          )}
        >
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 z-[100] shadow-lg"
        align="start"
        side="bottom"
        avoidCollisions={true}
        sideOffset={4}
        collisionPadding={10}
        sticky="always"
        style={{ pointerEvents: 'auto', touchAction: 'auto' }}
      >
        <div className="p-3" style={{ touchAction: 'auto' }}>
          <div className="grid grid-cols-2 gap-4">
            {/* Hours */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">Hours</div>
              <div
                className="h-32 w-full rounded border overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                style={{
                  scrollBehavior: 'smooth',
                  overscrollBehavior: 'contain',
                  WebkitOverflowScrolling: 'touch'
                }}
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
              >
                <div className="grid grid-cols-3 gap-1 p-2">
                  {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map((hour) => (
                    <Button
                      key={hour}
                      variant={hours === hour ? "default" : "ghost"}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleTimeSelect(`${hour}:${minutes}`)}
                    >
                      {hour}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Minutes */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">Minutes</div>
              <div
                className="h-32 w-full rounded border overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                style={{
                  scrollBehavior: 'smooth',
                  overscrollBehavior: 'contain',
                  WebkitOverflowScrolling: 'touch'
                }}
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
              >
                <div className="grid grid-cols-2 gap-1 p-2">
                  {['00', '15', '30', '45'].map((minute) => (
                    <Button
                      key={minute}
                      variant={minutes === minute ? "default" : "ghost"}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleTimeSelect(`${hours}:${minute}`)}
                    >
                      {minute}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Types
type RestaurantHoursDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"

interface RestaurantHoursCopy {
  title: string
  subtitle: string
  statusClosed: string
  statusOpen: string
  closedToggleAria: string
  workingDaysLabel: string
  defaultHoursLabel: string
  openLabel: string
  closeLabel: string
  dayLabels: Record<RestaurantHoursDay, string>
  dayInitials: Record<RestaurantHoursDay, string>
}

interface MigratedHours {
  isOpen: boolean
  mode: 'simple' | 'advanced'
  simpleSchedule: {
    workingDays: string[]
    defaultHours: {
      openTime: string
      closeTime: string
    }
  }
  advancedSchedule: {
    [key: string]: {
      enabled: boolean
      openTime: string
      closeTime: string
    }
  }
}

interface RestaurantHoursCardProps {
  migratedHours: MigratedHours | null
  currentMode: 'simple' | 'advanced'
  restaurantClosed: boolean
  selectedWorkingDays: string[]
  openTime: string
  closeTime: string
  showCustomSchedule: boolean
  language: 'en' | 'fr'
  translations: RestaurantHoursCopy
  onRestaurantClosedToggle: (value: boolean) => void
  onWorkingDayToggle: (day: RestaurantHoursDay) => void
  onOpenTimeChange: (time: string) => void
  onCloseTimeChange: (time: string) => void
  onModeSwitch: () => void
  onShowCustomScheduleChange: (show: boolean) => void
  onUpdateSettings: (settings: Record<string, unknown>) => void
}

export function RestaurantHoursCard({
  migratedHours,
  currentMode,
  restaurantClosed,
  selectedWorkingDays,
  openTime,
  closeTime,
  showCustomSchedule,
  language,
  translations,
  onRestaurantClosedToggle,
  onWorkingDayToggle,
  onOpenTimeChange,
  onCloseTimeChange,
  onModeSwitch,
  onShowCustomScheduleChange,
  onUpdateSettings
}: RestaurantHoursCardProps) {
  const workingDayOrder: RestaurantHoursDay[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

  return (
    <>
      <Card className="h-full border border-purple-100 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm">{translations.title}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {translations.subtitle}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "flex items-center gap-2 text-xs font-semibold border px-3 py-1.5",
                !restaurantClosed
                  ? "bg-emerald-50 text-emerald-600 border-emerald-400"
                  : "bg-rose-50 text-rose-600 border-rose-200"
              )}
            >
              {!restaurantClosed ? translations.statusOpen : translations.statusClosed}
              <Switch
                aria-label={translations.closedToggleAria}
                checked={!restaurantClosed}
                onCheckedChange={(checked) => onRestaurantClosedToggle(!checked)}
                className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-rose-500 scale-75"
              />
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="flex-1 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {translations.workingDaysLabel}
                {currentMode === 'advanced' && (
                  <span className="ml-2 text-purple-600 font-normal">
                    ({language === 'fr' ? 'Mode avancé' : 'Advanced Mode'})
                  </span>
                )}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {workingDayOrder.map((day) => {
                  const isSelected = selectedWorkingDays.includes(day);
                  const daySchedule = currentMode === 'advanced' ? migratedHours?.advancedSchedule?.[day] : null;
                  const hasDifferentHours = daySchedule &&
                    (daySchedule.openTime !== (migratedHours?.simpleSchedule?.defaultHours?.openTime || '09:00') ||
                     daySchedule.closeTime !== (migratedHours?.simpleSchedule?.defaultHours?.closeTime || '22:00'));

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => onWorkingDayToggle(day)}
                      className={cn(
                        "flex items-center gap-2 rounded-full border px-2.5 py-1 text-sm transition-colors relative",
                        isSelected
                          ? currentMode === 'advanced' && hasDifferentHours
                            ? "border-purple-200 bg-purple-50 text-purple-600 shadow-sm"
                            : "border-orange-200 bg-orange-50 text-orange-600 shadow-sm"
                          : "border-muted-foreground/20 text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold",
                          isSelected
                            ? currentMode === 'advanced' && hasDifferentHours
                              ? "border-purple-200 bg-purple-500 text-white shadow-sm"
                              : "border-orange-200 bg-orange-500 text-white shadow-sm"
                            : "border-muted-foreground/20 text-muted-foreground"
                        )}
                      >
                        {isSelected ? <CheckIcon className="h-3 w-3" /> : translations.dayInitials[day]}
                      </span>
                      <span>{translations.dayLabels[day]}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="hidden lg:block w-px bg-border self-stretch mx-6"></div>
            <Separator orientation="horizontal" className="block lg:hidden" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {translations.defaultHoursLabel}
                </p>
                {currentMode === 'advanced' && (
                  <span className="text-xs text-purple-600 font-medium">
                    <Lock className="inline-block h-3 w-3 mr-1" />
                    {language === 'fr' ? 'Mode avancé actif' : 'Advanced mode active'}
                  </span>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="restaurant-hours-open" className={cn(
                    "text-xs font-medium",
                    currentMode === 'advanced' && "text-muted-foreground"
                  )}>
                    {translations.openLabel}
                  </Label>
                  <div className="relative">
                    <Clock className={cn(
                      "absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2",
                      currentMode === 'advanced' ? "text-muted-foreground/50" : "text-muted-foreground"
                    )} />
                    <CustomTimePicker
                      id="restaurant-hours-open"
                      value={openTime}
                      onChange={onOpenTimeChange}
                      placeholder="Select time"
                      disabled={currentMode === 'advanced'}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="restaurant-hours-close" className={cn(
                    "text-xs font-medium",
                    currentMode === 'advanced' && "text-muted-foreground"
                  )}>
                    {translations.closeLabel}
                  </Label>
                  <div className="relative">
                    <Clock className={cn(
                      "absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2",
                      currentMode === 'advanced' ? "text-muted-foreground/50" : "text-muted-foreground"
                    )} />
                    <CustomTimePicker
                      id="restaurant-hours-close"
                      value={closeTime}
                      onChange={onCloseTimeChange}
                      placeholder="Select time"
                      disabled={currentMode === 'advanced'}
                    />
                  </div>
                </div>
              </div>

              {/* Advance Settings Button */}
              <div className="pt-3 border-t border-gray-200 mt-4">
                <div className="pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-full text-xs transition-all duration-200",
                      currentMode === 'advanced'
                        ? "border border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-300 text-purple-700"
                        : "border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300"
                    )}
                    onClick={() => onShowCustomScheduleChange(true)}
                  >
                    <Clock className="h-3 w-3 mr-1.5" />
                    {language === 'fr' ? 'Paramètres avancés' : 'Advance Settings'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Schedule Modal */}
      <Dialog open={showCustomSchedule} onOpenChange={onShowCustomScheduleChange}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col"
          onPointerDownOutside={(e) => {
            const target = e.target as Element
            const isPopover = target?.closest('[data-radix-popper-content-wrapper]')
            if (!isPopover) {
              onShowCustomScheduleChange(false)
            }
          }}
        >
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-gray-50 rounded-lg">
                <Clock className="h-5 w-5 text-gray-600" />
              </div>
              {language === 'fr' ? 'Paramètres avancés' : 'Advance Settings'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 min-h-0 flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-2">
                {workingDayOrder.map((day) => {
                  const daySchedule = migratedHours?.advancedSchedule?.[day] || {
                    enabled: selectedWorkingDays.includes(day),
                    openTime: '09:00',
                    closeTime: '22:00'
                  };

                  const handleDayToggle = () => {
                    if (!migratedHours) return;
                    const newSchedule = {
                      ...migratedHours.advancedSchedule,
                      [day]: {
                        ...daySchedule,
                        enabled: !daySchedule.enabled
                      }
                    };

                    onUpdateSettings({
                      restaurantHours: {
                        ...migratedHours,
                        advancedSchedule: newSchedule
                      }
                    });
                  };

                  const handleDayOpenTimeChange = (newOpenTime: string) => {
                    if (!migratedHours) return;
                    const newSchedule = {
                      ...migratedHours.advancedSchedule,
                      [day]: {
                        ...daySchedule,
                        openTime: newOpenTime
                      }
                    };

                    onUpdateSettings({
                      restaurantHours: {
                        ...migratedHours,
                        advancedSchedule: newSchedule
                      }
                    });
                  };

                  const handleDayCloseTimeChange = (newCloseTime: string) => {
                    if (!migratedHours) return;
                    const newSchedule = {
                      ...migratedHours.advancedSchedule,
                      [day]: {
                        ...daySchedule,
                        closeTime: newCloseTime
                      }
                    };

                    onUpdateSettings({
                      restaurantHours: {
                        ...migratedHours,
                        advancedSchedule: newSchedule
                      }
                    });
                  };

                  return (
                    <div key={day} className={cn(
                      "border rounded-lg p-4 space-y-4 transition-colors",
                      daySchedule.enabled
                        ? "border-gray-200 bg-gray-50"
                        : "border-gray-200 bg-gray-50"
                    )}>
                      {/* Day Header */}
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">
                          {translations.dayLabels[day]}
                        </div>
                        <Switch
                          checked={daySchedule.enabled}
                          onCheckedChange={handleDayToggle}
                          className="scale-75"
                        />
                      </div>

                      {/* Time Settings */}
                      {daySchedule.enabled ? (
                        <div className="space-y-3">
                          {/* Time Pickers Row */}
                          <div className="grid grid-cols-2 gap-2">
                            {/* Open Time */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-muted-foreground">
                                {language === 'fr' ? 'Ouverture' : 'Open'}
                              </label>
                              <CustomTimePicker
                                id={`${day}-open`}
                                value={daySchedule.openTime}
                                onChange={handleDayOpenTimeChange}
                                placeholder="09:00"
                              />
                            </div>

                            {/* Close Time */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-muted-foreground">
                                {language === 'fr' ? 'Fermeture' : 'Close'}
                              </label>
                              <CustomTimePicker
                                id={`${day}-close`}
                                value={daySchedule.closeTime}
                                onChange={handleDayCloseTimeChange}
                                placeholder="22:00"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center pt-4 text-muted-foreground">
                          <div className="text-center">
                            <Lock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                            <div className="text-xs">
                              {language === 'fr' ? 'Fermé' : 'Closed'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t mt-6 flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                className="border border-gray-200 hover:bg-gray-50 sm:order-1"
                onClick={() => {
                  onModeSwitch();
                  onShowCustomScheduleChange(false);
                }}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {language === 'fr' ? 'Retour au mode simple' : 'Back to Simple Mode'}
              </Button>

              <div className="flex gap-2 sm:order-2 flex-1 sm:flex-none">
                <Button
                  variant="outline"
                  onClick={() => onShowCustomScheduleChange(false)}
                  className="flex-1 sm:flex-none"
                >
                  {language === 'fr' ? 'Annuler' : 'Cancel'}
                </Button>
                <Button
                  onClick={() => {
                    if (currentMode === 'simple') {
                      onModeSwitch();
                    }
                    onShowCustomScheduleChange(false);
                  }}
                  className="flex-1 sm:flex-none"
                >
                  {currentMode === 'simple'
                    ? (language === 'fr' ? 'Activer le mode avancé' : 'Enable Advanced Mode')
                    : (language === 'fr' ? 'Appliquer les modifications' : 'Apply Changes')
                  }
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
