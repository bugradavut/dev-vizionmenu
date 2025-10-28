/**
 * WEB-SRM DEV Enrolment - SW-73 Compliant CSR Test
 *
 * Critical: Following SW-73.B 6.1 Java example
 * - KeyUsage: digitalSignature | keyAgreement | dataEncipherment
 * - NO ExtendedKeyUsage
 * - NO SN (serialNumber)
 * - PEM format: LF only, no CRLF, no BOM
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Crypto } from '@peculiar/webcrypto';
import * as x509 from '@peculiar/x509';
import { createHash } from 'crypto';

const crypto = new Crypto();
x509.cryptoProvider.set(crypto);

console.log('🧪 WEB-SRM DEV Enrolment - SW-73 Compliant CSR Test\n');
console.log('📋 SW-73.B 6.1 Java Example Compliance:');
console.log('   - KeyUsage: digitalSignature | keyAgreement | dataEncipherment');
console.log('   - NO ExtendedKeyUsage');
console.log('   - NO SN (serialNumber)');
console.log('   - PEM: LF only, no CRLF, no BOM\n');

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

async function buildCSR(cryptoKey: CryptoKeyPair): Promise<{
  pem64: string;
  pemSingleLine: string;
  der: Buffer;
  sha256: string;
}> {
  console.log('📝 Building CSR (SW-73 compliant)...');

  // Subject DN (RBC - Michel Untel) - NO SN!
  const subject = [
    'C=CA',
    'ST=QC',
    'L=-05:00',
    'O=RBC-D8T8-W8W8',
    'OU=5678912340TQ0001',
    '2.5.4.42=ER0001', // GN
    'CN=5678912340',
  ].join(', ');

  console.log(`   Subject: ${subject}`);

  // Create CSR with SW-73 compliant extensions
  const csr = await x509.Pkcs10CertificateRequestGenerator.create({
    name: subject,
    keys: cryptoKey,
    signingAlgorithm: {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    extensions: [
      // KeyUsage: digitalSignature | keyAgreement | dataEncipherment
      // Per SW-73.B 6.1 Java example
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.digitalSignature |
        x509.KeyUsageFlags.keyAgreement |
        x509.KeyUsageFlags.dataEncipherment,
        false // NOT critical (per SW-73 example)
      ),
      // NO ExtendedKeyUsage (SW-73 example doesn't have it)
    ],
  });

  const der = Buffer.from(csr.rawData);
  const sha256 = createHash('sha256').update(der).digest('hex').toUpperCase();

  // Get base64 from DER
  const base64 = der.toString('base64');

  // V1: 64-column wrapped PEM (standard format)
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

  console.log(`   DER length: ${der.length} bytes`);
  console.log(`   SHA-256: ${sha256}`);
  console.log(`   KeyUsage: digitalSignature | keyAgreement | dataEncipherment`);
  console.log(`   ExtendedKeyUsage: NONE (per SW-73)\n`);

  return { pem64, pemSingleLine, der, sha256 };
}

async function testVariant(
  variantName: 'V1' | 'V2',
  csr: string,
  sha256: string,
  testDir: string
): Promise<void> {
  console.log('='.repeat(70));
  console.log(`📋 ${variantName}: ${variantName === 'V1' ? '64-column wrapped PEM' : 'Single-line base64 body'}`);
  console.log('='.repeat(70) + '\n');

  try {
    // Verify PEM format: LF only, no CRLF, no BOM
    const hasCRLF = csr.includes('\r\n');
    const hasCR = csr.includes('\r');
    const hasBOM = csr.charCodeAt(0) === 0xFEFF;

    console.log('🔍 PEM Format Checks:');
    console.log(`   Has CRLF (\\r\\n): ${hasCRLF ? '❌ YES' : '✅ NO'}`);
    console.log(`   Has CR (\\r): ${hasCR ? '❌ YES' : '✅ NO'}`);
    console.log(`   Has BOM: ${hasBOM ? '❌ YES' : '✅ NO'}`);

    const lines = csr.split('\n');
    console.log(`   Total lines: ${lines.length}`);
    console.log(`   Line lengths: ${lines.map(l => l.length).join(', ')}`);
    console.log('');

    // Save CSR PEM
    const csrFile = join(testDir, `${variantName}-csr.pem`);
    writeFileSync(csrFile, csr, { encoding: 'utf8' });
    console.log(`💾 CSR saved: ${csrFile}`);

    // Save SHA-256
    const sha256File = join(testDir, `${variantName}-sha256.txt`);
    writeFileSync(sha256File, sha256);
    console.log(`💾 SHA-256 saved: ${sha256File}\n`);

    // Prepare request
    const body = {
      reqCertif: {
        modif: 'AJO',
        csr,
      },
    };

    const bodyJson = JSON.stringify(body);

    // Save request JSON
    const requestFile = join(testDir, `${variantName}-request.json`);
    writeFileSync(requestFile, bodyJson, { encoding: 'utf8' });
    console.log(`💾 Request JSON saved: ${requestFile}`);

    // Generate curl equivalent
    const curlCmd = [
      'curl -X POST \\',
      `  '${DEV_CONFIG.endpoint}' \\`,
      ...Object.entries(DEV_CONFIG.headers).map(([k, v]) => `  -H '${k}: ${v}' \\`),
      `  -d @${variantName}-request.json`,
    ].join('\n');

    const curlFile = join(testDir, `${variantName}-curl.sh`);
    writeFileSync(curlFile, curlCmd);
    console.log(`💾 Curl equivalent saved: ${curlFile}\n`);

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
    const responseFile = join(testDir, `${variantName}-response.json`);
    writeFileSync(responseFile, JSON.stringify(data, null, 2));
    console.log(`💾 Response saved: ${responseFile}\n`);

    // Display result
    if (response.ok && data.retourCertif?.certif) {
      console.log('✅ SUCCESS!\n');
      console.log(`   Certificate received: ${data.retourCertif.certif.length} bytes`);
      if (data.retourCertif.idApprl) {
        console.log(`   Real IDAPPRL: ${data.retourCertif.idApprl}`);
      }
      console.log('\n🎉 SW-73 compliance worked!\n');
    } else if (data.retourCertif?.listErr) {
      console.log('❌ FAILED\n');
      console.log('Errors:');
      data.retourCertif.listErr.forEach((err: any) => {
        const code = err.codRetour || 'N/A';
        console.log(`   [${code}] ${err.id}: ${err.mess}`);
      });
      console.log('');

      const has96 = data.retourCertif.listErr.some((e: any) => e.codRetour === '96');
      if (has96) {
        console.log('⚠️  Still Error 96');
        console.log('   CSR format issue or credentials invalid.\n');
      }
    } else {
      console.log('⚠️  UNEXPECTED RESPONSE\n');
      console.log(JSON.stringify(data, null, 2));
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    const errorFile = join(testDir, `${variantName}-error.txt`);
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
    // Generate keypair
    const cryptoKey = await generateKeyPairP256();

    // Build CSR
    const { pem64, pemSingleLine, der, sha256 } = await buildCSR(cryptoKey);

    // Test V1: 64-column wrapped
    await testVariant('V1', pem64, sha256, testDir);

    console.log('⏱️  Waiting 2 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test V2: Single-line base64 body
    await testVariant('V2', pemSingleLine, sha256, testDir);

    console.log('='.repeat(70));
    console.log('📊 TESTS COMPLETE');
    console.log('='.repeat(70));
    console.log(`\nAll files saved to: ${testDir}\n`);
    console.log('Files created:');
    console.log('  V1-csr.pem, V1-request.json, V1-response.json, V1-sha256.txt, V1-curl.sh');
    console.log('  V2-csr.pem, V2-request.json, V2-response.json, V2-sha256.txt, V2-curl.sh\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
