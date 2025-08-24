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
              <div className="max-w-4xl">
                {/* Single Unified Card */}
                <Card className="group hover:shadow-lg transition-all duration-200">
                  <CardHeader className="pb-4 border-b mb-6">
                    <div className="flex items-center gap-3">
                      <Settings className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-xl">Order Management & Timing</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Configure your restaurant&apos;s order flow and automatic completion settings
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    
                    {/* Order Flow Section */}
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <h3 className="font-medium mb-3">Simplified Order Flow</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Streamlined 2-step process for efficient order management
                        </p>
                        
                        {/* Flow Visualization */}
                        <div className="flex items-center gap-3">
                          <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium text-sm">
                            Preparing
                          </div>
                          <ArrowRight className="h-5 w-5 text-muted-foreground" />
                          <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium text-sm">
                            Completed
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Auto-Ready Toggle Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-background">
                        <div>
                          <h4 className="text-lg font-semibold mb-1">Auto-Ready System</h4>
                          <p className="text-sm text-muted-foreground">
                            Automatically complete orders when preparation time expires
                          </p>
                        </div>
                        <Switch
                          checked={settings.timingSettings?.autoReady || false}
                          onCheckedChange={handleAutoReadyChange}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                      
                      {/* Auto-Ready Status Indicator */}
                      {settings.timingSettings?.autoReady ? (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 text-green-700 text-sm">
                            <CheckCircle className="h-4 w-4" />
                            <span className="font-medium">Auto-Ready is enabled</span>
                          </div>
                          <p className="text-xs text-green-600 mt-1">
                            Orders will automatically move to completed status based on timing settings below
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span className="font-medium">Manual completion only</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Staff will need to manually complete orders - timing settings are for reference only
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Timing Settings Section */}
                    <div className="space-y-6 transition-all duration-300">
                      <div className="flex items-center gap-3">
                        <Timer className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Timing Configuration</h3>
                      </div>
                      
                      {/* Base Preparation Time */}
                      <div className="space-y-4">
                        <h4 className="font-medium flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          Kitchen Preparation Time
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="base-initial" className="text-sm font-medium">Base Time (Minutes)</Label>
                            <Input
                              id="base-initial"
                              type="number"
                              value={settings.timingSettings.baseDelay}
                              onChange={(e) => handleTimingChange('baseDelay', Number(e.target.value))}
                              className="h-10"
                              min="0"
                              max="120"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="base-temporary" className="text-sm font-medium">Temporary Adjustment</Label>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTimingChange('temporaryBaseDelay', Math.max(-60, settings.timingSettings.temporaryBaseDelay - 5))}
                                className="h-10 w-10 p-0"
                                >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Input
                                id="base-temporary"
                                type="number"
                                value={settings.timingSettings.temporaryBaseDelay}
                                onChange={(e) => handleTimingChange('temporaryBaseDelay', Number(e.target.value))}
                                className="h-10 text-center"
                                min="-60"
                                max="60"
                                />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTimingChange('temporaryBaseDelay', Math.min(60, settings.timingSettings.temporaryBaseDelay + 5))}
                                className="h-10 w-10 p-0"
                                >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-primary/10 p-3 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Kitchen Total:</span>
                            <span className="text-lg font-bold text-primary">
                              {settings.timingSettings.baseDelay + settings.timingSettings.temporaryBaseDelay} min
                            </span>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Delivery Time */}
                      <div className="space-y-4">
                        <h4 className="font-medium flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          Customer Delivery Time
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="delivery-initial" className="text-sm font-medium">Base Time (Minutes)</Label>
                            <Input
                              id="delivery-initial"
                              type="number"
                              value={settings.timingSettings.deliveryDelay}
                              onChange={(e) => handleTimingChange('deliveryDelay', Number(e.target.value))}
                              className="h-10"
                              min="0"
                              max="120"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="delivery-temporary" className="text-sm font-medium">Temporary Adjustment</Label>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTimingChange('temporaryDeliveryDelay', Math.max(-60, settings.timingSettings.temporaryDeliveryDelay - 5))}
                                className="h-10 w-10 p-0"
                                >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Input
                                id="delivery-temporary"
                                type="number"
                                value={settings.timingSettings.temporaryDeliveryDelay}
                                onChange={(e) => handleTimingChange('temporaryDeliveryDelay', Number(e.target.value))}
                                className="h-10 text-center"
                                min="-60"
                                max="60"
                                />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTimingChange('temporaryDeliveryDelay', Math.min(60, settings.timingSettings.temporaryDeliveryDelay + 5))}
                                className="h-10 w-10 p-0"
                                >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-primary/10 p-3 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Delivery Total:</span>
                            <span className="text-lg font-bold text-primary">
                              {Math.max(0, settings.timingSettings.deliveryDelay + settings.timingSettings.temporaryDeliveryDelay)} min
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Expected Total Time */}
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-orange-600" />
                            <h3 className="font-semibold text-orange-900">Expected Total Time</h3>
                          </div>
                          <p className="text-2xl font-bold text-orange-600">
                            {Math.max(0, settings.timingSettings.baseDelay + settings.timingSettings.temporaryBaseDelay + settings.timingSettings.deliveryDelay + settings.timingSettings.temporaryDeliveryDelay)} MIN
                          </p>
                        </div>
                        <p className="text-xs text-orange-600 mt-1">
                          This is the total time customers will see for order completion
                        </p>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center justify-between pt-6 border-t">
                      <div className="text-sm text-muted-foreground">
                        {isDirty && (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                            <span className="text-orange-600 font-medium">Unsaved changes</span>
                          </div>
                        )}
                      </div>
                      <Button 
                        onClick={handleSave} 
                        disabled={!canSave}
                        size="lg"
                        className={saving ? "animate-pulse" : ""}
                      >
                        {saving ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </Button>
                    </div>

                  </CardContent>
                </Card>
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