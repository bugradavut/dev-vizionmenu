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
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  Globe,
  QrCode,
  Truck,
  Save,
  RotateCcw,
  AlertCircle,
  Percent,
  Calculator
} from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'
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
    description: 'Orders from restaurant website (standard commission)',
    descriptionFr: 'Commandes du site web du restaurant (commission standard)',
    icon: Globe,
    color: 'bg-blue-500',
    priority: 1
  },
  {
    type: 'qr', 
    label: 'QR Code Orders',
    labelFr: 'Commandes Code QR',
    description: 'In-restaurant QR code orders (reduced commission)',
    descriptionFr: 'Commandes par code QR en restaurant (commission réduite)',
    icon: QrCode,
    color: 'bg-green-500',
    priority: 2
  },
  {
    type: 'delivery',
    label: 'Uber Direct Delivery',
    labelFr: 'Livraison Uber Direct',
    description: 'Future: Uber Direct delivery integration (no commission)',
    descriptionFr: 'Futur: Intégration livraison Uber Direct (sans commission)',
    icon: Truck,
    color: 'bg-indigo-600',
    badge: 'Future',
    priority: 3
  },
  {
    type: 'uber_eats',
    label: 'Uber Eats',
    labelFr: 'Uber Eats',
    description: 'Third-party platform orders (no commission)',
    descriptionFr: 'Commandes plateforme tierce (sans commission)',
    icon: Truck,
    color: 'bg-black',
    priority: 4
  },
  {
    type: 'doordash',
    label: 'DoorDash',
    labelFr: 'DoorDash', 
    description: 'Third-party platform orders (no commission)',
    descriptionFr: 'Commandes plateforme tierce (sans commission)',
    icon: Truck,
    color: 'bg-red-500',
    priority: 5
  },
  {
    type: 'skipthedishes',
    label: 'Skip The Dishes',
    labelFr: 'Skip The Dishes',
    description: 'Third-party platform orders (no commission)', 
    descriptionFr: 'Commandes plateforme tierce (sans commission)',
    icon: Truck,
    color: 'bg-yellow-500',
    priority: 6
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
  
  // Calculator states
  const [calculatorAmount, setCalculatorAmount] = useState<string>('100.00')
  const [selectedSourceType, setSelectedSourceType] = useState<string>('website')

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
      delivery: 0.00,    // Future Uber Direct integration (no commission for now)
      uber_eats: 0.00,   // Third-party platform (no commission)
      doordash: 0.00,    // Third-party platform (no commission)
      skipthedishes: 0.00 // Third-party platform (no commission)
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

  // Calculator logic
  const calculatePreview = () => {
    if (!calculatorAmount) return { orderAmount: 0, commissionRate: 0, commissionAmount: 0, netAmount: 0 }
    
    const amount = parseFloat(calculatorAmount) || 0
    const rateConfig = commissionRates.find(r => r.source_type === selectedSourceType)
    const rate = rateConfig?.effective_rate || 0
    const commissionAmount = (amount * rate) / 100
    const netAmount = amount - commissionAmount
    
    return {
      orderAmount: amount,
      commissionRate: rate,
      commissionAmount: parseFloat(commissionAmount.toFixed(2)),
      netAmount: parseFloat(netAmount.toFixed(2))
    }
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
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-10 w-10 border-3 border-primary border-t-transparent rounded-full" />
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

            {/* Commission Sources Grid */}
            <div className="grid gap-4">
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
                  const description = language === 'fr' ? sourceConfig.descriptionFr : sourceConfig.description

                  const isZeroCommission = rateConfig.effective_rate === 0
                  const isCustomized = rateConfig.has_override

                  return (
                    <Card 
                      key={rateConfig.source_type} 
                      className={`group hover:shadow-md transition-all duration-200 border-l-4 ${
                        isCustomized ? 'ring-2 ring-blue-200 dark:ring-blue-800' : ''
                      }`} 
                      style={{ 
                        borderLeftColor: sourceConfig.color.replace('bg-', '#').replace('black', '#000000').replace('red-500', '#ef4444').replace('yellow-500', '#eab308').replace('blue-500', '#3b82f6').replace('green-500', '#22c55e').replace('indigo-600', '#4f46e5')
                      }}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          {/* Icon & Status */}
                          <div className="flex flex-col items-center gap-2">
                            <div className={`p-3 rounded-xl shadow-sm ${sourceConfig.color.replace('bg-', 'bg-').replace('bg-black', 'bg-gray-800')} bg-opacity-10 border`}>
                              <IconComponent className="h-6 w-6 text-white" style={{ 
                                color: sourceConfig.color.replace('bg-', '#').replace('black', '#374151').replace('red-500', '#ef4444').replace('yellow-500', '#eab308').replace('blue-500', '#3b82f6').replace('green-500', '#22c55e').replace('indigo-600', '#4f46e5')
                              }} />
                            </div>
                            {sourceConfig.badge && (
                              <Badge variant="secondary" className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                {sourceConfig.badge}
                              </Badge>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-base">{label}</h4>
                              {isCustomized && (
                                <Badge className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  {language === 'fr' ? 'Personnalisé' : 'Custom'}
                                </Badge>
                              )}
                              {isZeroCommission && (
                                <Badge variant="outline" className="text-xs px-2 py-1 text-green-700 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-700 dark:bg-green-900/20">
                                  {language === 'fr' ? 'Sans Commission' : 'No Commission'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{description}</p>
                            <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                              {language === 'fr' ? 'Taux par défaut:' : 'Default rate:'} <strong>{rateConfig.default_rate}%</strong>
                            </div>
                          </div>

                          {/* Controls */}
                          <div className="flex flex-col items-end gap-3 min-w-[120px]">
                            {/* Override Toggle */}
                            <div className="flex items-center gap-2">
                              <Label className="text-sm font-medium">
                                {language === 'fr' ? 'Personnaliser' : 'Override'}
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
                                className="data-[state=checked]:bg-blue-600"
                              />
                            </div>

                            {/* Rate Input */}
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="100"
                                  value={rateConfig.has_override ? (rateConfig.chain_rate?.toString() || '') : rateConfig.default_rate.toString()}
                                  onChange={(e) => updateRate(rateConfig.source_type, e.target.value, rateConfig.has_override)}
                                  disabled={!rateConfig.has_override}
                                  className={`w-20 text-center font-mono text-sm ${
                                    !rateConfig.has_override ? 'bg-muted text-muted-foreground' : 'focus:ring-blue-500'
                                  }`}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>

            {/* Enhanced Real-time Calculator */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                    <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                  </div>
                  {language === 'fr' ? 'Calculateur de Commission' : 'Commission Calculator'}
                </h3>
                <Badge variant="outline" className="text-xs bg-white/80 dark:bg-gray-800/80">
                  {language === 'fr' ? 'Temps Réel' : 'Real-time'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Input Controls */}
                <div className="lg:col-span-2 space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {language === 'fr' ? 'Montant de la Commande' : 'Order Amount'}
                    </Label>
                    <div className="relative mt-2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={calculatorAmount}
                        onChange={(e) => setCalculatorAmount(e.target.value)}
                        className="pl-8 text-center font-mono text-lg bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700 focus:ring-blue-500"
                        placeholder="100.00"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {language === 'fr' ? 'Source de Commande' : 'Order Source'}
                    </Label>
                    <select
                      value={selectedSourceType}
                      onChange={(e) => setSelectedSourceType(e.target.value)}
                      className="w-full mt-2 p-3 border border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {sourceTypeConfig.map((config) => {
                        const rate = commissionRates.find(r => r.source_type === config.type)?.effective_rate || 0
                        const label = language === 'fr' ? config.labelFr : config.label
                        return (
                          <option key={config.type} value={config.type}>
                            {label} • {rate}%
                          </option>
                        )
                      })}
                    </select>
                  </div>
                </div>

                {/* Results Display */}
                <div className="lg:col-span-3">
                  {(() => {
                    const preview = calculatePreview()
                    const selectedConfig = sourceTypeConfig.find(c => c.type === selectedSourceType)
                    const selectedLabel = language === 'fr' ? selectedConfig?.labelFr : selectedConfig?.label
                    
                    return (
                      <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-blue-200 dark:border-blue-700 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                            {language === 'fr' ? 'Aperçu du Calcul' : 'Calculation Preview'}
                          </h4>
                        </div>
                        
                        <div className="space-y-3">
                          {/* Order Amount */}
                          <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="font-medium">{language === 'fr' ? 'Montant Total' : 'Order Total'}</span>
                            </div>
                            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                              ${preview.orderAmount.toFixed(2)}
                            </span>
                          </div>

                          {/* Commission Calculation */}
                          <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex flex-col">
                              <span className="font-medium text-red-600 dark:text-red-400">
                                {language === 'fr' ? 'Commission VizionMenu' : 'VizionMenu Commission'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {selectedLabel} • {preview.commissionRate}%
                              </span>
                            </div>
                            <span className="text-lg font-bold text-red-600 dark:text-red-400">
                              -${preview.commissionAmount.toFixed(2)}
                            </span>
                          </div>

                          {/* Net Amount */}
                          <div className="flex items-center justify-between py-3 bg-green-50 dark:bg-green-900/20 rounded-lg px-4 border-l-4 border-green-500">
                            <div className="flex flex-col">
                              <span className="font-semibold text-green-700 dark:text-green-400">
                                {language === 'fr' ? 'Restaurant Reçoit' : 'Restaurant Receives'}
                              </span>
                              <span className="text-xs text-green-600 dark:text-green-500">
                                {language === 'fr' ? 'Montant net après commission' : 'Net amount after commission'}
                              </span>
                            </div>
                            <span className="text-xl font-bold text-green-700 dark:text-green-400">
                              ${preview.netAmount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
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