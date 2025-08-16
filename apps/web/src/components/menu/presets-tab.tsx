"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search,
  Loader2,
  Settings
} from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'
import { menuService, type MenuPreset } from '@/services/menu.service'
import { PresetCreateModal } from './preset-create-modal'
import { MenuPresetCard } from './menu-preset-card'

export function PresetsTab() {
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  
  // State management
  const [presets, setPresets] = useState<MenuPreset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingPreset, setEditingPreset] = useState<MenuPreset | null>(null)

  // Filter presets based on search query
  const filteredPresets = presets.filter(preset =>
    preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    preset.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Load presets
  const loadPresets = async () => {
    try {
      setIsLoading(true)
      const response = await menuService.getPresets()
      if (response.data) {
        setPresets(response.data)
      }
    } catch (error) {
      console.error('Failed to load presets:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle preset application
  const handleApplyPreset = async (presetId: string) => {
    try {
      await menuService.applyPreset(presetId)
      // Reload presets to get updated status
      await loadPresets()
      console.log('Preset applied successfully')
    } catch (error) {
      console.error('Failed to apply preset:', error)
      // TODO: Show error toast
    }
  }

  // Handle preset deletion
  const handleDeletePreset = async (presetId: string, presetName: string) => {
    if (window.confirm(
      language === 'fr' 
        ? `Êtes-vous sûr de vouloir supprimer le préréglage "${presetName}" ?`
        : `Are you sure you want to delete preset "${presetName}"?`
    )) {
      try {
        await menuService.deletePreset(presetId)
        setPresets(prev => prev.filter(preset => preset.id !== presetId))
        console.log('Preset deleted successfully')
      } catch (error) {
        console.error('Failed to delete preset:', error)
        // TODO: Show error toast
      }
    }
  }

  // Handle preset edit
  const handleEditPreset = (preset: MenuPreset) => {
    setEditingPreset(preset)
  }

  // Handle close edit modal
  const handleCloseEditModal = () => {
    setEditingPreset(null)
  }

  // Handle preset deactivation
  const handleDeactivatePreset = async () => {
    try {
      await menuService.deactivatePreset()
      // Reload presets to get updated status
      await loadPresets()
      console.log('Preset deactivated successfully')
    } catch (error) {
      console.error('Failed to deactivate preset:', error)
      // TODO: Show error toast
    }
  }

  // Handle preset creation
  const handlePresetCreated = (newPreset: MenuPreset) => {
    setPresets(prev => [newPreset, ...prev])
    setIsCreateModalOpen(false)
  }

  // Load data on mount
  useEffect(() => {
    loadPresets()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header with search and actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">
            {t.menuManagement.presets}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t.menuManagement.presetsTab.subtitle}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={language === 'fr' ? 'Rechercher des presets...' : 'Search presets...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t.menuManagement.presetsTab.newPreset}
          </Button>
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
          {/* Presets grid */}
          {filteredPresets.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredPresets.map((preset) => (
                <MenuPresetCard 
                  key={preset.id}
                  preset={preset}
                  onEdit={handleEditPreset}
                  onDelete={handleDeletePreset}
                  onApply={handleApplyPreset}
                  onDeactivate={handleDeactivatePreset}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                  <Settings className="h-8 w-8 text-purple-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">
                    {searchQuery 
                      ? (language === 'fr' ? 'Aucun preset trouvé' : 'No presets found')
                      : (language === 'fr' ? 'Aucun preset créé' : 'No presets created yet')
                    }
                  </h3>
                  {!searchQuery && (
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      {language === 'fr' 
                        ? 'Créez des presets de menu pour basculer rapidement entre différentes configurations selon l\'heure ou la saison.'
                        : 'Create menu presets to quickly switch between different menu configurations based on time or season.'
                      }
                    </p>
                  )}
                </div>
                {!searchQuery && (
                  <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t.menuManagement.presetsTab.newPreset}
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Preset Modal */}
      <PresetCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPresetCreated={handlePresetCreated}
      />

      {/* Edit Preset Modal */}
      {editingPreset && (
        <PresetCreateModal
          isOpen={true}
          onClose={handleCloseEditModal}
          preset={editingPreset}
          onPresetCreated={(updatedPreset) => {
            // Update the preset in the list
            setPresets(prev => prev.map(p => 
              p.id === updatedPreset.id ? updatedPreset : p
            ))
            handleCloseEditModal()
          }}
        />
      )}
    </div>
  )
}