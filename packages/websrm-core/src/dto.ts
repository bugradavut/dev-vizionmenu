/**
 * WEB-SRM Data Transfer Objects (DTOs)
 * Type definitions for WEB-SRM API requests and responses
 * Based on Québec WEB-SRM Specification (SW-73, SW-77, SW-78, SW-79)
 *
 * These are pure TypeScript types with NO business logic.
 * All fields follow the exact naming convention from WEB-SRM API docs.
 */

import {
  ActionType,
  ServiceType,
  TransactionType,
  PrintMode,
  PrintFormat,
  PaymentMode,
  ResponseCode,
  Environment,
} from './enums.js';

/**
 * Certification Request (reqCertif)
 * Used to authenticate with WEB-SRM API
 */
export interface CertificationRequest {
  /** Certification code provided by Revenu Québec */
  certif: string;
  /** Device/terminal ID (alphanumeric) */
  idDisp: string;
  /** Software version (semver: X.Y.Z) */
  versLog: string;
}

/**
 * User Request (reqUtil)
 * Optional user/employee information
 */
export interface UserRequest {
  /** Employee reference ID */
  refEmpl?: string;
  /** Employee name */
  nomEmpl?: string;
}

/**
 * Line Item Description (desc)
 * Individual item in the transaction
 */
export interface LineItemDescription {
  /** Item description (ASCII only, max 255 chars) */
  desc: string;
  /** Line total amount in cents (integer, no decimals) */
  montLig: number;
  /** Quantity (integer) */
  qte: number;
  /** Unit price in cents (integer, no decimals) */
  prixUnit: number;
  /** Optional: Item category/code */
  categorie?: string;
  /** Optional: Tax code for this item */
  codeTaxe?: string;
}

/**
 * Transaction Request (reqTrans)
 * Core transaction data for registration
 */
export interface TransactionRequest {
  /** Transaction unique ID (UUID format) */
  idTrans: string;
  /** Action type (ENR, ANN, MOD) */
  acti: ActionType;
  /** Service type (REST, LIV) */
  typServ: ServiceType;
  /** Transaction type (VEN, REM) */
  typTrans: TransactionType;
  /** Print mode (ELE, PAP, AUC) */
  modImpr: PrintMode;
  /** Print format (SUM, DET) */
  formImpr: PrintFormat;
  /** Payment mode (CARTE, COMPTANT, etc.) */
  modPai: PaymentMode;

  /** Subtotal before tax in cents (integer, no decimals) */
  montST: number;
  /** GST amount in cents (integer, no decimals) */
  montTPS: number;
  /** QST amount in cents (integer, no decimals) */
  montTVQ: number;
  /** Total amount in cents (integer, no decimals) */
  montTot: number;

  /** Optional: Tip percentage (integer, 0-100) */
  pourcent?: number;
  /** Optional: Discount amount in cents (integer) */
  montRab?: number;

  /** Transaction date/time (ISO 8601 local time: YYYY-MM-DDTHH:mm:ss-05:00) */
  dtTrans: string;

  /** Optional: External reference (order number, etc.) */
  refTrans?: string;
  /** Optional: Employee reference */
  refEmpl?: string;
  /** Optional: Customer reference */
  refCli?: string;

  /** E-commerce flag (true for online orders) */
  eCommerce: boolean;

  /** Line items array */
  desc: LineItemDescription[];

  /** Digital signature (HMAC-SHA256 or ECDSA) */
  signature: string;
}

/**
 * Document Request (reqDoc)
 * Used to retrieve or verify a previously registered transaction
 */
export interface DocumentRequest {
  /** Transaction ID to retrieve */
  idTrans: string;
  /** Optional: Include full details (default: false) */
  inclDet?: boolean;
}

/**
 * WEB-SRM API Response
 * Common response structure for all API calls
 */
export interface WebSrmResponse<T = unknown> {
  /** Response code (00 = success, 99 = error, etc.) */
  codRetour: ResponseCode | string;
  /** Human-readable message */
  message?: string;
  /** Response data (varies by endpoint) */
  data?: T;
  /** Error details (present if codRetour !== '00') */
  erreur?: ErrorDetails;
  /** Request timestamp (server time) */
  dtReponse?: string;
}

/**
 * Error Details
 * Detailed error information from WEB-SRM API
 */
export interface ErrorDetails {
  /** Error code (e.g., JW00B, JW00C) */
  code: string;
  /** Error message */
  message: string;
  /** Field name (if error is related to a specific field) */
  champ?: string;
  /** Additional details */
  details?: string;
  /** Is this error retryable? */
  retryable?: boolean;
}

/**
 * Transaction Registration Response
 * Response from POST /api/v1/transactions (SW-77)
 */
export interface TransactionRegistrationResponse {
  /** Transaction ID (echoed from request) */
  idTrans: string;
  /** WEB-SRM internal transaction ID */
  idTransSrm: string;
  /** QR code data (URL or raw data for QR generation) */
  codeQR: string;
  /** Receipt URL (optional) */
  urlRecu?: string;
  /** Confirmation timestamp */
  dtConfirmation: string;
}

/**
 * Transaction Cancellation Response
 * Response from POST /api/v1/transactions/cancel (SW-78)
 */
export interface TransactionCancellationResponse {
  /** Original transaction ID */
  idTrans: string;
  /** Cancellation confirmation timestamp */
  dtAnnulation: string;
  /** Cancellation reason (if provided) */
  raison?: string;
}

/**
 * Transaction Status Response
 * Response from GET /api/v1/transactions/:id
 */
export interface TransactionStatusResponse {
  /** Transaction ID */
  idTrans: string;
  /** Current status */
  statut: 'enregistre' | 'annule' | 'en_attente' | 'erreur';
  /** Registration timestamp (if registered) */
  dtEnregistrement?: string;
  /** Cancellation timestamp (if cancelled) */
  dtAnnulation?: string;
  /** Last update timestamp */
  dtMaj: string;
}

/**
 * Internal Order Shape (for field mapping)
 * This is a simplified representation of the internal order structure.
 * The actual implementation will map from the real database schema.
 *
 * TODO: Update this interface to match the actual order schema when integrating
 */
export interface OrderShape {
  id: string;
  branch_id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  order_type: 'dine_in' | 'takeaway' | 'delivery' | 'table_service';
  order_status: 'pending' | 'confirmed' | 'preparing' | 'completed' | 'cancelled' | 'refunded';
  payment_method: 'credit_card' | 'debit_card' | 'cash' | 'digital_wallet' | 'bank_transfer';

  // Amounts (in dollars, will be converted to cents)
  items_subtotal: number;
  discount_amount: number;
  gst_amount: number;
  qst_amount: number;
  tip_amount: number;
  total_amount: number;

  // Optional fields
  tip_type?: 'percentage' | 'fixed';
  tip_value?: number;
  served_by_user_id?: string;
  receipt_print_mode?: 'electronic' | 'paper' | 'none';
  receipt_format?: 'summary' | 'detailed';

  // Timestamps
  created_at: string; // ISO 8601 UTC
  updated_at: string;

  // Third-party integration
  third_party_platform?: string;

  // Line items
  items: Array<{
    id: string;
    menu_item_name: string;
    menu_item_price: number;
    quantity: number;
    item_total: number;
    special_instructions?: string;
  }>;
}

/**
 * Configuration for WEB-SRM Client
 * Environment-specific settings
 */
export interface WebSrmConfig {
  /** Environment (dev, essai, prod) */
  environment: Environment;
  /** API base URL */
  apiUrl: string;
  /** Certification code */
  certificationCode: string;
  /** Shared secret for signature generation */
  sharedSecret: string;
  /** Device ID */
  deviceId: string;
  /** Software version */
  softwareVersion: string;
  /** Request timeout (ms) */
  timeout: number;
  /** Max retry attempts */
  maxRetries: number;
}

/**
 * Transaction Queue Item
 * For offline queue management
 */
export interface TransactionQueueItem {
  id: string;
  order_id: string;
  payload: TransactionRequest;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'failed_permanent';
  retry_count: number;
  last_error?: string;
  created_at: string;
  sent_at?: string;
  updated_at: string;
}

/**
 * Receipt Record
 * For storing issued receipts
 */
export interface ReceiptRecord {
  id: string;
  order_id: string;
  websrm_transaction_id: string;
  websrm_internal_id?: string;
  qr_code_data: string;
  receipt_url?: string;
  print_mode: PrintMode;
  print_format: PrintFormat;
  emailed_to?: string;
  created_at: string;
}
