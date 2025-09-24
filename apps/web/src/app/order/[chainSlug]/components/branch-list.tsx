"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Phone, Clock } from 'lucide-react'
import { Branch } from '../types/order-flow.types'
import { useLanguage } from '@/contexts/language-context'
import { getRestaurantStatus, migrateRestaurantHours, type RestaurantHours } from '@/utils/restaurant-hours'

interface BranchListProps {
  branches: Branch[]
  selectedBranch?: Branch | null
  onBranchSelect: (branch: Branch) => void
  loading?: boolean
  className?: string
}

export function BranchList({
  branches,
  selectedBranch,
  onBranchSelect,
  loading = false,
  className = ""
}: BranchListProps) {
  const { language } = useLanguage()

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-muted rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (branches.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-semibold mb-2">
          {language === 'fr' ? 'Aucune succursale trouvée' : 'No branches found'}
        </h3>
        <p className="text-muted-foreground text-sm">
          {language === 'fr' 
            ? 'Aucune succursale disponible pour le moment'
            : 'No branches available at the moment'
          }
        </p>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {branches.map((branch) => (
        <Card 
          key={branch.id}
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
            selectedBranch?.id === branch.id 
              ? 'ring-2 ring-primary bg-primary/5' 
              : 'hover:bg-accent/50'
          }`}
          onClick={() => onBranchSelect(branch)}
        >
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              {/* Branch Icon */}
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-primary" />
              </div>

              {/* Branch Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-base truncate">
                    {branch.name}
                  </h3>
                  {selectedBranch?.id === branch.id && (
                    <Badge variant="default" className="ml-2 text-xs">
                      {language === 'fr' ? 'Sélectionné' : 'Selected'}
                    </Badge>
                  )}
                </div>

                {/* Address */}
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                  {branch.address}
                </p>

                {/* Additional Info */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {branch.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span>{branch.phone}</span>
                    </div>
                  )}
                  {(() => {
                    const migratedHours = branch.restaurantHours ? migrateRestaurantHours(branch.restaurantHours as unknown as RestaurantHours) : undefined;
                    const status = getRestaurantStatus(migratedHours);
                    const isOpen = status.isOpen;
                    const statusText = language === 'fr'
                      ? (isOpen ? 'Ouvert maintenant' : 'Fermé')
                      : (isOpen ? 'Open now' : 'Closed');

                    return (
                      <div className="flex items-center gap-1">
                        <Clock className={isOpen ? "w-3 h-3 text-green-600" : "w-3 h-3 text-red-600"} />
                        <span className={isOpen ? "text-green-600" : "text-red-600"}>
                          {statusText}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}