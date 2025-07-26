"use client"

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
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle, getLanguageLabel } from "@/components/language-toggle"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Palette } from "lucide-react"
import { useTheme } from "@/contexts/theme-context"
import { useLanguage } from "@/contexts/language-context"

export default function GeneralSettingsPage() {
  const { theme } = useTheme()
  const { language } = useLanguage()

  const getThemeLabel = (currentTheme: string) => {
    switch (currentTheme) {
      case "light":
        return "Light"
      case "dark":
        return "Dark"
      case "system":
        return "System"
      default:
        return "System"
    }
  }
  return (
    <AuthGuard requireAuth={true} requireRememberOrRecent={true} redirectTo="/login">
      <SidebarProvider>
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
                      Dashboard
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/settings">
                      Settings
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>General</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex flex-1 flex-col px-3 sm:px-4 lg:px-6">
            {/* Header Section */}
            <div className="px-3 py-6 sm:px-4 lg:px-6 bg-background">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  <h1 className="text-3xl font-bold tracking-tight">General Settings</h1>
                  <p className="text-muted-foreground mt-2 text-lg">
                    Manage your application preferences and account settings.
                  </p>
                </div>
                <div className="lg:col-span-4 flex items-center justify-end">
                  {/* Header actions can go here if needed */}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 px-3 py-8 sm:px-4 lg:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-12">
                  <div className="max-w-md">
              {/* Appearance Card */}
              <Card className="group hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-4 border-b mb-4">
                  <div className="flex items-center gap-3">
                    <Palette className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Appearance</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-border">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Theme</div>
                      <div className="text-xs text-muted-foreground">Currently using theme: {getThemeLabel(theme)}</div>
                    </div>
                    <ThemeToggle />
                  </div>
                  <div className="flex items-center justify-between pt-4">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Language</div>
                      <div className="text-xs text-muted-foreground">Currently selected language: {getLanguageLabel(language)}</div>
                    </div>
                    <LanguageToggle />
                  </div>
                </CardContent>
              </Card>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
} 