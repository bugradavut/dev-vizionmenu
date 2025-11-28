'use client'

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
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Power, User, Clock } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useLanguage } from "@/contexts/language-context"
import { useState, useEffect } from 'react'
import { useToast } from "@/hooks/use-toast"
import { platformSettingsService, MaintenanceMode } from "@/services/platform-settings.service"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function MaintenanceModePage() {
  const { language } = useLanguage()
  const { toast } = useToast()

  const [maintenanceMode, setMaintenanceMode] = useState<MaintenanceMode>({
    is_enabled: false,
    enabled_at: null,
    enabled_by: null,
    enabled_by_name: null
  })
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Load maintenance mode status on mount
  useEffect(() => {
    fetchMaintenanceMode()
  }, [])

  const fetchMaintenanceMode = async () => {
    try {
      setLoading(true)
      const data = await platformSettingsService.getMaintenanceMode()
      setMaintenanceMode(data)
    } catch (error) {
      console.error('Failed to fetch maintenance mode:', error)
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: language === 'fr'
          ? 'Impossible de charger le mode maintenance'
          : 'Failed to load maintenance mode',
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (enabled: boolean) => {
    // If enabling, show confirmation dialog first
    if (enabled) {
      setShowConfirmDialog(true)
      return
    }

    // If disabling, proceed directly
    await confirmToggle(enabled)
  }

  const confirmToggle = async (enabled: boolean) => {
    try {
      setUpdating(true)
      const data = await platformSettingsService.updateMaintenanceMode(enabled)
      setMaintenanceMode(data)

      toast({
        title: language === 'fr' ? 'Succès' : 'Success',
        description: enabled
          ? (language === 'fr'
              ? 'Le mode maintenance a été activé'
              : 'Maintenance mode has been enabled')
          : (language === 'fr'
              ? 'Le mode maintenance a été désactivé'
              : 'Maintenance mode has been disabled'),
      })
    } catch (error) {
      console.error('Failed to update maintenance mode:', error)
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: language === 'fr'
          ? 'Impossible de modifier le mode maintenance'
          : 'Failed to update maintenance mode',
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
      setShowConfirmDialog(false)
    }
  }

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'N/A'
    return new Date(isoString).toLocaleString(language === 'fr' ? 'fr-CA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <AuthGuard requireAuth={true} requireRememberOrRecent={true} redirectTo="/login">
      <DashboardLayout>
        <AppSidebar />
        <SidebarInset>
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/dashboard">
                      {language === 'fr' ? 'Tableau de bord' : 'Dashboard'}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/admin-settings">
                      {language === 'fr' ? 'Paramètres Admin' : 'Admin Settings'}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>
                      {language === 'fr' ? 'Mode Maintenance' : 'Maintenance Mode'}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          <div className="flex flex-1 flex-col px-2 sm:px-4 lg:px-6">
            {/* Header Section */}
            <div className="px-2 py-6 sm:px-4 lg:px-6 bg-background">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  <h1 className="text-3xl font-bold tracking-tight">
                    {language === 'fr' ? 'Mode Maintenance' : 'Maintenance Mode'}
                  </h1>
                  <p className="text-muted-foreground mt-2 text-lg">
                    {language === 'fr'
                      ? 'Contrôlez le mode maintenance pour les pages de commande clients'
                      : 'Control maintenance mode for customer order pages'}
                  </p>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 px-2 py-8 sm:px-4 lg:px-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Status Card */}
                  <div className="lg:col-span-4">
                    {/* Status Card */}
                    <Card className="border mb-6">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                              <Power className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <p className="text-lg font-semibold">
                                {language === 'fr' ? 'Mode Maintenance' : 'Maintenance Mode'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {language === 'fr'
                                  ? 'Activer pour bloquer les commandes clients'
                                  : 'Enable to block customer orders'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge
                              className={`text-xs px-3 py-1 ${
                                maintenanceMode.is_enabled
                                  ? 'border-primary text-primary bg-orange-50 dark:bg-orange-950/30'
                                  : 'border-gray-300 text-gray-600 bg-gray-100 dark:bg-gray-800'
                              }`}
                              variant="outline"
                            >
                              {maintenanceMode.is_enabled
                                ? (language === 'fr' ? 'ACTIF' : 'ACTIVE')
                                : (language === 'fr' ? 'INACTIF' : 'INACTIVE')}
                            </Badge>
                            <Switch
                              id="maintenance-toggle"
                              checked={maintenanceMode.is_enabled}
                              onCheckedChange={handleToggle}
                              disabled={updating}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Active Alert */}
                    {maintenanceMode.is_enabled && (
                      <Alert className="mb-6 border-orange-500 bg-orange-50 dark:bg-orange-950">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-800 dark:text-orange-200">
                          {language === 'fr'
                            ? 'Le mode maintenance est actuellement ACTIF. Les clients verront un message de maintenance sur les pages de commande.'
                            : 'Maintenance mode is currently ACTIVE. Customers will see a maintenance message on order pages.'}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Status Details */}
                    {maintenanceMode.is_enabled && maintenanceMode.enabled_at && (
                      <Card className="border">
                        <CardContent className="p-6">
                          <h4 className="font-semibold text-sm text-muted-foreground uppercase mb-4">
                            {language === 'fr' ? 'Détails' : 'Details'}
                          </h4>
                          <div className="space-y-4">
                            <div className="flex items-start gap-3">
                              <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="text-sm font-medium">
                                  {language === 'fr' ? 'Activé par' : 'Enabled by'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {maintenanceMode.enabled_by_name || 'Unknown'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start gap-3">
                              <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="text-sm font-medium">
                                  {language === 'fr' ? 'Activé le' : 'Enabled at'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {formatDate(maintenanceMode.enabled_at)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </SidebarInset>
      </DashboardLayout>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'fr' ? 'Activer le mode maintenance ?' : 'Enable Maintenance Mode?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'fr'
                ? 'Cette action bloquera toutes les commandes clients sur les pages de commande. Les clients verront un message de maintenance avec le numéro de téléphone de la succursale.'
                : 'This action will block all customer orders on order pages. Customers will see a maintenance message with the branch phone number.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmToggle(true)}
              disabled={updating}
              className="bg-primary hover:bg-primary/90"
            >
              {updating
                ? (language === 'fr' ? 'Activation...' : 'Enabling...')
                : (language === 'fr' ? 'Activer' : 'Enable')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AuthGuard>
  )
}
