"use client"

import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Globe,
  QrCode,
  Smartphone,
  Save,
  AlertCircle,
  Percent,
  AlertTriangle,
  Building2,
  Store
} from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import type { Chain } from '@/services/chains.service'
import { useCommissionSettings } from '@/hooks/useCommissionSettings'
import { BranchSettingsTab } from './branch-settings-tab'

interface ConfigureCommissionModalProps {
  isOpen: boolean
  onClose: () => void
  chain: Chain | null
  onSave: () => void
}

const sourceTypeConfig = [
  {
    type: 'website',
    label: 'Website Orders',
    labelFr: 'Commandes Site Web',
    icon: Globe,
    color: 'bg-blue-500',
    priority: 1
  },
  {
    type: 'qr', 
    label: 'QR Code Orders',
    labelFr: 'Commandes Code QR',
    icon: QrCode,
    color: 'bg-green-500',
    priority: 2
  },
  {
    type: 'mobile_app',
    label: 'Mobile App Orders',
    labelFr: 'Commandes App Mobile',
    icon: Smartphone,
    color: 'bg-purple-500',
    priority: 3
  }
]

export const ConfigureCommissionModal: React.FC<ConfigureCommissionModalProps> = ({
  isOpen,
  onClose,
  chain,
  onSave
}) => {
  const { language } = useLanguage()
  const [activeTab, setActiveTab] = useState('chain')
  
  // Use our enterprise-grade custom hook
  const {
    rates: commissionRates,
    loading,
    saving,
    hasChanges,
    error,
    updateRate,
    saveChanges,
    refreshSettings,
    clearChanges
  } = useCommissionSettings({ chain, isOpen })

  // Load settings when modal opens
  useEffect(() => {
    if (isOpen && chain) {
      refreshSettings()
    }
  }, [isOpen, chain, refreshSettings])


  // Enhanced save with callback
  const handleSave = async () => {
    await saveChanges()
    onSave()
    onClose()
  }

  // Enhanced close with unsaved changes warning
  const handleClose = () => {
    if (hasChanges) {
      const confirmClose = confirm(
        language === 'fr' 
          ? 'Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir fermer?'
          : 'You have unsaved changes. Are you sure you want to close?'
      )
      if (!confirmClose) return
      
      clearChanges() // Clear unsaved changes
    }
    
    onClose()
  }


  if (!chain) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[95vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Percent className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-xl font-semibold">
                {language === 'fr' ? 'Configuration des Commissions' : 'Commission Configuration'}
              </div>
              <div className="text-sm text-muted-foreground font-normal">
                {chain.name}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">
              {language === 'fr' ? 'Chargement des paramètres de commission...' : 'Loading commission settings...'}
            </p>
          </div>
        ) : (
          <div className="space-y-6 overflow-y-auto max-h-[calc(95vh-200px)] px-1">
            {/* Tabs Container */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chain" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>{language === 'fr' ? 'Paramètres de Chaîne' : 'Chain Settings'}</span>
                </TabsTrigger>
                <TabsTrigger value="branch" className="flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  <span>{language === 'fr' ? 'Paramètres de Succursale' : 'Branch Settings'}</span>
                </TabsTrigger>
              </TabsList>

              {/* Chain Settings Tab */}
              <TabsContent value="chain" className="mt-6">
                <div className="space-y-6">
                  {/* Header Actions */}
            <div className="pb-2 border-b border-border">
              <div>
                <h3 className="text-lg font-semibold">
                  {language === 'fr' ? 'Taux de Commission par Source' : 'Commission Rates by Source'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === 'fr' 
                    ? 'Définir les taux par défaut pour toute la chaîne'
                    : 'Set default rates for the entire chain'
                  }
                </p>
              </div>
            </div>

            {/* Commission Sources List */}
            <div className="space-y-3">
              {commissionRates
                .sort((a, b) => {
                  const aConfig = sourceTypeConfig.find(c => c.type === a.source_type)
                  const bConfig = sourceTypeConfig.find(c => c.type === b.source_type)
                  return (aConfig?.priority || 999) - (bConfig?.priority || 999)
                })
                .map((rateConfig) => {
                  const sourceConfig = sourceTypeConfig.find(c => c.type === rateConfig.source_type)
                  if (!sourceConfig) return null

                  const IconComponent = sourceConfig.icon
                  const label = language === 'fr' ? sourceConfig.labelFr : sourceConfig.label

                  return (
                    <div 
                      key={rateConfig.source_type} 
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      {/* Left: Icon + Label + Default */}
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          sourceConfig.color === 'bg-black' 
                            ? 'bg-gray-200 dark:bg-gray-600' 
                            : sourceConfig.color.replace('bg-', 'bg-') + ' bg-opacity-20 dark:bg-opacity-30'
                        }`}>
                          <IconComponent className="w-5 h-5" style={{ 
                            color: sourceConfig.color.replace('bg-', '#')
                              .replace('black', '#4b5563')
                              .replace('red-500', '#dc2626')
                              .replace('yellow-500', '#d97706')
                              .replace('blue-500', '#2563eb')
                              .replace('green-500', '#16a34a')
                              .replace('purple-500', '#9333ea')
                          }} />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">{label}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {language === 'fr' ? 'Défaut:' : 'Default:'} {rateConfig.default_rate}%
                          </p>
                        </div>
                      </div>

                      {/* Right: Custom Toggle + Input */}
                      <div className="flex items-center gap-6">
                        {/* Custom Toggle */}
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                            {language === 'fr' ? 'Custom' : 'Custom'}
                          </Label>
                          <Switch
                            checked={rateConfig.has_override}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                // Switch açıldığında: default rate ile başla
                                updateRate(rateConfig.source_type, rateConfig.default_rate.toString(), true)
                              } else {
                                // Switch kapatıldığında: custom rate'i sıfırla, effective_rate'i default yap
                                updateRate(rateConfig.source_type, rateConfig.default_rate.toString(), false)
                              }
                            }}
                          />
                        </div>

                        {/* Rate Input */}
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={rateConfig.has_override 
                              ? (rateConfig.chain_rate?.toString() || rateConfig.default_rate.toString())
                              : rateConfig.default_rate.toString()
                            }
                            onChange={(e) => updateRate(rateConfig.source_type, e.target.value, rateConfig.has_override)}
                            disabled={!rateConfig.has_override}
                            className={`w-16 h-9 text-center font-medium ${
                              !rateConfig.has_override 
                                ? 'bg-white dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                                : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100'
                            }`}
                          />
                          <span className="text-sm text-gray-500 font-medium">%</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
                  </div>
                </div>
              </TabsContent>

              {/* Branch Settings Tab */}
              <TabsContent value="branch" className="mt-6">
                <BranchSettingsTab chain={chain} />
              </TabsContent>
            </Tabs>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Changes Warning */}
            {hasChanges && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {language === 'fr' 
                    ? 'Les nouveaux taux s\'appliqueront uniquement aux nouvelles commandes.'
                    : 'New rates will only apply to future orders.'
                  }
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Only show footer for Chain Settings tab */}
        {activeTab === 'chain' && (
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            {language === 'fr' ? 'Annuler' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !hasChanges}
            className="flex items-center gap-2"
          >
            {saving ? (
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving 
              ? (language === 'fr' ? 'Sauvegarde...' : 'Saving...') 
              : (language === 'fr' ? 'Sauvegarder' : 'Save Changes')
            }
          </Button>
        </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}