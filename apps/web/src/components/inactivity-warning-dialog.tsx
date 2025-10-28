"use client";

import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/auth-context";
import { Clock } from "lucide-react";

/**
 * Inactivity warning dialog component
 * Shows warning 30 seconds before auto-logout
 * Implements SW-78 FO-103 sleep mode requirement
 */
export function InactivityWarningDialog() {
  const { inactivityWarning, inactivityRemainingTime, resetInactivityTimer } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(inactivityWarning);
  }, [inactivityWarning]);

  const handleContinue = () => {
    resetInactivityTimer();
    setOpen(false);
  };

  const secondsRemaining = Math.ceil(inactivityRemainingTime / 1000);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-orange-500" />
            <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            Your session will expire in{" "}
            <span className="font-bold text-orange-600">
              {secondsRemaining} second{secondsRemaining !== 1 ? "s" : ""}
            </span>{" "}
            due to inactivity.
            <br />
            <br />
            Click &quot;Continue Session&quot; to remain logged in.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleContinue} className="w-full">
            Continue Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
