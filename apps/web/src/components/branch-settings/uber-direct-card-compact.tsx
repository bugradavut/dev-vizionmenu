"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Car, CheckCircle, AlertCircle, Settings } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { translations } from "@/lib/translations"
import { UberDirectModal } from "./uber-direct-modal"

interface UberDirectCardCompactProps {
  branchId: string
  isEnabled: boolean
  customerId: string
  clientId: string
  hasCredentials: boolean
  onUpdate?: () => void
}

export function UberDirectCardCompact({
  branchId,
  isEnabled: initialEnabled,
  customerId: initialCustomerId,
  clientId: initialClientId,
  onUpdate
}: UberDirectCardCompactProps) {
  const { language } = useLanguage()
  const t = translations[language] || translations.en
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isEnabled, setIsEnabled] = React.useState(initialEnabled)
  const [customerId, setCustomerId] = React.useState(initialCustomerId)
  const [clientId, setClientId] = React.useState(initialClientId)
  const [clientSecret, setClientSecret] = React.useState('')
  const [testStatus, setTestStatus] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)

  // Update state when props change
  React.useEffect(() => {
    setIsEnabled(initialEnabled)
    setCustomerId(initialCustomerId)
    setClientId(initialClientId)
  }, [initialEnabled, initialCustomerId, initialClientId])

  // Load settings when modal opens
  const loadSettings = async () => {
    if (!branchId) return

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const projectId = supabaseUrl.split('//')[1]?.split('.')[0] || ''
      const authKey = `sb-${projectId}-auth-token`
      const token = JSON.parse(localStorage.getItem(authKey) || '{}').access_token

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/uber-direct/branch-settings/${branchId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()

      if (data.success) {
        setIsEnabled(data.branch.uber_direct_enabled)
        setCustomerId(data.branch.customer_id)
        setClientId(data.branch.client_id)
        // Show masked placeholder if secret exists, otherwise empty
        setClientSecret(data.branch.has_credentials ? '••••••••••••••••••••••••••••••••' : '')
      }
    } catch (error) {
      console.error('Failed to load Uber Direct settings:', error)
    }
  }

  // Save settings
  const handleSave = async () => {
    if (!branchId) return

    setIsSaving(true)
    setTestStatus('')

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const projectId = supabaseUrl.split('//')[1]?.split('.')[0] || ''
      const authKey = `sb-${projectId}-auth-token`
      const token = JSON.parse(localStorage.getItem(authKey) || '{}').access_token

      // Only send secret if it was changed (not the placeholder)
      const secretToSend = clientSecret.startsWith('••') ? '' : clientSecret

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/uber-direct/branch-settings/${branchId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          enabled: isEnabled,
          customer_id: customerId,
          client_id: clientId,
          client_secret: secretToSend
        })
      })

      const data = await response.json()

      if (data.success || response.ok) {
        setTestStatus('success|Settings saved successfully')
        setIsModalOpen(false)
        onUpdate?.()
        // Reset form if disabled
        if (!isEnabled) {
          setCustomerId('')
          setClientId('')
          setClientSecret('')
        }
      } else {
        setTestStatus(`error|Error: ${data.message}`)
      }
    } catch (error) {
      setTestStatus(`error|Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Car className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base">{t.settingsBranch.uberDirect}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.settingsBranch.uberDirectDesc}
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 pt-1">
              <Switch
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isEnabled ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 text-sm mb-2">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">{t.settingsBranch.uberDirectEnabled}</span>
              </div>
              <p className="text-xs text-green-600">
                {t.settingsBranch.uberDirectEnabledDesc}
              </p>
            </div>
          ) : (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">{t.settingsBranch.uberDirectDisabled}</span>
              </div>
              <p className="text-xs text-gray-500">
                {t.settingsBranch.uberDirectDisabledDesc}
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
            {t.settingsBranch.configureCredentials}
          </Button>
        </CardContent>
      </Card>

      <UberDirectModal
        isOpen={isModalOpen}
        isEnabled={isEnabled}
        customerId={customerId}
        clientId={clientId}
        clientSecret={clientSecret}
        testConnectionStatus={testStatus}
        isSaving={isSaving}
        onOpenChange={setIsModalOpen}
        onEnabledChange={setIsEnabled}
        onCustomerIdChange={setCustomerId}
        onClientIdChange={setClientId}
        onClientSecretChange={setClientSecret}
        onSave={handleSave}
        onLoad={loadSettings}
      />
    </>
  )
}
