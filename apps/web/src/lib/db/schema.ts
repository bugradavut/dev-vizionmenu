/**
 * IndexedDB Schema for Offline Mode
 * Implements SW-78 FO-104 offline storage requirement
 */

export interface OfflineOrder {
  id: string; // UUID
  order_data: OrderPayload;
  created_at: number; // timestamp
  status: "pending" | "syncing" | "synced" | "failed";
  retry_count: number;
  last_error?: string;
  webSRM_cert_path?: string; // For offline print compliance
  local_receipt_number: string; // Generated locally
}

export interface OrderPayload {
  // Customer info
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;

  // Order items
  items: OrderItem[];

  // Order details
  order_type: "dine_in" | "takeout" | "delivery";
  branch_id: string;
  branch_name: string;
  chain_id: string;

  // Pricing
  subtotal: number;
  tax: number;
  tip?: number;
  delivery_fee?: number;
  total: number;

  // Payment
  payment_method: string;

  // Additional
  notes?: string;
  promo_code?: string;
  table_number?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  modifiers?: Array<{
    name: string;
    price: number;
  }>;
  special_instructions?: string;
}

export const DB_NAME = "vision-menu-offline";
export const DB_VERSION = 1;
export const STORES = {
  OFFLINE_ORDERS: "offline_orders",
} as const;
