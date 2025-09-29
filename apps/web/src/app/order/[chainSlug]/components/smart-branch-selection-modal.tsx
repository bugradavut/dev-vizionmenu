"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { Button } from '@/components/ui/button'
import { MapPin, Phone, Navigation, AlertCircle, Store } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/contexts/language-context'
import { getRestaurantStatus, migrateRestaurantHours, type RestaurantHours } from '@/utils/restaurant-hours'
import { LocationPermission, AddressInput } from '@/components/location'
import { useSmartBranchSelection } from '@/hooks/use-smart-branch-selection'
import { type RankedBranch } from '@/services/branch-ranking.service'
import type { Branch } from '@/services/customer-chains.service'
import type { Coordinates } from '@/utils/geometry'

interface SmartBranchSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onBranchSelect: (branch: Branch) => void
  chainSlug: string
  chainName: string
  chainLogoUrl?: string
  orderType?: 'delivery' | 'pickup'
}

type LocationStep = 'permission' | 'address_input' | 'branch_selection'

// Chain Logo Component
function ChainLogo({ logoUrl, chainName }: { logoUrl?: string; chainName: string }) {
  const [logoError, setLogoError] = useState(false)

  // Show fallback if no logo URL or logo failed to load
  if (!logoUrl || logoError) {
    return <Store className="w-8 h-8 text-primary" />
  }

  return (
    <img
      src={logoUrl}
      alt={chainName}
      className="w-12 h-12 object-contain"
      onError={() => setLogoError(true)}
    />
  )
}

export function SmartBranchSelectionModal({
  isOpen,
  onBranchSelect,
  chainSlug,
  chainName,
  chainLogoUrl,
  orderType = 'delivery'
}: SmartBranchSelectionModalProps) {
  const { language } = useLanguage()
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const [currentStep, setCurrentStep] = useState<LocationStep>('permission')

  // Smart branch selection with location
  const smartSelection = useSmartBranchSelection({
    chainSlug,
    orderType,
    language
  })

  const { state, location } = smartSelection

  // Auto-progress to branch selection when location is available
  useEffect(() => {
    if (location.location.coordinates && currentStep !== 'branch_selection') {
      setCurrentStep('branch_selection')
    }
  }, [location.location.coordinates, currentStep])

  const getText = () => {
    return {
      title: chainName,
      locationStep: language === 'fr' ? 'Trouvez votre succursale' : 'Find Your Branch',
      branchStep: language === 'fr' ? 'Choisissez votre succursale' : 'Choose Your Branch',
      loading: language === 'fr' ? 'Chargement du menu...' : 'Loading menu...',
      open: language === 'fr' ? 'Ouvert maintenant' : 'Open now',
      closed: language === 'fr' ? 'Fermé' : 'Closed',
      delivers: language === 'fr' ? 'Livre à votre adresse' : 'Delivers to you',
      noDelivery: language === 'fr' ? 'Hors zone de livraison' : 'Outside delivery area',
      skipLocation: language === 'fr' ? 'Voir toutes les succursales' : 'See All Branches',
    }
  }

  const text = getText()

  const handleLocationPermission = async () => {
    await location.requestLocation()
  }

  const handleManualAddress = () => {
    setCurrentStep('address_input')
  }

  const handleAddressSelect = (coordinates: Coordinates, formattedAddress: string) => {
    location.setManualLocation(coordinates)
    smartSelection.rankBranches(coordinates)
    setCurrentStep('branch_selection')
  }

  const handleSkipLocation = () => {
    setCurrentStep('branch_selection')
  }

  const handleBackToPermission = () => {
    setCurrentStep('permission')
    // Reset location state when going back
    location.clearLocation()
  }

  const handleBranchSelect = (branch: RankedBranch) => {
    // Only select the branch, don't navigate yet
    setSelectedBranchId(branch.id)
  }

  const handleContinue = () => {
    if (!selectedBranchId) return

    const selectedBranch = state.branches.find(branch => branch.id === selectedBranchId)
    if (selectedBranch) {
      setIsClosing(true)
      setTimeout(() => {
        onBranchSelect(selectedBranch)
      }, 150)
    }
  }

  const renderLocationStep = () => {
    if (currentStep === 'address_input') {
      return (
        <>
          <VisuallyHidden>
            <DialogHeader>
              <DialogTitle>{text.title}</DialogTitle>
            </DialogHeader>
          </VisuallyHidden>
          <div className="flex-1 overflow-y-auto">
            <AddressInput
              onLocationSelect={handleAddressSelect}
            />
          </div>

          {/* Footer */}
          <div className="bg-white px-6 py-3 border-t border-gray-200 flex justify-between items-center">
            <Button
              variant="ghost"
              onClick={handleBackToPermission}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← {language === 'fr' ? 'Retour' : 'Back'}
            </Button>

            <Button
              variant="ghost"
              onClick={handleSkipLocation}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {text.skipLocation}
            </Button>
          </div>
        </>
      )
    }

    return (
      <>
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>{text.title}</DialogTitle>
          </DialogHeader>
        </VisuallyHidden>
        <div className="flex-1 overflow-y-auto">
          <LocationPermission
            permission={location.location.permission}
            loading={location.location.loading}
            error={location.location.error}
            onRequestLocation={handleLocationPermission}
            onUseManualAddress={handleManualAddress}
          />
        </div>

        {/* Footer */}
        <div className="bg-white px-6 py-3 border-t border-gray-200 flex justify-between items-center">
          {(location.location.loading || location.location.error) ? (
            <Button
              variant="ghost"
              onClick={handleBackToPermission}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← {language === 'fr' ? 'Retour' : 'Back'}
            </Button>
          ) : <div></div>}

          <Button
            variant="ghost"
            onClick={handleSkipLocation}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {text.skipLocation}
          </Button>
        </div>
      </>
    )
  }

  const renderBranchCard = (branch: RankedBranch, index: number) => {
    const statusInfo = (() => {
      const migratedHours = branch.restaurantHours
        ? migrateRestaurantHours(branch.restaurantHours as unknown as RestaurantHours)
        : undefined
      const status = getRestaurantStatus(migratedHours)
      return {
        isOpen: status.isOpen,
        text: language === 'fr'
          ? (status.isOpen ? 'Ouvert maintenant' : 'Fermé')
          : (status.isOpen ? 'Open now' : 'Closed')
      }
    })()

    // const deliveryStatusInfo = branchRankingService.getDeliveryStatusText(branch, language)

    const isSelected = selectedBranchId === branch.id

    return (
      <Label
        key={branch.id}
        htmlFor={`branch-${branch.id}`}
        className={`relative cursor-pointer block rounded-lg border transition-colors duration-200 ${
          isSelected
            ? 'border-primary bg-primary/5'
            : 'border-gray-200 bg-white'
        } ${
          isClosing ? 'opacity-75 pointer-events-none' : ''
        }`}
        onClick={() => !isClosing && handleBranchSelect(branch)}
      >

        <div className="p-3">
          <div className="flex items-start gap-2.5">
            {/* Simple Location Icon */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              isSelected
                ? 'bg-primary/10 text-primary'
                : 'bg-gray-100 text-gray-500'
            }`}>
              <MapPin className="w-5 h-5" />
            </div>

            {/* Branch Info */}
            <div className="flex-1 min-w-0">
              <div className="mb-2">
                <h3 className="font-semibold text-base text-gray-900 mb-1 line-clamp-2 leading-tight">{branch.name}</h3>
                <p className="text-sm text-gray-600 line-clamp-2 leading-tight">
                  {typeof branch.address === 'string'
                    ? branch.address
                    : branch.address
                      ? `${branch.address.street}, ${branch.address.city}`
                      : 'Address not available'
                  }
                </p>
              </div>

              {/* Status and Info Pills */}
              <div className="flex items-center flex-wrap gap-1.5">
                {/* Open/Closed Status */}
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${
                  statusInfo.isOpen
                    ? 'bg-green-100 text-green-700 border-green-400'
                    : 'bg-red-100 text-red-700 border-red-200'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    statusInfo.isOpen ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  {statusInfo.text}
                </div>

                {/* Distance */}
                {branch.distance > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-100 text-blue-700 border border-blue-200 rounded-full text-xs font-medium">
                    <Navigation className="w-3 h-3" />
                    {branch.distanceText}
                  </div>
                )}

                {/* Phone */}
                {branch.phone && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 text-gray-700 border border-gray-200 rounded-full text-xs font-medium max-w-[140px]">
                    <Phone className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{branch.phone}</span>
                  </div>
                )}

                {/* Delivery Status */}
                {branch.deliveryStatus === 'delivers' && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-100 text-emerald-700 border border-emerald-400 rounded-full text-xs font-medium max-w-[160px]">
                    <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z"/>
                    </svg>
                    <span className="truncate">{text.delivers}</span>
                  </div>
                )}

                {branch.deliveryStatus === 'no_delivery' && orderType === 'delivery' && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-orange-100 text-orange-700 border border-orange-200 rounded-full text-xs font-medium max-w-[180px]">
                    <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd"/>
                    </svg>
                    <span className="truncate">{text.noDelivery}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Radio Button */}
            <div className="flex-shrink-0">
              <RadioGroupItem
                value={branch.id}
                id={`branch-${branch.id}`}
                className={`w-4 h-4 ${isSelected ? 'border-primary text-primary' : ''}`}
              />
            </div>
          </div>
        </div>
      </Label>
    )
  }

  const renderBranchSelection = () => {
    return (
      <>
        {/* Minimal Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="text-center space-y-2">
            {/* Chain Logo */}
            <div className="w-16 h-16 mx-auto flex items-center justify-center">
              <ChainLogo logoUrl={chainLogoUrl} chainName={chainName} />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-gray-900">
                {chainName}
              </h2>
              <p className="text-sm text-gray-600">
                {language === 'fr' ? 'Choisissez votre succursale' : 'Choose Your Branch'}
              </p>
            </div>

          </div>
        </div>

        {/* Branch List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          <RadioGroup
            value={selectedBranchId || ''}
            onValueChange={() => {}}
            className="space-y-3"
          >
              {state.loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-full"></div>
                          <div className="flex gap-2">
                            <div className="h-5 bg-gray-200 rounded-full w-16"></div>
                            <div className="h-5 bg-gray-200 rounded-full w-20"></div>
                          </div>
                        </div>
                        <div className="w-4 h-4 bg-gray-200 rounded-full flex-shrink-0"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : state.error ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {language === 'fr' ? 'Erreur de chargement' : 'Loading Error'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">{state.error}</p>
                  <Button onClick={smartSelection.refreshBranches}>
                    {language === 'fr' ? 'Réessayer' : 'Try Again'}
                  </Button>
                </div>
              ) : (
                state.branches.map((branch, index) => renderBranchCard(branch, index))
              )}
          </RadioGroup>
        </div>

        {/* Footer */}
        <div className="bg-white px-6 py-3 border-t border-gray-200 flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={handleBackToPermission}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← {language === 'fr' ? 'Retour' : 'Back'}
          </Button>

          <Button
            disabled={!selectedBranchId || isClosing}
            onClick={handleContinue}
            className="text-xs bg-primary hover:bg-primary/90 text-white px-4 py-2"
          >
            {isClosing
              ? (language === 'fr' ? 'Chargement...' : 'Loading...')
              : (language === 'fr' ? 'Continuer' : 'Continue')
            }
          </Button>
        </div>
      </>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl w-[95vw] sm:w-[450px] lg:w-[500px] xl:w-[600px] max-h-[90vh] p-0 flex flex-col gap-0 overflow-hidden"
        hideCloseButton={true}
      >
        {currentStep === 'branch_selection' ? renderBranchSelection() : renderLocationStep()}
      </DialogContent>
    </Dialog>
  )
}