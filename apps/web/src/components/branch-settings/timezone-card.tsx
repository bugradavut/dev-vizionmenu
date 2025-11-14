"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Globe } from "lucide-react"
import { CANADIAN_TIMEZONES } from "@/lib/timezones"

interface TimezoneCardProps {
  timezone: string
  language: 'en' | 'fr'
  onTimezoneChange: (timezone: string) => void
  translations: {
    title: string
    subtitle: string
    currentTimezone: string
    selectTimezone: string
    description: string
  }
}

export const TimezoneCard: React.FC<TimezoneCardProps> = ({
  timezone,
  language,
  onTimezoneChange,
  translations
}) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-50 rounded-lg">
            <Globe className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <CardTitle className="text-base">
              {translations.title}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {translations.subtitle}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {translations.currentTimezone}
            </label>
            <Select
              value={timezone || 'America/Toronto'}
              onValueChange={onTimezoneChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={translations.selectTimezone} />
              </SelectTrigger>
              <SelectContent>
                {CANADIAN_TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {language === 'fr' ? tz.labelFr : tz.label} ({tz.utcOffset})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            {translations.description}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
