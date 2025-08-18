"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import { useCart } from '../contexts/cart-context'
import { customerMenuService, type CustomerMenu } from '@/services/customer-menu.service'
import { getIconComponent } from '@/lib/category-icons'
import { ItemModal } from './item-modal'
import { cn } from '@/lib/utils'

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
  const { addItem, getItemQuantity } = useCart()

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
          <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-32 mb-6"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-square bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Set Menu Available</h3>
          <p className="text-gray-600">There are no active menu presets at this time.</p>
        </div>
      </div>
    )
  }

  if (filteredItems.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Items Found</h3>
          <p className="text-gray-600">
            {searchQuery.trim() 
              ? `No items found matching "${searchQuery}"`
              : selectedCategory === 'all' 
                ? 'No menu items are currently available.'
                : 'No menu items available in this category.'
            }
          </p>
        </div>
      </div>
    )
  }

  const getCategoryTitle = () => {
    if (searchQuery.trim()) {
      return `Search Results for "${searchQuery}"`
    }
    if (selectedCategory === 'all') return 'All Menu'
    if (selectedCategory === 'set') {
      return customerMenu?.metadata.activePreset?.name || 'Set Menu'
    }
    const category = customerMenu?.categories.find(cat => cat.id === selectedCategory)
    return category?.name || selectedCategory
  }

  return (
    <div className="p-6">
      {/* Category Title */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {getCategoryTitle()}
        </h2>
        <div className="flex items-center gap-4 text-gray-600">
          <span>{filteredItems.length} items available</span>
          {selectedCategory === 'set' && customerMenu?.metadata.activePreset && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="text-blue-700 border-blue-300">
                {customerMenu.metadata.activePreset.schedule_type === 'daily' ? 'Daily Special' : 'Limited Time'}
              </Badge>
              {customerMenu.metadata.activePreset.daily_start_time && customerMenu.metadata.activePreset.daily_end_time && (
                <span className="text-gray-500">
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
                      <h3 className="text-2xl font-bold text-gray-900">
                        {category?.name || 'Other'}
                      </h3>
                      <p className="text-sm text-gray-600 -mt-1">
                        {items.length} {items.length === 1 ? 'item' : 'items'} available
                      </p>
                    </div>
                    
                  </div>
                  
                  {/* Gradient Divider */}
                  <div className="h-px bg-gradient-to-r from-orange-200 via-gray-200 to-transparent"></div>
                </div>
                
                {/* Category Items Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {items.map((item) => {
                    const itemQuantity = getItemQuantity(item.id)
                    
                    return (
                      <Card 
                        key={item.id} 
                        className="rounded-xl border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer group"
                        onClick={() => handleItemClick(item)}
                      >
                        <div className="relative p-2">
                          {/* Item Image - Smaller */}
                          <div className="aspect-[4/3] bg-gray-100 overflow-hidden relative rounded-xl">
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
                              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                <span className="text-gray-400 text-sm font-medium">No Image</span>
                              </div>
                            )}
                          </div>

                          {/* Quantity Badge */}
                          {itemQuantity > 0 && (
                            <div className="absolute top-2 right-2">
                              <Badge className="bg-primary text-white">
                                {itemQuantity}
                              </Badge>
                            </div>
                          )}

                          {/* Availability Status */}
                          {!item.is_available && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                              <span className="text-white font-medium">Unavailable</span>
                            </div>
                          )}
                        </div>

                        <CardContent className="p-3">
                          {/* Item Info - Left/Right Layout */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">{item.name}</h3>
                              <p className="text-xs text-gray-600 line-clamp-2">{item.description}</p>
                            </div>
                            
                            {/* Price - Right Side */}
                            <div className="text-sm font-semibold text-gray-900 ml-2 flex-shrink-0">
                              ${item.price.toFixed(2)}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => {
            const itemQuantity = getItemQuantity(item.id)
            
            return (
              <Card 
                key={item.id} 
                className="rounded-xl border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer group"
                onClick={() => handleItemClick(item)}
              >
                <div className="relative p-2">
                  {/* Item Image - Smaller */}
                  <div className="aspect-[4/3] bg-gray-100 overflow-hidden relative rounded-xl">
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
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <span className="text-gray-400 text-sm font-medium">No Image</span>
                      </div>
                    )}
                  </div>

                  {/* Quantity Badge */}
                  {itemQuantity > 0 && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-primary text-white">
                        {itemQuantity}
                      </Badge>
                    </div>
                  )}

                  {/* Availability Status */}
                  {!item.is_available && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="text-white font-medium">Unavailable</span>
                    </div>
                  )}
                </div>

                <CardContent className="p-3">
                  {/* Item Info - Left/Right Layout */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">{item.name}</h3>
                      <p className="text-xs text-gray-600 line-clamp-2">{item.description}</p>
                    </div>
                    
                    {/* Price - Right Side */}
                    <div className="text-sm font-semibold text-gray-900 ml-2 flex-shrink-0">
                      ${item.price.toFixed(2)}
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