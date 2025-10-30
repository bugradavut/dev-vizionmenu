"use client";

import { useEffect, useState } from "react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { useToast } from "@/hooks/use-toast";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Offline mode indicator
 * Shows persistent badge when offline + toast notifications
 * Auto-syncs when network reconnects
 */
export function OfflineIndicator() {
  const { isOnline, isOffline, wasOffline } = useNetworkStatus();
  const { isSyncing } = useOfflineSync();
  const { toast } = useToast();
  const [hasShownOfflineToast, setHasShownOfflineToast] = useState(false);
  const [hasShownOnlineToast, setHasShownOnlineToast] = useState(false);

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
        description: "You're offline. Orders will be saved locally and synced when connection returns.",
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
        description: "Connection restored. Syncing offline orders...",
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
          <span className="text-sm font-semibold">Syncing Orders...</span>
        </div>
      </div>
    );
  }

  return null;
}
