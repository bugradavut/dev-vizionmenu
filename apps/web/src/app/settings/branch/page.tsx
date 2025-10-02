"use client"

import React, { useState } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AppSidebar } from "@/components/app-sidebar"
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { CheckCircle, Settings, Clock, Timer, Plus, Minus, AlertCircle, RefreshCw, DollarSign, Bike, CalendarDays, Check as CheckIcon, Lock, ChevronLeft, X } from "lucide-react"
import { VisuallyHidden } from "@/components/ui/visually-hidden"
import { useEnhancedAuth } from "@/hooks/use-enhanced-auth"
import { useBranchSettings } from "@/hooks/use-branch-settings"
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/translations"
import { cn } from "@/lib/utils"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DeliveryZonesCard } from "@/components/delivery-zones"
import { UberEatsIntegrationCard } from "@/components/uber-eats-integration-card"
import { AutoReadyCard } from "@/components/branch-settings/auto-ready-card"
import { PaymentMethodsCard } from "@/components/branch-settings/payment-methods-card"
import { MinimumOrderCard } from "@/components/branch-settings/minimum-order-card"
import { DeliveryFeeCard } from "@/components/branch-settings/delivery-fee-card"
import { TimingCardsGroup } from "@/components/branch-settings/timing-cards-group"
import { RestaurantHoursCard } from "@/components/branch-settings/restaurant-hours-card"
import { UberDirectModal } from "@/components/branch-settings/uber-direct-modal"

type RestaurantHoursDay = keyof typeof translations.en.settingsBranch.restaurantHours.dayLabels

interface RestaurantHoursCopy {
  title: string
  subtitle: string
  statusClosed: string
  statusOpen: string
  closedToggleAria: string
  closedNotice: string
  workingDaysLabel: string
  defaultHoursLabel: string
  openLabel: string
  closeLabel: string
  helperText: string
  dayLabels: Record<RestaurantHoursDay, string>
  dayInitials: Record<RestaurantHoursDay, string>
}
// Custom Time Picker Component with ScrollArea
interface CustomTimePickerProps {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
  id,
  value,
  onChange,
  disabled,
  placeholder
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const hours = value ? value.split(':')[0] : '00'
  const minutes = value ? value.split(':')[1] : '00'

  const handleTimeSelect = (selectedTime: string) => {
    onChange(selectedTime)
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-center text-center font-normal",
            !value && "text-muted-foreground"
          )}
        >
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 z-[100] shadow-lg"
        align="start"
        side="bottom"
        avoidCollisions={true}
        sideOffset={4}
        collisionPadding={10}
        sticky="always"
        style={{ pointerEvents: 'auto', touchAction: 'auto' }}
      >
        <div className="p-3" style={{ touchAction: 'auto' }}>
          <div className="grid grid-cols-2 gap-4">
            {/* Hours */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">Hours</div>
              <div
                className="h-32 w-full rounded border overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                style={{
                  scrollBehavior: 'smooth',
                  overscrollBehavior: 'contain',
                  WebkitOverflowScrolling: 'touch'
                }}
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
              >
                <div className="grid grid-cols-3 gap-1 p-2">
                  {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map((hour) => (
                    <Button
                      key={hour}
                      variant={hours === hour ? "default" : "ghost"}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleTimeSelect(`${hour}:${minutes}`)}
                    >
                      {hour}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Minutes */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2">Minutes</div>
              <div
                className="h-32 w-full rounded border overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                style={{
                  scrollBehavior: 'smooth',
                  overscrollBehavior: 'contain',
                  WebkitOverflowScrolling: 'touch'
                }}
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
              >
                <div className="grid grid-cols-2 gap-1 p-2">
                  {['00', '15', '30', '45'].map((minute) => (
                    <Button
                      key={minute}
                      variant={minutes === minute ? "default" : "ghost"}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleTimeSelect(`${hours}:${minute}`)}
                    >
                      {minute}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

const RESTAURANT_HOURS_FALLBACK: Record<keyof typeof translations, RestaurantHoursCopy> = {
  en: {
    title: "Restaurant Hours",
    subtitle: "Configure when customers can order",
    statusClosed: "Closed",
    statusOpen: "Open",
    closedToggleAria: "Toggle restaurant availability",
    closedNotice: "The branch is marked as closed. Customers will not be able to place orders.",
    workingDaysLabel: "Working Days",
    defaultHoursLabel: "Default Hours",
    openLabel: "Open",
    closeLabel: "Close",
    helperText: "Use this placeholder to plan hours. Detailed per-day schedules will come with the API integration.",
    dayLabels: {
      mon: "Monday",
      tue: "Tuesday",
      wed: "Wednesday",
      thu: "Thursday",
      fri: "Friday",
      sat: "Saturday",
      sun: "Sunday"
    },
    dayInitials: {
      mon: "M",
      tue: "T",
      wed: "W",
      thu: "T",
      fri: "F",
      sat: "S",
      sun: "S"
    }
  },
  fr: {
    title: "Heures du restaurant",
    subtitle: "Configurez quand les clients peuvent commander",
    statusClosed: "Ferm\u00E9",
    statusOpen: "Ouvert",
    closedToggleAria: "Basculer la disponibilit\u00E9 du restaurant",
    closedNotice: "La succursale est indiqu\u00E9e comme ferm\u00E9e. Les clients ne pourront pas passer de commandes.",
    workingDaysLabel: "Jours actifs",
    defaultHoursLabel: "Heures par d\u00E9faut",
    openLabel: "Ouverture",
    closeLabel: "Fermeture",
    helperText: "Utilisez cette maquette pour planifier les heures. Les horaires d\u00E9taill\u00E9s par jour arriveront avec l'int\u00E9gration API.",
    dayLabels: {
      mon: "Lundi",
      tue: "Mardi",
      wed: "Mercredi",
      thu: "Jeudi",
      fri: "Vendredi",
      sat: "Samedi",
      sun: "Dimanche"
    },
    dayInitials: {
      mon: "L",
      tue: "M",
      wed: "M",
      thu: "J",
      fri: "V",
      sat: "S",
      sun: "D"
    }
  }
}

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
  const restaurantHoursCopy = (t.settingsBranch.restaurantHours ?? RESTAURANT_HOURS_FALLBACK[language] ?? RESTAURANT_HOURS_FALLBACK.en) as RestaurantHoursCopy
  const [saved, setSaved] = useState(false)
  const [showCustomSchedule, setShowCustomSchedule] = useState(false)
  const [isUberDirectModalOpen, setIsUberDirectModalOpen] = useState(false)
  const [isUberDirectEnabled, setIsUberDirectEnabled] = useState(false)
  const [uberDirectCustomerId, setUberDirectCustomerId] = useState("")
  const [uberDirectClientId, setUberDirectClientId] = useState("")
  const [uberDirectClientSecret, setUberDirectClientSecret] = useState("")
  const [isSavingUberDirect, setIsSavingUberDirect] = useState(false)
  const [testConnectionStatus, setTestConnectionStatus] = useState("")

  // Local state for input values to allow empty strings
  const [baseDelayInput, setBaseDelayInput] = useState("")
  const [deliveryDelayInput, setDeliveryDelayInput] = useState("")
  const [minimumOrderInput, setMinimumOrderInput] = useState("")
  const [deliveryFeeInput, setDeliveryFeeInput] = useState("")
  const [freeDeliveryThresholdInput, setFreeDeliveryThresholdInput] = useState("")
  // Migrate restaurant hours to new structure and get current state
  const migratedHours = React.useMemo(() => {
    if (!settings.restaurantHours) return null;

    // If already in new format, return as-is
    if (settings.restaurantHours.mode) {
      return settings.restaurantHours;
    }

    // Legacy data migration - only if no mode is set
    return {
      isOpen: settings.restaurantHours.isOpen ?? true,
      mode: 'simple' as 'simple' | 'advanced',
      simpleSchedule: {
        workingDays: settings.restaurantHours.workingDays || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        defaultHours: {
          openTime: settings.restaurantHours.defaultHours?.openTime || '09:00',
          closeTime: settings.restaurantHours.defaultHours?.closeTime || '22:00'
        }
      },
      advancedSchedule: {}
    };
  }, [settings.restaurantHours]);

  const restaurantClosed = !migratedHours?.isOpen;
  const currentMode = migratedHours?.mode || 'simple';

  // Get current working days and hours based on mode
  const selectedWorkingDays = currentMode === 'advanced'
    ? Object.entries(migratedHours?.advancedSchedule || {})
        .filter(([, schedule]) => schedule && schedule.enabled)
        .map(([day]) => day)
    : migratedHours?.simpleSchedule?.workingDays || [];

  const { openTime, closeTime } = currentMode === 'advanced'
    ? { openTime: '09:00', closeTime: '22:00' } // Will be shown per-day in modal
    : migratedHours?.simpleSchedule?.defaultHours || { openTime: '09:00', closeTime: '22:00' };
  const workingDayOrder: RestaurantHoursDay[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

  
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

  // Load Uber Direct settings on page load
  React.useEffect(() => {
    if (branchId && !loading) {
      loadUberDirectSettings()
    }
  }, [branchId, loading])

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

  // Handle Uber Direct settings save
  const handleSaveUberDirect = async () => {
    if (!branchId) return

    setIsSavingUberDirect(true)
    setTestConnectionStatus("")

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/uber-direct/branch-settings/${branchId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const projectId = supabaseUrl.split('//')[1]?.split('.')[0] || '';
    const authKey = `sb-${projectId}-auth-token`;
    return JSON.parse(localStorage.getItem(authKey) || '{}').access_token;
  })()}`
        },
        body: JSON.stringify({
          enabled: isUberDirectEnabled,
          customer_id: uberDirectCustomerId,
          client_id: uberDirectClientId,
          client_secret: uberDirectClientSecret
        })
      })

      const data = await response.json()

      if (data.success) {
        setTestConnectionStatus("success|Credentials saved successfully")
        setIsUberDirectModalOpen(false)
        // Reset form
        if (!isUberDirectEnabled) {
          setUberDirectCustomerId("")
          setUberDirectClientId("")
          setUberDirectClientSecret("")
        }
      } else {
        setTestConnectionStatus(`error|Error: ${data.message}`)
      }
    } catch (error) {
      setTestConnectionStatus(`error|Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSavingUberDirect(false)
    }
  }

  // Load Uber Direct settings when modal opens
  const loadUberDirectSettings = async () => {
    if (!branchId) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/uber-direct/branch-settings/${branchId}`, {
        headers: {
          'Authorization': `Bearer ${(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const projectId = supabaseUrl.split('//')[1]?.split('.')[0] || '';
    const authKey = `sb-${projectId}-auth-token`;
    return JSON.parse(localStorage.getItem(authKey) || '{}').access_token;
  })()}`
        }
      })
      const data = await response.json()

      if (data.success) {
        setIsUberDirectEnabled(data.branch.uber_direct_enabled)
        setUberDirectCustomerId(data.branch.customer_id)
        setUberDirectClientId(data.branch.client_id)
        // Show masked placeholder if secret exists, otherwise empty
        setUberDirectClientSecret(data.branch.has_credentials ? '••••••••••••••••••••••••••••••••' : '')
      }
    } catch (error) {
      console.error('Failed to load Uber Direct settings:', error)
    }
  }

  // Restaurant hours handlers - now connected to real API
  const handleRestaurantClosedToggle = (value: boolean) => {
    if (!migratedHours) return;
    updateSettings({
      restaurantHours: {
        ...migratedHours,
        isOpen: !value
      }
    });
  };

  const handleModeSwitch = () => {
    if (!migratedHours) return;

    if (currentMode === 'simple') {
      // Switch to advanced: copy simple settings to all enabled days
      const advancedSchedule: { [key: string]: { enabled: boolean; openTime: string; closeTime: string } } = {};
      const allDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

      allDays.forEach(day => {
        const isEnabled = selectedWorkingDays.includes(day);
        advancedSchedule[day] = {
          enabled: isEnabled,
          openTime: migratedHours.simpleSchedule.defaultHours.openTime,
          closeTime: migratedHours.simpleSchedule.defaultHours.closeTime
        };
      });

      updateSettings({
        restaurantHours: {
          ...migratedHours,
          mode: 'advanced',
          advancedSchedule
        }
      });
    } else {
      // Switch to simple: find most common hours or use first enabled day
      const enabledDays = Object.entries(migratedHours.advancedSchedule)
        .filter(([, schedule]) => schedule.enabled)
        .map(([day]) => day);

      const firstEnabledSchedule = Object.values(migratedHours.advancedSchedule)
        .find(schedule => schedule.enabled);

      const defaultHours = firstEnabledSchedule ? {
        openTime: firstEnabledSchedule.openTime,
        closeTime: firstEnabledSchedule.closeTime
      } : { openTime: '09:00', closeTime: '22:00' };

      updateSettings({
        restaurantHours: {
          ...migratedHours,
          mode: 'simple',
          simpleSchedule: {
            workingDays: enabledDays,
            defaultHours
          }
        }
      });
    }
  };

  const handleWorkingDayToggle = (day: RestaurantHoursDay) => {
    if (!migratedHours) return;

    if (currentMode === 'simple') {
      const currentWorkingDays = migratedHours.simpleSchedule.workingDays || [];
      const newWorkingDays = currentWorkingDays.includes(day)
        ? currentWorkingDays.filter((existingDay) => existingDay !== day)
        : [...currentWorkingDays, day];

      updateSettings({
        restaurantHours: {
          ...migratedHours,
          simpleSchedule: {
            ...migratedHours.simpleSchedule,
            workingDays: newWorkingDays
          }
        }
      });
    } else {
      // Advanced mode: toggle day enabled status
      const currentSchedule = migratedHours.advancedSchedule[day] || {
        enabled: false,
        openTime: '09:00',
        closeTime: '22:00'
      };

      updateSettings({
        restaurantHours: {
          ...migratedHours,
          advancedSchedule: {
            ...migratedHours.advancedSchedule,
            [day]: {
              ...currentSchedule,
              enabled: !currentSchedule.enabled
            }
          }
        }
      });
    }
  };

  const handleOpenTimeChange = (newOpenTime: string) => {
    if (!migratedHours || currentMode !== 'simple') return;

    updateSettings({
      restaurantHours: {
        ...migratedHours,
        simpleSchedule: {
          ...migratedHours.simpleSchedule,
          defaultHours: {
            ...migratedHours.simpleSchedule.defaultHours,
            openTime: newOpenTime
          }
        }
      }
    });
  };

  const handleCloseTimeChange = (newCloseTime: string) => {
    if (!migratedHours || currentMode !== 'simple') return;

    updateSettings({
      restaurantHours: {
        ...migratedHours,
        simpleSchedule: {
          ...migratedHours.simpleSchedule,
          defaultHours: {
            ...migratedHours.simpleSchedule.defaultHours,
            closeTime: newCloseTime
          }
        }
      }
    });
  };

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
                  <AutoReadyCard
                    autoReady={settings.timingSettings?.autoReady || false}
                    onAutoReadyChange={handleAutoReadyChange}
                  />

                  {/* Payment Methods Card */}
                  <PaymentMethodsCard
                    paymentSettings={settings.paymentSettings || {}}
                    onPaymentSettingsChange={(paymentSettings) => updateSettings({ paymentSettings })}
                  />

                  {/* Minimum Order Amount Card */}
                  <MinimumOrderCard
                    minimumOrderAmount={settings.minimumOrderAmount || 0}
                    minimumOrderInput={minimumOrderInput}
                    onMinimumOrderChange={handleMinimumOrderChange}
                    translations={{
                      title: t.settingsBranch.minimumOrderTitle,
                      description: t.settingsBranch.minimumOrderDesc,
                      noMinimumSet: t.settingsBranch.noMinimumSet,
                      minimumOrderWarning: t.settingsBranch.minimumOrderWarning
                    }}
                  />

                  {/* Delivery Fee Card */}
                  <DeliveryFeeCard
                    deliveryFee={settings.deliveryFee || 0}
                    deliveryFeeInput={deliveryFeeInput}
                    freeDeliveryThreshold={settings.freeDeliveryThreshold || 0}
                    freeDeliveryThresholdInput={freeDeliveryThresholdInput}
                    isUberDirectEnabled={isUberDirectEnabled}
                    onDeliveryFeeChange={handleDeliveryFeeChange}
                    onFreeDeliveryThresholdChange={handleFreeDeliveryThresholdChange}
                    onUberDirectClick={() => setIsUberDirectModalOpen(true)}
                    translations={{
                      title: t.settingsBranch.deliveryFeeTitle,
                      description: t.settingsBranch.deliveryFeeDesc,
                      noDeliveryFee: t.settingsBranch.noDeliveryFee,
                      deliveryFeeApplied: t.settingsBranch.deliveryFeeApplied,
                      freeDeliveryThreshold: t.settingsBranch.freeDeliveryThreshold,
                      noFreeDelivery: t.settingsBranch.noFreeDelivery,
                      freeDeliveryEnabled: t.settingsBranch.freeDeliveryEnabled
                    }}
                  />
                </div>

                {/* Second Row: Kitchen & Delivery Timing + Total Time */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column - Timing Cards + Expected Total Time */}
                  <TimingCardsGroup
                    baseDelay={settings.timingSettings.baseDelay}
                    baseDelayInput={baseDelayInput}
                    deliveryDelay={settings.timingSettings.deliveryDelay}
                    deliveryDelayInput={deliveryDelayInput}
                    temporaryBaseDelay={settings.timingSettings.temporaryBaseDelay}
                    temporaryDeliveryDelay={settings.timingSettings.temporaryDeliveryDelay}
                    onBaseTimeChange={handleBaseTimeChange}
                    onDeliveryTimeChange={handleDeliveryTimeChange}
                    onBaseDelayAdjustment={handleBaseDelayAdjustment}
                    onDeliveryDelayAdjustment={handleDeliveryDelayAdjustment}
                  />

                  {/* Right Column - Restaurant Hours */}
                  <RestaurantHoursCard
                    migratedHours={migratedHours}
                    currentMode={currentMode}
                    restaurantClosed={restaurantClosed}
                    selectedWorkingDays={selectedWorkingDays}
                    openTime={openTime}
                    closeTime={closeTime}
                    showCustomSchedule={showCustomSchedule}
                    language={language}
                    translations={restaurantHoursCopy}
                    onRestaurantClosedToggle={handleRestaurantClosedToggle}
                    onWorkingDayToggle={handleWorkingDayToggle}
                    onOpenTimeChange={handleOpenTimeChange}
                    onCloseTimeChange={handleCloseTimeChange}
                    onModeSwitch={handleModeSwitch}
                    onShowCustomScheduleChange={setShowCustomSchedule}
                    onUpdateSettings={updateSettings}
                  />
                </div>

                {/* Delivery Zones Card - Full Width at Bottom */}
                <div className="grid grid-cols-1 gap-6">
                  <DeliveryZonesCard
                    value={settings.deliveryZones}
                    onChange={(deliveryZones) => updateSettings({ deliveryZones })}
                  />
                </div>

                {/* Uber Eats Integration Card */}
                <div className="grid grid-cols-1 gap-6">
                  <UberEatsIntegrationCard />
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

          {/* Uber Direct Modal */}
          <UberDirectModal
            isOpen={isUberDirectModalOpen}
            isEnabled={isUberDirectEnabled}
            customerId={uberDirectCustomerId}
            clientId={uberDirectClientId}
            clientSecret={uberDirectClientSecret}
            testConnectionStatus={testConnectionStatus}
            isSaving={isSavingUberDirect}
            onOpenChange={setIsUberDirectModalOpen}
            onEnabledChange={setIsUberDirectEnabled}
            onCustomerIdChange={setUberDirectCustomerId}
            onClientIdChange={setUberDirectClientId}
            onClientSecretChange={setUberDirectClientSecret}
            onSave={handleSaveUberDirect}
            onLoad={loadUberDirectSettings}
          />

        </SidebarInset>
      </DashboardLayout>
    </AuthGuard>
  )
}




