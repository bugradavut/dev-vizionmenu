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
import { Crown, ShieldCheck } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useEnhancedAuth } from "@/hooks/use-enhanced-auth"
import { platformAdminService, PlatformAdmin } from "@/services/platform-admin.service"
import { AdminListTable } from "./components/admin-list-table"
import { AddAdminModal } from "./components/add-admin-modal"

export default function PlatformAdminsPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [admins, setAdmins] = useState<PlatformAdmin[]>([])
  const [loading, setLoading] = useState(true)

  const { language } = useLanguage()
  const { user } = useEnhancedAuth()

  // Fetch platform admins
  const fetchAdmins = async () => {
    try {
      setLoading(true)
      const response = await platformAdminService.getPlatformAdmins()
      setAdmins(response.admins)
    } catch (error) {
      console.error('Error fetching platform admins:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdmins()
  }, [])

  // Stats calculations
  const totalAdmins = admins.length
  const activeAdmins = admins.length // All admins are active by default

  const handleAddAdmin = () => {
    setShowAddModal(true)
  }

  const handleRemoveAdmin = async (admin: PlatformAdmin) => {
    const confirmMessage = language === 'fr' 
      ? `Êtes-vous sûr de vouloir retirer les privilèges d'administrateur de ${admin.full_name}?`
      : `Are you sure you want to remove administrator privileges from ${admin.full_name}?`
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      await platformAdminService.removePlatformAdmin(admin.user_id)
      fetchAdmins() // Refresh the list
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : (language === 'fr' ? 'Erreur lors de la suppression' : 'Error removing admin')
      alert(errorMessage)
    }
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
                    {language === 'fr' ? 'Administrateurs Plateforme' : 'Platform Administrators'}
                  </h1>
                  <p className="text-muted-foreground mt-2 text-lg">
                    {language === 'fr' 
                      ? 'Gérer les privilèges d\'administrateur plateforme pour les employés de l\'entreprise'
                      : 'Manage platform administrator privileges for company employees'
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
                              {language === 'fr' ? 'Total Administrateurs' : 'Total Administrators'}
                            </p>
                            <p className="text-xl font-bold">{totalAdmins}</p>
                          </div>
                          <Crown className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              {language === 'fr' ? 'Administrateurs Actifs' : 'Active Administrators'}
                            </p>
                            <p className="text-xl font-bold">{activeAdmins}</p>
                          </div>
                          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                    
                  </div>
                </div>

                {/* Admin List Table - Full width */}
                <div className="lg:col-span-12">
                  <AdminListTable
                    admins={admins}
                    loading={loading}
                    onAddAdmin={handleAddAdmin}
                    onRemoveAdmin={handleRemoveAdmin}
                    currentUserId={(user as Record<string, unknown>)?.user_id as string || (user as Record<string, unknown>)?.id as string}
                  />
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </DashboardLayout>

      {/* Add Admin Modal */}
      <AddAdminModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={fetchAdmins}
      />
    </AuthGuard>
  )
}