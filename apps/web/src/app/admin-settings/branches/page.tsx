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
import { MapPin, Activity } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
import { DashboardLayout } from "@/components/dashboard-layout"
import { branchesService, Branch } from "@/services/branches.service"
import { chainsService, Chain } from "@/services/chains.service"
import { BranchListTable } from "./components/branch-list-table"
import { CreateBranchModal } from "./components/create-branch-modal"
import { EditBranchModal } from "./components/edit-branch-modal"

export default function AdminBranchesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [chains, setChains] = useState<Chain[]>([])
  const [loading, setLoading] = useState(true)
  const [totalBranches, setTotalBranches] = useState(0)
  const [activeBranches, setActiveBranches] = useState(0)

  const { language } = useLanguage()

  // Fetch branches
  const fetchBranches = async () => {
    try {
      setLoading(true)
      const response = await branchesService.getBranches()
      setBranches(response.branches)
      setTotalBranches(response.total)
      setActiveBranches(response.branches.filter(branch => branch.is_active).length)
    } catch (error) {
      console.error('Error fetching branches:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch chains for dropdowns
  const fetchChains = async () => {
    try {
      const response = await chainsService.getChains()
      setChains(response.chains)
    } catch (error) {
      console.error('Error fetching chains:', error)
    }
  }

  useEffect(() => {
    fetchBranches()
    fetchChains()
  }, [])

  const handleCreateBranch = () => {
    setShowCreateModal(true)
  }

  const handleEditBranch = (branch: Branch) => {
    setSelectedBranch(branch)
    setShowEditModal(true)
  }

  const handleToggleActive = async (branch: Branch) => {
    try {
      await branchesService.updateBranch(branch.id, {
        is_active: !branch.is_active
      })
      fetchBranches() // Refresh the list
    } catch (error) {
      console.error('Error toggling branch status:', error)
      alert(language === 'fr' ? 'Erreur lors de la mise à jour du statut' : 'Error updating branch status')
    }
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setSelectedBranch(null)
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
                    {language === 'fr' ? 'Gestion des Succursales' : 'Branch Management'}
                  </h1>
                  <p className="text-muted-foreground mt-2 text-lg">
                    {language === 'fr' 
                      ? 'Gérer toutes les succursales des chaînes de restaurants sur la plateforme'
                      : 'Manage all restaurant chain branches on the platform'
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
                              {language === 'fr' ? 'Total Succursales' : 'Total Branches'}
                            </p>
                            <p className="text-xl font-bold">{totalBranches}</p>
                          </div>
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              {language === 'fr' ? 'Succursales Actives' : 'Active Branches'}
                            </p>
                            <p className="text-xl font-bold">{activeBranches}</p>
                          </div>
                          <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Branch List Table - Full width */}
                <div className="lg:col-span-12">
                  <BranchListTable
                    branches={branches}
                    chains={chains}
                    loading={loading}
                    onCreateBranch={handleCreateBranch}
                    onEditBranch={handleEditBranch}
                    onToggleActive={handleToggleActive}
                  />
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </DashboardLayout>

      {/* Modals */}
      <CreateBranchModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        chains={chains}
        onSuccess={fetchBranches}
      />

      <EditBranchModal
        open={showEditModal}
        onOpenChange={handleCloseEditModal}
        branch={selectedBranch}
        chains={chains}
        onSuccess={fetchBranches}
      />
    </AuthGuard>
  )
}