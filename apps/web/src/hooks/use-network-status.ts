"use client";

import { useState, useEffect } from "react";

export interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
  wasOffline: boolean; // Track if user was offline (for notifications)
}

/**
 * Hook to detect network connectivity status
 * Implements SW-78 FO-104 offline mode requirement
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Initialize with current status
    const online = typeof navigator !== "undefined" ? navigator.onLine : true;
    setIsOnline(online);

    if (!online) {
      setWasOffline(true);
    }

    const handleOnline = () => {
      console.log("[NetworkStatus] Connected to network");
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log("[NetworkStatus] Lost network connection");
      setIsOnline(false);
      setWasOffline(true);
    };

    // Listen for network events
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic check (fallback for unreliable events)
    const interval = setInterval(() => {
      const currentStatus = navigator.onLine;
      if (currentStatus !== isOnline) {
        setIsOnline(currentStatus);
        if (!currentStatus) {
          setWasOffline(true);
        }
      }
    }, 5000); // Check every 5 seconds

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [isOnline]);

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
  };
}
