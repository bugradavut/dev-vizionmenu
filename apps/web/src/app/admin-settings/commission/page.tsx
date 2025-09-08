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
import { 
  Percent, 
  Globe,
  QrCode,
  Smartphone,
  Truck,
  ShoppingBag,
  Building2,
  Settings,
  Info
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/translations"
import { useState, useEffect } from 'react'
import { useToast } from "@/hooks/use-toast"
import { chainsService, Chain } from "@/services/chains.service"
import { commissionService } from "@/services/commission.service"
import { ConfigureCommissionModal } from "@/components/commission"

interface CommissionRate {
  source_type: string
  default_rate: string
  description: string
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
    type: 'mobile_app',
    label: 'Mobile App Orders', 
    labelFr: 'Commandes Application Mobile',
    description: 'Orders from mobile application (future)',
    descriptionFr: 'Commandes de l\'application mobile (futur)',
    icon: Smartphone,
    color: 'bg-purple-500',
    badge: 'Future'
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
        description: config.description
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
      console.log('Chains fetched for commission:', response.chains)
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

  const getDefaultRate = (sourceType: string): string => {
    const defaults: Record<string, string> = {
      website: '3.00',
      qr: '1.00', 
      mobile_app: '2.00',
      takeaway: '2.00',
      delivery: '2.50',
      uber_eats: '0.00',
      doordash: '0.00',
      skipthedishes: '0.00'
    }
    return defaults[sourceType] || '3.00'
  }


  const getCurrentRate = (sourceType: string): string => {
    const rate = commissionRates.find(r => r.source_type === sourceType)
    return rate?.default_rate || getDefaultRate(sourceType)
  }

  // Load default rates from API
  const loadDefaultRates = async () => {
    try {
      const rates = await commissionService.getDefaultRates()
      const formattedRates = rates.map(rate => ({
        source_type: rate.source_type,
        default_rate: rate.default_rate.toString(),
        description: rate.description || ''
      }))
      setCommissionRates(formattedRates)
    } catch (error) {
      console.error('Failed to load default rates:', error)
      // Keep using mock data
    }
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
                              <div className="mt-3">
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
                        
                        {/* Commission Status */}
                        <div className="px-6 pb-4">
                          <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Percent className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                  {language === 'fr' ? 'Taux par Défaut' : 'Default Rates'}
                                </span>
                              </div>
                              <Badge variant="outline" className="text-xs bg-white dark:bg-gray-800">
                                {language === 'fr' ? 'Configuré' : 'Configured'}
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
            <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
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

                  {/* Commission Rates */}
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-3 uppercase tracking-wider">
                      {language === 'fr' ? 'Taux de Commission Actuels' : 'Current Commission Rates'}
                    </h4>
                    <div className="grid gap-3">
                      {sourceTypeConfig
                        .filter(config => config.type !== 'mobile_app') // Hide future implementation
                        .map((config) => {
                          const IconComponent = config.icon
                          const currentRate = getCurrentRate(config.type)
                          const label = language === 'fr' ? config.labelFr : config.label
                          const description = language === 'fr' ? config.descriptionFr : config.description
                          
                          return (
                            <div key={config.type} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${config.color.replace('bg-', 'bg-opacity-10 bg-')} text-white`}>
                                  <IconComponent className="h-4 w-4" style={{ color: config.color.replace('bg-', '') }} />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{label}</p>
                                  <p className="text-xs text-muted-foreground">{description}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-lg">{currentRate}%</div>
                                <div className="text-xs text-muted-foreground">
                                  {language === 'fr' ? 'par défaut' : 'default'}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>

                  {/* Notice */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                      <div>
                        <h5 className="font-medium text-blue-900 dark:text-blue-100 text-sm mb-1">
                          {language === 'fr' ? 'Information' : 'Information'}
                        </h5>
                        <p className="text-xs text-blue-800 dark:text-blue-200">
                          {language === 'fr' 
                            ? 'Cette chaîne utilise actuellement les taux de commission par défaut. Vous pouvez configurer des taux personnalisés en cliquant sur "Configurer".'
                            : 'This chain is currently using default commission rates. You can configure custom rates by clicking "Configure".'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
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
            }}
          />
        </SidebarInset>
      </DashboardLayout>
    </AuthGuard>
  )
}