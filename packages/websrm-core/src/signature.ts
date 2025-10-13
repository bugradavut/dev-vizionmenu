/**
 * WEB-SRM Digital Signature
 * HMAC-SHA256 or ECDSA signature generation for transaction integrity
 *
 * This is a STUB implementation with TODO markers.
 * The actual cryptographic implementation will be wired later.
 */

import type { TransactionRequest } from './dto.js';

/**
 * Signature Algorithm
 */
export enum SignatureAlgorithm {
  /** HMAC-SHA256 with shared secret */
  HMAC_SHA256 = 'HMAC-SHA256',
  /** ECDSA with private key (for future use) */
  ECDSA = 'ECDSA',
}

/**
 * Signature Options
 */
export interface SignatureOptions {
  /** Signature algorithm to use */
  algorithm: SignatureAlgorithm;
  /** Shared secret for HMAC (base64 or hex encoded) */
  secret?: string;
  /** Private key for ECDSA (PEM format, for future use) */
  privateKey?: string;
}

/**
 * Compute digital signature for a transaction
 * This ensures transaction integrity and authenticity with WEB-SRM API
 *
 * TODO: Wire in real cryptographic implementation
 * - For HMAC-SHA256: Use Node.js crypto.createHmac() or Web Crypto API
 * - For ECDSA: Use elliptic library or Web Crypto API
 * - Ensure proper key management and security practices
 *
 * @param payload - Transaction request payload (without signature field)
 * @param options - Signature configuration
 * @returns Hex-encoded signature string
 *
 * @example
 * const payload = { idTrans: "123", acti: "ENR", ... };
 * const signature = computeSignaTransm(payload, {
 *   algorithm: SignatureAlgorithm.HMAC_SHA256,
 *   secret: "base64-encoded-secret"
 * });
 * // => "a1b2c3d4e5f6..." (hex string)
 */
export function computeSignaTransm(
  payload: Omit<TransactionRequest, 'signature'>,
  options: SignatureOptions
): string {
  // Validate inputs
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid payload: must be a non-null object');
  }

  if (!options || !options.algorithm) {
    throw new Error('Invalid options: algorithm is required');
  }

  if (options.algorithm === SignatureAlgorithm.HMAC_SHA256 && !options.secret) {
    throw new Error('HMAC-SHA256 requires a secret');
  }

  if (options.algorithm === SignatureAlgorithm.ECDSA && !options.privateKey) {
    throw new Error('ECDSA requires a privateKey');
  }

  // TODO: Implement actual signature computation
  // For HMAC-SHA256:
  // const crypto = require('crypto');
  // const hmac = crypto.createHmac('sha256', Buffer.from(options.secret, 'base64'));
  // const canonical = canonicalizePayload(payload);
  // hmac.update(canonical);
  // return hmac.digest('hex');

  // For ECDSA:
  // const EC = require('elliptic').ec;
  // const ec = new EC('secp256k1');
  // const key = ec.keyFromPrivate(options.privateKey, 'hex');
  // const canonical = canonicalizePayload(payload);
  // const msgHash = crypto.createHash('sha256').update(canonical).digest();
  // const signature = key.sign(msgHash);
  // return signature.toDER('hex');

  // STUB: Return a deterministic fake signature for testing
  const canonical = canonicalizePayload(payload);
  const fakeSignature = `STUB_${options.algorithm}_${canonical.length}`;

  console.warn('⚠️  WARNING: Using STUB signature implementation. Do not use in production!');

  return fakeSignature;
}

/**
 * Canonicalize payload for signing
 * Converts payload to a deterministic string representation
 * This ensures that the same payload always produces the same signature
 *
 * TODO: Define canonical format based on WEB-SRM spec
 * - Sort keys alphabetically
 * - Use consistent JSON formatting (no whitespace)
 * - Handle null/undefined values consistently
 *
 * @param payload - Transaction payload
 * @returns Canonical string representation
 */
function canonicalizePayload(payload: Omit<TransactionRequest, 'signature'>): string {
  // TODO: Implement proper canonicalization
  // For now, use simple JSON.stringify with sorted keys

  // Sort object keys recursively
  const sortKeys = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(sortKeys);
    }
    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj)
        .sort()
        .reduce((result: any, key) => {
          result[key] = sortKeys(obj[key]);
          return result;
        }, {});
    }
    return obj;
  };

  const sorted = sortKeys(payload);
  return JSON.stringify(sorted);
}

/**
 * Verify a signature against a payload
 * Used to validate signatures from WEB-SRM API responses
 *
 * TODO: Implement signature verification
 *
 * @param payload - Transaction payload
 * @param signature - Signature to verify
 * @param options - Signature configuration
 * @returns true if signature is valid, false otherwise
 */
export function verifySignature(
  payload: Omit<TransactionRequest, 'signature'>,
  signature: string,
  options: SignatureOptions
): boolean {
  // TODO: Implement actual verification
  // For HMAC-SHA256: compute signature and compare
  // For ECDSA: use public key to verify

  // STUB: Simple comparison for testing
  const expectedSignature = computeSignaTransm(payload, options);
  return signature === expectedSignature;
}

/**
 * Generate a random shared secret for HMAC
 * Used during setup/onboarding
 *
 * TODO: Implement secure random generation
 *
 * @param length - Secret length in bytes (default: 32)
 * @returns Base64-encoded secret
 */
export function generateSharedSecret(length: number = 32): string {
  // TODO: Use crypto.randomBytes() or Web Crypto API
  // const crypto = require('crypto');
  // return crypto.randomBytes(length).toString('base64');

  // STUB: Return a fake secret
  console.warn('⚠️  WARNING: Using STUB secret generation. Do not use in production!');
  return `STUB_SECRET_${length}_BYTES`;
}
