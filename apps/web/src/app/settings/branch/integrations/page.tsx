"use client"

import React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { AppSidebar } from "@/components/app-sidebar"
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { UberEatsIntegrationCard } from "@/components/uber-eats-integration-card"

export default function BranchIntegrationsPage() {
  const { language } = useLanguage()
  const searchParams = useSearchParams()
  const [refreshKey, setRefreshKey] = React.useState(0)

  // Check for OAuth callback params and refresh card
  React.useEffect(() => {
    const uberEatsStatus = searchParams.get('uber_eats')
    if (uberEatsStatus === 'connected' || uberEatsStatus === 'error') {
      // Refresh the Uber Eats card
      setRefreshKey(prev => prev + 1)

      // Clean up URL params
      const url = new URL(window.location.href)
      url.searchParams.delete('uber_eats')
      url.searchParams.delete('store_id')
      url.searchParams.delete('message')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])

  return (
    <AuthGuard requireAuth={true} requireRememberOrRecent={true} redirectTo="/login">
      <DashboardLayout>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collibible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <DynamicBreadcrumb />
            </div>
          </header>
          <div className="flex flex-1 flex-col px-2 sm:px-4 lg:px-6">
            {/* Header Section */}
            <div className="px-2 py-6 sm:px-4 lg:px-6 bg-background">
              {/* Back Button */}
              <div className="mb-6">
                <Link href="/settings/branch">
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {language === 'fr' ? 'Retour aux Paramètres' : 'Back to Branch Settings'}
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  <h1 className="text-3xl font-bold tracking-tight">
                    {language === 'fr' ? 'Intégrations' : 'Integrations'}
                  </h1>
                  <p className="text-muted-foreground mt-2 text-lg">
                    {language === 'fr'
                      ? 'Connectez votre restaurant aux plateformes de livraison tierces'
                      : 'Connect your restaurant to third-party delivery platforms'}
                  </p>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 px-2 py-8 sm:px-4 lg:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Uber Eats Integration Card */}
                <UberEatsIntegrationCard key={refreshKey} />
              </div>
            </div>
          </div>
        </SidebarInset>
      </DashboardLayout>
    </AuthGuard>
  )
}
