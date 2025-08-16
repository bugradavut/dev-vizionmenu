"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover'
import { Search, ChevronDown } from 'lucide-react'
import { getIconComponent, CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from '@/lib/category-icons'
import { useLanguage } from '@/contexts/language-context'

interface CategoryIconPickerProps {
  value?: string
  onValueChange: (iconKey: string) => void
  disabled?: boolean
  compact?: boolean
}

export const CategoryIconPicker: React.FC<CategoryIconPickerProps> = ({
  value = DEFAULT_CATEGORY_ICON,
  onValueChange,
  disabled = false,
  compact = false
}) => {
  const { language } = useLanguage()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Filter icons based on search query
  const filteredIcons = Object.entries(CATEGORY_ICONS).filter(([key, iconData]) => {
    const searchTerm = searchQuery.toLowerCase()
    return (
      key.toLowerCase().includes(searchTerm) ||
      (iconData.label && iconData.label.toLowerCase().includes(searchTerm)) ||
      (iconData.category && iconData.category.toLowerCase().includes(searchTerm))
    )
  })

  const handleIconSelect = (iconKey: string) => {
    onValueChange(iconKey)
    setOpen(false)
    setSearchQuery('')
  }

  const selectedIcon = CATEGORY_ICONS[value as keyof typeof CATEGORY_ICONS] || CATEGORY_ICONS[DEFAULT_CATEGORY_ICON as keyof typeof CATEGORY_ICONS]
  const SelectedIconComponent = getIconComponent(value || DEFAULT_CATEGORY_ICON)

  if (compact) {
    // Compact mode: sadece icon button
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="icon"
            className="w-10 h-10 rounded-full border-dashed hover:border-solid"
            disabled={disabled}
          >
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-primary">
              <SelectedIconComponent className="w-3 h-3" />
            </div>
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-0" align="start" sideOffset={5}>
          <div className="max-h-80 flex flex-col">
            {/* Search input - fixed at top */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={
                    language === 'fr' 
                      ? 'Rechercher...' 
                      : 'Search...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-8"
                />
              </div>
            </div>
            
            {/* Icons grid - scrollable */}
            <div 
              className="flex-1 overflow-y-scroll p-3"
              style={{ scrollBehavior: 'smooth' }}
              onWheel={(e) => {
                // Ensure wheel events work properly
                e.stopPropagation()
              }}
            >
              {filteredIcons.length > 0 ? (
                <div className="grid grid-cols-4 gap-1.5">
                  {filteredIcons.map(([iconKey, iconData]) => {
                    const IconComponent = getIconComponent(iconKey)
                    const isSelected = value === iconKey
                    
                    return (
                      <Button
                        key={iconKey}
                        variant="ghost"
                        size="sm"
                        className={`
                          h-16 w-full flex flex-col items-center justify-center gap-1 p-2
                          hover:bg-primary/10 hover:text-primary rounded-md
                          ${isSelected ? 'bg-primary/20 text-primary ring-2 ring-primary' : ''}
                        `}
                        onClick={() => handleIconSelect(iconKey)}
                        title={iconData.label}
                      >
                        <IconComponent className="w-6 h-6 !w-6 !h-6" />
                        <span className="text-[9px] leading-none truncate w-full text-center max-w-full">
                          {iconData.label.length > 8 ? iconData.label.substring(0, 8) + '...' : iconData.label}
                        </span>
                      </Button>
                    )
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {language === 'fr' 
                    ? 'Aucune icône trouvée' 
                    : 'No icons found'
                  }
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <div className="space-y-2">
      <Label>
        {language === 'fr' ? 'Icône de la catégorie' : 'Category Icon'}
      </Label>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto py-3"
            disabled={disabled}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-primary">
                <SelectedIconComponent className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">{selectedIcon.label}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {selectedIcon.category}
                </div>
              </div>
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-0" align="start" sideOffset={5}>
          <div className="max-h-80 flex flex-col">
            {/* Search input - fixed at top */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={
                    language === 'fr' 
                      ? 'Rechercher...' 
                      : 'Search...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-8"
                />
              </div>
            </div>
            
            {/* Icons grid - scrollable */}
            <div 
              className="flex-1 overflow-y-scroll p-3"
              style={{ scrollBehavior: 'smooth' }}
              onWheel={(e) => {
                // Ensure wheel events work properly
                e.stopPropagation()
              }}
            >
              {filteredIcons.length > 0 ? (
                <div className="grid grid-cols-4 gap-1.5">
                  {filteredIcons.map(([iconKey, iconData]) => {
                    const IconComponent = getIconComponent(iconKey)
                    const isSelected = value === iconKey
                    
                    return (
                      <Button
                        key={iconKey}
                        variant="ghost"
                        size="sm"
                        className={`
                          h-16 w-full flex flex-col items-center justify-center gap-1 p-2
                          hover:bg-primary/10 hover:text-primary rounded-md
                          ${isSelected ? 'bg-primary/20 text-primary ring-2 ring-primary' : ''}
                        `}
                        onClick={() => handleIconSelect(iconKey)}
                        title={iconData.label}
                      >
                        <IconComponent className="w-6 h-6 !w-6 !h-6" />
                        <span className="text-[9px] leading-none truncate w-full text-center max-w-full">
                          {iconData.label.length > 8 ? iconData.label.substring(0, 8) + '...' : iconData.label}
                        </span>
                      </Button>
                    )
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {language === 'fr' 
                    ? 'Aucune icône trouvée' 
                    : 'No icons found'
                  }
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      <p className="text-sm text-muted-foreground">
        {language === 'fr' 
          ? 'Choisissez une icône qui représente votre catégorie'
          : 'Choose an icon that represents your category'
        }
      </p>
    </div>
  )
}