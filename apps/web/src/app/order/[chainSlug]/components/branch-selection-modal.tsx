"use client"

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, MapPin } from 'lucide-react'
import { Branch, OrderType } from '../types/order-flow.types'
import { BranchList } from './branch-list'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'

interface BranchSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onBack: () => void
  onBranchSelect: (branch: Branch) => void
  branches: Branch[]
  loading: boolean
  chainName: string
  orderType: OrderType
  selectedBranch?: Branch | null
}

export function BranchSelectionModal({
  isOpen,
  onClose,
  onBack,
  onBranchSelect,
  branches,
  loading,
  chainName,
  orderType,
  selectedBranch
}: BranchSelectionModalProps) {
  const { language } = useLanguage()
  const t = translations[language] || translations.en

  const getOrderTypeText = () => {
    if (orderType === 'takeout') {
      return language === 'fr' ? 'À emporter' : 'Takeout'
    }
    return language === 'fr' ? 'Livraison' : 'Delivery'
  }

  const getDescriptionText = () => {
    if (orderType === 'takeout') {
      return language === 'fr' 
        ? 'Choisissez la succursale où récupérer votre commande'
        : 'Choose the branch to pickup your order'
    }
    return language === 'fr' 
      ? 'Choisissez la succursale pour la livraison'
      : 'Choose the branch for delivery'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg mx-auto max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          {/* Back Button and Title */}
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="p-1 h-8 w-8"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <DialogTitle className="text-lg font-bold">
              {chainName} - {getOrderTypeText()}
            </DialogTitle>
          </div>

          <p className="text-sm text-muted-foreground text-left">
            {getDescriptionText()}
          </p>
        </DialogHeader>

        <Separator className="flex-shrink-0" />

        {/* Branch List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="py-4">
            <BranchList 
              branches={branches}
              selectedBranch={selectedBranch}
              onBranchSelect={onBranchSelect}
              loading={loading}
            />
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex-shrink-0 pt-4">
          <Separator className="mb-4" />
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
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
            >
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}