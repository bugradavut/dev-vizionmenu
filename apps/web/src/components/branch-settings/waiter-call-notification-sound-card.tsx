"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HandPlatter, Volume2 } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/translations"
import { NOTIFICATION_SOUNDS, getSoundPath } from "@/lib/notification-sounds"
import { useNotificationSound } from "@/hooks/use-notification-sound"

interface WaiterCallNotificationSoundCardProps {
  waiterCallSound: string
  onWaiterCallSoundChange: (sound: string) => void
}

export function WaiterCallNotificationSoundCard({
  waiterCallSound,
  onWaiterCallSoundChange
}: WaiterCallNotificationSoundCardProps) {
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  const soundT = t.settingsBranch.notificationSounds

  const [testing, setTesting] = useState(false)

  // Sound hook for testing
  const { playSound } = useNotificationSound({
    soundUrl: getSoundPath(waiterCallSound),
    enabled: true,
    fallbackToBeep: false
  })

  // Test sound
  const handleTestSound = async () => {
    setTesting(true)
    try {
      await playSound()
    } catch (error) {
      console.error('Failed to play waiter call sound:', error)
    } finally {
      setTimeout(() => setTesting(false), 1000)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-50 rounded-lg">
            <HandPlatter className="h-5 w-5 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{soundT.waiterCallNotifications}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {soundT.waiterCallNotificationsDesc}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            {soundT.selectSound}
          </label>
          <div className="flex gap-2 items-center">
            <Select value={waiterCallSound} onValueChange={onWaiterCallSoundChange}>
              <SelectTrigger className="flex-1 h-9">
                <SelectValue placeholder={soundT.selectSound} />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_SOUNDS.map((sound) => (
                  <SelectItem key={sound.id} value={sound.fileName}>
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-3 w-3" />
                      <span>{language === 'fr' ? sound.nameFr : sound.nameEn}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={handleTestSound}
              disabled={testing}
              className="shrink-0 h-9 w-9"
              title={soundT.testSound}
            >
              {testing ? (
                <Volume2 className="h-4 w-4 animate-pulse" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
