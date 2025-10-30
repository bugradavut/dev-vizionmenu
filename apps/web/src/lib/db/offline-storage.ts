import { openDB, DBSchema, IDBPDatabase } from "idb";
import { OfflineOrder, DB_NAME, DB_VERSION, STORES } from "./schema";

interface VisionMenuDB extends DBSchema {
  offline_orders: {
    key: string;
    value: OfflineOrder;
    indexes: {
      status: string;
      created_at: number;
    };
  };
}

class OfflineStorage {
  private db: IDBPDatabase<VisionMenuDB> | null = null;

  /**
   * Initialize database
   */
  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<VisionMenuDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create offline_orders store
        if (!db.objectStoreNames.contains(STORES.OFFLINE_ORDERS)) {
          const store = db.createObjectStore(STORES.OFFLINE_ORDERS, {
            keyPath: "id",
          });
          store.createIndex("status", "status");
          store.createIndex("created_at", "created_at");
        }
      },
    });
  }

  /**
   * Save offline order
   */
  async saveOrder(order: OfflineOrder): Promise<void> {
    await this.init();
    await this.db!.put(STORES.OFFLINE_ORDERS, order);
    console.log("[OfflineStorage] Saved order:", order.id);
  }

  /**
   * Get order by ID
   */
  async getOrder(id: string): Promise<OfflineOrder | undefined> {
    await this.init();
    return this.db!.get(STORES.OFFLINE_ORDERS, id);
  }

  /**
   * Get all pending orders
   */
  async getPendingOrders(): Promise<OfflineOrder[]> {
    await this.init();
    const index = this.db!.transaction(STORES.OFFLINE_ORDERS).store.index("status");
    return index.getAll("pending");
  }

  /**
   * Get all orders (any status)
   */
  async getAllOrders(): Promise<OfflineOrder[]> {
    await this.init();
    return this.db!.getAll(STORES.OFFLINE_ORDERS);
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    id: string,
    status: OfflineOrder["status"],
    error?: string
  ): Promise<void> {
    await this.init();
    const order = await this.getOrder(id);
    if (order) {
      order.status = status;
      if (error) {
        order.last_error = error;
      }
      if (status === "syncing") {
        order.retry_count += 1;
      }
      await this.db!.put(STORES.OFFLINE_ORDERS, order);
      console.log(`[OfflineStorage] Updated order ${id} status to ${status}`);
    }
  }

  /**
   * Delete order
   */
  async deleteOrder(id: string): Promise<void> {
    await this.init();
    await this.db!.delete(STORES.OFFLINE_ORDERS, id);
    console.log("[OfflineStorage] Deleted order:", id);
  }

  /**
   * Delete all synced orders
   */
  async deleteSyncedOrders(): Promise<void> {
    await this.init();
    const orders = await this.getAllOrders();
    const syncedOrders = orders.filter((o) => o.status === "synced");

    for (const order of syncedOrders) {
      await this.deleteOrder(order.id);
    }

    console.log(`[OfflineStorage] Deleted ${syncedOrders.length} synced orders`);
  }

  /**
   * Get count of pending orders
   */
  async getPendingCount(): Promise<number> {
    const pending = await this.getPendingOrders();
    return pending.length;
  }
}

// Singleton instance
export const offlineStorage = new OfflineStorage();
