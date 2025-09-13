"use client"

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MapPin, Clock, Phone } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Branch } from '@/services/customer-chains.service'
import { useLanguage } from '@/contexts/language-context'

interface BranchSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onBranchSelect: (branch: Branch) => void
  branches: Branch[]
  loading: boolean
  chainName: string
  selectedBranch?: Branch | null
}

export function BranchSelectionModal({
  isOpen,
  onBranchSelect,
  branches,
  loading,
  chainName
}: BranchSelectionModalProps) {
  const { language } = useLanguage()
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [isClosing, setIsClosing] = useState(false)

  const getDescriptionText = () => {
    return language === 'fr' 
      ? 'Choisissez votre succursale pour continuer'
      : 'Choose your branch to continue'
  }

  const handleBranchClick = (branch: Branch) => {
    setSelectedBranchId(branch.id)
    setIsClosing(true)
    
    // Wait a bit then close modal smoothly
    setTimeout(() => {
      onBranchSelect(branch)
    }, 150)
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-2xl w-[95vw] sm:w-full mx-auto max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 border-b px-6 py-5">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-bold text-foreground">
              {chainName}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {isClosing 
                ? (language === 'fr' ? 'Chargement du menu...' : 'Loading menu...')
                : getDescriptionText()
              }
            </p>
          </DialogHeader>
        </div>

        {/* Branch List */}
        <ScrollArea className="flex-1 px-6 py-4">
          <RadioGroup 
            value={selectedBranchId || ''} 
            onValueChange={() => {}} 
            className="space-y-3"
          >
            {loading ? (
              <div className="space-y-3">
                {/* Loading skeleton */}
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
            ) : (
              branches.map((branch) => (
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
                    <h3 className="font-semibold text-lg text-foreground mb-1 truncate">
                      {branch.name}
                    </h3>
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
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <Clock className="w-3 h-3 text-green-600" />
                        <span className="text-xs font-medium text-green-600">
                          {language === 'fr' ? 'Ouvert maintenant' : 'Open now'}
                        </span>
                      </div>
                      {branch.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {branch.phone}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Radio Button - Right Side */}
                  <RadioGroupItem
                    value={branch.id}
                    id={`branch-${branch.id}`}
                    className="mt-1 flex-shrink-0"
                  />
                </Label>
              ))
            )}
          </RadioGroup>
        </ScrollArea>

        {/* Footer */}
        <div className="flex-shrink-0 border-t bg-muted/20 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>
                {branches.length > 0 && !loading
                  ? `${branches.length} ${language === 'fr' ? 'succursales disponibles' : 'branches available'}`
                  : ''
                }
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}