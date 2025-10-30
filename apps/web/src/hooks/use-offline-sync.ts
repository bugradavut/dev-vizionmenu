"use client";

import { useEffect, useState } from "react";
import { useNetworkStatus } from "./use-network-status";
import { syncManager, type SyncResult } from "@/lib/sync/sync-manager";
import { useToast } from "./use-toast";

/**
 * Hook to handle offline order syncing
 * Auto-syncs when network reconnects (practical implementation of SW-78 FO-104)
 * Also provides manual sync function for edge cases
 */
export function useOfflineSync() {
  const { isOnline, wasOffline } = useNetworkStatus();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  const syncOrders = async () => {
    setIsSyncing(true);

    try {
      const result = await syncManager.syncPendingOrders();
      setLastSyncResult(result);

      if (result.success && result.syncedCount && result.syncedCount > 0) {
        toast({
          variant: "success" as any,
          title: "✓ Orders Synced" as any,
          description: `Successfully synced ${result.syncedCount} offline order(s).`,
          duration: 3000,
        });
      } else if (result.failedCount && result.failedCount > 0) {
        toast({
          variant: "destructive",
          title: "⚠️ Sync Issues",
          description: `${result.failedCount} order(s) failed to sync. Will retry later.`,
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("[useOfflineSync] Sync error:", error);
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: "Failed to sync offline orders. Will retry automatically.",
        duration: 3000,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync when network reconnects
  useEffect(() => {
    if (isOnline && wasOffline && !isSyncing) {
      console.log("[useOfflineSync] Network reconnected, triggering auto-sync...");
      syncOrders();
    }
  }, [isOnline, wasOffline]);

  return {
    isSyncing,
    lastSyncResult,
    syncOrders,
  };
}
