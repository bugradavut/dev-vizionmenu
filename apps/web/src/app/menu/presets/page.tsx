"use client"

import React, { useState, useEffect } from 'react'
import { AuthGuard } from "@/components/auth-guard"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  Settings, 
  Clock,
  Loader2
} from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'
import { menuService, type MenuPreset, type MenuCategory, type MenuItem } from '@/services/menu.service'
import { MenuPresetCard } from '@/components/menu/menu-preset-card'
import { PresetCreateModal } from '@/components/menu/preset-create-modal'

export default function MenuPresetsPage() {
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  const [searchQuery, setSearchQuery] = useState('')
  
  // Presets state
  const [presets, setPresets] = useState<MenuPreset[]>([])
  const [isLoadingPresets, setIsLoadingPresets] = useState(true)
  const [presetsError, setPresetsError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingPreset, setEditingPreset] = useState<MenuPreset | null>(null)
  
  // Menu data for current snapshot
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  
  // Load presets from API
  useEffect(() => {
    const loadPresets = async () => {
      try {
        setIsLoadingPresets(true)
        setPresetsError(null)
        
        const response = await menuService.getPresets()
        console.log('📊 Presets loaded:', response.data?.length, 'presets')
        
        setPresets(response.data || [])
      } catch (error) {
        console.error('Failed to load presets:', error)
        setPresetsError(
          language === 'fr' 
            ? 'Erreur lors du chargement des préréglages'
            : 'Failed to load presets'
        )
      } finally {
        setIsLoadingPresets(false)
      }
    }

    loadPresets()
  }, [language])

  // Load current menu data for snapshot
  useEffect(() => {
    const loadMenuData = async () => {
      try {
        const [categoriesRes, itemsRes] = await Promise.allSettled([
          menuService.getCategories(),
          menuService.getMenuItems()
        ])
        
        if (categoriesRes.status === 'fulfilled') {
          setCategories(categoriesRes.value.data || [])
        }
        if (itemsRes.status === 'fulfilled') {
          setItems(itemsRes.value.data || [])
        }
      } catch (error) {
        console.error('Failed to load menu data for snapshot:', error)
      }
    }

    loadMenuData()
  }, [])

  // Filter presets based on search
  const filteredPresets = presets.filter(preset => 
    searchQuery === '' || 
    preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    preset.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Handle preset actions
  const handleApplyPreset = async (presetId: string) => {
    try {
      await menuService.applyPreset(presetId)
      // Reload presets to get updated status
      const response = await menuService.getPresets()
      setPresets(response.data || [])
      console.log('Preset applied successfully')
    } catch (error) {
      console.error('Failed to apply preset:', error)
      alert(language === 'fr' ? 'Erreur lors de l\'application du préréglage' : 'Failed to apply preset')
    }
  }

  const handleEditPreset = (preset: MenuPreset) => {
    setEditingPreset(preset)
  }

  const handleCloseEditModal = () => {
    setEditingPreset(null)
  }

  const handleDeactivatePreset = async () => {
    try {
      await menuService.deactivatePreset()
      // Reload presets to get updated status
      const response = await menuService.getPresets()
      setPresets(response.data || [])
      console.log('Preset deactivated successfully')
    } catch (error) {
      console.error('Failed to deactivate preset:', error)
      alert(language === 'fr' ? 'Erreur lors de la désactivation du préréglage' : 'Failed to deactivate preset')
    }
  }

  const handleDeletePreset = async (presetId: string, presetName: string) => {
    if (window.confirm(
      language === 'fr' 
        ? `Êtes-vous sûr de vouloir supprimer le préréglage "${presetName}" ?`
        : `Are you sure you want to delete preset "${presetName}"?`
    )) {
      try {
        await menuService.deletePreset(presetId)
        setPresets(prev => prev.filter(p => p.id !== presetId))
        console.log('Preset deleted successfully')
      } catch (error) {
        console.error('Failed to delete preset:', error)
        alert(language === 'fr' ? 'Erreur lors de la suppression' : 'Failed to delete preset')
      }
    }
  }


  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/dashboard">
                      {t.navigation.dashboard}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/menu">
                      {t.navigation.menuManagement}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{t.menuManagement.presets}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="container mx-auto py-6 space-y-6">
              
              {/* Header Section */}
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {t.menuManagement.presetsTab.title}
                  </h1>
                  <p className="text-muted-foreground">
                    {t.menuManagement.presetsTab.subtitle}
                  </p>
                </div>
                
                {/* Search and Actions */}
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 min-w-0 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={t.menuManagement.searchPlaceholder}
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

              {/* Presets Grid */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Loading State */}
                {isLoadingPresets && (
                  <>
                    {[1, 2, 3].map((skeleton) => (
                      <Card key={skeleton} className="animate-pulse">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="h-4 bg-muted rounded w-3/4"></div>
                              <div className="h-3 bg-muted rounded w-1/2"></div>
                            </div>
                            <div className="h-6 bg-muted rounded w-16"></div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="h-3 bg-muted rounded w-full"></div>
                            <div className="h-3 bg-muted rounded w-2/3"></div>
                          </div>
                          <div className="mt-4 pt-3 border-t">
                            <div className="h-8 bg-muted rounded w-full"></div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}

                {/* Error State */}
                {presetsError && (
                  <div className="col-span-full text-center py-12">
                    <div className="text-destructive mb-2">
                      <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    </div>
                    <p className="text-destructive mb-4">{presetsError}</p>
                    <Button 
                      variant="outline" 
                      onClick={() => window.location.reload()}
                    >
                      <Loader2 className="h-4 w-4 mr-2" />
                      {t.menuManagement.categoriesTab.retryAction}
                    </Button>
                  </div>
                )}

                {/* No Presets State */}
                {!isLoadingPresets && !presetsError && filteredPresets.length === 0 && presets.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">
                      {t.menuManagement.presetsTab.noPresets}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {t.menuManagement.presetsTab.noPresetsDesc}
                    </p>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t.menuManagement.presetsTab.createPreset}
                    </Button>
                  </div>
                )}

                {/* Current Menu Snapshot Card */}
                {!isLoadingPresets && !presetsError && (
                  <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1 flex-1">
                          <CardTitle className="text-base font-medium text-primary flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {t.menuManagement.presetsTab.currentMenu}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {t.menuManagement.presetsTab.saveCurrentConfig}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2 text-sm text-muted-foreground mb-4">
                        <div className="flex justify-between">
                          <span>{t.menuManagement.presetsTab.categories}</span>
                          <span className="font-medium">{categories.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t.menuManagement.presetsTab.items}</span>
                          <span className="font-medium">{items.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t.menuManagement.presetsTab.available}</span>
                          <span className="font-medium text-green-600">
                            {items.filter(item => item.is_available).length}
                          </span>
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={() => setIsCreateModalOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t.menuManagement.presetsTab.saveAsPreset}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Presets List */}
                {!isLoadingPresets && !presetsError && filteredPresets.length > 0 && 
                  filteredPresets.map((preset) => (
                    <MenuPresetCard 
                      key={preset.id}
                      preset={preset}
                      onEdit={handleEditPreset}
                      onDelete={handleDeletePreset}
                      onApply={handleApplyPreset}
                      onDeactivate={handleDeactivatePreset}
                    />
                  ))
                }

                {/* No Search Results */}
                {!isLoadingPresets && !presetsError && filteredPresets.length === 0 && presets.length > 0 && (
                  <div className="col-span-full text-center py-8">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-muted-foreground">
                      {language === 'fr' 
                        ? `Aucun préréglage trouvé pour "${searchQuery}"`
                        : `No presets found for "${searchQuery}"`
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>

      {/* Create Preset Modal */}
      <PresetCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPresetCreated={(newPreset) => {
          setPresets(prev => [newPreset, ...prev])
          setIsCreateModalOpen(false)
        }}
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
    </AuthGuard>
  )
}