"use client";

import { useEffect, useRef } from "react";
import { useNetworkStatus } from "./use-network-status";
import {
  activateOfflineMode,
  deactivateOfflineMode,
  getDeviceInfo,
} from "@/services/offline-events.service";

/**
 * Hook to track offline mode sessions for SW-78 FO-105 Step 2
 * Automatically sends activation/deactivation events to backend
 */
export function useOfflineSessionTracking(branchId: string | undefined) {
  const { isOnline, isOffline } = useNetworkStatus();
  const sessionActivated = useRef(false);
  const prevOnlineStatus = useRef(isOnline);

  useEffect(() => {
    // Skip if no branchId
    if (!branchId) return;

    // Detect offline → online transition
    if (prevOnlineStatus.current === true && isOffline && !sessionActivated.current) {
      console.log("[OfflineSessionTracking] Network lost - activating offline mode");

      activateOfflineMode({
        branch_id: branchId,
        device_info: getDeviceInfo(),
      });

      sessionActivated.current = true;
    }

    // Detect online → offline transition
    if (prevOnlineStatus.current === false && isOnline && sessionActivated.current) {
      console.log("[OfflineSessionTracking] Network restored - deactivating offline mode");

      deactivateOfflineMode(branchId);

      sessionActivated.current = false;
    }

    // Update previous status
    prevOnlineStatus.current = isOnline;
  }, [isOnline, isOffline, branchId]);

  return {
    sessionActive: sessionActivated.current,
  };
}
