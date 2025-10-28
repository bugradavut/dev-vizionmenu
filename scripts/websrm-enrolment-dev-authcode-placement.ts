/**
 * WEB-SRM DEV Enrolment - Auth Code Placement Test
 *
 * Tests 4 different auth code placements:
 * - DEV-A: No auth code
 * - DEV-B: Auth code in body (codAutori)
 * - DEV-C: Auth code in header (CODAUTORI)
 * - DEV-D: Auth code in header (CODAUTORISATION)
 *
 * Same CSR, same DN, same headers (except auth variations)
 */

import { Crypto } from '@peculiar/webcrypto';
import * as x509 from '@peculiar/x509';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const crypto = new Crypto();
x509.cryptoProvider.set(crypto);

console.log('🧪 WEB-SRM DEV Enrolment - Auth Code Placement Test\n');

// Constants (same for all tests)
const ENDPOINT = 'https://certificats.cnfr.api.rq-fo.ca/enrolement';
const AUTH_CODE = 'D8T8-W8W8';

const BASE_HEADERS = {
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
};

// Fixed DN (same for all tests)
const DN = {
  C: 'CA',
  ST: 'QC',
  L: '-05:00',
  SN: 'Certificat du serveur',
  O: 'RBC-D8T8-W8W8',
  CN: '5678912340',
};

// Test variants
const VARIANTS = [
  {
    name: 'DEV-A',
    description: 'No auth code',
    addToHeaders: {},
    addToBody: {},
  },
  {
    name: 'DEV-B',
    description: 'Body codAutori',
    addToHeaders: {},
    addToBody: { codAutori: AUTH_CODE },
  },
  {
    name: 'DEV-C',
    description: 'Header CODAUTORI',
    addToHeaders: { CODAUTORI: AUTH_CODE },
    addToBody: {},
  },
  {
    name: 'DEV-D',
    description: 'Header CODAUTORISATION',
    addToHeaders: { CODAUTORISATION: AUTH_CODE },
    addToBody: {},
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
 * Build CSR (same for all tests)
 */
async function buildCSR(cryptoKey: CryptoKeyPair): Promise<x509.Pkcs10CertificateRequest> {
  const dnString = `C=${DN.C}, ST=${DN.ST}, L=${DN.L}, 2.5.4.5=${DN.SN}, O=${DN.O}, CN=${DN.CN}`;

  const csr = await x509.Pkcs10CertificateRequestGenerator.create({
    name: dnString,
    keys: cryptoKey,
    signingAlgorithm: {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    extensions: [
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.digitalSignature,
        true
      ),
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
  const lines = [`curl -X POST '${ENDPOINT}' \\`];

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
  csrPEM: string,
  csrHash: string,
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

  // Build headers (base + variant-specific)
  const headers = { ...BASE_HEADERS, ...variant.addToHeaders };

  // Build body (base + variant-specific)
  const requestBody: any = {
    reqCertif: {
      modif: 'AJO',
      csr: csrPEM,
    },
    ...variant.addToBody,
  };

  console.log('   Headers:');
  Object.entries(headers).forEach(([k, v]) => {
    console.log(`     ${k}: ${v}`);
  });
  console.log('   Body keys:', Object.keys(requestBody).join(', '));
  if (requestBody.codAutori) {
    console.log(`     codAutori: ${requestBody.codAutori}`);
  }
  console.log('');

  // Save CSR
  const csrPath = join(outputDir, 'csr.pem');
  writeFileSync(csrPath, csrPEM, 'utf-8');

  // Save hash
  const hashPath = join(outputDir, 'sha256.txt');
  writeFileSync(hashPath, csrHash, 'utf-8');

  // Save request
  const requestPath = join(outputDir, 'request.json');
  writeFileSync(requestPath, JSON.stringify(requestBody, null, 2), 'utf-8');

  // Generate curl
  const curlCommand = generateCurlCommand(headers, requestBody);
  const curlPath = join(outputDir, 'curl.sh');
  writeFileSync(curlPath, `#!/bin/bash\n\n${curlCommand}\n`, 'utf-8');

  console.log(`   ✓ Saved: csr.pem, sha256.txt, request.json, curl.sh\n`);

  // Make request
  console.log('🌐 Calling endpoint...');

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers,
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

    console.log(`   ✓ Saved: response.json\n`);

    // Extract errors
    const errors: any[] = responseData?.retourCertif?.listErr || [];

    if (errors.length > 0) {
      console.log('❌ Errors:');
      errors.forEach((err: any) => {
        console.log(`   [${err.codRetour || 'N/A'}] ${err.id || 'N/A'}: ${err.mess?.substring(0, 100) || 'No message'}`);
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

  console.log(`Timestamp: ${timestamp}`);
  console.log(`Output: tmp/logs/dev-enrolment-${timestamp}/\n`);

  // Generate single CSR (reuse for all tests)
  console.log('🔐 Generating single ECDSA P-256 keypair (shared across all tests)...');
  const cryptoKey = await generateKeyPairP256();

  console.log('📝 Building CSR (shared across all tests)...');
  const csr = await buildCSR(cryptoKey);
  const csrPEM = formatCSRPEM(csr);
  const csrHash = calculateCSRHash(csr);

  console.log(`   DN: C=${DN.C}, ST=${DN.ST}, L=${DN.L}, SN=${DN.SN}, O=${DN.O}, CN=${DN.CN}`);
  console.log(`   KeyUsage: digitalSignature (critical)`);
  console.log(`   ExtendedKeyUsage: NONE`);
  console.log(`   CSR SHA-256: ${csrHash}`);

  const results = [];

  for (const variant of VARIANTS) {
    const result = await testVariant(variant, csrPEM, csrHash, timestamp);
    results.push(result);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80) + '\n');

  // Error pattern analysis
  const has95: string[] = [];
  const has96: string[] = [];
  const noErrors: string[] = [];

  results.forEach((result) => {
    console.log(`${result.variant} (${result.description}): HTTP ${result.status}`);

    if (result.errors.length > 0) {
      console.log('  retourCertif.listErr:');

      const codes = result.errors.map((e) => e.codRetour).filter(Boolean);
      if (codes.includes('95')) has95.push(result.variant);
      if (codes.includes('96')) has96.push(result.variant);

      result.errors.forEach((err: any) => {
        const id = err.id || 'N/A';
        const codRetour = err.codRetour || 'N/A';
        const mess = (err.mess || 'No message').substring(0, 120);
        console.log(`    - id: ${id}, codRetour: ${codRetour}`);
        console.log(`      mess: ${mess}${mess.length >= 120 ? '...' : ''}`);
      });
    } else {
      console.log('  No errors');
      noErrors.push(result.variant);
    }
    console.log('');
  });

  // Pattern analysis
  console.log('='.repeat(80));
  console.log('📈 ERROR PATTERN ANALYSIS');
  console.log('='.repeat(80) + '\n');

  console.log(`Error 95 (codAutori field issue) appears in: ${has95.length > 0 ? has95.join(', ') : 'NONE'}`);
  console.log(`Error 96 (CSR validation issue) appears in: ${has96.length > 0 ? has96.join(', ') : 'NONE'}`);
  console.log(`No errors in: ${noErrors.length > 0 ? noErrors.join(', ') : 'NONE'}\n`);

  if (has96.length === 4) {
    console.log('⚠️  Error 96 appears in ALL variants → CSR format/structure issue');
  }

  if (has95.length === 0) {
    console.log('✅ Error 95 does NOT appear in any variant → auth code placement not the issue');
  } else if (has95.includes('DEV-B')) {
    console.log('⚠️  Error 95 appears when codAutori in body (DEV-B)');
  }

  console.log('');
}

run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
