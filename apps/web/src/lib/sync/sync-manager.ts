"use client";

/**
 * Sync Manager
 * Syncs offline orders when network becomes available
 * Implements SW-78 FO-104 sync requirement
 */

import { offlineStorage } from "@/lib/db/offline-storage";
import { ordersService, type CreateOrderRequest } from "@/services/orders.service";

class SyncManager {
  private isSyncing = false;
  private syncCallbacks: Array<(progress: SyncProgress) => void> = [];

  /**
   * Sync all pending offline orders
   */
  async syncPendingOrders(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log("[SyncManager] Sync already in progress");
      return { success: false, message: "Sync already in progress" };
    }

    this.isSyncing = true;
    const pendingOrders = await offlineStorage.getPendingOrders();

    if (pendingOrders.length === 0) {
      this.isSyncing = false;
      return { success: true, message: "No orders to sync" };
    }

    console.log(`[SyncManager] Syncing ${pendingOrders.length} offline orders`);

    let syncedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < pendingOrders.length; i++) {
      const order = pendingOrders[i];

      this.notifyProgress({
        current: i + 1,
        total: pendingOrders.length,
        orderId: order.id,
      });

      try {
        // Convert to API format
        const orderRequest = this.convertToApiFormat(order);

        // Update status to syncing
        await offlineStorage.updateOrderStatus(order.id, "syncing");

        // Send to API
        const response = await ordersService.createOrder(orderRequest);

        if (response.data) {
          // Success - mark as synced
          await offlineStorage.updateOrderStatus(order.id, "synced");
          syncedCount++;
          console.log(`[SyncManager] Synced order: ${order.local_receipt_number}`);
        } else {
          throw new Error("API returned no data");
        }
      } catch (error) {
        // Failed - mark as failed or back to pending
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        if (order.retry_count >= 3) {
          // Max retries reached
          await offlineStorage.updateOrderStatus(order.id, "failed", errorMessage);
        } else {
          // Retry later
          await offlineStorage.updateOrderStatus(order.id, "pending", errorMessage);
        }

        failedCount++;
        console.error(`[SyncManager] Failed to sync order: ${order.local_receipt_number}`, error);
      }
    }

    this.isSyncing = false;

    // Clean up synced orders
    await offlineStorage.deleteSyncedOrders();

    const result: SyncResult = {
      success: failedCount === 0,
      message: `Synced ${syncedCount} orders, ${failedCount} failed`,
      syncedCount,
      failedCount,
    };

    console.log("[SyncManager] Sync completed:", result);
    return result;
  }

  /**
   * Convert OfflineOrder to CreateOrderRequest
   */
  private convertToApiFormat(order: any): CreateOrderRequest {
    const payload = order.order_data;

    return {
      customer: {
        name: payload.customer_name || "Offline Customer",
        phone: payload.customer_phone || "N/A",
        email: payload.customer_email,
      },
      items: payload.items.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        special_instructions: item.special_instructions,
      })),
      orderType: payload.order_type === "takeout" ? "takeaway" : payload.order_type,
      source: "web" as const,
      tableNumber: payload.table_number,
      notes: payload.notes,
      specialInstructions: payload.notes,
    };
  }

  /**
   * Subscribe to sync progress
   */
  onProgress(callback: (progress: SyncProgress) => void) {
    this.syncCallbacks.push(callback);
  }

  /**
   * Notify subscribers of progress
   */
  private notifyProgress(progress: SyncProgress) {
    this.syncCallbacks.forEach((callback) => callback(progress));
  }
}

export interface SyncProgress {
  current: number;
  total: number;
  orderId: string;
}

export interface SyncResult {
  success: boolean;
  message: string;
  syncedCount?: number;
  failedCount?: number;
}

export const syncManager = new SyncManager();
