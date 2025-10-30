"use client";

import { useEffect, useRef } from "react";
import { useNetworkStatus } from "./use-network-status";
import {
  getDeviceInfo,
  syncOfflineSessions,
} from "@/services/offline-events.service";
import { offlineSessionStorage } from "@/lib/db/offline-session-storage";

/**
 * Hook to track offline mode sessions for SW-78 FO-105 Step 2
 *
 * FIXED: Use static import instead of dynamic import
 * - Dynamic import fails offline (can't load chunk from network)
 * - Static import is bundled, works offline
 */
export function useOfflineSessionTracking(branchId: string | undefined) {
  const { isOnline, isOffline } = useNetworkStatus();
  const sessionActivated = useRef(false);
  const prevOnlineStatus = useRef(isOnline);

  useEffect(() => {
    // Skip if no branchId
    if (!branchId) return;

    // Network went OFFLINE (online -> offline)
    if (prevOnlineStatus.current === true && isOffline && !sessionActivated.current) {
      console.log("[OfflineSessionTracking] Network lost - creating local session");

      // Store session locally (static import works offline)
      offlineSessionStorage.createSession({
        branch_id: branchId,
        device_info: getDeviceInfo(),
        user_agent: navigator.userAgent,
      }).catch(err => {
        console.error("[OfflineSessionTracking] Failed to create session:", err);
      });

      sessionActivated.current = true;
    }

    // Network came ONLINE (offline -> online)
    if (prevOnlineStatus.current === false && isOnline && sessionActivated.current) {
      console.log("[OfflineSessionTracking] Network restored - deactivating and syncing");

      // Deactivate current session locally then sync to backend
      offlineSessionStorage.deactivateSession(branchId)
        .then(async () => {
          // Sync all unsynced sessions to backend
          console.log("[OfflineSessionTracking] Syncing sessions to backend...");
          const result = await syncOfflineSessions();
          console.log("[OfflineSessionTracking] Sync result:", result);
        })
        .catch(err => {
          console.error("[OfflineSessionTracking] Failed to sync:", err);
        });

      sessionActivated.current = false;
    }

    // Update previous status
    prevOnlineStatus.current = isOnline;
  }, [isOnline, isOffline, branchId]);

  return {
    sessionActive: sessionActivated.current,
  };
}
