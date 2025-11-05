/**
 * WEB-SRM Enums and Constants
 * Based on Québec WEB-SRM Specification (SW-73, SW-77, SW-78, SW-79)
 *
 * These enums define the allowed values for various WEB-SRM API fields.
 * All values must match exactly what the WEB-SRM API expects.
 */

/**
 * Action Type (acti)
 * Defines the type of operation being performed on a transaction
 */
export enum ActionType {
  /** ENR - Register a new transaction (Enregistrement) */
  REGISTER = 'ENR',
  /** ANN - Cancel an existing transaction (Annulation) */
  CANCEL = 'ANN',
  /** MOD - Modify an existing transaction (Modification) */
  MODIFY = 'MOD',
  /** FER - Daily closing receipt (Fermeture) - SW-78 FO-115 */
  CLOSING = 'FER',
}

/**
 * Service Type (typServ)
 * Defines the type of service being provided
 */
export enum ServiceType {
  /** REST - Restaurant service (dine-in, takeaway) */
  RESTAURANT = 'REST',
  /** LIV - Delivery service (Livraison) */
  DELIVERY = 'LIV',
}

/**
 * Transaction Type (typTrans)
 * Defines whether this is a sale or refund
 */
export enum TransactionType {
  /** VEN - Sale transaction (Vente) */
  SALE = 'VEN',
  /** REM - Refund transaction (Remboursement) */
  REFUND = 'REM',
}

/**
 * Print Mode (modImpr)
 * Defines how the receipt is delivered to the customer
 */
export enum PrintMode {
  /** ELE - Electronic receipt (email, SMS, app display) */
  ELECTRONIC = 'ELE',
  /** PAP - Paper receipt (printed) */
  PAPER = 'PAP',
  /** AUC - No receipt (Aucun) */
  NONE = 'AUC',
}

/**
 * Print Format (formImpr)
 * Defines the level of detail in the receipt
 */
export enum PrintFormat {
  /** SUM - Summary receipt (Sommaire) */
  SUMMARY = 'SUM',
  /** DET - Detailed receipt (Détaillé) */
  DETAILED = 'DET',
}

/**
 * Payment Mode (modPai)
 * Defines the payment method used for the transaction
 */
export enum PaymentMode {
  /** CARTE - Credit/debit card payment */
  CARD = 'CARTE',
  /** COMPTANT - Cash payment */
  CASH = 'COMPTANT',
  /** DEBIT - Debit card (Interac) */
  DEBIT = 'DEBIT',
  /** CHEQUE - Check payment */
  CHECK = 'CHEQUE',
  /** ELECTRONIQUE - Other electronic payment (digital wallet, etc.) */
  ELECTRONIC = 'ELECTRONIQUE',
}

/**
 * Tax Type (tax)
 * Defines the tax jurisdiction
 */
export enum TaxType {
  /** FED - Federal tax (GST/TPS) */
  FEDERAL = 'FED',
  /** PROV - Provincial tax (QST/TVQ) */
  PROVINCIAL = 'PROV',
}

/**
 * WEB-SRM Response Codes (codRetour)
 * Common response codes from the WEB-SRM API
 */
export enum ResponseCode {
  /** 00 - Success */
  SUCCESS = '00',
  /** 99 - General error */
  ERROR = '99',
  /** 01 - Invalid signature */
  INVALID_SIGNATURE = '01',
  /** 02 - Missing required fields */
  MISSING_FIELDS = '02',
  /** 03 - Invalid field format */
  INVALID_FORMAT = '03',
  /** 04 - Duplicate transaction */
  DUPLICATE = '04',
  /** 05 - Transaction not found */
  NOT_FOUND = '05',
  /** JW00B - Invalid certification code */
  INVALID_CERTIFICATION = 'JW00B',
  /** JW00C - Device not registered */
  DEVICE_NOT_REGISTERED = 'JW00C',
  /** JW00D - Certificate expired */
  CERTIFICATE_EXPIRED = 'JW00D',
  /** TIMEOUT - Request timeout */
  TIMEOUT = 'TIMEOUT',
}

/**
 * WEB-SRM API Endpoints
 * Environment-specific base URLs
 */
export enum Environment {
  /** DEV - Development/Testing environment */
  DEV = 'dev',
  /** ESSAI - Pre-production testing environment */
  ESSAI = 'essai',
  /** PROD - Production environment */
  PROD = 'prod',
}

/**
 * Transaction Status (internal tracking)
 * Used to track the status of transactions in the queue
 */
export enum TransactionStatus {
  /** Transaction is pending submission to WEB-SRM */
  PENDING = 'pending',
  /** Transaction is currently being sent */
  SENDING = 'sending',
  /** Transaction was successfully sent and acknowledged */
  SENT = 'sent',
  /** Transaction failed (will be retried) */
  FAILED = 'failed',
  /** Transaction permanently failed (max retries exceeded) */
  FAILED_PERMANENT = 'failed_permanent',
}

/**
 * Currency Code
 * Currently only CAD is supported for Québec WEB-SRM
 */
export enum CurrencyCode {
  /** CAD - Canadian Dollar */
  CAD = 'CAD',
}

/**
 * Constants for WEB-SRM compliance
 */
export const WEBSRM_CONSTANTS = {
  /** Maximum length for text fields (ASCII only) */
  MAX_TEXT_LENGTH: 255,
  /** Maximum number of line items per transaction */
  MAX_LINE_ITEMS: 1000,
  /** GST rate for Canada (5%) */
  GST_RATE: 0.05,
  /** QST rate for Québec (9.975%) */
  QST_RATE: 0.09975,
  /** Maximum retry attempts for failed transactions */
  MAX_RETRY_ATTEMPTS: 5,
  /** Retry delay in milliseconds (exponential backoff base) */
  RETRY_DELAY_MS: 1000,
  /** Request timeout in milliseconds */
  REQUEST_TIMEOUT_MS: 10000,
  /** Québec timezone */
  QUEBEC_TIMEZONE: 'America/Toronto',
  /** Software version format (semver) */
  VERSION_REGEX: /^\d+\.\d+\.\d+$/,
} as const;

/**
 * Type-safe mapping from internal payment methods to WEB-SRM PaymentMode
 */
export const PAYMENT_METHOD_MAP: Record<string, PaymentMode> = {
  credit_card: PaymentMode.CARD,
  debit_card: PaymentMode.DEBIT,
  cash: PaymentMode.CASH,
  check: PaymentMode.CHECK,
  digital_wallet: PaymentMode.ELECTRONIC,
  bank_transfer: PaymentMode.ELECTRONIC,
} as const;

/**
 * Type-safe mapping from internal order types to WEB-SRM ServiceType
 */
export const ORDER_TYPE_MAP: Record<string, ServiceType> = {
  dine_in: ServiceType.RESTAURANT,
  takeaway: ServiceType.RESTAURANT,
  table_service: ServiceType.RESTAURANT,
  delivery: ServiceType.DELIVERY,
} as const;

/**
 * Type-safe mapping from internal order status to WEB-SRM ActionType
 */
export const ORDER_STATUS_MAP: Record<string, ActionType> = {
  completed: ActionType.REGISTER,
  cancelled: ActionType.CANCEL,
  refunded: ActionType.CANCEL,
} as const;
