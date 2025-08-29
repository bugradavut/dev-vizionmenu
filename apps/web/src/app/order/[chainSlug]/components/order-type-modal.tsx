"use client"

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ShoppingBag, Truck } from 'lucide-react'
import { OrderType } from '../types/order-flow.types'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'

interface OrderTypeModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectOrderType: (type: OrderType) => void
  chainName: string
}

export function OrderTypeModal({
  isOpen,
  onClose,
  onSelectOrderType,
  chainName
}: OrderTypeModalProps) {
  const { language } = useLanguage()
  const t = translations[language] || translations.en

  const handleSelectType = (type: OrderType) => {
    onSelectOrderType(type)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-auto">
        <DialogHeader className="text-center pb-4">
          <DialogTitle className="text-xl font-bold">
            {chainName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {language === 'fr' ? 'Choisissez votre type de commande' : 'Choose your order type'}
          </p>
        </DialogHeader>

        <div className="space-y-3">
          {/* Takeout Option */}
          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors border-2 hover:border-primary/20"
            onClick={() => handleSelectType('takeout')}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base">
                    {language === 'fr' ? 'À emporter' : 'Takeout'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === 'fr' 
                      ? 'Commandez et récupérez en magasin'
                      : 'Order and pickup in-store'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Option */}
          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors border-2 hover:border-primary/20"
            onClick={() => handleSelectType('delivery')}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Truck className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base">
                    {language === 'fr' ? 'Livraison' : 'Delivery'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === 'fr' 
                      ? 'Livraison à votre adresse'
                      : 'Delivered to your address'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-4" />

        <div className="flex justify-center">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="text-sm"
          >
            {language === 'fr' ? 'Annuler' : 'Cancel'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}