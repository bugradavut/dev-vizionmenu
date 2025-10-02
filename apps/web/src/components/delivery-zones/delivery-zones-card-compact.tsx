"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MapPin, Settings2, CheckCircle, AlertCircle } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/translations"
import { DeliveryZonesMap } from "./delivery-zones-map"
import { MapErrorBoundary } from "./map-error-boundary"
import type { DeliveryZone, DeliveryZonesData } from "@/services/branch-settings.service"

interface DeliveryZonesCardCompactProps {
  value?: DeliveryZonesData
  onChange?: (value: DeliveryZonesData) => void
}

export function DeliveryZonesCardCompact({ value, onChange }: DeliveryZonesCardCompactProps) {
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [mapKey, setMapKey] = useState(0)
  const [shouldRenderMap, setShouldRenderMap] = useState(false)

  const deliveryZones = value || { enabled: false, zones: [] }
  const zoneCount = deliveryZones.zones.length

  // Delay map rendering until modal is fully open
  React.useEffect(() => {
    if (isModalOpen) {
      // Wait for modal animation to complete
      const timer = setTimeout(() => {
        setShouldRenderMap(true)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setShouldRenderMap(false)
    }
  }, [isModalOpen])

  const handleEnabledChange = (enabled: boolean) => {
    onChange?.({
      ...deliveryZones,
      enabled
    })

    // Auto-open modal when enabling delivery zones
    if (enabled && deliveryZones.zones.length === 0) {
      setIsModalOpen(true)
      setMapKey(k => k + 1)
    }
  }

  const handleConfigureClick = () => {
    setIsModalOpen(true)
    setMapKey(k => k + 1) // Force fresh map instance
  }

  const handleZoneAdd = (polygon: [number, number][]) => {
    const newZone: DeliveryZone = {
      id: `zone_${Date.now()}`,
      name: `Zone ${deliveryZones.zones.length + 1}`,
      polygon,
      active: true
    }

    const updatedZones = {
      ...deliveryZones,
      zones: [...deliveryZones.zones, newZone]
    }

    onChange?.(updatedZones)
  }

  const handleZoneDelete = (deletedZoneIds: string[]) => {
    const remainingZones = deliveryZones.zones.filter(
      zone => !deletedZoneIds.includes(zone.id)
    )

    const updatedZones = {
      ...deliveryZones,
      zones: remainingZones
    }

    onChange?.(updatedZones)
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 bg-purple-50 rounded-lg">
                <MapPin className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base">
                  {t.settingsBranch.deliveryZones}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.settingsBranch.deliveryZonesDesc}
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 pt-1">
              <Switch
                checked={deliveryZones.enabled}
                onCheckedChange={handleEnabledChange}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {deliveryZones.enabled ? (
            <div className="space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 text-sm mb-2">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">
                    {t.settingsBranch.zonesEnabled}
                  </span>
                </div>
                {zoneCount === 0 && (
                  <p className="text-xs text-green-600">
                    {t.settingsBranch.clickToDrawZones}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleConfigureClick}
                className="w-full"
              >
                <Settings2 className="h-4 w-4 mr-2" />
                {t.settingsBranch.configureZones}
              </Button>
            </div>
          ) : (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">
                  {t.settingsBranch.zonesDisabled}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {language === 'fr'
                  ? 'Les zones de livraison ne sont pas utilisées. Activez pour définir des zones.'
                  : 'Delivery zones are not in use. Enable to define zones.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configure Zones Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>
              {t.settingsBranch.configureZones}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {shouldRenderMap ? (
              <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
                <MapErrorBoundary>
                  <DeliveryZonesMap
                    key={`modal-map-${mapKey}`}
                    zones={deliveryZones.zones}
                    onZoneAdd={handleZoneAdd}
                    onZoneDelete={handleZoneDelete}
                    height="600px"
                  />
                </MapErrorBoundary>
              </div>
            ) : (
              <div className="flex items-center justify-center border rounded-lg" style={{ height: '600px' }}>
                <div className="text-muted-foreground">
                  {language === 'fr' ? 'Chargement de la carte...' : 'Loading map...'}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
