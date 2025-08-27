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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Shield, 
  Building2,
  MapPin, 
  Settings, 
  ChevronRight
} from "lucide-react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/translations"

const adminCategories = [
  {
    title: "Restaurant Chains",
    titleFr: "Chaînes de Restaurants", 
    description: "Create and manage restaurant chains with their settings and configurations.",
    descriptionFr: "Créer et gérer les chaînes de restaurants avec leurs paramètres et configurations.",
    icon: Building2,
    href: "/admin-settings/chains",
    available: true
  },
  {
    title: "Branch Management",
    titleFr: "Gestion des Succursales",
    description: "Manage restaurant branches, locations, and operational settings.",
    descriptionFr: "Gérer les succursales, emplacements et paramètres opérationnels.",
    icon: MapPin,
    href: "/admin-settings/branches", 
    available: false
  },
  {
    title: "Platform Admins",
    titleFr: "Administrateurs Plateforme",
    description: "Assign and manage platform administrator roles and permissions.",
    descriptionFr: "Attribuer et gérer les rôles et permissions d'administrateur plateforme.",
    icon: Shield,
    href: "/admin-settings/platform-admins",
    available: false
  },
  {
    title: "System Settings",
    titleFr: "Paramètres Système",
    description: "Configure system-wide settings and platform configurations.",
    descriptionFr: "Configurer les paramètres système et les configurations de plateforme.",
    icon: Settings,
    href: "/admin-settings/system-settings",
    available: false
  }
]

export default function AdminSettingsPage() {
  const { language } = useLanguage()
  const t = translations[language] || translations.en

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
                  <BreadcrumbItem>
                    <BreadcrumbPage>
                      {language === 'fr' ? 'Paramètres Admin' : 'Admin Settings'}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-6 py-4 px-4 md:px-8 lg:px-12 pt-8">
            <div className="max-w-6xl">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {language === 'fr' ? 'Paramètres Administrateur Plateforme' : 'Platform Admin Settings'}
                  </h2>
                </div>
                <p className="text-muted-foreground">
                  {language === 'fr' 
                    ? 'Gérer les chaînes de restaurants, les succursales et les configurations à l\'échelle de la plateforme.'
                    : 'Manage restaurant chains, branches, and platform-wide configurations.'
                  }
                </p>
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 max-w-6xl">
              {adminCategories.map((category) => {
                const IconComponent = category.icon
                const title = language === 'fr' ? category.titleFr : category.title
                const description = language === 'fr' ? category.descriptionFr : category.description
                
                if (category.available) {
                  return (
                    <Link key={category.title} href={category.href}>
                      <Card className="cursor-pointer transition-colors hover:bg-muted/50 h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <div className="flex items-center space-x-2">
                            <IconComponent className="h-5 w-5 text-primary" />
                            <CardTitle className="text-base">{title}</CardTitle>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="text-sm">
                            {description}
                          </CardDescription>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                }
                
                return (
                  <Card key={category.title} className="opacity-60 h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="flex items-center space-x-2">
                        <IconComponent className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base text-muted-foreground">{title}</CardTitle>
                      </div>
                      <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {language === 'fr' ? 'Bientôt Disponible' : 'Coming Soon'}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm">
                        {description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </SidebarInset>
      </DashboardLayout>
    </AuthGuard>
  )
} 