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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { CheckCircle, Settings, Clock, Timer, Plus, Minus, AlertCircle, RefreshCw, CreditCard, DollarSign, Bike } from "lucide-react"
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
  
  // Local state for input values to allow empty strings
  const [baseDelayInput, setBaseDelayInput] = useState("")
  const [deliveryDelayInput, setDeliveryDelayInput] = useState("")
  const [minimumOrderInput, setMinimumOrderInput] = useState("")
  const [deliveryFeeInput, setDeliveryFeeInput] = useState("")
  const [freeDeliveryThresholdInput, setFreeDeliveryThresholdInput] = useState("")
  
  // Update local inputs when settings change from API
  React.useEffect(() => {
    if (settings.timingSettings && !loading) {
      // Always sync with API data when loading completes
      setBaseDelayInput(settings.timingSettings.baseDelay?.toString() || "")
      setDeliveryDelayInput(settings.timingSettings.deliveryDelay?.toString() || "")
    }
    if (settings && !loading) {
      setMinimumOrderInput(settings.minimumOrderAmount?.toString() || "")
      setDeliveryFeeInput(settings.deliveryFee?.toString() || "")
      setFreeDeliveryThresholdInput(settings.freeDeliveryThreshold?.toString() || "")
    }
  }, [settings.timingSettings, settings.minimumOrderAmount, settings.deliveryFee, settings.freeDeliveryThreshold, loading])

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

  // Handle base time input changes
  const handleBaseTimeChange = (value: string) => {
    setBaseDelayInput(value)
    // Only update settings when value is valid or empty becomes 0
    const numValue = value === "" ? 0 : Number(value)
    if (!isNaN(numValue) && numValue >= 0) {
      handleTimingChange('baseDelay', numValue)
    }
  }

  const handleDeliveryTimeChange = (value: string) => {
    setDeliveryDelayInput(value)
    // Only update settings when value is valid or empty becomes 0  
    const numValue = value === "" ? 0 : Number(value)
    if (!isNaN(numValue) && numValue >= 0) {
      handleTimingChange('deliveryDelay', numValue)
    }
  }

  // Handle minimum order amount changes
  const handleMinimumOrderChange = (value: string) => {
    setMinimumOrderInput(value)
    // Only update settings when value is valid or empty becomes 0
    const numValue = value === "" ? 0 : Number(value)
    if (!isNaN(numValue) && numValue >= 0) {
      updateSettings({
        minimumOrderAmount: numValue
      })
    }
  }

  // Handle delivery fee changes
  const handleDeliveryFeeChange = (value: string) => {
    setDeliveryFeeInput(value)
    // Only update settings when value is valid or empty becomes 0
    const numValue = value === "" ? 0 : Number(value)
    if (!isNaN(numValue) && numValue >= 0) {
      updateSettings({
        deliveryFee: numValue
      })
    }
  }

  // Handle free delivery threshold changes
  const handleFreeDeliveryThresholdChange = (value: string) => {
    setFreeDeliveryThresholdInput(value)
    // Only update settings when value is valid or empty becomes 0
    const numValue = value === "" ? 0 : Number(value)
    if (!isNaN(numValue) && numValue >= 0) {
      updateSettings({
        freeDeliveryThreshold: numValue
      })
    }
  }

  // Handle plus/minus button changes - best practice approach
  const handleBaseDelayAdjustment = (increment: number) => {
    const currentValue = Number(baseDelayInput) || 0
    const newValue = Math.max(0, currentValue + increment)
    
    // Update local state first
    setBaseDelayInput(newValue.toString())
    
    // Then update settings
    updateSettings({
      timingSettings: {
        ...settings.timingSettings,
        baseDelay: newValue,
        temporaryBaseDelay: 0 // Reset temp adjustment
      }
    })
  }

  const handleDeliveryDelayAdjustment = (increment: number) => {
    const currentValue = Number(deliveryDelayInput) || 0
    const newValue = Math.max(0, currentValue + increment)
    
    // Update local state first
    setDeliveryDelayInput(newValue.toString())
    
    // Then update settings
    updateSettings({
      timingSettings: {
        ...settings.timingSettings,
        deliveryDelay: newValue,
        temporaryDeliveryDelay: 0 // Reset temp adjustment
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
              <div className="space-y-6">
                
                {/* First Row: Auto-Ready & Payment Methods & Delivery Fee */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Auto-Ready System Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-50 rounded-lg">
                            <Settings className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <CardTitle className="text-base">Auto-Ready System</CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                              Automatically complete orders when time expires
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={settings.timingSettings?.autoReady || false}
                          onCheckedChange={handleAutoReadyChange}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {settings.timingSettings?.autoReady ? (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 text-green-700 text-sm mb-2">
                            <CheckCircle className="h-4 w-4" />
                            <span className="font-medium">Auto-Ready is enabled</span>
                          </div>
                          <p className="text-xs text-green-600">
                            Orders automatically move to &quot;Ready&quot; status when kitchen preparation time expires. Staff can still manually mark orders ready at any time.
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                            <AlertCircle className="h-4 w-4" />
                            <span className="font-medium">Manual mode active</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Staff must manually change order status to &quot;Ready&quot;. Kitchen timing settings are used for customer time estimates only.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Payment Methods Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                          <CreditCard className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base">Payment Methods</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            Configure payment options for customers
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Online Payment Toggle */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div>
                          <Label htmlFor="online-payment" className="text-sm font-medium">Pay Online</Label>
                          <p className="text-xs text-muted-foreground">Credit card payments</p>
                        </div>
                        <Switch
                          id="online-payment"
                          checked={settings.paymentSettings?.allowOnlinePayment ?? true}
                          onCheckedChange={(enabled) => updateSettings({
                            paymentSettings: {
                              ...settings.paymentSettings,
                              allowOnlinePayment: enabled,
                              allowCounterPayment: settings.paymentSettings?.allowCounterPayment ?? false,
                              defaultPaymentMethod: settings.paymentSettings?.defaultPaymentMethod ?? 'online'
                            }
                          })}
                        />
                      </div>
                      
                      {/* Counter Payment Toggle */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div>
                          <Label htmlFor="counter-payment" className="text-sm font-medium">Pay at Counter</Label>
                          <p className="text-xs text-muted-foreground">Cash or card at pickup</p>
                        </div>
                        <Switch
                          id="counter-payment"
                          checked={settings.paymentSettings?.allowCounterPayment ?? false}
                          onCheckedChange={(enabled) => updateSettings({
                            paymentSettings: {
                              ...settings.paymentSettings,
                              allowOnlinePayment: settings.paymentSettings?.allowOnlinePayment ?? true,
                              allowCounterPayment: enabled,
                              defaultPaymentMethod: settings.paymentSettings?.defaultPaymentMethod ?? 'online'
                            }
                          })}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Minimum Order Amount Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                          <DollarSign className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{t.settingsBranch.minimumOrderTitle}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t.settingsBranch.minimumOrderDesc}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="minimum-order" className="text-sm font-medium">Amount ($CAD)</Label>
                        <div className="relative">
                          <Input
                            id="minimum-order"
                            type="number"
                            value={minimumOrderInput}
                            onChange={(e) => handleMinimumOrderChange(e.target.value)}
                            className="pr-12"
                            placeholder="0.00"
                            min="0"
                            max="1000"
                            step="0.01"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <span className="text-sm text-muted-foreground">CAD</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(settings.minimumOrderAmount || 0) === 0 ? (
                            <span className="text-green-600">
                              • {t.settingsBranch.noMinimumSet}
                            </span>
                          ) : (
                            <span className="text-blue-600">
                              • {t.settingsBranch.minimumOrderWarning.replace('{amount}', `$${settings.minimumOrderAmount?.toFixed(2) || '0.00'}`)}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Delivery Fee Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                          <Bike className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{t.settingsBranch.deliveryFeeTitle}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t.settingsBranch.deliveryFeeDesc}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Base Delivery Fee Input */}
                      <div className="space-y-2">
                        <Label htmlFor="delivery-fee" className="text-sm font-medium">Base Fee ($CAD)</Label>
                        <div className="relative">
                          <Input
                            id="delivery-fee"
                            type="number"
                            value={deliveryFeeInput}
                            onChange={(e) => handleDeliveryFeeChange(e.target.value)}
                            className="pr-12"
                            placeholder="0.00"
                            min="0"
                            max="100"
                            step="0.01"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <span className="text-sm text-muted-foreground">CAD</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(settings.deliveryFee || 0) === 0 ? (
                            <span className="text-green-600">
                              • {t.settingsBranch.noDeliveryFee}
                            </span>
                          ) : (
                            <span className="text-blue-600">
                              • {t.settingsBranch.deliveryFeeApplied.replace('{amount}', `$${settings.deliveryFee?.toFixed(2) || '0.00'}`)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Free Delivery Threshold Input */}
                      <div className="space-y-2">
                        <Label htmlFor="free-delivery-threshold" className="text-sm font-medium">
                          {t.settingsBranch.freeDeliveryThreshold} ($CAD)
                        </Label>
                        <div className="relative">
                          <Input
                            id="free-delivery-threshold"
                            type="number"
                            value={freeDeliveryThresholdInput}
                            onChange={(e) => handleFreeDeliveryThresholdChange(e.target.value)}
                            className="pr-12"
                            placeholder="0.00"
                            min="0"
                            max="10000"
                            step="0.01"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <span className="text-sm text-muted-foreground">CAD</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(settings.freeDeliveryThreshold || 0) === 0 ? (
                            <span className="text-blue-600">
                              • {t.settingsBranch.noFreeDelivery}
                            </span>
                          ) : (
                            <span className="text-blue-600">
                              • {t.settingsBranch.freeDeliveryEnabled.replace('{amount}', `$${settings.freeDeliveryThreshold?.toFixed(2) || '0.00'}`)}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Second Row: Kitchen & Delivery Timing + Total Time */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column - Timing Cards + Expected Total Time */}
                  <div className="space-y-6">
                    {/* Kitchen & Delivery Timing Cards Side by Side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Kitchen Timing Card */}
                      <Card>
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-purple-50 rounded-lg">
                              <Clock className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <CardTitle className="text-sm">Kitchen Prep Time</CardTitle>
                              <p className="text-xs text-muted-foreground">
                                Time to prepare orders
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="base-initial" className="text-xs font-medium">Base Time (min)</Label>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleBaseDelayAdjustment(-5)}
                                className="h-8 w-8 p-0"
                                >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                id="base-initial"
                                type="number"
                                value={baseDelayInput}
                                onChange={(e) => handleBaseTimeChange(e.target.value)}
                                className="h-8 flex-1 text-center"
                                min="0"
                                max="120"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleBaseDelayAdjustment(5)}
                                className="h-8 w-8 p-0"
                                >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Delivery Timing Card */}
                      <Card>
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-purple-50 rounded-lg">
                              <Timer className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <CardTitle className="text-sm">Delivery Time</CardTitle>
                              <p className="text-xs text-muted-foreground">
                                Time for pickup/delivery
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="delivery-initial" className="text-xs font-medium">Base Time (min)</Label>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeliveryDelayAdjustment(-5)}
                                className="h-8 w-8 p-0"
                                >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                id="delivery-initial"
                                type="number"
                                value={deliveryDelayInput}
                                onChange={(e) => handleDeliveryTimeChange(e.target.value)}
                                className="h-8 flex-1 text-center"
                                min="0"
                                max="120"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeliveryDelayAdjustment(5)}
                                className="h-8 w-8 p-0"
                                >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Expected Total Time Card - Only covers left column */}
                    <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-orange-100">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                              <Clock className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                              <h3 className="text-base font-semibold text-orange-900">Expected Total Time</h3>
                              <p className="text-xs text-orange-700">
                                Total time customers will see for completion
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-orange-600">
                              {Math.max(0, settings.timingSettings.baseDelay + settings.timingSettings.temporaryBaseDelay + settings.timingSettings.deliveryDelay + settings.timingSettings.temporaryDeliveryDelay)}
                            </p>
                            <p className="text-xs font-medium text-orange-600">MINUTES</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Right Column - Empty */}
                  <div></div>
                </div>

              </div>
            </div>
          </div>
          
          {/* Success Toast Notification */}
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