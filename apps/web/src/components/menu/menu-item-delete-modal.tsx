"use client"

import React, { useState } from 'react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Trash2, 
  AlertTriangle,
  ImageIcon
} from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import type { MenuItem } from '@/services/menu.service'

interface MenuItemDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  item: MenuItem | null
  isDeleting?: boolean
}

export const MenuItemDeleteModal: React.FC<MenuItemDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  item,
  isDeleting = false
}) => {
  const { language } = useLanguage()
  const [imageError, setImageError] = useState(false)

  if (!item) return null

  const formatPrice = (price: number) => {
    return language === 'fr' 
      ? `${price.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $`
      : `$${price.toLocaleString('en-CA', { minimumFractionDigits: 2 })}`
  }

  const handleConfirm = async () => {
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      console.error('Delete failed:', error)
      // Error will be handled by parent component
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                {language === 'fr' ? 'Supprimer l\'article' : 'Delete Menu Item'}
              </DialogTitle>
              <DialogDescription>
                {language === 'fr' 
                  ? 'Cette action ne peut pas être annulée.'
                  : 'This action cannot be undone.'
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Item Preview */}
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center gap-4">
            {/* Item Photo */}
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-900/20 rounded-lg overflow-hidden shrink-0">
              {item.image_url && !imageError ? (
                <Image
                  src={item.image_url}
                  alt={item.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                  <ImageIcon className="h-6 w-6 text-gray-400" />
                </div>
              )}
            </div>
            
            {/* Item Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="font-medium text-base truncate flex-1">
                  {item.name}
                </h4>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-bold text-green-700 text-sm">
                    {formatPrice(item.price)}
                  </span>
                </div>
              </div>
              
              {item.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {item.description}
                </p>
              )}

              {/* Category and Status */}
              <div className="flex items-center gap-2">
                {item.category && (
                  <Badge variant="outline" className="text-xs">
                    {item.category.name}
                  </Badge>
                )}
                <Badge 
                  variant={item.is_available ? "default" : "secondary"}
                  className={
                    item.is_available 
                      ? 'text-green-700 border-green-300 bg-green-100' 
                      : 'text-gray-600 border-gray-200 bg-gray-50'
                  }
                >
                  {item.is_available 
                    ? (language === 'fr' ? 'Disponible' : 'Available')
                    : (language === 'fr' ? 'Indisponible' : 'Unavailable')
                  }
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Warning Message */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                {language === 'fr' ? 'Attention' : 'Warning'}
              </p>
              <p className="text-yellow-700 dark:text-yellow-300">
                {language === 'fr' 
                  ? 'La suppression de cet article entraînera également :'
                  : 'Deleting this item will also:'
                }
              </p>
              <ul className="list-disc list-inside mt-2 text-yellow-700 dark:text-yellow-300 space-y-1">
                <li>
                  {language === 'fr' 
                    ? 'Suppression de la photo associée'
                    : 'Delete the associated photo'
                  }
                </li>
                <li>
                  {language === 'fr' 
                    ? 'Suppression de toutes les variantes'
                    : 'Delete all variants'
                  }
                </li>
                <li>
                  {language === 'fr' 
                    ? 'Retrait de l\'historique des commandes'
                    : 'Remove from order history'
                  }
                </li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            {language === 'fr' ? 'Annuler' : 'Cancel'}
          </Button>
          <Button 
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="min-w-[120px] bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                {language === 'fr' ? 'Suppression...' : 'Deleting...'}
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                {language === 'fr' ? 'Supprimer définitivement' : 'Delete Permanently'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}