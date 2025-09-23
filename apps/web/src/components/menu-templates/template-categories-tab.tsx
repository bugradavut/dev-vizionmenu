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
  Loader2
} from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'
import { useEnhancedAuth } from '@/hooks/use-enhanced-auth'
import toast from 'react-hot-toast'
import { TemplateCard } from './template-card'
import { CreateTemplateModal } from './create-template-modal'
import { chainTemplatesService } from '@/services/chain-templates.service'

// Template interface
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
}

export function TemplateCategoriesTab() {
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  const { chainId, user } = useEnhancedAuth()

  // State management
  const [templates, setTemplates] = useState<ChainTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ChainTemplate | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<ChainTemplate | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filter templates based on search query
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  // Load templates - simple and clean
  const loadTemplates = async () => {
    if (!chainId || !user) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const result = await chainTemplatesService.getChainTemplates(chainId, 'category')
      setTemplates(result?.categories || [])
    } catch (error) {
      console.error('Failed to load templates:', error)
      toast.error(
        language === 'fr'
          ? 'Erreur lors du chargement des modèles'
          : 'Failed to load templates'
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Handle template creation
  const handleCreateTemplate = async (templateData: { name: string; description?: string; icon?: string }) => {
    if (!chainId) return

    try {
      await chainTemplatesService.createTemplate(chainId, {
        name: templateData.name,
        description: templateData.description,
        icon: templateData.icon,
        template_type: 'category'
      })

      await loadTemplates()
      setIsCreateModalOpen(false)
      toast.success(
        language === 'fr'
          ? 'Modèle créé avec succès'
          : 'Template created successfully'
      )
    } catch (error) {
      console.error('Failed to create template:', error)
      toast.error(
        language === 'fr'
          ? 'Erreur lors de la création du modèle'
          : 'Failed to create template'
      )
    }
  }

  // Handle template update
  const handleUpdateTemplate = async (templateData: { name: string; description?: string; icon?: string }) => {
    if (!editingTemplate || !chainId) return

    try {
      await chainTemplatesService.updateTemplate(chainId, editingTemplate.id, templateData)
      await loadTemplates()
      setEditingTemplate(null)
      toast.success(
        language === 'fr'
          ? 'Modèle mis à jour avec succès'
          : 'Template updated successfully'
      )
    } catch (error) {
      console.error('Failed to update template:', error)
      toast.error(
        language === 'fr'
          ? 'Erreur lors de la mise à jour du modèle'
          : 'Failed to update template'
      )
    }
  }

  // Handle template deletion
  const handleDeleteTemplate = (template: ChainTemplate) => {
    setTemplateToDelete(template)
    setDeleteDialogOpen(true)
  }

  // Confirm delete template
  const handleConfirmDelete = async () => {
    if (!templateToDelete || !chainId) return

    try {
      setIsDeleting(true)
      await chainTemplatesService.deleteTemplate(chainId, templateToDelete.id)
      await loadTemplates()
      setDeleteDialogOpen(false)
      setTemplateToDelete(null)
      toast.success(
        language === 'fr'
          ? 'Modèle supprimé avec succès'
          : 'Template deleted successfully'
      )
    } catch (error) {
      console.error('Failed to delete template:', error)
      toast.error(
        language === 'fr'
          ? 'Erreur lors de la suppression du modèle'
          : 'Failed to delete template'
      )
    } finally {
      setIsDeleting(false)
    }
  }

  // Cancel delete
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false)
    setTemplateToDelete(null)
  }

  // Handle edit template
  const handleEditTemplate = (template: ChainTemplate) => {
    setEditingTemplate(template)
  }

  // Handle close edit modal
  const handleCloseEditModal = () => {
    setEditingTemplate(null)
  }

  // Load data on mount
  useEffect(() => {
    if (chainId && user && typeof window !== 'undefined') {
      loadTemplates()
    } else {
      setTemplates([])
      setIsLoading(false)
    }
  }, [chainId, user])


  return (
    <div className="space-y-6">
      {/* Header - responsive layout */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        {/* Title and description */}
        <div className="space-y-1 flex-shrink-0">
          <h2 className="text-xl font-semibold tracking-tight">
            {language === 'fr' ? 'Modèles de Catégories' : 'Category Templates'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {language === 'fr'
              ? 'Créez des modèles de catégories que vos succursales peuvent importer'
              : 'Create category templates that your branches can import'}
          </p>
        </div>

        {/* Search and actions */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-2">
          {/* Search bar */}
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={language === 'fr' ? 'Rechercher des modèles...' : 'Search templates...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="text-xs sm:text-sm flex-1 sm:flex-none h-9"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              {language === 'fr' ? 'Ajouter Modèle' : 'Add Template'}
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
          {/* Templates grid */}
          {filteredTemplates.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={handleEditTemplate}
                  onDelete={handleDeleteTemplate}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery
                  ? (language === 'fr' ? 'Aucun modèle trouvé' : 'No templates found')
                  : (language === 'fr' ? 'Aucun modèle créé' : 'No templates created yet')
                }
              </p>
              {!searchQuery && (
                <Button
                  className="mt-4"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {language === 'fr' ? 'Créer Premier Modèle' : 'Create First Template'}
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {/* Create template modal */}
      <CreateTemplateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTemplate}
      />

      {/* Edit template modal */}
      {editingTemplate && (
        <CreateTemplateModal
          isOpen={true}
          onClose={handleCloseEditModal}
          template={editingTemplate}
          onSubmit={handleUpdateTemplate}
        />
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'fr' ? 'Supprimer le Modèle' : 'Delete Template'}
            </DialogTitle>
            <DialogDescription>
              {templateToDelete && (
                language === 'fr'
                  ? `Êtes-vous sûr de vouloir supprimer le modèle "${templateToDelete.name}" ? Cette action ne peut pas être annulée.`
                  : `Are you sure you want to delete template "${templateToDelete.name}"? This action cannot be undone.`
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