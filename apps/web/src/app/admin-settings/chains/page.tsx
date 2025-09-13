'use client'

import { useState, useEffect } from 'react'
import { AuthGuard } from "@/components/auth-guard"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Building2, Activity } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
import { DashboardLayout } from "@/components/dashboard-layout"
import { chainsService, Chain } from "@/services/chains.service"
import { ChainListTable } from "./components/chain-list-table"
import { CreateChainModal } from "./components/create-chain-modal"
import { EditChainModal } from "./components/edit-chain-modal"

export default function AdminChainsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null)
  const [chains, setChains] = useState<Chain[]>([])
  const [loading, setLoading] = useState(true)
  const [totalChains, setTotalChains] = useState(0)

  const { language } = useLanguage()

  // Fetch chains
  const fetchChains = async () => {
    try {
      setLoading(true)
      console.log('Fetching chains...')
      const response = await chainsService.getChains()
      console.log('Chains response:', response)
      console.log('Chains array:', response.chains)
      setChains(response.chains)
      setTotalChains(response.total)
    } catch (error) {
      console.error('Error fetching chains:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChains()
  }, [])

  // Stats calculations
  const activeChains = Array.isArray(chains) ? chains.filter(chain => chain.is_active).length : 0

  const handleCreateChain = () => {
    setShowCreateModal(true)
  }

  const handleEditChain = (chain: Chain) => {
    setSelectedChain(chain)
    setShowEditModal(true)
  }

  const handleToggleActive = async (chain: Chain) => {
    try {
      await chainsService.updateChain(chain.id, {
        is_active: !chain.is_active
      })
      fetchChains() // Refresh the list
    } catch (error) {
      console.error('Error toggling chain status:', error)
      alert(language === 'fr' ? 'Erreur lors de la mise à jour du statut' : 'Error updating chain status')
    }
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setSelectedChain(null)
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
          
          <div className="flex flex-1 flex-col px-2 sm:px-4 lg:px-6">
            {/* Header Section */}
            <div className="px-2 py-6 sm:px-4 lg:px-6 bg-background">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  <h1 className="text-3xl font-bold tracking-tight">
                    {language === 'fr' ? 'Chaînes de Restaurants' : 'Restaurant Chains'}
                  </h1>
                  <p className="text-muted-foreground mt-2 text-lg">
                    {language === 'fr' 
                      ? 'Gérer toutes les chaînes de restaurants sur la plateforme'
                      : 'Manage all restaurant chains on the platform'
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
                {/* Stats Cards - Full width on mobile, 12 columns on desktop */}
                <div className="lg:col-span-12">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <Card className="border">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              {language === 'fr' ? 'Total Chaînes' : 'Total Chains'}
                            </p>
                            <p className="text-xl font-bold">{totalChains}</p>
                          </div>
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              {language === 'fr' ? 'Chaînes Actives' : 'Active Chains'}
                            </p>
                            <p className="text-xl font-bold">{activeChains}</p>
                          </div>
                          <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                    
                  </div>
                </div>

                {/* Chain List Table - Full width */}
                <div className="lg:col-span-12">
                  <ChainListTable
                    chains={chains}
                    loading={loading}
                    onCreateChain={handleCreateChain}
                    onEditChain={handleEditChain}
                    onToggleActive={handleToggleActive}
                    onRefresh={fetchChains}
                  />
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </DashboardLayout>

      {/* Modals */}
      <CreateChainModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={fetchChains}
      />

      <EditChainModal
        open={showEditModal}
        onOpenChange={handleCloseEditModal}
        chain={selectedChain}
        onSuccess={fetchChains}
      />
    </AuthGuard>
  )
}