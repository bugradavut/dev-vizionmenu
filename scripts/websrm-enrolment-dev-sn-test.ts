/**
 * WEB-SRM DEV Enrolment - SN (surname) OID Test
 *
 * 3 variants testing surname (2.5.4.4) vs serialNumber (2.5.4.5):
 * - SN-only: surname only (2.5.4.4)
 * - SN+serial: surname (2.5.4.4) + serialNumber (2.5.4.5)
 * - serial-only: serialNumber only (2.5.4.5)
 */

import { Crypto } from '@peculiar/webcrypto';
import * as x509 from '@peculiar/x509';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

const crypto = new Crypto();
x509.cryptoProvider.set(crypto);

console.log('🧪 WEB-SRM DEV Enrolment - SN (surname) OID Test\n');

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
  'CODAUTORI': 'D8T8-W8W8',
};

// Variants
const VARIANTS = [
  {
    name: 'SN-only',
    description: 'surname (2.5.4.4) only',
    dnParts: {
      C: 'CA',
      ST: 'QC',
      L: '-05:00',
      surname: 'Certificat du serveur', // 2.5.4.4
      O: 'FOB-FOB201999999',
      CN: '0000000000001FF2',
    },
  },
  {
    name: 'SN+serial',
    description: 'surname (2.5.4.4) + serialNumber (2.5.4.5)',
    dnParts: {
      C: 'CA',
      ST: 'QC',
      L: '-05:00',
      surname: 'Certificat du serveur', // 2.5.4.4
      serialNumber: 'Certificat du serveur', // 2.5.4.5
      O: 'FOB-FOB201999999',
      CN: '0000000000001FF2',
    },
  },
  {
    name: 'serial-only',
    description: 'serialNumber (2.5.4.5) only (control)',
    dnParts: {
      C: 'CA',
      ST: 'QC',
      L: '-05:00',
      serialNumber: 'Certificat du serveur', // 2.5.4.5
      O: 'FOB-FOB201999999',
      CN: '0000000000001FF2',
    },
  },
];

async function generateKeyPairP256(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
}

function buildDNString(dnParts: any): string {
  const parts: string[] = [];

  parts.push(`C=${dnParts.C}`);
  parts.push(`ST=${dnParts.ST}`);
  parts.push(`L=${dnParts.L}`);

  // surname (2.5.4.4) if present
  if (dnParts.surname) {
    parts.push(`2.5.4.4=${dnParts.surname}`);
  }

  // serialNumber (2.5.4.5) if present
  if (dnParts.serialNumber) {
    parts.push(`2.5.4.5=${dnParts.serialNumber}`);
  }

  parts.push(`O=${dnParts.O}`);
  parts.push(`CN=${dnParts.CN}`);

  return parts.join(', ');
}

async function buildCSR(cryptoKey: CryptoKeyPair, dnString: string): Promise<x509.Pkcs10CertificateRequest> {
  return await x509.Pkcs10CertificateRequestGenerator.create({
    name: dnString,
    keys: cryptoKey,
    signingAlgorithm: { name: 'ECDSA', hash: 'SHA-256' },
    extensions: [
      new x509.KeyUsagesExtension(x509.KeyUsageFlags.digitalSignature, true),
    ],
  });
}

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

function calculateCSRHash(csr: x509.Pkcs10CertificateRequest): string {
  const der = Buffer.from(csr.rawData);
  return createHash('sha256').update(der).digest('hex');
}

function generateCurlCommand(headers: Record<string, string>, body: any): string {
  const lines = [`curl -X POST '${ENDPOINT}' \\`];
  Object.entries(headers).forEach(([key, value]) => {
    lines.push(`  -H '${key}: ${value}' \\`);
  });
  lines.push(`  -d '${JSON.stringify(body, null, 2).replace(/'/g, "'\\''")}'`);
  return lines.join('\n');
}

async function testVariant(
  variant: (typeof VARIANTS)[0],
  timestamp: string
): Promise<any> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 Testing ${variant.name}: ${variant.description}`);
  console.log(`${'='.repeat(80)}\n`);

  const outputDir = join(process.cwd(), 'tmp', 'logs', `dev-enrolment-${timestamp}`, variant.name);
  mkdirSync(outputDir, { recursive: true });

  // Generate keypair
  const cryptoKey = await generateKeyPairP256();

  // Build DN
  const dnString = buildDNString(variant.dnParts);
  console.log(`  DN: ${dnString}\n`);

  // Build CSR
  const csr = await buildCSR(cryptoKey, dnString);
  const csrPEM = formatCSRPEM(csr);
  const csrHash = calculateCSRHash(csr);

  // Save CSR
  const csrPath = join(outputDir, 'csr.pem');
  writeFileSync(csrPath, csrPEM, 'utf-8');

  // OpenSSL output
  try {
    const opensslOutput = execSync(`openssl req -in "${csrPath}" -noout -text`, {
      encoding: 'utf-8',
    });
    writeFileSync(join(outputDir, 'csr.txt'), opensslOutput, 'utf-8');
  } catch {}

  // Save hash
  writeFileSync(join(outputDir, 'sha256.txt'), csrHash, 'utf-8');

  // Build request (PEM only)
  const requestBody = {
    reqCertif: {
      modif: 'AJO',
      csr: csrPEM,
    },
  };

  writeFileSync(join(outputDir, 'request.json'), JSON.stringify(requestBody, null, 2), 'utf-8');
  writeFileSync(join(outputDir, 'headers.json'), JSON.stringify(HEADERS, null, 2), 'utf-8');

  const curlCommand = generateCurlCommand(HEADERS, requestBody);
  writeFileSync(join(outputDir, 'curl.sh'), `#!/bin/bash\n\n${curlCommand}\n`, 'utf-8');

  console.log(`✓ Saved artifacts to ${outputDir}\n`);

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

    writeFileSync(
      join(outputDir, 'response.json'),
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

    const errors: any[] = responseData?.retourCertif?.listErr || [];
    const hasCertif = !!responseData?.retourCertif?.certif;

    return {
      variant: variant.name,
      description: variant.description,
      dnString,
      status: response.status,
      statusText: response.statusText,
      errors,
      hasCertif,
      csrHash,
      outputDir,
    };
  } catch (error: any) {
    writeFileSync(
      join(outputDir, 'response.json'),
      JSON.stringify({ error: error.message }, null, 2),
      'utf-8'
    );

    return {
      variant: variant.name,
      description: variant.description,
      dnString: buildDNString(variant.dnParts),
      status: 0,
      statusText: 'Network Error',
      errors: [{ mess: error.message }],
      hasCertif: false,
      csrHash,
      outputDir,
    };
  }
}

function generateSummary(results: any[], timestamp: string, rootDir: string) {
  const lines: string[] = [];

  lines.push('# WEB-SRM DEV Enrolment - SN (surname) OID Test Results\n');
  lines.push(`**Timestamp:** ${timestamp}\n`);
  lines.push('## Configuration\n');
  lines.push('```');
  lines.push('KeyUsage: digitalSignature (critical)');
  lines.push('ExtendedKeyUsage: NONE');
  lines.push('Headers: CODAUTORI=D8T8-W8W8 (in header, NOT in body)');
  lines.push('Algorithm: ECDSA P-256 + SHA-256');
  lines.push('PEM: LF-only, 64-column wrap');
  lines.push('```\n');

  lines.push('## Variants\n');

  results.forEach((result) => {
    lines.push(`### ${result.variant}: ${result.description}\n`);
    lines.push(`**DN:** ${result.dnString}\n`);
    lines.push(`- **HTTP Status:** ${result.status} ${result.statusText}`);
    lines.push(`- **SHA-256:** ${result.csrHash}`);
    lines.push(`- **Output:** ${result.outputDir}\n`);

    if (result.hasCertif) {
      lines.push('✅ **SUCCESS - Certificate received**\n');
    } else if (result.errors.length > 0) {
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
    }
  });

  writeFileSync(join(rootDir, 'summary.md'), lines.join('\n'), 'utf-8');
}

async function run() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const rootDir = join(process.cwd(), 'tmp', 'logs', `dev-enrolment-${timestamp}`);

  console.log(`Timestamp: ${timestamp}`);
  console.log(`Output: ${rootDir}/\n`);

  const results = [];

  for (const variant of VARIANTS) {
    const result = await testVariant(variant, timestamp);
    results.push(result);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  generateSummary(results, timestamp, rootDir);

  // Console table
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESULTS TABLE');
  console.log('='.repeat(80) + '\n');

  console.log('| Variant     | Description                          | HTTP  | Cert | Errors  |');
  console.log('|-------------|--------------------------------------|-------|------|---------|');

  results.forEach((result) => {
    const variant = result.variant.padEnd(11);
    const desc = result.description.substring(0, 36).padEnd(36);
    const status = String(result.status).padEnd(5);
    const cert = (result.hasCertif ? '✅' : '❌').padEnd(4);
    const errorCodes = result.errors
      .map((e: any) => e.codRetour || 'N/A')
      .filter((c: string, i: number, a: string[]) => a.indexOf(c) === i)
      .join(', ')
      .substring(0, 7)
      .padEnd(7);
    console.log(`| ${variant} | ${desc} | ${status} | ${cert} | ${errorCodes} |`);
  });

  console.log('');

  results.forEach((result) => {
    console.log(`${result.variant}: ${result.outputDir}`);
    console.log(`  DN: ${result.dnString}`);
    if (result.hasCertif) {
      console.log('  ✅ Certificate received!');
    } else if (result.errors.length > 0) {
      result.errors.forEach((err: any) => {
        const code = err.codRetour || 'N/A';
        const msg = (err.mess || '').substring(0, 60);
        console.log(`  [${code}] ${msg}`);
      });
    }
    console.log('');
  });

  console.log(`Summary: ${join(rootDir, 'summary.md')}\n`);
}

run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
