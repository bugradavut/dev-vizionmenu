'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent, 
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { 
  Store,
  Globe,
  QrCode,
  Smartphone,
  AlertCircle,
  RotateCcw,
  Save
} from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import type { Chain } from '@/services/chains.service'
import type { Branch } from '@/services/branches.service'
import { branchesService } from '@/services/branches.service'
import { commissionService, type CommissionRate } from '@/services/commission.service'
import { useToast } from '@/hooks/use-toast'

interface BranchSettingsTabProps {
  chain: Chain
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

export const BranchSettingsTab: React.FC<BranchSettingsTabProps> = ({
  chain
}) => {
  const { language } = useLanguage()
  const { toast } = useToast()
  
  // State management
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')
  const [branchRates, setBranchRates] = useState<CommissionRate[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load branches for the current chain on mount
  useEffect(() => {
    if (chain?.id) {
      loadBranches(chain.id)
    }
  }, [chain?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load commission rates when branch changes
  useEffect(() => {
    if (chain?.id && selectedBranchId) {
      loadCommissionRates(chain.id, selectedBranchId)
    }
  }, [chain?.id, selectedBranchId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadBranches = async (chainId: string) => {
    try {
      const data = await branchesService.getBranchesByChain(chainId)
      setBranches(data.branches || [])
    } catch (error) {
      console.error('Failed to load branches:', error)
      setBranches([])
      toast({
        title: 'Error', 
        description: 'Failed to load branches for this chain',
        variant: 'destructive'
      })
    }
  }

  const loadCommissionRates = async (chainId: string, branchId: string) => {
    try {
      setLoading(true)
      setError(null)

      // Load branch-specific commission settings
      const branchData = await commissionService.getBranchSettings(branchId)
      setBranchRates(branchData.settings || [])
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to load commission rates:', error)
      setError('Failed to load commission settings')
      
      // Fallback data
      const mockRates = sourceTypeConfig.map(source => ({
        source_type: source.type,
        default_rate: getDefaultRate(source.type),
        chain_rate: null,
        branch_rate: null,
        effective_rate: getDefaultRate(source.type),
        has_override: false,
        is_active: true
      }))
      
      setBranchRates(mockRates)
    } finally {
      setLoading(false)
    }
  }

  const getDefaultRate = (sourceType: string): number => {
    const defaults: Record<string, number> = {
      website: 3.00,
      qr: 1.00,
      mobile_app: 2.00
    }
    return defaults[sourceType] || 0.00
  }

  const updateBranchRate = (sourceType: string, newRate: string, useOverride: boolean) => {
    const rateValue = parseFloat(newRate) || 0
    
    // Validation
    if (useOverride && (rateValue < 0 || rateValue > 100)) {
      toast({
        title: 'Invalid Rate',
        description: 'Rate must be between 0% and 100%',
        variant: 'destructive'
      })
      return
    }

    setBranchRates(prev => {
      const existingIndex = prev.findIndex(rate => rate.source_type === sourceType)
      const existingRate = prev[existingIndex]
      const defaultRate = existingRate?.default_rate || getDefaultRate(sourceType)
      const chainRate = existingRate?.chain_rate || null

      const newRateData = {
        source_type: sourceType,
        default_rate: defaultRate,
        chain_rate: chainRate,
        branch_rate: useOverride ? rateValue : null,
        effective_rate: useOverride ? rateValue : (chainRate || defaultRate),
        has_override: useOverride,
        is_active: true
      }

      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = newRateData
        return updated
      } else {
        return [...prev, newRateData]
      }
    })
    
    setHasChanges(true)
    setError(null)
  }

  const getBranchRate = (sourceType: string): CommissionRate => {
    // Return branch-specific rate if available
    const branchRate = branchRates.find(rate => rate.source_type === sourceType)
    
    if (branchRate) {
      return branchRate
    }
    
    // Default fallback
    return {
      source_type: sourceType,
      default_rate: getDefaultRate(sourceType),
      chain_rate: null,
      branch_rate: null,
      effective_rate: getDefaultRate(sourceType),
      has_override: false,
      is_active: true
    }
  }

  const resetBranchRates = async () => {
    const confirmReset = confirm(
      language === 'fr' 
        ? 'Êtes-vous sûr de vouloir supprimer tous les taux personnalisés de cette succursale?'
        : 'Are you sure you want to remove all custom rates for this branch?'
    )
    if (!confirmReset) return
    
    try {
      setSaving(true)
      
      // Reset branch rates using the API
      await commissionService.resetBranchRates(selectedBranchId)
      
      // Reload the commission rates
      await loadCommissionRates(chain.id, selectedBranchId)
      setHasChanges(false)
      
      const selectedBranch = branches.find(b => b.id === selectedBranchId)
      toast({
        title: 'Success',
        description: language === 'fr' 
          ? `Taux de la succursale ${selectedBranch?.name} réinitialisés`
          : `Branch rates reset for ${selectedBranch?.name}`
      })
    } catch (error) {
      console.error('Failed to reset branch rates:', error)
      toast({
        title: 'Error',
        description: 'Failed to reset branch rates',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const saveBranchRates = async () => {
    if (!selectedBranchId || !hasChanges) return
    
    try {
      setSaving(true)
      setError(null)
      
      // Prepare rates for bulk update
      const ratesToUpdate = branchRates
        .filter(rate => rate.has_override)
        .map(rate => ({
          sourceType: rate.source_type,
          rate: rate.branch_rate || 0
        }))

      if (ratesToUpdate.length > 0) {
        await commissionService.bulkUpdateBranchRates(selectedBranchId, ratesToUpdate)
      }

      // Also handle removing overrides (when has_override is false but rate existed before)
      const ratesToRemove = branchRates.filter(rate => !rate.has_override && rate.branch_rate !== null)
      for (const rate of ratesToRemove) {
        await commissionService.removeBranchOverride(selectedBranchId, rate.source_type)
      }

      setHasChanges(false)
      
      const selectedBranch = branches.find(b => b.id === selectedBranchId)
      toast({
        title: 'Success',
        description: language === 'fr' 
          ? `Taux de commission mis à jour pour ${selectedBranch?.name}`
          : `Commission rates updated for ${selectedBranch?.name}`
      })
    } catch (error) {
      console.error('Failed to save branch rates:', error)
      setError('Failed to save branch settings')
      toast({
        title: 'Error',
        description: 'Failed to save branch commission rates',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const clearChanges = () => {
    if (chain?.id && selectedBranchId) {
      loadCommissionRates(chain.id, selectedBranchId)
    }
    setHasChanges(false)
    setError(null)
  }

  return (
    <div className="space-y-6">
      {/* Branch Selection */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          {language === 'fr' ? 'Sélectionner une Succursale' : 'Select Branch'}
        </Label>
        <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
          <SelectTrigger className="w-full">
            <Store className="h-4 w-4 mr-2" />
            <SelectValue placeholder={language === 'fr' ? 'Choisir une succursale...' : 'Choose a branch...'} />
          </SelectTrigger>
          <SelectContent>
            {branches.map(branch => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Commission Settings */}
      {selectedBranchId && (
        <>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">
                {language === 'fr' ? 'Chargement des paramètres...' : 'Loading settings...'}
              </p>
            </div>
          ) : (
            <>
              {/* Header Actions */}
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div>
                  <h3 className="text-lg font-semibold">
                    {language === 'fr' ? 'Taux de Commission par Source' : 'Commission Rates by Source'}
                  </h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetBranchRates}
                  disabled={saving}
                  className="flex items-center gap-2 hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
                >
                  {saving ? (
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  {language === 'fr' ? 'Réinitialiser' : 'Reset All'}
                </Button>
              </div>

              {/* Commission Sources List */}
              <div className="space-y-3">
                {sourceTypeConfig.map((sourceConfig) => {
                  const rateConfig = getBranchRate(sourceConfig.type)
                  const inheritedRate = rateConfig.chain_rate || rateConfig.default_rate
                  
                  const IconComponent = sourceConfig.icon
                  const label = language === 'fr' ? sourceConfig.labelFr : sourceConfig.label

                  return (
                    <div 
                      key={sourceConfig.type} 
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      {/* Left: Icon + Label + Chain/Default Rate */}
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
                            {rateConfig.chain_rate 
                              ? `${language === 'fr' ? 'Chaîne:' : 'Chain:'} ${rateConfig.chain_rate}%`
                              : `${language === 'fr' ? 'Défaut:' : 'Default:'} ${rateConfig.default_rate}%`
                            }
                            {rateConfig.has_override && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
                                {language === 'fr' ? 'Personnalisé' : 'Custom'}
                              </span>
                            )}
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
                                updateBranchRate(sourceConfig.type, inheritedRate.toString(), true)
                              } else {
                                updateBranchRate(sourceConfig.type, inheritedRate.toString(), false)
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
                              ? (rateConfig.branch_rate?.toString() || inheritedRate.toString())
                              : inheritedRate.toString()
                            }
                            onChange={(e) => updateBranchRate(sourceConfig.type, e.target.value, rateConfig.has_override)}
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

              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
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
                      ? 'Les nouveaux taux s\'appliqueront uniquement aux nouvelles commandes de cette succursale.'
                      : 'New rates will only apply to future orders from this branch.'
                    }
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              {hasChanges && (
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <Button variant="outline" onClick={clearChanges} disabled={saving}>
                    {language === 'fr' ? 'Annuler' : 'Cancel'}
                  </Button>
                  <Button 
                    onClick={saveBranchRates} 
                    disabled={saving}
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
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Empty State - No Branch Selected */}
      {!selectedBranchId && (
        <div className="text-center py-16">
          <Store className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {language === 'fr' ? 'Sélectionner une Succursale' : 'Select a Branch'}
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {language === 'fr' 
              ? `Choisissez une succursale de ${chain.name} pour configurer ses taux de commission personnalisés.`
              : `Choose a branch from ${chain.name} to configure its custom commission rates.`
            }
          </p>
          {branches.length === 0 && (
            <p className="text-sm text-muted-foreground mt-3">
              {language === 'fr'
                ? 'Aucune succursale trouvée pour cette chaîne.'
                : 'No branches found for this chain.'
              }
            </p>
          )}
        </div>
      )}
    </div>
  )
}