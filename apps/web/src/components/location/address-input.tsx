"use client"

import React, { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { MapPin, Loader2, AlertCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { geocodingService, type GeocodingResult, type GeocodingError } from '@/services/geocoding.service'
import { useAddressSearch } from '@/hooks/useAddressSearch'
import type { Coordinates } from '@/utils/geometry'

interface AddressInputProps {
  onLocationSelect: (coordinates: Coordinates, formattedAddress: string) => void
  placeholder?: string
  className?: string
}

export function AddressInput({
  onLocationSelect,
  placeholder,
  className = ""
}: AddressInputProps) {
  const { language } = useLanguage()
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Use address search hook for autocomplete
  const { suggestions, loading: searchLoading } = useAddressSearch(address, language, 'street')

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setAddress(newValue)
    setShowSuggestions(newValue.length >= 3)
    if (error) setError(null)
  }

  const handleSuggestionClick = (suggestion: {
    display_name: string
    address?: {
      house_number?: string
      road?: string
      city?: string
      town?: string
      village?: string
      state?: string
      postcode?: string
      country?: string
    }
  }) => {
    // Use shorter, more user-friendly address format
    let selectedAddress = suggestion.display_name

    // If we have house number and road, use that as it's more concise
    if (suggestion.address?.road && suggestion.address?.house_number) {
      selectedAddress = `${suggestion.address.house_number} ${suggestion.address.road}`

      // Add city if available for context
      if (suggestion.address?.city) {
        selectedAddress += `, ${suggestion.address.city}`
      } else if (suggestion.address?.town) {
        selectedAddress += `, ${suggestion.address.town}`
      }

      // Add province/state
      if (suggestion.address?.state) {
        selectedAddress += `, ${suggestion.address.state}`
      }
    }

    setAddress(selectedAddress)
    setShowSuggestions(false)
    setError(null)

    // Just fill the input, don't search automatically
    // User will click search button when ready
  }

  const handleGeocoding = async (addressToGeocode: string) => {
    setLoading(true)
    setError(null)

    try {
      const result: GeocodingResult = await geocodingService.geocodeAddress(addressToGeocode)
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


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!address.trim()) {
      setError(language === 'fr' ? 'Veuillez entrer une adresse' : 'Please enter an address')
      return
    }

    // Hide suggestions and use current address value
    setShowSuggestions(false)
    await handleGeocoding(address)
  }

  return (
    <div className={`relative flex flex-col p-0 ${className}`}>
      {/* Modern Header with Gradient Background */}
      <div className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pt-12 pb-8 px-4 sm:px-8 overflow-hidden">
        {/* Subtle Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-8 left-8 w-32 h-32 bg-blue-200/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-8 right-8 w-24 h-24 bg-indigo-200/20 rounded-full blur-2xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-purple-200/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 text-center space-y-6">
          {/* Modern Icon Design */}
          <div className="relative mx-auto w-20 h-20">
            <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center border border-white/50">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="absolute inset-0 bg-blue-400/30 rounded-full animate-pulse"></div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
              {language === 'fr'
                ? 'Trouvez votre emplacement'
                : 'Find your location'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="bg-white px-6 py-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Google Maps Style Search Bar with Popover */}
          <Popover open={showSuggestions} onOpenChange={setShowSuggestions}>
            <PopoverTrigger asChild>
              <div className="relative">
                <div className="relative bg-white border border-gray-300 rounded-full shadow-lg hover:shadow-xl transition-shadow duration-200 focus-within:shadow-xl focus-within:border-blue-500">
                  {/* Search Icon */}
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <MapPin className="w-5 h-5 text-gray-400" />
                  </div>

                  {/* Input Field */}
                  <input
                    id="address-input"
                    type="text"
                    value={address}
                    onChange={handleInputChange}
                    onFocus={() => address.length >= 3 && setShowSuggestions(true)}
                    placeholder={text.placeholder}
                    disabled={loading}
                    className="w-full h-14 pl-12 pr-20 text-base placeholder-gray-500 text-gray-900 bg-transparent rounded-full focus:outline-none disabled:opacity-50"
                    autoFocus
                  />

                  {/* Search Button */}
                  <button
                    type="submit"
                    disabled={loading || !address.trim()}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 rounded-full flex items-center justify-center transition-colors duration-200 shadow-md"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </PopoverTrigger>

            <PopoverContent
              className="w-96 p-0 shadow-2xl border-0 bg-white rounded-2xl"
              align="center"
              side="bottom"
              sideOffset={8}
              avoidCollisions={true}
              collisionPadding={8}
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="relative">
                {/* Loading State */}
                {searchLoading && suggestions.length === 0 && address.length >= 3 && (
                  <div className="p-5">
                    <div className="flex items-center justify-center gap-3 text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                      <span className="text-sm font-medium">
                        {language === 'fr' ? 'Recherche d\'adresses...' : 'Searching addresses...'}
                      </span>
                    </div>
                  </div>
                )}

                {/* No Results State */}
                {!searchLoading && suggestions.length === 0 && address.length >= 3 && (
                  <div className="p-5">
                    <div className="text-center">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <MapPin className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600 font-medium">
                        {language === 'fr' ? 'Aucune adresse trouvée' : 'No addresses found'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {language === 'fr' ? 'Essayez un autre terme' : 'Try a different search term'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Suggestions List */}
                {suggestions.length > 0 && (
                  <div
                    className="max-h-80 overflow-y-auto overscroll-contain"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#cbd5e1 #f1f5f9'
                    }}
                    onWheel={(e) => {
                      // Allow scroll events to propagate within this container
                      e.stopPropagation();
                    }}
                    onTouchMove={(e) => {
                      // Allow touch scroll events
                      e.stopPropagation();
                    }}
                  >
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={`${suggestion.place_id}-${index}`}
                        className="flex items-center gap-3 p-4 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-all duration-200 hover:shadow-sm"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate text-sm">
                            {suggestion.address?.road && suggestion.address?.house_number
                              ? `${suggestion.address.house_number} ${suggestion.address.road}`
                              : suggestion.display_name.split(',')[0]
                            }
                          </div>
                          <div className="text-xs text-gray-500 truncate mt-0.5">
                            {suggestion.display_name.split(',').slice(1).join(',').trim()}
                          </div>
                        </div>
                        <div className="text-gray-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl shadow-sm">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}