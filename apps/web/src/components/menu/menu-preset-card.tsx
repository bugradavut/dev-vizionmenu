"use client"

import React, { useState } from 'react'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Pencil, 
  Trash2, 
  PlayCircle,
  PauseCircle,
  Clock,
  Calendar
} from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'
import type { MenuPreset } from '@/services/menu.service'

interface MenuPresetCardProps {
  preset: MenuPreset
  onEdit: (preset: MenuPreset) => void
  onDelete: (presetId: string, presetName: string) => void
  onApply: (presetId: string) => void
  onDeactivate: () => void
  isLoading?: boolean
}

// Helper function to format time from HH:MM:SS to HH:MM
const formatTime = (time: string | null): string => {
  if (!time) return ''
  return time.length > 5 ? time.substring(0, 5) : time
}

export const MenuPresetCard: React.FC<MenuPresetCardProps> = ({
  preset,
  onEdit,
  onDelete,
  onApply,
  onDeactivate,
  isLoading = false
}) => {
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  const [isApplying, setIsApplying] = useState(false)

  const handleApply = async () => {
    if (preset.is_active) {
      // Deactivate current preset
      setIsApplying(true)
      try {
        await onDeactivate()
      } catch (error) {
        console.error('Failed to deactivate preset:', error)
      } finally {
        setIsApplying(false)
      }
    } else {
      // Apply preset
      setIsApplying(true)
      try {
        await onApply(preset.id)
      } catch (error) {
        console.error('Failed to apply preset:', error)
      } finally {
        setIsApplying(false)
      }
    }
  }

  const handleEdit = () => {
    onEdit(preset)
  }

  const handleDelete = () => {
    onDelete(preset.id, preset.name)
  }

  // Determine schedule type  
  const isDaily = preset.schedule_type === 'daily'

  return (
    <Card className={`h-full flex flex-col ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Main content */}
      <div className="p-5 flex-1">
        {/* Header: Title + Status Badge */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
              {preset.name}
            </CardTitle>
            {preset.description && (
              <CardDescription className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {preset.description}
              </CardDescription>
            )}
          </div>
          
          <Badge 
            variant={preset.is_active ? "default" : "secondary"}
            className={
              preset.is_active 
                ? 'ml-3 text-green-700 border-green-300 bg-green-50 hover:bg-green-100' 
                : 'ml-3 text-gray-600 border-gray-200 bg-gray-50 hover:bg-gray-100'
            }
          >
            {preset.is_active 
              ? t.menuManagement.presetsTab.active
              : t.menuManagement.presetsTab.inactive
            }
          </Badge>
        </div>

        {/* Schedule Info */}
        {(isDaily && preset.daily_start_time && preset.daily_end_time) || 
         (preset.scheduled_start && preset.scheduled_end) ? (
          <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            {isDaily ? (
              <>
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {language === 'fr' ? 'Quotidien: ' : 'Daily: '}
                </span>
                <span className="text-sm text-gray-900 dark:text-gray-100 font-mono">
                  {formatTime(preset.daily_start_time)} - {formatTime(preset.daily_end_time)}
                </span>
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {language === 'fr' ? 'Unique: ' : 'One-time: '}
                </span>
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {new Date(preset.scheduled_start!).toLocaleDateString()} - {new Date(preset.scheduled_end!).toLocaleDateString()}
                </span>
              </>
            )}
          </div>
        ) : null}

        {/* Footer: Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {preset.menu_items_count || 0}
              </span>{' '}
              {language === 'fr' 
                ? (preset.menu_items_count === 1 ? 'article' : 'articles')
                : (preset.menu_items_count === 1 ? 'item' : 'items')
              }
            </span>
            <span>•</span>
            <span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {preset.categories_count || 0}
              </span>{' '}
              {language === 'fr' 
                ? (preset.categories_count === 1 ? 'catégorie' : 'catégories')
                : (preset.categories_count === 1 ? 'category' : 'categories')
              }
            </span>
          </div>
          
          <span className="text-xs">
            {new Date(preset.created_at).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
              day: 'numeric',
              month: 'short',
              year: '2-digit'
            })}
          </span>
        </div>
      </div>
      
      {/* Bottom action buttons */}
      <div className="border-t border-gray-200 dark:border-gray-700 flex">
        <Button 
          variant="ghost" 
          onClick={handleEdit}
          className="flex-1 rounded-none border-r border-gray-200 dark:border-gray-700 h-12 text-sm font-medium flex items-center justify-center gap-2"
        >
          <Pencil className="w-4 h-4" />
          {language === 'fr' ? 'Modifier' : 'Edit'}
        </Button>
        
        <Button 
          variant="ghost" 
          onClick={handleApply}
          disabled={isApplying}
          className="flex-1 rounded-none border-r border-gray-200 dark:border-gray-700 h-12 text-sm font-medium flex items-center justify-center gap-2"
        >
          {isApplying ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              {preset.is_active 
                ? (language === 'fr' ? 'Désactivation...' : 'Deactivating...') 
                : (language === 'fr' ? 'Application...' : 'Applying...')
              }
            </>
          ) : preset.is_active ? (
            <>
              <PauseCircle className="w-4 h-4" />
              {language === 'fr' ? 'Désactiver' : 'Deactivate'}
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4" />
              {t.menuManagement.presetsTab.applyPreset}
            </>
          )}
        </Button>
        
        <Button 
          variant="ghost" 
          onClick={handleDelete}
          className="flex-1 rounded-none h-12 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          {language === 'fr' ? 'Supprimer' : 'Delete'}
        </Button>
      </div>
    </Card>
  )
}