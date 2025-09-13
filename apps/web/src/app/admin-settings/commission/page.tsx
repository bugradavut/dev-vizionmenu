'use client'

import { AuthGuard } from "@/components/auth-guard"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Percent, 
  Globe,
  QrCode,
  Smartphone,
  Building2,
  Settings,
  Info,
  Store
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/translations"
import { useState, useEffect } from 'react'
import { useToast } from "@/hooks/use-toast"
import { chainsService, Chain, Branch } from "@/services/chains.service"
import { commissionService } from "@/services/commission.service"
import { ConfigureCommissionModal } from "@/components/commission"

import { CommissionRate } from '@/services/commission.service'


const sourceTypeConfig = [
  {
    type: 'website',
    label: 'Website Orders',
    labelFr: 'Commandes Site Web',
    icon: Globe,
    color: 'bg-blue-500'
  },
  {
    type: 'qr', 
    label: 'QR Code Orders',
    labelFr: 'Commandes Code QR',
    icon: QrCode,
    color: 'bg-green-500'
  },
  {
    type: 'mobile_app',
    label: 'Mobile App Orders',
    labelFr: 'Commandes App Mobile',
    icon: Smartphone,
    color: 'bg-purple-500'
  }
]

export default function CommissionSettingsPage() {
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  const { toast } = useToast()
  
  const [commissionRates, setCommissionRates] = useState<CommissionRate[]>([])
  const [chains, setChains] = useState<Chain[]>([])
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null)
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [chainsLoading, setChainsLoading] = useState(true)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [selectedChainInfo, setSelectedChainInfo] = useState<Chain | null>(null)
  const [infoModalTab, setInfoModalTab] = useState('chain')

  // Load commission rates and chains on mount
  useEffect(() => {
    fetchCommissionRates()
    fetchChains()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCommissionRates = async () => {
    try {
      setLoading(true)
      // TODO: API call to fetch commission rates
      // For now, simulate with default data
      setCommissionRates(sourceTypeConfig.map(config => ({
        source_type: config.type,
        default_rate: getDefaultRate(config.type),
        chain_rate: null,
        branch_rate: null,
        effective_rate: getDefaultRate(config.type),
        has_override: false,
        is_active: true
      })))
    } catch (error) {
      console.error('Failed to fetch commission rates:', error)
      toast({
        title: "Error",
        description: "Failed to load commission settings",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchChains = async () => {
    try {
      setChainsLoading(true)
      const response = await chainsService.getChains()
      setChains(response.chains)
    } catch (error) {
      console.error('Failed to fetch chains:', error)
      toast({
        title: "Error",
        description: "Failed to load restaurant chains",
        variant: "destructive",
      })
    } finally {
      setChainsLoading(false)
    }
  }

  const getDefaultRate = (sourceType: string): number => {
    const defaults: Record<string, number> = {
      website: 3.00,        // Standard commission for web orders
      qr: 1.00,            // Reduced commission for in-restaurant QR orders
      mobile_app: 2.00     // Mobile app commission (future implementation)
    }
    return defaults[sourceType] || 0.00
  }



  // Load default rates from API
  const loadDefaultRates = async () => {
    try {
      const rates = await commissionService.getDefaultRates()
      const formattedRates = rates.map(rate => ({
        source_type: rate.source_type,
        default_rate: parseFloat(rate.default_rate.toString()),
        chain_rate: null,
        branch_rate: null,
        effective_rate: parseFloat(rate.default_rate.toString()),
        has_override: false,
        is_active: true
      }))
      setCommissionRates(formattedRates)
    } catch (error) {
      console.error('Failed to load default rates:', error)
      // Keep using mock data
    }
  }

  // Load chain-specific rates for info modal
  const [chainCommissionRates, setChainCommissionRates] = useState<{
    source_type: string;
    has_override: boolean;
    chain_rate: number | null;
    effective_rate: number;
  }[]>([])
  const [loadingChainRates, setLoadingChainRates] = useState(false)
  const [chainBranches, setChainBranches] = useState<Branch[]>([])
  const [branchCommissionRates, setBranchCommissionRates] = useState<{
    branchId: string;
    branchName: string;
    rates: CommissionRate[];
  }[]>([])
  const [loadingBranchRates, setLoadingBranchRates] = useState(false)

  const loadChainCommissionRates = async (chainId: string) => {
    try {
      setLoadingChainRates(true)
      const response = await commissionService.getChainSettings(chainId)
      setChainCommissionRates(response.settings)
    } catch (error) {
      console.error('Failed to load chain commission rates:', error)
      setChainCommissionRates([])
    } finally {
      setLoadingChainRates(false)
    }
  }

  const loadChainBranchesAndRates = async (chainId: string) => {
    try {
      setLoadingBranchRates(true)
      // Get chain with branches
      const chainWithBranches = await chainsService.getChainById(chainId)
      setChainBranches(chainWithBranches.branches || [])
      
      // Get commission rates for each branch
      const branchRatesPromises = (chainWithBranches.branches || []).map(async (branch) => {
        try {
          const branchSettings = await commissionService.getBranchSettings(branch.id)
          return {
            branchId: branch.id,
            branchName: branch.name,
            rates: branchSettings.settings
          }
        } catch (error) {
          console.error(`Failed to load rates for branch ${branch.id}:`, error)
          return {
            branchId: branch.id,
            branchName: branch.name,
            rates: []
          }
        }
      })
      
      const branchRatesData = await Promise.all(branchRatesPromises)
      setBranchCommissionRates(branchRatesData)
    } catch (error) {
      console.error('Failed to load branch commission rates:', error)
      setChainBranches([])
      setBranchCommissionRates([])
    } finally {
      setLoadingBranchRates(false)
    }
  }

  const getChainSpecificRate = (sourceType: string): string => {
    const chainRate = chainCommissionRates.find(r => r.source_type === sourceType)
    if (chainRate?.has_override && chainRate.chain_rate !== null) {
      return chainRate.chain_rate.toString()
    }
    // Fallback to default rate
    const defaultRate = commissionRates.find(r => r.source_type === sourceType)
    return defaultRate?.default_rate.toString() || getDefaultRate(sourceType).toString()
  }

  // Load default rates on mount
  useEffect(() => {
    if (commissionRates.length === 0) {
      loadDefaultRates()
    }
  }, [commissionRates.length])

  if (loading) {
    return (
      <AuthGuard requireAuth={true} requireRememberOrRecent={true} redirectTo="/login">
        <DashboardLayout>
          <AppSidebar />
          <SidebarInset>
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">Loading commission settings...</div>
            </div>
          </SidebarInset>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requireAuth={true} requireRememberOrRecent={true} redirectTo="/login">
      <DashboardLayout>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
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
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/admin-settings">
                      {language === 'fr' ? 'Paramètres Admin' : 'Admin Settings'}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>
                      {language === 'fr' ? 'Commission' : 'Commission'}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          
          {/* Header Section */}
          <div className="px-2 py-6 sm:px-4 lg:px-6 bg-background">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8">
                <h1 className="text-3xl font-bold tracking-tight">
                  {language === 'fr' ? 'Paramètres de Commission' : 'Commission Settings'}
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">
                  {language === 'fr' 
                    ? 'Configurez les taux de commission pour différentes sources de commandes.'
                    : 'Configure commission rates for different order sources.'
                  }
                </p>
              </div>
              <div className="lg:col-span-4 flex items-center justify-end">
                {/* Header actions can go here if needed */}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 px-2 py-8 sm:px-4 lg:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Restaurant Chain Commission Cards */}
              <div className="lg:col-span-12">
                {chainsLoading ? (
                  <div className="text-center py-16">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {language === 'fr' ? 'Chargement des chaînes...' : 'Loading restaurant chains...'}
                    </p>
                  </div>
                ) : chains.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-medium mb-2">
                      {language === 'fr' ? 'Aucune chaîne trouvée' : 'No restaurant chains found'}
                    </h3>
                    <p className="text-sm">
                      {language === 'fr' ? 'Créez des chaînes de restaurants pour configurer les commissions.' : 'Create restaurant chains to configure commission rates.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                    {chains.map((chain) => (
                      <Card key={chain.id} className="h-full flex flex-col">
                        {/* Top section with chain info and status */}
                        <div className="p-6 flex-1">
                          <div className="flex items-start gap-4 h-full">
                            {/* Left: Chain Logo */}
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                              {chain.logo_url ? (
                                <Image
                                  src={chain.logo_url}
                                  alt={chain.name}
                                  width={64}
                                  height={64}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                              )}
                            </div>
                            
                            {/* Middle: Chain Info */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                              {/* Title */}
                              <div>
                                <CardTitle className="text-lg font-semibold truncate mb-1">
                                  {chain.name}
                                </CardTitle>
                              </div>
                              
                              {/* Branch Count */}
                              <div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span className="font-medium">{chain.branch_count}</span>
                                  <span>{language === 'fr' ? 'succursales' : 'branches'}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Right: Status Badge */}
                            <div className="flex flex-col items-end justify-start">
                              <Badge 
                                variant={chain.is_active ? "default" : "secondary"}
                                className={
                                  chain.is_active 
                                    ? 'text-green-700 border-green-300 bg-green-100 dark:text-green-400 dark:border-green-700 dark:bg-green-900/20' 
                                    : 'text-gray-600 border-gray-200 bg-gray-50 dark:text-gray-400 dark:border-gray-600 dark:bg-gray-800'
                                }
                              >
                                <div className={`w-2 h-2 rounded-full mr-2 ${chain.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                                {chain.is_active 
                                  ? (language === 'fr' ? 'Actif' : 'Active')
                                  : (language === 'fr' ? 'Inactif' : 'Inactive')
                                }
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        {/* Bottom action buttons */}
                        <div className="border-t border-gray-200 dark:border-gray-700 flex">
                          <Button 
                            variant="ghost" 
                            onClick={() => {
                              setSelectedChainInfo(chain)
                              setShowInfoModal(true)
                              loadChainCommissionRates(chain.id)
                              loadChainBranchesAndRates(chain.id)
                            }}
                            className="flex-1 rounded-none border-r border-gray-200 dark:border-gray-700 h-12 text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            <Info className="w-4 h-4" />
                            {language === 'fr' ? 'Info' : 'Info'}
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            onClick={() => {
                              setSelectedChain(chain)
                              setShowOverrideModal(true)
                            }}
                            className="flex-1 rounded-none h-12 text-sm font-medium flex items-center justify-center gap-2 hover:bg-green-50 dark:hover:bg-green-900/20"
                          >
                            <Settings className="w-4 h-4" />
                            {language === 'fr' ? 'Configurer' : 'Configure'}
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Info Modal */}
          <Dialog open={showInfoModal} onOpenChange={setShowInfoModal}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  {selectedChainInfo?.name}
                </DialogTitle>
                <DialogDescription>
                  {language === 'fr' 
                    ? 'Détails de la configuration des commissions pour cette chaîne'
                    : 'Commission configuration details for this chain'
                  }
                </DialogDescription>
              </DialogHeader>
              
              {selectedChainInfo && (
                <div className="space-y-6 overflow-y-auto max-h-[calc(90vh-200px)] px-1">
                  <Tabs value={infoModalTab} onValueChange={setInfoModalTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="chain" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span>{language === 'fr' ? 'Aperçu de la Chaîne' : 'Chain Overview'}</span>
                      </TabsTrigger>
                      <TabsTrigger value="branches" className="flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        <span>{language === 'fr' ? 'Détails des Succursales' : 'Branch Details'}</span>
                      </TabsTrigger>
                    </TabsList>

                    {/* Chain Overview Tab */}
                    <TabsContent value="chain" className="mt-6">
                      <div className="space-y-6">
                        {/* Chain Basic Info */}
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-3 uppercase tracking-wider">
                            {language === 'fr' ? 'Informations de Base' : 'Basic Information'}
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                {language === 'fr' ? 'Nom' : 'Name'}
                              </Label>
                              <p className="font-medium">{selectedChainInfo.name}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                {language === 'fr' ? 'Statut' : 'Status'}
                              </Label>
                              <div className="flex items-center gap-2 mt-1">
                                <div className={`w-2 h-2 rounded-full ${selectedChainInfo.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                                <span className="text-sm">
                                  {selectedChainInfo.is_active 
                                    ? (language === 'fr' ? 'Actif' : 'Active')
                                    : (language === 'fr' ? 'Inactif' : 'Inactive')
                                  }
                                </span>
                              </div>
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs text-muted-foreground">
                                {language === 'fr' ? 'Succursales' : 'Branches'}
                              </Label>
                              <p className="font-medium">{selectedChainInfo.branch_count} {language === 'fr' ? 'succursales' : 'branches'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Chain Commission Rates */}
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-3 uppercase tracking-wider">
                            {language === 'fr' ? 'Taux de Commission de la Chaîne' : 'Chain Commission Rates'}
                          </h4>
                          {loadingChainRates ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {sourceTypeConfig
                                .map((config) => {
                                  const IconComponent = config.icon
                                  const currentRate = getChainSpecificRate(config.type)
                                  const label = language === 'fr' ? config.labelFr : config.label
                                  
                                  // Check if this is a custom rate
                                  const chainRate = chainCommissionRates.find(r => r.source_type === config.type)
                                  const isCustom = chainRate?.has_override && chainRate.chain_rate !== null
                                  
                                  return (
                                    <div key={config.type} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                      {/* Left: Icon + Label */}
                                      <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                          config.color === 'bg-black' 
                                            ? 'bg-gray-200 dark:bg-gray-600' 
                                            : config.color.replace('bg-', 'bg-') + ' bg-opacity-20 dark:bg-opacity-30'
                                        }`}>
                                          <IconComponent className="w-5 h-5" style={{ 
                                            color: config.color.replace('bg-', '#')
                                              .replace('black', '#4b5563')
                                              .replace('red-500', '#dc2626')
                                              .replace('yellow-500', '#d97706')
                                              .replace('blue-500', '#2563eb')
                                              .replace('green-500', '#16a34a')
                                              .replace('purple-500', '#9333ea')
                                          }} />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-medium text-gray-900 dark:text-gray-100">{label}</h4>
                                            {isCustom && (
                                              <Badge variant="secondary" className="text-xs px-2 py-1">
                                                {language === 'fr' ? 'Personnalisé' : 'Custom'}
                                              </Badge>
                                            )}
                                          </div>
                                          <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {isCustom 
                                              ? (language === 'fr' ? 'Taux personnalisé de la chaîne' : 'Chain custom rate')
                                              : (language === 'fr' ? 'Taux par défaut de la plateforme' : 'Platform default rate')
                                            }
                                          </p>
                                        </div>
                                      </div>

                                      {/* Right: Rate */}
                                      <div className="text-right">
                                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{currentRate}%</div>
                                      </div>
                                    </div>
                                  )
                                })}
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    {/* Branch Details Tab */}
                    <TabsContent value="branches" className="mt-6">
                      <div className="space-y-6">
                        {/* Header */}
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-3 uppercase tracking-wider">
                            {language === 'fr' ? 'Personnalisations par Succursale' : 'Branch-Level Customizations'}
                          </h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            {language === 'fr' 
                              ? 'Seules les succursales avec des taux personnalisés sont affichées'
                              : 'Only branches with custom commission rates are shown'
                            }
                          </p>
                        </div>

                        {loadingBranchRates ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                          </div>
                        ) : chainBranches.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                            <p className="text-sm">
                              {language === 'fr' ? 'Aucune succursale trouvée' : 'No branches found'}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {branchCommissionRates.map((branchData) => {
                              // Only show branches with overrides
                              const hasOverrides = branchData.rates.some(rate => rate.has_override && rate.branch_rate !== null)
                              if (!hasOverrides) return null
                              
                              return (
                                <div key={branchData.branchId} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                  {/* Branch Header */}
                                  <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-700 p-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                                        <Store className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                      </div>
                                      <div>
                                        <h5 className="font-medium text-gray-900 dark:text-gray-100">{branchData.branchName}</h5>
                                        <p className="text-xs text-blue-600 dark:text-blue-400">
                                          {branchData.rates.filter(rate => rate.has_override && rate.branch_rate !== null).length} {language === 'fr' ? 'taux personnalisés' : 'custom rates'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Branch Commission Rates */}
                                  <div className="p-4 space-y-3">
                                    {branchData.rates.map((rate) => {
                                      if (!rate.has_override || rate.branch_rate === null) return null
                                      
                                      const config = sourceTypeConfig.find(c => c.type === rate.source_type)
                                      if (!config) return null
                                      
                                      const IconComponent = config.icon
                                      const label = language === 'fr' ? config.labelFr : config.label
                                      
                                      return (
                                        <div key={rate.source_type} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                          {/* Left: Icon + Label */}
                                          <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                              config.color === 'bg-black' 
                                                ? 'bg-gray-200 dark:bg-gray-600' 
                                                : config.color.replace('bg-', 'bg-') + ' bg-opacity-20 dark:bg-opacity-30'
                                            }`}>
                                              <IconComponent className="w-5 h-5" style={{ 
                                                color: config.color.replace('bg-', '#')
                                                  .replace('black', '#4b5563')
                                                  .replace('red-500', '#dc2626')
                                                  .replace('yellow-500', '#d97706')
                                                  .replace('blue-500', '#2563eb')
                                                  .replace('green-500', '#16a34a')
                                                  .replace('purple-500', '#9333ea')
                                              }} />
                                            </div>
                                            <div>
                                              <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-medium text-gray-900 dark:text-gray-100">{label}</h4>
                                                <Badge variant="outline" className="text-xs px-2 py-1">
                                                  {language === 'fr' ? 'Personnalisé' : 'Custom'}
                                                </Badge>
                                              </div>
                                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {language === 'fr' ? 'Taux spécifique à la succursale' : 'Branch-specific rate'}
                                              </p>
                                            </div>
                                          </div>

                                          {/* Right: Rate */}
                                          <div className="text-right">
                                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{rate.branch_rate}%</div>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )
                            })}
                            
                            {branchCommissionRates.every(branchData => 
                              !branchData.rates.some(rate => rate.has_override && rate.branch_rate !== null)
                            ) && (
                              <div className="text-center py-12 text-muted-foreground">
                                <Percent className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                                <h3 className="text-lg font-medium mb-2">
                                  {language === 'fr' ? 'Aucune Personnalisation' : 'No Customizations'}
                                </h3>
                                <p className="text-sm mb-1">
                                  {language === 'fr' 
                                    ? 'Toutes les succursales utilisent les taux de la chaîne'
                                    : 'All branches use chain commission rates'
                                  }
                                </p>
                                <p className="text-xs">
                                  {language === 'fr' 
                                    ? 'Utilisez "Configurer" pour personnaliser les taux par succursale'
                                    : 'Use "Configure" to customize rates per branch'
                                  }
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Configure Modal */}
          <ConfigureCommissionModal
            isOpen={showOverrideModal}
            onClose={() => {
              setShowOverrideModal(false)
              setSelectedChain(null)
            }}
            chain={selectedChain}
            onSave={() => {
              // Refresh chain data or show success message
              fetchChains()
              // If info modal is open, refresh chain commission rates
              if (selectedChainInfo && showInfoModal) {
                loadChainCommissionRates(selectedChainInfo.id)
              }
            }}
          />
        </SidebarInset>
      </DashboardLayout>
    </AuthGuard>
  )
}