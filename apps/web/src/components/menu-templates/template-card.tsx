"use client"

import React from 'react'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Pencil,
  Trash2,
  File,
  Download
} from 'lucide-react'
import { getIconComponent, DEFAULT_CATEGORY_ICON } from '@/lib/category-icons'
import { useLanguage } from '@/contexts/language-context'

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

interface TemplateCardProps {
  template: ChainTemplate
  onEdit: (template: ChainTemplate) => void
  onDelete: (template: ChainTemplate) => void
  onImport?: (template: ChainTemplate) => void
  isLoading?: boolean
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onEdit,
  onDelete,
  onImport,
  isLoading = false
}) => {
  const { language } = useLanguage()

  const handleEdit = () => {
    onEdit(template)
  }

  const handleDelete = () => {
    onDelete(template)
  }

  const handleImport = () => {
    if (onImport) {
      onImport(template)
    }
  }

  // Get icon component
  const IconComponent = getIconComponent(template.icon || DEFAULT_CATEGORY_ICON)

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA')
  }

  return (
    <Card className="group relative p-4 hover:shadow-md transition-all duration-200 border-border">
      {/* Header with icon and title */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
            <IconComponent className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-medium truncate group-hover:text-primary transition-colors">
              {template.name}
            </CardTitle>
            {template.description && (
              <CardDescription className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {template.description}
              </CardDescription>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="text-xs">
            <File className="w-3 h-3 mr-1" />
            {language === 'fr' ? 'Modèle' : 'Template'}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="font-medium">{template.items_count}</span>
          <span>{language === 'fr' ? 'articles' : 'items'}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>{language === 'fr' ? 'v' : 'v'}{template.version}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>{formatDate(template.updated_at)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEdit}
            disabled={isLoading}
            className="h-8 px-2 hover:bg-blue-50 hover:text-blue-600"
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            {language === 'fr' ? 'Modifier' : 'Edit'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isLoading}
            className="h-8 px-2 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            {language === 'fr' ? 'Supprimer' : 'Delete'}
          </Button>
        </div>

        {/* Import button (if onImport prop provided) */}
        {onImport && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleImport}
            disabled={isLoading}
            className="h-8 px-2"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            {language === 'fr' ? 'Importer' : 'Import'}
          </Button>
        )}
      </div>
    </Card>
  )
}