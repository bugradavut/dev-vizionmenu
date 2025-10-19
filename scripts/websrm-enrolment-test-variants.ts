/**
 * WEB-SRM DEV Enrolment - Test 3 CSR Variants
 *
 * Tests 3 different CSR subject formats to find the correct one
 */

import { createClient } from '@supabase/supabase-js';
import { Crypto } from '@peculiar/webcrypto';
import * as x509 from '@peculiar/x509';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Setup WebCrypto polyfill for Node.js
const crypto = new Crypto();
x509.cryptoProvider.set(crypto);

// ENV validation
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

console.log('🧪 WEB-SRM DEV Enrolment - Testing 3 CSR Variants\n');

// DEV Configuration
const DEV_CONFIG = {
  env: 'DEV',
  authCode: 'D8T8-W8W8',
  partnerId: '0000000000001FF2',
  certCode: 'FOB201999999',
  softwareId: '0000000000003973',
  softwareVersion: '00000000000045D6',
  versi: '0.1.0',
  activitySector: 'RBC',
  enrolmentUrl: 'https://certificats.cnfr.api.rq-fo.ca/enrolement',
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

// 3 Variants to test
const VARIANTS: Array<{ name: string; subject: CSRSubject }> = [
  {
    name: 'A - CN=IDPARTN (no OU/GN)',
    subject: {
      commonName: '0000000000001FF2', // IDPARTN
      organization: 'RBC-D8T8-W8W8',
      serialNumber: 'Certificat du serveur',
      country: 'CA',
      state: 'QC',
      locality: '-05:00',
    },
  },
  {
    name: 'B - CN=3601837200 (with OU/GN)',
    subject: {
      commonName: '3601837200',
      organization: 'RBC-D8T8-W8W8',
      organizationalUnit: '3601837200TQ0001',
      givenName: 'ER0001',
      serialNumber: 'Certificat du serveur',
      country: 'CA',
      state: 'QC',
      locality: '-05:00',
    },
  },
  {
    name: 'C - CN=Michel Untel enr. (no OU/GN)',
    subject: {
      commonName: 'Michel Untel enr.',
      organization: 'RBC-D8T8-W8W8',
      serialNumber: 'Certificat du serveur',
      country: 'CA',
      state: 'QC',
      locality: '-05:00',
    },
  },
];

/**
 * Generate ECDSA P-256 keypair
 */
async function generateKeyPairP256(): Promise<CryptoKeyPair> {
  const keys = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify']
  );
  return keys;
}

/**
 * Build CSR with given subject
 */
async function buildCSR(cryptoKey: CryptoKeyPair, subject: CSRSubject): Promise<string> {
  // Build DN string - Order: C, ST, L, SN, O, CN, [OU], [GN]
  let dnParts: string[] = [];
  dnParts.push(`C=${subject.country}`);
  dnParts.push(`ST=${subject.state}`);
  dnParts.push(`L=${subject.locality}`);

  if (subject.serialNumber) {
    dnParts.push(`2.5.4.5=${subject.serialNumber}`);
  }

  dnParts.push(`O=${subject.organization}`);
  dnParts.push(`CN=${subject.commonName}`);

  if (subject.organizationalUnit) {
    dnParts.push(`OU=${subject.organizationalUnit}`);
  }
  if (subject.givenName) {
    dnParts.push(`2.5.4.42=${subject.givenName}`);
  }

  const dn = dnParts.join(', ');

  const csr = await x509.Pkcs10CertificateRequestGenerator.create({
    name: dn,
    keys: cryptoKey,
    signingAlgorithm: {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    extensions: [
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.digitalSignature | x509.KeyUsageFlags.nonRepudiation,
        true
      ),
      new x509.ExtendedKeyUsageExtension(['1.3.6.1.5.5.7.3.8']),
    ],
  });

  return csr.toString('pem');
}

/**
 * Test one variant
 */
async function testVariant(variant: typeof VARIANTS[0], index: number) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📋 Variant ${String.fromCharCode(65 + index)}: ${variant.name}`);
  console.log(`${'='.repeat(70)}\n`);

  // Generate keypair
  console.log('🔐 Generating ECDSA P-256 keypair...');
  const cryptoKey = await generateKeyPairP256();

  // Build CSR
  console.log('📝 Building CSR...');
  const csr = await buildCSR(cryptoKey, variant.subject);

  // Build DN for display
  const dnParts = [
    `C=${variant.subject.country}`,
    `ST=${variant.subject.state}`,
    `L=${variant.subject.locality}`,
    variant.subject.serialNumber ? `SN=${variant.subject.serialNumber}` : '',
    `O=${variant.subject.organization}`,
    `CN=${variant.subject.commonName}`,
    variant.subject.organizationalUnit ? `OU=${variant.subject.organizationalUnit}` : '',
    variant.subject.givenName ? `GN=${variant.subject.givenName}` : '',
  ].filter(Boolean).join(', ');

  console.log(`   Subject: ${dnParts}`);
  console.log(`   CSR Length: ${csr.length} bytes\n`);

  // Headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'ENVIRN': 'DEV',
    'APPRLINIT': 'SRV',
    'IDSEV': DEV_CONFIG.softwareId,
    'IDVERSI': DEV_CONFIG.softwareVersion,
    'CODCERTIF': DEV_CONFIG.certCode,
    'IDPARTN': DEV_CONFIG.partnerId,
    'VERSI': DEV_CONFIG.versi,
    'VERSIPARN': '0',
    'CASESSAI': '000.000',
  };

  const body = {
    reqCertif: {
      modif: 'AJO',
      csr: csr,
    },
  };

  // Prepare log
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logDir = join(process.cwd(), 'tmp', 'logs');
  try {
    mkdirSync(logDir, { recursive: true });
  } catch (e) {
    // Ignore
  }

  const logFile = join(logDir, `enrolment-dev-variant-${String.fromCharCode(65 + index).toLowerCase()}-${timestamp}.log`);

  let logContent = [
    `=== WEB-SRM DEV Enrolment - Variant ${String.fromCharCode(65 + index)} ===`,
    `Timestamp: ${new Date().toISOString()}`,
    `Variant: ${variant.name}`,
    ``,
    `POST ${DEV_CONFIG.enrolmentUrl}`,
    ``,
    `Headers:`,
    ...Object.entries(headers).map(([k, v]) => `  ${k}: ${v}`),
    ``,
    `Subject: ${dnParts}`,
    ``,
    `Body (${JSON.stringify(body).length} bytes):`,
    JSON.stringify(body, null, 2),
    ``,
    `---`,
    ``,
  ].join('\n');

  // Make request
  console.log('🌐 Calling RQ enrolment endpoint...');

  try {
    const response = await fetch(DEV_CONFIG.enrolmentUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    console.log(`📥 Response: ${response.status} ${response.statusText}\n`);

    const responseText = await response.text();
    const contentType = response.headers.get('content-type');

    logContent += [
      `Response: ${response.status} ${response.statusText}`,
      ``,
      `Headers:`,
      ...Array.from(response.headers.entries()).map(([k, v]) => `  ${k}: ${v}`),
      ``,
    ].join('\n');

    let data: any;
    if (contentType?.includes('application/json')) {
      data = JSON.parse(responseText);
      logContent += `Body:\n${JSON.stringify(data, null, 2)}\n`;
    } else {
      logContent += `Body (first 500 chars):\n${responseText.substring(0, 500)}\n`;
    }

    // Write log
    writeFileSync(logFile, logContent);
    console.log(`📝 Log: ${logFile}\n`);

    // Result
    if (response.ok && data?.retourCertif && !data.retourCertif.listErr) {
      console.log('✅ SUCCESS! Enrolment accepted!\n');
      return {
        variant: variant.name,
        status: response.status,
        success: true,
        errors: [],
      };
    } else if (data?.retourCertif?.listErr) {
      console.log('❌ FAILED with errors:');
      data.retourCertif.listErr.forEach((err: any) => {
        console.log(`   [${err.codRetour || 'N/A'}] ${err.id}: ${err.mess}`);
      });
      console.log('');

      return {
        variant: variant.name,
        status: response.status,
        success: false,
        errors: data.retourCertif.listErr,
      };
    } else {
      console.log(`❌ FAILED: ${response.statusText}\n`);
      return {
        variant: variant.name,
        status: response.status,
        success: false,
        errors: [{ mess: response.statusText }],
      };
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}\n`);
    logContent += `Error: ${error.message}\n`;
    writeFileSync(logFile, logContent);

    return {
      variant: variant.name,
      status: 0,
      success: false,
      errors: [{ mess: error.message }],
    };
  }
}

/**
 * Main test runner
 */
async function runTests() {
  const results = [];

  for (let i = 0; i < VARIANTS.length; i++) {
    const result = await testVariant(VARIANTS[i], i);
    results.push(result);

    // Short delay between requests
    if (i < VARIANTS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70) + '\n');

  results.forEach((result, i) => {
    const letter = String.fromCharCode(65 + i);
    const status = result.success ? '✅ SUCCESS' : `❌ FAILED (${result.status})`;
    console.log(`Variant ${letter}: ${status}`);
    console.log(`  ${result.variant}`);

    if (!result.success && result.errors.length > 0) {
      result.errors.forEach((err: any) => {
        const msg = err.mess || err.message || 'Unknown error';
        console.log(`  Error: ${msg.substring(0, 100)}${msg.length > 100 ? '...' : ''}`);
      });
    }
    console.log('');
  });

  const successCount = results.filter(r => r.success).length;
  console.log(`Result: ${successCount}/${results.length} variants succeeded\n`);

  if (successCount > 0) {
    console.log('🎉 At least one variant worked! Use the successful format.\n');
    process.exit(0);
  } else {
    console.log('❌ All variants failed. Review error messages for next iteration.\n');
    process.exit(1);
  }
}

runTests();
