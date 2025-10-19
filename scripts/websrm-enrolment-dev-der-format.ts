/**
 * WEB-SRM DEV Enrolment - DER Base64 Format Test
 *
 * Testing CSR as single-line DER-base64 (no PEM headers, no newlines)
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Crypto } from '@peculiar/webcrypto';
import * as x509 from '@peculiar/x509';

const crypto = new Crypto();
x509.cryptoProvider.set(crypto);

console.log('🧪 WEB-SRM DEV Enrolment - DER Base64 Format Test\n');
console.log('📋 Test: CSR as single-line DER-base64 (no PEM headers/newlines)\n');

// DEV Configuration
const DEV_CONFIG = {
  env: 'DEV',
  enrolmentUrl: 'https://certificats.cnfr.api.rq-fo.ca/enrolement',
  partnerId: '0000000000001FF2',
  certCode: 'FOB201999999',
  softwareId: '0000000000003973',
  softwareVersion: '00000000000045D6',
  versi: '0.1.0',
  authCode: 'D8T8-W8W8',
};

console.log('Configuration:');
console.log(`  Test Case: RBC - Michel Untel enr.`);
console.log(`  IDPARTN: ${DEV_CONFIG.partnerId}`);
console.log(`  CODCERTIF: ${DEV_CONFIG.certCode}`);
console.log(`  Authorization Code: ${DEV_CONFIG.authCode}\n`);

// Generate keypair
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

// Build CSR
async function buildCSR(cryptoKey: CryptoKeyPair): Promise<{ pem: string; derBase64: string }> {
  console.log('📝 Building CSR (RBC - Michel Untel enr.)...');

  // DN: C=CA, ST=QC, L=-05:00, O=RBC-D8T8-W8W8, OU=5678912340TQ0001, GN=ER0001, CN=5678912340
  // NO SN (per last test)
  const subject = [
    `C=CA`,
    `ST=QC`,
    `L=-05:00`,
    `O=RBC-${DEV_CONFIG.authCode}`,
    `OU=5678912340TQ0001`,
    `2.5.4.42=ER0001`, // GN
    `CN=5678912340`,
  ].join(', ');

  console.log(`   Subject: ${subject}\n`);

  const csr = await x509.Pkcs10CertificateRequestGenerator.create({
    name: subject,
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

  // Get PEM
  const csrPem = csr.toString('pem');

  // Get DER as ArrayBuffer
  const csrDer = csr.rawData;

  // Convert DER to base64 (single line, no spaces)
  const csrDerBase64 = Buffer.from(csrDer).toString('base64');

  console.log(`✅ CSR generated`);
  console.log(`   PEM length: ${csrPem.length} bytes`);
  console.log(`   DER-base64 length: ${csrDerBase64.length} chars`);
  console.log(`   DER-base64 (first 60 chars): ${csrDerBase64.substring(0, 60)}...`);
  console.log(`   DER-base64 (last 60 chars): ...${csrDerBase64.substring(csrDerBase64.length - 60)}\n`);

  return { pem: csrPem, derBase64: csrDerBase64 };
}

async function testVariant(
  variantName: string,
  csr: string,
  includeCodeAutori: boolean
): Promise<void> {
  console.log('='.repeat(70));
  console.log(`📋 Testing: ${variantName}`);
  console.log('='.repeat(70));

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logDir = join(process.cwd(), 'tmp', 'logs');
  mkdirSync(logDir, { recursive: true });

  try {
    // Headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8',
      'ENVIRN': DEV_CONFIG.env,
      'APPRLINIT': 'SRV',
      'CASESSAI': '000.000',
      'VERSIPARN': '0',
      'IDSEV': DEV_CONFIG.softwareId,
      'IDVERSI': DEV_CONFIG.softwareVersion,
      'IDPARTN': DEV_CONFIG.partnerId,
      'CODCERTIF': DEV_CONFIG.certCode,
      'VERSI': DEV_CONFIG.versi,
    };

    // Body
    const body: any = {
      reqCertif: {
        modif: 'AJO',
        csr, // Single-line DER-base64
      },
    };

    if (includeCodeAutori) {
      body.codAutori = DEV_CONFIG.authCode;
    }

    console.log('\n📤 Request:');
    console.log(`   URL: ${DEV_CONFIG.enrolmentUrl}`);
    console.log('   Headers:');
    Object.entries(headers).forEach(([key, value]) => {
      console.log(`     ${key}: ${value}`);
    });
    console.log('   Body:');
    console.log(`     reqCertif.modif: AJO`);
    console.log(`     reqCertif.csr: <${csr.length} chars single-line base64>`);
    if (includeCodeAutori) {
      console.log(`     codAutori: ${body.codAutori}`);
    }
    console.log('');

    // Log
    let logContent = `=== WEB-SRM DEV Enrolment - ${variantName} ===\n`;
    logContent += `Timestamp: ${new Date().toISOString()}\n`;
    logContent += `CSR Format: DER-base64 single line (no PEM headers/newlines)\n\n`;
    logContent += `POST ${DEV_CONFIG.enrolmentUrl}\n\n`;
    logContent += 'Headers:\n';
    Object.entries(headers).forEach(([key, value]) => {
      logContent += `  ${key}: ${value}\n`;
    });
    logContent += `\nBody (${JSON.stringify(body).length} bytes):\n`;
    logContent += JSON.stringify(body, null, 2) + '\n\n';

    // Make request
    console.log('🌐 Calling DEV endpoint...\n');
    const response = await fetch(DEV_CONFIG.enrolmentUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    console.log(`📥 Response: ${response.status} ${response.statusText}\n`);

    // Parse response
    const contentType = response.headers.get('content-type');
    let data: any;

    try {
      const responseText = await response.text();

      if (contentType?.includes('application/json')) {
        data = JSON.parse(responseText);
      } else {
        console.log('⚠️  Non-JSON response:');
        console.log(`   ${responseText.substring(0, 500)}\n`);
        data = { error: 'Non-JSON response', body: responseText };
      }
    } catch (e) {
      console.error('❌ Parse error:', e);
      data = { error: 'Parse error', message: String(e) };
    }

    // Log response
    logContent += '---\n';
    logContent += `Response: ${response.status} ${response.statusText}\n\n`;
    logContent += 'Headers:\n';
    response.headers.forEach((value, key) => {
      logContent += `  ${key}: ${value}\n`;
    });
    logContent += '\nBody:\n';
    logContent += JSON.stringify(data, null, 2) + '\n';

    // Write log
    const variantSlug = includeCodeAutori ? 'with-codautori' : 'no-codautori';
    const logFile = join(logDir, `enrolment-dev-der-${variantSlug}-${timestamp}.log`);
    writeFileSync(logFile, logContent);
    console.log(`📝 Log: ${logFile}\n`);

    // Display result
    if (response.ok && data.retourCertif?.certif) {
      console.log('✅ SUCCESS!\n');
      console.log(`   Certificate received: ${data.retourCertif.certif.length} bytes`);
      if (data.retourCertif.idApprl) {
        console.log(`   Real IDAPPRL: ${data.retourCertif.idApprl}`);
      }
      console.log('\n🎉 DER-base64 format WORKED!\n');
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
        console.log('🔍 Still error code 96');
        console.log('   Format issue persists or credentials invalid.\n');
      }
    } else {
      console.log('⚠️  UNEXPECTED RESPONSE\n');
      console.log(JSON.stringify(data, null, 2));
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    const variantSlug = includeCodeAutori ? 'with-codautori' : 'no-codautori';
    const logFile = join(logDir, `enrolment-dev-der-${variantSlug}-error-${timestamp}.log`);
    writeFileSync(logFile, `Error: ${error}\n${(error as Error).stack}`);
    console.log(`📝 Error log: ${logFile}`);
  }
}

async function main() {
  try {
    // Generate keypair
    const cryptoKey = await generateKeyPairP256();

    // Build CSR
    const { derBase64 } = await buildCSR(cryptoKey);

    // Test Variant 1: No codAutori (standard DEV)
    await testVariant('Variant 1: No codAutori', derBase64, false);

    console.log('\n' + '='.repeat(70));
    console.log('Waiting 2 seconds before second test...');
    console.log('='.repeat(70) + '\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test Variant 2: With codAutori (test only)
    await testVariant('Variant 2: With codAutori', derBase64, true);

    console.log('\n' + '='.repeat(70));
    console.log('📊 SUMMARY');
    console.log('='.repeat(70));
    console.log('Both variants tested with DER-base64 single-line format.');
    console.log('Check logs above for results.\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
