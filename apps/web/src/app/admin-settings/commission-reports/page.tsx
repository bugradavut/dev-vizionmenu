'use client'

import { useEffect, useState } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useLanguage } from "@/contexts/language-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Globe,
  QrCode,
  Smartphone,
  Building2,
  MapPin
} from "lucide-react"
import { CommissionSummaryCards } from "@/components/commission/commission-summary-cards"
import { CommissionBreakdownChart } from "@/components/commission/commission-breakdown-chart"
import { CommissionTrendChart } from "@/components/commission/commission-trend-chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiClient } from "@/services/api-client"
import { chainsService, type Chain, type Branch } from "@/services/chains.service"

interface CommissionData {
  totalCommission: number
  totalOrders: number
  averageCommissionRate: number
  breakdown: {
    website: { orders: number; commission: number; rate: number }
    qr: { orders: number; commission: number; rate: number }
    mobile_app: { orders: number; commission: number; rate: number }
  }
  trends: Array<{
    date: string
    commission: number
    orders: number
  }>
}

export default function CommissionReportsPage() {
  const { language } = useLanguage()
  const t = {
    title: language === 'fr' ? 'Rapports de Commission' : 'Commission Reports',
    subtitle: language === 'fr' ? 'Analysez les revenus de commission de la plateforme par source et période.' : 'Track platform commission revenue by source and time period.',
    totalCommission: language === 'fr' ? 'Commission Totale' : 'Total Commission',
    totalOrders: language === 'fr' ? 'Commandes Totales' : 'Total Orders',
    averageRate: language === 'fr' ? 'Taux Moyen' : 'Average Rate',
    perOrder: language === 'fr' ? 'Par Commande' : 'Per Order',
    breakdownBySource: language === 'fr' ? 'Répartition par Source' : 'Breakdown by Source',
    trendOverTime: language === 'fr' ? 'Tendance dans le Temps' : 'Trend Over Time',
    allChains: language === 'fr' ? 'Toutes les Chaînes' : 'All Chains',
    allBranches: language === 'fr' ? 'Toutes les Succursales' : 'All Branches',
    selectChain: language === 'fr' ? 'Sélectionner une chaîne' : 'Select a chain',
    selectBranch: language === 'fr' ? 'Sélectionner une succursale' : 'Select a branch',
  }
  const [summaryData, setSummaryData] = useState<CommissionData | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  // Chain/Branch filtering state
  const [chains, setChains] = useState<Chain[]>([])
  const [selectedChain, setSelectedChain] = useState<string>('all')
  const [chainsLoading, setChainsLoading] = useState(true)
  const [chainSwitching, setChainSwitching] = useState(false)

  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [branchesLoading, setBranchesLoading] = useState(false)
  const [branchSwitching, setBranchSwitching] = useState(false)

  const fetchSummaryData = async () => {
    try {
      setSummaryLoading(true)
      const params = {
        dateRange: '30d' // Fixed 30d for summary cards
      } as Record<string, string>

      // Add filtering parameters
      if (selectedChain !== 'all') {
        params.chainId = selectedChain
      }
      if (selectedBranch !== 'all') {
        params.branchId = selectedBranch
      }

      const response = await apiClient.get<CommissionData>('/api/v1/commission/reports', params)
      setSummaryData(response.data)
    } catch (error) {
      console.error('Failed to fetch commission summary data:', error)
      setSummaryData(null)
    } finally {
      setSummaryLoading(false)
    }
  }

  const fetchChains = async () => {
    try {
      setChainsLoading(true)
      const response = await chainsService.getChains({
        status: 'active',
        limit: 100 // Get all active chains
      })
      setChains(response.chains)
    } catch (error) {
      console.error('Failed to fetch chains:', error)
      setChains([])
    } finally {
      setChainsLoading(false)
    }
  }

  const fetchBranches = async () => {
    if (selectedChain === 'all') {
      setBranches([])
      setSelectedBranch('all')
      return
    }

    try {
      setBranchesLoading(true)
      const response = await apiClient.get(`/api/v1/branches/by-chain/${selectedChain}`)
      // API returns { chain: {...}, branches: [...] }
      const branchesData = (response.data as { branches: Branch[] }).branches || []
      setBranches(branchesData)
    } catch (error) {
      console.error('Failed to fetch branches:', error)
      setBranches([])
    } finally {
      setBranchesLoading(false)
    }
  }

  const handleChainChange = async (newChain: string) => {
    setChainSwitching(true)
    setSummaryLoading(true)
    setSelectedChain(newChain)
    setSelectedBranch('all') // Reset branch selection
  }

  const handleBranchChange = async (newBranch: string) => {
    setBranchSwitching(true)
    setSummaryLoading(true)
    setSelectedBranch(newBranch)
  }

  // Load chains on mount
  useEffect(() => {
    fetchChains()
  }, [])

  // Load branches when chain changes
  useEffect(() => {
    fetchBranches()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChain])

  // Load summary data when filters change
  useEffect(() => {
    fetchSummaryData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChain, selectedBranch])

  // Clear switching states when loading completes
  useEffect(() => {
    if (!summaryLoading) {
      setChainSwitching(false)
      setBranchSwitching(false)
    }
  }, [summaryLoading])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
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
              <DynamicBreadcrumb />
            </div>
          </header>

          <div className="flex flex-1 flex-col px-2 sm:px-4 lg:px-6 max-w-full overflow-hidden">
            {/* Header */}
            <div className="px-2 py-6 sm:px-4 lg:px-6 bg-background">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
                  <p className="text-muted-foreground mt-2 text-lg">{t.subtitle}</p>
                </div>

                {/* Chain and Branch Selectors */}
                <div className="flex items-center gap-4">
                  {/* Chain Selector */}
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <Select
                      value={selectedChain}
                      onValueChange={handleChainChange}
                      disabled={chainsLoading || chainSwitching || summaryLoading}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder={t.selectChain} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.allChains}</SelectItem>
                        {chains.map((chain) => (
                          <SelectItem key={chain.id} value={chain.id}>
                            {chain.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Branch Selector - Only show if chain is selected */}
                  {selectedChain !== 'all' && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <Select
                        value={selectedBranch}
                        onValueChange={handleBranchChange}
                        disabled={branchesLoading || branchSwitching || summaryLoading}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder={t.selectBranch} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t.allBranches}</SelectItem>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-2 py-8 sm:px-4 lg:px-6 max-w-full overflow-hidden">
              {(summaryLoading || chainSwitching || branchSwitching) ? (
                <div className="flex h-[60vh] items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
                    <p className="text-sm text-muted-foreground">
                      {language === 'fr' ? 'Chargement des données...' : 'Loading data...'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Summary Cards */}
                  {!summaryData ? (
                    <Card>
                      <CardContent className="p-6 text-sm text-red-600">
                        {language === 'fr' ? 'Erreur lors du chargement des données de résumé' : 'Error loading summary data'}
                      </CardContent>
                    </Card>
                  ) : (
                    <CommissionSummaryCards
                      data={summaryData}
                      loading={false}
                      formatCurrency={formatCurrency}
                      language={language}
                    />
                  )}

                  {/* Source Performance Details */}
                  {summaryData && (
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">
                            {language === 'fr' ? 'Site Web' : 'Website'}
                          </CardTitle>
                          <Globe className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {formatCurrency(summaryData?.breakdown.website.commission || 0)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {summaryData?.breakdown.website.orders || 0} {language === 'fr' ? 'commandes' : 'orders'} • 3%
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">
                            {language === 'fr' ? 'Code QR' : 'QR Code'}
                          </CardTitle>
                          <QrCode className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {formatCurrency(summaryData?.breakdown.qr.commission || 0)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {summaryData?.breakdown.qr.orders || 0} {language === 'fr' ? 'commandes' : 'orders'} • 1%
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">
                            {language === 'fr' ? 'Application Mobile' : 'Mobile App'}
                          </CardTitle>
                          <Smartphone className="h-4 w-4 text-purple-600" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {formatCurrency(summaryData?.breakdown.mobile_app.commission || 0)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {summaryData?.breakdown.mobile_app.orders || 0} {language === 'fr' ? 'commandes' : 'orders'} • 2%
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Main Charts Grid */}
                  <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
                    {/* Commission Breakdown by Source */}
                    <div className="w-full min-h-[460px] flex flex-col">
                      <CommissionBreakdownChart
                        language={language}
                        title={t.breakdownBySource}
                        chainId={selectedChain !== 'all' ? selectedChain : undefined}
                        branchId={selectedBranch !== 'all' ? selectedBranch : undefined}
                      />
                    </div>

                    {/* Commission Trend */}
                    <div className="w-full min-h-[460px] flex flex-col">
                      <CommissionTrendChart
                        language={language}
                        formatCurrency={formatCurrency}
                        title={t.trendOverTime}
                        chainId={selectedChain !== 'all' ? selectedChain : undefined}
                        branchId={selectedBranch !== 'all' ? selectedBranch : undefined}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SidebarInset>
      </DashboardLayout>
    </AuthGuard>
  )
}