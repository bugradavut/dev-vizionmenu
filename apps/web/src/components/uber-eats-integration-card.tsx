"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { useEnhancedAuth } from "@/hooks/use-enhanced-auth"

interface UberEatsStatus {
  connected: boolean
  status: string
  store_id?: string
  token_expired?: boolean
}

export function UberEatsIntegrationCard() {
  const { branchId } = useEnhancedAuth()
  const [status, setStatus] = useState<UberEatsStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

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

  const getStatusBadge = () => {
    if (isLoading) {
      return (
        <Badge variant="outline" className="border-gray-300 text-gray-600">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Checking...
        </Badge>
      )
    }

    if (!status?.connected) {
      return (
        <Badge variant="outline" className="border-gray-300 text-gray-600">
          <XCircle className="h-3 w-3 mr-1" />
          Not Connected
        </Badge>
      )
    }

    if (status.token_expired) {
      return (
        <Badge variant="outline" className="border-yellow-300 text-yellow-700 bg-yellow-50">
          <AlertCircle className="h-3 w-3 mr-1" />
          Token Expired
        </Badge>
      )
    }

    return (
      <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
        <CheckCircle className="h-3 w-3 mr-1" />
        Connected
      </Badge>
    )
  }

  return (
    <Card className="border border-gray-200 shadow-sm max-w-3xl">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-green-50 p-2">
              <img
                src="https://d3i4yxtzktqr9n.cloudfront.net/web-eats-v2/97c43f8974e6c876.svg"
                alt="Uber Eats"
                className="h-5 w-5"
              />
            </div>
            <div>
              <CardTitle className="text-sm">Uber Eats Integration</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Receive and manage Uber Eats orders
              </p>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Connected State */}
          {status?.connected && (
            <div className="border border-green-200 rounded-lg p-4 bg-green-50/50">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-green-900">Store ID</p>
                    <p className="text-xs text-green-700 mt-0.5 font-mono">{status.store_id}</p>
                  </div>
                </div>

                {status.token_expired && (
                  <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <span>Your access token has expired. Please reconnect to continue receiving orders.</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {status.token_expired && (
                    <Button
                      size="sm"
                      onClick={handleConnect}
                      className="text-xs"
                    >
                      Reconnect
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className="text-xs"
                  >
                    {isDisconnecting ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      'Disconnect'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Not Connected State */}
          {!status?.connected && !isLoading && (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Connect your Uber Eats restaurant account to start receiving orders directly in VizionMenu.
                </p>

                <Button
                  size="sm"
                  onClick={handleConnect}
                  className="text-xs w-full sm:w-auto"
                >
                  <img
                    src="https://d3i4yxtzktqr9n.cloudfront.net/web-eats-v2/97c43f8974e6c876.svg"
                    alt="Uber Eats"
                    className="h-4 w-4 mr-2"
                  />
                  Connect Uber Eats Account
                </Button>

                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">One-click OAuth integration</p>
                    <p className="text-blue-700 mt-0.5">
                      You&apos;ll be redirected to Uber to authorize VizionMenu. No manual credentials needed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
