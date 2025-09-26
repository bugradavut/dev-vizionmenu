'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Truck,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink
} from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

interface CourierInfo {
  name: string
  phone?: string
  location?: any
  estimated_arrival?: string
  updated_at: string
}

interface StatusHistoryEntry {
  status: string
  display_status: string
  timestamp: string
  progress: number
  reason?: string
}

interface UberDeliveryStatusProps {
  uberDeliveryId?: string
  deliveryStatus?: string
  courierInfo?: CourierInfo
  deliveryEta?: string
  statusHistory?: StatusHistoryEntry[]
  trackingUrl?: string
  onRefresh?: () => void
  className?: string
}

export function UberDeliveryStatus({
  uberDeliveryId,
  deliveryStatus,
  courierInfo,
  deliveryEta,
  statusHistory = [],
  trackingUrl,
  onRefresh,
  className
}: UberDeliveryStatusProps) {
  const { language } = useLanguage()
  const [refreshing, setRefreshing] = useState(false)

  const t = {
    deliveryStatus: language === 'fr' ? 'Statut de Livraison' : 'Delivery Status',
    courierInfo: language === 'fr' ? 'Information du Livreur' : 'Courier Information',
    estimatedArrival: language === 'fr' ? 'Arrivée Estimée' : 'Estimated Arrival',
    trackingUrl: language === 'fr' ? 'Suivi en Direct' : 'Live Tracking',
    refresh: language === 'fr' ? 'Actualiser' : 'Refresh',
    noDelivery: language === 'fr' ? 'Aucune livraison Uber Direct' : 'No Uber Direct delivery',
    courierName: language === 'fr' ? 'Nom' : 'Name',
    courierPhone: language === 'fr' ? 'Téléphone' : 'Phone',
    lastUpdate: language === 'fr' ? 'Dernière mise à jour' : 'Last updated',
    progress: language === 'fr' ? 'Progrès' : 'Progress'
  }

  // Get current status info
  const getCurrentStatus = () => {
    if (!deliveryStatus) return { display: t.noDelivery, progress: 0 }

    const statusMapping: Record<string, { display: string, progress: number, color: string }> = {
      'created': {
        display: language === 'fr' ? 'Recherche de livreur...' : 'Finding courier...',
        progress: 10,
        color: 'bg-blue-500'
      },
      'courier_assigned': {
        display: language === 'fr' ? 'Livreur assigné' : 'Courier assigned',
        progress: 25,
        color: 'bg-green-500'
      },
      'courier_en_route_to_pickup': {
        display: language === 'fr' ? 'Livreur en route vers le restaurant' : 'Courier heading to restaurant',
        progress: 40,
        color: 'bg-yellow-500'
      },
      'arrived_at_pickup': {
        display: language === 'fr' ? 'Livreur arrivé au restaurant' : 'Courier arrived at restaurant',
        progress: 55,
        color: 'bg-orange-500'
      },
      'picked_up': {
        display: language === 'fr' ? 'Commande récupérée' : 'Order picked up',
        progress: 70,
        color: 'bg-blue-600'
      },
      'courier_en_route_to_dropoff': {
        display: language === 'fr' ? 'En cours de livraison' : 'Out for delivery',
        progress: 85,
        color: 'bg-purple-500'
      },
      'delivered': {
        display: language === 'fr' ? 'Livré avec succès' : 'Delivered successfully',
        progress: 100,
        color: 'bg-green-600'
      },
      'cancelled': {
        display: language === 'fr' ? 'Livraison annulée' : 'Delivery cancelled',
        progress: 0,
        color: 'bg-red-500'
      }
    }

    return statusMapping[deliveryStatus] || {
      display: deliveryStatus,
      progress: 0,
      color: 'bg-gray-500'
    }
  }

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return

    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    })
  }

  const currentStatus = getCurrentStatus()

  // Don't render if no Uber delivery
  if (!uberDeliveryId) {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">{t.deliveryStatus}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {trackingUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(trackingUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                {t.trackingUrl}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {t.refresh}
                </div>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge
              variant="secondary"
              className={`${currentStatus.color} text-white px-3 py-1`}
            >
              {currentStatus.display}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {currentStatus.progress}%
            </span>
          </div>
          <Progress value={currentStatus.progress} className="w-full" />
        </div>

        {/* Courier Information */}
        {courierInfo && (
          <div className="border rounded-lg p-3 bg-muted/20">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {t.courierInfo}
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.courierName}:</span>
                <span className="font-medium">{courierInfo.name}</span>
              </div>
              {courierInfo.phone && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.courierPhone}:</span>
                  <span className="font-medium">{courierInfo.phone}</span>
                </div>
              )}
              {courierInfo.estimated_arrival && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.estimatedArrival}:</span>
                  <span className="font-medium">
                    {formatTime(courierInfo.estimated_arrival)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ETA */}
        {deliveryEta && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              {t.estimatedArrival}
            </div>
            <span className="font-medium">
              {formatTime(deliveryEta)}
            </span>
          </div>
        )}

        {/* Status History */}
        {statusHistory.length > 0 && (
          <div className="border-t pt-3">
            <h4 className="font-medium mb-2 text-sm text-muted-foreground">
              {t.progress}
            </h4>
            <div className="space-y-2">
              {statusHistory.slice(-3).reverse().map((entry, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span>{entry.display_status}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {formatTime(entry.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}