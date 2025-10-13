/**
 * WEB-SRM QR Code Generator
 * Builds receipt QR code data for fiscal compliance
 *
 * This is a STUB implementation with dummy/deterministic content.
 * Real QR code format will be defined by WEB-SRM API response.
 */

import type { TransactionRegistrationResponse } from './dto.js';

/**
 * QR Code Format Options
 */
export interface QrCodeOptions {
  /** Format type (URL, JSON, custom) */
  format: 'url' | 'json' | 'custom';
  /** Optional: Base URL for receipt verification */
  baseUrl?: string;
  /** Optional: Include additional metadata */
  includeMetadata?: boolean;
}

/**
 * Build receipt QR code data from WEB-SRM response
 * The QR code links the receipt to the fiscal registry
 *
 * TODO: Wire in real QR code format from WEB-SRM spec
 * - Extract codeQR field from API response
 * - Format according to Revenu Québec requirements
 * - May need to encode additional fields (merchant ID, device ID, etc.)
 *
 * @param response - WEB-SRM transaction registration response
 * @param options - QR code formatting options
 * @returns QR code data string (to be rendered as QR image)
 *
 * @example
 * const response = {
 *   idTrans: "order-123",
 *   idTransSrm: "srm-456",
 *   codeQR: "https://websrm.revenuquebec.ca/verify/abc123",
 *   dtConfirmation: "2025-01-06T14:30:00-05:00"
 * };
 * const qrData = buildReceiptQr(response, { format: 'url' });
 * // => "https://websrm.revenuquebec.ca/verify/abc123"
 */
export function buildReceiptQr(
  response: TransactionRegistrationResponse,
  options: QrCodeOptions = { format: 'url' }
): string {
  if (!response || !response.idTrans) {
    throw new Error('Invalid WEB-SRM response: missing idTrans');
  }

  // TODO: Extract real QR code data from response.codeQR
  // The WEB-SRM API should return the QR code content in response.codeQR
  // This could be:
  // - A URL: "https://websrm.revenuquebec.ca/verify/abc123"
  // - A JSON string: '{"id":"abc123","merchant":"xyz",...}'
  // - A custom format: "SRM|abc123|xyz|..."

  // STUB: Generate deterministic dummy content based on transaction ID
  const { idTrans, idTransSrm, codeQR, dtConfirmation } = response;

  switch (options.format) {
    case 'url':
      // Format: URL to WEB-SRM verification portal
      if (codeQR && codeQR.startsWith('http')) {
        return codeQR; // Use API-provided URL if available
      }
      // Fallback: construct URL from transaction IDs
      const baseUrl = options.baseUrl || 'https://websrm.revenuquebec.ca/verify';
      return `${baseUrl}/${idTransSrm || idTrans}`;

    case 'json':
      // Format: JSON object with transaction details
      return JSON.stringify({
        type: 'websrm-receipt',
        version: '1.0',
        transactionId: idTrans,
        srmId: idTransSrm,
        timestamp: dtConfirmation,
        ...(options.includeMetadata && {
          metadata: {
            source: 'vizionmenu',
            format: 'json',
          },
        }),
      });

    case 'custom':
      // Format: Pipe-separated custom format
      // Example: "SRM|order-123|srm-456|2025-01-06T14:30:00-05:00"
      return `SRM|${idTrans}|${idTransSrm}|${dtConfirmation}`;

    default:
      throw new Error(`Unsupported QR code format: ${options.format}`);
  }
}

/**
 * Validate QR code data
 * Checks that the QR code data is valid and within size limits
 *
 * @param qrData - QR code data string
 * @param maxLength - Maximum allowed length (default: 2048)
 * @returns true if valid, false otherwise
 *
 * @example
 * validateQrData("https://websrm.revenuquebec.ca/verify/abc123") // => true
 * validateQrData("") // => false
 * validateQrData("x".repeat(3000)) // => false (too long)
 */
export function validateQrData(qrData: string, maxLength: number = 2048): boolean {
  if (typeof qrData !== 'string') {
    return false;
  }

  if (qrData.length === 0) {
    return false;
  }

  if (qrData.length > maxLength) {
    return false;
  }

  return true;
}

/**
 * Extract transaction ID from QR code data
 * Useful for reverse lookup / receipt verification
 *
 * TODO: Implement based on real QR code format
 *
 * @param qrData - QR code data string
 * @returns Transaction ID or null if not found
 *
 * @example
 * extractTransactionId("https://websrm.revenuquebec.ca/verify/abc123") // => "abc123"
 * extractTransactionId('{"transactionId":"order-123",...}') // => "order-123"
 * extractTransactionId("SRM|order-123|srm-456|...") // => "order-123"
 */
export function extractTransactionId(qrData: string): string | null {
  if (!qrData || typeof qrData !== 'string') {
    return null;
  }

  try {
    // Try URL format
    if (qrData.startsWith('http')) {
      const url = new URL(qrData);
      const parts = url.pathname.split('/');
      return parts[parts.length - 1] || null;
    }

    // Try JSON format
    if (qrData.startsWith('{')) {
      const parsed = JSON.parse(qrData);
      return parsed.transactionId || parsed.id || null;
    }

    // Try pipe-separated format
    if (qrData.startsWith('SRM|')) {
      const parts = qrData.split('|');
      return parts[1] || null;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Format QR code data for display (truncate if too long)
 *
 * @param qrData - QR code data string
 * @param maxLength - Maximum display length (default: 50)
 * @returns Truncated string for display
 *
 * @example
 * formatQrDataForDisplay("https://websrm.revenuquebec.ca/verify/abc123", 30)
 * // => "https://websrm.revenuquebc..."
 */
export function formatQrDataForDisplay(qrData: string, maxLength: number = 50): string {
  if (!qrData || typeof qrData !== 'string') {
    return '';
  }

  if (qrData.length <= maxLength) {
    return qrData;
  }

  return qrData.slice(0, maxLength - 3) + '...';
}
