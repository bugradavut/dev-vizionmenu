/**
 * WEB-SRM Request Body Signature Chain
 *
 * WEB-SRM requires a signature chain in the request body:
 * - signa.preced: Previous transaction's signature (or placeholder for first)
 * - signa.actu: Current transaction's signature
 *
 * This creates an immutable chain of transactions, ensuring integrity
 * and preventing tampering with historical records.
 *
 * Signature format: ECDSA P-256 P1363, Base64 encoded (88 characters)
 *
 * Phase 4: Skeleton with TODOs
 * Phase 5: Full implementation
 */

/**
 * Signature pair for request body
 */
export interface SignaturePair {
  /** Previous transaction signature (88 chars) or placeholder ('=' * 88) */
  preced: string;
  /** Current transaction signature (88 chars) */
  actu: string;
}

/**
 * Result of body signature computation
 */
export interface BodySignatureResult {
  /** Previous transaction signature (88 chars) or placeholder ('=' * 88) */
  preced: string;
  /** Current transaction signature (88 chars Base64) */
  actu: string;
  /** Canonical JSON string (deterministic, minified) */
  canonical: string;
  /** SHA-256 hash of canonical string (lowercase hex, 64 chars) */
  sha256Hex: string;
}

/**
 * Options for computing body signatures
 */
export interface BodySignatureOptions {
  /** ECDSA P-256 private key in PEM format (for signing) */
  privateKeyPem: string;
  /** Previous transaction's 'actu' signature (optional, 88 Base64 chars) */
  previousActu?: string;
}

/**
 * Compute body signature pair with canonical payload and hash
 *
 * Phase 5.4 implementation:
 * - Canonicalizes payload (deterministic JSON)
 * - Computes SHA-256 hash of canonical string
 * - Signs canonical string with ECDSA P-256 P1363
 * - Returns signature chain (preced, actu) and metadata
 *
 * Rules:
 * - First transaction: preced = '=' * 88 (placeholder)
 * - Subsequent transactions: preced = previous transaction's actu
 * - actu: ECDSA P-256 P1363 signature of canonical string (NOT hash)
 * - No double hashing: canonical string is signed directly
 *
 * @param payload - Transaction request payload (plain object)
 * @param opts - Signature options (privateKeyPem, previousActu)
 * @returns Signature pair with canonical string and hash
 *
 * @throws {Error} If privateKeyPem is invalid or previousActu is not 88 chars
 *
 * @example
 * // First transaction
 * const result1 = computeBodySignatures({ acti: 'ENR', montTot: 3068 }, {
 *   privateKeyPem: '-----BEGIN PRIVATE KEY-----...',
 * });
 * console.log(result1.preced); // '======...==' (88 chars)
 * console.log(result1.actu);   // 'Aq3f8...' (88 chars Base64)
 * console.log(result1.canonical); // '{"acti":"ENR","montTot":3068}'
 * console.log(result1.sha256Hex); // 'a3f2...' (64 hex chars)
 *
 * // Second transaction (chain)
 * const result2 = computeBodySignatures({ acti: 'ENR', montTot: 5000 }, {
 *   privateKeyPem: '-----BEGIN PRIVATE KEY-----...',
 *   previousActu: result1.actu,
 * });
 * console.log(result2.preced); // Same as result1.actu (chain link)
 * console.log(result2.actu);   // New signature (different payload)
 */
export function computeBodySignatures(
  payload: unknown,
  opts: BodySignatureOptions
): BodySignatureResult {
  // Import crypto and signature functions
  const { createHash } = require('crypto');
  const { signP256P1363 } = require('./signature-ecdsa');

  // Validate privateKeyPem
  if (!opts.privateKeyPem || typeof opts.privateKeyPem !== 'string') {
    throw new Error('privateKeyPem is required and must be a string');
  }

  if (!opts.privateKeyPem.includes('-----BEGIN')) {
    throw new Error('privateKeyPem must be a valid PEM key');
  }

  // Validate previousActu if provided
  if (opts.previousActu !== undefined) {
    if (typeof opts.previousActu !== 'string' || opts.previousActu.length !== 88) {
      throw new Error('previousActu must be exactly 88 Base64 characters');
    }

    // Basic Base64 validation
    if (!/^[A-Za-z0-9+/=]+$/.test(opts.previousActu)) {
      throw new Error('previousActu must be valid Base64');
    }
  }

  // 1. Canonicalize payload (uses canonicalizePayload from this file)
  const canonical = canonicalizePayload(payload);

  // 2. Compute SHA-256 hash of canonical string
  const sha256Hex = createHash('sha256')
    .update(canonical, 'utf8')
    .digest('hex')
    .toLowerCase();

  // 3. Sign canonical string directly (NO double hashing)
  // Note: We sign the canonical JSON string itself, not the hash
  const actu = signP256P1363(canonical, opts.privateKeyPem);

  // Validate signature length
  if (actu.length !== 88) {
    throw new Error(`Generated signature must be 88 characters, got ${actu.length}`);
  }

  // 4. Determine preced (previous signature or placeholder)
  const preced = opts.previousActu || '='.repeat(88);

  return {
    preced,
    actu,
    canonical,
    sha256Hex,
  };
}

/**
 * Build canonical payload string for signing
 *
 * Produces deterministic JSON for WEB-SRM signature computation:
 * - Sort object keys alphabetically (recursive, all levels)
 * - No whitespace in JSON output (minified)
 * - Remove undefined fields
 * - Reject float numbers (only integers allowed)
 * - Sanitize non-ASCII strings to ASCII
 * - Arrays maintain original order (no sorting)
 * - null, true, false preserved as-is
 *
 * @param payload - Transaction request payload (plain object)
 * @returns Canonical JSON string (deterministic, minified)
 *
 * @throws {Error} If payload contains float numbers or invalid types
 *
 * @example
 * const payload = { montTot: 3068, idTrans: "ORD-001", desc: [...] };
 * const canonical = canonicalizePayload(payload);
 * // => '{"acti":"ENR","desc":[...],"idTrans":"ORD-001",...}'
 */
export function canonicalizePayload(payload: any): string {
  // Import ASCII sanitization from core (will be resolved at build time)
  // Note: This import is safe for Phase 5.2 as it's only used in adapter files (not runtime)
  const sanitizeAscii = (text: string): string => {
    // Inline ASCII sanitization to avoid import complexity
    // This is a simplified version of core's sanitizeAscii
    const replacements: Record<string, string> = {
      'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a',
      'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
      'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
      'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
      'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
      'ý': 'y', 'ÿ': 'y',
      'ñ': 'n', 'ç': 'c',
      'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A',
      'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
      'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
      'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O',
      'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U',
      'Ý': 'Y', 'Ÿ': 'Y',
      'Ñ': 'N', 'Ç': 'C',
    };

    let sanitized = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const code = char.charCodeAt(0);

      if (code <= 0x7f) {
        sanitized += char;
      } else if (replacements[char]) {
        sanitized += replacements[char];
      }
    }
    return sanitized;
  };

  /**
   * Deep canonicalize: recursively sort keys and validate types
   */
  function canonicalize(value: any): any {
    // Handle null explicitly
    if (value === null) {
      return null;
    }

    // Handle undefined (skip in output)
    if (value === undefined) {
      return undefined;
    }

    // Handle primitives
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      // Reject float numbers - only integers allowed
      if (!Number.isInteger(value)) {
        throw new Error(`Float numbers not allowed in payload: ${value}. Use integers (cents) instead.`);
      }
      return value;
    }

    if (typeof value === 'string') {
      // Sanitize non-ASCII strings
      const sanitized = sanitizeAscii(value);
      return sanitized;
    }

    // Handle arrays (maintain order, canonicalize elements)
    if (Array.isArray(value)) {
      return value.map((item) => canonicalize(item));
    }

    // Handle objects (sort keys, canonicalize values)
    if (typeof value === 'object') {
      const sortedKeys = Object.keys(value).sort();
      const canonical: Record<string, any> = {};

      for (const key of sortedKeys) {
        const canonicalValue = canonicalize(value[key]);
        // Skip undefined values
        if (canonicalValue !== undefined) {
          canonical[key] = canonicalValue;
        }
      }

      return canonical;
    }

    // Unsupported type
    throw new Error(`Unsupported type in payload: ${typeof value}`);
  }

  // Canonicalize and stringify (minified, no whitespace)
  const canonicalPayload = canonicalize(payload);
  return JSON.stringify(canonicalPayload);
}

/**
 * Validate signature pair
 *
 * TODO Phase 5: Implement validation
 * - Check signature lengths (both must be 88 chars)
 * - Check signature format (Base64)
 * - Optional: Verify ECDSA signature
 *
 * @param sigs - Signature pair to validate
 * @returns Validation result
 */
export function validateSignaturePair(sigs: SignaturePair): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // TODO Phase 5: Add validation rules
  // Example:
  // if (sigs.preced.length !== 88) {
  //   errors.push('preced must be 88 characters');
  // }
  // if (sigs.actu.length !== 88) {
  //   errors.push('actu must be 88 characters');
  // }
  // if (!/^[A-Za-z0-9+/=]+$/.test(sigs.actu)) {
  //   errors.push('actu must be valid Base64');
  // }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Retrieve previous transaction signature from storage
 *
 * TODO Phase 5: Implement storage retrieval
 * - Query database for last successful transaction
 * - Return its 'actu' signature
 * - Handle case where no previous transaction exists
 * - Handle branch-specific chains (multi-tenant)
 *
 * @param branchId - Branch ID for multi-tenant support
 * @returns Previous signature or undefined if first transaction
 */
export async function getPreviousSignature(branchId: string): Promise<string | undefined> {
  // TODO Phase 5: Implement database query
  // For now, return undefined (no previous transaction)

  // Real implementation will:
  // 1. Query websrm_transactions table
  // 2. Filter by branch_id and status = 'completed'
  // 3. Order by created_at DESC
  // 4. LIMIT 1
  // 5. Return signature_actu field

  return undefined; // Stub
}
