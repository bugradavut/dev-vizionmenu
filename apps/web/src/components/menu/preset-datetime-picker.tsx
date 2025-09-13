"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useLanguage } from '@/contexts/language-context'

interface PresetDateTimePickerProps {
  selected?: Date
  onSelect: (date: Date | undefined) => void
  onConfirm: (date: Date) => void
  onCancel: () => void
  title?: string
  placeholder?: string
  disabled?: boolean
  compact?: boolean
}

export function PresetDateTimePicker({ 
  selected, 
  onSelect, 
  onConfirm, 
  onCancel, 
  title,
  placeholder,
  disabled = false,
  compact = false
}: PresetDateTimePickerProps) {
  const { language } = useLanguage()
  const [selectedTime, setSelectedTime] = React.useState<string | null>(
    selected ? `${selected.getHours().toString().padStart(2, "0")}:${selected.getMinutes().toString().padStart(2, "0")}` : null
  )
  
  // Generate time slots every 15 minutes from 00:00 to 23:45
  const timeSlots = Array.from({ length: 96 }, (_, i) => {
    const totalMinutes = i * 15
    const hour = Math.floor(totalMinutes / 60)
    const minute = totalMinutes % 60
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
  })

  const handleConfirm = () => {
    if (selected && selectedTime) {
      const [hours, minutes] = selectedTime.split(':').map(Number)
      const dateTime = new Date(selected)
      dateTime.setHours(hours, minutes, 0, 0)
      onConfirm(dateTime)
    }
  }

  // Manual confirm when time is selected in compact mode
  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    // Remove auto-confirm to prevent unnecessary re-renders
  }

  React.useEffect(() => {
    if (selected && !selectedTime) {
      setSelectedTime(`${selected.getHours().toString().padStart(2, "0")}:${selected.getMinutes().toString().padStart(2, "0")}`)
    }
  }, [selected, selectedTime])

  return (
    <Card className={`gap-0 p-0 w-full ${compact ? 'max-w-full' : 'max-w-2xl'}`}>
      <CardContent className={`relative p-0 ${compact ? 'pr-40' : 'md:pr-48'}`}>
        {/* Calendar Section */}
        <div className={compact ? "p-3" : "p-6"}>
          {title && !compact && (
            <h3 className="text-lg font-semibold mb-4">{title}</h3>
          )}
          <Calendar
            mode="single"
            selected={selected}
            onSelect={onSelect}
            defaultMonth={selected || new Date()}
            disabled={(date) => 
              disabled || date < new Date(new Date().setHours(0, 0, 0, 0))
            }
            showOutsideDays={false}
            className={`bg-transparent p-0 ${compact ? '[--cell-size:1.75rem]' : '[--cell-size:2.5rem] md:[--cell-size:3rem]'}`}
            formatters={{
              formatWeekdayName: (date) => {
                return date.toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US', { weekday: "short" })
              },
            }}
          />
        </div>

        {/* Time Selection Section - Always on the right side */}
        <div className={`absolute inset-y-0 right-0 flex w-40 flex-col gap-2 border-l ${compact ? 'p-3' : 'p-6'}`}>
          <div className={`font-medium text-center ${compact ? 'text-xs mb-1' : 'text-sm mb-2'}`}>
            {language === 'fr' ? 'Heure' : 'Time'}
          </div>
          <ScrollArea 
            className={compact ? 'h-full' : 'h-64'}
            onWheel={(e) => {
              e.stopPropagation()
              const target = e.currentTarget.querySelector('[data-radix-scroll-area-viewport]')
              if (target) {
                target.scrollTop += e.deltaY
              }
            }}
          >
            <div className="grid gap-1 p-1">
              {timeSlots.map((time) => (
                <Button
                  key={time}
                  type="button"
                  variant={selectedTime === time ? "default" : "outline"}
                  onClick={() => handleTimeSelect(time)}
                  className={`w-full shadow-none ${compact ? 'text-xs h-7 px-1' : 'text-sm'}`}
                  size="sm"
                >
                  {time}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
      {!compact && (
        <CardFooter className="flex flex-col gap-4 border-t !py-4 px-6 md:flex-row">
          <div className="text-sm flex-1">
            {selected && selectedTime ? (
              <>
                {language === 'fr' ? 'Sélectionné pour' : 'Selected for'}{" "}
                <span className="font-medium">
                  {selected?.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
                </span>
                {language === 'fr' ? ' à ' : ' at '} 
                <span className="font-medium">{selectedTime}</span>.
              </>
            ) : (
              <>{placeholder || (language === 'fr' ? 'Sélectionnez une date et une heure.' : 'Select a date and time.')}</>
            )}
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              className="flex-1 md:flex-none"
            >
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </Button>
            <Button
              type="button"
              disabled={!selected || !selectedTime}
              onClick={handleConfirm}
              className="flex-1 md:flex-none"
            >
              {language === 'fr' ? 'Confirmer' : 'Confirm'}
            </Button>
          </div>
        </CardFooter>
      )}
      {compact && selected && selectedTime && (
        <div className="px-3 pb-2">
          <div className="text-xs text-muted-foreground text-center">
            <span className="font-medium">
              {selected?.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
                day: "numeric",
                month: "short",
                year: "2-digit"
              })}
            </span>
            {language === 'fr' ? ' à ' : ' at '} 
            <span className="font-medium">{selectedTime}</span>
          </div>
        </div>
      )}
    </Card>
  )
}