/**
 * WEB-SRM Error Mapper - Phase 7
 *
 * Purpose: Map WEB-SRM API responses to standard error codes (SW-73.A compliant)
 * Security: Sanitize error messages (NO PII in logs)
 * Retry Logic: Classify errors as retryable vs non-retryable
 *
 * Error Code Categories:
 * - OK: Successful transaction
 * - TEMP_UNAVAILABLE: Temporary error (retry with backoff)
 * - INVALID_SIGNATURE: Signature verification failed (non-retryable)
 * - INVALID_HEADER: Missing/invalid headers (non-retryable)
 * - DUPLICATE: Idempotency key conflict (non-retryable)
 * - RATE_LIMIT: Too many requests (retryable with backoff)
 * - UNKNOWN: Unexpected error (retryable with caution)
 */

import { WebSrmResponse } from './websrm-client';

export type ErrorCode =
  | 'OK'
  | 'TEMP_UNAVAILABLE'
  | 'INVALID_SIGNATURE'
  | 'INVALID_HEADER'
  | 'DUPLICATE'
  | 'RATE_LIMIT'
  | 'UNKNOWN';

export interface MappedError {
  code: ErrorCode;
  retryable: boolean;
  httpStatus?: number;
  rawCode?: string; // Original WEB-SRM error code
  rawMessage?: string; // Original error message (sanitized)
}

/**
 * Map WEB-SRM response to standard error code
 *
 * @param response - Raw HTTP response from websrm-client
 * @returns Mapped error with retry classification
 *
 * @example
 * const error = mapWebSrmError(response);
 * if (error.code === 'OK') {
 *   // Success - update to completed
 * } else if (error.retryable) {
 *   // Retry with backoff
 * } else {
 *   // Mark as failed (non-retryable)
 * }
 */
export function mapWebSrmError(response: WebSrmResponse): MappedError {
  // Success case
  if (response.success && response.httpStatus >= 200 && response.httpStatus < 300) {
    return {
      code: 'OK',
      retryable: false,
      httpStatus: response.httpStatus,
    };
  }

  // Network/timeout errors (retryable)
  if (response.error?.code === 'TIMEOUT' || response.error?.code === 'NETWORK_ERROR') {
    return {
      code: 'TEMP_UNAVAILABLE',
      retryable: true,
      httpStatus: 0,
      rawCode: response.error.code,
      rawMessage: sanitizeErrorMessage(response.error.message),
    };
  }

  // HTTP status-based mapping
  const httpStatus = response.httpStatus;

  // 409 Conflict - Duplicate transaction (idempotency)
  if (httpStatus === 409) {
    return {
      code: 'DUPLICATE',
      retryable: false,
      httpStatus,
      rawCode: extractRawCode(response),
      rawMessage: sanitizeErrorMessage(extractRawMessage(response)),
    };
  }

  // 429 Too Many Requests - Rate limiting
  if (httpStatus === 429) {
    return {
      code: 'RATE_LIMIT',
      retryable: true,
      httpStatus,
      rawCode: extractRawCode(response),
      rawMessage: sanitizeErrorMessage(extractRawMessage(response)),
    };
  }

  // 4xx Client Errors - Non-retryable (except 429)
  if (httpStatus >= 400 && httpStatus < 500) {
    // Check for signature/header errors
    const rawCode = extractRawCode(response);
    const rawMessage = extractRawMessage(response);

    if (isSignatureError(rawCode, rawMessage)) {
      return {
        code: 'INVALID_SIGNATURE',
        retryable: false,
        httpStatus,
        rawCode,
        rawMessage: sanitizeErrorMessage(rawMessage),
      };
    }

    if (isHeaderError(rawCode, rawMessage)) {
      return {
        code: 'INVALID_HEADER',
        retryable: false,
        httpStatus,
        rawCode,
        rawMessage: sanitizeErrorMessage(rawMessage),
      };
    }

    // Generic 4xx - assume non-retryable
    return {
      code: 'UNKNOWN',
      retryable: false,
      httpStatus,
      rawCode,
      rawMessage: sanitizeErrorMessage(rawMessage),
    };
  }

  // 5xx Server Errors - Retryable
  if (httpStatus >= 500 && httpStatus < 600) {
    return {
      code: 'TEMP_UNAVAILABLE',
      retryable: true,
      httpStatus,
      rawCode: extractRawCode(response),
      rawMessage: sanitizeErrorMessage(extractRawMessage(response)),
    };
  }

  // Unknown error - default to non-retryable unknown
  return {
    code: 'UNKNOWN',
    retryable: false,
    httpStatus,
    rawCode: extractRawCode(response),
    rawMessage: sanitizeErrorMessage(extractRawMessage(response)),
  };
}

/**
 * Extract error code from WEB-SRM response body
 * @param response - HTTP response
 * @returns Error code string or undefined
 */
function extractRawCode(response: WebSrmResponse): string | undefined {
  if (!response.body) return undefined;

  // Try common field names
  if (typeof response.body === 'object') {
    return (
      response.body.code ||
      response.body.errorCode ||
      response.body.cod_retour ||
      response.body.error_code ||
      undefined
    );
  }

  return undefined;
}

/**
 * Extract error message from WEB-SRM response body
 * @param response - HTTP response
 * @returns Error message string or undefined
 */
function extractRawMessage(response: WebSrmResponse): string | undefined {
  if (!response.body) {
    return response.error?.message;
  }

  // Try common field names
  if (typeof response.body === 'object') {
    return (
      response.body.message ||
      response.body.errorMessage ||
      response.body.error ||
      response.body.description ||
      undefined
    );
  }

  // Fallback to raw body string
  if (typeof response.body === 'string') {
    return response.body.substring(0, 200); // Truncate long messages
  }

  return undefined;
}

/**
 * Check if error is signature-related
 * @param code - Error code
 * @param message - Error message
 * @returns true if signature error
 */
function isSignatureError(code?: string, message?: string): boolean {
  if (!code && !message) return false;

  const lowerCode = (code || '').toLowerCase();
  const lowerMessage = (message || '').toLowerCase();

  const signatureKeywords = [
    'signature',
    'signa',
    'sign',
    'verification',
    'verify',
    'invalid_signature',
    'sig_invalid',
  ];

  return signatureKeywords.some(
    (keyword) => lowerCode.includes(keyword) || lowerMessage.includes(keyword)
  );
}

/**
 * Check if error is header-related
 * @param code - Error code
 * @param message - Error message
 * @returns true if header error
 */
function isHeaderError(code?: string, message?: string): boolean {
  if (!code && !message) return false;

  const lowerCode = (code || '').toLowerCase();
  const lowerMessage = (message || '').toLowerCase();

  const headerKeywords = [
    'header',
    'missing',
    'required',
    'invalid_header',
    'header_missing',
    'idapprl',
    'idsev',
    'codcertif',
  ];

  return headerKeywords.some(
    (keyword) => lowerCode.includes(keyword) || lowerMessage.includes(keyword)
  );
}

/**
 * Sanitize error message (remove PII)
 * @param message - Raw error message
 * @returns Sanitized message (max 500 chars, no PII)
 *
 * Phase 9: Added IBAN, SSN, and SIN redaction patterns
 */
function sanitizeErrorMessage(message?: string): string | undefined {
  if (!message) return undefined;

  // Remove potential PII patterns
  let sanitized = message
    // Remove email addresses
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    // Remove phone numbers (basic pattern)
    .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[PHONE]')
    // Remove credit card numbers (basic pattern)
    .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]')
    // Remove UUIDs
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[UUID]')
    // Remove IBAN (Phase 9)
    .replace(/\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b/g, '[IBAN]')
    // Remove SSN (US Social Security Number: 123-45-6789)
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
    // Remove SIN (Canadian Social Insurance Number: 123-456-789 or 123 456 789)
    .replace(/\b\d{3}[-\s]\d{3}[-\s]\d{3}\b/g, '[SIN]');

  // Truncate to 500 chars
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 500) + '...';
  }

  return sanitized;
}

/**
 * Calculate retry backoff delay (exponential backoff)
 *
 * @param retryCount - Number of retries so far
 * @param baseDelaySeconds - Base delay in seconds (default: 60)
 * @param maxDelaySeconds - Max delay in seconds (default: 3600 = 1 hour)
 * @returns Delay in milliseconds
 *
 * @example
 * const delay = calculateBackoff(0); // 60000ms = 1 min
 * const delay = calculateBackoff(1); // 120000ms = 2 min
 * const delay = calculateBackoff(5); // 960000ms = 16 min
 */
export function calculateBackoff(
  retryCount: number,
  baseDelaySeconds: number = 60,
  maxDelaySeconds: number = 3600
): number {
  // Exponential backoff: base * 2^retryCount
  const delaySeconds = Math.min(baseDelaySeconds * Math.pow(2, retryCount), maxDelaySeconds);

  // Add jitter (±10%) to prevent thundering herd
  const jitter = delaySeconds * 0.1 * (Math.random() * 2 - 1);

  return Math.floor((delaySeconds + jitter) * 1000); // Convert to milliseconds
}
