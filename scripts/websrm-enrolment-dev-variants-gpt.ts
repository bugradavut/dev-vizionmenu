/**
 * WEB-SRM DEV Enrolment - 4 Variants Test (GPT Suggested)
 *
 * Critical changes:
 * - KeyUsage: digitalSignature ONLY (no nonRepudiation)
 * - ExtendedKeyUsage: clientAuth (1.3.6.1.5.5.7.3.2) instead of timeStamping (3.8)
 * - DN order: C, ST, L, O, OU?, GN?, SN?, CN
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Crypto } from '@peculiar/webcrypto';
import * as x509 from '@peculiar/x509';
import { createHash } from 'crypto';

const crypto = new Crypto();
x509.cryptoProvider.set(crypto);

console.log('🧪 WEB-SRM DEV Enrolment - 4 Variants Test (GPT Suggested)\n');
console.log('🔧 Critical Changes:');
console.log('   - KeyUsage: digitalSignature ONLY (no nonRepudiation)');
console.log('   - ExtendedKeyUsage: clientAuth (1.3.6.1.5.5.7.3.2) instead of 3.8');
console.log('   - DN order: C, ST, L, O, OU?, GN?, SN?, CN\n');

// DEV Config (FIXED)
const DEV_CONFIG = {
  endpoint: 'https://certificats.cnfr.api.rq-fo.ca/enrolement',
  headers: {
    'Content-Type': 'application/json',
    'ENVIRN': 'DEV',
    'APPRLINIT': 'SRV',
    'CASESSAI': '000.000',
    'IDSEV': '0000000000003973',
    'IDVERSI': '00000000000045D6',
    'CODCERTIF': 'FOB201999999',
    'IDPARTN': '0000000000001FF2',
    'VERSI': '0.1.0',
    'VERSIPARN': '0',
  },
};

// 4 Variants
const VARIANTS = [
  {
    id: 'A',
    name: 'Variant A (base)',
    dn: [
      { type: 'C', value: 'CA' },
      { type: 'ST', value: 'QC' },
      { type: 'L', value: '-05:00' },
      { type: 'O', value: 'RBC-D8T8-W8W8' },
      { type: 'CN', value: '5678912340' },
    ],
  },
  {
    id: 'B',
    name: 'Variant B (A + OU)',
    dn: [
      { type: 'C', value: 'CA' },
      { type: 'ST', value: 'QC' },
      { type: 'L', value: '-05:00' },
      { type: 'O', value: 'RBC-D8T8-W8W8' },
      { type: 'OU', value: '5678912340TQ0001' },
      { type: 'CN', value: '5678912340' },
    ],
  },
  {
    id: 'C',
    name: 'Variant C (B + GN)',
    dn: [
      { type: 'C', value: 'CA' },
      { type: 'ST', value: 'QC' },
      { type: 'L', value: '-05:00' },
      { type: 'O', value: 'RBC-D8T8-W8W8' },
      { type: 'OU', value: '5678912340TQ0001' },
      { type: '2.5.4.42', value: 'ER0001' }, // GN OID
      { type: 'CN', value: '5678912340' },
    ],
  },
  {
    id: 'D',
    name: 'Variant D (C + SN)',
    dn: [
      { type: 'C', value: 'CA' },
      { type: 'ST', value: 'QC' },
      { type: 'L', value: '-05:00' },
      { type: 'O', value: 'RBC-D8T8-W8W8' },
      { type: 'OU', value: '5678912340TQ0001' },
      { type: '2.5.4.42', value: 'ER0001' }, // GN OID
      { type: '2.5.4.5', value: 'Certificat du serveur' }, // SN OID
      { type: 'CN', value: '5678912340' },
    ],
  },
];

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

async function buildCSR(
  cryptoKey: CryptoKeyPair,
  dnParts: Array<{ type: string; value: string }>
): Promise<{ pem: string; der: Buffer; subject: string }> {
  // Build DN string
  const subject = dnParts.map(p => `${p.type}=${p.value}`).join(', ');

  // Create CSR with CORRECTED extensions
  const csr = await x509.Pkcs10CertificateRequestGenerator.create({
    name: subject,
    keys: cryptoKey,
    signingAlgorithm: {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    extensions: [
      // KeyUsage: digitalSignature ONLY (no nonRepudiation!)
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.digitalSignature,
        true // critical
      ),
      // ExtendedKeyUsage: clientAuth (1.3.6.1.5.5.7.3.2) NOT timeStamping!
      new x509.ExtendedKeyUsageExtension([
        '1.3.6.1.5.5.7.3.2', // clientAuth
      ]),
    ],
  });

  const pem = csr.toString('pem');
  const der = Buffer.from(csr.rawData);

  return { pem, der, subject };
}

function getFingerprints(der: Buffer): { sha1: string; sha256: string } {
  const sha1 = createHash('sha1').update(der).digest('hex').toUpperCase();
  const sha256 = createHash('sha256').update(der).digest('hex').toUpperCase();
  return { sha1, sha256 };
}

async function testVariant(
  variant: typeof VARIANTS[0],
  cryptoKey: CryptoKeyPair
): Promise<void> {
  console.log('='.repeat(70));
  console.log(`📋 ${variant.name}`);
  console.log('='.repeat(70) + '\n');

  const logDir = join(process.cwd(), 'tmp', 'logs');
  mkdirSync(logDir, { recursive: true });

  try {
    // Build CSR
    console.log('🔐 Building CSR...');
    const { pem, der, subject } = await buildCSR(cryptoKey, variant.dn);
    const { sha1, sha256 } = getFingerprints(der);

    console.log(`   Subject: ${subject}`);
    console.log(`   DER length: ${der.length} bytes`);
    console.log(`   SHA-1: ${sha1}`);
    console.log(`   SHA-256: ${sha256}`);
    console.log('');

    // Prepare request
    const body = {
      reqCertif: {
        modif: 'AJO',
        csr: pem,
      },
    };

    const bodyJson = JSON.stringify(body);

    console.log('📤 Request:');
    console.log(`   Endpoint: ${DEV_CONFIG.endpoint}`);
    console.log('   Headers:');
    Object.entries(DEV_CONFIG.headers).forEach(([key, value]) => {
      console.log(`     ${key}: ${value}`);
    });
    console.log('   Body JSON length:', bodyJson.length, 'bytes');
    console.log('   Body JSON (first 100 chars):', bodyJson.substring(0, 100) + '...');
    console.log('');

    // Make request
    console.log('🌐 Calling endpoint...\n');
    const response = await fetch(DEV_CONFIG.endpoint, {
      method: 'POST',
      headers: DEV_CONFIG.headers as any,
      body: bodyJson,
    });

    console.log(`📥 Response: ${response.status} ${response.statusText}\n`);

    // Parse response
    let data: any;
    try {
      const responseText = await response.text();
      if (response.headers.get('content-type')?.includes('application/json')) {
        data = JSON.parse(responseText);
      } else {
        data = { error: 'Non-JSON response', body: responseText };
      }
    } catch (e) {
      data = { error: 'Parse error', message: String(e) };
    }

    // Build log
    let logContent = `=== WEB-SRM DEV Enrolment - ${variant.name} ===\n`;
    logContent += `Timestamp: ${new Date().toISOString()}\n\n`;

    logContent += `ENDPOINT:\n${DEV_CONFIG.endpoint}\n\n`;

    logContent += `HEADERS:\n`;
    Object.entries(DEV_CONFIG.headers).forEach(([key, value]) => {
      logContent += `  ${key}: ${value}\n`;
    });
    logContent += '\n';

    logContent += `BODY JSON (exact string sent):\n${bodyJson}\n\n`;

    logContent += `CSR DETAILS:\n`;
    logContent += `  Subject: ${subject}\n`;
    logContent += `  DER length: ${der.length} bytes\n`;
    logContent += `  SHA-1 fingerprint: ${sha1}\n`;
    logContent += `  SHA-256 fingerprint: ${sha256}\n\n`;

    logContent += `CSR EXTENSIONS:\n`;
    logContent += `  KeyUsage (critical): digitalSignature\n`;
    logContent += `  ExtendedKeyUsage: clientAuth (1.3.6.1.5.5.7.3.2)\n\n`;

    logContent += `CSR PEM:\n${pem}\n\n`;

    logContent += `---\nRESPONSE:\n`;
    logContent += `HTTP Status: ${response.status} ${response.statusText}\n\n`;
    logContent += `Response Headers:\n`;
    response.headers.forEach((value, key) => {
      logContent += `  ${key}: ${value}\n`;
    });
    logContent += `\nResponse Body:\n${JSON.stringify(data, null, 2)}\n`;

    // Write log
    const logFile = join(logDir, `dev-enrolment-${variant.id}.log`);
    writeFileSync(logFile, logContent);
    console.log(`📝 Log: ${logFile}\n`);

    // Display result
    if (response.ok && data.retourCertif?.certif) {
      console.log('✅ SUCCESS!\n');
      console.log(`   Certificate received: ${data.retourCertif.certif.length} bytes`);
      if (data.retourCertif.idApprl) {
        console.log(`   Real IDAPPRL: ${data.retourCertif.idApprl}`);
      }
      console.log('\n🎉 This variant worked! ExtendedKeyUsage fix was the issue!\n');
    } else if (data.retourCertif?.listErr) {
      console.log('❌ FAILED\n');
      console.log('Errors:');
      data.retourCertif.listErr.forEach((err: any) => {
        const code = err.codRetour || 'N/A';
        console.log(`   [${code}] ${err.id}: ${err.mess}`);
      });
      console.log('');
    } else {
      console.log('⚠️  UNEXPECTED RESPONSE\n');
      console.log(JSON.stringify(data, null, 2));
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    const logFile = join(logDir, `dev-enrolment-${variant.id}-error.log`);
    writeFileSync(logFile, `Error: ${error}\n${(error as Error).stack}`);
    console.log(`📝 Error log: ${logFile}`);
  }

  console.log('');
}

async function main() {
  try {
    console.log('🔑 Generating single ECDSA P-256 keypair for all variants...\n');
    const cryptoKey = await generateKeyPairP256();
    console.log('✅ Keypair generated\n\n');

    // Test all 4 variants sequentially
    for (const variant of VARIANTS) {
      await testVariant(variant, cryptoKey);

      // Wait 2 seconds between tests
      if (variant.id !== 'D') {
        console.log('⏱️  Waiting 2 seconds before next test...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('='.repeat(70));
    console.log('📊 ALL TESTS COMPLETE');
    console.log('='.repeat(70));
    console.log('\nLogs saved to tmp/logs/dev-enrolment-{A,B,C,D}.log\n');
    console.log('Check results above to see which variant succeeded.\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
