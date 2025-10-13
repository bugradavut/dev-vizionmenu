/**
 * WEB-SRM ECDSA P-256 Signature (P1363 Format)
 *
 * Québec WEB-SRM requires ECDSA signatures in IEEE P1363 format (R||S, 64 bytes)
 * NOT in ASN.1 DER format (which is Node.js crypto default)
 *
 * This module provides:
 * - DER → P1363 conversion
 * - P-256 signature generation
 * - Certificate fingerprint (SHA-1)
 *
 * Phase 4: Skeleton with TODOs
 * Phase 5: Full implementation
 */

import { createSign, createVerify, createHash } from 'crypto';

/**
 * Convert ASN.1 DER signature to IEEE P1363 format
 *
 * DER format (variable length):
 *   0x30 <total-len> 0x02 <r-len> <r-bytes> 0x02 <s-len> <s-bytes>
 *
 * P1363 format (fixed 64 bytes for P-256):
 *   R (32 bytes, big-endian) || S (32 bytes, big-endian)
 *
 * @param der - ASN.1 DER encoded signature buffer
 * @returns P1363 format signature (64 bytes)
 *
 * @throws Error if DER format is invalid
 *
 * @example
 * const derSig = createSign('sha256').update(data).sign(privateKey);
 * const p1363Sig = derToP1363(derSig);
 * console.log(p1363Sig.length); // 64
 */
export function derToP1363(der: Buffer): Buffer {
  let offset = 0;

  // Verify SEQUENCE tag (0x30)
  if (der[offset++] !== 0x30) {
    throw new Error('DER signature must start with SEQUENCE tag (0x30)');
  }

  // Read sequence length (skip it, we'll parse R and S directly)
  const seqLen = der[offset++];
  if (seqLen & 0x80) {
    // Long form length (not common for ECDSA signatures, but handle it)
    const lenBytes = seqLen & 0x7f;
    offset += lenBytes;
  }

  // Parse R integer
  if (der[offset++] !== 0x02) {
    throw new Error('Expected INTEGER tag (0x02) for R');
  }

  let rLen = der[offset++];
  let rStart = offset;

  // Skip leading zero bytes (used for positive integer encoding)
  while (rLen > 0 && der[rStart] === 0x00) {
    rStart++;
    rLen--;
  }

  const r = der.slice(rStart, rStart + rLen);
  offset = rStart + rLen;

  // Parse S integer
  if (der[offset++] !== 0x02) {
    throw new Error('Expected INTEGER tag (0x02) for S');
  }

  let sLen = der[offset++];
  let sStart = offset;

  // Skip leading zero bytes
  while (sLen > 0 && der[sStart] === 0x00) {
    sStart++;
    sLen--;
  }

  const s = der.slice(sStart, sStart + sLen);

  // Pad R and S to 32 bytes (P-256 field size)
  const rPadded = Buffer.alloc(32);
  const sPadded = Buffer.alloc(32);

  // Copy R to right-aligned position (left-pad with zeros)
  r.copy(rPadded, 32 - r.length);

  // Copy S to right-aligned position (left-pad with zeros)
  s.copy(sPadded, 32 - s.length);

  // Concatenate R || S
  return Buffer.concat([rPadded, sPadded]); // 64 bytes total
}

/**
 * Convert IEEE P1363 format signature to ASN.1 DER format
 *
 * P1363 format (fixed 64 bytes for P-256):
 *   R (32 bytes, big-endian) || S (32 bytes, big-endian)
 *
 * DER format (variable length):
 *   0x30 <total-len> 0x02 <r-len> <r-bytes> 0x02 <s-len> <s-bytes>
 *
 * @param sig64 - P1363 format signature (64 bytes)
 * @returns ASN.1 DER encoded signature buffer
 *
 * @throws Error if P1363 format is invalid (not 64 bytes)
 *
 * @example
 * const p1363Sig = Buffer.from('abc...', 'base64'); // 64 bytes
 * const derSig = p1363ToDer(p1363Sig);
 * // Can now use with crypto.verify()
 */
export function p1363ToDer(sig64: Buffer): Buffer {
  if (sig64.length !== 64) {
    throw new Error(`P1363 signature must be 64 bytes, got ${sig64.length}`);
  }

  // Split into R and S (32 bytes each)
  let r = sig64.slice(0, 32);
  let s = sig64.slice(32, 64);

  // Remove leading zero bytes (minimize integer representation)
  while (r.length > 1 && r[0] === 0x00 && r[1] < 0x80) {
    r = r.slice(1);
  }
  while (s.length > 1 && s[0] === 0x00 && s[1] < 0x80) {
    s = s.slice(1);
  }

  // Add leading 0x00 if MSB is set (to ensure positive integer)
  if (r[0] & 0x80) {
    r = Buffer.concat([Buffer.from([0x00]), r]);
  }
  if (s[0] & 0x80) {
    s = Buffer.concat([Buffer.from([0x00]), s]);
  }

  // Build DER SEQUENCE
  const rDer = Buffer.concat([Buffer.from([0x02, r.length]), r]); // INTEGER R
  const sDer = Buffer.concat([Buffer.from([0x02, s.length]), s]); // INTEGER S

  const seqLen = rDer.length + sDer.length;
  const der = Buffer.concat([
    Buffer.from([0x30, seqLen]), // SEQUENCE
    rDer,
    sDer,
  ]);

  return der;
}

/**
 * Sign a base string using ECDSA P-256 in P1363 format
 *
 * Steps:
 * 1. Create SHA-256 digest of baseString
 * 2. Sign with ECDSA P-256 (produces DER signature)
 * 3. Convert DER → P1363 (64 bytes)
 * 4. Encode as Base64 (88 characters)
 *
 * @param baseString - Canonical string to sign (e.g., HTTP headers concatenated)
 * @param privateKeyPem - ECDSA P-256 private key in PEM format
 * @returns Base64-encoded P1363 signature (88 characters for 64 bytes)
 *
 * @example
 * const privKey = generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey;
 * const privPem = privKey.export({ type: 'pkcs8', format: 'pem' }).toString();
 * const signature = signP256P1363('baseString', privPem);
 * console.log(signature.length); // 88 (Base64 of 64 bytes)
 */
export function signP256P1363(baseString: string, privateKeyPem: string): string {
  // Step 1-2: Sign with SHA-256 + ECDSA (DER format)
  const signer = createSign('sha256');
  signer.update(baseString, 'utf8');
  const derSignature = signer.sign(privateKeyPem); // DER format

  // Step 3: Convert DER → P1363 (64 bytes)
  const p1363Signature = derToP1363(derSignature);

  // Step 4: Encode as Base64
  const base64Signature = p1363Signature.toString('base64');

  // Validation: Should be 88 characters (64 bytes in Base64)
  if (base64Signature.length !== 88) {
    console.warn(
      `[WEBSRM] P1363 signature length mismatch: expected 88, got ${base64Signature.length}`
    );
  }

  return base64Signature;
}

/**
 * Compute SHA-1 fingerprint of X.509 certificate (DER encoding)
 *
 * WEB-SRM header EMPRCERTIFTRANSM requires SHA-1 hash of the certificate
 * in 40-character hexadecimal format (lowercase)
 *
 * @param certPem - X.509 certificate in PEM format
 * @returns SHA-1 fingerprint (40 hex characters, lowercase)
 *
 * @throws Error if certificate PEM format is invalid
 *
 * @example
 * const cert = fs.readFileSync('cert.pem', 'utf8');
 * const fingerprint = fingerprintSha1(cert);
 * console.log(fingerprint); // "a1b2c3d4e5f6..."
 */
export function fingerprintSha1(certPem: string): string {
  // Extract PEM body (remove header, footer, and whitespace)
  const pemHeader = '-----BEGIN CERTIFICATE-----';
  const pemFooter = '-----END CERTIFICATE-----';

  const startIndex = certPem.indexOf(pemHeader);
  const endIndex = certPem.indexOf(pemFooter);

  if (startIndex === -1 || endIndex === -1) {
    throw new Error('Invalid PEM certificate: missing BEGIN/END markers');
  }

  // Extract Base64 body (between markers)
  const base64Body = certPem
    .substring(startIndex + pemHeader.length, endIndex)
    .replace(/\s/g, ''); // Remove all whitespace

  // Decode Base64 to DER bytes
  const derBytes = Buffer.from(base64Body, 'base64');

  // Compute SHA-1 hash
  const hash = createHash('sha1');
  hash.update(derBytes);
  const fingerprint = hash.digest('hex'); // 40 hex characters

  return fingerprint.toLowerCase();
}

/**
 * Verify a P1363 signature
 *
 * Steps:
 * 1. Decode Base64 → P1363 (64 bytes)
 * 2. Convert P1363 → DER
 * 3. Verify with ECDSA P-256
 *
 * @param baseString - Original string that was signed
 * @param p1363SignatureBase64 - Base64-encoded P1363 signature (88 chars)
 * @param publicKeyPem - ECDSA P-256 public key in PEM format
 * @returns true if signature is valid, false otherwise
 *
 * @throws Error if signature format is invalid
 *
 * @example
 * const signature = signP256P1363('data', privateKeyPem);
 * const isValid = verifyP256P1363('data', signature, publicKeyPem);
 * console.log(isValid); // true
 */
export function verifyP256P1363(
  baseString: string,
  p1363SignatureBase64: string,
  publicKeyPem: string
): boolean {
  try {
    // Step 1: Decode Base64 → P1363 (64 bytes)
    const p1363Signature = Buffer.from(p1363SignatureBase64, 'base64');

    if (p1363Signature.length !== 64) {
      throw new Error(`P1363 signature must be 64 bytes, got ${p1363Signature.length}`);
    }

    // Step 2: Convert P1363 → DER
    const derSignature = p1363ToDer(p1363Signature);

    // Step 3: Verify with crypto
    const verifier = createVerify('sha256');
    verifier.update(baseString, 'utf8');
    const isValid = verifier.verify(publicKeyPem, derSignature);

    return isValid;
  } catch (error) {
    // Invalid signature format or verification failure
    return false;
  }
}
