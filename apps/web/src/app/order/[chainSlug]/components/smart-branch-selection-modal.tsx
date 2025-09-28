"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Clock, Phone, Navigation, Star, AlertCircle } from 'lucide-react'
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
  orderType?: 'delivery' | 'pickup'
}

type LocationStep = 'permission' | 'address_input' | 'branch_selection'

export function SmartBranchSelectionModal({
  isOpen,
  onBranchSelect,
  chainSlug,
  chainName,
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
      recommended: language === 'fr' ? 'Recommandé' : 'Recommended',
      open: language === 'fr' ? 'Ouvert maintenant' : 'Open now',
      closed: language === 'fr' ? 'Fermé' : 'Closed',
      delivers: language === 'fr' ? 'Adresinize teslimat yapıyor' : 'Delivers to you',
      noDelivery: language === 'fr' ? 'Bu bölgeye teslimat yapmıyor' : 'No delivery to this area',
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

  const handleAddressSelect = (coordinates: Coordinates) => {
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

  const handleBranchClick = (branch: RankedBranch) => {
    setSelectedBranchId(branch.id)
    setIsClosing(true)

    setTimeout(() => {
      onBranchSelect(branch)
    }, 150)
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
    const isRecommended = index === 0 && branch.priority === 1

    return (
      <Label
        key={branch.id}
        htmlFor={`branch-${branch.id}`}
        className={`border rounded-xl p-4 transition-all duration-200 cursor-pointer flex items-start space-x-4 ${
          selectedBranchId === branch.id
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/30 hover:bg-accent/50'
        } ${
          isClosing ? 'opacity-75 pointer-events-none' : ''
        }`}
        onClick={() => !isClosing && handleBranchClick(branch)}
      >
        {/* Location Icon */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          selectedBranchId === branch.id
            ? 'bg-primary/20 text-primary'
            : 'bg-muted text-muted-foreground'
        }`}>
          <MapPin className="w-5 h-5" />
        </div>

        {/* Branch Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-lg text-foreground truncate">
              {branch.name}
            </h3>

            {/* Badges */}
            <div className="flex flex-col gap-1 ml-2">
              {isRecommended && (
                <Badge variant="default" className="text-xs bg-primary">
                  <Star className="w-3 h-3 mr-1" />
                  {text.recommended}
                </Badge>
              )}

              {branch.deliveryStatus === 'delivers' && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                  {text.delivers}
                </Badge>
              )}

              {branch.deliveryStatus === 'no_delivery' && orderType === 'delivery' && (
                <Badge variant="outline" className="text-xs border-orange-200 text-orange-700">
                  {text.noDelivery}
                </Badge>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            {typeof branch.address === 'string'
              ? branch.address
              : branch.address
                ? `${branch.address.street}, ${branch.address.city}`
                : 'Address not available'
            }
          </p>

          {/* Branch Details */}
          <div className="flex items-center gap-6">
            {/* Restaurant Hours */}
            <div className="flex items-center gap-1.5">
              <div className={statusInfo.isOpen
                ? "w-2 h-2 rounded-full bg-green-500"
                : "w-2 h-2 rounded-full bg-red-500"
              }></div>
              <Clock className={statusInfo.isOpen
                ? "w-3 h-3 text-green-600"
                : "w-3 h-3 text-red-600"
              } />
              <span className={`text-xs font-medium ${
                statusInfo.isOpen ? 'text-green-700' : 'text-red-700'
              }`}>
                {statusInfo.text}
              </span>
            </div>

            {/* Distance */}
            {branch.distance > 0 && (
              <div className="flex items-center gap-1.5">
                <Navigation className="w-3 h-3 text-blue-600" />
                <span className="text-xs text-blue-700 font-medium">
                  {branch.distanceText}
                </span>
              </div>
            )}

            {/* Phone */}
            {branch.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-600">
                  {branch.phone}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Radio Button */}
        <RadioGroupItem
          value={branch.id}
          id={`branch-${branch.id}`}
          className="mt-2"
        />
      </Label>
    )
  }

  const renderBranchSelection = () => {
    return (
      <>
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 border-b px-6 py-5">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-bold text-foreground">
              {text.title}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {isClosing ? text.loading : text.branchStep}
            </p>

            {/* Location indicator */}
            {location.location.coordinates && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Navigation className="w-3 h-3" />
                {language === 'fr'
                  ? 'Succursales triées par proximité'
                  : 'Branches sorted by proximity'
                }
              </div>
            )}
          </DialogHeader>
        </div>

        {/* Branch List */}
        <ScrollArea className="flex-1 px-6 py-4 min-h-0">
          <RadioGroup
            value={selectedBranchId || ''}
            onValueChange={() => {}}
            className="space-y-3"
          >
            {state.loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border rounded-xl p-4 animate-pulse bg-muted/20">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-muted rounded-full flex-shrink-0"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-muted rounded-md w-3/4"></div>
                        <div className="h-4 bg-muted rounded-md w-full"></div>
                        <div className="flex space-x-4">
                          <div className="h-3 bg-muted rounded-md w-20"></div>
                          <div className="h-3 bg-muted rounded-md w-24"></div>
                        </div>
                      </div>
                      <div className="w-8 h-8 bg-muted rounded-full flex-shrink-0"></div>
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
        </ScrollArea>
      </>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-sm sm:max-w-md md:max-w-lg w-[90vw] sm:w-[80vw] md:w-full max-h-[80vh] p-0 flex flex-col overflow-hidden gap-0"
        hideCloseButton={true}
      >
        {currentStep === 'branch_selection' ? renderBranchSelection() : renderLocationStep()}
      </DialogContent>
    </Dialog>
  )
}