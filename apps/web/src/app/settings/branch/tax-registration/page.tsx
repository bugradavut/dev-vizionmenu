"use client"

import React, { useState } from "react"
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
import { GstNumberCard } from "@/components/branch-settings/gst-number-card"
import { QstNumberCard } from "@/components/branch-settings/qst-number-card"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function BranchTaxRegistrationPage() {
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

  // Local state for input values
  const [gstNumberInput, setGstNumberInput] = useState("")
  const [qstNumberInput, setQstNumberInput] = useState("")

  // Sync inputs with settings
  React.useEffect(() => {
    if (settings && !loading) {
      setGstNumberInput(settings.gstNumber || "")
      setQstNumberInput(settings.qstNumber || "")
    }
  }, [settings.gstNumber, settings.qstNumber, loading])

  // Handle save
  const handleSave = async () => {
    const success = await saveSettings(settings)
    if (success) {
      toast({
        title: language === 'fr' ? 'Changements appliqués' : 'Changes Applied',
        description: language === 'fr' ? 'Vos paramètres fiscaux ont été enregistrés' : 'Your tax settings have been saved',
        duration: 3000,
      })
    }
  }

  // Tax number handlers
  const handleGstChange = (value: string) => {
    setGstNumberInput(value)
    updateSettings({ gstNumber: value })
  }

  const handleQstChange = (value: string) => {
    setQstNumberInput(value)
    updateSettings({ qstNumber: value })
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
                    {t.settingsBranch.taxInformationTitle}
                  </h1>
                  <p className="text-muted-foreground mt-2 text-lg">
                    {language === 'fr'
                      ? 'Gérez vos numéros d\'enregistrement TPS/TVQ pour la conformité SRS du Québec'
                      : 'Manage your GST/QST registration numbers for Quebec SRS compliance'}
                  </p>
                </div>
                <div className="lg:col-span-4 flex items-center justify-end gap-3">
                  {isDirty && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                      <span className="text-orange-600 font-medium text-sm">
                        {language === 'fr' ? 'Modifications non enregistrées' : 'Unsaved changes'}
                      </span>
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
                        {language === 'fr' ? 'Sauvegarde...' : 'Saving...'}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {language === 'fr' ? 'Enregistrer les Modifications' : 'Save Changes'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 px-2 py-8 sm:px-4 lg:px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* GST Number Card */}
                <GstNumberCard
                  gstNumber={gstNumberInput}
                  onGstChange={handleGstChange}
                  translations={{
                    title: t.settingsBranch.gstCardTitle,
                    description: t.settingsBranch.gstCardDesc,
                    label: t.settingsBranch.gstLabel,
                    placeholder: t.settingsBranch.gstPlaceholder,
                    format: t.settingsBranch.gstFormat,
                    invalidFormat: t.settingsBranch.invalidFormat,
                    validFormat: t.settingsBranch.validFormat,
                  }}
                />

                {/* QST Number Card */}
                <QstNumberCard
                  qstNumber={qstNumberInput}
                  onQstChange={handleQstChange}
                  translations={{
                    title: t.settingsBranch.qstCardTitle,
                    description: t.settingsBranch.qstCardDesc,
                    label: t.settingsBranch.qstLabel,
                    placeholder: t.settingsBranch.qstPlaceholder,
                    format: t.settingsBranch.qstFormat,
                    invalidFormat: t.settingsBranch.invalidFormat,
                    validFormat: t.settingsBranch.validFormat,
                  }}
                />
              </div>
            </div>
          </div>
        </SidebarInset>
      </DashboardLayout>
    </AuthGuard>
  )
}
