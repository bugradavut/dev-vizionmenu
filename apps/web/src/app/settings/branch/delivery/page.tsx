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
import { DeliveryZonesCardCompact } from "@/components/delivery-zones"
import { DeliveryFeeCard } from "@/components/branch-settings/delivery-fee-card"
import { UberDirectCardCompact } from "@/components/branch-settings/uber-direct-card-compact"
import { DeliveryHoursCard } from "@/components/branch-settings/delivery-hours-card"
import { PickupHoursCard } from "@/components/branch-settings/pickup-hours-card"
import { migrateRestaurantHours, getAllWorkingDays, type RestaurantHours } from "@/utils/restaurant-hours"
import Link from "next/link"

export default function BranchDeliverySettingsPage() {
  const { branchId } = useEnhancedAuth()
  const { language } = useLanguage()
  const t = translations[language] || translations.en

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

  // Local state for input fields
  const [deliveryFeeInput, setDeliveryFeeInput] = React.useState(String(settings.deliveryFee || 0))
  const [freeDeliveryThresholdInput, setFreeDeliveryThresholdInput] = React.useState(String(settings.freeDeliveryThreshold || 0))

  // Uber Direct state
  const [uberDirectEnabled, setUberDirectEnabled] = React.useState(false)
  const [uberDirectCustomerId, setUberDirectCustomerId] = React.useState('')
  const [uberDirectClientId, setUberDirectClientId] = React.useState('')
  const [uberDirectHasCredentials, setUberDirectHasCredentials] = React.useState(false)
  const [uberDirectLoading, setUberDirectLoading] = React.useState(true)

  // Delivery Hours state
  const [migratedDeliveryHours, setMigratedDeliveryHours] = React.useState<RestaurantHours | null>(null)

  // Pickup Hours state
  const [migratedPickupHours, setMigratedPickupHours] = React.useState<RestaurantHours | null>(null)

  // Update input fields when settings load
  React.useEffect(() => {
    setDeliveryFeeInput(String(settings.deliveryFee || 0))
    setFreeDeliveryThresholdInput(String(settings.freeDeliveryThreshold || 0))
  }, [settings.deliveryFee, settings.freeDeliveryThreshold])

  // Migrate delivery hours when settings load
  React.useEffect(() => {
    if (settings.deliveryHours) {
      setMigratedDeliveryHours(migrateRestaurantHours(settings.deliveryHours))
    }
  }, [settings.deliveryHours])

  // Migrate pickup hours when settings load
  React.useEffect(() => {
    if (settings.pickupHours) {
      setMigratedPickupHours(migrateRestaurantHours(settings.pickupHours))
    }
  }, [settings.pickupHours])

  // Load Uber Direct settings
  React.useEffect(() => {
    const loadUberDirect = async () => {
      if (!branchId) {
        setUberDirectLoading(false)
        return
      }

      try {
        setUberDirectLoading(true)
        const { supabase } = await import('@/lib/supabase')
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          setUberDirectLoading(false)
          return
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const response = await fetch(`${apiUrl}/api/v1/uber-direct/branch-settings/${branchId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          }
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setUberDirectEnabled(data.branch.uber_direct_enabled || false)
            setUberDirectCustomerId(data.branch.customer_id || '')
            setUberDirectClientId(data.branch.client_id || '')
            setUberDirectHasCredentials(data.branch.has_credentials || false)
          }
        }
      } catch (error) {
        console.error('Failed to load Uber Direct settings:', error)
      } finally {
        setUberDirectLoading(false)
      }
    }

    loadUberDirect()
  }, [branchId])

  // Handle save with settings
  const handleSave = async () => {
    const success = await saveSettings(settings)
    if (success) {
      console.log('✅ Delivery settings saved successfully')
    }
  }

  // Handle delivery fee change
  const handleDeliveryFeeChange = (value: string) => {
    setDeliveryFeeInput(value)
    const numValue = value === "" ? 0 : Number(value)
    if (!isNaN(numValue) && numValue >= 0) {
      updateSettings({ deliveryFee: numValue })
    }
  }

  // Handle free delivery threshold change
  const handleFreeDeliveryThresholdChange = (value: string) => {
    setFreeDeliveryThresholdInput(value)
    const numValue = value === "" ? 0 : Number(value)
    if (!isNaN(numValue) && numValue >= 0) {
      updateSettings({ freeDeliveryThreshold: numValue })
    }
  }

  // Delivery Hours handlers
  const handleDeliveryHoursClosedToggle = (closed: boolean) => {
    if (migratedDeliveryHours) {
      updateSettings({
        deliveryHours: {
          ...migratedDeliveryHours,
          isOpen: !closed
        }
      })
    }
  }

  // Pickup Hours handlers
  const handlePickupHoursClosedToggle = (closed: boolean) => {
    if (migratedPickupHours) {
      updateSettings({
        pickupHours: {
          ...migratedPickupHours,
          isOpen: !closed
        }
      })
    }
  }

  // Loading state - wait for both settings and uber direct
  if (loading || uberDirectLoading) {
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
                    {language === 'fr' ? 'Paramètres de Livraison' : 'Delivery Settings'}
                  </h1>
                  <p className="text-muted-foreground mt-2 text-lg">
                    {language === 'fr'
                      ? 'Gérez les heures de livraison, les zones de livraison, les frais et les intégrations de livraison'
                      : 'Manage delivery hours,zones, fees, and delivery integrations'}
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
            <div className="flex-1 px-2 py-8 sm:px-4 lg:px-6 space-y-6">
              {/* Row 1: Delivery and Pickup Hours */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Delivery Hours Card */}
                {migratedDeliveryHours && (
                  <DeliveryHoursCard
                    migratedHours={migratedDeliveryHours}
                    deliveryClosed={!migratedDeliveryHours.isOpen}
                    selectedWorkingDays={getAllWorkingDays(migratedDeliveryHours)}
                    openTime={migratedDeliveryHours.simpleSchedule?.defaultHours?.openTime || '09:00'}
                    closeTime={migratedDeliveryHours.simpleSchedule?.defaultHours?.closeTime || '22:00'}
                    language={language}
                    translations={t.settingsBranch.deliveryHours}
                    onDeliveryClosedToggle={handleDeliveryHoursClosedToggle}
                    onWorkingDayToggle={(day) => {
                      if (!migratedDeliveryHours) return
                      const currentDays = getAllWorkingDays(migratedDeliveryHours)
                      const newDays = currentDays.includes(day)
                        ? currentDays.filter(d => d !== day)
                        : [...currentDays, day]

                      updateSettings({
                        deliveryHours: {
                          ...migratedDeliveryHours,
                          simpleSchedule: {
                            ...migratedDeliveryHours.simpleSchedule,
                            workingDays: newDays
                          }
                        }
                      })
                    }}
                    onOpenTimeChange={(time) => {
                      if (!migratedDeliveryHours) return
                      updateSettings({
                        deliveryHours: {
                          ...migratedDeliveryHours,
                          simpleSchedule: {
                            ...migratedDeliveryHours.simpleSchedule,
                            defaultHours: {
                              ...migratedDeliveryHours.simpleSchedule.defaultHours,
                              openTime: time
                            }
                          }
                        }
                      })
                    }}
                    onCloseTimeChange={(time) => {
                      if (!migratedDeliveryHours) return
                      updateSettings({
                        deliveryHours: {
                          ...migratedDeliveryHours,
                          simpleSchedule: {
                            ...migratedDeliveryHours.simpleSchedule,
                            defaultHours: {
                              ...migratedDeliveryHours.simpleSchedule.defaultHours,
                              closeTime: time
                            }
                          }
                        }
                      })
                    }}
                  />
                )}

                {/* Pickup Hours Card */}
                {migratedPickupHours && (
                  <PickupHoursCard
                    migratedHours={migratedPickupHours}
                    pickupClosed={!migratedPickupHours.isOpen}
                    selectedWorkingDays={getAllWorkingDays(migratedPickupHours)}
                    openTime={migratedPickupHours.simpleSchedule?.defaultHours?.openTime || '09:00'}
                    closeTime={migratedPickupHours.simpleSchedule?.defaultHours?.closeTime || '22:00'}
                    language={language}
                    translations={t.settingsBranch.pickupHours}
                    onPickupClosedToggle={handlePickupHoursClosedToggle}
                    onWorkingDayToggle={(day) => {
                      if (!migratedPickupHours) return
                      const currentDays = getAllWorkingDays(migratedPickupHours)
                      const newDays = currentDays.includes(day)
                        ? currentDays.filter(d => d !== day)
                        : [...currentDays, day]

                      updateSettings({
                        pickupHours: {
                          ...migratedPickupHours,
                          simpleSchedule: {
                            ...migratedPickupHours.simpleSchedule,
                            workingDays: newDays
                          }
                        }
                      })
                    }}
                    onOpenTimeChange={(time) => {
                      if (!migratedPickupHours) return
                      updateSettings({
                        pickupHours: {
                          ...migratedPickupHours,
                          simpleSchedule: {
                            ...migratedPickupHours.simpleSchedule,
                            defaultHours: {
                              ...migratedPickupHours.simpleSchedule.defaultHours,
                              openTime: time
                            }
                          }
                        }
                      })
                    }}
                    onCloseTimeChange={(time) => {
                      if (!migratedPickupHours) return
                      updateSettings({
                        pickupHours: {
                          ...migratedPickupHours,
                          simpleSchedule: {
                            ...migratedPickupHours.simpleSchedule,
                            defaultHours: {
                              ...migratedPickupHours.simpleSchedule.defaultHours,
                              closeTime: time
                            }
                          }
                        }
                      })
                    }}
                  />
                )}
              </div>

              {/* Row 2: Delivery Zones, Fee, and Uber Direct */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Delivery Zones Card - Compact */}
                <DeliveryZonesCardCompact
                  value={settings.deliveryZones}
                  onChange={(deliveryZones) => updateSettings({ deliveryZones })}
                />

                {/* Delivery Fee Card */}
                <DeliveryFeeCard
                  deliveryFee={settings.deliveryFee || 0}
                  deliveryFeeInput={deliveryFeeInput}
                  freeDeliveryThreshold={settings.freeDeliveryThreshold || 0}
                  freeDeliveryThresholdInput={freeDeliveryThresholdInput}
                  onDeliveryFeeChange={handleDeliveryFeeChange}
                  onFreeDeliveryThresholdChange={handleFreeDeliveryThresholdChange}
                  translations={{
                    title: t.settingsBranch.deliveryFeeTitle,
                    description: t.settingsBranch.deliveryFeeDesc,
                    standardDeliveryFee: t.settingsBranch.standardDeliveryFee,
                    noDeliveryFee: t.settingsBranch.noDeliveryFee,
                    deliveryFeeApplied: t.settingsBranch.deliveryFeeApplied,
                    freeDeliveryThreshold: t.settingsBranch.freeDeliveryThreshold,
                    noFreeDelivery: t.settingsBranch.noFreeDelivery,
                    freeDeliveryEnabled: t.settingsBranch.freeDeliveryEnabled
                  }}
                />

                {/* Uber Direct Card */}
                {branchId && (
                  <UberDirectCardCompact
                    branchId={branchId}
                    isEnabled={uberDirectEnabled}
                    customerId={uberDirectCustomerId}
                    clientId={uberDirectClientId}
                    hasCredentials={uberDirectHasCredentials}
                    onUpdate={() => {
                      // Reload Uber Direct settings after update
                      const loadUberDirect = async () => {
                        try {
                          const { supabase } = await import('@/lib/supabase')
                          const { data: { session } } = await supabase.auth.getSession()
                          if (!session?.access_token) return

                          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
                          const response = await fetch(`${apiUrl}/api/v1/uber-direct/branch-settings/${branchId}`, {
                            headers: {
                              'Authorization': `Bearer ${session.access_token}`,
                            }
                          })

                          if (response.ok) {
                            const data = await response.json()
                            if (data.success) {
                              setUberDirectEnabled(data.branch.uber_direct_enabled || false)
                              setUberDirectCustomerId(data.branch.customer_id || '')
                              setUberDirectClientId(data.branch.client_id || '')
                              setUberDirectHasCredentials(data.branch.has_credentials || false)
                            }
                          }
                        } catch (error) {
                          console.error('Failed to reload Uber Direct settings:', error)
                        }
                      }
                      loadUberDirect()
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </SidebarInset>
      </DashboardLayout>
    </AuthGuard>
  )
}
