/**
 * WEB-SRM DEV Enrolment - GPT-5 Final Spec
 *
 * 2 variants with exact GPT-5 specification:
 * - KeyUsage: digitalSignature + nonRepudiation (critical = FALSE)
 * - EKU: 1.3.6.1.5.5.7.3.8
 * - BasicConstraints: CA=false
 * - SubjectKeyIdentifier: auto-generated
 */

import { Crypto } from '@peculiar/webcrypto';
import * as x509 from '@peculiar/x509';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

const crypto = new Crypto();
x509.cryptoProvider.set(crypto);

console.log('🧪 WEB-SRM DEV Enrolment - GPT-5 Final Spec\n');

// Endpoint
const ENDPOINT = 'https://certificats.cnfr.api.rq-fo.ca/enrolement';

// Base headers (10 headers)
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

// DN (same for both tests - NO OU/GN)
const DN = {
  C: 'CA',
  ST: 'QC',
  L: '-05:00',
  SN: 'Certificat du serveur', // 2.5.4.5
  O: 'RBC-D8T8-W8W8',
  CN: '5678912340',
};

// Test variants
const VARIANTS = [
  {
    name: 'DEV-1',
    description: 'With CODAUTORI header',
    extraHeaders: { CODAUTORI: 'D8T8-W8W8' },
  },
  {
    name: 'DEV-2',
    description: 'No auth code',
    extraHeaders: {},
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
 * Build CSR per GPT-5 spec
 */
async function buildCSR(cryptoKey: CryptoKeyPair): Promise<x509.Pkcs10CertificateRequest> {
  // DN order: C, ST, L, SN (2.5.4.5), O, CN (NO OU, NO GN)
  const dnString = `C=${DN.C}, ST=${DN.ST}, L=${DN.L}, 2.5.4.5=${DN.SN}, O=${DN.O}, CN=${DN.CN}`;

  const csr = await x509.Pkcs10CertificateRequestGenerator.create({
    name: dnString,
    keys: cryptoKey,
    signingAlgorithm: {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    extensions: [
      // KeyUsage: digitalSignature + nonRepudiation (critical = FALSE)
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.digitalSignature | x509.KeyUsageFlags.nonRepudiation,
        false // NOT critical
      ),
      // ExtendedKeyUsage: 1.3.6.1.5.5.7.3.8
      new x509.ExtendedKeyUsageExtension(['1.3.6.1.5.5.7.3.8']),
      // BasicConstraints: CA = false
      new x509.BasicConstraintsExtension(false, undefined, false),
      // SubjectKeyIdentifier: auto-generated
      await x509.SubjectKeyIdentifierExtension.create(cryptoKey.publicKey),
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
): Promise<any> {
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

  // Build headers
  const headers = { ...BASE_HEADERS, ...variant.extraHeaders };

  // Build body
  const requestBody = {
    reqCertif: {
      modif: 'AJO',
      csr: csrPEM,
    },
  };

  // Save CSR
  const csrPath = join(outputDir, 'csr.pem');
  writeFileSync(csrPath, csrPEM, 'utf-8');
  console.log(`✓ Saved: csr.pem`);

  // Generate openssl output
  try {
    const opensslOutput = execSync(`openssl req -in "${csrPath}" -noout -text`, {
      encoding: 'utf-8',
    });
    const csrTxtPath = join(outputDir, 'csr.txt');
    writeFileSync(csrTxtPath, opensslOutput, 'utf-8');
    console.log(`✓ Saved: csr.txt`);
  } catch (error: any) {
    console.log(`⚠ OpenSSL failed: ${error.message}`);
  }

  // Save hash
  const hashPath = join(outputDir, 'sha256.txt');
  writeFileSync(hashPath, csrHash, 'utf-8');
  console.log(`✓ Saved: sha256.txt`);

  // Save request
  const requestPath = join(outputDir, 'request.json');
  writeFileSync(requestPath, JSON.stringify(requestBody, null, 2), 'utf-8');
  console.log(`✓ Saved: request.json`);

  // Save headers
  const headersPath = join(outputDir, 'headers.json');
  writeFileSync(headersPath, JSON.stringify(headers, null, 2), 'utf-8');
  console.log(`✓ Saved: headers.json`);

  // Generate curl
  const curlCommand = generateCurlCommand(headers, requestBody);
  const curlPath = join(outputDir, 'curl.sh');
  writeFileSync(curlPath, `#!/bin/bash\n\n${curlCommand}\n`, 'utf-8');
  console.log(`✓ Saved: curl.sh\n`);

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
    console.log(`✓ Saved: response.json\n`);

    // Analyze
    const errors: any[] = responseData?.retourCertif?.listErr || [];
    const hasCertif = !!responseData?.retourCertif?.certif;
    const hasCertifPSI = !!responseData?.retourCertif?.certifPSI;

    return {
      variant: variant.name,
      description: variant.description,
      status: response.status,
      statusText: response.statusText,
      errors,
      hasCertif,
      hasCertifPSI,
      outputDir,
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
      statusText: 'Network Error',
      errors: [{ mess: error.message }],
      hasCertif: false,
      hasCertifPSI: false,
      outputDir,
    };
  }
}

/**
 * Generate summary.md
 */
function generateSummary(results: any[], csrHash: string, timestamp: string, rootDir: string) {
  const lines: string[] = [];

  lines.push('# WEB-SRM DEV Enrolment - GPT-5 Final Test Results\n');
  lines.push(`**Timestamp:** ${timestamp}\n`);
  lines.push('## CSR Configuration\n');
  lines.push('```');
  lines.push(`DN: C=${DN.C}, ST=${DN.ST}, L=${DN.L}, SN=${DN.SN}, O=${DN.O}, CN=${DN.CN}`);
  lines.push('KeyUsage: digitalSignature + nonRepudiation (critical = FALSE)');
  lines.push('ExtendedKeyUsage: 1.3.6.1.5.5.7.3.8 (Customer authentication)');
  lines.push('BasicConstraints: CA=false');
  lines.push('SubjectKeyIdentifier: auto-generated');
  lines.push('Signature: ECDSA P-256 + SHA-256');
  lines.push(`SHA-256 (DER): ${csrHash}`);
  lines.push('```\n');

  lines.push('## Test Results\n');

  results.forEach((result) => {
    lines.push(`### ${result.variant}: ${result.description}\n`);
    lines.push(`- **HTTP Status:** ${result.status} ${result.statusText}`);
    lines.push(`- **Output:** ${result.outputDir}\n`);

    if (result.errors.length > 0) {
      lines.push('**Errors:**\n');
      lines.push('| id | codRetour | mess (first 80 chars) |');
      lines.push('|----|-----------|----------------------|');
      result.errors.forEach((err: any) => {
        const id = err.id || 'N/A';
        const code = err.codRetour || 'N/A';
        const mess = (err.mess || 'No message').substring(0, 80);
        lines.push(`| ${id} | ${code} | ${mess} |`);
      });
      lines.push('');

      // Interpretation
      const has95 = result.errors.some((e: any) => e.codRetour === '95');
      const has96 = result.errors.some((e: any) => e.codRetour === '96');

      lines.push('**Interpretation:**');
      if (has95) lines.push('- ❌ Error 95: Auth code placement issue');
      if (has96) lines.push('- ❌ Error 96: CSR content/condition rejection');
      lines.push('');
    } else if (result.status === 200) {
      lines.push('**Success:**');
      if (result.hasCertif) lines.push('- ✅ retourCertif.certif present');
      if (result.hasCertifPSI) lines.push('- ✅ retourCertif.certifPSI present');
      if (!result.hasCertif && !result.hasCertifPSI) lines.push('- ℹ️ No certificate in response');
      lines.push('');
    }
  });

  const summaryPath = join(rootDir, 'summary.md');
  writeFileSync(summaryPath, lines.join('\n'), 'utf-8');
  console.log(`\n✓ Summary saved: ${summaryPath}\n`);
}

/**
 * Main
 */
async function run() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const rootDir = join(process.cwd(), 'tmp', 'logs', `dev-enrolment-${timestamp}`);

  console.log(`Timestamp: ${timestamp}`);
  console.log(`Output: ${rootDir}/\n`);

  // Generate single CSR (shared)
  console.log('🔐 Generating ECDSA P-256 keypair (shared)...');
  const cryptoKey = await generateKeyPairP256();

  console.log('📝 Building CSR per GPT-5 specification...');
  const csr = await buildCSR(cryptoKey);
  const csrPEM = formatCSRPEM(csr);
  const csrHash = calculateCSRHash(csr);

  console.log(`\n📋 CSR Configuration:`);
  console.log(`  DN: C=${DN.C}, ST=${DN.ST}, L=${DN.L}, SN=${DN.SN}, O=${DN.O}, CN=${DN.CN}`);
  console.log(`  KeyUsage: digitalSignature + nonRepudiation (critical = FALSE)`);
  console.log(`  ExtendedKeyUsage: 1.3.6.1.5.5.7.3.8`);
  console.log(`  BasicConstraints: CA=false`);
  console.log(`  SubjectKeyIdentifier: auto-generated`);
  console.log(`  SHA-256: ${csrHash}`);

  const results = [];

  for (const variant of VARIANTS) {
    const result = await testVariant(variant, csrPEM, csrHash, timestamp);
    results.push(result);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Generate summary
  generateSummary(results, csrHash, timestamp, rootDir);

  // Console report
  console.log('='.repeat(80));
  console.log('📊 FINAL REPORT');
  console.log('='.repeat(80) + '\n');

  results.forEach((result) => {
    console.log(`${result.variant} (${result.description}):`);
    console.log(`  HTTP: ${result.status} ${result.statusText}`);
    console.log(`  Output: ${result.outputDir}`);

    if (result.errors.length > 0) {
      result.errors.forEach((err: any) => {
        const code = err.codRetour || 'N/A';
        const id = err.id || 'N/A';
        const mess = (err.mess || '').substring(0, 80);
        console.log(`  [${code}] ${id}: ${mess}`);
      });
    } else if (result.status === 200) {
      console.log(`  ✅ Success`);
      if (result.hasCertif) console.log(`  📜 Certificate received`);
    }
    console.log('');
  });

  console.log(`Summary: ${join(rootDir, 'summary.md')}\n`);
}

run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
