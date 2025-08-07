"use client";

import { useEffect, useCallback, useRef } from 'react';

interface UseSmartPollingOptions {
  /**
   * Polling interval in milliseconds
   * @default 15000 (15 seconds)
   */
  interval?: number;
  
  /**
   * Whether polling should be enabled
   * @default true
   */
  enabled?: boolean;
  
  /**
   * Whether to fetch immediately when the component mounts or tab becomes visible
   * @default true
   */
  fetchOnMount?: boolean;
}

/**
 * Smart polling hook that respects tab visibility
 * Only polls when the tab is active and visible to the user
 * Automatically stops polling when tab is hidden and resumes when visible
 */
export function useSmartPolling(
  fetchFunction: () => Promise<void> | void,
  options: UseSmartPollingOptions = {}
) {
  const {
    interval = 15000, // 15 seconds default
    enabled = true,
    fetchOnMount = true
  } = options;

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fetchFunctionRef = useRef(fetchFunction);

  // Keep fetchFunction reference updated
  useEffect(() => {
    fetchFunctionRef.current = fetchFunction;
  }, [fetchFunction]);

  const startPolling = useCallback(() => {
    if (!enabled) return;
    
    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    // Start new polling interval
    pollIntervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        try {
          fetchFunctionRef.current();
        } catch (error) {
          console.error('Smart polling fetch error:', error);
        }
      }
    }, interval);
  }, [enabled, interval]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      // Tab became visible
      console.debug('🔄 Tab active - starting smart polling');
      
      // Immediately fetch fresh data
      if (fetchOnMount) {
        try {
          fetchFunctionRef.current();
        } catch (error) {
          console.error('Smart polling immediate fetch error:', error);
        }
      }
      
      // Start polling
      startPolling();
    } else {
      // Tab became hidden
      console.debug('⏸️ Tab hidden - stopping smart polling');
      stopPolling();
    }
  }, [startPolling, stopPolling, fetchOnMount]);

  useEffect(() => {
    if (!enabled) {
      stopPolling();
      return;
    }

    // Initial setup
    if (document.visibilityState === 'visible') {
      if (fetchOnMount) {
        try {
          fetchFunctionRef.current();
        } catch (error) {
          console.error('Smart polling mount fetch error:', error);
        }
      }
      startPolling();
    }

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, startPolling, stopPolling, handleVisibilityChange, fetchOnMount]);

  // Return control functions
  return {
    startPolling,
    stopPolling,
    isPolling: pollIntervalRef.current !== null
  };
}

/**
 * Hook for smart polling with automatic error handling and retry logic
 */
export function useSmartPollingWithRetry(
  fetchFunction: () => Promise<void>,
  options: UseSmartPollingOptions & {
    maxRetries?: number;
    retryDelay?: number;
  } = {}
) {
  const {
    maxRetries = 3,
    retryDelay = 5000, // 5 seconds
    ...pollingOptions
  } = options;

  const retryCountRef = useRef(0);

  const wrappedFetchFunction = useCallback(async () => {
    try {
      await fetchFunction();
      retryCountRef.current = 0; // Reset retry count on success
    } catch (error) {
      console.error('Smart polling fetch failed:', error);
      
      retryCountRef.current += 1;
      
      if (retryCountRef.current <= maxRetries) {
        console.log(`Retrying in ${retryDelay}ms (attempt ${retryCountRef.current}/${maxRetries})`);
        setTimeout(() => {
          fetchFunction().catch(() => {}); // Silent retry
        }, retryDelay);
      } else {
        console.error(`Max retries (${maxRetries}) exceeded for smart polling`);
        retryCountRef.current = 0; // Reset for next cycle
      }
    }
  }, [fetchFunction, maxRetries, retryDelay]);

  return useSmartPolling(wrappedFetchFunction, pollingOptions);
}