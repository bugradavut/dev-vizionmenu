"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, Loader2, AlertCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { geocodingService, type GeocodingResult, type GeocodingError } from '@/services/geocoding.service'
import type { Coordinates } from '@/utils/geometry'

interface AddressInputProps {
  onLocationSelect: (coordinates: Coordinates, formattedAddress: string) => void
  onCancel?: () => void
  placeholder?: string
  className?: string
}

export function AddressInput({
  onLocationSelect,
  onCancel,
  placeholder,
  className = ""
}: AddressInputProps) {
  const { language } = useLanguage()
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getText = () => {
    return {
      title: language === 'fr' ? 'Entrez votre adresse' : 'Enter your address',
      placeholder: placeholder || (language === 'fr' ? 'Ex: 123 Rue Main, Montréal, QC' : 'e.g. 123 Main St, Edmonton, AB'),
      button: language === 'fr' ? 'Trouver' : 'Find Location',
      cancel: language === 'fr' ? 'Annuler' : 'Cancel',
      errorInvalid: language === 'fr' ? 'Adresse non trouvée. Vérifiez votre saisie.' : 'Address not found. Please check your input.',
      errorNetwork: language === 'fr' ? 'Erreur de réseau. Veuillez réessayer.' : 'Network error. Please try again.',
      errorGeneral: language === 'fr' ? 'Erreur lors de la recherche d\'adresse.' : 'Error searching for address.',
    }
  }

  const text = getText()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!address.trim()) {
      setError(language === 'fr' ? 'Veuillez entrer une adresse' : 'Please enter an address')
      return
    }

    // Basic validation
    if (!geocodingService.validateAddress(address)) {
      setError(language === 'fr' ? 'Veuillez entrer une adresse complète avec numéro de rue' : 'Please enter a complete address with street number')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result: GeocodingResult = await geocodingService.geocodeAddress(address)
      onLocationSelect(result.coordinates, result.formattedAddress)
    } catch (err) {
      const error = err as GeocodingError

      switch (error.code) {
        case 'INVALID_ADDRESS':
          setError(text.errorInvalid)
          break
        case 'NETWORK_ERROR':
        case 'RATE_LIMIT':
          setError(text.errorNetwork)
          break
        default:
          setError(text.errorGeneral)
          break
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`space-y-0 ${className}`}>
      {/* Minimal Header */}
      <div className="text-center py-8 px-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full mb-4">
          <MapPin className="w-6 h-6 text-slate-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          {text.title}
        </h3>
        <p className="text-sm text-slate-500 max-w-xs mx-auto">
          {language === 'fr'
            ? 'Entrez votre adresse complète'
            : 'Enter your complete address'
          }
        </p>
      </div>

      {/* Clean Form */}
      <div className="px-8 pb-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <Label htmlFor="address-input" className="text-sm font-medium text-slate-700">
              {language === 'fr' ? 'Adresse' : 'Address'}
            </Label>
            <Input
              id="address-input"
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value)
                if (error) setError(null)
              }}
              placeholder={text.placeholder}
              disabled={loading}
              className="h-12 text-base border border-slate-200 rounded-lg px-4 focus:border-slate-400 focus:ring-0 transition-colors"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Simple Buttons */}
          <div className="flex gap-3 pt-3">
            <Button
              type="submit"
              disabled={loading || !address.trim()}
              className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {language === 'fr' ? 'Recherche...' : 'Searching...'}
                </>
              ) : (
                text.button
              )}
            </Button>

            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
                className="h-11 px-6 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-medium"
              >
                {text.cancel}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}