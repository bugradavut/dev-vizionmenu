/**
 * Headers Builder Tests - Phase 5.3
 *
 * Tests for:
 * - buildOfficialHeaders() - Real signature and fingerprint computation
 * - Input validation (ASCII, empty fields, baseString format)
 */

import { buildOfficialHeaders, buildCanonicalBaseString } from '../headers-builder';
import type { HeaderInput, WebSrmHeaders } from '../headers-builder';
import { canonicalizePayload } from '../body-signer';
import { generateKeyPairSync } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('buildOfficialHeaders - Phase 5.3', () => {
  // Generate ephemeral test keys
  const { privateKey, publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'P-256',
  });

  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

  // Load test certificate fixture
  const certPem = readFileSync(
    join(__dirname, 'fixtures', 'test-cert.pem'),
    'utf8'
  );

  // Default header input (valid)
  const defaultInput: HeaderInput = {
    env: 'DEV',
    idApprl: 'POS-DEV-001',
    idSev: 'SRS-001',
    idVersi: '1.0.0',
    codCertif: 'TESTCODE',
    idPartn: 'PARTNER-001',
    versi: '1.0.0',
    versiParn: '1.0.0',
    privateKeyPem,
    certPem,
  };

  // Create a valid base string
  const createValidBaseString = (): string => {
    const payload = {
      acti: 'ENR',
      idTrans: 'ORD-TEST-001',
      montTot: 3068,
    };

    const canonicalBody = canonicalizePayload(payload);

    const headers: Partial<WebSrmHeaders> = {
      IDAPPRL: defaultInput.idApprl,
      IDSEV: defaultInput.idSev,
      IDVERSI: defaultInput.idVersi,
      CODCERTIF: defaultInput.codCertif,
      IDPARTN: defaultInput.idPartn,
      VERSI: defaultInput.versi,
      VERSIPARN: defaultInput.versiParn,
      ENVIRN: defaultInput.env,
    };

    return buildCanonicalBaseString('POST', '/transaction', canonicalBody, headers);
  };

  describe('Happy path - DEV environment', () => {
    it('should build complete headers with valid signature and fingerprint', () => {
      const baseString = createValidBaseString();
      const headers = buildOfficialHeaders(defaultInput, baseString);

      // Verify all required fields are present
      expect(headers.ENVIRN).toBe('DEV');
      expect(headers.IDAPPRL).toBe('POS-DEV-001');
      expect(headers.IDSEV).toBe('SRS-001');
      expect(headers.IDVERSI).toBe('1.0.0');
      expect(headers.CODCERTIF).toBe('TESTCODE');
      expect(headers.IDPARTN).toBe('PARTNER-001');
      expect(headers.VERSI).toBe('1.0.0');
      expect(headers.VERSIPARN).toBe('1.0.0');

      // Verify SIGNATRANSM (88 Base64 characters)
      expect(headers.SIGNATRANSM).toBeDefined();
      expect(headers.SIGNATRANSM).toHaveLength(88);
      expect(headers.SIGNATRANSM).toMatch(/^[A-Za-z0-9+/=]+$/);

      // Verify EMPRCERTIFTRANSM (40 hex characters)
      expect(headers.EMPRCERTIFTRANSM).toBeDefined();
      expect(headers.EMPRCERTIFTRANSM).toHaveLength(40);
      expect(headers.EMPRCERTIFTRANSM).toMatch(/^[a-f0-9]{40}$/);

      // CASESSAI should not be present for DEV
      expect(headers.CASESSAI).toBeUndefined();
    });

    it('should produce valid Base64 signature', () => {
      const baseString = createValidBaseString();
      const headers = buildOfficialHeaders(defaultInput, baseString);

      // Base64 decode should work without errors
      expect(() => {
        Buffer.from(headers.SIGNATRANSM, 'base64');
      }).not.toThrow();

      // Decoded length should be 64 bytes (P1363 format)
      const decoded = Buffer.from(headers.SIGNATRANSM, 'base64');
      expect(decoded.length).toBe(64);
    });

    it('should produce valid hex fingerprint', () => {
      const baseString = createValidBaseString();
      const headers = buildOfficialHeaders(defaultInput, baseString);

      // Fingerprint should be lowercase hex
      expect(headers.EMPRCERTIFTRANSM).toBe(headers.EMPRCERTIFTRANSM.toLowerCase());

      // Should parse as hex without errors
      expect(() => {
        Buffer.from(headers.EMPRCERTIFTRANSM, 'hex');
      }).not.toThrow();

      // Decoded length should be 20 bytes (SHA-1)
      const decoded = Buffer.from(headers.EMPRCERTIFTRANSM, 'hex');
      expect(decoded.length).toBe(20);
    });
  });

  describe('Happy path - ESSAI environment with CASESSAI', () => {
    it('should include CASESSAI when env is ESSAI and caseEssai is provided', () => {
      const inputWithCasEssai: HeaderInput = {
        ...defaultInput,
        env: 'ESSAI',
        caseEssai: '000.000',
      };

      const baseString = createValidBaseString();
      const headers = buildOfficialHeaders(inputWithCasEssai, baseString);

      expect(headers.ENVIRN).toBe('ESSAI');
      expect(headers.CASESSAI).toBe('000.000');
    });

    it('should not include CASESSAI if caseEssai is empty string', () => {
      const inputWithEmptyCasEssai: HeaderInput = {
        ...defaultInput,
        env: 'ESSAI',
        caseEssai: '',
      };

      const baseString = createValidBaseString();
      const headers = buildOfficialHeaders(inputWithEmptyCasEssai, baseString);

      expect(headers.ENVIRN).toBe('ESSAI');
      expect(headers.CASESSAI).toBeUndefined();
    });

    it('should not include CASESSAI if caseEssai is whitespace only', () => {
      const inputWithWhitespaceCasEssai: HeaderInput = {
        ...defaultInput,
        env: 'ESSAI',
        caseEssai: '   ',
      };

      const baseString = createValidBaseString();
      const headers = buildOfficialHeaders(inputWithWhitespaceCasEssai, baseString);

      expect(headers.CASESSAI).toBeUndefined();
    });
  });

  describe('Happy path - PROD environment', () => {
    it('should work with PROD environment', () => {
      const inputProd: HeaderInput = {
        ...defaultInput,
        env: 'PROD',
      };

      const baseString = createValidBaseString();
      const headers = buildOfficialHeaders(inputProd, baseString);

      expect(headers.ENVIRN).toBe('PROD');
      expect(headers.SIGNATRANSM).toHaveLength(88);
      expect(headers.EMPRCERTIFTRANSM).toHaveLength(40);
      expect(headers.CASESSAI).toBeUndefined();
    });
  });

  describe('Validation - Environment', () => {
    it('should throw error for invalid environment', () => {
      const invalidInput = {
        ...defaultInput,
        env: 'INVALID' as any,
      };

      const baseString = createValidBaseString();

      expect(() => buildOfficialHeaders(invalidInput, baseString)).toThrow('env must be DEV, ESSAI, or PROD');
    });

    it('should throw error for missing environment', () => {
      const invalidInput = {
        ...defaultInput,
        env: undefined as any,
      };

      const baseString = createValidBaseString();

      expect(() => buildOfficialHeaders(invalidInput, baseString)).toThrow('env must be DEV, ESSAI, or PROD');
    });
  });

  describe('Validation - Required fields', () => {
    it('should throw error if idApprl is empty', () => {
      const invalidInput: HeaderInput = {
        ...defaultInput,
        idApprl: '',
      };

      const baseString = createValidBaseString();

      expect(() => buildOfficialHeaders(invalidInput, baseString)).toThrow('idApprl is required and cannot be empty');
    });

    it('should throw error if idSev is missing', () => {
      const invalidInput = {
        ...defaultInput,
        idSev: undefined as any,
      };

      const baseString = createValidBaseString();

      expect(() => buildOfficialHeaders(invalidInput, baseString)).toThrow('idSev is required and cannot be empty');
    });

    it('should throw error if codCertif is whitespace only', () => {
      const invalidInput: HeaderInput = {
        ...defaultInput,
        codCertif: '   ',
      };

      const baseString = createValidBaseString();

      expect(() => buildOfficialHeaders(invalidInput, baseString)).toThrow('codCertif is required and cannot be empty');
    });
  });

  describe('Validation - ASCII characters', () => {
    it('should throw error if idApprl contains non-ASCII characters', () => {
      const invalidInput: HeaderInput = {
        ...defaultInput,
        idApprl: 'POS-Montréal', // Contains é
      };

      const baseString = createValidBaseString();

      expect(() => buildOfficialHeaders(invalidInput, baseString)).toThrow('idApprl contains non-ASCII characters');
    });

    it('should throw error if idPartn contains non-ASCII characters', () => {
      const invalidInput: HeaderInput = {
        ...defaultInput,
        idPartn: 'PÂRTNÉR', // Contains non-ASCII
      };

      const baseString = createValidBaseString();

      expect(() => buildOfficialHeaders(invalidInput, baseString)).toThrow('idPartn contains non-ASCII characters');
    });

    it('should throw error if caseEssai contains non-ASCII characters', () => {
      const invalidInput: HeaderInput = {
        ...defaultInput,
        env: 'ESSAI',
        caseEssai: 'Tëst-001', // Contains ë
      };

      const baseString = createValidBaseString();

      expect(() => buildOfficialHeaders(invalidInput, baseString)).toThrow('caseEssai contains non-ASCII characters');
    });
  });

  describe('Validation - baseString format', () => {
    it('should throw error if baseString is empty', () => {
      expect(() => buildOfficialHeaders(defaultInput, '')).toThrow('baseString is required and must be a string');
    });

    it('should throw error if baseString has wrong number of lines', () => {
      const invalidBaseString = 'POST\n/transaction\nhash'; // Only 3 lines

      expect(() => buildOfficialHeaders(defaultInput, invalidBaseString)).toThrow('baseString must have exactly 4 lines');
    });

    it('should throw error if baseString has trailing newline', () => {
      const invalidBaseString = 'POST\n/transaction\nhash\nheaders\n'; // Trailing newline

      expect(() => buildOfficialHeaders(defaultInput, invalidBaseString)).toThrow('baseString must not have a trailing newline');
    });

    it('should throw error if baseString has too many lines', () => {
      const invalidBaseString = 'POST\n/transaction\nhash\nheaders\nextra'; // 5 lines

      expect(() => buildOfficialHeaders(defaultInput, invalidBaseString)).toThrow('baseString must have exactly 4 lines');
    });
  });

  describe('Validation - PEM keys and certificates', () => {
    it('should throw error if privateKeyPem is missing', () => {
      const invalidInput = {
        ...defaultInput,
        privateKeyPem: undefined as any,
      };

      const baseString = createValidBaseString();

      expect(() => buildOfficialHeaders(invalidInput, baseString)).toThrow('privateKeyPem is required and must be a valid PEM key');
    });

    it('should throw error if privateKeyPem is not a PEM format', () => {
      const invalidInput: HeaderInput = {
        ...defaultInput,
        privateKeyPem: 'not-a-pem-key',
      };

      const baseString = createValidBaseString();

      expect(() => buildOfficialHeaders(invalidInput, baseString)).toThrow('privateKeyPem is required and must be a valid PEM key');
    });

    it('should throw error if certPem is missing', () => {
      const invalidInput = {
        ...defaultInput,
        certPem: undefined as any,
      };

      const baseString = createValidBaseString();

      expect(() => buildOfficialHeaders(invalidInput, baseString)).toThrow('certPem is required and must be a valid PEM certificate');
    });

    it('should throw error if certPem is not a certificate PEM format', () => {
      const invalidInput: HeaderInput = {
        ...defaultInput,
        certPem: 'not-a-certificate',
      };

      const baseString = createValidBaseString();

      expect(() => buildOfficialHeaders(invalidInput, baseString)).toThrow('certPem is required and must be a valid PEM certificate');
    });
  });

  describe('Determinism', () => {
    it('should produce valid signatures for same inputs (ECDSA uses random nonce, so signatures differ)', () => {
      const baseString = createValidBaseString();

      const headers1 = buildOfficialHeaders(defaultInput, baseString);
      const headers2 = buildOfficialHeaders(defaultInput, baseString);

      // ECDSA signatures are not deterministic (random k nonce)
      // But both should be valid 88-character Base64 strings
      expect(headers1.SIGNATRANSM).toHaveLength(88);
      expect(headers2.SIGNATRANSM).toHaveLength(88);
      expect(headers1.SIGNATRANSM).toMatch(/^[A-Za-z0-9+/=]+$/);
      expect(headers2.SIGNATRANSM).toMatch(/^[A-Za-z0-9+/=]+$/);

      // NOTE: ECDSA uses random nonce, so signatures will be different
      // This is expected behavior for ECDSA P-256
    });

    it('should produce different SIGNATRANSM for different baseStrings', () => {
      const baseString1 = createValidBaseString();

      // Create different payload
      const payload2 = {
        acti: 'ENR',
        idTrans: 'ORD-TEST-002', // Different transaction ID
        montTot: 5000,
      };

      const canonicalBody2 = canonicalizePayload(payload2);
      const headers2: Partial<WebSrmHeaders> = {
        IDAPPRL: defaultInput.idApprl,
        IDSEV: defaultInput.idSev,
        IDVERSI: defaultInput.idVersi,
        CODCERTIF: defaultInput.codCertif,
        IDPARTN: defaultInput.idPartn,
        VERSI: defaultInput.versi,
        VERSIPARN: defaultInput.versiParn,
        ENVIRN: defaultInput.env,
      };
      const baseString2 = buildCanonicalBaseString('POST', '/transaction', canonicalBody2, headers2);

      const result1 = buildOfficialHeaders(defaultInput, baseString1);
      const result2 = buildOfficialHeaders(defaultInput, baseString2);

      expect(result1.SIGNATRANSM).not.toBe(result2.SIGNATRANSM);
    });

    it('should produce same EMPRCERTIFTRANSM for same certificate', () => {
      const baseString = createValidBaseString();

      const headers1 = buildOfficialHeaders(defaultInput, baseString);
      const headers2 = buildOfficialHeaders(defaultInput, baseString);

      expect(headers1.EMPRCERTIFTRANSM).toBe(headers2.EMPRCERTIFTRANSM);
    });
  });

  describe('Integration - End-to-end flow', () => {
    it('should produce valid headers for complete transaction flow', () => {
      // 1. Create transaction payload
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

      // 2. Canonicalize payload
      const canonicalBody = canonicalizePayload(payload);
      expect(canonicalBody).toContain('"acti":"ENR"');

      // 3. Build base string
      const headers: Partial<WebSrmHeaders> = {
        IDAPPRL: 'POS-DEV-001',
        IDSEV: 'SRS-001',
        IDVERSI: '1.0.0',
        CODCERTIF: 'TESTCODE',
        IDPARTN: 'PARTNER-001',
        VERSI: '1.0.0',
        VERSIPARN: '1.0.0',
        ENVIRN: 'DEV',
      };
      const baseString = buildCanonicalBaseString('POST', '/transaction', canonicalBody, headers);

      // Verify base string format
      const lines = baseString.split('\n');
      expect(lines).toHaveLength(4);
      expect(lines[0]).toBe('POST');
      expect(lines[1]).toBe('/transaction');

      // 4. Build official headers
      const officialHeaders = buildOfficialHeaders(defaultInput, baseString);

      // 5. Verify all headers are present and valid
      expect(officialHeaders.ENVIRN).toBe('DEV');
      expect(officialHeaders.SIGNATRANSM).toHaveLength(88);
      expect(officialHeaders.EMPRCERTIFTRANSM).toHaveLength(40);
      expect(officialHeaders.IDAPPRL).toBe('POS-DEV-001');
      expect(officialHeaders.IDSEV).toBe('SRS-001');
      expect(officialHeaders.IDVERSI).toBe('1.0.0');
      expect(officialHeaders.CODCERTIF).toBe('TESTCODE');
      expect(officialHeaders.IDPARTN).toBe('PARTNER-001');
      expect(officialHeaders.VERSI).toBe('1.0.0');
      expect(officialHeaders.VERSIPARN).toBe('1.0.0');

      // 6. Verify signature is valid Base64
      expect(() => Buffer.from(officialHeaders.SIGNATRANSM, 'base64')).not.toThrow();

      // 7. Verify fingerprint is valid hex
      expect(() => Buffer.from(officialHeaders.EMPRCERTIFTRANSM, 'hex')).not.toThrow();
    });
  });
});
