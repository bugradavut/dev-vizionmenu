"use client"

import React, { useState } from 'react'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Pencil,
  Trash2,
  Tag,
  ImageIcon
} from 'lucide-react'
import { getIconComponent, DEFAULT_CATEGORY_ICON } from '@/lib/category-icons'
import { useLanguage } from '@/contexts/language-context'

interface ChainTemplate {
  id: string
  name: string
  description?: string
  icon?: string
  template_type: 'category' | 'item'
  items_count: number
  created_at: string
  updated_at: string
  version: number
  price?: number
  image_url?: string
  category_name?: string
}

interface TemplateCardProps {
  template: ChainTemplate
  onEdit: (template: ChainTemplate) => void
  onDelete: (template: ChainTemplate) => void
  isLoading?: boolean
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onEdit,
  onDelete,
  isLoading = false
}) => {
  const { language } = useLanguage()
  const [imageError, setImageError] = useState(false)

  const handleEdit = () => {
    onEdit(template)
  }

  const handleDelete = () => {
    onDelete(template)
  }

  // Get icon component
  const IconComponent = getIconComponent(template.icon || DEFAULT_CATEGORY_ICON)

  // Format price for items
  const formatPrice = (price: number) => {
    return language === 'fr'
      ? `${price.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $`
      : `$${price.toLocaleString('en-CA', { minimumFractionDigits: 2 })}`
  }


  // Render different layouts for category vs item templates
  if (template.template_type === 'item') {
    return (
      <Card className={`h-full flex flex-col ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Top section with photo, info, and badge - Item style */}
        <div className="p-4 flex-1">
          <div className="h-full flex gap-4">
            {/* Left: Item Photo */}
            <div className="w-24 h-24 bg-gray-50 dark:bg-gray-900/20 rounded-lg overflow-hidden shrink-0">
              {template.image_url && !imageError ? (
                <img
                  src={template.image_url}
                  alt={template.name}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                  style={{ display: 'block' }}
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
                  {template.name}
                </CardTitle>

                {template.description && (
                  <CardDescription className="text-sm line-clamp-2 mb-3">
                    {template.description}
                  </CardDescription>
                )}
              </div>

              {/* Bottom Info: Category */}
              <div>
                {template.category_name && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Tag className="h-4 w-4" />
                    <span>{template.category_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Price */}
            <div className="flex flex-col items-end justify-end shrink-0">
              {/* Price at bottom */}
              {template.price && (
                <div className="flex items-center">
                  <span className="font-bold text-green-700 text-lg">
                    {formatPrice(template.price)}
                  </span>
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
            disabled={isLoading}
          >
            <Pencil className="w-4 h-4" />
            {language === 'fr' ? 'Modifier' : 'Edit'}
          </Button>

          <Button
            variant="ghost"
            onClick={handleDelete}
            disabled={isLoading}
            className="flex-1 rounded-none h-12 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {language === 'fr' ? 'Supprimer' : 'Delete'}
          </Button>
        </div>
      </Card>
    )
  }

  // Category template layout (existing)
  return (
    <Card className={`${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Top section with icon, info, and badge */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Template Icon */}
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center shrink-0">
            <IconComponent className="w-8 h-8 text-orange-500" />
          </div>

          {/* Template Info */}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-medium truncate mb-1">
              {template.name}
            </CardTitle>
            {template.description && (
              <CardDescription className="text-sm line-clamp-2">
                {template.description}
              </CardDescription>
            )}
          </div>

          {/* Right side - Item Count Badge */}
          <div className="flex flex-col items-end gap-3">
            {/* Item Count as Badge - Note: items_count from backend may not be accurate */}
            <Badge
              variant="secondary"
              className="text-gray-600 border-gray-200 bg-gray-50"
            >
              {template.items_count || 0} {' '}
              {language === 'fr'
                ? ((template.items_count || 0) === 1 ? 'article' : 'articles')
                : ((template.items_count || 0) === 1 ? 'item' : 'items')
              }
            </Badge>
          </div>
        </div>
      </div>

      {/* Bottom action buttons - 2 equal buttons */}
      <div className="border-t border-gray-200 dark:border-gray-700 flex">
        <Button
          variant="ghost"
          onClick={handleEdit}
          className="flex-1 rounded-none border-r border-gray-200 dark:border-gray-700 h-12 text-sm font-medium flex items-center justify-center gap-2"
          disabled={isLoading}
        >
          <Pencil className="w-4 h-4" />
          {language === 'fr' ? 'Modifier' : 'Edit'}
        </Button>

        <Button
          variant="ghost"
          onClick={handleDelete}
          disabled={isLoading}
          className="flex-1 rounded-none h-12 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          {language === 'fr' ? 'Supprimer' : 'Delete'}
        </Button>
      </div>
    </Card>
  )
}