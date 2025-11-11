"use client";

import { useEffect, useState, useCallback } from "react";
import { useNetworkStatus } from "./use-network-status";
import { useToast } from "./use-toast";
import { useAuth } from "@/contexts/auth-context";

/**
 * Hook to handle WEB-SRM queue syncing
 * Auto-syncs pending Quebec transactions when network reconnects
 * Implements SW-78 FO-104 requirement
 */
export function useWebSrmQueueSync() {
  const { isOnline, wasOffline } = useNetworkStatus();
  const { toast } = useToast();
  const { session } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{
    processed: number;
    completed: number;
    failed: number;
  } | null>(null);

  /**
   * Process pending WEB-SRM queue items
   * Calls backend endpoint to send pending transactions to Quebec
   */
  const processQueue = useCallback(async (): Promise<boolean> => {
    if (!session?.access_token) {
      console.log("[WebSrmQueueSync] No session, skipping queue processing");
      return false;
    }

    setIsSyncing(true);

    try {
      console.log("[WebSrmQueueSync] Processing pending Quebec transactions...");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/websrm/process-queue`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Queue processing failed: ${response.statusText}`);
      }

      const result = await response.json();
      const data = result.data;

      setLastSyncResult({
        processed: data.processed || 0,
        completed: data.completed || 0,
        failed: data.failed || 0,
      });

      console.log(
        "[WebSrmQueueSync] ✅ Queue processed:",
        `${data.completed} completed, ${data.failed} failed`
      );

      // Show success toast only if items were processed
      if (data.processed > 0) {
        toast({
          variant: "success" as any,
          title: "✓ Quebec Transactions Synced" as any,
          description: `${data.completed} transaction(s) sent to WEB-SRM successfully.`,
          duration: 3000,
        });
      }

      return true;
    } catch (error) {
      console.error("[WebSrmQueueSync] Queue processing failed:", error);

      toast({
        variant: "destructive",
        title: "Queue Sync Failed",
        description:
          "Failed to sync Quebec transactions. Will retry automatically.",
        duration: 3000,
      });

      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [session, toast]);

  // Auto-process queue when network reconnects
  useEffect(() => {
    if (isOnline && wasOffline && !isSyncing && session) {
      console.log(
        "[WebSrmQueueSync] Network reconnected, triggering auto-sync..."
      );

      // Small delay to ensure network is stable
      const timer = setTimeout(() => {
        processQueue();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, isSyncing, session, processQueue]);

  return {
    isSyncing,
    lastSyncResult,
    processQueue,
  };
}
