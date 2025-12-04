"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ShoppingBag, Clock, Check as CheckIcon } from "lucide-react"
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
type PickupHoursDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"

interface PickupHoursCopy {
  title: string
  subtitle: string
  statusClosed: string
  statusOpen: string
  closedToggleAria: string
  workingDaysLabel: string
  defaultHoursLabel: string
  openLabel: string
  closeLabel: string
  dayLabels: Record<PickupHoursDay, string>
  dayInitials: Record<PickupHoursDay, string>
}

interface MigratedHours {
  isOpen: boolean
  simpleSchedule: {
    workingDays: string[]
    defaultHours: {
      openTime: string
      closeTime: string
    }
  }
}

interface PickupHoursCardProps {
  migratedHours: MigratedHours | null
  pickupClosed: boolean
  selectedWorkingDays: string[]
  openTime: string
  closeTime: string
  language: 'en' | 'fr'
  translations: PickupHoursCopy
  onPickupClosedToggle: (value: boolean) => void
  onWorkingDayToggle: (day: PickupHoursDay) => void
  onOpenTimeChange: (time: string) => void
  onCloseTimeChange: (time: string) => void
}

export function PickupHoursCard({
  migratedHours,
  pickupClosed,
  selectedWorkingDays,
  openTime,
  closeTime,
  language,
  translations,
  onPickupClosedToggle,
  onWorkingDayToggle,
  onOpenTimeChange,
  onCloseTimeChange,
}: PickupHoursCardProps) {
  const workingDayOrder: PickupHoursDay[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

  return (
    <Card className="h-full border border-green-100 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
                <ShoppingBag className="h-4 w-4" />
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
                !pickupClosed
                  ? "bg-emerald-50 text-emerald-600 border-emerald-400"
                  : "bg-rose-50 text-rose-600 border-rose-200"
              )}
            >
              {!pickupClosed ? translations.statusOpen : translations.statusClosed}
              <Switch
                aria-label={translations.closedToggleAria}
                checked={!pickupClosed}
                onCheckedChange={(checked) => onPickupClosedToggle(!checked)}
                className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-rose-500 scale-75"
              />
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Working Days Section */}
            <div className="flex-1 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {translations.workingDaysLabel}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {workingDayOrder.map((day) => {
                  const isSelected = selectedWorkingDays.includes(day);

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => onWorkingDayToggle(day)}
                      className={cn(
                        "flex items-center gap-2 rounded-full border px-2.5 py-1 text-sm transition-colors relative",
                        isSelected
                          ? "border-orange-200 bg-orange-50 text-orange-600 shadow-sm"
                          : "border-muted-foreground/20 text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold",
                          isSelected
                            ? "border-orange-200 bg-orange-500 text-white shadow-sm"
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

            {/* Hours Section */}
            <div className="flex-1 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {translations.defaultHoursLabel}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pickup-hours-open" className="text-xs font-medium">
                    {translations.openLabel}
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <CustomTimePicker
                      id="pickup-hours-open"
                      value={openTime}
                      onChange={onOpenTimeChange}
                      placeholder="Select time"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pickup-hours-close" className="text-xs font-medium">
                    {translations.closeLabel}
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <CustomTimePicker
                      id="pickup-hours-close"
                      value={closeTime}
                      onChange={onCloseTimeChange}
                      placeholder="Select time"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
  )
}
