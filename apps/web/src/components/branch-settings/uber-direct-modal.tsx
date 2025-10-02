"use client"

import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@/components/ui/visually-hidden"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { CheckCircle, X } from "lucide-react"

interface UberDirectModalProps {
  isOpen: boolean
  isEnabled: boolean
  customerId: string
  clientId: string
  clientSecret: string
  testConnectionStatus: string
  isSaving: boolean
  onOpenChange: (open: boolean) => void
  onEnabledChange: (enabled: boolean) => void
  onCustomerIdChange: (value: string) => void
  onClientIdChange: (value: string) => void
  onClientSecretChange: (value: string) => void
  onSave: () => void
  onLoad: () => void
}

export function UberDirectModal({
  isOpen,
  isEnabled,
  customerId,
  clientId,
  clientSecret,
  testConnectionStatus,
  isSaving,
  onOpenChange,
  onEnabledChange,
  onCustomerIdChange,
  onClientIdChange,
  onClientSecretChange,
  onSave,
  onLoad
}: UberDirectModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open)
        if (open) onLoad()
      }}
    >
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <VisuallyHidden>
            <DialogTitle>Uber Direct Integration Settings</DialogTitle>
          </VisuallyHidden>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Uber Direct Logo and Switch */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <img
                src="/uber-direct.svg"
                alt="Uber Direct"
                className="h-10 w-10"
              />
              <div>
                <h3 className="text-sm font-medium">Uber Direct</h3>
                <p className="text-xs text-muted-foreground">
                  Auto courier dispatch
                </p>
              </div>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={onEnabledChange}
            />
          </div>

          {/* Conditional Content - Only show when enabled */}
          {isEnabled && (
            <div className="space-y-4">
              {/* Customer ID Input */}
              <div className="space-y-2">
                <Label htmlFor="uber-customer-id" className="text-sm font-medium">
                  Uber Direct Customer ID
                </Label>
                <Input
                  id="uber-customer-id"
                  placeholder="Enter your Customer ID"
                  className="w-full"
                  value={customerId}
                  onChange={(e) => onCustomerIdChange(e.target.value)}
                />
              </div>

              {/* Client ID Input */}
              <div className="space-y-2">
                <Label htmlFor="uber-client-id" className="text-sm font-medium">
                  Client ID
                </Label>
                <Input
                  id="uber-client-id"
                  placeholder="Enter your Client ID"
                  className="w-full"
                  value={clientId}
                  onChange={(e) => onClientIdChange(e.target.value)}
                />
              </div>

              {/* Client Secret Input */}
              <div className="space-y-2">
                <Label htmlFor="uber-client-secret" className="text-sm font-medium">
                  Client Secret
                </Label>
                <Input
                  id="uber-client-secret"
                  type="password"
                  placeholder="Enter your Client Secret"
                  className="w-full"
                  value={clientSecret}
                  onChange={(e) => onClientSecretChange(e.target.value)}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Enter your credentials or{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto text-xs text-blue-600"
                  onClick={() => window.open('https://merchants.ubereats.com/us/en/services/uber-direct/', '_blank')}
                >
                  create an account
                </Button>
              </p>

              {/* Test Connection Status */}
              {testConnectionStatus && (
                <div className={`text-xs p-3 rounded-lg border flex items-center gap-2 ${
                  testConnectionStatus.startsWith('success|')
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {testConnectionStatus.startsWith('success|') ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-red-600" />
                  )}
                  <span className="font-medium">
                    {testConnectionStatus.split('|')[1] || testConnectionStatus}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
