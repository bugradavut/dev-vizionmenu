/**
 * WEB-SRM Cryptographic Utilities
 *
 * Provides ECDSA P-256 signing and hashing utilities for WEB-SRM API
 *
 * Requirements:
 * - ECDSA P-256 + SHA-256 signing
 * - Canonical JSON serialization (deterministic)
 * - Certificate fingerprint generation
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Canonicalize JSON object to deterministic string
 * - Sorted keys alphabetically
 * - No extra whitespace
 * - Consistent formatting
 */
export function canonicalize(obj: any): string {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalize).join(',') + ']';
  }

  // Sort keys alphabetically
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((key) => {
    const value = canonicalize(obj[key]);
    return `"${key}":${value}`;
  });

  return '{' + pairs.join(',') + '}';
}

/**
 * Compute SHA-256 hash of canonical JSON
 * Returns hex string (lowercase)
 */
export function hash256(payload: any): string {
  const canonical = typeof payload === 'string' ? payload : canonicalize(payload);
  const hash = crypto.createHash('sha256');
  hash.update(canonical, 'utf8');
  return hash.digest('hex');
}

/**
 * Sign hash with ECDSA P-256 using private key
 * Returns DER-encoded signature as base64
 */
export function signP256(hashHex: string, privateKeyPem: string): string {
  // Convert hex hash to buffer
  const hashBuffer = Buffer.from(hashHex, 'hex');

  // Sign with ECDSA P-256
  const sign = crypto.createSign('SHA256');
  sign.update(hashBuffer);
  sign.end();

  const signature = sign.sign({
    key: privateKeyPem,
    dsaEncoding: 'der', // DER encoding
  });

  return signature.toString('base64');
}

/**
 * Extract SHA-256 fingerprint from X.509 certificate
 * Returns hex string without colons (uppercase or lowercase)
 */
export function getCertificateFingerprint(certPem: string, uppercase = false): string {
  // Parse certificate DER from PEM
  const certLines = certPem
    .split('\n')
    .filter((line) => !line.includes('BEGIN CERTIFICATE') && !line.includes('END CERTIFICATE'))
    .join('');

  const certDer = Buffer.from(certLines, 'base64');

  // Compute SHA-256 of DER bytes
  const hash = crypto.createHash('sha256');
  hash.update(certDer);
  const fingerprint = hash.digest('hex');

  return uppercase ? fingerprint.toUpperCase() : fingerprint;
}

/**
 * Load certificate and private key from files
 */
export interface CryptoMaterial {
  privateKey: string;
  certificate: string;
  fingerprint: string;
}

export function loadCryptoMaterial(
  keyPath = path.join('tmp', 'certs', 'dev-client.key.pem'),
  certPath = path.join('tmp', 'certs', 'dev-client.crt.pem')
): CryptoMaterial {
  const privateKey = fs.readFileSync(keyPath, 'utf8');
  const certificate = fs.readFileSync(certPath, 'utf8');
  const fingerprint = getCertificateFingerprint(certificate, false); // lowercase hex

  return { privateKey, certificate, fingerprint };
}

/**
 * Create signature object for WEB-SRM transaction
 *
 * @param transActu - The transaction data to sign
 * @param crypto - Crypto material (key, cert, fingerprint)
 * @param precedentSignature - Previous signature (for updates)
 */
export function createTransactionSignature(
  transActu: any,
  crypto: CryptoMaterial,
  precedentSignature: string | null = null
): {
  empreinteCert: string;
  hash: { actu: string };
  actu: string;
  preced: string | null;
} {
  // 1. Canonicalize transaction data
  const canonical = canonicalize(transActu);

  // 2. Hash canonical JSON
  const hashHex = hash256(canonical);

  // 3. Sign hash with ECDSA P-256
  const signature = signP256(hashHex, crypto.privateKey);

  // 4. Return signature structure
  return {
    empreinteCert: crypto.fingerprint,
    hash: {
      actu: hashHex,
    },
    actu: signature,
    preced: precedentSignature,
  };
}

/**
 * Test cryptographic functions
 */
export function testCrypto() {
  console.log('Testing WEB-SRM Crypto Utilities\n');

  // Test canonicalization
  const obj = { z: 3, a: 1, b: { y: 2, x: 1 } };
  const canonical = canonicalize(obj);
  console.log('Canonical JSON:', canonical);
  console.log('Expected: {"a":1,"b":{"x":1,"y":2},"z":3}\n');

  // Test hash
  const hash = hash256(obj);
  console.log('SHA-256 Hash:', hash);
  console.log('Length:', hash.length, 'chars (64 expected)\n');

  // Load crypto material
  try {
    const crypto = loadCryptoMaterial();
    console.log('Certificate Fingerprint:', crypto.fingerprint);
    console.log('Fingerprint Length:', crypto.fingerprint.length, 'chars (64 expected)\n');

    // Test signature
    const testData = { test: 'data', timestamp: new Date().toISOString() };
    const sig = createTransactionSignature(testData, crypto);
    console.log('Signature Object:');
    console.log('  empreinteCert:', sig.empreinteCert.substring(0, 20) + '...');
    console.log('  hash.actu:', sig.hash.actu.substring(0, 20) + '...');
    console.log('  actu:', sig.actu.substring(0, 40) + '...');
    console.log('  preced:', sig.preced);
  } catch (err: any) {
    console.error('Error loading crypto material:', err.message);
  }
}

// Allow running as standalone test
if (require.main === module) {
  testCrypto();
}
