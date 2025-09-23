"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Loader2, Download, Package, FileText } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'
import { chainTemplatesService, type ChainTemplate } from '@/services/chain-templates.service'
import { useEnhancedAuth } from '@/hooks/use-enhanced-auth'
import toast from 'react-hot-toast'

interface ChainTemplateImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: () => void
}

export const ChainTemplateImportModal: React.FC<ChainTemplateImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete
}) => {
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  const { chainId, branchId } = useEnhancedAuth()

  const [templates, setTemplates] = useState<ChainTemplate[]>([])
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  // Load chain templates with retry mechanism
  const loadTemplates = async (retryCount = 0) => {
    if (!chainId) return

    try {
      setIsLoading(true)
      const response = await chainTemplatesService.getChainTemplates(chainId)
      setTemplates(response.data.categories || [])
    } catch (error) {
      console.error('Failed to load chain templates:', error)

      if (retryCount < 2) {
        setTimeout(() => {
          loadTemplates(retryCount + 1)
        }, 1000 * (retryCount + 1))
        return
      }

      toast.error(
        language === 'fr'
          ? 'Erreur lors du chargement des modèles'
          : 'Failed to load templates'
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Toggle template selection
  const toggleTemplate = (templateId: string) => {
    setSelectedTemplates(prev =>
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    )
  }

  // Select all templates
  const selectAll = () => {
    setSelectedTemplates(templates.map(t => t.id))
  }

  // Clear all selections
  const clearAll = () => {
    setSelectedTemplates([])
  }

  // Handle import
  const handleImport = async () => {
    if (selectedTemplates.length === 0 || isImporting || !chainId || !branchId) return

    setIsImporting(true)
    try {
      const results = await chainTemplatesService.importMultipleTemplates(
        chainId,
        selectedTemplates,
        branchId
      )

      // Count successful imports
      const successCount = results.filter(r => r.success).length
      const totalItems = results.reduce((sum, r) => sum + r.categories_created + r.items_created, 0)

      if (successCount === results.length) {
        toast.success(
          language === 'fr'
            ? `${successCount} modèles importés avec succès (${totalItems} éléments)`
            : `${successCount} templates imported successfully (${totalItems} items)`
        )
      } else {
        toast.error(
          language === 'fr'
            ? `${successCount}/${results.length} modèles importés. Certains ont échoué.`
            : `${successCount}/${results.length} templates imported. Some failed.`
        )
      }

      // Reset and close
      setSelectedTemplates([])
      onImportComplete()
      onClose()
    } catch (error) {
      console.error('Failed to import templates:', error)
      toast.error(
        language === 'fr'
          ? 'Erreur lors de l\'importation des modèles'
          : 'Failed to import templates'
      )
    } finally {
      setIsImporting(false)
    }
  }

  // Handle close
  const handleClose = () => {
    if (!isImporting) {
      setSelectedTemplates([])
      onClose()
    }
  }

  // Load templates when modal opens
  useEffect(() => {
    if (isOpen) {
      loadTemplates()
    }
  }, [isOpen, chainId])

  // Calculate totals
  const selectedCount = selectedTemplates.length
  const totalItems = templates
    .filter(t => selectedTemplates.includes(t.id))
    .reduce((sum, t) => sum + t.items_count, 0)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {language === 'fr' ? 'Importer des Modèles de Chaîne' : 'Import Chain Templates'}
          </DialogTitle>
          <DialogDescription>
            {language === 'fr'
              ? 'Sélectionnez les modèles de catégorie à importer dans cette succursale'
              : 'Select category templates to import to this branch'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-muted-foreground">
                {language === 'fr' ? 'Chargement des modèles...' : 'Loading templates...'}
              </span>
            </div>
          ) : (
            <>
              {templates.length > 0 ? (
                <>
                  {/* Selection controls */}
                  <div className="flex items-center justify-between py-2 border-b">
                    <div className="text-sm text-muted-foreground">
                      {language === 'fr'
                        ? `${selectedCount} modèle(s) sélectionné(s)`
                        : `${selectedCount} template(s) selected`}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={selectAll}
                        disabled={isImporting}
                      >
                        {language === 'fr' ? 'Tout sélectionner' : 'Select All'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAll}
                        disabled={isImporting}
                      >
                        {language === 'fr' ? 'Tout déselectionner' : 'Clear All'}
                      </Button>
                    </div>
                  </div>

                  {/* Templates list */}
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <Checkbox
                          id={`template-${template.id}`}
                          checked={selectedTemplates.includes(template.id)}
                          onCheckedChange={() => toggleTemplate(template.id)}
                          disabled={isImporting}
                        />
                        <div className="flex-1 min-w-0">
                          <Label
                            htmlFor={`template-${template.id}`}
                            className="font-medium cursor-pointer flex items-center gap-2"
                          >
                            <FileText className="w-4 h-4 text-blue-600" />
                            {template.name}
                          </Label>
                          {template.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {template.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              <Package className="w-3 h-3 mr-1" />
                              {template.items_count} {language === 'fr' ? 'articles' : 'items'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              v{template.version}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Import summary */}
                  {selectedCount > 0 && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-sm font-medium text-blue-900">
                        {language === 'fr' ? 'Résumé de l\'importation' : 'Import Summary'}
                      </div>
                      <div className="text-sm text-blue-700 mt-1">
                        {language === 'fr'
                          ? `${selectedCount} modèles avec ${totalItems} articles au total`
                          : `${selectedCount} templates with ${totalItems} total items`}
                      </div>
                      <div className="text-xs text-blue-600 mt-2">
                        {language === 'fr'
                          ? 'Les modèles seront ajoutés à votre menu existant'
                          : 'Templates will be added to your existing menu'}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {language === 'fr'
                      ? 'Aucun modèle de chaîne disponible'
                      : 'No chain templates available'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {language === 'fr'
                      ? 'Demandez au propriétaire de la chaîne de créer des modèles'
                      : 'Ask your chain owner to create templates first'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isImporting}
          >
            {t.common.cancel}
          </Button>
          <Button
            onClick={handleImport}
            disabled={selectedCount === 0 || isImporting || isLoading}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {language === 'fr' ? 'Importation...' : 'Importing...'}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {language === 'fr'
                  ? `Importer (${selectedCount})`
                  : `Import (${selectedCount})`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}