/**
 * WEB-SRM HTTP Header Provider
 * Pure function to build HTTP headers for WEB-SRM API requests
 *
 * No environment dependencies - all values passed as parameters.
 * Runtime ENV binding happens in the integration layer.
 */

import type { CertificationRequest } from './dto.js';
import { validateSoftwareVersion } from './format.js';

/**
 * Header Builder Options
 * All values that would normally come from ENV or config
 */
export interface HeaderOptions {
  /** Certification code from Revenu Québec */
  certificationCode: string;
  /** Device/terminal ID */
  deviceId: string;
  /** Software version (semver: X.Y.Z) */
  softwareVersion: string;
  /** Digital signature (computed separately) */
  signature: string;
  /** Optional: Request ID for tracing */
  requestId?: string;
}

/**
 * Build HTTP headers for WEB-SRM API requests
 * Pure function - no side effects, deterministic output
 *
 * @param options - Header configuration
 * @returns Headers object ready for fetch() or axios
 *
 * @throws Error if required fields are missing or invalid
 *
 * @example
 * const headers = buildHeaders({
 *   certificationCode: "CERT-12345",
 *   deviceId: "POS-001",
 *   softwareVersion: "1.0.0",
 *   signature: "a1b2c3d4...",
 *   requestId: "req-123"
 * });
 * // => {
 * //   "Content-Type": "application/json",
 * //   "Accept": "application/json",
 * //   "Authorization": "Bearer CERT-12345",
 * //   "X-Device-ID": "POS-001",
 * //   "X-Software-Version": "1.0.0",
 * //   "X-Signature": "a1b2c3d4...",
 * //   "X-Request-ID": "req-123"
 * // }
 */
export function buildHeaders(options: HeaderOptions): Record<string, string> {
  // Validate required fields
  if (!options.certificationCode || typeof options.certificationCode !== 'string') {
    throw new Error('certificationCode is required and must be a non-empty string');
  }

  if (!options.deviceId || typeof options.deviceId !== 'string') {
    throw new Error('deviceId is required and must be a non-empty string');
  }

  if (!validateSoftwareVersion(options.softwareVersion)) {
    throw new Error(`Invalid softwareVersion: ${options.softwareVersion}. Must be semver format (X.Y.Z)`);
  }

  if (!options.signature || typeof options.signature !== 'string') {
    throw new Error('signature is required and must be a non-empty string');
  }

  // Build headers object
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${options.certificationCode}`,
    'X-Device-ID': options.deviceId,
    'X-Software-Version': options.softwareVersion,
    'X-Signature': options.signature,
  };

  // Optional: Request ID for tracing
  if (options.requestId) {
    headers['X-Request-ID'] = options.requestId;
  }

  return headers;
}

/**
 * Build certification request payload
 * Used for initial authentication with WEB-SRM API
 *
 * @param certificationCode - Certification code
 * @param deviceId - Device ID
 * @param softwareVersion - Software version
 * @returns Certification request object
 *
 * @example
 * const certReq = buildCertificationRequest("CERT-12345", "POS-001", "1.0.0");
 * // => { certif: "CERT-12345", idDisp: "POS-001", versLog: "1.0.0" }
 */
export function buildCertificationRequest(
  certificationCode: string,
  deviceId: string,
  softwareVersion: string
): CertificationRequest {
  if (!certificationCode || typeof certificationCode !== 'string') {
    throw new Error('certificationCode is required');
  }

  if (!deviceId || typeof deviceId !== 'string') {
    throw new Error('deviceId is required');
  }

  if (!validateSoftwareVersion(softwareVersion)) {
    throw new Error(`Invalid softwareVersion: ${softwareVersion}`);
  }

  return {
    certif: certificationCode,
    idDisp: deviceId,
    versLog: softwareVersion,
  };
}

/**
 * Generate a unique request ID for tracing
 * Uses timestamp + random suffix
 *
 * @returns Request ID string
 *
 * @example
 * generateRequestId() // => "req-1704556800000-a1b2c3"
 */
export function generateRequestId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `req-${timestamp}-${random}`;
}

/**
 * Validate header options
 * Checks that all required fields are present and valid
 *
 * @param options - Header options to validate
 * @returns Validation result with error messages
 *
 * @example
 * const result = validateHeaderOptions({
 *   certificationCode: "",
 *   deviceId: "POS-001",
 *   softwareVersion: "1.0",
 *   signature: "abc"
 * });
 * // => { valid: false, errors: ["certificationCode is empty", "softwareVersion is invalid"] }
 */
export function validateHeaderOptions(options: Partial<HeaderOptions>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!options.certificationCode) {
    errors.push('certificationCode is required');
  }

  if (!options.deviceId) {
    errors.push('deviceId is required');
  }

  if (!options.softwareVersion) {
    errors.push('softwareVersion is required');
  } else if (!validateSoftwareVersion(options.softwareVersion)) {
    errors.push(`softwareVersion must be semver format (X.Y.Z), got: ${options.softwareVersion}`);
  }

  if (!options.signature) {
    errors.push('signature is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
