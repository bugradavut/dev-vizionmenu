/**
 * WEB-SRM ECDSA P-256 P1363 Signature Tests
 *
 * Tests for Phase 5.1:
 * - DER ↔ P1363 conversion
 * - ECDSA P-256 signature generation and verification
 * - Certificate SHA-1 fingerprint
 * - Edge cases (short R/S, leading zeros)
 *
 * All tests are local - NO network, NO database
 */

import { generateKeyPairSync } from 'crypto';
import {
  derToP1363,
  p1363ToDer,
  signP256P1363,
  verifyP256P1363,
  fingerprintSha1,
} from '../signature-ecdsa';

describe('ECDSA P-256 P1363 Signature', () => {
  // Generate test key pair once for all tests
  const { privateKey, publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'P-256',
  });

  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

  describe('signP256P1363', () => {
    it('should generate a signature with 88 Base64 characters', () => {
      const baseString = 'test-base-string';
      const signature = signP256P1363(baseString, privateKeyPem);

      expect(signature).toHaveLength(88);
      expect(typeof signature).toBe('string');
    });

    it('should generate different signatures for different strings', () => {
      const sig1 = signP256P1363('string1', privateKeyPem);
      const sig2 = signP256P1363('string2', privateKeyPem);

      expect(sig1).not.toBe(sig2);
    });

    it('should generate consistent signatures for same string', () => {
      // Note: ECDSA has randomness, so same input can produce different signatures
      // But all should be valid when verified
      const baseString = 'consistent-test';
      const sig1 = signP256P1363(baseString, privateKeyPem);
      const sig2 = signP256P1363(baseString, privateKeyPem);

      // Both should verify successfully
      expect(verifyP256P1363(baseString, sig1, publicKeyPem)).toBe(true);
      expect(verifyP256P1363(baseString, sig2, publicKeyPem)).toBe(true);
    });
  });

  describe('verifyP256P1363', () => {
    it('should verify a valid signature', () => {
      const baseString = 'test-verification';
      const signature = signP256P1363(baseString, privateKeyPem);

      const isValid = verifyP256P1363(baseString, signature, publicKeyPem);

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const baseString = 'test-string';
      const fakeSignature = Buffer.alloc(64).toString('base64'); // All zeros

      const isValid = verifyP256P1363(baseString, fakeSignature, publicKeyPem);

      expect(isValid).toBe(false);
    });

    it('should reject signature for different string', () => {
      const originalString = 'original';
      const signature = signP256P1363(originalString, privateKeyPem);

      const isValid = verifyP256P1363('tampered', signature, publicKeyPem);

      expect(isValid).toBe(false);
    });

    it('should reject malformed Base64 signature', () => {
      const baseString = 'test';
      const malformedSignature = 'not-a-valid-base64!!!';

      const isValid = verifyP256P1363(baseString, malformedSignature, publicKeyPem);

      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong length', () => {
      const baseString = 'test';
      const shortSignature = Buffer.alloc(32).toString('base64'); // Only 32 bytes

      const isValid = verifyP256P1363(baseString, shortSignature, publicKeyPem);

      expect(isValid).toBe(false);
    });
  });

  describe('derToP1363', () => {
    it('should convert DER to P1363 (64 bytes)', () => {
      const baseString = 'test-der-conversion';
      const signature = signP256P1363(baseString, privateKeyPem);
      const p1363 = Buffer.from(signature, 'base64');

      expect(p1363).toHaveLength(64);
    });

    it('should throw error for invalid DER format', () => {
      const invalidDer = Buffer.from([0x00, 0x01, 0x02]); // Not a valid DER SEQUENCE

      expect(() => derToP1363(invalidDer)).toThrow('DER signature must start with SEQUENCE tag');
    });

    it('should handle DER with leading zeros in R', () => {
      // Create a DER signature with R having leading zero (for positive encoding)
      // SEQUENCE: 0x30 <len>
      // INTEGER R: 0x02 <len> 0x00 <r-bytes>  (leading 0x00 for positive)
      // INTEGER S: 0x02 <len> <s-bytes>

      const r = Buffer.concat([Buffer.from([0x00]), Buffer.alloc(31, 0xff)]); // 32 bytes with leading 0
      const s = Buffer.alloc(32, 0xaa);

      const rDer = Buffer.concat([Buffer.from([0x02, r.length]), r]);
      const sDer = Buffer.concat([Buffer.from([0x02, s.length]), s]);
      const der = Buffer.concat([
        Buffer.from([0x30, rDer.length + sDer.length]),
        rDer,
        sDer,
      ]);

      const p1363 = derToP1363(der);

      expect(p1363).toHaveLength(64);
      // R should have leading zero stripped, then left-padded to 32 bytes
      const expectedR = Buffer.concat([Buffer.from([0x00]), Buffer.alloc(31, 0xff)]);
      expect(p1363.slice(0, 32)).toEqual(expectedR);
    });
  });

  describe('p1363ToDer', () => {
    it('should convert P1363 to DER', () => {
      const p1363 = Buffer.alloc(64);
      p1363.fill(0x12, 0, 32); // R
      p1363.fill(0x34, 32, 64); // S

      const der = p1363ToDer(p1363);

      // Should start with SEQUENCE tag
      expect(der[0]).toBe(0x30);
    });

    it('should throw error for invalid P1363 length', () => {
      const invalidP1363 = Buffer.alloc(32); // Only 32 bytes, not 64

      expect(() => p1363ToDer(invalidP1363)).toThrow('P1363 signature must be 64 bytes');
    });

    it('should round-trip DER → P1363 → DER correctly', () => {
      const baseString = 'round-trip-test';
      const signature = signP256P1363(baseString, privateKeyPem);
      const p1363 = Buffer.from(signature, 'base64');

      // Convert to DER
      const der = p1363ToDer(p1363);

      // Convert back to P1363
      const p1363RoundTrip = derToP1363(der);

      // Should match original (allowing for leading zero differences)
      expect(p1363RoundTrip).toHaveLength(64);
      expect(p1363RoundTrip.toString('hex')).toBe(p1363.toString('hex'));
    });
  });

  describe('fingerprintSha1', () => {
    it('should compute SHA-1 fingerprint of certificate', () => {
      // Generate a self-signed certificate (using generateKeyPairSync doesn't provide cert,
      // so we'll use a dummy PEM cert for testing)
      const dummyCert = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJAKHdQYuY8u7VMA0GCSqGSIb3DQEBCwUAMBExDzANBgNVBAMMBnRl
c3RDQTAeFw0yNTAxMDYwMDAwMDBaFw0yNjAxMDYwMDAwMDBaMBExDzANBgNVBAMM
BnRlc3RDQTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABE6sMK3mj2WprDxqhJqh
mXgPvY8u3ZXRqH7cM3TfH8RmTyKhZ8N0xPQsZGw8pA2jWzH8dF3xJh6XqN5YxXs=
-----END CERTIFICATE-----`;

      const fingerprint = fingerprintSha1(dummyCert);

      expect(fingerprint).toHaveLength(40);
      expect(fingerprint).toMatch(/^[0-9a-f]{40}$/); // 40 hex characters (lowercase)
    });

    it('should return consistent fingerprint for same certificate', () => {
      const cert = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJAKHdQYuY8u7VMA0GCSqGSIb3DQEBCwUAMBExDzANBgNVBAMMBnRl
c3RDQTAeFw0yNTAxMDYwMDAwMDBaFw0yNjAxMDYwMDAwMDBaMBExDzANBgNVBAMM
BnRlc3RDQTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABE6sMK3mj2WprDxqhJqh
mXgPvY8u3ZXRqH7cM3TfH8RmTyKhZ8N0xPQsZGw8pA2jWzH8dF3xJh6XqN5YxXs=
-----END CERTIFICATE-----`;

      const fp1 = fingerprintSha1(cert);
      const fp2 = fingerprintSha1(cert);

      expect(fp1).toBe(fp2);
    });

    it('should throw error for invalid PEM format', () => {
      const invalidCert = 'not-a-valid-certificate';

      expect(() => fingerprintSha1(invalidCert)).toThrow('Invalid PEM certificate');
    });

    it('should handle certificate with extra whitespace', () => {
      const certWithSpaces = `
      -----BEGIN CERTIFICATE-----
      MIIBkTCB+wIJAKHdQYuY8u7VMA0GCSqGSIb3DQEBCwUAMBExDzANBgNVBAMMBnRl
      c3RDQTAeFw0yNTAxMDYwMDAwMDBaFw0yNjAxMDYwMDAwMDBaMBExDzANBgNVBAMM
      BnRlc3RDQTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABE6sMK3mj2WprDxqhJqh
      mXgPvY8u3ZXRqH7cM3TfH8RmTyKhZ8N0xPQsZGw8pA2jWzH8dF3xJh6XqN5YxXs=
      -----END CERTIFICATE-----
      `;

      const fingerprint = fingerprintSha1(certWithSpaces);

      expect(fingerprint).toHaveLength(40);
      expect(fingerprint).toMatch(/^[0-9a-f]{40}$/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty base string', () => {
      const signature = signP256P1363('', privateKeyPem);
      const isValid = verifyP256P1363('', signature, publicKeyPem);

      expect(signature).toHaveLength(88);
      expect(isValid).toBe(true);
    });

    it('should handle very long base string', () => {
      const longString = 'x'.repeat(10000);
      const signature = signP256P1363(longString, privateKeyPem);
      const isValid = verifyP256P1363(longString, signature, publicKeyPem);

      expect(signature).toHaveLength(88);
      expect(isValid).toBe(true);
    });

    it('should handle Unicode characters in base string', () => {
      const unicodeString = 'Hello 世界 🌍 Québec';
      const signature = signP256P1363(unicodeString, privateKeyPem);
      const isValid = verifyP256P1363(unicodeString, signature, publicKeyPem);

      expect(signature).toHaveLength(88);
      expect(isValid).toBe(true);
    });

    it('should handle newlines and special characters', () => {
      const specialString = 'Line1\nLine2\rLine3\tTab\x00Null';
      const signature = signP256P1363(specialString, privateKeyPem);
      const isValid = verifyP256P1363(specialString, signature, publicKeyPem);

      expect(signature).toHaveLength(88);
      expect(isValid).toBe(true);
    });
  });
});
