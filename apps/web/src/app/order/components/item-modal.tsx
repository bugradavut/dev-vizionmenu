"use client"

import { useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Minus } from 'lucide-react'
import { useCart } from '../contexts/cart-context'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'

interface MenuItemUI {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  image_url?: string;
  is_available: boolean;
  allergens?: string[];
  dietary_info?: string[];
  preparation_time?: number;
}

interface ItemModalProps {
  item: MenuItemUI | null
  isOpen: boolean
  onClose: () => void
}

export function ItemModal({ item, isOpen, onClose }: ItemModalProps) {
  const [quantity, setQuantity] = useState(1)
  const { addItem, getItemQuantity } = useCart()
  const { language } = useLanguage()
  const t = translations[language] || translations.en

  if (!item) return null

  const currentQuantity = getItemQuantity(item.id)

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        image_url: item.image_url,
        category_id: item.category_id
      })
    }
    onClose()
    setQuantity(1) // Reset quantity
  }

  const incrementQuantity = () => setQuantity(prev => prev + 1)
  const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{item.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Item Image */}
          {item.image_url && (
            <div className="aspect-video bg-gray-100 overflow-hidden rounded-lg relative">
              <Image
                src={item.image_url}
                alt={item.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 400px"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          
          {/* Description */}
          <p className="text-gray-600 text-sm leading-relaxed">
            {item.description}
          </p>
          
          {/* Dietary Info */}
          {item.dietary_info && item.dietary_info.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.dietary_info.map((info: string) => (
                <Badge key={info} variant="secondary" className="text-xs">
                  {info}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Allergens */}
          {item.allergens && item.allergens.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">{t.orderPage.itemModal.allergens}:</p>
              <div className="flex flex-wrap gap-2">
                {item.allergens.map((allergen: string) => (
                  <Badge key={allergen} variant="outline" className="text-xs text-red-600 border-red-200">
                    {allergen}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Preparation Time */}
          {item.preparation_time && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>⏱️ {t.orderPage.itemModal.prepTime}: {item.preparation_time} {t.orderPage.itemModal.minutes}</span>
            </div>
          )}
          
          {/* Price & Quantity Controls */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-2xl font-bold text-gray-900">
              {language === 'fr' ? `${item.price.toFixed(2)} $` : `$${item.price.toFixed(2)}`}
            </div>
            
            {/* Quantity Controls */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={decrementQuantity}
                disabled={quantity <= 1}
                className="w-8 h-8 p-0"
              >
                <Minus className="w-4 h-4" />
              </Button>
              
              <span className="text-lg font-medium min-w-[2rem] text-center">
                {quantity}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={incrementQuantity}
                className="w-8 h-8 p-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Add to Cart Button */}
          <Button
            onClick={handleAddToCart}
            disabled={!item.is_available}
            className="w-full h-12 text-base font-medium"
            size="lg"
          >
            {!item.is_available ? (
              t.orderPage.itemModal.unavailable
            ) : currentQuantity > 0 ? (
              t.orderPage.itemModal.addMore.replace('{quantity}', quantity.toString()).replace('{current}', currentQuantity.toString())
            ) : (
              t.orderPage.itemModal.addToCart.replace('{quantity}', quantity.toString())
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}