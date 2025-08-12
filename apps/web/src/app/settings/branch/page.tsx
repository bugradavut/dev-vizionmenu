"use client"

import { useState } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AppSidebar } from "@/components/app-sidebar"
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ArrowRight, CheckCircle, Settings, Clock, Timer, Plus, Minus, AlertCircle, RefreshCw } from "lucide-react"
import { useEnhancedAuth } from "@/hooks/use-enhanced-auth"
import { useBranchSettings } from "@/hooks/use-branch-settings"
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/translations"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function BranchSettingsPage() {
  const { branchId } = useEnhancedAuth()
  const {
    settings,
    loading,
    saving,
    error,
    loadSettings,
    saveSettings,
    updateSettings,
    clearError,
    isDirty,
    canSave
  } = useBranchSettings({ branchId: branchId || undefined })

  const { language } = useLanguage()
  const t = translations[language] || translations.en
  const [saved, setSaved] = useState(false)

  // Handle save
  const handleSave = async () => {
    const success = await saveSettings(settings)
    if (success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  // Handle auto-ready toggle
  const handleAutoReadyChange = (enabled: boolean) => {
    updateSettings({
      timingSettings: {
        ...settings.timingSettings,
        autoReady: enabled
      }
    })
  }

  // Handle timing settings changes
  const handleTimingChange = (key: keyof typeof settings.timingSettings, value: number | boolean) => {
    updateSettings({
      timingSettings: {
        ...settings.timingSettings,
        [key]: value
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
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  <h1 className="text-3xl font-bold tracking-tight">{t.settingsBranch.pageTitle}</h1>
                  <p className="text-muted-foreground mt-2 text-lg">
                    {t.settingsBranch.pageSubtitle}
                  </p>
                </div>
                <div className="lg:col-span-4 flex items-center justify-end">
                  {/* Toast will be positioned fixed */}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 px-2 py-8 sm:px-4 lg:px-6">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-6">

                    {/* Order Flow Management Card */}
                    <Card className="group hover:shadow-lg transition-all duration-200">
                      <CardHeader className="pb-4 border-b mb-6">
                        <div className="flex items-center gap-3">
                          <Settings className="h-5 w-5 text-muted-foreground" />
                          <CardTitle className="text-lg">Order Management Flow</CardTitle>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Configure how your restaurant handles order progression and timing
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        
                        {/* Simplified Order Flow Display */}
                        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                          <h3 className="font-medium mb-3">Simplified Order Flow (Active)</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Streamlined 2-step process for faster order management with optional timing automation
                          </p>
                          
                          {/* Flow Visualization */}
                          <div className="flex items-center gap-2 text-xs flex-wrap mb-4">
                            <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md font-medium">Preparing</span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-md font-medium">Completed</span>
                          </div>
                        </div>

                        {/* Auto-Ready Setting */}
                        <div className="p-4 rounded-lg border border-border">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium mb-1">Automatic Order Completion</h4>
                              <p className="text-sm text-muted-foreground">
                                Automatically mark orders as completed based on preparation time
                              </p>
                            </div>
                            <Switch
                              checked={settings.timingSettings?.autoReady || false}
                              onCheckedChange={handleAutoReadyChange}
                            />
                          </div>
                          
                          {settings.timingSettings?.autoReady && (
                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                              <div className="flex items-center gap-2 text-green-700 text-sm">
                                <Clock className="h-4 w-4" />
                                <span className="font-medium">Timer-based completion is enabled</span>
                              </div>
                              <p className="text-xs text-green-600 mt-1">
                                Orders will be automatically marked as completed when the preparation timer expires
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Save Button */}
                        <div className="flex items-center justify-between pt-4 border-t">
                          <div className="text-sm text-muted-foreground">
                            {isDirty && <span className="text-orange-600">{t.settingsBranch.orderFlow.unsavedChanges}</span>}
                          </div>
                          <Button 
                            onClick={handleSave} 
                            disabled={!canSave}
                            className={saving ? "animate-pulse" : ""}
                          >
                            {saving ? t.settingsBranch.saving : t.settingsBranch.saveChanges}
                          </Button>
                        </div>

                      </CardContent>
                    </Card>

                </div>

                {/* Timing Settings - Always active */}
                <div className="xl:col-span-6">
                  {/* Timing Settings Card */}
                  <Card className="group hover:shadow-lg transition-all duration-200">
                      <CardHeader className="pb-4 border-b mb-6">
                        <div className="flex items-center gap-3">
                          <Timer className="h-5 w-5 text-muted-foreground" />
                          <CardTitle className="text-lg">Preparation & Delivery Timing</CardTitle>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Configure preparation times for automatic order completion and delivery estimates
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        
                        {/* Base Delay Section */}
                        <div className="space-y-3">
                          <h3 className="font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {t.settingsBranch.timingSettings.basePreparationDelay}
                          </h3>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="base-initial">{t.settingsBranch.timingSettings.initialMinutes}</Label>
                              <Input
                                id="base-initial"
                                type="number"
                                value={settings.timingSettings.baseDelay}
                                onChange={(e) => handleTimingChange('baseDelay', Number(e.target.value))}
                                className="h-9"
                                min="0"
                                max="120"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="base-temporary">{t.settingsBranch.timingSettings.temporary}</Label>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleTimingChange('temporaryBaseDelay', Math.max(-60, settings.timingSettings.temporaryBaseDelay - 5))}
                                  className="h-8 w-8 p-0"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  id="base-temporary"
                                  type="number"
                                  value={settings.timingSettings.temporaryBaseDelay}
                                  onChange={(e) => handleTimingChange('temporaryBaseDelay', Number(e.target.value))}
                                  className="h-8 text-center text-sm"
                                  min="-60"
                                  max="60"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleTimingChange('temporaryBaseDelay', Math.min(60, settings.timingSettings.temporaryBaseDelay + 5))}
                                  className="h-8 w-8 p-0"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-primary/5 p-2 rounded text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">{t.settingsBranch.timingSettings.total}</span>
                              <span className="font-medium text-primary">{settings.timingSettings.baseDelay + settings.timingSettings.temporaryBaseDelay} min</span>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* Delivery Delay Section */}
                        <div className="space-y-3">
                          <h3 className="font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {t.settingsBranch.timingSettings.deliveryDelay}
                          </h3>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="delivery-initial">{t.settingsBranch.timingSettings.initialMinutes}</Label>
                              <Input
                                id="delivery-initial"
                                type="number"
                                value={settings.timingSettings.deliveryDelay}
                                onChange={(e) => handleTimingChange('deliveryDelay', Number(e.target.value))}
                                className="h-9"
                                min="0"
                                max="120"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="delivery-temporary">{t.settingsBranch.timingSettings.temporary}</Label>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleTimingChange('temporaryDeliveryDelay', Math.max(-60, settings.timingSettings.temporaryDeliveryDelay - 5))}
                                  className="h-8 w-8 p-0"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  id="delivery-temporary"
                                  type="number"
                                  value={settings.timingSettings.temporaryDeliveryDelay}
                                  onChange={(e) => handleTimingChange('temporaryDeliveryDelay', Number(e.target.value))}
                                  className="h-8 text-center text-sm"
                                  min="-60"
                                  max="60"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleTimingChange('temporaryDeliveryDelay', Math.min(60, settings.timingSettings.temporaryDeliveryDelay + 5))}
                                  className="h-8 w-8 p-0"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-primary/5 p-2 rounded text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">{t.settingsBranch.timingSettings.total}</span>
                              <span className="font-medium text-primary">{Math.max(0, settings.timingSettings.deliveryDelay + settings.timingSettings.temporaryDeliveryDelay)} min</span>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* Expected Total Delivery Time */}
                        <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-primary" />
                              <h3 className="font-medium text-primary">{t.settingsBranch.timingSettings.expectedTotalTime}</h3>
                            </div>
                            <p className="text-xl font-bold text-primary">
                              {Math.max(0, settings.timingSettings.baseDelay + settings.timingSettings.temporaryBaseDelay + settings.timingSettings.deliveryDelay + settings.timingSettings.temporaryDeliveryDelay)} {t.settingsBranch.timingSettings.min}
                            </p>
                          </div>
                        </div>


                      </CardContent>
                    </Card>

                  </div>

              </div>
            </div>
          </div>
          
          {/* Modern Toast Notification */}
          {saved && (
            <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
              <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 flex items-center gap-3">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900">{t.settingsBranch.settingsSaved}</p>
                  <p className="text-xs text-green-700 mt-1">{t.settingsBranch.settingsSavedDesc}</p>
                </div>
                <button 
                  onClick={() => setSaved(false)}
                  className="flex-shrink-0 text-green-600 hover:text-green-800 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
        </SidebarInset>
      </DashboardLayout>
    </AuthGuard>
  )
}