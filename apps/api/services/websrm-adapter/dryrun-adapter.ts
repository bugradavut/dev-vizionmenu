/**
 * WEB-SRM Dry-Run Adapter
 * Runtime integration layer for WEB-SRM dry-run mode
 *
 * This adapter:
 * - Imports pure functions from @vizionmenu/websrm-core package
 * - Maps internal order format to WEB-SRM format
 * - Generates payload, headers, and QR code
 * - Writes outputs to tmp/ directory for inspection
 * - Does NOT make network calls
 * - Does NOT access database
 *
 * Usage: Only called when isWebSrmDryRunEnabled() returns true
 */

import {
  mapOrderToReqTrans,
  buildHeaders,
  buildReceiptQr,
  computeSignaTransm,
  type OrderShape,
  type TransactionRegistrationResponse,
} from '@vizionmenu/websrm-core';
import { promises as fs } from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

/**
 * Dry-run result metadata
 */
interface DryRunResult {
  /** SHA-256 hash of payload (first 12 chars) */
  hash: string;
  /** Generated file names */
  files: string[];
  /** Transaction ID */
  transactionId: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * Emit WEB-SRM dry-run outputs for an order
 *
 * This function:
 * 1. Maps order to WEB-SRM format
 * 2. Computes signature (STUB)
 * 3. Builds headers
 * 4. Generates QR code
 * 5. Writes 3 files to tmp/ directory
 * 6. Returns metadata for logging
 *
 * @param order - Internal order object from database
 * @returns Dry-run result with hash and file names
 * @throws Error if order is invalid or file write fails
 *
 * @example
 * const result = await emitWebsrmDryRun(order);
 * console.info('[WEB-SRM DRYRUN]', result.transactionId, result.hash);
 */
export async function emitWebsrmDryRun(order: any): Promise<DryRunResult> {
  const timestamp = Date.now();

  // Step 0: Early exit if no items
  // Phase 3: NO DB access - caller must provide items
  if (!order?.items || order.items.length === 0) {
    return {
      hash: 'skipped-no-items',
      files: [],
      transactionId: order?.id || 'unknown',
      timestamp,
    };
  }

  // Step 1: Map order to WEB-SRM OrderShape format
  // This is a simplified mapping - real implementation will map from actual DB schema
  const orderShape: OrderShape = mapInternalOrderToShape(order);

  // Step 2: Compute signature (STUB - not real HMAC)
  const partialPayload = {
    idTrans: orderShape.id,
    acti: 'ENR' as const,
    typServ: 'REST' as const,
    montST: Math.round(orderShape.items_subtotal * 100),
    montTPS: Math.round(orderShape.gst_amount * 100),
    montTVQ: Math.round(orderShape.qst_amount * 100),
    montTot: Math.round(orderShape.total_amount * 100),
  };

  const signature = computeSignaTransm(partialPayload as any, {
    algorithm: 'HMAC-SHA256',
    secret: 'websrm-dryrun-secret-key',
    encoding: 'base64',
  });

  // Step 3: Map to WEB-SRM transaction request
  const payload = mapOrderToReqTrans(orderShape, signature);

  // Step 4: Build HTTP headers
  const headers = buildHeaders({
    certificationCode: 'CERT-DRYRUN-DEV',
    deviceId: process.env.WEBSRM_DEVICE_ID || 'POS-DEV-001',
    softwareVersion: '1.0.0',
    signature: signature,
    requestId: `req-${timestamp}`,
  });

  // Step 5: Generate QR code
  // Create a fake response since we're not calling the real API
  const fakeResponse: TransactionRegistrationResponse = {
    idTrans: orderShape.id,
    idTransSrm: `SRM-DRYRUN-${timestamp}`,
    codeQR: `https://websrm.revenuquebec.ca/verify/${orderShape.id}`,
    dtConfirmation: new Date().toISOString(),
  };
  const qrString = buildReceiptQr(fakeResponse, { format: 'url' });

  // Step 6: Write outputs to tmp/
  const outDir = path.join(process.cwd(), 'tmp');
  await fs.mkdir(outDir, { recursive: true });

  // Deterministic filename based on order creation time
  const createdAt = order.created_at || new Date().toISOString();
  const stamp = new Date(createdAt).toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const baseFilename = `websrm-${order.id || 'order'}-${stamp}`;
  const payloadFile = `${baseFilename}-payload.json`;
  const headersFile = `${baseFilename}-headers.json`;
  const qrFile = `${baseFilename}-qr.txt`;

  await fs.writeFile(
    path.join(outDir, payloadFile),
    JSON.stringify(payload, null, 2),
    'utf8'
  );
  await fs.writeFile(
    path.join(outDir, headersFile),
    JSON.stringify(headers, null, 2),
    'utf8'
  );
  await fs.writeFile(path.join(outDir, qrFile), qrString, 'utf8');

  // Step 7: Compute hash for verification
  const payloadJson = JSON.stringify(payload);
  const hash = createHash('sha256').update(payloadJson, 'utf8').digest('hex').slice(0, 12);

  return {
    hash,
    files: [payloadFile, headersFile, qrFile],
    transactionId: orderShape.id,
    timestamp,
  };
}

/**
 * Map internal order format to WEB-SRM OrderShape
 *
 * This is a minimal adapter that maps from the actual database order structure
 * to the OrderShape interface expected by @vizionmenu/websrm-core
 *
 * TODO: Update this mapping when the real database schema is finalized
 *
 * @param order - Internal order from database
 * @returns OrderShape for WEB-SRM core library
 */
function mapInternalOrderToShape(order: any): OrderShape {
  // Extract order data with fallbacks
  const orderId = order.id || order.order_id || `order-${Date.now()}`;
  const branchId = order.branch_id || 'UNKNOWN-BRANCH';
  const createdAt = order.created_at || new Date().toISOString();
  const updatedAt = order.updated_at || createdAt;

  // Map order type
  const orderType = mapOrderType(order.order_type || order.type);

  // Map order status
  const orderStatus = mapOrderStatus(order.order_status || order.status);

  // Map payment method
  const paymentMethod = mapPaymentMethod(order.payment_method || order.payment?.method);

  // Extract amounts (ensure numbers)
  const itemsSubtotal = parseFloat(order.items_subtotal || order.subtotal || 0);
  const discountAmount = parseFloat(order.discount_amount || order.discount || 0);
  const gstAmount = parseFloat(order.gst_amount || order.tax_gst || 0);
  const qstAmount = parseFloat(order.qst_amount || order.tax_qst || 0);
  const tipAmount = parseFloat(order.tip_amount || order.tip || 0);
  const totalAmount = parseFloat(order.total_amount || order.total || 0);

  // Map line items
  const items = mapLineItems(order.items || order.order_items || []);

  return {
    id: orderId,
    branch_id: branchId,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    customer_email: order.customer_email,
    order_type: orderType,
    order_status: orderStatus,
    payment_method: paymentMethod,
    items_subtotal: itemsSubtotal,
    discount_amount: discountAmount,
    gst_amount: gstAmount,
    qst_amount: qstAmount,
    tip_amount: tipAmount,
    total_amount: totalAmount,
    tip_type: order.tip_type,
    tip_value: order.tip_value,
    served_by_user_id: order.served_by_user_id,
    receipt_print_mode: order.receipt_print_mode || 'electronic',
    receipt_format: order.receipt_format || 'detailed',
    created_at: createdAt,
    updated_at: updatedAt,
    third_party_platform: order.third_party_platform,
    items,
  };
}

/**
 * Map internal order type to WEB-SRM order type
 */
function mapOrderType(type: string): OrderShape['order_type'] {
  const typeMap: Record<string, OrderShape['order_type']> = {
    dine_in: 'dine_in',
    takeaway: 'takeaway',
    delivery: 'delivery',
    table_service: 'table_service',
  };
  return typeMap[type] || 'dine_in';
}

/**
 * Map internal order status to WEB-SRM order status
 */
function mapOrderStatus(status: string): OrderShape['order_status'] {
  const statusMap: Record<string, OrderShape['order_status']> = {
    pending: 'pending',
    confirmed: 'confirmed',
    preparing: 'preparing',
    completed: 'completed',
    cancelled: 'cancelled',
    refunded: 'refunded',
  };
  return statusMap[status] || 'completed';
}

/**
 * Map internal payment method to WEB-SRM payment method
 */
function mapPaymentMethod(method: string): OrderShape['payment_method'] {
  const methodMap: Record<string, OrderShape['payment_method']> = {
    credit_card: 'credit_card',
    debit_card: 'debit_card',
    cash: 'cash',
    digital_wallet: 'digital_wallet',
    bank_transfer: 'bank_transfer',
  };
  return methodMap[method] || 'credit_card';
}

/**
 * Map internal line items to WEB-SRM line items
 */
function mapLineItems(items: any[]): OrderShape['items'] {
  if (!items || items.length === 0) {
    return [];
  }

  return items.map((item) => ({
    id: item.id || item.item_id || `item-${Date.now()}`,
    menu_item_name: item.menu_item_name || item.name || 'Unknown Item',
    menu_item_price: parseFloat(item.menu_item_price || item.price || 0),
    quantity: parseInt(item.quantity || item.qty || 1, 10),
    item_total: parseFloat(item.item_total || item.total || 0),
    special_instructions: item.special_instructions || item.notes,
  }));
}
