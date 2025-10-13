/**
 * Canonicalization Tests - Phase 5.2
 *
 * Tests for:
 * - canonicalizePayload() - Deterministic JSON serialization
 * - buildCanonicalBaseString() - Base string for signing
 */

import { canonicalizePayload } from '../body-signer';
import { buildCanonicalBaseString } from '../headers-builder';
import type { WebSrmHeaders } from '../headers-builder';
import { createHash } from 'crypto';

describe('canonicalizePayload', () => {
  describe('Deterministic output', () => {
    it('should produce same canonical string for same payload', () => {
      const payload = {
        montTot: 3068,
        idTrans: 'ORD-001',
        acti: 'ENR',
      };

      const canonical1 = canonicalizePayload(payload);
      const canonical2 = canonicalizePayload(payload);

      expect(canonical1).toBe(canonical2);
    });

    it('should produce same canonical string regardless of key order', () => {
      const payload1 = {
        montTot: 3068,
        idTrans: 'ORD-001',
        acti: 'ENR',
        montTPS: 123,
      };

      const payload2 = {
        acti: 'ENR',
        montTPS: 123,
        idTrans: 'ORD-001',
        montTot: 3068,
      };

      const canonical1 = canonicalizePayload(payload1);
      const canonical2 = canonicalizePayload(payload2);

      expect(canonical1).toBe(canonical2);
      expect(canonical1).toBe('{"acti":"ENR","idTrans":"ORD-001","montTPS":123,"montTot":3068}');
    });

    it('should sort keys alphabetically at all nesting levels', () => {
      const payload = {
        z: 'last',
        a: 'first',
        m: {
          z: 'nested-last',
          a: 'nested-first',
        },
      };

      const canonical = canonicalizePayload(payload);
      expect(canonical).toBe('{"a":"first","m":{"a":"nested-first","z":"nested-last"},"z":"last"}');
    });
  });

  describe('Type handling', () => {
    it('should preserve integers (cents)', () => {
      const payload = {
        montTot: 3068,
        montTPS: 123,
        montTVQ: 244,
      };

      const canonical = canonicalizePayload(payload);
      expect(canonical).toContain('"montTot":3068');
      expect(canonical).toContain('"montTPS":123');
      expect(canonical).toContain('"montTVQ":244');
    });

    it('should throw error for float numbers', () => {
      const payload = {
        montTot: 30.68, // Float instead of cents
      };

      expect(() => canonicalizePayload(payload)).toThrow('Float numbers not allowed');
    });

    it('should preserve null values', () => {
      const payload = {
        field: null,
      };

      const canonical = canonicalizePayload(payload);
      expect(canonical).toBe('{"field":null}');
    });

    it('should preserve boolean values', () => {
      const payload = {
        active: true,
        disabled: false,
      };

      const canonical = canonicalizePayload(payload);
      expect(canonical).toBe('{"active":true,"disabled":false}');
    });

    it('should remove undefined fields', () => {
      const payload = {
        a: 'present',
        b: undefined,
        c: 'also-present',
      };

      const canonical = canonicalizePayload(payload);
      expect(canonical).toBe('{"a":"present","c":"also-present"}');
      expect(canonical).not.toContain('b');
    });
  });

  describe('Array handling', () => {
    it('should preserve array order (no sorting)', () => {
      const payload = {
        items: [
          { id: 3 },
          { id: 1 },
          { id: 2 },
        ],
      };

      const canonical = canonicalizePayload(payload);
      expect(canonical).toBe('{"items":[{"id":3},{"id":1},{"id":2}]}');
    });

    it('should sort keys within array elements', () => {
      const payload = {
        desc: [
          {
            prixUnit: 1450,
            desc: 'Margherita Pizza',
            qte: 1,
          },
        ],
      };

      const canonical = canonicalizePayload(payload);
      expect(canonical).toBe('{"desc":[{"desc":"Margherita Pizza","prixUnit":1450,"qte":1}]}');
    });
  });

  describe('String sanitization', () => {
    it('should sanitize non-ASCII characters to ASCII', () => {
      const payload = {
        desc: 'Café',
        name: 'Montréal',
      };

      const canonical = canonicalizePayload(payload);
      expect(canonical).toContain('"desc":"Cafe"');
      expect(canonical).toContain('"name":"Montreal"');
    });

    it('should remove emojis and unsupported characters', () => {
      const payload = {
        desc: 'Pizza 🍕',
      };

      const canonical = canonicalizePayload(payload);
      expect(canonical).toBe('{"desc":"Pizza "}');
      expect(canonical).not.toContain('🍕');
    });

    it('should preserve ASCII strings unchanged', () => {
      const payload = {
        desc: 'Plain ASCII Text 123',
      };

      const canonical = canonicalizePayload(payload);
      expect(canonical).toBe('{"desc":"Plain ASCII Text 123"}');
    });

    it('should handle accented characters in nested objects', () => {
      const payload = {
        items: [
          { name: 'Entrée' },
          { name: 'Crème brûlée' },
        ],
      };

      const canonical = canonicalizePayload(payload);
      expect(canonical).toContain('"name":"Entree"');
      expect(canonical).toContain('"name":"Creme brulee"');
    });
  });

  describe('Minified output', () => {
    it('should produce minified JSON with no whitespace', () => {
      const payload = {
        a: 1,
        b: 2,
        c: 3,
      };

      const canonical = canonicalizePayload(payload);
      expect(canonical).not.toContain(' ');
      expect(canonical).not.toContain('\n');
      expect(canonical).not.toContain('\t');
    });
  });

  describe('Golden test - WEB-SRM example', () => {
    it('should match expected canonical format for real transaction', () => {
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

      const canonical = canonicalizePayload(payload);
      const expected = '{"acti":"ENR","desc":[{"desc":"Margherita Pizza","prixUnit":1450,"qte":1}],"idTrans":"ORD-DRYRUN-001","montTPS":123,"montTVQ":244,"montTot":3068}';

      expect(canonical).toBe(expected);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty object', () => {
      const payload = {};
      const canonical = canonicalizePayload(payload);
      expect(canonical).toBe('{}');
    });

    it('should handle empty array', () => {
      const payload = { items: [] };
      const canonical = canonicalizePayload(payload);
      expect(canonical).toBe('{"items":[]}');
    });

    it('should handle empty string (preserve it)', () => {
      const payload = { desc: '' };
      const canonical = canonicalizePayload(payload);
      expect(canonical).toBe('{"desc":""}');
    });

    it('should handle deeply nested objects', () => {
      const payload = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      };

      const canonical = canonicalizePayload(payload);
      expect(canonical).toBe('{"level1":{"level2":{"level3":{"value":"deep"}}}}');
    });
  });
});

describe('buildCanonicalBaseString', () => {
  const defaultHeaders: Partial<WebSrmHeaders> = {
    IDAPPRL: 'POS-DEV-001',
    IDSEV: 'SRS-001',
    IDVERSI: '1.0.0',
    CODCERTIF: 'TESTCODE',
    IDPARTN: 'PARTNER-001',
    VERSI: '1.0.0',
    VERSIPARN: '1.0.0',
    ENVIRN: 'DEV',
  };

  const simpleBody = '{"acti":"ENR","idTrans":"ORD-001","montTot":3068}';

  describe('Format validation', () => {
    it('should produce 4 lines with 3 newlines', () => {
      const baseString = buildCanonicalBaseString('POST', '/transaction', simpleBody, defaultHeaders);

      const lines = baseString.split('\n');
      expect(lines).toHaveLength(4);
    });

    it('should have no trailing newline', () => {
      const baseString = buildCanonicalBaseString('POST', '/transaction', simpleBody, defaultHeaders);

      expect(baseString.endsWith('\n')).toBe(false);
    });

    it('should have METHOD as uppercase in first line', () => {
      const baseString = buildCanonicalBaseString('post', '/transaction', simpleBody, defaultHeaders);

      const lines = baseString.split('\n');
      expect(lines[0]).toBe('POST');
    });

    it('should have path in second line', () => {
      const baseString = buildCanonicalBaseString('POST', '/transaction', simpleBody, defaultHeaders);

      const lines = baseString.split('\n');
      expect(lines[1]).toBe('/transaction');
    });

    it('should have SHA-256 hash (64 hex chars) in third line', () => {
      const baseString = buildCanonicalBaseString('POST', '/transaction', simpleBody, defaultHeaders);

      const lines = baseString.split('\n');
      const hash = lines[2];

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/); // lowercase hex
    });
  });

  describe('Body hash computation', () => {
    it('should compute correct SHA-256 hash of canonical body', () => {
      const baseString = buildCanonicalBaseString('POST', '/transaction', simpleBody, defaultHeaders);

      const lines = baseString.split('\n');
      const actualHash = lines[2];

      const expectedHash = createHash('sha256')
        .update(simpleBody, 'utf8')
        .digest('hex')
        .toLowerCase();

      expect(actualHash).toBe(expectedHash);
    });

    it('should produce different hashes for different bodies', () => {
      const body1 = '{"a":1}';
      const body2 = '{"a":2}';

      const baseString1 = buildCanonicalBaseString('POST', '/transaction', body1, defaultHeaders);
      const baseString2 = buildCanonicalBaseString('POST', '/transaction', body2, defaultHeaders);

      const hash1 = baseString1.split('\n')[2];
      const hash2 = baseString2.split('\n')[2];

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Header list ordering', () => {
    it('should list headers in fixed order (without CASESSAI)', () => {
      const baseString = buildCanonicalBaseString('POST', '/transaction', simpleBody, defaultHeaders);

      const lines = baseString.split('\n');
      const headerList = lines[3];

      const expectedOrder = 'IDAPPRL=POS-DEV-001;IDSEV=SRS-001;IDVERSI=1.0.0;CODCERTIF=TESTCODE;IDPARTN=PARTNER-001;VERSI=1.0.0;VERSIPARN=1.0.0;ENVIRN=DEV';
      expect(headerList).toBe(expectedOrder);
    });

    it('should append CASESSAI at the end if present', () => {
      const headersWithCasEssai: Partial<WebSrmHeaders> = {
        ...defaultHeaders,
        ENVIRN: 'ESSAI',
        CASESSAI: 'TEST-001',
      };

      const baseString = buildCanonicalBaseString('POST', '/transaction', simpleBody, headersWithCasEssai);

      const lines = baseString.split('\n');
      const headerList = lines[3];

      expect(headerList).toContain('ENVIRN=ESSAI');
      expect(headerList.endsWith('CASESSAI=TEST-001')).toBe(true);
    });

    it('should not include CASESSAI if not present', () => {
      const baseString = buildCanonicalBaseString('POST', '/transaction', simpleBody, defaultHeaders);

      const lines = baseString.split('\n');
      const headerList = lines[3];

      expect(headerList).not.toContain('CASESSAI');
    });

    it('should not include CASESSAI if empty string', () => {
      const headersWithEmptyCasEssai: Partial<WebSrmHeaders> = {
        ...defaultHeaders,
        CASESSAI: '',
      };

      const baseString = buildCanonicalBaseString('POST', '/transaction', simpleBody, headersWithEmptyCasEssai);

      const lines = baseString.split('\n');
      const headerList = lines[3];

      expect(headerList).not.toContain('CASESSAI');
    });
  });

  describe('Error handling', () => {
    it('should throw error if required header is missing', () => {
      const incompleteHeaders: Partial<WebSrmHeaders> = {
        IDAPPRL: 'POS-DEV-001',
        // Missing IDSEV and others
      };

      expect(() => buildCanonicalBaseString('POST', '/transaction', simpleBody, incompleteHeaders)).toThrow('Required header');
    });

    it('should throw error if header value is empty', () => {
      const headersWithEmpty: Partial<WebSrmHeaders> = {
        ...defaultHeaders,
        IDSEV: '',
      };

      expect(() => buildCanonicalBaseString('POST', '/transaction', simpleBody, headersWithEmpty)).toThrow('Required header IDSEV is missing or empty');
    });

    it('should throw error if header contains non-ASCII characters', () => {
      const headersWithNonAscii: Partial<WebSrmHeaders> = {
        ...defaultHeaders,
        IDAPPRL: 'POS-Montréal', // Contains é
      };

      expect(() => buildCanonicalBaseString('POST', '/transaction', simpleBody, headersWithNonAscii)).toThrow('non-ASCII characters');
    });

    it('should throw error for non-POST methods', () => {
      expect(() => buildCanonicalBaseString('GET', '/transaction', simpleBody, defaultHeaders)).toThrow('Only POST method is supported');
    });

    it('should throw error if path does not start with /', () => {
      expect(() => buildCanonicalBaseString('POST', 'transaction', simpleBody, defaultHeaders)).toThrow("Path must start with '/'");
    });
  });

  describe('Golden test - Complete WEB-SRM example', () => {
    it('should match expected base string for real transaction', () => {
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

      const canonicalBody = canonicalizePayload(payload);
      const baseString = buildCanonicalBaseString('POST', '/transaction', canonicalBody, defaultHeaders);

      // Verify format
      const lines = baseString.split('\n');
      expect(lines[0]).toBe('POST');
      expect(lines[1]).toBe('/transaction');
      expect(lines[2]).toHaveLength(64); // SHA-256 hex
      expect(lines[3]).toContain('IDAPPRL=POS-DEV-001');
      expect(lines[3]).toContain('ENVIRN=DEV');

      // Verify hash matches canonical body
      const expectedHash = createHash('sha256')
        .update(canonicalBody, 'utf8')
        .digest('hex')
        .toLowerCase();

      expect(lines[2]).toBe(expectedHash);

      // Verify no trailing newline
      expect(baseString.endsWith('\n')).toBe(false);

      // Verify exactly 3 newlines
      const newlineCount = (baseString.match(/\n/g) || []).length;
      expect(newlineCount).toBe(3);
    });
  });

  describe('Deterministic output', () => {
    it('should produce same base string for same inputs', () => {
      const baseString1 = buildCanonicalBaseString('POST', '/transaction', simpleBody, defaultHeaders);
      const baseString2 = buildCanonicalBaseString('POST', '/transaction', simpleBody, defaultHeaders);

      expect(baseString1).toBe(baseString2);
    });

    it('should produce different base strings for different bodies', () => {
      const body1 = '{"a":1}';
      const body2 = '{"a":2}';

      const baseString1 = buildCanonicalBaseString('POST', '/transaction', body1, defaultHeaders);
      const baseString2 = buildCanonicalBaseString('POST', '/transaction', body2, defaultHeaders);

      expect(baseString1).not.toBe(baseString2);
    });

    it('should produce different base strings for different paths', () => {
      const baseString1 = buildCanonicalBaseString('POST', '/transaction', simpleBody, defaultHeaders);
      const baseString2 = buildCanonicalBaseString('POST', '/cancellation', simpleBody, defaultHeaders);

      expect(baseString1).not.toBe(baseString2);
    });
  });
});
