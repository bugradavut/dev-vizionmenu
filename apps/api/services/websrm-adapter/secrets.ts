/**
 * WEB-SRM Secrets Management
 *
 * Purpose: Encrypt/decrypt sensitive data (PEM keys) for storage
 * Algorithm: AES-256-GCM (authenticated encryption)
 * Security: Encryption key from environment variable
 *
 * CRITICAL SECURITY NOTES:
 * - PEM keys are encrypted at rest (in database)
 * - Decrypted only in memory (never written to disk/log)
 * - Encryption key must be 32 bytes (256 bits)
 * - IV (initialization vector) is random per encryption
 * - Auth tag ensures integrity (detects tampering)
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment
 * @throws Error if key is missing or invalid length
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.WEBSRM_ENCRYPTION_KEY;

  if (!keyHex) {
    throw new Error('[WEB-SRM] WEBSRM_ENCRYPTION_KEY not set in environment');
  }

  const key = Buffer.from(keyHex, 'hex');

  if (key.length !== KEY_LENGTH) {
    throw new Error(`[WEB-SRM] Invalid encryption key length: ${key.length} bytes (expected ${KEY_LENGTH})`);
  }

  return key;
}

/**
 * Encrypt sensitive data (e.g., PEM keys)
 *
 * @param plaintext - Data to encrypt (e.g., private key PEM)
 * @returns Encrypted data in format: iv:authTag:ciphertext (all hex)
 *
 * @example
 * const pemKey = '-----BEGIN PRIVATE KEY-----\nMIGH...\n-----END PRIVATE KEY-----';
 * const encrypted = encryptSecret(pemKey);
 * // Result: "a1b2c3d4....:e5f6g7h8....:i9j0k1l2...."
 */
export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext (all hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext}`;
}

/**
 * Decrypt sensitive data
 *
 * @param encrypted - Encrypted data in format: iv:authTag:ciphertext
 * @returns Decrypted plaintext (e.g., PEM key)
 * @throws Error if decryption fails (wrong key or tampered data)
 *
 * @example
 * const encrypted = "a1b2c3d4....:e5f6g7h8....:i9j0k1l2....";
 * const pemKey = decryptSecret(encrypted);
 * // Result: '-----BEGIN PRIVATE KEY-----\nMIGH...\n-----END PRIVATE KEY-----'
 */
export function decryptSecret(encrypted: string): string {
  const key = getEncryptionKey();
  const parts = encrypted.split(':');

  if (parts.length !== 3) {
    throw new Error('[WEB-SRM] Invalid encrypted data format (expected iv:authTag:ciphertext)');
  }

  const [ivHex, authTagHex, ciphertext] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}

/**
 * Generate a random encryption key (for initial setup)
 * @returns 32-byte key in hex format
 *
 * @example
 * const key = generateEncryptionKey();
 * console.log('WEBSRM_ENCRYPTION_KEY=' + key);
 * // WEBSRM_ENCRYPTION_KEY=a1b2c3d4e5f6...
 */
export function generateEncryptionKey(): string {
  return randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Validate that a secret can be decrypted
 * @param encrypted - Encrypted data to test
 * @returns true if decryptable, false otherwise
 */
export function validateEncryptedSecret(encrypted: string): boolean {
  try {
    decryptSecret(encrypted);
    return true;
  } catch {
    return false;
  }
}
