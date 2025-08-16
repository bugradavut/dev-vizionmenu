"use client"

import React from 'react'
import { AuthGuard } from "@/components/auth-guard"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  UtensilsCrossed, 
  ChefHat, 
  Calendar
} from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'
import { CategoriesTab, ItemsTab, PresetsTab } from '@/components/menu'

export default function MenuManagementPage() {
  const { language } = useLanguage()
  const t = translations[language] || translations.en

  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
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
                    <BreadcrumbPage>{t.navigation.menu}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          
          <div className="flex flex-1 flex-col gap-6 p-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {t.navigation.menu}
              </h1>
              <p className="text-muted-foreground">
                {t.menuManagement.pageSubtitle}
              </p>
            </div>

            {/* Tabs Container */}
            <Tabs defaultValue="categories" className="w-full">
              <TabsList className="grid w-max grid-cols-3">
                <TabsTrigger value="categories" className="flex items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.navigation.categories}</span>
                  <span className="sm:hidden">{language === 'fr' ? 'Cat.' : 'Cat.'}</span>
                </TabsTrigger>
                <TabsTrigger value="items" className="flex items-center gap-2">
                  <ChefHat className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.navigation.items}</span>
                  <span className="sm:hidden">{language === 'fr' ? 'Art.' : 'Items'}</span>
                </TabsTrigger>
                <TabsTrigger value="presets" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.menuManagement.presets}</span>
                  <span className="sm:hidden">{language === 'fr' ? 'Pré.' : 'Pre.'}</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="categories" className="mt-6">
                <CategoriesTab />
              </TabsContent>

              <TabsContent value="items" className="mt-6">
                <ItemsTab />
              </TabsContent>

              <TabsContent value="presets" className="mt-6">
                <PresetsTab />
              </TabsContent>
            </Tabs>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}