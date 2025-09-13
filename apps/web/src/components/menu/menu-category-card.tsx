"use client"

import React, { useState } from 'react'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Pencil, 
  Trash2, 
  ShieldX, 
  Check
} from 'lucide-react'
import { getIconComponent, DEFAULT_CATEGORY_ICON } from '@/lib/category-icons'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'
import type { MenuCategory } from '@/services/menu.service'

interface MenuCategoryCardProps {
  category: MenuCategory
  onEdit: (category: MenuCategory) => void
  onDelete: (category: MenuCategory) => void
  onToggleAvailability: (categoryId: string) => void
  isLoading?: boolean
}

export const MenuCategoryCard: React.FC<MenuCategoryCardProps> = ({
  category,
  onEdit,
  onDelete,
  onToggleAvailability,
  isLoading = false
}) => {
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  const [isToggling, setIsToggling] = useState(false)

  const handleToggleAvailability = async () => {
    setIsToggling(true)
    try {
      await onToggleAvailability(category.id)
    } catch (error) {
      console.error('Failed to toggle availability:', error)
    } finally {
      setIsToggling(false)
    }
  }

  const handleEdit = () => {
    onEdit(category)
  }

  const handleDelete = () => {
    onDelete(category)
  }


  // Get the icon component
  const IconComponent = getIconComponent(category.icon || DEFAULT_CATEGORY_ICON)

  return (
    <Card className={`${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Top section with icon, info, and badge */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Category Icon */}
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center shrink-0">
            <IconComponent className="w-8 h-8 text-orange-500" />
          </div>
          
          {/* Category Info */}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-medium truncate mb-1">
              {category.name}
            </CardTitle>
            {category.description && (
              <CardDescription className="text-sm line-clamp-2">
                {category.description}
              </CardDescription>
            )}
          </div>
          
          {/* Right side - Badge and Item Count */}
          <div className="flex flex-col items-end gap-3">
            {/* Status Badge - Live Orders Style */}
            <Badge 
              variant={category.is_active ? "default" : "secondary"}
              className={
                category.is_active 
                  ? 'text-green-700 border-green-300 bg-green-100' 
                  : 'text-gray-600 border-gray-200 bg-gray-50'
              }
            >
              {category.is_active 
                ? t.menuManagement.categoriesTab.active
                : t.menuManagement.categoriesTab.inactive
              }
            </Badge>
            
            {/* Item Count */}
            <div className="text-sm text-muted-foreground">
              {category.item_count !== undefined ? category.item_count : '0'} {' '}
              {language === 'fr' 
                ? (category.item_count === 1 ? 'article' : 'articles')
                : (category.item_count === 1 ? 'item' : 'items')
              }
            </div>
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
{t.menuManagement.categoriesTab.edit}
        </Button>
        
        <Button 
          variant="ghost" 
          onClick={handleToggleAvailability}
          disabled={isToggling}
          className="flex-1 rounded-none border-r border-gray-200 dark:border-gray-700 h-12 text-sm font-medium flex items-center justify-center gap-2"
        >
          {category.is_active ? (
            <>
              <ShieldX className="w-4 h-4" />
{t.menuManagement.categoriesTab.deactivate}
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
{t.menuManagement.categoriesTab.activate}
            </>
          )}
        </Button>
        
        <Button 
          variant="ghost" 
          onClick={handleDelete}
          className="flex-1 rounded-none h-12 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
{t.menuManagement.categoriesTab.delete}
        </Button>
      </div>
    </Card>
  )
}