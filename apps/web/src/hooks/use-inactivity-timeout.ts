"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface InactivityTimeoutOptions {
  /**
   * Timeout duration in milliseconds before triggering inactivity
   * @default 900000 (15 minutes)
   */
  timeout?: number;

  /**
   * Warning duration in milliseconds before timeout
   * @default 30000 (30 seconds)
   */
  warningTime?: number;

  /**
   * Callback when user becomes inactive (timeout reached)
   */
  onTimeout: () => void;

  /**
   * Callback when warning threshold is reached
   */
  onWarning?: () => void;

  /**
   * Whether to track inactivity
   * @default true
   */
  enabled?: boolean;

  /**
   * Events to track for activity detection
   * @default ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
   */
  events?: string[];
}

/**
 * Hook to track user inactivity and trigger callbacks
 * Implements SW-78 FO-103 sleep mode requirement
 */
export function useInactivityTimeout({
  timeout = 15 * 60 * 1000, // 15 minutes default
  warningTime = 30 * 1000, // 30 seconds default
  onTimeout,
  onWarning,
  enabled = true,
  events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"],
}: InactivityTimeoutOptions) {
  const [isActive, setIsActive] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(timeout);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const remainingTimeRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  /**
   * Clear all timers
   */
  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
    if (remainingTimeRef.current) {
      clearInterval(remainingTimeRef.current);
      remainingTimeRef.current = null;
    }
  }, []);

  /**
   * Reset the inactivity timer
   */
  const resetTimer = useCallback(() => {
    if (!enabled) return;

    clearTimers();
    setIsActive(true);
    setShowWarning(false);
    setRemainingTime(timeout);
    lastActivityRef.current = Date.now();

    // Set warning timer
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      if (onWarning) {
        onWarning();
      }
    }, timeout - warningTime);

    // Set timeout timer
    timeoutRef.current = setTimeout(() => {
      setIsActive(false);
      onTimeout();
    }, timeout);

    // Update remaining time every second
    remainingTimeRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, timeout - elapsed);
      setRemainingTime(remaining);

      if (remaining === 0) {
        clearTimers();
      }
    }, 1000);
  }, [enabled, timeout, warningTime, onTimeout, onWarning, clearTimers]);

  /**
   * Handle user activity
   */
  const handleActivity = useCallback(() => {
    if (!enabled || !isActive) return;
    resetTimer();
  }, [enabled, isActive, resetTimer]);

  /**
   * Pause the inactivity timer
   */
  const pause = useCallback(() => {
    clearTimers();
  }, [clearTimers]);

  /**
   * Resume the inactivity timer
   */
  const resume = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  // Set up event listeners
  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    // Initial timer setup
    resetTimer();

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Cleanup
    return () => {
      clearTimers();
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [enabled, events, handleActivity, resetTimer, clearTimers]);

  return {
    isActive,
    showWarning,
    remainingTime,
    resetTimer,
    pause,
    resume,
  };
}
