"use client"

import React, { useState } from 'react'
import Image from 'next/image'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Pencil, 
  Trash2, 
  Eye, 
  EyeOff,
  ImageIcon,
  Tag
} from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'
import type { MenuItem } from '@/services/menu.service'

interface MenuItemCardProps {
  item: MenuItem
  onEdit: (item: MenuItem) => void
  onDelete: (itemId: string) => void
  onToggleAvailability: (itemId: string) => void
  isLoading?: boolean
  showCategory?: boolean
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  onEdit,
  onDelete,
  onToggleAvailability,
  isLoading = false,
  showCategory = true
}) => {
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  const [isToggling, setIsToggling] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleToggleAvailability = async () => {
    setIsToggling(true)
    try {
      await onToggleAvailability(item.id)
    } catch (error) {
      console.error('Failed to toggle availability:', error)
    } finally {
      setIsToggling(false)
    }
  }

  const handleEdit = () => {
    onEdit(item)
  }

  const handleDelete = () => {
    onDelete(item.id) // Modal will be handled by parent
  }

  const formatPrice = (price: number) => {
    return language === 'fr' 
      ? `${price.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $`
      : `$${price.toLocaleString('en-CA', { minimumFractionDigits: 2 })}`
  }


  return (
    <Card className={`h-full flex flex-col ${isLoading ? 'opacity-50 pointer-events-none' : ''} ${!item.is_available ? 'opacity-75' : ''}`}>
      {/* Top section with photo, info, and badge */}
      <div className="p-4 flex-1">
        <div className="h-full flex gap-4">
          {/* Left: Item Photo */}
          <div className="w-24 h-24 bg-gray-50 dark:bg-gray-900/20 rounded-lg overflow-hidden shrink-0">
            {item.image_url && !imageError ? (
              <Image
                src={item.image_url}
                alt={item.name}
                width={96}
                height={96}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                <ImageIcon className="h-10 w-10 text-gray-400" />
              </div>
            )}
          </div>
          
          {/* Middle: Item Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            {/* Title and Description */}
            <div>
              <CardTitle className="text-lg font-semibold truncate mb-1">
                {item.name}
              </CardTitle>
              
              {item.description && (
                <CardDescription className="text-sm line-clamp-2 mb-3">
                  {item.description}
                </CardDescription>
              )}
            </div>

            {/* Bottom Info: Category */}
            <div>
              {/* Category */}
              {showCategory && item.category && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Tag className="h-4 w-4" />
                  <span>{item.category.name}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Right: Badge and Price */}
          <div className="flex flex-col items-end justify-between shrink-0">
            {/* Top: Status Badge */}
            <Badge 
              variant={item.is_available ? "default" : "secondary"}
              className={
                item.is_available 
                  ? 'text-green-700 border-green-300 bg-green-100' 
                  : 'text-gray-600 border-gray-200 bg-gray-50'
              }
            >
              {item.is_available 
                ? t.menuManagement.itemsTab.available
                : t.menuManagement.itemsTab.unavailable
              }
            </Badge>

            {/* Bottom: Price */}
            <div className="flex items-center">
              <span className="font-bold text-green-700 text-lg">
                {formatPrice(item.price)}
              </span>
            </div>

            {/* Variants Count */}
            {item.variants && item.variants.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
{item.variants.length} {t.menuManagement.itemsTab.variantsCount}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Bottom action buttons */}
      <div className="border-t border-gray-200 dark:border-gray-700 flex">
        <Button 
          variant="ghost" 
          onClick={handleEdit}
          className="flex-1 rounded-none border-r border-gray-200 dark:border-gray-700 h-12 text-sm font-medium flex items-center justify-center gap-2"
        >
          <Pencil className="w-4 h-4" />
{t.menuManagement.itemsTab.editItem}
        </Button>
        
        <Button 
          variant="ghost" 
          onClick={handleToggleAvailability}
          disabled={isToggling}
          className="flex-1 rounded-none border-r border-gray-200 dark:border-gray-700 h-12 text-sm font-medium flex items-center justify-center gap-2"
        >
          {isToggling ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
{t.menuManagement.itemsTab.updating}
            </>
          ) : item.is_available ? (
            <>
              <EyeOff className="w-4 h-4" />
{t.menuManagement.itemsTab.hideItem}
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
{t.menuManagement.itemsTab.showItem}
            </>
          )}
        </Button>
        
        <Button 
          variant="ghost" 
          onClick={handleDelete}
          className="flex-1 rounded-none h-12 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
{t.menuManagement.itemsTab.deleteItem}
        </Button>
      </div>
    </Card>
  )
}