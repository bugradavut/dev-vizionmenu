"use client";

/**
 * Offline Events Service
 * SW-78 FO-105: Track offline mode activation/deactivation
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface OfflineSessionData {
  branch_id: string;
  device_info?: {
    userAgent?: string;
    screen?: {
      width: number;
      height: number;
    };
    language?: string;
  };
  user_agent?: string;
}

export interface OfflineSession {
  id: string;
  branch_id: string;
  activated_at: string;
  deactivated_at?: string;
  duration_seconds?: number;
  orders_created: number;
  last_network_status: 'offline' | 'online';
  created_at: string;
  updated_at: string;
}

/**
 * Notify backend that offline mode has been activated
 */
export async function activateOfflineMode(data: OfflineSessionData): Promise<OfflineSession | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/offline-events/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      console.error('[OfflineEvents] Failed to activate offline mode:', response.statusText);
      return null;
    }

    const result = await response.json();
    console.log('[OfflineEvents] Offline mode activated:', result.data);
    return result.data;
  } catch (error) {
    console.error('[OfflineEvents] Error activating offline mode:', error);
    return null;
  }
}

/**
 * Notify backend that offline mode has been deactivated (network restored)
 */
export async function deactivateOfflineMode(branchId: string): Promise<OfflineSession | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/offline-events/deactivate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ branch_id: branchId }),
    });

    if (!response.ok) {
      console.error('[OfflineEvents] Failed to deactivate offline mode:', response.statusText);
      return null;
    }

    const result = await response.json();
    console.log('[OfflineEvents] Offline mode deactivated:', result.data);
    return result.data;
  } catch (error) {
    console.error('[OfflineEvents] Error deactivating offline mode:', error);
    return null;
  }
}

/**
 * Increment orders created during current offline session
 */
export async function incrementOfflineOrders(branchId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/offline-events/increment-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ branch_id: branchId }),
    });

    if (!response.ok) {
      console.error('[OfflineEvents] Failed to increment orders:', response.statusText);
      return;
    }

    const result = await response.json();
    console.log('[OfflineEvents] Orders incremented:', result.data);
  } catch (error) {
    console.error('[OfflineEvents] Error incrementing orders:', error);
  }
}

/**
 * Get device information for tracking
 */
export function getDeviceInfo() {
  if (typeof window === 'undefined') return undefined;

  return {
    userAgent: navigator.userAgent,
    screen: {
      width: window.screen.width,
      height: window.screen.height,
    },
    language: navigator.language,
  };
}

/**
 * Sync all unsynced offline sessions to backend
 * Called when network comes back online
 */
export async function syncOfflineSessions(): Promise<{ success: number; failed: number }> {
  try {
    const { offlineSessionStorage } = await import('@/lib/db/offline-session-storage');
    const unsyncedSessions = await offlineSessionStorage.getUnsyncedSessions();

    console.log('[OfflineEvents] Syncing offline sessions:', unsyncedSessions.length);

    let success = 0;
    let failed = 0;

    for (const session of unsyncedSessions) {
      try {
        // Send session to backend
        const response = await fetch(`${API_BASE_URL}/api/v1/offline-events/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            branch_id: session.branch_id,
            activated_at: session.activated_at,
            deactivated_at: session.deactivated_at,
            orders_created: session.orders_created,
            device_info: session.device_info,
            user_agent: session.user_agent,
          }),
        });

        if (response.ok) {
          await offlineSessionStorage.markAsSynced(session.id);
          success++;
          console.log('[OfflineEvents] Session synced successfully:', session.id);
        } else {
          failed++;
          console.error('[OfflineEvents] Failed to sync session:', session.id, response.statusText);
        }
      } catch (error) {
        failed++;
        console.error('[OfflineEvents] Error syncing session:', session.id, error);
      }
    }

    console.log(`[OfflineEvents] Sync complete: ${success} success, ${failed} failed`);
    return { success, failed };
  } catch (error) {
    console.error('[OfflineEvents] Error during sync:', error);
    return { success: 0, failed: 0 };
  }
}
