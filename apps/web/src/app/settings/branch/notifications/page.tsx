"use client"

import React from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AppSidebar } from "@/components/app-sidebar"
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { RefreshCw, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react"
import { useEnhancedAuth } from "@/hooks/use-enhanced-auth"
import { useBranchSettings } from "@/hooks/use-branch-settings"
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/translations"
import { DashboardLayout } from "@/components/dashboard-layout"
import { OrderNotificationSoundCard } from "@/components/branch-settings/order-notification-sound-card"
import { WaiterCallNotificationSoundCard } from "@/components/branch-settings/waiter-call-notification-sound-card"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function BranchNotificationSettingsPage() {
  const { branchId } = useEnhancedAuth()
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  const { toast } = useToast()

  const {
    settings,
    loading,
    error,
    isDirty,
    canSave,
    saving,
    updateSettings,
    saveSettings,
    loadSettings,
    clearError,
  } = useBranchSettings({ branchId: branchId || undefined })

  // Handle save with auto-refresh
  const handleSave = async () => {
    const success = await saveSettings(settings)
    if (success) {
      // Show toast notification
      toast({
        title: language === 'fr' ? 'Changements appliqués' : 'Changes Applied',
        description: language === 'fr' ? 'Actualisation de la page...' : 'Refreshing page...',
        duration: 1500,
      })

      // Refresh page after a short delay to apply notification settings
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    }
  }

  // Notification sound handlers
  const handleOrderSoundChange = (sound: string) => {
    updateSettings({
      notificationSettings: {
        ...settings.notificationSettings,
        orderSound: sound,
        waiterCallSound: settings.notificationSettings?.waiterCallSound || 'Notification-1.mp3',
        soundEnabled: settings.notificationSettings?.soundEnabled ?? true
      }
    })
  }

  const handleWaiterCallSoundChange = (sound: string) => {
    updateSettings({
      notificationSettings: {
        ...settings.notificationSettings,
        orderSound: settings.notificationSettings?.orderSound || 'Notification-1.mp3',
        waiterCallSound: sound,
        soundEnabled: settings.notificationSettings?.soundEnabled ?? true
      }
    })
  }

  // Loading state
  if (loading) {
    return (
      <AuthGuard requireAuth={true} requireRememberOrRecent={true} redirectTo="/login">
        <DashboardLayout>
          <AppSidebar />
          <SidebarInset>
            <div className="flex items-center justify-center h-screen">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>{t.settingsBranch.loadingSettings}</span>
              </div>
            </div>
          </SidebarInset>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  // Error state
  if (error) {
    return (
      <AuthGuard requireAuth={true} requireRememberOrRecent={true} redirectTo="/login">
        <DashboardLayout>
          <AppSidebar />
          <SidebarInset>
            <div className="flex flex-col items-center justify-center h-screen gap-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <div className="text-center">
                <h2 className="text-lg font-semibold">{t.settingsBranch.failedToLoad}</h2>
                <p className="text-muted-foreground">{error}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={loadSettings} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t.settingsBranch.retry}
                </Button>
                <Button onClick={clearError} variant="ghost">
                  {t.settingsBranch.dismiss}
                </Button>
              </div>
            </div>
          </SidebarInset>
        </DashboardLayout>
      </AuthGuard>
    )
  }

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
                    {language === 'fr' ? 'Paramètres de Notification' : 'Notification Settings'}
                  </h1>
                  <p className="text-muted-foreground mt-2 text-lg">
                    {language === 'fr'
                      ? 'Gérez les sons et les préférences de notification pour votre succursale'
                      : 'Manage notification sounds and preferences for your branch'}
                  </p>
                </div>
                <div className="lg:col-span-4 flex items-center justify-end gap-3">
                  {isDirty && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                      <span className="text-orange-600 font-medium text-sm">Unsaved changes</span>
                    </div>
                  )}

                  <Button
                    onClick={handleSave}
                    disabled={!canSave}
                    size="lg"
                    className={`px-8 ${saving ? "animate-pulse" : ""}`}
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 px-2 py-8 sm:px-4 lg:px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Order Notification Sound Card */}
                <OrderNotificationSoundCard
                  orderSound={settings.notificationSettings?.orderSound || 'Notification-1.mp3'}
                  onOrderSoundChange={handleOrderSoundChange}
                />

                {/* Waiter Call Notification Sound Card */}
                <WaiterCallNotificationSoundCard
                  waiterCallSound={settings.notificationSettings?.waiterCallSound || 'Notification-1.mp3'}
                  onWaiterCallSoundChange={handleWaiterCallSoundChange}
                />
              </div>
            </div>
          </div>
        </SidebarInset>
      </DashboardLayout>
    </AuthGuard>
  )
}
