"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle } from "lucide-react";

/**
 * Inactivity warning toast component
 * Shows warning 30 seconds before auto-logout
 * Shows success message when user becomes active again
 * Implements SW-78 FO-103 sleep mode requirement
 */
export function InactivityWarningDialog() {
  const { inactivityWarning } = useAuth();
  const { toast } = useToast();
  const warningToastDismissRef = useRef<{ dismiss: () => void } | null>(null);
  const wasWarningRef = useRef(false);

  useEffect(() => {
    if (inactivityWarning && !warningToastDismissRef.current) {
      // Show warning toast (red)
      const toastResult = toast({
        variant: "destructive",
        title: "⏰ Session Expiring Soon",
        description: "Your session will expire in 30 seconds due to inactivity.",
        duration: 30000, // Keep toast visible for 30 seconds
      });
      warningToastDismissRef.current = toastResult;
      wasWarningRef.current = true;
    } else if (!inactivityWarning && wasWarningRef.current && warningToastDismissRef.current) {
      // User became active - dismiss warning and show success
      warningToastDismissRef.current.dismiss();
      warningToastDismissRef.current = null;
      wasWarningRef.current = false;

      // Show success toast (green) with CheckCircle icon
      toast({
        variant: "success" as any,
        title: (
          <span className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Session Renewed
          </span>
        ) as any,
        description: "Your session has been extended.",
        duration: 2000, // Show for 2 seconds
      });
    }
  }, [inactivityWarning, toast]);

  return null;
}
