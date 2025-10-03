"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, CheckCircle, AlertCircle, Settings } from "lucide-react"
import { useEnhancedAuth } from "@/hooks/use-enhanced-auth"
import { useLanguage } from "@/contexts/language-context"

interface UberEatsStatus {
  connected: boolean
  status: string
  store_id?: string
  token_expired?: boolean
}

export function UberEatsIntegrationCard() {
  const { branchId } = useEnhancedAuth()
  const { language } = useLanguage()
  const [status, setStatus] = useState<UberEatsStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Check OAuth status on mount
  useEffect(() => {
    checkStatus()
  }, [branchId])

  const checkStatus = async () => {
    if (!branchId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(
        `${API_URL}/api/v1/uber-eats/auth/status?branch_id=${branchId}`
      )

      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      } else {
        // If 404 or error, assume not connected
        setStatus({ connected: false, status: 'not_connected' })
      }
    } catch (error) {
      console.error('Failed to check Uber Eats status:', error)
      // On error, assume not connected
      setStatus({ connected: false, status: 'not_connected' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = () => {
    if (!branchId) {
      console.log('No branch ID found')
      return
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const url = `${API_URL}/api/v1/uber-eats/auth/connect?branch_id=${branchId}`
    console.log('Connecting to Uber Eats:', url)

    // Redirect to OAuth flow
    window.location.href = url
  }

  const handleDisconnect = async () => {
    if (!branchId || !confirm('Are you sure you want to disconnect Uber Eats?')) return

    setIsDisconnecting(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const response = await fetch(
        `${API_URL}/api/v1/uber-eats/auth/disconnect?branch_id=${branchId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        setStatus({ connected: false, status: 'not_connected' })
      }
    } catch (error) {
      console.error('Failed to disconnect Uber Eats:', error)
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className=" bg-green-50 rounded-lg">
                <img
                  src="/uber-eats-card.jpg"
                  alt="Uber Eats"
                  className="h-10 w-10 object-cover rounded"
                />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base">
                  {language === 'fr' ? 'Uber Eats' : 'Uber Eats'}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'fr'
                    ? 'Recevez et gérez les commandes Uber Eats'
                    : 'Receive and manage Uber Eats orders'}
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 pt-1">
              {isLoading ? (
                <div className="w-11 h-6 bg-gray-200 rounded-full animate-pulse" />
              ) : (
                <Switch
                  checked={status?.connected || false}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleConnect()
                    } else {
                      handleDisconnect()
                    }
                  }}
                  disabled={isLoading}
                  className="data-[state=checked]:bg-primary"
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-20 bg-gray-100 rounded-lg animate-pulse" />
              <div className="h-9 bg-gray-100 rounded animate-pulse" />
            </div>
          ) : status?.connected ? (
            <div className="space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 text-sm mb-2">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">
                    {language === 'fr' ? 'Connecté' : 'Connected'}
                  </span>
                </div>
                {status.store_id && (
                  <p className="text-xs text-green-600">
                    Store ID: <span className="font-mono">{status.store_id}</span>
                  </p>
                )}
              </div>

              {status.token_expired && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-700 text-sm mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">
                      {language === 'fr' ? 'Jeton expiré' : 'Token Expired'}
                    </span>
                  </div>
                  <p className="text-xs text-yellow-600">
                    {language === 'fr'
                      ? 'Veuillez vous reconnecter pour continuer à recevoir les commandes.'
                      : 'Please reconnect to continue receiving orders.'}
                  </p>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsModalOpen(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                {language === 'fr' ? 'Gérer la connexion' : 'Manage Connection'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">
                    {language === 'fr' ? 'Non connecté' : 'Not Connected'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {language === 'fr'
                    ? 'Activez le switch pour connecter votre compte Uber Eats.'
                    : 'Enable the switch to connect your Uber Eats account.'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connection Management Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === 'fr' ? 'Gérer Uber Eats' : 'Manage Uber Eats'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {status?.connected && (
              <>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Store ID</p>
                  <p className="text-sm font-mono bg-gray-50 p-2 rounded border">
                    {status.store_id}
                  </p>
                </div>

                {status.token_expired && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium">
                          {language === 'fr' ? 'Jeton expiré' : 'Token Expired'}
                        </p>
                        <p className="text-xs mt-1">
                          {language === 'fr'
                            ? 'Veuillez vous reconnecter pour continuer à recevoir les commandes.'
                            : 'Please reconnect to continue receiving orders.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {status.token_expired && (
                    <Button
                      onClick={handleConnect}
                      className="flex-1"
                    >
                      <img
                        src="/uber-eats-card.jpg"
                        alt="Uber Eats"
                        className="h-4 w-4 mr-2 object-cover rounded"
                      />
                      {language === 'fr' ? 'Reconnecter' : 'Reconnect'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className={status.token_expired ? 'flex-1' : 'w-full'}
                  >
                    {isDisconnecting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {language === 'fr' ? 'Déconnexion...' : 'Disconnecting...'}
                      </>
                    ) : (
                      language === 'fr' ? 'Déconnecter' : 'Disconnect'
                    )}
                  </Button>
                </div>
              </>
            )}

            {!status?.connected && (
              <>
                <p className="text-sm text-muted-foreground">
                  {language === 'fr'
                    ? 'Connectez votre compte restaurant Uber Eats pour commencer à recevoir des commandes directement dans VizionMenu.'
                    : 'Connect your Uber Eats restaurant account to start receiving orders directly in VizionMenu.'}
                </p>

                <Button onClick={handleConnect} className="w-full">
                  <img
                    src="/uber-eats-card.jpg"
                    alt="Uber Eats"
                    className="h-4 w-4 mr-2 object-cover rounded"
                  />
                  {language === 'fr' ? 'Connecter Uber Eats' : 'Connect Uber Eats'}
                </Button>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">
                        {language === 'fr' ? 'Intégration OAuth en un clic' : 'One-click OAuth integration'}
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        {language === 'fr'
                          ? "Vous serez redirigé vers Uber pour autoriser VizionMenu. Aucune information d'identification manuelle nécessaire."
                          : "You'll be redirected to Uber to authorize VizionMenu. No manual credentials needed."}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
