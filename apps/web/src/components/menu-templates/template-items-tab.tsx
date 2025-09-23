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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Search,
  Loader2
} from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'
import { useEnhancedAuth } from '@/hooks/use-enhanced-auth'
import { TemplateCard } from './template-card'
import { CreateTemplateItemModal } from './create-template-item-modal'
import { chainTemplatesService } from '@/services/chain-templates.service'

// Template interfaces
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
  category_id?: string
  category_name?: string
}

export function TemplateItemsTab() {
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  const { chainId } = useEnhancedAuth()

  // State management
  const [categories, setCategories] = useState<ChainTemplate[]>([])
  const [items, setItems] = useState<ChainTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ChainTemplate | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<ChainTemplate | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filter items based on search query and category
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategoryId === 'all' || item.category_id === selectedCategoryId
    return matchesSearch && matchesCategory
  })

  // Load categories for dropdown
  const loadCategories = async () => {
    if (!chainId) {
      console.error('No chain ID available')
      return
    }

    try {
      const result = await chainTemplatesService.getChainTemplates(chainId, 'category')
      setCategories(result.data.categories || [])
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  // Load items
  const loadItems = async () => {
    if (!chainId) {
      console.error('No chain ID available')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const result = await chainTemplatesService.getChainTemplates(chainId, 'item')
      setItems(result.data.items || [])
    } catch (error) {
      console.error('Failed to load items:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle item creation
  const handleCreateItem = async (itemData: { name: string; description?: string; price: number; category_id?: string; variants?: unknown[] }) => {
    if (!chainId || !itemData.category_id) return

    try {
      await chainTemplatesService.createTemplate(chainId, {
        name: itemData.name,
        description: itemData.description,
        template_type: 'item',
        category_id: itemData.category_id,
        price: itemData.price,
        ingredients: [],
        allergens: [],
        nutritional_info: {}
      })

      await loadItems()
      setIsCreateModalOpen(false)
    } catch (error) {
      console.error('Failed to create item template:', error)
    }
  }

  // Handle item update
  const handleUpdateItem = async (itemData: { name: string; description?: string; price: number; category_id?: string; variants?: unknown[] }) => {
    if (!editingItem || !chainId) return

    try {
      await chainTemplatesService.updateTemplate(chainId, editingItem.id, itemData)
      await loadItems()
      setEditingItem(null)
    } catch (error) {
      console.error('Failed to update item template:', error)
    }
  }

  // Handle item deletion
  const handleDeleteItem = (item: ChainTemplate) => {
    setItemToDelete(item)
    setDeleteDialogOpen(true)
  }

  // Confirm delete item
  const handleConfirmDelete = async () => {
    if (!itemToDelete || !chainId) return

    try {
      setIsDeleting(true)
      await chainTemplatesService.deleteTemplate(chainId, itemToDelete.id)
      await loadItems()
      setDeleteDialogOpen(false)
      setItemToDelete(null)
    } catch (error) {
      console.error('Failed to delete item template:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Cancel delete
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false)
    setItemToDelete(null)
  }

  // Handle edit item
  const handleEditItem = (item: ChainTemplate) => {
    setEditingItem(item)
  }

  // Handle close edit modal
  const handleCloseEditModal = () => {
    setEditingItem(null)
  }

  // Load data on mount
  useEffect(() => {
    if (chainId) {
      loadCategories()
      loadItems()
    }
  }, [chainId])

  return (
    <div className="space-y-6">
      {/* Header with search and actions */}
      <div className="flex flex-col gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">
            {language === 'fr' ? 'Modèles d\'Articles' : 'Item Templates'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {language === 'fr'
              ? 'Créez des modèles d\'articles que vos succursales peuvent importer'
              : 'Create item templates that your branches can import'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={language === 'fr' ? 'Rechercher des articles...' : 'Search items...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={language === 'fr' ? 'Toutes catégories' : 'All categories'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {language === 'fr' ? 'Toutes catégories' : 'All categories'}
              </SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => setIsCreateModalOpen(true)}
            disabled={categories.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            {language === 'fr' ? 'Nouvel Article' : 'New Item'}
          </Button>
        </div>
      </div>

      {/* Show message if no categories exist */}
      {categories.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {language === 'fr'
              ? 'Vous devez d\'abord créer des catégories avant de pouvoir ajouter des articles.'
              : 'You need to create categories first before you can add items.'}
          </p>
          <Button variant="outline" onClick={() => window.location.href = '/menu-templates?tab=categories'}>
            {language === 'fr' ? 'Créer des Catégories' : 'Create Categories'}
          </Button>
        </div>
      ) : (
        <>
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
                    <TemplateCard
                      key={item.id}
                      template={item}
                      onEdit={handleEditItem}
                      onDelete={handleDeleteItem}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {searchQuery || selectedCategoryId !== 'all'
                      ? (language === 'fr' ? 'Aucun article trouvé' : 'No items found')
                      : (language === 'fr' ? 'Aucun article créé' : 'No items created yet')
                    }
                  </p>
                  {!searchQuery && selectedCategoryId === 'all' && (
                    <Button
                      className="mt-4"
                      onClick={() => setIsCreateModalOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {language === 'fr' ? 'Créer Premier Article' : 'Create First Item'}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Create item modal */}
      <CreateTemplateItemModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateItem}
        categories={categories}
      />

      {/* Edit item modal */}
      {editingItem && (
        <CreateTemplateItemModal
          isOpen={true}
          onClose={handleCloseEditModal}
          item={editingItem}
          onSubmit={handleUpdateItem}
          categories={categories}
        />
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'fr' ? 'Supprimer l\'Article' : 'Delete Item'}
            </DialogTitle>
            <DialogDescription>
              {itemToDelete && (
                language === 'fr'
                  ? `Êtes-vous sûr de vouloir supprimer l'article "${itemToDelete.name}" ? Cette action ne peut pas être annulée.`
                  : `Are you sure you want to delete item "${itemToDelete.name}"? This action cannot be undone.`
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
    </div>
  )
}