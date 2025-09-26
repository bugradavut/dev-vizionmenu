"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { MapPin } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { DeliveryZonesMap } from "./delivery-zones-map"
import { MapErrorBoundary } from "./map-error-boundary"
import type { DeliveryZone, DeliveryZonesData } from "@/services/branch-settings.service"

interface DeliveryZonesCardProps {
  value?: DeliveryZonesData
  onChange?: (value: DeliveryZonesData) => void
}

export function DeliveryZonesCard({ value, onChange }: DeliveryZonesCardProps) {
  const { language } = useLanguage()
  const [showMap, setShowMap] = useState(false)
  const [mapKey, setMapKey] = useState(0)

  const deliveryZones = value || { enabled: false, zones: [] }

  const handleEnabledChange = (enabled: boolean) => {
    onChange?.({
      ...deliveryZones,
      enabled
    })

    // Auto-open map when enabling delivery zones
    if (enabled) {
      setShowMap(true)
      setMapKey(k => k + 1) // Force fresh map instance
    } else {
      setShowMap(false)
    }
  }


  const handleZoneAdd = (polygon: [number, number][]) => {
    const newZone: DeliveryZone = {
      id: `zone_${Date.now()}`,
      name: `Zone ${deliveryZones.zones.length + 1}`,
      polygon,
      active: true
    }

    onChange?.({
      ...deliveryZones,
      zones: [...deliveryZones.zones, newZone]
    })
  }


  return (
    <Card className="border border-purple-100 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <MapPin className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-base">
                {language === 'fr' ? 'Zones de livraison' : 'Delivery Zones'}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'fr'
                  ? 'Cliquez pour ouvrir la carte et dessiner des zones'
                  : 'Click to open map and draw zones'
                }
              </p>
            </div>
          </div>
          <Switch
            checked={deliveryZones.enabled}
            onCheckedChange={handleEnabledChange}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {deliveryZones.enabled ? (
          <>
            {/* Map Component */}
            {showMap && (
              <div className="border rounded-lg overflow-hidden">
                <MapErrorBoundary>
                  <DeliveryZonesMap
                    key={`map-${mapKey}`}
                    zones={deliveryZones.zones}
                    onZoneAdd={handleZoneAdd}
                    height="400px"
                  />
                </MapErrorBoundary>
              </div>
            )}

          </>
        ) : null}
      </CardContent>

    </Card>
  )
}