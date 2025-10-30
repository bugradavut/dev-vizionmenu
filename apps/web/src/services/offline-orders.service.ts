"use client";

/**
 * Offline Orders Service
 * Wrapper around orders.service with offline fallback
 * Implements SW-78 FO-104 offline order creation
 */

import { v4 as uuidv4 } from "uuid";
import { offlineStorage } from "@/lib/db/offline-storage";
import { OfflineOrder, OrderPayload } from "@/lib/db/schema";
import {
  ordersService,
  type CreateOrderRequest,
  type CreateOrderResponse,
} from "./orders.service";
import { type ApiResponse } from "./api-client";

class OfflineOrdersService {
  /**
   * Create order with offline fallback
   * If online: Normal API call
   * If offline: Save to IndexedDB
   */
  async createOrder(
    orderData: CreateOrderRequest,
    isOnline: boolean
  ): Promise<ApiResponse<CreateOrderResponse>> {
    if (isOnline) {
      // Online: Use normal API
      try {
        return await ordersService.createOrder(orderData);
      } catch (error) {
        console.error("[OfflineOrders] Online order creation failed, falling back to offline", error);
        // Network error during online mode - fallback to offline
        return this.createOfflineOrder(orderData);
      }
    } else {
      // Offline: Save to IndexedDB
      return this.createOfflineOrder(orderData);
    }
  }

  /**
   * Create offline order (save to IndexedDB)
   */
  private async createOfflineOrder(
    orderData: CreateOrderRequest
  ): Promise<ApiResponse<CreateOrderResponse>> {
    const orderId = uuidv4();
    const localReceiptNumber = this.generateLocalReceiptNumber();

    // Convert CreateOrderRequest to OrderPayload
    const orderPayload: OrderPayload = {
      customer_name: orderData.customer.name,
      customer_email: orderData.customer.email,
      customer_phone: orderData.customer.phone,
      customer_address: undefined, // TODO: Add if delivery
      items: orderData.items.map((item) => ({
        id: uuidv4(), // Generate ID for offline item
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        modifiers: [],
        special_instructions: item.special_instructions,
      })),
      order_type: orderData.orderType === "takeaway" ? "takeout" : orderData.orderType as "dine_in" | "delivery",
      branch_id: "unknown", // Will be filled during sync
      branch_name: "Offline Order",
      chain_id: "unknown",
      subtotal: 0, // Calculate from items
      tax: 0,
      tip: 0,
      delivery_fee: 0,
      total: orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      payment_method: "cash",
      notes: orderData.notes,
      promo_code: undefined,
      table_number: orderData.tableNumber,
    };

    const offlineOrder: OfflineOrder = {
      id: orderId,
      order_data: orderPayload,
      created_at: Date.now(),
      status: "pending",
      retry_count: 0,
      local_receipt_number: localReceiptNumber,
    };

    await offlineStorage.saveOrder(offlineOrder);

    console.log("[OfflineOrders] Saved offline order:", localReceiptNumber);

    // NOTE: Print will happen on confirmation page (better UX)

    // Return simulated success response
    return {
      data: {
        order: {
          id: orderId,
          orderNumber: localReceiptNumber,
          status: "pending",
          total: orderPayload.total,
          createdAt: new Date().toISOString(),
        },
        autoAccepted: false,
        autoAcceptMessage: "Order saved offline. Will sync when online.",
      },
    };
  }

  /**
   * Generate local receipt number (for offline orders)
   * Format: OFF-YYYYMMDD-XXXX
   */
  private generateLocalReceiptNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 9999)
      .toString()
      .padStart(4, "0");

    return `OFF-${year}${month}${day}-${random}`;
  }

  /**
   * Get pending offline orders count
   */
  async getPendingCount(): Promise<number> {
    return offlineStorage.getPendingCount();
  }
}

export const offlineOrdersService = new OfflineOrdersService();
