/**
 * WEB-SRM HTTP Client - Phase 7
 *
 * Purpose: POST transactions to WEB-SRM API (mock or real)
 * Security: NO auto-retry (handled by queue worker)
 * Network: Controlled by WEBSRM_NETWORK_ENABLED flag
 *
 * IMPORTANT:
 * - Timeout: 30 seconds default
 * - NO automatic retries (queue worker handles retry logic)
 * - Parses JSON/text responses
 * - Returns raw HTTP response for error mapping
 * - Uses https module for mTLS (mutual TLS) support
 */

import { createHash } from 'crypto';
import https from 'https';
import { URL } from 'url';

export interface WebSrmClientConfig {
  baseUrl: string; // e.g., 'https://websrm-dev.revenuquebec.ca' or 'http://localhost:3001'
  timeout?: number; // milliseconds (default: 30000)
  env: 'DEV' | 'ESSAI' | 'PROD';
  casEssai?: string; // ESSAI test case code (e.g., '000.000')
  // mTLS client certificate (required for Quebec API)
  certPem?: string; // Client certificate PEM
  keyPem?: string; // Client private key PEM
}

export interface WebSrmResponse {
  success: boolean;
  httpStatus: number;
  body?: any; // Parsed JSON or raw text
  rawBody?: string; // Original response body
  headers?: Record<string, string>;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * POST transaction to WEB-SRM API
 *
 * @param config - Client configuration (baseUrl, timeout, env)
 * @param path - API path (e.g., '/transaction')
 * @param bodyCanonical - Canonical JSON string (already serialized)
 * @param headers - HTTP headers (including SIGNATRANSM, EMPRCERTIFTRANSM, etc.)
 * @param idempotencyKey - Optional idempotency key (for duplicate detection)
 * @returns WebSrmResponse with parsed body and status
 *
 * @throws Never throws - always returns response object with error details
 *
 * @example
 * const response = await postTransaction(
 *   { baseUrl: 'https://websrm-dev.revenuquebec.ca', env: 'DEV' },
 *   '/transaction',
 *   canonicalJson,
 *   { 'SIGNATRANSM': '...', 'IDAPPRL': '...' },
 *   'idem-key-123'
 * );
 */
export async function postTransaction(
  config: WebSrmClientConfig,
  path: string,
  bodyCanonical: string,
  headers: Record<string, string>,
  idempotencyKey?: string
): Promise<WebSrmResponse> {
  const url = `${config.baseUrl}${path}`;
  const timeout = config.timeout || 30000; // 30 seconds default

  // Prepare headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Accept': 'application/json',
    ...headers,
  };

  // Add idempotency key if provided
  if (idempotencyKey) {
    requestHeaders['X-Idempotency-Key'] = idempotencyKey;
  }

  // CASESSAI header: ONLY for enrolment/annulation/modification, NOT for transaction
  // if (config.env === 'ESSAI' && config.casEssai) {
  //   requestHeaders['CASESSAI'] = config.casEssai;
  // }

  // DEBUG: Log the FULL request body being sent
  console.log('[WEB-SRM] 📤 FULL Request Body:');
  console.log(JSON.stringify(JSON.parse(bodyCanonical), null, 2));

  // Parse URL
  const parsedUrl = new URL(url);

  // Configure mTLS (mutual TLS) with client certificate
  const httpsOptions: https.RequestOptions = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || 443,
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'POST',
    headers: requestHeaders,
    timeout,
  };

  // Add client certificate for mTLS (required by Quebec API)
  if (config.certPem && config.keyPem) {
    httpsOptions.cert = config.certPem;
    httpsOptions.key = config.keyPem;
    httpsOptions.rejectUnauthorized = true; // Verify server certificate
  }

  return new Promise<WebSrmResponse>((resolve) => {
    let timedOut = false;

    const req = https.request(httpsOptions, (res) => {
      const chunks: Buffer[] = [];

      // Collect response data
      res.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      // Response complete
      res.on('end', () => {
        if (timedOut) return; // Ignore if already timed out

        const rawBody = Buffer.concat(chunks).toString('utf8');

        // Try to parse as JSON
        let parsedBody: any;
        try {
          parsedBody = JSON.parse(rawBody);
        } catch {
          // If not JSON, keep as text
          parsedBody = rawBody;
        }

        // Extract response headers
        const responseHeaders: Record<string, string> = {};
        if (res.headers) {
          Object.entries(res.headers).forEach(([key, value]) => {
            if (typeof value === 'string') {
              responseHeaders[key] = value;
            } else if (Array.isArray(value)) {
              responseHeaders[key] = value.join(', ');
            }
          });
        }

        // Check if successful
        const httpStatus = res.statusCode || 0;
        const success = httpStatus >= 200 && httpStatus < 300;

        // Log all responses for debugging
        if (!success) {
          console.error('[WEB-SRM] ❌ Quebec API Error Response:');
          console.error('  Status:', httpStatus);
          console.error('  Body:', JSON.stringify(parsedBody, null, 2));
          console.error('  Response Headers:', JSON.stringify(responseHeaders, null, 2));
          console.error('  Request Headers:', JSON.stringify(requestHeaders, null, 2));
        } else {
          console.log('[WEB-SRM] ✅ Quebec API Success Response:');
          console.log('  Status:', httpStatus);
          console.log('  Body:', JSON.stringify(parsedBody, null, 2));
        }

        resolve({
          success,
          httpStatus,
          body: parsedBody,
          rawBody,
          headers: responseHeaders,
        });
      });
    });

    // Handle request timeout
    req.setTimeout(timeout, () => {
      timedOut = true;
      req.destroy();
      resolve({
        success: false,
        httpStatus: 0,
        error: {
          code: 'TIMEOUT',
          message: `Request timeout after ${timeout}ms`,
        },
      });
    });

    // Handle request errors (network, DNS, TLS, etc.)
    req.on('error', (error: any) => {
      if (timedOut) return; // Ignore if already timed out

      resolve({
        success: false,
        httpStatus: 0,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || 'Network request failed',
        },
      });
    });

    // Write request body
    req.write(bodyCanonical);
    req.end();
  });
}

/**
 * Generate idempotency key for transaction
 *
 * Format: SHA-256(env|tenant|order|timestamp|signature|amount)
 * This ensures same transaction won't be processed twice across environments
 *
 * Phase 9.1: Added env to prevent DEV/ESSAI collision on same order
 *
 * @param env - Environment (DEV, ESSAI, PROD)
 * @param tenantId - Tenant ID
 * @param orderId - Order ID
 * @param timestamp - Transaction timestamp (ISO)
 * @param signature - signa_actu (88 base64)
 * @param totalAmount - Total amount in cents
 * @returns 64-char hex idempotency key
 *
 * @example
 * const key = generateIdempotencyKey(
 *   'ESSAI',
 *   'tenant-123',
 *   'order-456',
 *   '2025-01-09T12:00:00Z',
 *   'ABC123...==',
 *   150000
 * );
 * // key = 'a1b2c3d4...' (64 hex chars)
 */
export function generateIdempotencyKey(
  env: string,
  tenantId: string,
  orderId: string,
  timestamp: string,
  signature: string,
  totalAmount: number
): string {
  const input = `${env}|${tenantId}|${orderId}|${timestamp}|${signature}|${totalAmount}`;
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Check if network is enabled for WEB-SRM
 * @returns true if network calls are allowed
 */
export function isNetworkEnabled(): boolean {
  // Network disabled in production (hard block)
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  // Network disabled by default
  return process.env.WEBSRM_NETWORK_ENABLED === 'true';
}

/**
 * Get WEB-SRM base URL from environment
 * @param env - Environment (DEV, ESSAI, PROD)
 * @returns Base URL for WEB-SRM API
 */
export function getWebSrmBaseUrl(env: 'DEV' | 'ESSAI' | 'PROD'): string {
  // Check for explicit override (mock server)
  if (process.env.WEBSRM_BASE_URL) {
    return process.env.WEBSRM_BASE_URL;
  }

  // Default URLs (FO-Framework official endpoints)
  switch (env) {
    case 'DEV':
      return 'https://cnfr.api.rq-fo.ca';
    case 'ESSAI':
      return 'https://cnfr.api.rq-fo.ca';
    case 'PROD':
      return 'https://cnfr.api.rq-fo.ca';
    default:
      throw new Error(`[WEB-SRM] Invalid environment: ${env}`);
  }
}
