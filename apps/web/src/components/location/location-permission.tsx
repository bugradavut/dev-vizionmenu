"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { MapPin, Navigation, AlertCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import type { LocationPermission } from '@/hooks/use-customer-location'

interface LocationPermissionProps {
  permission: LocationPermission
  loading: boolean
  error: string | null
  onRequestLocation: () => void
  onUseManualAddress: () => void
  className?: string
}

export function LocationPermission({
  permission,
  loading,
  error,
  onRequestLocation,
  onUseManualAddress,
  className = ""
}: LocationPermissionProps) {
  const { language } = useLanguage()

  const getText = () => {
    return {
      title: language === 'fr' ? 'Trouvez la succursale la plus proche' : 'Find the nearest branch',
      subtitle: language === 'fr'
        ? 'Nous recommandons automatiquement la meilleure succursale pour vous'
        : 'We\'ll automatically recommend the best branch for you',
      allowLocation: language === 'fr' ? 'Utiliser ma position' : 'Use My Location',
      manualAddress: language === 'fr' ? 'Entrer une adresse' : 'Enter Address Manually',
      permissionDenied: language === 'fr'
        ? 'Accès à la localisation refusé'
        : 'Location access denied',
      permissionDeniedDesc: language === 'fr'
        ? 'Vous pouvez toujours entrer votre adresse manuellement'
        : 'You can still enter your address manually',
      unsupported: language === 'fr'
        ? 'Géolocalisation non supportée'
        : 'Geolocation not supported',
      unsupportedDesc: language === 'fr'
        ? 'Votre navigateur ne supporte pas la géolocalisation'
        : 'Your browser doesn\'t support geolocation',
      loading: language === 'fr' ? 'Localisation en cours...' : 'Getting location...',
      error: language === 'fr' ? 'Erreur de localisation' : 'Location Error',
    }
  }

  const text = getText()

  // Render loading state
  if (loading) {
    return (
      <div className={`relative flex flex-col p-0 ${className}`}>
        {/* Animated Loading Header */}
        <div className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pt-12 pb-8 px-4 sm:px-8 overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0">
            <div className="absolute top-8 left-8 w-32 h-32 bg-blue-200/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-8 right-8 w-24 h-24 bg-indigo-200/20 rounded-full blur-2xl animate-pulse animation-delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-purple-200/10 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
          </div>

          <div className="relative z-10 text-center space-y-6">
            {/* GPS Loading Animation */}
            <div className="relative mx-auto w-20 h-20">
              {/* Outer pulse */}
              <div className="absolute inset-0 w-20 h-20 bg-emerald-400/30 rounded-full animate-ping"></div>
              {/* Middle pulse */}
              <div className="absolute inset-2 w-16 h-16 bg-emerald-400/50 rounded-full animate-ping animation-delay-500"></div>
              {/* GPS Icon */}
              <div className="absolute inset-4 w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                <Navigation className="w-6 h-6 text-white animate-pulse" />
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-xl font-bold text-gray-900">
                {text.loading}
              </h2>

              {/* Animated dots */}
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce animation-delay-200"></div>
                <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce animation-delay-400"></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    )
  }

  // Render error state
  if (error) {
    const isPermissionDenied = permission === 'denied'
    const isUnsupported = permission === 'unsupported'

    return (
      <div className={`relative flex flex-col p-0 ${className}`}>
        {/* Error Header with consistent styling */}
        <div className="relative bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 pt-12 pb-8 px-4 sm:px-8 overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0">
            <div className="absolute top-8 left-8 w-32 h-32 bg-red-200/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-8 right-8 w-24 h-24 bg-orange-200/20 rounded-full blur-2xl"></div>
          </div>

          <div className="relative z-10 text-center space-y-6">
            {/* Error Icon */}
            <div className="relative mx-auto w-20 h-20">
              <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center border border-white/50">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-xl font-bold text-gray-900">
                {isPermissionDenied ? text.permissionDenied :
                 isUnsupported ? text.unsupported :
                 text.error}
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
                {isPermissionDenied
                  ? (language === 'fr'
                      ? 'Vous pouvez consulter toutes les succursales disponibles'
                      : 'You can view all available branches')
                  : isUnsupported ? text.unsupportedDesc
                  : error}
              </p>
            </div>
          </div>
        </div>

        {/* Action Area - Only show Try Again for non-permission errors */}
        {!isPermissionDenied && !isUnsupported && (
          <div className="bg-white px-4 sm:px-6 py-6">
            <Button
              onClick={onRequestLocation}
              className="w-full h-12 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700"
            >
              <Navigation className="w-4 h-4 mr-2" />
              {language === 'fr' ? 'Réessayer' : 'Try Again'}
            </Button>
          </div>
        )}
      </div>
    )
  }

  // Render initial permission request
  return (
    <div className={`relative flex flex-col p-0 ${className}`}>
      {/* Top Section with Background Pattern */}
      <div className="relative bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-50 pt-8 sm:pt-12 pb-6 sm:pb-8 px-4 sm:px-8">
        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-4 sm:top-8 left-4 sm:left-8 w-24 sm:w-32 h-24 sm:h-32 bg-emerald-200/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-4 sm:bottom-8 right-4 sm:right-8 w-20 sm:w-24 h-20 sm:h-24 bg-blue-200/20 rounded-full blur-2xl"></div>
        </div>

        <div className="relative z-10 text-center space-y-4 sm:space-y-6">
          {/* Floating Icon with Pulse */}
          <div className="relative mx-auto w-16 sm:w-20 h-16 sm:h-20">
            <div className="w-16 sm:w-20 h-16 sm:h-20 bg-white rounded-full shadow-lg flex items-center justify-center border border-white/50">
              <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-full flex items-center justify-center">
                <Navigation className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
              </div>
            </div>
            <div className="absolute inset-0 bg-emerald-400/30 rounded-full animate-ping"></div>
          </div>

          <div className="space-y-2 sm:space-y-3 px-2">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              {text.title}
            </h2>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed max-w-xs mx-auto">
              {text.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Action Area */}
      <div className="bg-white px-4 sm:px-6 py-6 space-y-3 sm:space-y-4">
        {/* Primary Action - Location */}
        <div
          onClick={onRequestLocation}
          className="group cursor-pointer"
        >
          <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-600 rounded-xl p-3 sm:p-4 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-blue-600 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                  <Navigation className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-sm sm:text-base leading-tight">
                    {text.allowLocation}
                  </h3>
                  <p className="text-white/80 text-xs leading-tight hidden sm:block">
                    {language === 'fr' ? 'Rapide et précis' : 'Fast & accurate'}
                  </p>
                </div>
              </div>
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                <span className="text-white text-sm sm:text-lg">→</span>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Action - Manual */}
        <div
          onClick={onUseManualAddress}
          className="group cursor-pointer"
        >
          <div className="relative overflow-hidden bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-3 sm:p-4 hover:from-gray-100 hover:to-slate-100 hover:border-gray-300 transition-all duration-200 shadow-sm">
            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-slate-200 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-gray-600" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <h3 className="text-gray-900 font-medium text-sm leading-tight">
                    {text.manualAddress}
                  </h3>
                  <p className="text-gray-500 text-xs leading-tight hidden sm:block">
                    {language === 'fr' ? 'Saisissez votre adresse' : 'Type your address'}
                  </p>
                </div>
              </div>
              <div className="w-6 h-6 bg-gray-200/50 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                <span className="text-gray-600 text-sm">→</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}