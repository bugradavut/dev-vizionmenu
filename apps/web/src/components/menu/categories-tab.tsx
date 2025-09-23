"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus,
  Search,
  Loader2,
  EyeOff,
  Download
} from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'
import { menuService, type MenuCategory, type CreateCategoryRequest, type UpdateCategoryRequest } from '@/services/menu.service'
import { MenuCategoryCard } from './menu-category-card'
import { CategoryCreateModal } from './category-create-modal'
import { ChainTemplateImportModal } from './chain-template-import-modal'

// Define form data interface to match the modal's form schema
interface CategoryFormData {
  name: string
  description?: string
  display_order?: number
  is_active?: boolean
  icon?: string
}

export function CategoriesTab() {
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  
  // State management
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showHidden, setShowHidden] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<MenuCategory | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showSmartDeleteDialog, setShowSmartDeleteDialog] = useState(false)
  const [itemCount, setItemCount] = useState(0)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  // Filter and sort categories based on search query, visibility, and display order
  const filteredCategories = categories
    .filter(category => {
      const matchesSearch = category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           category.description?.toLowerCase().includes(searchQuery.toLowerCase())
      
      // Normal: show only active categories (is_active = true)
      // Hidden mode: show only inactive categories (is_active = false) 
      const matchesVisibility = showHidden ? !category.is_active : category.is_active
      
      return matchesSearch && matchesVisibility
    })
    .sort((a, b) => a.display_order - b.display_order) // Sort by display_order ascending

  // Load categories
  const loadCategories = async () => {
    try {
      setIsLoading(true)
      // Get ALL categories (both active and inactive) with item counts
      const response = await menuService.getCategories({ 
        includeInactive: true,
        includeItems: true 
      })
      if (response.data) {
        setCategories(response.data)
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
    } finally {
      setIsLoading(false)
    }
  }


  // Handle category toggle
  const handleCategoryToggle = async (categoryId: string) => {
    try {
      await menuService.toggleCategoryAvailability(categoryId)
      // Re-fetch categories to get updated state
      await loadCategories()
    } catch (error) {
      console.error('Failed to toggle category:', error)
      // TODO: Show error toast
    }
  }

  // Handle edit category
  const handleEditCategory = (category: MenuCategory) => {
    setEditingCategory(category)
  }

  // Handle close edit modal
  const handleCloseEditModal = () => {
    setEditingCategory(null)
  }

  // Handle delete category
  const handleDeleteCategory = (category: MenuCategory) => {
    setCategoryToDelete(category)
    setDeleteDialogOpen(true)
  }

  // Confirm delete category
  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return
    
    try {
      setIsDeleting(true)
      await menuService.deleteCategory(categoryToDelete.id)
      // Re-fetch categories to get updated state
      await loadCategories()
      setDeleteDialogOpen(false)
      setCategoryToDelete(null)
    } catch (error: unknown) {
      console.error('Failed to delete category:', error)
      // Check different error formats - back to working structure
      const err = error as Record<string, unknown>
      const nestedError = err?.error as Record<string, unknown> | undefined
      const deepError = nestedError?.error as Record<string, unknown> | undefined
      const errorMessage = (deepError?.details as string) || 
                          (deepError?.message as string) || 
                          (err?.message as string)
      
      // Check if error is about category having items
      if (errorMessage && errorMessage.includes('Cannot delete category with')) {
        // Extract item count from error message
        const match = errorMessage.match(/Cannot delete category with (\d+) items/)
        const count = match ? parseInt(match[1]) : 0
        
        setItemCount(count)
        setDeleteDialogOpen(false) // Close regular delete dialog
        setShowSmartDeleteDialog(true) // Show smart delete dialog
      } else {
        // TODO: Show error toast for other errors
      }
    } finally {
      setIsDeleting(false)
    }
  }

  // Cancel delete
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false)
    setCategoryToDelete(null)
  }

  // Handle force delete (move items to uncategorized and delete category)
  const handleForceDelete = async () => {
    if (!categoryToDelete) return
    
    try {
      setIsDeleting(true)
      await menuService.deleteCategory(categoryToDelete.id, true) // forceDelete = true
      // Re-fetch categories to get updated state
      await loadCategories()
      setShowSmartDeleteDialog(false)
      setCategoryToDelete(null)
    } catch (error) {
      console.error('Failed to force delete category:', error)
      // TODO: Show error toast
    } finally {
      setIsDeleting(false)
    }
  }

  // Load data on mount
  useEffect(() => {
    loadCategories()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header - responsive layout */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        {/* Title and description */}
        <div className="space-y-1 flex-shrink-0">
          <h2 className="text-xl font-semibold tracking-tight">
            {t.navigation.categories}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t.menuManagement.categoriesTab.subtitle}
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
            <Button
              variant="outline"
              onClick={() => setShowHidden(!showHidden)}
              className={`${showHidden ? "bg-muted" : ""} text-xs sm:text-sm flex-1 sm:flex-none`}
              size="sm"
            >
              <EyeOff className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="truncate">
                {showHidden
                  ? (language === 'fr' ? 'Actifs' : 'Active')
                  : (language === 'fr' ? 'Masqués' : 'Inactive')
                } ({showHidden ? categories.filter(c => c.is_active).length : categories.filter(c => !c.is_active).length})
              </span>
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsImportModalOpen(true)}
              className="text-xs sm:text-sm flex-1 sm:flex-none"
              size="sm"
            >
              <Download className="h-4 w-4 mr-1 sm:mr-2" />
              {language === 'fr' ? 'Importer' : 'Import'}
            </Button>

            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="text-xs sm:text-sm flex-1 sm:flex-none"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              {language === 'fr' ? 'Ajouter Catégorie' : 'Add Category'}
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
          {/* Categories grid */}
          {filteredCategories.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
              {filteredCategories.map((category) => (
                <MenuCategoryCard 
                  key={category.id} 
                  category={category}
                  onEdit={handleEditCategory}
                  onDelete={handleDeleteCategory}
                  onToggleAvailability={handleCategoryToggle}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery 
                  ? (language === 'fr' ? 'Aucune catégorie trouvée' : 'No categories found')
                  : (language === 'fr' ? 'Aucune catégorie créée' : 'No categories created yet')
                }
              </p>
              {!searchQuery && (
                <Button 
                  className="mt-4" 
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t.menuManagement.newCategory}
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {/* Create category modal */}
      <CategoryCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={async (formData) => {
          try {
            const data = formData as CategoryFormData
            const createData: CreateCategoryRequest = {
              name: data.name,
              description: data.description,
              display_order: data.display_order,
              icon: data.icon
            }
            await menuService.createCategory(createData)
            // Re-fetch categories to get updated state
            await loadCategories()
            setIsCreateModalOpen(false)
          } catch (error) {
            console.error('Failed to create category:', error)
            // TODO: Show error toast
          }
        }}
      />

      {/* Edit category modal */}
      {editingCategory && (
        <CategoryCreateModal
          isOpen={true}
          onClose={handleCloseEditModal}
          category={editingCategory}
          onSubmit={async (formData) => {
            try {
              const data = formData as CategoryFormData
              const updateData: UpdateCategoryRequest = {
                name: data.name,
                description: data.description,
                display_order: data.display_order,
                icon: data.icon,
                ...(data.is_active !== undefined && { is_active: data.is_active })
              }
              await menuService.updateCategory(editingCategory.id, updateData)
              // Re-fetch categories to get updated state
              await loadCategories()
              handleCloseEditModal()
            } catch (error) {
              console.error('Failed to update category:', error)
              // TODO: Show error toast
            }
          }}
        />
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'fr' ? 'Supprimer la catégorie' : 'Delete Category'}
            </DialogTitle>
            <DialogDescription>
              {categoryToDelete && (
                language === 'fr' 
                  ? `Êtes-vous sûr de vouloir supprimer la catégorie "${categoryToDelete.name}" ? Les articles seront déplacés vers "Non catégorisé". Cette action ne peut pas être annulée.`
                  : `Are you sure you want to delete category "${categoryToDelete.name}"? Items will be moved to "Uncategorized". This action cannot be undone.`
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleCancelDelete}
              disabled={isDeleting}
            >
              {t.common.cancel}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {language === 'fr' ? 'Suppression...' : 'Deleting...'}
                </>
              ) : (
                t.common.delete
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Smart Delete Dialog (when category has items) */}
      <Dialog open={showSmartDeleteDialog} onOpenChange={setShowSmartDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t.menuManagement.categoriesTab.cannotDeleteTitle}</DialogTitle>
            <DialogDescription>
              {t.menuManagement.categoriesTab.cannotDeleteMessage.replace('{count}', itemCount.toString())}
            </DialogDescription>
          </DialogHeader>
          
          {categoryToDelete && (
            <div className="py-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{categoryToDelete.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {itemCount} {language === 'fr' ? 'article(s)' : 'item(s)'}
                    </p>
                  </div>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-primary">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowSmartDeleteDialog(false)
                setCategoryToDelete(null)
              }}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              {t.menuManagement.categoriesTab.cancelDeletion}
            </Button>
            <Button
              onClick={handleForceDelete}
              variant="destructive"
              disabled={isDeleting}
              className="w-full sm:w-auto text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {language === 'fr' ? 'Déplacement...' : 'Moving...'}
                </>
              ) : (
                t.menuManagement.categoriesTab.moveAndDelete
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chain Template Import Modal */}
      <ChainTemplateImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={loadCategories}
      />
    </div>
  )
}