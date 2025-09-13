"use client"

import { AuthGuard } from "@/components/auth-guard"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/translations"
import { useEnhancedAuth } from "@/hooks/use-enhanced-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, MapPin, Shield, Activity } from "lucide-react"
import Link from "next/link"

export default function Page() {
  const { language } = useLanguage()
  const enhancedAuth = useEnhancedAuth()
  const { isPlatformAdmin } = enhancedAuth
  const t = translations[language] || translations.en

  // Platform Admin Dashboard
  const PlatformAdminDashboard = () => (
    <div className="flex flex-1 flex-col gap-6 py-4 px-4 md:px-8 lg:px-12 pt-8">
      <div className="max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold tracking-tight">
              {language === 'fr' ? 'Tableau de Bord Admin' : 'Platform Admin Dashboard'}
            </h2>
          </div>
          <p className="text-muted-foreground">
            {language === 'fr'
              ? 'Gérer les chaînes de restaurants et la plateforme'
              : 'Manage restaurant chains and platform-wide settings'
            }
          </p>
        </div>
      </div>
      
      {/* Platform Stats */}
      <div className="grid gap-4 md:grid-cols-3 max-w-6xl">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'fr' ? 'Total Chaînes' : 'Total Chains'}
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              {language === 'fr' ? 'Aucune chaîne configurée' : 'No chains configured'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'fr' ? 'Total Succursales' : 'Total Branches'}
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              {language === 'fr' ? 'Aucune succursale active' : 'No active branches'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'fr' ? 'Statut Plateforme' : 'Platform Status'}
            </CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {language === 'fr' ? 'En Ligne' : 'Online'}
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'fr' ? 'Tous les services opérationnels' : 'All services operational'}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Quick Actions */}
      <Card className="max-w-6xl">
        <CardHeader>
          <CardTitle>
            {language === 'fr' ? 'Actions Rapides' : 'Quick Actions'}
          </CardTitle>
          <CardDescription>
            {language === 'fr' 
              ? 'Commencez par créer votre première chaîne de restaurants'
              : 'Get started by creating your first restaurant chain'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin-settings/chains">
            <Card className="cursor-pointer transition-colors hover:bg-muted/50">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">
                    {language === 'fr' ? 'Gérer les Chaînes' : 'Manage Chains'}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm">
                  {language === 'fr'
                    ? 'Créer et gérer les chaînes de restaurants'
                    : 'Create and manage restaurant chains'
                  }
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
          
          <Card className="opacity-60">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base text-muted-foreground">
                  {language === 'fr' ? 'Gérer les Succursales' : 'Manage Branches'}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-sm">
                {language === 'fr'
                  ? 'Disponible après la création de chaînes'
                  : 'Available after creating chains'
                }
              </CardDescription>
            </CardContent>
          </Card>
          
          <Card className="opacity-60">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base text-muted-foreground">
                  {language === 'fr' ? 'Admin Plateforme' : 'Platform Admins'}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-sm">
                {language === 'fr'
                  ? 'Gérer les administrateurs plateforme'
                  : 'Manage platform administrators'
                }
              </CardDescription>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )

  // Branch User Dashboard (original)
  const BranchUserDashboard = () => (
    <div className="flex flex-1 flex-col gap-6 py-4 px-4 md:px-8 lg:px-12 pt-8">
      <div className="max-w-6xl">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight">{t.dashboard.title}</h2>
          <p className="text-muted-foreground mt-2">
            {t.dashboard.subtitle}
          </p>
        </div>
      </div>
      
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
      </div>
      <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
    </div>
  )

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
          {isPlatformAdmin ? <PlatformAdminDashboard /> : <BranchUserDashboard />}
        </SidebarInset>
      </DashboardLayout>
    </AuthGuard>
  )
}
