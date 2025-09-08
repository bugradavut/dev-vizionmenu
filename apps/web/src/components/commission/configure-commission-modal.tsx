"use client"

import React, { useState, useEffect } from 'react'
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
import { 
  Globe,
  QrCode,
  Smartphone,
  Save,
  RotateCcw,
  AlertCircle,
  Percent
} from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { useToast } from '@/hooks/use-toast'
import type { Chain } from '@/services/chains.service'
import { commissionService } from '@/services/commission.service'
import type { CommissionRate as APICommissionRate } from '@/services/commission.service'

// Use the interface from the service
type CommissionRate = APICommissionRate

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
  const { toast } = useToast()
  
  const [commissionRates, setCommissionRates] = useState<CommissionRate[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  

  const fetchCommissionSettings = React.useCallback(async () => {
    if (!chain) return

    try {
      setLoading(true)
      
      // Fetch commission settings from API
      const response = await commissionService.getChainSettings(chain.id)
      setCommissionRates(response.settings)
      setHasChanges(false)
      
    } catch (error) {
      console.error('Failed to fetch commission settings:', error)
      
      // Fallback to mock data if API fails
      console.log('🔄 Using fallback mock data...')
      const mockData: CommissionRate[] = sourceTypeConfig.map(config => ({
        source_type: config.type,
        default_rate: getDefaultRate(config.type),
        chain_rate: null,
        effective_rate: getDefaultRate(config.type),
        has_override: false,
        is_active: true
      }))
      
      setCommissionRates(mockData)
      setHasChanges(false)
      
      toast({
        title: "Warning",
        description: "Using default rates - API connection failed",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [chain, toast])

  // Load commission settings when modal opens
  useEffect(() => {
    if (isOpen && chain) {
      fetchCommissionSettings()
    }
  }, [isOpen, chain, fetchCommissionSettings])

  const getDefaultRate = (sourceType: string): number => {
    const defaults: Record<string, number> = {
      website: 3.00,     // Standard commission for web orders
      qr: 1.00,          // Reduced commission for in-restaurant QR orders
      mobile_app: 2.00   // Mobile app commission (future implementation)
    }
    return defaults[sourceType] || 0.00
  }

  const updateRate = (sourceType: string, newRate: string, useOverride: boolean) => {
    const rateValue = parseFloat(newRate) || 0
    
    if (rateValue < 0 || rateValue > 100) {
      toast({
        title: "Invalid Rate",
        description: "Rate must be between 0% and 100%",
        variant: "destructive",
      })
      return
    }

    setCommissionRates(prev => prev.map(rate => {
      if (rate.source_type === sourceType) {
        return {
          ...rate,
          chain_rate: useOverride ? rateValue : null,
          effective_rate: useOverride ? rateValue : rate.default_rate,
          has_override: useOverride
        }
      }
      return rate
    }))
    
    setHasChanges(true)
  }

  const resetToDefaults = () => {
    setCommissionRates(prev => prev.map(rate => ({
      ...rate,
      chain_rate: null,
      effective_rate: rate.default_rate,
      has_override: false
    })))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!chain || !hasChanges) return

    try {
      setSaving(true)
      
      // Prepare bulk update data for overrides
      const updates = commissionRates
        .filter(rate => rate.has_override && rate.chain_rate !== null)
        .map(rate => ({
          sourceType: rate.source_type,
          rate: rate.chain_rate!
        }))

      // Prepare removals (rates that had overrides but now don't)
      const removals = commissionRates
        .filter(rate => !rate.has_override && rate.chain_rate !== null)

      console.log('💾 Saving commission rates for chain:', chain.id)
      console.log('📊 Updates:', updates)
      console.log('🗑️ Removals:', removals)

      // Handle updates
      if (updates.length > 0) {
        await commissionService.bulkUpdateChainRates(chain.id, updates)
      }

      // Handle removals
      for (const removal of removals) {
        await commissionService.removeChainOverride(chain.id, removal.source_type)
      }

      toast({
        title: "Success",
        description: `Commission rates updated for ${chain.name}`,
      })

      setHasChanges(false)
      onSave()
      onClose()
      
    } catch (error) {
      console.error('❌ Failed to save commission settings:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save commission settings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (hasChanges) {
      const confirmClose = confirm(
        language === 'fr' 
          ? 'Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir fermer?'
          : 'You have unsaved changes. Are you sure you want to close?'
      )
      if (!confirmClose) return
    }
    
    setHasChanges(false)
    onClose()
  }


  if (!chain) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[95vh] overflow-hidden">
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
          <div className="space-y-6 overflow-y-auto max-h-[calc(95vh-200px)] pr-2">
            {/* Header Actions */}
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div>
                <h3 className="text-lg font-semibold">
                  {language === 'fr' ? 'Taux de Commission par Source' : 'Commission Rates by Source'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === 'fr' 
                    ? 'Personnalisez les taux pour chaque source de commande'
                    : 'Customize rates for each order source'
                  }
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefaults}
                className="flex items-center gap-2 hover:bg-destructive hover:text-destructive-foreground"
              >
                <RotateCcw className="h-4 w-4" />
                {language === 'fr' ? 'Réinitialiser' : 'Reset All'}
              </Button>
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
                                updateRate(rateConfig.source_type, rateConfig.default_rate.toString(), true)
                              } else {
                                updateRate(rateConfig.source_type, '0', false)
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
                            value={rateConfig.has_override ? (rateConfig.chain_rate?.toString() || '') : rateConfig.default_rate.toString()}
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


            {/* Warning */}
            {hasChanges && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      {language === 'fr' 
                        ? 'Les nouveaux taux s\'appliqueront uniquement aux nouvelles commandes.'
                        : 'New rates will only apply to future orders.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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
      </DialogContent>
    </Dialog>
  )
}