"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { 
  Plus, 
  Search,
  Loader2
} from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'
import { menuService, type MenuItem, type MenuCategory } from '@/services/menu.service'
import { MenuItemCard } from './menu-item-card'
import { MenuItemCreateModal } from './menu-item-create-modal'
import { MenuItemDeleteModal } from './menu-item-delete-modal'

export function ItemsTab() {
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  
  // State management
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all')
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [itemToEdit, setItemToEdit] = useState<MenuItem | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filter items based on search query, category, and availability
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Fix category filtering - use nested category.id if category_id is missing
    const itemCategoryId = item.category_id || item.category?.id || null
    
    const matchesCategory = selectedCategory === 'all' || 
                           (selectedCategory === 'uncategorized' && !itemCategoryId) ||
                           itemCategoryId === selectedCategory
    
    const matchesAvailability = availabilityFilter === 'all' ||
                               (availabilityFilter === 'available' && item.is_available) ||
                               (availabilityFilter === 'unavailable' && !item.is_available)
    
    // Debug logging for category filtering issues
    if (selectedCategory !== 'all' && selectedCategory !== 'uncategorized') {
      console.log('Debug category filter:', {
        itemName: item.name,
        itemCategoryId: item.category_id,
        nestedCategoryId: item.category?.id,
        nestedCategoryName: item.category?.name,
        finalItemCategoryId: itemCategoryId,
        selectedCategory,
        matchesCategory
      })
    }
    
    return matchesSearch && matchesCategory && matchesAvailability
  })

  // Load items and categories
  const loadData = async () => {
    try {
      setIsLoading(true)
      const [itemsResponse, categoriesResponse] = await Promise.all([
        menuService.getMenuItems({ includeVariants: true }), // Include all items regardless of availability
        menuService.getCategories({ includeInactive: true }) // Include inactive categories too
      ])
      
      if (itemsResponse.data) {
        setItems(itemsResponse.data)
      }
      if (categoriesResponse.data) {
        setCategories(categoriesResponse.data)
      }
    } catch (error) {
      console.error('Failed to load items data:', error)
    } finally {
      setIsLoading(false)
    }
  }


  // Handle item toggle
  const handleItemToggle = async (itemId: string) => {
    try {
      await menuService.toggleMenuItemAvailability(itemId)
      // Re-fetch items to get updated state
      await loadData()
    } catch (error) {
      console.error('Failed to toggle item:', error)
      // TODO: Show error toast
    }
  }

  // Handle item edit
  const handleItemEdit = (item: MenuItem) => {
    setItemToEdit(item)
    setIsEditModalOpen(true)
  }

  // Handle item delete
  const handleItemDelete = (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (item) {
      setItemToDelete(item)
      setIsDeleteModalOpen(true)
    }
  }

  // Confirm delete
  const confirmDelete = async () => {
    if (!itemToDelete) return
    
    setIsDeleting(true)
    try {
      await menuService.deleteMenuItem(itemToDelete.id)
      await loadData() // Refresh list
      setIsDeleteModalOpen(false)
      setItemToDelete(null)
      // TODO: Show success toast
    } catch (error) {
      console.error('Failed to delete item:', error)
      // TODO: Show error toast
    } finally {
      setIsDeleting(false)
    }
  }

  // Close delete modal
  const closeDeleteModal = () => {
    if (isDeleting) return // Prevent closing during deletion
    setIsDeleteModalOpen(false)
    setItemToDelete(null)
  }

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header - responsive layout */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        {/* Title and description */}
        <div className="space-y-1 flex-shrink-0">
          <h2 className="text-xl font-semibold tracking-tight">
            {t.navigation.items}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t.menuManagement.itemsTab.subtitle}
          </p>
        </div>

        {/* Search and actions */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-2">
          {/* Search bar */}
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t.menuManagement.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Action buttons - all in one row on mobile/tablet */}
          <div className="flex gap-2">
            {/* Filter Sheet */}
            <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 flex-1 sm:flex-none">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-7 h-7 text-[#424245] dark:text-[#86868b]">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                    </svg>
                  </Button>
                </SheetTrigger>
                <SheetContent className="flex flex-col">
                  <SheetHeader>
                    <SheetTitle>{t.menuManagement.itemsTab.filters}</SheetTitle>
                    <SheetDescription>
                      {language === 'fr' ? 'Filtrez les articles par catégorie et statut.' : 'Filter items by category and status.'}
                    </SheetDescription>
                  </SheetHeader>

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto">
                    <div className="grid gap-6 py-6">
                      
                      {/* Category Filter */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-foreground">
                          {language === 'fr' ? 'Catégorie' : 'Category'}
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant={selectedCategory === 'all' ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedCategory('all')}
                            className="justify-start h-auto py-2"
                          >
                            {t.menuManagement.itemsTab.allCategories}
                          </Button>
                          <Button
                            variant={selectedCategory === 'uncategorized' ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedCategory('uncategorized')}
                            className="justify-start h-auto py-2"
                          >
                            {t.menuManagement.itemsTab.uncategorized}
                          </Button>
                          {categories.map((category) => (
                            <Button
                              key={category.id}
                              variant={selectedCategory === category.id ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedCategory(category.id)}
                              className="justify-start h-auto py-2"
                            >
                              {category.name}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Active/Inactive Filter */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-foreground">
                          {language === 'fr' ? 'Articles' : 'Items'}
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant={availabilityFilter === 'available' ? "default" : "outline"}
                            size="sm"
                            onClick={() => setAvailabilityFilter('available')}
                            className="justify-start h-auto py-2"
                          >
                            {language === 'fr' ? 'Articles actifs' : 'Active Items'}
                          </Button>
                          <Button
                            variant={availabilityFilter === 'unavailable' ? "default" : "outline"}
                            size="sm"
                            onClick={() => setAvailabilityFilter('unavailable')}
                            className="justify-start h-auto py-2"
                          >
                            {language === 'fr' ? 'Articles inactifs' : 'Inactive Items'}
                          </Button>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCategory('all');
                        setAvailabilityFilter('all');
                        setIsFilterSheetOpen(false);
                      }}
                      className="flex-1"
                    >
                      {language === 'fr' ? 'Réinitialiser' : 'Clear All'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setIsFilterSheetOpen(false)}
                      className="flex-1"
                    >
                      {language === 'fr' ? 'Appliquer' : 'Apply Filters'}
                    </Button>
                  </div>
                </SheetContent>
            </Sheet>

            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="text-xs sm:text-sm flex-1 sm:flex-none h-9"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              {language === 'fr' ? 'Ajouter Article' : 'Add Item'}
            </Button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-muted-foreground">{t.common.loading}</span>
        </div>
      ) : (
        <>
          {/* Items grid */}
          {filteredItems.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => (
                <MenuItemCard 
                  key={item.id} 
                  item={item}
                  onEdit={handleItemEdit}
                  onDelete={handleItemDelete}
                  onToggleAvailability={handleItemToggle}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery || selectedCategory !== 'all' || availabilityFilter !== 'all'
                  ? t.menuManagement.itemsTab.noItemsFound
                  : t.menuManagement.itemsTab.noItemsCreated
                }
              </p>
              {!searchQuery && selectedCategory === 'all' && availabilityFilter === 'all' && (
                <Button 
                  className="mt-4" 
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t.menuManagement.newItem}
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {/* Create item modal */}
      <MenuItemCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={async (data, photo) => {
          try {
            setIsLoading(true)
            
            // Create menu item with photo
            const response = await menuService.createMenuItem(data, photo || undefined)
            
            if (response.data) {
              // Reload items to show the new item
              await loadData()
              setIsCreateModalOpen(false)
              // TODO: Show success toast
            }
          } catch (error) {
            console.error('Failed to create menu item:', error)
            // TODO: Show error toast
          } finally {
            setIsLoading(false)
          }
        }}
        categories={categories}
      />

      {/* Edit item modal */}
      <MenuItemCreateModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setItemToEdit(null)
        }}
        onSubmit={async (data, photo) => {
          if (!itemToEdit) return
          
          try {
            setIsLoading(true)
            
            // Update menu item with photo
            const response = await menuService.updateMenuItem(itemToEdit.id, data, photo || undefined)
            
            if (response.data) {
              // Reload items to show the updated item
              await loadData()
              setIsEditModalOpen(false)
              setItemToEdit(null)
              // TODO: Show success toast
            }
          } catch (error) {
            console.error('Failed to update menu item:', error)
            // TODO: Show error toast
          } finally {
            setIsLoading(false)
          }
        }}
        categories={categories}
        item={itemToEdit || undefined}
      />

      {/* Delete confirmation modal */}
      <MenuItemDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        item={itemToDelete}
        isDeleting={isDeleting}
      />
    </div>
  )
}