/**
 * WEB-SRM mTLS Client - Reusable utility for mutual TLS authentication
 *
 * Usage:
 *   const client = createMtlsClient();
 *   const response = await client.post(url, headers, body);
 */

import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';

export interface MtlsConfig {
  keyPath?: string;
  certPath?: string;
  chainPath?: string;
  rejectUnauthorized?: boolean;
  minVersion?: string;
}

export interface MtlsResponse {
  status: number;
  headers: any;
  body: string;
  json?: any;
}

const DEFAULT_CERT_PATHS = {
  key: path.join('tmp', 'certs', 'dev-client.key.pem'),
  cert: path.join('tmp', 'certs', 'dev-client.crt.pem'),
  chain: path.join('tmp', 'certs', 'dev-client.chain.pem'),
};

/**
 * Verify that required mTLS certificate files exist
 */
export function verifyCertificatesExist(config?: MtlsConfig): void {
  const keyPath = config?.keyPath || DEFAULT_CERT_PATHS.key;
  const certPath = config?.certPath || DEFAULT_CERT_PATHS.cert;
  const chainPath = config?.chainPath || DEFAULT_CERT_PATHS.chain;

  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `Private key not found: ${keyPath}\n` +
        'Run enrolment first: pnpm websrm:sw77'
    );
  }
  if (!fs.existsSync(certPath)) {
    throw new Error(
      `Client certificate not found: ${certPath}\n` +
        'Run enrolment first: pnpm websrm:sw77'
    );
  }
  if (!fs.existsSync(chainPath)) {
    throw new Error(
      `CA chain not found: ${chainPath}\n` +
        'Run enrolment first: pnpm websrm:sw77'
    );
  }
}

/**
 * Create HTTPS agent with mTLS configuration
 */
export function createMtlsAgent(config?: MtlsConfig): https.Agent {
  const keyPath = config?.keyPath || DEFAULT_CERT_PATHS.key;
  const certPath = config?.certPath || DEFAULT_CERT_PATHS.cert;
  const chainPath = config?.chainPath || DEFAULT_CERT_PATHS.chain;

  // Verify files exist
  verifyCertificatesExist(config);

  // Load certificates
  const key = fs.readFileSync(keyPath, 'utf8');
  const cert = fs.readFileSync(certPath, 'utf8');
  const ca = fs.readFileSync(chainPath, 'utf8');

  // Create agent with mTLS
  return new https.Agent({
    cert,
    key,
    ca,
    // TEMPORARY: Disable server cert verification
    // RQ's CA chain is self-signed and not in system trust store
    // In production, proper CA bundle should be configured
    // TODO: Get RQ root CA and add to system trust store
    rejectUnauthorized: config?.rejectUnauthorized ?? false,
    minVersion: (config?.minVersion as any) || 'TLSv1.2',
    honorCipherOrder: true,
  });
}

/**
 * Make POST request with mTLS authentication
 */
export async function mtlsPost(
  url: string,
  headers: Record<string, string>,
  body: any,
  config?: MtlsConfig
): Promise<MtlsResponse> {
  const agent = createMtlsAgent(config);
  const parsedUrl = new URL(url);
  const requestBody = typeof body === 'string' ? body : JSON.stringify(body);

  const options: https.RequestOptions = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || 443,
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'POST',
    headers: {
      ...headers,
      'Content-Length': Buffer.byteLength(requestBody),
    },
    agent,
  };

  return new Promise<MtlsResponse>((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const contentType = res.headers['content-type'] || '';
        let jsonData;

        if (contentType.includes('application/json')) {
          try {
            jsonData = JSON.parse(data);
          } catch {
            // Invalid JSON
          }
        }

        resolve({
          status: res.statusCode || 0,
          headers: res.headers,
          body: data,
          json: jsonData,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(requestBody);
    req.end();
  });
}

/**
 * Create mTLS client with bound configuration
 */
export function createMtlsClient(config?: MtlsConfig) {
  // Verify certificates on creation
  verifyCertificatesExist(config);

  return {
    post: (url: string, headers: Record<string, string>, body: any) =>
      mtlsPost(url, headers, body, config),

    getPaths: () => ({
      key: config?.keyPath || DEFAULT_CERT_PATHS.key,
      cert: config?.certPath || DEFAULT_CERT_PATHS.cert,
      chain: config?.chainPath || DEFAULT_CERT_PATHS.chain,
    }),
  };
}

/**
 * Get certificate file paths
 */
export function getCertPaths(): { key: string; cert: string; chain: string } {
  return { ...DEFAULT_CERT_PATHS };
}
