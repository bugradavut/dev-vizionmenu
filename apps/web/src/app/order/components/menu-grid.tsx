"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCart } from '../contexts/cart-context'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'
import { useResponsiveClasses } from '@/hooks/use-responsive'
import { customerMenuService, type CustomerMenu } from '@/services/customer-menu.service'
import { getIconComponent } from '@/lib/category-icons'
import { ItemModal } from './item-modal'

interface MenuGridProps {
  selectedCategory: string
  customerMenu?: CustomerMenu | null
  loading?: boolean
  searchQuery?: string
}

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

export function MenuGrid({ selectedCategory, customerMenu, loading = false, searchQuery = '' }: MenuGridProps) {
  const [filteredItems, setFilteredItems] = useState<MenuItemUI[]>([])
  const [groupedItems, setGroupedItems] = useState<{[categoryId: string]: MenuItemUI[]}>({})
  const [selectedItem, setSelectedItem] = useState<MenuItemUI | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { getItemQuantity, canAddToCart } = useCart()
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  
  // Centralized responsive state
  const responsiveClasses = useResponsiveClasses()

  // Filter items based on selected category, customer menu, and search query
  useEffect(() => {
    if (!customerMenu) {
      setFilteredItems([])
      setGroupedItems({})
      return
    }

    let items = customerMenuService.getItemsByCategory(customerMenu, selectedCategory)
    
    // Apply search filter if search query exists
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      items = items.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      )
    }
    
    setFilteredItems(items)

    // Group items by category for "all" view
    if (selectedCategory === 'all') {
      const grouped = items.reduce((acc, item) => {
        const categoryId = item.category_id
        if (!acc[categoryId]) {
          acc[categoryId] = []
        }
        acc[categoryId].push(item)
        return acc
      }, {} as {[categoryId: string]: MenuItemUI[]})
      
      setGroupedItems(grouped)
    } else {
      setGroupedItems({})
    }
  }, [selectedCategory, customerMenu, searchQuery])

  const handleItemClick = (item: MenuItemUI) => {
    setSelectedItem(item)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedItem(null)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-48 mb-2"></div>
          <div className="h-4 bg-muted rounded w-32 mb-6"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-square bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-8 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (selectedCategory === 'set' && (!customerMenu?.metadata.activePreset)) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground mb-2">{t.orderPage.menu.noSetMenu}</h3>
          <p className="text-muted-foreground">{t.orderPage.menu.noActivePresets}</p>
        </div>
      </div>
    )
  }

  if (filteredItems.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground mb-2">{t.orderPage.menu.noItemsFound}</h3>
          <p className="text-muted-foreground">
            {searchQuery.trim() 
              ? t.orderPage.menu.noSearchResults.replace('{query}', searchQuery)
              : selectedCategory === 'all' 
                ? t.orderPage.menu.noMenuItems
                : t.orderPage.menu.noCategoryItems
            }
          </p>
        </div>
      </div>
    )
  }

  const getCategoryTitle = () => {
    if (searchQuery.trim()) {
      return t.orderPage.menu.searchResults.replace('{query}', searchQuery)
    }
    if (selectedCategory === 'all') return t.orderPage.menu.allMenu
    if (selectedCategory === 'set') {
      return customerMenu?.metadata.activePreset?.name || t.orderPage.menu.setMenu
    }
    const category = customerMenu?.categories.find(cat => cat.id === selectedCategory)
    return category?.name || selectedCategory
  }

  return (
    <div className={responsiveClasses.padding.container}>
      {/* Category Title */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">
          {getCategoryTitle()}
        </h2>
        <div className="flex items-center gap-4 text-muted-foreground">
          <span>{filteredItems.length} {t.orderPage.menu.itemsAvailable}</span>
          {selectedCategory === 'set' && customerMenu?.metadata.activePreset && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                {customerMenu.metadata.activePreset.schedule_type === 'daily' ? t.orderPage.menu.dailySpecial : t.orderPage.menu.limitedTime}
              </Badge>
              {customerMenu.metadata.activePreset.daily_start_time && customerMenu.metadata.activePreset.daily_end_time && (
                <span className="text-muted-foreground">
                  {customerMenu.metadata.activePreset.daily_start_time} - {customerMenu.metadata.activePreset.daily_end_time}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Menu Items */}
      {selectedCategory === 'all' && Object.keys(groupedItems).length > 0 ? (
        // Grouped by Category View for "All Menu"
        <div className="space-y-8">
          {Object.entries(groupedItems).map(([categoryId, items]) => {
            const category = customerMenu?.categories.find(cat => cat.id === categoryId)
            
            return (
              <div key={categoryId}>
                {/* Category Section Header - Enhanced */}
                <div className="mb-6">
                  <div className="flex items-center gap-4 mb-4">
                    {/* Category Icon */}
                    <div className="w-12 h-12 border dark:bg-blue-900/20 rounded-xl flex items-center justify-center shadow-sm">
                      {category?.icon && (() => {
                        const Icon = getIconComponent(category.icon)
                        return <Icon className="w-6 h-6 text-orange-500" />
                      })()}
                    </div>
                    
                    {/* Category Title & Item Count */}
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-foreground">
                        {category?.name || 'Other'}
                      </h3>
                      <p className="text-sm text-muted-foreground -mt-1">
                        {items.length} {items.length === 1 ? t.orderPage.menu.item : t.orderPage.menu.items} {t.orderPage.menu.available}
                      </p>
                    </div>
                    
                  </div>
                  
                  {/* Gradient Divider */}
                  <div className="h-px bg-gradient-to-r from-orange-200 via-border to-transparent"></div>
                </div>
                
                {/* Category Items Grid */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${responsiveClasses.grid.cols} ${responsiveClasses.grid.gap}`}>
                  {items.map((item) => {
                    const itemQuantity = getItemQuantity(item.id)
                    
                    return (
                      <Card
                        key={item.id}
                        className={`rounded-xl border border-border transition-colors group bg-card ${
                          !canAddToCart || !item.is_available
                            ? 'opacity-60 cursor-not-allowed'
                            : 'hover:border-border/80 cursor-pointer'
                        }`}
                        onClick={() => canAddToCart && item.is_available && handleItemClick(item)}
                      >
                        <div className="relative p-2">
                          {/* Item Image - Smaller */}
                          <div className="aspect-[4/3] bg-muted overflow-hidden relative rounded-xl">
                            {item.image_url ? (
                              <Image
                                src={item.image_url}
                                alt={item.name}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted">
                                <span className="text-muted-foreground text-sm font-medium">{t.orderPage.menu.noImage}</span>
                              </div>
                            )}
                          </div>

                          {/* Quantity Badge */}
                          {itemQuantity > 0 && (
                            <div className="absolute top-3 right-3">
                              <div className="bg-orange-500 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white shadow-lg">
                                {itemQuantity}
                              </div>
                            </div>
                          )}

                          {/* Availability Status */}
                          {!item.is_available && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-xl">
                              <span className="text-white font-medium">{t.orderPage.menu.unavailable}</span>
                            </div>
                          )}

                          {/* Restaurant Closed Overlay */}
                          {!canAddToCart && item.is_available && (
                            <div className="absolute inset-0 bg-red-500 bg-opacity-20 flex items-center justify-center rounded-xl">
                              <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                                {language === 'fr' ? 'Fermé' : 'Closed'}
                              </div>
                            </div>
                          )}
                        </div>

                        <CardContent className={responsiveClasses.padding.card}>
                          {/* Item Info - Left/Right Layout */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-foreground mb-1 line-clamp-1">{item.name}</h3>
                              <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                            </div>
                            
                            {/* Price - Right Side */}
                            <div className="text-sm font-semibold text-foreground ml-2 flex-shrink-0">
                              {language === 'fr' ? `${item.price.toFixed(2)} $` : `$${item.price.toFixed(2)}`}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        // Regular Grid View for Specific Categories
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${responsiveClasses.grid.cols} ${responsiveClasses.grid.gap}`}>
          {filteredItems.map((item) => {
            const itemQuantity = getItemQuantity(item.id)
            
            return (
              <Card
                key={item.id}
                className={`rounded-xl border border-border transition-colors group bg-card ${
                  !canAddToCart || !item.is_available
                    ? 'opacity-60 cursor-not-allowed'
                    : 'hover:border-border/80 cursor-pointer'
                }`}
                onClick={() => canAddToCart && item.is_available && handleItemClick(item)}
              >
                <div className="relative p-2">
                  {/* Item Image - Smaller */}
                  <div className="aspect-[4/3] bg-muted overflow-hidden relative rounded-xl">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <span className="text-muted-foreground text-sm font-medium">{t.orderPage.menu.noImage}</span>
                      </div>
                    )}
                  </div>

                  {/* Quantity Badge */}
                  {itemQuantity > 0 && (
                    <div className="absolute top-3 right-3">
                      <div className="bg-orange-500 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white shadow-lg">
                        {itemQuantity}
                      </div>
                    </div>
                  )}

                  {/* Availability Status */}
                  {!item.is_available && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-xl">
                      <span className="text-white font-medium">{t.orderPage.menu.unavailable}</span>
                    </div>
                  )}

                  {/* Restaurant Closed Overlay */}
                  {!canAddToCart && item.is_available && (
                    <div className="absolute inset-0 bg-red-500 bg-opacity-20 flex items-center justify-center rounded-xl">
                      <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        {language === 'fr' ? 'Fermé' : 'Closed'}
                      </div>
                    </div>
                  )}
                </div>

                <CardContent className={responsiveClasses.padding.card}>
                  {/* Item Info - Left/Right Layout */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground mb-1 line-clamp-1">{item.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                    </div>
                    
                    {/* Price - Right Side */}
                    <div className="text-sm font-semibold text-foreground ml-2 flex-shrink-0">
                      {language === 'fr' ? `${item.price.toFixed(2)} $` : `$${item.price.toFixed(2)}`}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      
      {/* Item Modal */}
      <ItemModal 
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  )
}