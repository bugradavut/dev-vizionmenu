"use client"

import * as React from "react"
import { Bell, Send } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { CertificateWarningCard } from "@/components/certificate-warning-card"
import type { CertificateExpiryStatus } from "@/types/websrm"

interface NotificationsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pendingCount: number
  certificateStatus?: CertificateExpiryStatus | null
  onSendSuccess?: () => void
}

export function NotificationsDialog({
  open,
  onOpenChange,
  pendingCount,
  certificateStatus,
  onSendSuccess,
}: NotificationsDialogProps) {
  const [isSending, setIsSending] = React.useState(false)
  const { session } = useAuth()
  const { toast } = useToast()

  const handleSendToWebSrm = async () => {
    if (!session?.access_token) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to send transactions.",
      })
      return
    }

    setIsSending(true)

    try {
      console.log("[NotificationsDialog] Sending pending transactions to WEB-SRM...")

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/websrm/process-queue`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to process queue: ${response.statusText}`)
      }

      const result = await response.json()
      const data = result.data

      console.log(
        `[NotificationsDialog] ✅ Processed ${data.completed} transaction(s)`
      )

      toast({
        variant: "success" as any,
        title: "✓ Transactions Sent",
        description: `${data.completed} transaction(s) sent to WEB-SRM successfully.`,
        duration: 3000,
      })

      // Refresh count and close dialog
      if (onSendSuccess) {
        onSendSuccess()
      }
      onOpenChange(false)
    } catch (error) {
      console.error("[NotificationsDialog] Failed to send:", error)
      toast({
        variant: "destructive",
        title: "Send Failed",
        description:
          "Failed to send transactions to WEB-SRM. Please try again.",
        duration: 5000,
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </DialogTitle>
          <DialogDescription>
            Stay updated with your Quebec transaction status
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="py-4">
          {/* Check if we have any notifications to show */}
          {pendingCount > 0 || certificateStatus?.shouldShowNotification ? (
            <div className="space-y-4">
              {/* Certificate Warning - Show first if present */}
              {certificateStatus?.shouldShowNotification && (
                <CertificateWarningCard status={certificateStatus} />
              )}

              {/* Pending Transactions */}
              {pendingCount > 0 && (
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-orange-100 p-2">
                      <Bell className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Pending Quebec Transactions
                      </p>
                      <p className="text-sm text-muted-foreground">
                        You have {pendingCount} transaction{pendingCount > 1 ? "s" : ""}{" "}
                        waiting to be sent to WEB-SRM.
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        These transactions were created offline and need to be synced.
                      </p>
                    </div>
                  </div>

                  <DialogFooter className="mt-4">
                    <Button
                      onClick={handleSendToWebSrm}
                      disabled={isSending}
                      className="w-full"
                    >
                      {isSending ? (
                        <>Processing...</>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send to WEB-SRM
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-sm text-muted-foreground mt-1">
                All Quebec transactions are up to date
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
