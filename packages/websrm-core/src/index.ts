/**
 * @vizionmenu/websrm-core
 * Pure TypeScript library for Québec WEB-SRM fiscal compliance
 *
 * This package provides type-safe enums, DTOs, and pure utility functions
 * for integrating with Québec's WEB-SRM fiscal registry system.
 *
 * No runtime dependencies - all functions are pure and deterministic.
 *
 * @packageDocumentation
 */

// Enums and constants
export {
  ActionType,
  ServiceType,
  TransactionType,
  PrintMode,
  PrintFormat,
  PaymentMode,
  TaxType,
  ResponseCode,
  Environment,
  TransactionStatus,
  CurrencyCode,
  WEBSRM_CONSTANTS,
  PAYMENT_METHOD_MAP,
  ORDER_TYPE_MAP,
  ORDER_STATUS_MAP,
} from './enums.js';

// Data Transfer Objects (DTOs)
export type {
  CertificationRequest,
  UserRequest,
  LineItemDescription,
  TransactionRequest,
  ClosingReceiptRequest,
  DocumentRequest,
  WebSrmResponse,
  ErrorDetails,
  TransactionRegistrationResponse,
  TransactionCancellationResponse,
  ClosingReceiptResponse,
  TransactionStatusResponse,
  OrderShape,
  WebSrmConfig,
  TransactionQueueItem,
  ReceiptRecord,
} from './dto.js';

// Formatting utilities
export {
  formatAmount,
  toQuebecLocalIso,
  validateAscii,
  sanitizeAscii,
  validateLineItemsCount,
  validateSoftwareVersion,
  calculateGST,
  calculateQST,
  validateAmountsSum,
} from './format.js';

// Digital signature (stub)
export {
  SignatureAlgorithm,
  computeSignaTransm,
  verifySignature,
  generateSharedSecret,
} from './signature.js';
export type { SignatureOptions } from './signature.js';

// HTTP header provider
export {
  buildHeaders,
  buildCertificationRequest,
  generateRequestId,
  validateHeaderOptions,
} from './header-provider.js';
export type { HeaderOptions } from './header-provider.js';

// QR code generator (stub)
export {
  buildReceiptQr,
  validateQrData,
  extractTransactionId,
  formatQrDataForDisplay,
} from './qr.js';
export type { QrCodeOptions } from './qr.js';

// Field mapper (stub)
export {
  mapOrderToReqTrans,
  mapClosingToReqFer,
  validateTransactionRequest,
} from './field-mapper.js';
export type { DailyClosingShape } from './field-mapper.js';
