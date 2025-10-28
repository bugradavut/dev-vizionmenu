/**
 * WEB-SRM DEV Enrolment - Test 4 CSR Variants
 *
 * Tests 4 different CSR configurations with specific DN formats and extensions
 * Following exact specifications for DEV environment testing
 */

import { Crypto } from '@peculiar/webcrypto';
import * as x509 from '@peculiar/x509';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

// Setup WebCrypto polyfill for Node.js
const crypto = new Crypto();
x509.cryptoProvider.set(crypto);

console.log('🧪 WEB-SRM DEV Enrolment - Testing 4 CSR Variants\n');

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

interface CSRSubject {
  commonName: string;
  organization: string;
  organizationalUnit?: string;
  givenName?: string;
  serialNumber?: string;
  country: string;
  state: string;
  locality: string;
}

interface Variant {
  name: string;
  description: string;
  subject: CSRSubject;
  includeEKU: boolean;
}

// 4 Variants as specified
const VARIANTS: Variant[] = [
  {
    name: 'V1',
    description: 'RBC template with OU/GN (no SN)',
    subject: {
      country: 'CA',
      state: 'QC',
      locality: '-05:00',
      organization: 'RBC-D8T8-W8W8',
      organizationalUnit: '5678912340TQ0001',
      givenName: 'ER0001',
      commonName: '5678912340',
    },
    includeEKU: false,
  },
  {
    name: 'V2',
    description: 'V1 + SN mandatory',
    subject: {
      country: 'CA',
      state: 'QC',
      locality: '-05:00',
      serialNumber: 'Certificat du serveur',
      organization: 'RBC-D8T8-W8W8',
      organizationalUnit: '5678912340TQ0001',
      givenName: 'ER0001',
      commonName: '5678912340',
    },
    includeEKU: false,
  },
  {
    name: 'V3',
    description: 'Simple DN without OU/GN',
    subject: {
      country: 'CA',
      state: 'QC',
      locality: '-05:00',
      serialNumber: 'Certificat du serveur',
      organization: 'RBC-D8T8-W8W8',
      commonName: '5678912340',
    },
    includeEKU: false,
  },
  {
    name: 'V4',
    description: 'V2 + EKU clientAuth',
    subject: {
      country: 'CA',
      state: 'QC',
      locality: '-05:00',
      serialNumber: 'Certificat du serveur',
      organization: 'RBC-D8T8-W8W8',
      organizationalUnit: '5678912340TQ0001',
      givenName: 'ER0001',
      commonName: '5678912340',
    },
    includeEKU: true,
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
 * Build CSR with given subject and extensions
 */
async function buildCSR(
  cryptoKey: CryptoKeyPair,
  subject: CSRSubject,
  includeEKU: boolean
): Promise<x509.Pkcs10CertificateRequest> {
  // Build DN string - Order: C, ST, L, [SN], O, [OU], [GN], CN
  const dnParts: string[] = [];
  dnParts.push(`C=${subject.country}`);
  dnParts.push(`ST=${subject.state}`);
  dnParts.push(`L=${subject.locality}`);

  if (subject.serialNumber) {
    dnParts.push(`2.5.4.5=${subject.serialNumber}`); // serialNumber OID
  }

  dnParts.push(`O=${subject.organization}`);

  if (subject.organizationalUnit) {
    dnParts.push(`OU=${subject.organizationalUnit}`);
  }
  if (subject.givenName) {
    dnParts.push(`2.5.4.42=${subject.givenName}`); // givenName OID
  }

  dnParts.push(`CN=${subject.commonName}`);

  const dn = dnParts.join(', ');

  // Extensions: KeyUsage (digitalSignature only, critical) + optional EKU
  const extensions: x509.Extension[] = [
    new x509.KeyUsagesExtension(
      x509.KeyUsageFlags.digitalSignature,
      true // critical
    ),
  ];

  if (includeEKU) {
    extensions.push(
      new x509.ExtendedKeyUsageExtension(['1.3.6.1.5.5.7.3.2']) // clientAuth
    );
  }

  const csr = await x509.Pkcs10CertificateRequestGenerator.create({
    name: dn,
    keys: cryptoKey,
    signingAlgorithm: {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    extensions,
  });

  return csr;
}

/**
 * Format PEM to exact specification:
 * - 64 column wrapping
 * - LF only (\n)
 * - header/footer with \n before and after
 */
function formatCSRPEM(csr: x509.Pkcs10CertificateRequest): string {
  const raw = csr.toString('pem');

  // Extract base64 content between header/footer
  const headerMatch = raw.match(/-----BEGIN CERTIFICATE REQUEST-----\s*/);
  const footerMatch = raw.match(/\s*-----END CERTIFICATE REQUEST-----/);

  if (!headerMatch || !footerMatch) {
    throw new Error('Invalid PEM format');
  }

  const base64Content = raw
    .substring(headerMatch[0].length, raw.lastIndexOf('-----END CERTIFICATE REQUEST-----'))
    .replace(/\s/g, ''); // Remove all whitespace

  // Wrap to 64 columns
  const wrapped = base64Content.match(/.{1,64}/g)?.join('\n') || '';

  return `-----BEGIN CERTIFICATE REQUEST-----\n${wrapped}\n-----END CERTIFICATE REQUEST-----\n`;
}

/**
 * Calculate SHA-256 of CSR in DER format
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
 * Build DN display string
 */
function buildDNString(subject: CSRSubject): string {
  const parts = [
    `C=${subject.country}`,
    `ST=${subject.state}`,
    `L=${subject.locality}`,
  ];

  if (subject.serialNumber) parts.push(`SN=${subject.serialNumber}`);
  parts.push(`O=${subject.organization}`);
  if (subject.organizationalUnit) parts.push(`OU=${subject.organizationalUnit}`);
  if (subject.givenName) parts.push(`GN=${subject.givenName}`);
  parts.push(`CN=${subject.commonName}`);

  return parts.join(', ');
}

/**
 * Test one variant
 */
async function testVariant(variant: Variant, timestamp: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 Testing ${variant.name}: ${variant.description}`);
  console.log(`${'='.repeat(80)}\n`);

  // Create output directory
  const outputDir = join(process.cwd(), 'tmp', 'logs', `dev-enrolment-${timestamp}`, variant.name);
  mkdirSync(outputDir, { recursive: true });

  // Generate keypair
  console.log('🔐 Generating ECDSA P-256 keypair...');
  const cryptoKey = await generateKeyPairP256();

  // Build CSR
  console.log('📝 Building CSR...');
  const csr = await buildCSR(cryptoKey, variant.subject, variant.includeEKU);

  // Format CSR PEM
  const csrPEM = formatCSRPEM(csr);

  // Calculate hash
  const csrHash = calculateCSRHash(csr);

  // Build DN
  const dnString = buildDNString(variant.subject);

  console.log(`   Subject: ${dnString}`);
  console.log(`   KeyUsage: digitalSignature (critical)`);
  if (variant.includeEKU) {
    console.log(`   ExtendedKeyUsage: clientAuth (1.3.6.1.5.5.7.3.2)`);
  }
  console.log(`   CSR SHA-256: ${csrHash}`);

  // Save CSR
  const csrPath = join(outputDir, 'csr.pem');
  writeFileSync(csrPath, csrPEM, 'utf-8');
  console.log(`   ✓ Saved: ${csrPath}`);

  // Save hash
  const hashPath = join(outputDir, 'sha256.txt');
  writeFileSync(hashPath, csrHash, 'utf-8');
  console.log(`   ✓ Saved: ${hashPath}`);

  // Build request (NO codAutori for DEV per existing scripts)
  const requestBody = {
    reqCertif: {
      modif: 'AJO',
      csr: csrPEM,
    },
    // codAutori is NOT used in DEV environment
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
  console.log('🌐 Calling RQ enrolment endpoint...');

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

    // Analyze response
    let success = false;
    let errors: any[] = [];

    if (response.ok && responseData?.retourCertif) {
      if (responseData.retourCertif.listErr && responseData.retourCertif.listErr.length > 0) {
        errors = responseData.retourCertif.listErr;
        console.log('❌ FAILED with errors from retourCertif.listErr:');
        errors.forEach((err: any) => {
          console.log(`   [${err.codRetour || 'N/A'}] ${err.id || 'N/A'}: ${err.mess || 'No message'}`);
        });
      } else if (responseData.retourCertif.certif) {
        success = true;
        console.log('✅ SUCCESS! Certificate received!');
        console.log(`   Certificate length: ${responseData.retourCertif.certif.length} bytes`);
      } else {
        console.log('✅ SUCCESS! No errors in retourCertif');
        success = true;
      }
    } else if (!response.ok) {
      console.log(`❌ FAILED: HTTP ${response.status} ${response.statusText}`);
      if (responseData?.retourCertif?.listErr) {
        errors = responseData.retourCertif.listErr;
        errors.forEach((err: any) => {
          console.log(`   [${err.codRetour || 'N/A'}] ${err.id || 'N/A'}: ${err.mess || 'No message'}`);
        });
      }
    }

    console.log('');

    return {
      variant: variant.name,
      description: variant.description,
      status: response.status,
      success,
      errors,
      outputDir,
    };
  } catch (error: any) {
    console.error(`❌ Network/Request Error: ${error.message}\n`);

    // Save error response
    const responsePath = join(outputDir, 'response.json');
    writeFileSync(
      responsePath,
      JSON.stringify(
        {
          error: error.message,
          stack: error.stack,
        },
        null,
        2
      ),
      'utf-8'
    );

    return {
      variant: variant.name,
      description: variant.description,
      status: 0,
      success: false,
      errors: [{ mess: error.message }],
      outputDir,
    };
  }
}

/**
 * Main test runner
 */
async function runTests() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const results = [];

  console.log(`Timestamp: ${timestamp}`);
  console.log(`Output directory: tmp/logs/dev-enrolment-${timestamp}/\n`);

  for (const variant of VARIANTS) {
    const result = await testVariant(variant, timestamp);
    results.push(result);

    // Short delay between requests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY REPORT');
  console.log('='.repeat(80) + '\n');

  results.forEach((result) => {
    const status = result.success ? '✅ SUCCESS' : `❌ FAILED (HTTP ${result.status})`;
    console.log(`${result.variant}: ${status}`);
    console.log(`  Description: ${result.description}`);
    console.log(`  Output: ${result.outputDir}`);

    if (!result.success && result.errors.length > 0) {
      console.log(`  Errors:`);
      result.errors.forEach((err: any) => {
        const code = err.codRetour || 'N/A';
        const id = err.id || 'N/A';
        const msg = err.mess || err.message || 'Unknown error';
        console.log(`    [${code}] ${id}: ${msg}`);
      });
    }
    console.log('');
  });

  const successCount = results.filter((r) => r.success).length;
  console.log(`Result: ${successCount}/${results.length} variants succeeded\n`);

  if (successCount > 0) {
    console.log('🎉 Success! At least one variant worked.\n');
    const successfulVariants = results.filter((r) => r.success);
    console.log('Successful variants:');
    successfulVariants.forEach((r) => {
      console.log(`  - ${r.variant}: ${r.description}`);
    });
    console.log('');
  } else {
    console.log('❌ All variants failed. Review error messages in response.json files.\n');
  }

  process.exit(successCount > 0 ? 0 : 1);
}

runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
