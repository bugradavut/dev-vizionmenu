"use client"

import React, { useEffect, useRef, useState } from "react"
import { useLanguage } from "@/contexts/language-context"
import type { DeliveryZone } from "@/services/branch-settings.service"
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'



interface DeliveryZonesMapProps {
  zones: DeliveryZone[]
  onZoneAdd?: (polygon: [number, number][]) => void
  height?: string
  center?: [number, number]
}

export function DeliveryZonesMap({
  zones,
  onZoneAdd,
  height = "400px",
  center = [53.5461, -113.4938] // Edmonton default
}: DeliveryZonesMapProps) {
  const { language } = useLanguage()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    const initMap = async () => {
      try {
        if (!mapRef.current || !mounted) {
          return
        }

        setError(null)

        // Clear container completely and reset all Leaflet state
        const container = mapRef.current
        container.innerHTML = ''

        // Remove all possible Leaflet references
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (container as any)._leaflet_id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (container as any)._leaflet_pos
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (container as any)._leaflet_transform

        // Reset container style to ensure proper dimensions
        container.style.width = '100%'
        container.style.height = height
        container.style.position = 'relative'

        // Force reflow to ensure DOM is ready
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        container.offsetHeight

        // Wait longer for container to be fully ready
        await new Promise(resolve => setTimeout(resolve, 200))

        if (!mounted || !mapRef.current) return

        // Import Leaflet
        const L = await import('leaflet')

        // Fix marker icons issue for webpack
        delete (L as { Icon: { Default: { prototype: { _getIconUrl?: unknown } } } }).Icon.Default.prototype._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        })

        // Create map instance with error handling
        const map = L.map(mapRef.current, {
          center,
          zoom: 12,
          zoomControl: true,
          preferCanvas: false,
          attributionControl: true
        })

        // Wait for map to be fully initialized
        await new Promise(resolve => setTimeout(resolve, 100))

        // Define different map layers - clean selection
        const baseLayers = {
          "Google Style": L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '© CartoDB, © OpenStreetMap contributors',
            maxZoom: 19
          }),
          "Clean Roads": L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '© CartoDB, © OpenStreetMap contributors',
            maxZoom: 19
          }),
          "Street Map": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
          }),
          "Minimal": L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
            attribution: '© CartoDB, © OpenStreetMap contributors',
            maxZoom: 19
          })
        }

        // Add default layer - Google Style
        baseLayers["Google Style"].addTo(map)

        // Add layer control
        L.control.layers(baseLayers).addTo(map)

        // Force map to recalculate size - fixes dimension issues
        setTimeout(() => {
          if (map && mounted) {
            map.invalidateSize()
          }
        }, 100)

        if (!mounted) return

        // Display existing zones
        zones.forEach((zone) => {
          if (zone.polygon.length >= 3) {
            L.polygon(zone.polygon, {
              color: zone.active ? '#8b5cf6' : '#94a3b8',
              fillColor: zone.active ? '#8b5cf6' : '#94a3b8',
              fillOpacity: zone.active ? 0.2 : 0.1,
              weight: 2
            }).addTo(map).bindPopup(`
              <div style="font-family: sans-serif;">
                <strong>${zone.name}</strong><br/>
                <small>${zone.polygon.length} points</small>
              </div>
            `)
          }
        })

        // Import and setup Leaflet.draw
        await import('leaflet-draw')

        // Wait a bit for plugin to initialize
        await new Promise(resolve => setTimeout(resolve, 100))

        // Create FeatureGroup for drawn items
        const drawnItems = L.featureGroup().addTo(map)

        // Check if Draw is available
        if (!(L as { Control: { Draw?: unknown } }).Control.Draw) {
          setError(language === 'fr' ? 'Erreur de chargement des outils de dessin' : 'Failed to load drawing tools')
          return
        }

        // Setup drawing controls with only polygon tool
        const drawControl = new (L as { Control: { Draw: new (...args: unknown[]) => unknown } }).Control.Draw({
          position: 'topright',
          draw: {
            polygon: {
              allowIntersection: false,
              showArea: true,
              drawError: {
                color: '#e1e100',
                message: language === 'fr'
                  ? '<strong>Erreur:</strong> les lignes ne peuvent pas se croiser!'
                  : '<strong>Error:</strong> shape edges cannot cross!'
              },
              shapeOptions: {
                color: '#8b5cf6',
                fillColor: '#8b5cf6',
                fillOpacity: 0.2,
                weight: 2
              }
            },
            polyline: false,
            rectangle: false,
            circle: false,
            marker: false,
            circlemarker: false
          },
          edit: {
            featureGroup: drawnItems,
            remove: true
          }
        })

        map.addControl(drawControl as L.Control)

        // Handle polygon creation with proper typing
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.on('draw:created', (e: any) => {
          const layer = e.layer
          drawnItems.addLayer(layer)

          // Extract coordinates with proper typing
          const latLngs = layer.getLatLngs()[0] as L.LatLng[]
          const coords: [number, number][] = latLngs.map((point: L.LatLng) => [
            point.lat,
            point.lng
          ])

          onZoneAdd?.(coords)
        })

        // Handle polygon deletion with proper typing
        map.on('draw:deleted', () => {
          // In real implementation, we'd track which zones were deleted
          // For now, this is handled by the parent component
        })

        // Handle polygon editing
        map.on('draw:edited', () => {
          // Future: Handle zone updates in Phase 3
        })

        // Store map instance
        mapInstanceRef.current = map

      } catch {
        if (mounted) {
          setError(language === 'fr' ? 'Erreur de chargement de la carte' : 'Failed to load map')
        }
      }
    }

    // Poll for DOM element to be ready
    const pollForElement = () => {
      if (mapRef.current && mounted) {
        initMap()
      } else if (mounted) {
        timeoutId = setTimeout(pollForElement, 100)
      }
    }

    // Start polling
    timeoutId = setTimeout(pollForElement, 50)

    return () => {
      mounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove()
        } catch {
          // Silently handle cleanup errors
        }
        mapInstanceRef.current = null
      }
    }
  }, [center, height, language, onZoneAdd, zones])

  if (error) {
    return (
      <div className="w-full bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-600 text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-blue-600 text-xs hover:underline"
        >
          {language === 'fr' ? 'Recharger' : 'Reload'}
        </button>
      </div>
    )
  }


  return (
    <div className="w-full relative">
      <div
        ref={(el) => {
          mapRef.current = el
        }}
        style={{ height, width: '100%', minHeight: height }}
        className="rounded-lg border bg-gray-100"
      />

      {/* Instructions */}
      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded px-3 py-2 text-xs text-gray-700 shadow-sm">
        <div>
          {language === 'fr'
            ? 'Utilisez l\'outil polygone pour dessiner des zones'
            : 'Use the polygon tool to draw zones'
          }
        </div>
      </div>

      {/* Zone count */}
      {zones.length > 0 && (
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded px-3 py-1 text-xs text-gray-600 shadow-sm">
          {zones.length} {language === 'fr' ? 'zones définies' : 'zones defined'}
        </div>
      )}
    </div>
  )
}