"use client"

import React, { useState } from 'react'
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
import { Loader2, Download, Package } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'

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

interface ImportTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  templates: ChainTemplate[]
  branchId: string
  branchName: string
  onImport: (templateIds: string[], branchId: string) => Promise<void>
}

export const ImportTemplateModal: React.FC<ImportTemplateModalProps> = ({
  isOpen,
  onClose,
  templates,
  branchId,
  branchName,
  onImport
}) => {
  const { language } = useLanguage()
  const t = translations[language] || translations.en

  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])
  const [isImporting, setIsImporting] = useState(false)

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
    if (selectedTemplates.length === 0 || isImporting) return

    setIsImporting(true)
    try {
      await onImport(selectedTemplates, branchId)
      // Reset selections
      setSelectedTemplates([])
      onClose()
    } catch (error) {
      console.error('Failed to import templates:', error)
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

  // Calculate totals
  const selectedCount = selectedTemplates.length
  const totalItems = templates
    .filter(t => selectedTemplates.includes(t.id))
    .reduce((sum, t) => sum + t.items_count, 0)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {language === 'fr' ? 'Importer des Modèles' : 'Import Templates'}
          </DialogTitle>
          <DialogDescription>
            {language === 'fr'
              ? `Sélectionnez les modèles à importer vers "${branchName}"`
              : `Select templates to import to "${branchName}"`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
          <div className="space-y-3">
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
                    className="font-medium cursor-pointer"
                  >
                    {template.name}
                  </Label>
                  {template.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {template.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {template.items_count} {language === 'fr' ? 'articles' : 'items'}
                    </span>
                    <span>v{template.version}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Import summary */}
          {selectedCount > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium text-blue-900">
                {language === 'fr' ? 'Résumé de l\'importation' : 'Import Summary'}
              </div>
              <div className="text-sm text-blue-700 mt-1">
                {language === 'fr'
                  ? `${selectedCount} modèles avec ${totalItems} articles au total`
                  : `${selectedCount} templates with ${totalItems} total items`}
              </div>
            </div>
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
            disabled={selectedCount === 0 || isImporting}
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