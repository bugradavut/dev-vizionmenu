"use client";

/**
 * Receipt Service for VizionMenu
 * SW-76: Fetches WEB-SRM receipt data for printing
 */

import { apiClient, type ApiResponse } from './api-client';

// Receipt data from WEB-SRM
export interface ReceiptData {
  websrm_transaction_id?: string;  // WEB-SRM assigned transaction ID
  transaction_timestamp?: string;  // Time WEB-SRM processed the transaction
  qr_data?: string;                // QR code URL
  format?: 'CUSTOMER' | 'MERCHANT' | 'INTERNAL';
  print_mode?: 'PAPER' | 'ELECTRONIC';
}

/**
 * Get receipt data for an order
 * @param orderId - Order ID
 * @param suppressError - If true, don't log errors (useful for retries)
 * @returns Receipt data with QR code and WEB-SRM transaction info
 */
export async function getOrderReceipt(
  orderId: string,
  suppressError: boolean = false
): Promise<ReceiptData | null> {
  try {
    const response = await apiClient.get<ReceiptData>(`/api/v1/orders/${orderId}/receipt`);

    if (!response.data) {
      return null;
    }

    return response.data;
  } catch (error) {
    // Only log error if not suppressed (allows silent retries)
    if (!suppressError) {
      console.error('Failed to fetch receipt data:', error);
    }
    return null;
  }
}
