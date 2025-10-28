/**
 * WEB-SRM DEV Enrolment - Opus Final Test
 *
 * Single clean test with exact Opus-specified configuration:
 * - RBC template DN with OU/GN
 * - KeyUsage: digitalSignature (critical)
 * - NO EKU
 * - NO codAutori in body
 */

import { Crypto } from '@peculiar/webcrypto';
import * as x509 from '@peculiar/x509';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const crypto = new Crypto();
x509.cryptoProvider.set(crypto);

console.log('🧪 WEB-SRM DEV Enrolment - Opus Final Test\n');

// Exact configuration from Opus
const ENDPOINT = 'https://certificats.cnfr.api.rq-fo.ca/enrolement';

const HEADERS = {
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

// CSR DN (RBC / Michel Untel template)
// Order: C, ST, L, SN, O, OU, GN, CN
const DN = {
  C: 'CA',
  ST: 'QC',
  L: '-05:00',
  SN: 'Certificat du serveur', // 2.5.4.5
  O: 'RBC-D8T8-W8W8',
  OU: '5678912340TQ0001',
  GN: 'ER0001', // 2.5.4.42
  CN: '5678912340',
};

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
 * Build CSR per Opus spec
 */
async function buildCSR(cryptoKey: CryptoKeyPair): Promise<x509.Pkcs10CertificateRequest> {
  // DN order: C, ST, L, SN (2.5.4.5), O, OU, GN (2.5.4.42), CN
  const dnString = `C=${DN.C}, ST=${DN.ST}, L=${DN.L}, 2.5.4.5=${DN.SN}, O=${DN.O}, OU=${DN.OU}, 2.5.4.42=${DN.GN}, CN=${DN.CN}`;

  const csr = await x509.Pkcs10CertificateRequestGenerator.create({
    name: dnString,
    keys: cryptoKey,
    signingAlgorithm: {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    extensions: [
      // KeyUsage: digitalSignature ONLY (critical)
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.digitalSignature,
        true
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
  const lines = [`curl -X POST '${ENDPOINT}' \\`];

  Object.entries(headers).forEach(([key, value]) => {
    lines.push(`  -H '${key}: ${value}' \\`);
  });

  lines.push(`  -d '${JSON.stringify(body, null, 2).replace(/'/g, "'\\''")}'`);

  return lines.join('\n');
}

/**
 * Main test
 */
async function run() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);

  console.log(`Timestamp: ${timestamp}`);
  console.log(`Output: tmp/logs/dev-enrolment-opus-final-${timestamp}/\n`);

  const outputDir = join(process.cwd(), 'tmp', 'logs', `dev-enrolment-opus-final-${timestamp}`);
  mkdirSync(outputDir, { recursive: true });

  // Generate keypair
  console.log('🔐 Generating ECDSA P-256 keypair...');
  const cryptoKey = await generateKeyPairP256();

  // Build CSR
  console.log('📝 Building CSR per Opus specification...');
  const csr = await buildCSR(cryptoKey);
  const csrPEM = formatCSRPEM(csr);
  const csrHash = calculateCSRHash(csr);

  console.log('\n📋 Configuration:');
  console.log('  DN (order: C, ST, L, SN, O, OU, GN, CN):');
  console.log(`    C=${DN.C}, ST=${DN.ST}, L=${DN.L}, SN=${DN.SN},`);
  console.log(`    O=${DN.O}, OU=${DN.OU}, GN=${DN.GN}, CN=${DN.CN}`);
  console.log('  KeyUsage: digitalSignature (critical)');
  console.log('  ExtendedKeyUsage: NONE');
  console.log(`  CSR SHA-256: ${csrHash}\n`);

  // Save CSR
  const csrPath = join(outputDir, 'csr.pem');
  writeFileSync(csrPath, csrPEM, 'utf-8');
  console.log(`✓ Saved: ${csrPath}`);

  // Save hash
  const hashPath = join(outputDir, 'sha256.txt');
  writeFileSync(hashPath, csrHash, 'utf-8');
  console.log(`✓ Saved: ${hashPath}`);

  // Build request body (NO codAutori)
  const requestBody = {
    reqCertif: {
      modif: 'AJO',
      csr: csrPEM,
    },
    // NO codAutori in DEV
  };

  // Save request
  const requestPath = join(outputDir, 'request.json');
  writeFileSync(requestPath, JSON.stringify(requestBody, null, 2), 'utf-8');
  console.log(`✓ Saved: ${requestPath}`);

  // Generate curl
  const curlCommand = generateCurlCommand(HEADERS, requestBody);
  const curlPath = join(outputDir, 'curl.sh');
  writeFileSync(curlPath, `#!/bin/bash\n\n${curlCommand}\n`, 'utf-8');
  console.log(`✓ Saved: ${curlPath}\n`);

  // Display headers
  console.log('📤 Request Headers:');
  Object.entries(HEADERS).forEach(([k, v]) => {
    console.log(`  ${k}: ${v}`);
  });
  console.log('\n📤 Request Body:');
  console.log('  reqCertif.modif: AJO');
  console.log('  reqCertif.csr: <PEM CSR>');
  console.log('  (NO codAutori in body)\n');

  // Make request
  console.log('🌐 Calling endpoint...');

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: HEADERS,
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
    console.log(`✓ Saved: ${responsePath}\n`);

    // Analyze response
    const errors: any[] = responseData?.retourCertif?.listErr || [];

    console.log('='.repeat(80));
    console.log('📊 RESULT');
    console.log('='.repeat(80) + '\n');

    console.log(`HTTP Status: ${response.status} ${response.statusText}\n`);

    if (response.ok && errors.length === 0) {
      console.log('✅ SUCCESS! No errors.\n');
      if (responseData?.retourCertif?.certif) {
        console.log('📜 Certificate received:');
        console.log(`   Length: ${responseData.retourCertif.certif.length} bytes\n`);
      }
    } else if (errors.length > 0) {
      console.log('❌ Errors:\n');
      console.log('| id              | codRetour | mess (first 100 chars)                                           |');
      console.log('|-----------------|-----------|------------------------------------------------------------------|');

      errors.forEach((err: any) => {
        const id = (err.id || 'N/A').padEnd(15);
        const code = (err.codRetour || 'N/A').padEnd(9);
        const mess = (err.mess || 'No message').substring(0, 100).padEnd(64);
        console.log(`| ${id} | ${code} | ${mess} |`);
      });

      console.log('\n');

      // Error pattern analysis
      const has95 = errors.some((e) => e.codRetour === '95');
      const has96 = errors.some((e) => e.codRetour === '96');

      console.log('Error Analysis:');
      console.log(`  Error 95 (field placement): ${has95 ? '❌ PRESENT' : '✅ NOT PRESENT'}`);
      console.log(`  Error 96 (CSR validation): ${has96 ? '❌ PRESENT' : '✅ NOT PRESENT'}\n`);

      if (has96) {
        console.log('⚠️  Error 96 still present → CSR structure/format issue persists');
        console.log('   Possible causes per Opus:');
        console.log('   1. SN value might need to change based on test case (SW-77 note)');
        console.log('   2. RQ backend: IDPARTN/CODCERTIF ↔ DN mapping not activated yet\n');
      }

      if (!has95 && !has96) {
        console.log('✅ Clean response (no 95/96 errors) but HTTP non-OK');
      }
    }

    process.exit(response.ok ? 0 : 1);
  } catch (error: any) {
    console.error(`❌ Network error: ${error.message}\n`);

    const responsePath = join(outputDir, 'response.json');
    writeFileSync(
      responsePath,
      JSON.stringify({ error: error.message, stack: error.stack }, null, 2),
      'utf-8'
    );

    process.exit(1);
  }
}

run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
