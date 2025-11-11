"use client";

import { useEffect, useState } from "react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { useWebSrmQueueSync } from "@/hooks/use-websrm-queue-sync";
import { useToast } from "@/hooks/use-toast";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Offline mode indicator
 * Shows persistent badge when offline + toast notifications
 * Auto-syncs orders and Quebec transactions when network reconnects
 * Implements SW-78 FO-104 requirement
 */
export function OfflineIndicator() {
  const { isOnline, isOffline, wasOffline } = useNetworkStatus();
  const { isSyncing: isSyncingOrders } = useOfflineSync();
  const { isSyncing: isSyncingWebSrm } = useWebSrmQueueSync();
  const { toast } = useToast();
  const [hasShownOfflineToast, setHasShownOfflineToast] = useState(false);
  const [hasShownOnlineToast, setHasShownOnlineToast] = useState(false);

  const isSyncing = isSyncingOrders || isSyncingWebSrm;

  // Show toast when going offline
  useEffect(() => {
    if (isOffline && !hasShownOfflineToast) {
      toast({
        variant: "destructive",
        title: (
          <span className="flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            Offline Mode
          </span>
        ) as any,
        description: "You're offline. Orders and Quebec transactions will be saved and synced when connection returns.",
        duration: 5000,
      });
      setHasShownOfflineToast(true);
      setHasShownOnlineToast(false);
    }
  }, [isOffline, hasShownOfflineToast, toast]);

  // Show toast when coming back online
  useEffect(() => {
    if (isOnline && wasOffline && !hasShownOnlineToast) {
      toast({
        variant: "success" as any,
        title: (
          <span className="flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            Back Online
          </span>
        ) as any,
        description: "Connection restored. Syncing offline orders and Quebec transactions...",
        duration: 3000,
      });
      setHasShownOnlineToast(true);
      setHasShownOfflineToast(false);
    }
  }, [isOnline, wasOffline, hasShownOnlineToast, toast]);

  // Persistent offline badge (top-right corner)
  if (isOffline) {
    return (
      <div className="fixed top-4 right-4 z-[200]">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg",
            "bg-red-100 border-2 border-red-400 text-red-900",
            "animate-pulse"
          )}
        >
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-semibold">Offline Mode</span>
        </div>
      </div>
    );
  }

  // Show sync badge if currently syncing
  if (isSyncing) {
    return (
      <div className="fixed top-4 right-4 z-[200]">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg",
            "bg-blue-100 border-2 border-blue-400 text-blue-900"
          )}
        >
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm font-semibold">Syncing...</span>
        </div>
      </div>
    );
  }

  return null;
}
