/**
 * WEB-SRM DEV Enrolment - 2 Variants (Exact Specification)
 *
 * Tests exactly 2 CSR DN variants with exact specifications:
 * - KeyUsage: digitalSignature only (critical)
 * - ExtendedKeyUsage: NONE
 * - DN order: C, ST, L, SN, O, CN
 * - codAutori in body
 */

import { Crypto } from '@peculiar/webcrypto';
import * as x509 from '@peculiar/x509';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const crypto = new Crypto();
x509.cryptoProvider.set(crypto);

console.log('🧪 WEB-SRM DEV Enrolment - 2 Variants (Exact Spec)\n');

// DEV Configuration
const DEV_CONFIG = {
  endpoint: 'https://certificats.cnfr.api.rq-fo.ca/enrolement',
  headers: {
    'Content-Type': 'application/json',
    'ENVIRN': 'DEV',
    'APPRLINIT': 'SRV',
    'CASESSAI': '000.000',
    'VERSIPARN': '0',
    'IDSEV': '0000000000003973',
    'IDVERSI': '00000000000045D6',
    'CODCERTIF': 'FOB201999999',
    'IDPARTN': '0000000000001FF2',
    'VERSI': '0.1.0',
  },
  authCode: 'D8T8-W8W8',
};

// 2 Variants
const VARIANTS = [
  {
    name: 'V1',
    description: 'CN=5678912340',
    dn: {
      C: 'CA',
      ST: 'QC',
      L: '-05:00',
      SN: 'Certificat du serveur',
      O: 'RBC-D8T8-W8W8',
      CN: '5678912340',
    },
  },
  {
    name: 'V2',
    description: 'CN=0000000000001FF2 (partner ID)',
    dn: {
      C: 'CA',
      ST: 'QC',
      L: '-05:00',
      SN: 'Certificat du serveur',
      O: 'RBC-D8T8-W8W8',
      CN: '0000000000001FF2',
    },
  },
];

/**
 * Generate ECDSA P-256 keypair
 */
async function generateKeyPairP256(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify']
  );
}

/**
 * Build CSR with exact specification
 */
async function buildCSR(
  cryptoKey: CryptoKeyPair,
  dn: { C: string; ST: string; L: string; SN: string; O: string; CN: string }
): Promise<x509.Pkcs10CertificateRequest> {
  // DN order: C, ST, L, SN, O, CN
  const dnString = `C=${dn.C}, ST=${dn.ST}, L=${dn.L}, 2.5.4.5=${dn.SN}, O=${dn.O}, CN=${dn.CN}`;

  // KeyUsage: digitalSignature only (critical)
  // ExtendedKeyUsage: NONE
  const csr = await x509.Pkcs10CertificateRequestGenerator.create({
    name: dnString,
    keys: cryptoKey,
    signingAlgorithm: {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    extensions: [
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.digitalSignature, // Only digitalSignature
        true // critical
      ),
      // NO ExtendedKeyUsage
    ],
  });

  return csr;
}

/**
 * Format PEM: 64 column wrapping, LF only
 */
function formatCSRPEM(csr: x509.Pkcs10CertificateRequest): string {
  const raw = csr.toString('pem');
  const headerMatch = raw.match(/-----BEGIN CERTIFICATE REQUEST-----\s*/);
  const footerMatch = raw.match(/\s*-----END CERTIFICATE REQUEST-----/);

  if (!headerMatch || !footerMatch) {
    throw new Error('Invalid PEM format');
  }

  const base64Content = raw
    .substring(headerMatch[0].length, raw.lastIndexOf('-----END CERTIFICATE REQUEST-----'))
    .replace(/\s/g, '');

  const wrapped = base64Content.match(/.{1,64}/g)?.join('\n') || '';

  return `-----BEGIN CERTIFICATE REQUEST-----\n${wrapped}\n-----END CERTIFICATE REQUEST-----\n`;
}

/**
 * Calculate SHA-256 of CSR DER
 */
function calculateCSRHash(csr: x509.Pkcs10CertificateRequest): string {
  const der = Buffer.from(csr.rawData);
  return createHash('sha256').update(der).digest('hex');
}

/**
 * Generate curl command
 */
function generateCurlCommand(headers: Record<string, string>, body: any): string {
  const lines = [`curl -X POST '${DEV_CONFIG.endpoint}' \\`];

  Object.entries(headers).forEach(([key, value]) => {
    lines.push(`  -H '${key}: ${value}' \\`);
  });

  lines.push(`  -d '${JSON.stringify(body, null, 2).replace(/'/g, "'\\''")}'`);

  return lines.join('\n');
}

/**
 * Test one variant
 */
async function testVariant(
  variant: (typeof VARIANTS)[0],
  timestamp: string
): Promise<{
  variant: string;
  description: string;
  status: number;
  errors: any[];
}> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 Testing ${variant.name}: ${variant.description}`);
  console.log(`${'='.repeat(80)}\n`);

  const outputDir = join(
    process.cwd(),
    'tmp',
    'logs',
    `dev-enrolment-${timestamp}`,
    variant.name
  );
  mkdirSync(outputDir, { recursive: true });

  // Generate keypair
  console.log('🔐 Generating ECDSA P-256 keypair...');
  const cryptoKey = await generateKeyPairP256();

  // Build CSR
  console.log('📝 Building CSR...');
  const csr = await buildCSR(cryptoKey, variant.dn);

  // Format PEM
  const csrPEM = formatCSRPEM(csr);

  // Calculate hash
  const csrHash = calculateCSRHash(csr);

  console.log(`   DN: C=${variant.dn.C}, ST=${variant.dn.ST}, L=${variant.dn.L}, SN=${variant.dn.SN}, O=${variant.dn.O}, CN=${variant.dn.CN}`);
  console.log(`   KeyUsage: digitalSignature (critical)`);
  console.log(`   ExtendedKeyUsage: NONE`);
  console.log(`   CSR SHA-256: ${csrHash}`);

  // Save CSR
  const csrPath = join(outputDir, 'csr.pem');
  writeFileSync(csrPath, csrPEM, 'utf-8');
  console.log(`   ✓ Saved: ${csrPath}`);

  // Save hash
  const hashPath = join(outputDir, 'sha256.txt');
  writeFileSync(hashPath, csrHash, 'utf-8');
  console.log(`   ✓ Saved: ${hashPath}`);

  // Build request body
  const requestBody = {
    reqCertif: {
      modif: 'AJO',
      csr: csrPEM,
    },
    codAutori: DEV_CONFIG.authCode,
  };

  // Save request
  const requestPath = join(outputDir, 'request.json');
  writeFileSync(requestPath, JSON.stringify(requestBody, null, 2), 'utf-8');
  console.log(`   ✓ Saved: ${requestPath}`);

  // Generate curl
  const curlCommand = generateCurlCommand(DEV_CONFIG.headers, requestBody);
  const curlPath = join(outputDir, 'curl.sh');
  writeFileSync(curlPath, `#!/bin/bash\n\n${curlCommand}\n`, 'utf-8');
  console.log(`   ✓ Saved: ${curlPath}\n`);

  // Make request
  console.log('🌐 Calling endpoint...');

  try {
    const response = await fetch(DEV_CONFIG.endpoint, {
      method: 'POST',
      headers: DEV_CONFIG.headers,
      body: JSON.stringify(requestBody),
    });

    console.log(`📥 Response: ${response.status} ${response.statusText}\n`);

    const responseText = await response.text();
    const contentType = response.headers.get('content-type');

    let responseData: any;
    if (contentType?.includes('application/json')) {
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { rawText: responseText };
      }
    } else {
      responseData = { rawText: responseText };
    }

    // Save response
    const responsePath = join(outputDir, 'response.json');
    writeFileSync(
      responsePath,
      JSON.stringify(
        {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseData,
        },
        null,
        2
      ),
      'utf-8'
    );
    console.log(`   ✓ Saved: ${responsePath}\n`);

    // Extract errors
    const errors: any[] = responseData?.retourCertif?.listErr || [];

    if (errors.length > 0) {
      console.log('❌ Errors:');
      errors.forEach((err: any) => {
        console.log(`   [${err.codRetour || 'N/A'}] ${err.id || 'N/A'}: ${err.mess || 'No message'}`);
      });
      console.log('');
    } else if (response.ok) {
      console.log('✅ Success (no errors)\n');
    }

    return {
      variant: variant.name,
      description: variant.description,
      status: response.status,
      errors,
    };
  } catch (error: any) {
    console.error(`❌ Network error: ${error.message}\n`);

    const responsePath = join(outputDir, 'response.json');
    writeFileSync(
      responsePath,
      JSON.stringify({ error: error.message, stack: error.stack }, null, 2),
      'utf-8'
    );

    return {
      variant: variant.name,
      description: variant.description,
      status: 0,
      errors: [{ mess: error.message }],
    };
  }
}

/**
 * Main
 */
async function run() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const results = [];

  console.log(`Timestamp: ${timestamp}`);
  console.log(`Output: tmp/logs/dev-enrolment-${timestamp}/\n`);

  for (const variant of VARIANTS) {
    const result = await testVariant(variant, timestamp);
    results.push(result);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80) + '\n');

  results.forEach((result) => {
    console.log(`${result.variant} (${result.description}): HTTP ${result.status}`);
    if (result.errors.length > 0) {
      console.log('  retourCertif.listErr:');
      result.errors.forEach((err: any) => {
        const id = err.id || 'N/A';
        const codRetour = err.codRetour || 'N/A';
        const mess = err.mess || 'No message';
        console.log(`    - id: ${id}, codRetour: ${codRetour}`);
        console.log(`      mess: ${mess}`);
      });
    } else {
      console.log('  No errors');
    }
    console.log('');
  });
}

run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
