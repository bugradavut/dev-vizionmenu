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

export default function Page() {
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
              <DynamicBreadcrumb />
            </div>
          </header>
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
        </SidebarInset>
      </DashboardLayout>
    </AuthGuard>
  )
}
