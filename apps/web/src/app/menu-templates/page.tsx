"use client"

import React from 'react'
import { AuthGuard } from "@/components/auth-guard"
import { ChainOwnerGuard } from "@/components/chain-owner-guard"
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
  ChefHat
} from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import { translations } from '@/lib/translations'
import { TemplateCategoriesTab, TemplateItemsTab } from '@/components/menu-templates'

export default function MenuTemplatesPage() {
  const { language } = useLanguage()
  const t = translations[language] || translations.en

  return (
    <AuthGuard>
      <ChainOwnerGuard>
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
                    <BreadcrumbPage>
                      {language === 'fr' ? 'Modèles de Menu' : 'Menu Templates'}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-6 p-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {language === 'fr' ? 'Modèles de Menu' : 'Menu Templates'}
              </h1>
              <p className="text-muted-foreground">
                {language === 'fr'
                  ? 'Créez des modèles de menu principaux pour vos succursales'
                  : 'Create master menu templates for your branches'}
              </p>
            </div>

            {/* Tabs Container */}
            <Tabs defaultValue="categories" className="w-full">
              <TabsList className="grid w-max grid-cols-2">
                <TabsTrigger value="categories" className="flex items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {language === 'fr' ? 'Catégories' : 'Categories'}
                  </span>
                  <span className="sm:hidden">
                    {language === 'fr' ? 'Cat.' : 'Cat.'}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="items" className="flex items-center gap-2">
                  <ChefHat className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {language === 'fr' ? 'Articles' : 'Items'}
                  </span>
                  <span className="sm:hidden">
                    {language === 'fr' ? 'Art.' : 'Items'}
                  </span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="categories" className="mt-6">
                <TemplateCategoriesTab />
              </TabsContent>

              <TabsContent value="items" className="mt-6">
                <TemplateItemsTab />
              </TabsContent>
            </Tabs>
          </div>
        </SidebarInset>
        </SidebarProvider>
      </ChainOwnerGuard>
    </AuthGuard>
  )
}