/**
 * WEB-SRM Field Mapper
 * Maps internal order data model to WEB-SRM transaction request format
 *
 * This is a STUB with function signatures and TODO markers.
 * Real implementation will map from actual database schema.
 */

import type { OrderShape, TransactionRequest, LineItemDescription } from './dto.js';
import {
  ActionType,
  ServiceType,
  TransactionType,
  PrintMode,
  PrintFormat,
  PaymentMode,
  ORDER_TYPE_MAP,
  ORDER_STATUS_MAP,
  PAYMENT_METHOD_MAP,
} from './enums.js';
import { formatAmount, toQuebecLocalIso, sanitizeAscii } from './format.js';

/**
 * Map internal order to WEB-SRM transaction request
 * Main entry point for field mapping
 *
 * TODO: Wire in real database schema mapping
 * - Update OrderShape interface to match actual DB columns
 * - Handle edge cases (null values, missing fields)
 * - Add validation for required fields
 * - Handle multi-currency (currently assumes CAD)
 * - Map additional fields (customer ref, employee ref, etc.)
 *
 * @param order - Internal order object
 * @param signature - Digital signature (computed separately)
 * @returns WEB-SRM transaction request payload
 * @throws Error if required fields are missing or invalid
 *
 * @example
 * const order = {
 *   id: "order-123",
 *   order_type: "dine_in",
 *   order_status: "completed",
 *   payment_method: "credit_card",
 *   items_subtotal: 10.00,
 *   gst_amount: 0.50,
 *   qst_amount: 1.00,
 *   total_amount: 11.50,
 *   created_at: "2025-01-06T14:30:00.000Z",
 *   items: [{ menu_item_name: "Pizza", menu_item_price: 10.00, quantity: 1, item_total: 10.00 }]
 * };
 * const request = mapOrderToReqTrans(order, "signature-abc123");
 * // => { idTrans: "order-123", acti: "ENR", typServ: "REST", ... }
 */
export function mapOrderToReqTrans(
  order: OrderShape,
  signature: string
): TransactionRequest {
  // Validate required fields
  if (!order || !order.id) {
    throw new Error('Order is required and must have an ID');
  }

  if (!signature || typeof signature !== 'string') {
    throw new Error('Signature is required');
  }

  // TODO: Add more validation
  // - Check that order has items
  // - Validate amounts are non-negative
  // - Ensure timestamps are valid

  // Map action type from order status
  const acti = mapOrderStatusToAction(order.order_status);

  // Map service type from order type
  const typServ = mapOrderTypeToServiceType(order.order_type);

  // Map transaction type (sale vs refund)
  const typTrans = order.order_status === 'refunded'
    ? TransactionType.REFUND
    : TransactionType.SALE;

  // Map print mode (default: electronic)
  const modImpr = mapReceiptPrintMode(order.receipt_print_mode);

  // Map print format (default: detailed)
  const formImpr = mapReceiptFormat(order.receipt_format);

  // Map payment mode
  const modPai = mapPaymentMethod(order.payment_method);

  // Convert amounts to cents (integer, no decimals)
  const montST = formatAmount(order.items_subtotal);
  const montTPS = formatAmount(order.gst_amount);
  const montTVQ = formatAmount(order.qst_amount);
  const montTot = formatAmount(order.total_amount);

  // Optional: Tip percentage (only if tip_type is 'percentage')
  const pourcent = order.tip_type === 'percentage' && order.tip_value
    ? Math.round(order.tip_value * 100) // Convert 0.15 → 15
    : undefined;

  // Optional: Discount amount
  const montRab = order.discount_amount
    ? formatAmount(order.discount_amount)
    : undefined;

  // Convert UTC timestamp to Québec local time
  const dtTrans = toQuebecLocalIso(order.created_at);

  // Optional references
  const refTrans = order.id.substring(0, 8).toUpperCase(); // Short order number
  const refEmpl = order.served_by_user_id || undefined;
  const refCli = order.customer_phone || undefined;

  // E-commerce flag (online orders)
  const eCommerce = isEcommerceOrder(order);

  // Map line items
  const desc = mapLineItems(order.items);

  // Build transaction request
  return {
    idTrans: order.id,
    acti,
    typServ,
    typTrans,
    modImpr,
    formImpr,
    modPai,
    montST,
    montTPS,
    montTVQ,
    montTot,
    pourcent,
    montRab,
    dtTrans,
    refTrans,
    refEmpl,
    refCli,
    eCommerce,
    desc,
    signature,
  };
}

/**
 * Map order status to WEB-SRM action type
 * TODO: Handle all order statuses in your system
 */
function mapOrderStatusToAction(orderStatus: string): ActionType {
  const mapped = ORDER_STATUS_MAP[orderStatus];
  if (!mapped) {
    // Default to REGISTER for unknown statuses
    console.warn(`Unknown order status: ${orderStatus}, defaulting to REGISTER`);
    return ActionType.REGISTER;
  }
  return mapped;
}

/**
 * Map order type to WEB-SRM service type
 */
function mapOrderTypeToServiceType(orderType: string): ServiceType {
  const mapped = ORDER_TYPE_MAP[orderType];
  if (!mapped) {
    console.warn(`Unknown order type: ${orderType}, defaulting to RESTAURANT`);
    return ServiceType.RESTAURANT;
  }
  return mapped;
}

/**
 * Map payment method to WEB-SRM payment mode
 */
function mapPaymentMethod(paymentMethod: string): PaymentMode {
  const mapped = PAYMENT_METHOD_MAP[paymentMethod];
  if (!mapped) {
    console.warn(`Unknown payment method: ${paymentMethod}, defaulting to CARD`);
    return PaymentMode.CARD;
  }
  return mapped;
}

/**
 * Map receipt print mode
 */
function mapReceiptPrintMode(receiptPrintMode?: string): PrintMode {
  const map: Record<string, PrintMode> = {
    electronic: PrintMode.ELECTRONIC,
    paper: PrintMode.PAPER,
    none: PrintMode.NONE,
  };
  return map[receiptPrintMode || 'electronic'] || PrintMode.ELECTRONIC;
}

/**
 * Map receipt format
 */
function mapReceiptFormat(receiptFormat?: string): PrintFormat {
  const map: Record<string, PrintFormat> = {
    summary: PrintFormat.SUMMARY,
    detailed: PrintFormat.DETAILED,
  };
  return map[receiptFormat || 'detailed'] || PrintFormat.DETAILED;
}

/**
 * Determine if order is e-commerce (online)
 */
function isEcommerceOrder(order: OrderShape): boolean {
  // E-commerce: web, mobile, qr_code orders
  // Not e-commerce: phone, admin, third-party platforms (uber_eats, doordash)
  const ecommerceSourcesRegex = /^(web|mobile|qr_code)$/i;

  // Check third_party_platform first
  if (order.third_party_platform) {
    return ecommerceSourcesRegex.test(order.third_party_platform);
  }

  // For internal orders without third_party_platform, assume e-commerce
  return true;
}

/**
 * Map order items to WEB-SRM line item descriptions
 * TODO: Handle item variations/modifiers if needed
 */
function mapLineItems(items: OrderShape['items']): LineItemDescription[] {
  if (!items || items.length === 0) {
    throw new Error('Order must have at least one item');
  }

  return items.map((item) => ({
    desc: sanitizeAscii(item.menu_item_name, 255), // ASCII-only, max 255 chars
    montLig: formatAmount(item.item_total),
    qte: item.quantity,
    prixUnit: formatAmount(item.menu_item_price),
  }));
}

/**
 * Validate mapped transaction request
 * Checks that all required fields are present and valid
 *
 * TODO: Add comprehensive validation
 * - Check amount totals match (montST + montTPS + montTVQ = montTot)
 * - Validate line items sum to subtotal
 * - Check date format
 * - Validate field lengths
 *
 * @param request - Transaction request to validate
 * @returns Validation result
 */
export function validateTransactionRequest(request: TransactionRequest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  if (!request.idTrans) errors.push('idTrans is required');
  if (!request.acti) errors.push('acti is required');
  if (!request.typServ) errors.push('typServ is required');
  if (!request.typTrans) errors.push('typTrans is required');
  if (!request.modPai) errors.push('modPai is required');
  if (!request.dtTrans) errors.push('dtTrans is required');
  if (!request.signature) errors.push('signature is required');

  // Amount validation
  if (!Number.isInteger(request.montST) || request.montST < 0) {
    errors.push('montST must be a non-negative integer');
  }
  if (!Number.isInteger(request.montTPS) || request.montTPS < 0) {
    errors.push('montTPS must be a non-negative integer');
  }
  if (!Number.isInteger(request.montTVQ) || request.montTVQ < 0) {
    errors.push('montTVQ must be a non-negative integer');
  }
  if (!Number.isInteger(request.montTot) || request.montTot < 0) {
    errors.push('montTot must be a non-negative integer');
  }

  // Line items validation
  if (!request.desc || request.desc.length === 0) {
    errors.push('desc array must have at least one item');
  }

  // TODO: Add more validation
  // - Verify montST + montTPS + montTVQ = montTot (within rounding tolerance)
  // - Check line items sum to montST
  // - Validate date format

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Daily Closing Shape (for FER transactions)
 * SW-78 FO-115: Daily closing receipts
 */
export interface DailyClosingShape {
  id: string;
  branch_id: string;
  closing_date: string; // YYYY-MM-DD
  total_sales: number; // Dollars
  total_refunds: number; // Dollars
  net_sales: number; // Dollars
  gst_collected: number; // Dollars
  qst_collected: number; // Dollars
  transaction_count: number;
  terminal_total: number; // Dollars - Terminal/kasada ödeme
  online_total: number; // Dollars - Online ödeme
  created_by?: string; // User ID
}

/**
 * Map daily closing to WEB-SRM FER (Fermeture) request
 * SW-78 FO-115: Daily closing receipts
 *
 * @param closing - Daily closing record
 * @param signature - Digital signature (computed separately)
 * @returns WEB-SRM closing receipt request payload
 * @throws Error if required fields are missing or invalid
 *
 * @example
 * const closing = {
 *   id: "closing-123",
 *   branch_id: "branch-456",
 *   closing_date: "2025-01-11",
 *   total_sales: 1250.00,
 *   total_refunds: 50.00,
 *   net_sales: 1200.00,
 *   gst_collected: 60.00,
 *   qst_collected: 119.70,
 *   transaction_count: 45,
 *   terminal_total: 300.00, // Kasada ödeme
 *   online_total: 900.00,   // Online ödeme
 *   created_by: "user-789"
 * };
 * const request = mapClosingToReqFer(closing, "signature-abc123");
 * // => { idFer: "closing-123", acti: "FER", dtFer: "2025-01-11", ... }
 */
export function mapClosingToReqFer(
  closing: DailyClosingShape,
  signature: string
): import('./dto.js').ClosingReceiptRequest {
  // Validate required fields
  if (!closing || !closing.id) {
    throw new Error('Daily closing is required and must have an ID');
  }

  if (!signature || typeof signature !== 'string') {
    throw new Error('Signature is required');
  }

  if (!closing.closing_date || !/^\d{4}-\d{2}-\d{2}$/.test(closing.closing_date)) {
    throw new Error('Valid closing_date is required (YYYY-MM-DD format)');
  }

  // Convert amounts to cents (integer, no decimals)
  const montVente = formatAmount(closing.total_sales);
  const montRembours = formatAmount(closing.total_refunds);
  const montNet = formatAmount(closing.net_sales);
  const montTPS = formatAmount(closing.gst_collected);
  const montTVQ = formatAmount(closing.qst_collected);
  // Map terminal_total → montComptant (cash), online_total → montCarte (card)
  // Note: We track terminal vs online, but WEB-SRM expects cash vs card breakdown
  const montComptant = formatAmount(closing.terminal_total);
  const montCarte = formatAmount(closing.online_total);

  // Build closing receipt request
  return {
    idFer: closing.id,
    acti: ActionType.CLOSING,
    dtFer: closing.closing_date,
    montVente,
    montRembours,
    montNet,
    montTPS,
    montTVQ,
    nbTrans: closing.transaction_count,
    montComptant,
    montCarte,
    refSucc: closing.branch_id,
    refEmpl: closing.created_by,
    signature,
  };
}
