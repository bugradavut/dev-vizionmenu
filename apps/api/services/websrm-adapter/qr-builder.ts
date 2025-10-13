/**
 * WEB-SRM Official QR Code Builder
 *
 * Builds QR code data for fiscal receipts according to WEB-SRM specification
 *
 * QR code should contain:
 * - Transaction ID (WEB-SRM assigned)
 * - Verification URL or data
 * - Timestamp
 * - Potentially other fields as per spec
 *
 * Format is likely one of:
 * - URL: https://websrm.revenuquebec.ca/verify/{transaction-id}
 * - Structured data: field1|field2|field3|...
 * - JSON: {"id":"...","timestamp":"...","hash":"..."}
 *
 * Phase 4: Skeleton with TODOs
 * Phase 5: Full implementation based on WEB-SRM spec
 */

/**
 * Transaction response from WEB-SRM API
 * This is what we receive after successful transaction registration
 */
export interface TransactionResponse {
  /** Our internal transaction ID */
  idTrans: string;
  /** WEB-SRM assigned transaction ID */
  idTransSrm: string;
  /** QR code data from API (if provided) */
  codeQR?: string;
  /** Receipt verification URL (if provided) */
  urlRecu?: string;
  /** Confirmation timestamp */
  dtConfirmation: string;
  /** Additional metadata */
  [key: string]: any;
}

/**
 * QR code format options
 */
export interface QrCodeOptions {
  /** Base URL for verification portal */
  baseUrl?: string;
  /** Include metadata in QR */
  includeMetadata?: boolean;
  /** Format: url, json, or custom */
  format?: 'url' | 'json' | 'custom';
}

/**
 * Payload for QR code generation (Phase 5.4)
 */
export interface QrPayload {
  /** Transaction ID (internal) */
  idTrans?: string;
  /** Transaction timestamp (ISO 8601 local time) */
  dtTrans?: string;
  /** Total amount in cents */
  montTot?: number;
}

/**
 * Options for QR generation (Phase 5.4)
 */
export interface QrOptions {
  /** Base URL for verification portal (default: 'https://qr.local/verify' for testing) */
  baseUrl?: string;
}

/**
 * Convert Base64 to URL-safe Base64
 *
 * URL-safe Base64 encoding:
 * - Replace '+' with '-'
 * - Replace '/' with '_'
 * - Remove trailing '=' padding
 *
 * This is standard base64url encoding (RFC 4648 Section 5)
 *
 * @param b64 - Standard Base64 string
 * @returns URL-safe Base64 string (no +, /, or =)
 *
 * @example
 * toBase64Url('abc+def/ghi=') // => 'abc-def_ghi'
 */
export function toBase64Url(b64: string): string {
  return b64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Build official WEB-SRM QR code URL (Phase 5.4)
 *
 * Deterministic QR URL generation with fixed parameter order:
 * - no: Transaction ID (idTrans)
 * - dt: Transaction timestamp (dtTrans)
 * - tot: Total amount in cents (montTot)
 * - sig: URL-safe Base64 signature (actuBase64 converted to base64url)
 *
 * Format: {baseUrl}?no={idTrans}&dt={dtTrans}&tot={montTot}&sig={base64url}
 *
 * Rules:
 * - Parameter order is FIXED (no, dt, tot, sig) for determinism
 * - Empty values are included as empty strings (Phase 6 will populate)
 * - Signature is converted to URL-safe Base64 (no +, /, or =)
 * - All values are URL-encoded (but typically ASCII-only)
 *
 * @param payload - Transaction payload (idTrans, dtTrans, montTot)
 * @param actuBase64 - Current transaction signature (88 Base64 chars)
 * @param opts - QR options (baseUrl)
 * @returns QR code URL string (deterministic)
 *
 * @throws {Error} If actuBase64 is not 88 Base64 characters
 *
 * @example
 * const qrUrl = buildOfficialQr(
 *   { idTrans: 'ORD-001', dtTrans: '2025-01-07T14:30:00-05:00', montTot: 3068 },
 *   'AqEFf+8l4d+SId3eofz6...EovtGfReL4cDMYxf/A==', // 88 chars
 *   { baseUrl: 'https://qr.local/verify' }
 * );
 * // => 'https://qr.local/verify?no=ORD-001&dt=2025-01-07T14:30:00-05:00&tot=3068&sig=AqEFf-8l4d-SId3eofz6...EovtGfReL4cDMYxf_A'
 */
export function buildOfficialQr(
  payload: QrPayload,
  actuBase64: string,
  opts?: QrOptions
): string {
  // Validate actuBase64 (must be 88 Base64 characters)
  if (!actuBase64 || typeof actuBase64 !== 'string' || actuBase64.length !== 88) {
    throw new Error('actuBase64 must be exactly 88 Base64 characters');
  }

  // Basic Base64 validation
  if (!/^[A-Za-z0-9+/=]+$/.test(actuBase64)) {
    throw new Error('actuBase64 must be valid Base64');
  }

  // Convert signature to URL-safe Base64
  const sigUrlSafe = toBase64Url(actuBase64);

  // Extract values (use empty string if missing - Phase 6 will populate)
  const no = payload.idTrans || '';
  const dt = payload.dtTrans || '';
  const tot = payload.montTot !== undefined ? String(payload.montTot) : '';

  // Base URL (default to test-only URL)
  const baseUrl = opts?.baseUrl || 'https://qr.local/verify';

  // Build URL with FIXED parameter order (no, dt, tot, sig)
  // URL-encode values for safety
  const params = new URLSearchParams();
  params.append('no', no);
  params.append('dt', dt);
  params.append('tot', tot);
  params.append('sig', sigUrlSafe);

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Build QR code in custom structured format
 *
 * TODO Phase 5: Define custom format if needed
 * Pipe-separated or other deterministic format
 *
 * @param response - Transaction response
 * @returns Structured QR string
 */
export function buildStructuredQr(response: TransactionResponse): string {
  // TODO Phase 5: Implement custom format
  // Example: SRM|{idTransSrm}|{idTrans}|{timestamp}|{checksum}

  const parts = [
    'SRM',
    response.idTransSrm || 'unknown',
    response.idTrans || 'unknown',
    response.dtConfirmation || new Date().toISOString(),
  ];

  return parts.join('|'); // Stub
}

/**
 * Validate QR code data
 *
 * TODO Phase 5: Implement validation
 * - Check data length (QR size limits)
 * - Validate format
 * - Check required fields
 *
 * @param qrData - QR code data string
 * @returns Validation result
 */
export function validateQrData(qrData: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // TODO Phase 5: Add validation rules
  // Example:
  // if (qrData.length === 0) {
  //   errors.push('QR data cannot be empty');
  // }
  // if (qrData.length > 2953) {
  //   errors.push('QR data exceeds maximum length (2953 bytes)');
  // }
  // if (qrData.startsWith('http') && !isValidUrl(qrData)) {
  //   errors.push('Invalid URL format');
  // }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Extract transaction ID from QR data (reverse operation)
 *
 * TODO Phase 5: Implement extraction
 * Useful for receipt verification and lookup
 *
 * @param qrData - QR code data string
 * @returns Extracted transaction ID or null
 */
export function extractTransactionId(qrData: string): string | null {
  // TODO Phase 5: Implement extraction based on format
  // For now, return null (stub)

  // Real implementation will:
  // 1. Detect format (URL, JSON, structured)
  // 2. Parse accordingly
  // 3. Extract idTransSrm or idTrans
  // 4. Return ID or null if not found

  return null; // Stub
}
