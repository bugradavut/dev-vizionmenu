/**
 * WEB-SRM Official HTTP Headers Builder
 *
 * Builds WEB-SRM compliant HTTP headers for API requests
 * Based on SW-73 specification
 *
 * Required headers:
 * - ENVIRN: Environment (DEV | ESSAI | PROD)
 * - CASESSAI: Test case number (only for ESSAI env)
 * - IDAPPRL: Device/terminal ID
 * - IDSEV: SRS (Sales Recording System) ID
 * - IDVERSI: Software version ID
 * - CODCERTIF: Certification code from Revenu Québec
 * - IDPARTN: Partner ID
 * - VERSI: Software version
 * - VERSIPARN: Partner version
 * - SIGNATRANSM: Transaction signature (ECDSA P-256 P1363 Base64)
 * - EMPRCERTIFTRANSM: Certificate fingerprint (SHA-1 hex)
 *
 * Phase 4: Skeleton with TODOs
 * Phase 5: Full implementation
 */

import { signP256P1363, fingerprintSha1 } from './signature-ecdsa';

/**
 * Input configuration for building WEB-SRM headers
 */
export interface HeaderInput {
  /** Environment: DEV (development), ESSAI (test), PROD (production) */
  env: 'DEV' | 'ESSAI' | 'PROD';

  /** Test case number (required for ESSAI, ignored otherwise) */
  caseEssai?: string;

  /** Device/terminal ID (alphanumeric, max 50 chars) */
  idApprl: string;

  /** SRS (Sales Recording System) ID */
  idSev: string;

  /** Software version ID */
  idVersi: string;

  /** Partner ID */
  idPartn: string;

  /** Certification code from Revenu Québec */
  codCertif: string;

  /** Software version (semver format) */
  versi: string;

  /** Partner version */
  versiParn: string;

  /** ECDSA P-256 private key in PEM format (for signing) */
  privateKeyPem: string;

  /** X.509 certificate in PEM format (for fingerprint) */
  certPem: string;
}

/**
 * WEB-SRM HTTP headers
 */
export interface WebSrmHeaders {
  ENVIRN: string;
  CASESSAI?: string;
  APPRLINIT: string; // Device type that initiated request (SRV = Serveur/Server)
  IDAPPRL: string;
  IDSEV: string;
  IDVERSI: string;
  CODCERTIF: string;
  IDPARTN: string;
  VERSI: string;
  VERSIPARN: string;
  SIGNATRANSM: string;
  EMPRCERTIFTRANSM: string;
}

/**
 * Build official WEB-SRM HTTP headers
 *
 * TODO Phase 5:
 * - Validate input fields (length, format)
 * - Compute SIGNATRANSM from baseString
 * - Compute EMPRCERTIFTRANSM from certificate
 * - Handle CASESSAI for ESSAI environment
 * - Add Content-Type, Accept, etc. if needed
 *
 * @param input - Header configuration
 * @param baseString - Canonical string to sign (constructed from request payload)
 * @returns WEB-SRM compliant HTTP headers
 *
 * @example
 * const headers = buildOfficialHeaders({
 *   env: 'DEV',
 *   idApprl: 'POS-001',
 *   idSev: 'SRS-001',
 *   idVersi: '1.0.0',
 *   codCertif: 'CERT-12345',
 *   idPartn: 'PARTNER-001',
 *   versi: '1.0.0',
 *   versiParn: '1.0.0',
 *   privateKeyPem: '-----BEGIN PRIVATE KEY-----...',
 *   certPem: '-----BEGIN CERTIFICATE-----...',
 * }, 'baseStringFromPayload');
 */
export function buildOfficialHeaders(
  input: HeaderInput,
  baseString: string
): WebSrmHeaders {
  // Validate environment
  if (!input.env || !['DEV', 'ESSAI', 'PROD'].includes(input.env)) {
    throw new Error(`env must be DEV, ESSAI, or PROD, got: ${input.env}`);
  }

  // Validate required string fields (must be non-empty ASCII)
  // Required fields (idApprl is optional - only for enrolment, not transaction)
  const requiredFields = {
    idSev: input.idSev,
    idVersi: input.idVersi,
    codCertif: input.codCertif,
    idPartn: input.idPartn,
    versi: input.versi,
    versiParn: input.versiParn,
  } as const;

  for (const [key, value] of Object.entries(requiredFields)) {
    if (!value || typeof value !== 'string' || value.trim() === '') {
      throw new Error(`${key} is required and cannot be empty`);
    }

    // Validate ASCII
    for (let i = 0; i < value.length; i++) {
      if (value.charCodeAt(i) > 0x7f) {
        throw new Error(`${key} contains non-ASCII characters: ${value}`);
      }
    }
  }

  // Validate idApprl separately (optional, but must be ASCII if provided)
  if (input.idApprl && typeof input.idApprl === 'string' && input.idApprl.trim() !== '') {
    for (let i = 0; i < input.idApprl.length; i++) {
      if (input.idApprl.charCodeAt(i) > 0x7f) {
        throw new Error(`idApprl contains non-ASCII characters: ${input.idApprl}`);
      }
    }
  }

  // Validate baseString format (must have exactly 4 lines, 3 newlines)
  if (!baseString || typeof baseString !== 'string') {
    throw new Error('baseString is required and must be a string');
  }

  // Check trailing newline BEFORE split (split will create extra empty element)
  if (baseString.endsWith('\n')) {
    throw new Error('baseString must not have a trailing newline');
  }

  const lines = baseString.split('\n');
  if (lines.length !== 4) {
    throw new Error(`baseString must have exactly 4 lines (3 newlines), got ${lines.length} lines`);
  }

  // Validate PEM keys/certs
  if (!input.privateKeyPem || !input.privateKeyPem.includes('-----BEGIN')) {
    throw new Error('privateKeyPem is required and must be a valid PEM key');
  }

  if (!input.certPem || !input.certPem.includes('-----BEGIN CERTIFICATE-----')) {
    throw new Error('certPem is required and must be a valid PEM certificate');
  }

  // Compute signature: SIGNATRANSM = signP256P1363(baseString, privateKeyPem)
  const signature = signP256P1363(baseString, input.privateKeyPem);

  // Validate signature length (must be 88 Base64 characters)
  if (signature.length !== 88) {
    throw new Error(`SIGNATRANSM must be 88 characters, got ${signature.length}`);
  }

  // Compute fingerprint: EMPRCERTIFTRANSM = fingerprintSha1(certPem)
  const fingerprint = fingerprintSha1(input.certPem);

  // Validate fingerprint length (must be 40 hex characters)
  if (fingerprint.length !== 40) {
    throw new Error(`EMPRCERTIFTRANSM must be 40 characters, got ${fingerprint.length}`);
  }

  // Build headers object
  const headers: WebSrmHeaders = {
    ENVIRN: input.env,
    APPRLINIT: 'SRV', // Device type: SRV = Serveur (Server) - per Quebec specification
    IDSEV: input.idSev,
    IDVERSI: input.idVersi,
    CODCERTIF: input.codCertif,
    IDPARTN: input.idPartn,
    VERSI: input.versi,
    VERSIPARN: input.versiParn,
    SIGNATRANSM: signature,
    EMPRCERTIFTRANSM: fingerprint,
  } as any;

  // IDAPPRL: Only add if not empty (transaction endpoint excludes this header)
  if (input.idApprl && input.idApprl.trim() !== '') {
    headers.IDAPPRL = input.idApprl;
  }

  // Add CASESSAI if present (optional, only for ESSAI environment)
  if (input.caseEssai && typeof input.caseEssai === 'string' && input.caseEssai.trim() !== '') {
    // Validate ASCII
    for (let i = 0; i < input.caseEssai.length; i++) {
      if (input.caseEssai.charCodeAt(i) > 0x7f) {
        throw new Error(`caseEssai contains non-ASCII characters: ${input.caseEssai}`);
      }
    }
    headers.CASESSAI = input.caseEssai;
  }

  return headers;
}

/**
 * Validate header input configuration
 *
 * TODO Phase 5: Implement validation
 * - Check required fields are present
 * - Validate field formats and lengths
 * - Validate environment value
 * - Validate CASESSAI for ESSAI env
 *
 * @param input - Header configuration to validate
 * @returns Validation result with errors if any
 */
export function validateHeaderInput(input: Partial<HeaderInput>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // TODO Phase 5: Add validation rules
  // Example:
  // if (!input.env || !['DEV', 'ESSAI', 'PROD'].includes(input.env)) {
  //   errors.push('env must be DEV, ESSAI, or PROD');
  // }
  // if (!input.idApprl || input.idApprl.length > 50) {
  //   errors.push('idApprl is required and must be ≤50 characters');
  // }
  // ... etc

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Build canonical base string for WEB-SRM signature
 *
 * Format (4 lines, 3 newlines, no trailing newline):
 * ```
 * <METHOD>\n
 * <PATH>\n
 * <SHA256_HEX_OF_CANONICAL_BODY>\n
 * <HEADER_LIST>
 * ```
 *
 * Header list format (semicolon-separated, fixed order):
 * `IDAPPRL=...;IDSEV=...;IDVERSI=...;CODCERTIF=...;IDPARTN=...;VERSI=...;VERSIPARN=...;ENVIRN=...;CASESSAI=...?`
 *
 * Rules:
 * - METHOD: Always 'POST' (uppercase)
 * - PATH: Full path without domain (e.g., '/transaction')
 * - Body hash: SHA-256 of canonical payload (lowercase hex, 64 chars)
 * - Header order: Fixed as specified above
 * - CASESSAI: Only included if present in headers (at end)
 * - Empty values: Throw error (all fields must have values)
 * - ASCII-only: All values must be ASCII (sanitized if needed)
 * - No trailing newline after header list
 *
 * @param method - HTTP method ('POST')
 * @param path - Request path ('/transaction', '/cancellation', etc.)
 * @param canonicalBody - Canonical JSON body (from canonicalizePayload())
 * @param headers - Header values (without SIGNATRANSM and EMPRCERTIFTRANSM)
 * @returns Canonical base string for signing
 *
 * @throws {Error} If required headers are missing or empty
 *
 * @example
 * const baseString = buildCanonicalBaseString(
 *   'POST',
 *   '/transaction',
 *   '{"acti":"ENR","desc":[...],...}',
 *   {
 *     IDAPPRL: 'POS-DEV-001',
 *     IDSEV: 'SRS-001',
 *     IDVERSI: '1.0.0',
 *     CODCERTIF: 'TESTCODE',
 *     IDPARTN: 'PARTNER-001',
 *     VERSI: '1.0.0',
 *     VERSIPARN: '1.0.0',
 *     ENVIRN: 'DEV',
 *   }
 * );
 * // => 'POST\n/transaction\n<sha256_hex>\nIDAPPRL=POS-DEV-001;IDSEV=SRS-001;...'
 */
export function buildCanonicalBaseString(
  method: string,
  path: string,
  canonicalBody: string,
  headers: Partial<WebSrmHeaders>
): string {
  // Import crypto for SHA-256
  const { createHash } = require('crypto');

  // Validate method (must be uppercase POST)
  const upperMethod = method.toUpperCase();
  if (upperMethod !== 'POST') {
    throw new Error(`Only POST method is supported, got: ${method}`);
  }

  // Validate path (must start with /)
  if (!path || !path.startsWith('/')) {
    throw new Error(`Path must start with '/', got: ${path}`);
  }

  // Compute SHA-256 hash of canonical body (lowercase hex)
  const bodyHash = createHash('sha256')
    .update(canonicalBody, 'utf8')
    .digest('hex')
    .toLowerCase();

  // Build header list in fixed order
  // NOTE: IDAPPRL removed from required list - only used for enrolment, not transaction
  const requiredHeaders = [
    'IDSEV',
    'IDVERSI',
    'CODCERTIF',
    'IDPARTN',
    'VERSI',
    'VERSIPARN',
    'ENVIRN',
  ] as const;

  const headerPairs: string[] = [];

  // Add IDAPPRL first if present (optional for transaction endpoint)
  if (headers.IDAPPRL && typeof headers.IDAPPRL === 'string' && headers.IDAPPRL.trim() !== '') {
    const idapprl = headers.IDAPPRL;

    // Validate ASCII
    for (let i = 0; i < idapprl.length; i++) {
      if (idapprl.charCodeAt(i) > 0x7f) {
        throw new Error(`Header IDAPPRL contains non-ASCII characters: ${idapprl}`);
      }
    }

    headerPairs.push(`IDAPPRL=${idapprl}`);
  }

  for (const key of requiredHeaders) {
    const value = headers[key];
    if (!value || typeof value !== 'string' || value.trim() === '') {
      throw new Error(`Required header ${key} is missing or empty`);
    }

    // Validate ASCII (basic check - no non-ASCII chars)
    for (let i = 0; i < value.length; i++) {
      if (value.charCodeAt(i) > 0x7f) {
        throw new Error(`Header ${key} contains non-ASCII characters: ${value}`);
      }
    }

    headerPairs.push(`${key}=${value}`);
  }

  // Add CASESSAI if present (optional, at the end)
  if (headers.CASESSAI && typeof headers.CASESSAI === 'string' && headers.CASESSAI.trim() !== '') {
    const casessai = headers.CASESSAI;

    // Validate ASCII
    for (let i = 0; i < casessai.length; i++) {
      if (casessai.charCodeAt(i) > 0x7f) {
        throw new Error(`Header CASESSAI contains non-ASCII characters: ${casessai}`);
      }
    }

    headerPairs.push(`CASESSAI=${casessai}`);
  }

  const headerList = headerPairs.join(';');

  // Build canonical base string (4 lines, 3 newlines, no trailing newline)
  return `${upperMethod}\n${path}\n${bodyHash}\n${headerList}`;
}
