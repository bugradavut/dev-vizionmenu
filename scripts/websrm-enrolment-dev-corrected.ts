/**
 * WEB-SRM DEV Enrolment - Corrected CSR (RQ Feedback)
 *
 * Corrections based on V2 response:
 * 1. SN (2.5.4.5) = "Certificat du serveur" - REQUIRED
 * 2. KeyUsage: digitalSignature | dataEncipherment (NO keyAgreement!)
 * 3. Testing 2 variants: No EKU vs ClientAuth EKU
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Crypto } from '@peculiar/webcrypto';
import * as x509 from '@peculiar/x509';
import { createHash } from 'crypto';

const crypto = new Crypto();
x509.cryptoProvider.set(crypto);

console.log('🧪 WEB-SRM DEV Enrolment - Corrected CSR (RQ Feedback)\n');
console.log('🔧 Corrections:');
console.log('   1. SN (surName) = "Certificat du serveur" - ADDED');
console.log('   2. KeyUsage: digitalSignature | dataEncipherment (NO keyAgreement!)');
console.log('   3. Testing: No EKU vs ClientAuth EKU\n');

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
};

async function generateKeyPairP256(): Promise<CryptoKeyPair> {
  console.log('🔐 Generating ECDSA P-256 keypair...');
  const keys = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify']
  );
  console.log('✅ Keypair generated\n');
  return keys;
}

async function buildCSR(
  cryptoKey: CryptoKeyPair,
  includeEKU: boolean
): Promise<{
  pem64: string;
  pemSingleLine: string;
  der: Buffer;
  sha256: string;
  ekuInfo: string;
}> {
  console.log(`📝 Building CSR (${includeEKU ? 'WITH ClientAuth EKU' : 'NO EKU'})...`);

  // Subject DN - EXACT order per RQ requirement
  // C, ST, L, SN, O, OU, GN, CN
  const subject = [
    'C=CA',
    'ST=QC',
    'L=-05:00',
    '2.5.4.5=Certificat du serveur', // SN - REQUIRED!
    'O=RBC-D8T8-W8W8',
    'OU=5678912340TQ0001',
    '2.5.4.42=ER0001', // GN
    'CN=5678912340',
  ].join(', ');

  console.log(`   Subject: ${subject}`);

  // Extensions
  const extensions: x509.Extension[] = [
    // KeyUsage: digitalSignature | dataEncipherment (NO keyAgreement!)
    new x509.KeyUsagesExtension(
      x509.KeyUsageFlags.digitalSignature | x509.KeyUsageFlags.dataEncipherment,
      true // critical
    ),
  ];

  // ExtendedKeyUsage: optional
  if (includeEKU) {
    extensions.push(
      new x509.ExtendedKeyUsageExtension([
        '1.3.6.1.5.5.7.3.2', // id-kp-clientAuth
      ])
    );
  }

  const csr = await x509.Pkcs10CertificateRequestGenerator.create({
    name: subject,
    keys: cryptoKey,
    signingAlgorithm: {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    extensions,
  });

  const der = Buffer.from(csr.rawData);
  const sha256 = createHash('sha256').update(der).digest('hex').toUpperCase();

  // Get base64 from DER
  const base64 = der.toString('base64');

  // V1: 64-column wrapped PEM
  const base64Lines64 = base64.match(/.{1,64}/g) || [];
  const pem64 =
    '-----BEGIN CERTIFICATE REQUEST-----\n' +
    base64Lines64.join('\n') +
    '\n-----END CERTIFICATE REQUEST-----';

  // V2: Single-line base64 body
  const pemSingleLine =
    '-----BEGIN CERTIFICATE REQUEST-----\n' +
    base64 +
    '\n-----END CERTIFICATE REQUEST-----';

  const ekuInfo = includeEKU ? 'ClientAuth (1.3.6.1.5.5.7.3.2)' : 'NONE';

  console.log(`   DER length: ${der.length} bytes`);
  console.log(`   SHA-256: ${sha256}`);
  console.log(`   KeyUsage: digitalSignature | dataEncipherment`);
  console.log(`   ExtendedKeyUsage: ${ekuInfo}\n`);

  return { pem64, pemSingleLine, der, sha256, ekuInfo };
}

async function testVariant(
  variantName: string,
  csr: string,
  sha256: string,
  ekuInfo: string,
  testDir: string,
  filePrefix: string
): Promise<void> {
  console.log('='.repeat(70));
  console.log(`📋 ${variantName}`);
  console.log('='.repeat(70) + '\n');

  try {
    // Verify PEM format
    const hasCRLF = csr.includes('\r\n');
    const hasCR = csr.includes('\r');
    const hasBOM = csr.charCodeAt(0) === 0xFEFF;

    console.log('🔍 PEM Format Checks:');
    console.log(`   Has CRLF (\\r\\n): ${hasCRLF ? '❌ YES' : '✅ NO'}`);
    console.log(`   Has CR (\\r): ${hasCR ? '❌ YES' : '✅ NO'}`);
    console.log(`   Has BOM: ${hasBOM ? '❌ YES' : '✅ NO'}`);

    const lines = csr.split('\n');
    console.log(`   Total lines: ${lines.length}`);
    console.log(`   Line lengths: ${lines.slice(0, 5).map(l => l.length).join(', ')}...`);
    console.log('');

    // Save files
    const csrFile = join(testDir, `${filePrefix}-csr.pem`);
    writeFileSync(csrFile, csr, { encoding: 'utf8' });

    const sha256File = join(testDir, `${filePrefix}-sha256.txt`);
    writeFileSync(sha256File, sha256);

    // Prepare request
    const body = {
      reqCertif: {
        modif: 'AJO',
        csr,
      },
    };

    const bodyJson = JSON.stringify(body);

    const requestFile = join(testDir, `${filePrefix}-request.json`);
    writeFileSync(requestFile, bodyJson, { encoding: 'utf8' });

    // Curl equivalent
    const curlCmd = [
      'curl -X POST \\',
      `  '${DEV_CONFIG.endpoint}' \\`,
      ...Object.entries(DEV_CONFIG.headers).map(([k, v]) => `  -H '${k}: ${v}' \\`),
      `  -d @${filePrefix}-request.json`,
    ].join('\n');

    const curlFile = join(testDir, `${filePrefix}-curl.sh`);
    writeFileSync(curlFile, curlCmd);

    console.log(`💾 Files saved: ${filePrefix}-*`);
    console.log(`   CSR: ${csrFile}`);
    console.log(`   SHA-256: ${sha256File}`);
    console.log(`   Request: ${requestFile}`);
    console.log(`   Curl: ${curlFile}\n`);

    console.log('📤 Request:');
    console.log(`   Endpoint: ${DEV_CONFIG.endpoint}`);
    console.log('   Headers:');
    Object.entries(DEV_CONFIG.headers).forEach(([k, v]) => {
      console.log(`     ${k}: ${v}`);
    });
    console.log(`   Body JSON length: ${bodyJson.length} bytes`);
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

    // Save response
    const responseFile = join(testDir, `${filePrefix}-response.json`);
    writeFileSync(responseFile, JSON.stringify(data, null, 2));
    console.log(`💾 Response saved: ${responseFile}\n`);

    // Display result
    if (response.ok && data.retourCertif?.certif) {
      console.log('✅ SUCCESS!\n');
      console.log(`   Certificate received: ${data.retourCertif.certif.length} bytes`);
      if (data.retourCertif.certifPSI) {
        console.log(`   CertificatePSI: ${data.retourCertif.certifPSI.length} bytes`);
      }
      if (data.retourCertif.idApprl) {
        console.log(`   Real IDAPPRL: ${data.retourCertif.idApprl}`);
      }
      console.log('\n🎉 ENROLMENT SUCCESSFUL!\n');
      console.log(`   SHA-256: ${sha256}`);
      console.log(`   ExtendedKeyUsage: ${ekuInfo}\n`);
    } else if (data.retourCertif?.listErr) {
      console.log('❌ FAILED\n');
      console.log('Errors:');
      data.retourCertif.listErr.forEach((err: any) => {
        const code = err.codRetour || 'N/A';
        const id = err.id || 'N/A';
        console.log(`   [${code}] ${id}: ${err.mess}`);
      });
      console.log('');
    } else {
      console.log('⚠️  UNEXPECTED RESPONSE\n');
      console.log(JSON.stringify(data, null, 2));
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    const errorFile = join(testDir, `${filePrefix}-error.txt`);
    writeFileSync(errorFile, `Error: ${error}\n${(error as Error).stack}`);
    console.log(`💾 Error saved: ${errorFile}`);
  }

  console.log('');
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const testDir = join(process.cwd(), 'tmp', 'logs', `dev-enrolment-${timestamp}`);
  mkdirSync(testDir, { recursive: true });

  console.log(`📁 Test directory: ${testDir}\n\n`);

  try {
    // Generate single keypair for both tests
    const cryptoKey = await generateKeyPairP256();

    // Test 1: No EKU
    console.log('━'.repeat(70));
    console.log('TEST 1: NO ExtendedKeyUsage');
    console.log('━'.repeat(70) + '\n');

    const { pem64: pem64NoEKU, sha256: sha256NoEKU, ekuInfo: ekuInfoNoEKU } = await buildCSR(cryptoKey, false);
    await testVariant('V1-NoEKU (64-column wrapped)', pem64NoEKU, sha256NoEKU, ekuInfoNoEKU, testDir, 'V1-NoEKU');

    console.log('⏱️  Waiting 2 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: ClientAuth EKU
    console.log('━'.repeat(70));
    console.log('TEST 2: WITH ClientAuth ExtendedKeyUsage');
    console.log('━'.repeat(70) + '\n');

    const { pem64: pem64EKU, sha256: sha256EKU, ekuInfo: ekuInfoEKU } = await buildCSR(cryptoKey, true);
    await testVariant('V2-ClientAuth (64-column wrapped)', pem64EKU, sha256EKU, ekuInfoEKU, testDir, 'V2-ClientAuth');

    console.log('='.repeat(70));
    console.log('📊 TESTS COMPLETE');
    console.log('='.repeat(70));
    console.log(`\nAll files saved to: ${testDir}\n`);
    console.log('Files created:');
    console.log('  V1-NoEKU-*: csr.pem, request.json, response.json, sha256.txt, curl.sh');
    console.log('  V2-ClientAuth-*: csr.pem, request.json, response.json, sha256.txt, curl.sh\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
