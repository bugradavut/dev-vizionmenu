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
  ShoppingBag,
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
    description: 'Orders from restaurant website',
    descriptionFr: 'Commandes du site web du restaurant',
    icon: Globe,
    color: 'bg-blue-500'
  },
  {
    type: 'qr', 
    label: 'QR Code Orders',
    labelFr: 'Commandes Code QR',
    description: 'In-restaurant QR code orders (lowest commission)',
    descriptionFr: 'Commandes par code QR en restaurant (commission la plus basse)',
    icon: QrCode,
    color: 'bg-green-500'
  },
  {
    type: 'takeaway',
    label: 'Takeaway/Pickup',
    labelFr: 'À Emporter',
    description: 'Customer pickup orders',
    descriptionFr: 'Commandes à emporter par le client',
    icon: ShoppingBag,
    color: 'bg-orange-500'
  },
  {
    type: 'delivery',
    label: 'Direct Delivery',
    labelFr: 'Livraison Directe',
    description: 'Restaurant direct delivery orders',
    descriptionFr: 'Commandes de livraison directe du restaurant',
    icon: Truck,
    color: 'bg-blue-600'
  },
  {
    type: 'uber_eats',
    label: 'Uber Eats',
    labelFr: 'Uber Eats',
    description: 'Third-party delivery platform (no commission)',
    descriptionFr: 'Plateforme de livraison tierce (sans commission)',
    icon: Truck,
    color: 'bg-black'
  },
  {
    type: 'doordash',
    label: 'DoorDash',
    labelFr: 'DoorDash', 
    description: 'Third-party delivery platform (no commission)',
    descriptionFr: 'Plateforme de livraison tierce (sans commission)',
    icon: Truck,
    color: 'bg-red-500'
  },
  {
    type: 'skipthedishes',
    label: 'Skip The Dishes',
    labelFr: 'Skip The Dishes',
    description: 'Third-party delivery platform (no commission)', 
    descriptionFr: 'Plateforme de livraison tierce (sans commission)',
    icon: Truck,
    color: 'bg-yellow-500'
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
      website: 3.00,
      qr: 1.00,
      takeaway: 2.00,
      delivery: 2.50,
      uber_eats: 0.00,
      doordash: 0.00,
      skipthedishes: 0.00
    }
    return defaults[sourceType] || 3.00
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-blue-600" />
            {language === 'fr' ? 'Configuration des Commissions' : 'Configure Commission Rates'}
            <span className="text-muted-foreground">- {chain.name}</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Commission Rates Configuration */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">
                  {language === 'fr' ? 'Taux de Commission par Source' : 'Commission Rates by Source'}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetToDefaults}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  {language === 'fr' ? 'Réinitialiser' : 'Reset to Defaults'}
                </Button>
              </div>

              <div className="grid gap-4">
                {commissionRates.map((rateConfig) => {
                  const sourceConfig = sourceTypeConfig.find(c => c.type === rateConfig.source_type)
                  if (!sourceConfig) return null

                  const IconComponent = sourceConfig.icon
                  const label = language === 'fr' ? sourceConfig.labelFr : sourceConfig.label
                  const description = language === 'fr' ? sourceConfig.descriptionFr : sourceConfig.description

                  return (
                    <Card key={rateConfig.source_type} className="border-l-4" style={{ borderLeftColor: sourceConfig.color.replace('bg-', '') }}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Icon */}
                          <div className={`p-3 rounded-lg ${sourceConfig.color.replace('bg-', 'bg-opacity-10 bg-')} flex-shrink-0`}>
                            <IconComponent className="h-5 w-5" style={{ color: sourceConfig.color.replace('bg-', '') }} />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{label}</h4>
                              {rateConfig.has_override && (
                                <Badge variant="secondary" className="text-xs">
                                  {language === 'fr' ? 'Personnalisé' : 'Custom'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{description}</p>
                            <div className="text-xs text-muted-foreground">
                              {language === 'fr' ? 'Taux par défaut:' : 'Default rate:'} {rateConfig.default_rate}%
                            </div>
                          </div>

                          {/* Controls */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Label className="text-sm">
                                {language === 'fr' ? 'Personnaliser' : 'Custom'}
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

                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={rateConfig.has_override ? (rateConfig.chain_rate?.toString() || '') : rateConfig.default_rate.toString()}
                                onChange={(e) => updateRate(rateConfig.source_type, e.target.value, rateConfig.has_override)}
                                disabled={!rateConfig.has_override}
                                className="w-20 text-center"
                              />
                              <span className="text-sm text-muted-foreground">%</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Real-time Calculator */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h3 className="font-medium text-green-900 dark:text-green-100 mb-3 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                {language === 'fr' ? 'Aperçu du Calcul' : 'Commission Preview'}
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">
                      {language === 'fr' ? 'Montant de la Commande' : 'Order Amount'}
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={calculatorAmount}
                        onChange={(e) => setCalculatorAmount(e.target.value)}
                        className="flex-1"
                        placeholder="100.00"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm">
                      {language === 'fr' ? 'Source' : 'Source'}
                    </Label>
                    <select
                      value={selectedSourceType}
                      onChange={(e) => setSelectedSourceType(e.target.value)}
                      className="w-full mt-1 p-2 border border-input rounded-md bg-background text-sm"
                    >
                      {sourceTypeConfig.map((config) => {
                        const rate = commissionRates.find(r => r.source_type === config.type)?.effective_rate || 0
                        const label = language === 'fr' ? config.labelFr : config.label
                        return (
                          <option key={config.type} value={config.type}>
                            {label} ({rate}%)
                          </option>
                        )
                      })}
                    </select>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-green-300 dark:border-green-700">
                  {(() => {
                    const preview = calculatePreview()
                    return (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>{language === 'fr' ? 'Montant:' : 'Amount:'}</span>
                          <span className="font-medium">${preview.orderAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-blue-600">
                          <span>{language === 'fr' ? 'Commission:' : 'Commission:'}</span>
                          <span className="font-medium">{preview.commissionRate}% = -${preview.commissionAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-green-600 font-semibold border-t pt-2">
                          <span>{language === 'fr' ? 'Restaurant reçoit:' : 'Restaurant receives:'}</span>
                          <span>${preview.netAmount.toFixed(2)}</span>
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