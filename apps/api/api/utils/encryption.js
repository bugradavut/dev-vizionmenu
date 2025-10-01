// =====================================================
// ENCRYPTION UTILITIES
// AES-256-GCM encryption for sensitive data (OAuth tokens, API keys, etc.)
// =====================================================

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment variable
 * Must be 32 bytes (64 hex characters)
 */
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  // Convert hex string to buffer
  const keyBuffer = Buffer.from(key, 'hex');

  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes)`);
  }

  return keyBuffer;
}

/**
 * Generate a new encryption key
 * Run this once and store in environment variable
 * @returns {string} 64-character hex string
 */
function generateEncryptionKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Encrypt a string value
 * @param {string} plaintext - Value to encrypt
 * @returns {object} - {iv, encryptedData, authTag} all as hex strings
 */
function encrypt(plaintext) {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty value');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    authTag: authTag.toString('hex')
  };
}

/**
 * Decrypt an encrypted value
 * @param {object} encrypted - {iv, encryptedData, authTag} as hex strings
 * @returns {string} - Decrypted plaintext
 */
function decrypt(encrypted) {
  if (!encrypted || !encrypted.iv || !encrypted.encryptedData || !encrypted.authTag) {
    throw new Error('Invalid encrypted data format');
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(encrypted.iv, 'hex');
  const authTag = Buffer.from(encrypted.authTag, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted.encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Encrypt and serialize to JSON string
 * Useful for database storage
 * @param {string} plaintext - Value to encrypt
 * @returns {string} - JSON string of encrypted data
 */
function encryptToString(plaintext) {
  const encrypted = encrypt(plaintext);
  return JSON.stringify(encrypted);
}

/**
 * Decrypt from JSON string
 * @param {string} encryptedString - JSON string of encrypted data
 * @returns {string} - Decrypted plaintext
 */
function decryptFromString(encryptedString) {
  const encrypted = JSON.parse(encryptedString);
  return decrypt(encrypted);
}

module.exports = {
  encrypt,
  decrypt,
  encryptToString,
  decryptFromString,
  generateEncryptionKey
};
