/**
 * Body Signature Chain & QR Builder Tests - Phase 5.4
 *
 * Tests for:
 * - computeBodySignatures() - Real signature chain
 * - buildOfficialQr() - Deterministic QR URL generation
 * - toBase64Url() - URL-safe Base64 encoding
 */

import { computeBodySignatures, canonicalizePayload } from '../body-signer';
import type { BodySignatureOptions, BodySignatureResult } from '../body-signer';
import { buildOfficialQr, toBase64Url } from '../qr-builder';
import type { QrPayload } from '../qr-builder';
import { generateKeyPairSync } from 'crypto';

describe('computeBodySignatures - Phase 5.4', () => {
  // Generate ephemeral test keys
  const { privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'P-256',
  });

  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

  const defaultOpts: BodySignatureOptions = {
    privateKeyPem,
  };

  describe('First transaction (no previous signature)', () => {
    it('should generate preced with 88 equals signs', () => {
      const payload = { acti: 'ENR', montTot: 3068 };
      const result = computeBodySignatures(payload, defaultOpts);

      expect(result.preced).toBe('='.repeat(88));
    });

    it('should generate 88-character Base64 signature for actu', () => {
      const payload = { acti: 'ENR', montTot: 3068 };
      const result = computeBodySignatures(payload, defaultOpts);

      expect(result.actu).toHaveLength(88);
      expect(result.actu).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it('should return canonical JSON string', () => {
      const payload = { montTot: 3068, acti: 'ENR', idTrans: 'ORD-001' };
      const result = computeBodySignatures(payload, defaultOpts);

      // Canonical should be minified and sorted
      expect(result.canonical).toBe('{"acti":"ENR","idTrans":"ORD-001","montTot":3068}');
    });

    it('should return SHA-256 hash of canonical string (64 hex chars)', () => {
      const payload = { acti: 'ENR', montTot: 3068 };
      const result = computeBodySignatures(payload, defaultOpts);

      expect(result.sha256Hex).toHaveLength(64);
      expect(result.sha256Hex).toMatch(/^[a-f0-9]{64}$/); // lowercase hex
    });

    it('should produce valid Base64 signature (decodable)', () => {
      const payload = { acti: 'ENR', montTot: 3068 };
      const result = computeBodySignatures(payload, defaultOpts);

      expect(() => {
        Buffer.from(result.actu, 'base64');
      }).not.toThrow();

      const decoded = Buffer.from(result.actu, 'base64');
      expect(decoded.length).toBe(64); // P1363 format: 64 bytes
    });
  });

  describe('Second transaction (with previous signature)', () => {
    it('should use previous actu as preced', () => {
      const payload1 = { acti: 'ENR', montTot: 3068 };
      const result1 = computeBodySignatures(payload1, defaultOpts);

      const payload2 = { acti: 'ENR', montTot: 5000 };
      const result2 = computeBodySignatures(payload2, {
        ...defaultOpts,
        previousActu: result1.actu,
      });

      expect(result2.preced).toBe(result1.actu);
      expect(result2.preced).toHaveLength(88);
    });

    it('should generate different actu for different payload', () => {
      const payload1 = { acti: 'ENR', montTot: 3068 };
      const result1 = computeBodySignatures(payload1, defaultOpts);

      const payload2 = { acti: 'ENR', montTot: 5000 }; // Different amount
      const result2 = computeBodySignatures(payload2, {
        ...defaultOpts,
        previousActu: result1.actu,
      });

      expect(result2.actu).not.toBe(result1.actu);
      expect(result2.actu).toHaveLength(88);
    });

    it('should chain correctly across multiple transactions', () => {
      const payload1 = { acti: 'ENR', montTot: 1000 };
      const result1 = computeBodySignatures(payload1, defaultOpts);

      const payload2 = { acti: 'ENR', montTot: 2000 };
      const result2 = computeBodySignatures(payload2, {
        ...defaultOpts,
        previousActu: result1.actu,
      });

      const payload3 = { acti: 'ENR', montTot: 3000 };
      const result3 = computeBodySignatures(payload3, {
        ...defaultOpts,
        previousActu: result2.actu,
      });

      // Verify chain integrity
      expect(result1.preced).toBe('='.repeat(88)); // First
      expect(result2.preced).toBe(result1.actu); // Second links to first
      expect(result3.preced).toBe(result2.actu); // Third links to second

      // All signatures should be valid
      expect(result1.actu).toHaveLength(88);
      expect(result2.actu).toHaveLength(88);
      expect(result3.actu).toHaveLength(88);
    });
  });

  describe('Canonical and hash determinism', () => {
    it('should produce same canonical string for same payload', () => {
      const payload = { acti: 'ENR', montTot: 3068 };

      const result1 = computeBodySignatures(payload, defaultOpts);
      const result2 = computeBodySignatures(payload, defaultOpts);

      expect(result1.canonical).toBe(result2.canonical);
    });

    it('should produce same SHA-256 hash for same canonical string', () => {
      const payload = { acti: 'ENR', montTot: 3068 };

      const result1 = computeBodySignatures(payload, defaultOpts);
      const result2 = computeBodySignatures(payload, defaultOpts);

      expect(result1.sha256Hex).toBe(result2.sha256Hex);
    });

    it('should produce different hash for different payload', () => {
      const payload1 = { acti: 'ENR', montTot: 3068 };
      const payload2 = { acti: 'ENR', montTot: 5000 };

      const result1 = computeBodySignatures(payload1, defaultOpts);
      const result2 = computeBodySignatures(payload2, defaultOpts);

      expect(result1.sha256Hex).not.toBe(result2.sha256Hex);
    });
  });

  describe('Validation - privateKeyPem', () => {
    it('should throw error if privateKeyPem is missing', () => {
      const payload = { acti: 'ENR', montTot: 3068 };

      expect(() =>
        computeBodySignatures(payload, { privateKeyPem: undefined as any })
      ).toThrow('privateKeyPem is required');
    });

    it('should throw error if privateKeyPem is not a string', () => {
      const payload = { acti: 'ENR', montTot: 3068 };

      expect(() =>
        computeBodySignatures(payload, { privateKeyPem: 123 as any })
      ).toThrow('privateKeyPem is required and must be a string');
    });

    it('should throw error if privateKeyPem is not a PEM format', () => {
      const payload = { acti: 'ENR', montTot: 3068 };

      expect(() =>
        computeBodySignatures(payload, { privateKeyPem: 'not-a-pem-key' })
      ).toThrow('privateKeyPem must be a valid PEM key');
    });
  });

  describe('Validation - previousActu', () => {
    it('should throw error if previousActu is not 88 characters', () => {
      const payload = { acti: 'ENR', montTot: 3068 };

      expect(() =>
        computeBodySignatures(payload, {
          ...defaultOpts,
          previousActu: 'short',
        })
      ).toThrow('previousActu must be exactly 88 Base64 characters');
    });

    it('should throw error if previousActu is not valid Base64', () => {
      const payload = { acti: 'ENR', montTot: 3068 };

      expect(() =>
        computeBodySignatures(payload, {
          ...defaultOpts,
          previousActu: '@'.repeat(88), // Invalid Base64 characters
        })
      ).toThrow('previousActu must be valid Base64');
    });

    it('should accept valid 88-character Base64 signature', () => {
      const payload1 = { acti: 'ENR', montTot: 3068 };
      const result1 = computeBodySignatures(payload1, defaultOpts);

      const payload2 = { acti: 'ENR', montTot: 5000 };

      expect(() =>
        computeBodySignatures(payload2, {
          ...defaultOpts,
          previousActu: result1.actu,
        })
      ).not.toThrow();
    });
  });

  describe('Integration with canonicalizePayload', () => {
    it('should use canonicalizePayload for deterministic JSON', () => {
      const payload = {
        montTot: 3068,
        idTrans: 'ORD-DRYRUN-001',
        desc: [
          {
            qte: 1,
            desc: 'Margherita Pizza',
            prixUnit: 1450,
          },
        ],
        montTPS: 123,
        acti: 'ENR',
        montTVQ: 244,
      };

      const result = computeBodySignatures(payload, defaultOpts);

      // Canonical should match Phase 5.2 canonicalization
      const expectedCanonical = canonicalizePayload(payload);
      expect(result.canonical).toBe(expectedCanonical);
    });

    it('should throw error if payload contains float numbers', () => {
      const payload = {
        acti: 'ENR',
        montTot: 30.68, // Float instead of cents
      };

      expect(() => computeBodySignatures(payload, defaultOpts)).toThrow(
        'Float numbers not allowed'
      );
    });
  });
});

describe('toBase64Url - Phase 5.4', () => {
  it('should replace + with -', () => {
    expect(toBase64Url('abc+def')).toBe('abc-def');
  });

  it('should replace / with _', () => {
    expect(toBase64Url('abc/def')).toBe('abc_def');
  });

  it('should remove trailing = padding', () => {
    expect(toBase64Url('abc=')).toBe('abc');
    expect(toBase64Url('abc==')).toBe('abc');
    expect(toBase64Url('abc===')).toBe('abc');
  });

  it('should handle all transformations together', () => {
    expect(toBase64Url('abc+def/ghi==')).toBe('abc-def_ghi');
  });

  it('should not modify already URL-safe Base64', () => {
    expect(toBase64Url('abcdefghijklmnop')).toBe('abcdefghijklmnop');
  });

  it('should handle 88-character signature correctly', () => {
    const sig = 'AqEFf+8l4d+SId3eofz6' + '/'.repeat(10) + 'EovtGfReL4cDMYxf/A==';
    const urlSafe = toBase64Url(sig);

    // Should not contain +, /, or =
    expect(urlSafe).not.toContain('+');
    expect(urlSafe).not.toContain('/');
    expect(urlSafe).not.toContain('=');

    // Should contain - and _ instead
    expect(urlSafe).toContain('-');
    expect(urlSafe).toContain('_');
  });
});

describe('buildOfficialQr - Phase 5.4', () => {
  // Generate a valid 88-character Base64 signature for testing
  const { privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'P-256',
  });

  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

  const getValidSignature = (): string => {
    const payload = { acti: 'ENR', montTot: 3068 };
    const result = computeBodySignatures(payload, { privateKeyPem });
    return result.actu;
  };

  describe('Happy path', () => {
    it('should build QR URL with all parameters', () => {
      const payload: QrPayload = {
        idTrans: 'ORD-001',
        dtTrans: '2025-01-07T14:30:00-05:00',
        montTot: 3068,
      };

      const actu = getValidSignature();
      const qrUrl = buildOfficialQr(payload, actu);

      expect(qrUrl).toContain('https://qr.local/verify?');
      expect(qrUrl).toContain('no=ORD-001');
      expect(qrUrl).toContain('dt=2025-01-07T14%3A30%3A00-05%3A00'); // URL-encoded
      expect(qrUrl).toContain('tot=3068');
      expect(qrUrl).toContain('sig=');
    });

    it('should use custom baseUrl if provided', () => {
      const payload: QrPayload = {
        idTrans: 'ORD-001',
        montTot: 3068,
      };

      const actu = getValidSignature();
      const qrUrl = buildOfficialQr(payload, actu, {
        baseUrl: 'https://custom.example.com/qr',
      });

      expect(qrUrl.startsWith('https://custom.example.com/qr?')).toBe(true);
    });

    it('should handle empty payload fields (Phase 6 will populate)', () => {
      const payload: QrPayload = {}; // Empty payload

      const actu = getValidSignature();
      const qrUrl = buildOfficialQr(payload, actu);

      expect(qrUrl).toContain('no=');
      expect(qrUrl).toContain('dt=');
      expect(qrUrl).toContain('tot=');
      expect(qrUrl).toContain('sig=');
    });
  });

  describe('Parameter order (determinism)', () => {
    it('should always use fixed parameter order: no, dt, tot, sig', () => {
      const payload: QrPayload = {
        idTrans: 'ORD-001',
        dtTrans: '2025-01-07T14:30:00-05:00',
        montTot: 3068,
      };

      const actu = getValidSignature();
      const qrUrl = buildOfficialQr(payload, actu);

      // Extract query string
      const queryString = qrUrl.split('?')[1];
      const params = queryString.split('&');

      // Verify order
      expect(params[0].startsWith('no=')).toBe(true);
      expect(params[1].startsWith('dt=')).toBe(true);
      expect(params[2].startsWith('tot=')).toBe(true);
      expect(params[3].startsWith('sig=')).toBe(true);
    });

    it('should produce same URL for same inputs', () => {
      const payload: QrPayload = {
        idTrans: 'ORD-001',
        montTot: 3068,
      };

      const actu = getValidSignature();
      const qrUrl1 = buildOfficialQr(payload, actu);
      const qrUrl2 = buildOfficialQr(payload, actu);

      expect(qrUrl1).toBe(qrUrl2);
    });
  });

  describe('URL-safe Base64 signature', () => {
    it('should convert signature to URL-safe format', () => {
      const payload: QrPayload = {
        idTrans: 'ORD-001',
      };

      const actu = getValidSignature();
      const qrUrl = buildOfficialQr(payload, actu);

      // Extract sig parameter
      const sigMatch = qrUrl.match(/sig=([^&]+)/);
      expect(sigMatch).toBeTruthy();

      const sigValue = sigMatch![1];

      // Should not contain +, /, or = (URL-safe)
      expect(sigValue).not.toContain('+');
      expect(sigValue).not.toContain('/');
      expect(sigValue).not.toContain('=');
      expect(sigValue).not.toContain('%'); // Should not be double-encoded

      // Should only contain URL-safe characters
      expect(sigValue).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe('Validation - actuBase64', () => {
    it('should throw error if actuBase64 is missing', () => {
      const payload: QrPayload = { idTrans: 'ORD-001' };

      expect(() => buildOfficialQr(payload, undefined as any)).toThrow(
        'actuBase64 must be exactly 88 Base64 characters'
      );
    });

    it('should throw error if actuBase64 is not 88 characters', () => {
      const payload: QrPayload = { idTrans: 'ORD-001' };

      expect(() => buildOfficialQr(payload, 'short')).toThrow(
        'actuBase64 must be exactly 88 Base64 characters'
      );
    });

    it('should throw error if actuBase64 is not valid Base64', () => {
      const payload: QrPayload = { idTrans: 'ORD-001' };

      expect(() => buildOfficialQr(payload, '@'.repeat(88))).toThrow(
        'actuBase64 must be valid Base64'
      );
    });

    it('should accept valid 88-character Base64 signature', () => {
      const payload: QrPayload = { idTrans: 'ORD-001' };
      const actu = getValidSignature();

      expect(() => buildOfficialQr(payload, actu)).not.toThrow();
    });
  });

  describe('Integration - End-to-end flow', () => {
    it('should create valid QR URL from body signature', () => {
      // 1. Create payload
      const payload = {
        acti: 'ENR',
        idTrans: 'ORD-DRYRUN-001',
        montTot: 3068,
      };

      // 2. Compute body signatures
      const sigResult = computeBodySignatures(payload, { privateKeyPem });

      // 3. Build QR URL
      const qrPayload: QrPayload = {
        idTrans: payload.idTrans,
        dtTrans: '2025-01-07T14:30:00-05:00',
        montTot: payload.montTot,
      };

      const qrUrl = buildOfficialQr(qrPayload, sigResult.actu);

      // 4. Verify QR URL
      expect(qrUrl).toContain('https://qr.local/verify?');
      expect(qrUrl).toContain('no=ORD-DRYRUN-001');
      expect(qrUrl).toContain('tot=3068');
      expect(qrUrl).toContain('sig=');

      // Extract and verify signature
      const sigMatch = qrUrl.match(/sig=([^&]+)/);
      expect(sigMatch).toBeTruthy();

      const sigValue = sigMatch![1];
      expect(sigValue).toMatch(/^[A-Za-z0-9_-]+$/); // URL-safe
      expect(sigValue).not.toContain('+');
      expect(sigValue).not.toContain('/');
      expect(sigValue).not.toContain('=');
    });
  });
});
