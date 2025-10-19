/**
 * WEB-SRM ESSAI Enrolment - Log-Only Test
 *
 * Purpose: Test ESSAI enrolment to validate CSR format
 * NOTE: Does NOT write to database, only logs the response
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Crypto } from '@peculiar/webcrypto';
import * as x509 from '@peculiar/x509';

const crypto = new Crypto();
x509.cryptoProvider.set(crypto);

console.log('🧪 WEB-SRM ESSAI Enrolment - Log-Only Test\n');
console.log('⚠️  NOTE: This is a read-only test. No data will be written to database.\n');

// ESSAI Configuration (from manager's credentials)
const ESSAI_CONFIG = {
  env: 'ESSAI',
  enrolmentUrl: 'https://certificats.cnfr.api.rq-fo.ca/enrolement2', // ESSAI: with "2"
  partnerId: '0000000000001FF2',
  certCode: 'FOB201999999',
  softwareId: '0000000000003973',
  softwareVersion: '00000000000045D6',
  versi: '0.1.0',
  versiParn: '1.0.0', // ESSAI: 1.0.0 (not 0)
  casEssai: '500.001', // Server mode test case
  authCode: 'B8T8-W8W8', // From Screenshot-3 - Administrateur du serveur RBC
};

console.log('📋 ESSAI Configuration:');
console.log(`  ENV: ${ESSAI_CONFIG.env}`);
console.log(`  Endpoint: ${ESSAI_CONFIG.enrolmentUrl}`);
console.log(`  CASESSAI: ${ESSAI_CONFIG.casEssai} (Server mode - test case 500)`);
console.log(`  CODCERTIF: ${ESSAI_CONFIG.certCode}`);
console.log(`  IDPARTN: ${ESSAI_CONFIG.partnerId}`);
console.log(`  Auth Code: ${ESSAI_CONFIG.authCode}`);
console.log(`  VERSIPARN: ${ESSAI_CONFIG.versiParn}\n`);

// Generate ECDSA P-256 keypair
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

// Build CSR for ESSAI (FOB)
async function buildCSR(cryptoKey: CryptoKeyPair): Promise<string> {
  console.log('📝 Building CSR for ESSAI (FOB)...');

  // ESSAI CSR Subject (based on Screenshot-3 - Administrateur du serveur RBC)
  // C=CA, ST=QC, L=-05:00, SN=Certificat du serveur, O=FOB-FOB201999999, CN=0000000000001FF2
  // NO OU, NO GN for FOB
  const subject = [
    `C=CA`,
    `ST=QC`,
    `L=-05:00`,
    `2.5.4.5=Certificat du serveur`, // SN
    `O=FOB-${ESSAI_CONFIG.certCode}`,
    `CN=${ESSAI_CONFIG.partnerId}`,
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
        true // critical
      ),
      new x509.ExtendedKeyUsageExtension(['1.3.6.1.5.5.7.3.8']), // Customer authentication
    ],
  });

  const csrPem = csr.toString('pem');
  console.log(`✅ CSR generated (${csrPem.length} bytes)\n`);

  return csrPem;
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logDir = join(process.cwd(), 'tmp', 'logs');
  mkdirSync(logDir, { recursive: true });

  try {
    // Step 1: Generate keypair
    const cryptoKey = await generateKeyPairP256();

    // Step 2: Build CSR
    const csr = await buildCSR(cryptoKey);

    // Step 3: Prepare request
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'ENVIRN': ESSAI_CONFIG.env,
      'APPRLINIT': 'SRV',
      'IDSEV': ESSAI_CONFIG.softwareId,
      'IDVERSI': ESSAI_CONFIG.softwareVersion,
      'CODCERTIF': ESSAI_CONFIG.certCode,
      'IDPARTN': ESSAI_CONFIG.partnerId,
      'VERSI': ESSAI_CONFIG.versi,
      'VERSIPARN': ESSAI_CONFIG.versiParn, // 1.0.0 for ESSAI
      'CASESSAI': ESSAI_CONFIG.casEssai,   // 500.001
    };

    // Body with codAutori (ESSAI requires it in body)
    const body = {
      codAutori: ESSAI_CONFIG.authCode, // B8T8-W8W8
      reqCertif: {
        modif: 'AJO',
        csr,
      },
    };

    console.log('📤 Request Details:');
    console.log('   Headers:');
    Object.entries(headers).forEach(([key, value]) => {
      console.log(`     ${key}: ${value}`);
    });
    console.log('   Body:');
    console.log(`     codAutori: ${body.codAutori}`);
    console.log(`     reqCertif.modif: ${body.reqCertif.modif}`);
    console.log(`     reqCertif.csr: <${csr.length} bytes>\n`);

    // Log request
    let logContent = '=== WEB-SRM ESSAI Enrolment - Log-Only Test ===\n';
    logContent += `Timestamp: ${new Date().toISOString()}\n`;
    logContent += `⚠️  READ-ONLY TEST - No database writes\n\n`;
    logContent += `POST ${ESSAI_CONFIG.enrolmentUrl}\n\n`;
    logContent += 'Headers:\n';
    Object.entries(headers).forEach(([key, value]) => {
      logContent += `  ${key}: ${value}\n`;
    });
    logContent += `\nBody (${JSON.stringify(body).length} bytes):\n`;
    logContent += JSON.stringify(body, null, 2) + '\n\n';

    // Step 4: Make request
    console.log('🌐 Calling ESSAI enrolment endpoint...\n');
    const response = await fetch(ESSAI_CONFIG.enrolmentUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    console.log(`📥 Response: ${response.status} ${response.statusText}\n`);

    // Try to parse response
    const contentType = response.headers.get('content-type');
    let data: any;
    let responseText: string;

    try {
      responseText = await response.text();

      if (contentType?.includes('application/json')) {
        data = JSON.parse(responseText);
      } else {
        // HTML or other non-JSON response
        console.log('⚠️  Non-JSON response received:');
        console.log('   Content-Type:', contentType || 'NOT SET');
        console.log('   Response Body (first 500 chars):');
        console.log(`   ${responseText.substring(0, 500)}\n`);
        data = { error: 'Non-JSON response', body: responseText };
      }
    } catch (e) {
      console.error('❌ Failed to parse response:', e);
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
    const logFile = join(logDir, `enrolment-essai-test-${timestamp}.log`);
    writeFileSync(logFile, logContent);
    console.log(`📝 Log: ${logFile}\n`);

    // Display result
    console.log('='.repeat(70));
    console.log('📊 ESSAI TEST RESULT');
    console.log('='.repeat(70));

    if (response.ok && data.retourCertif?.certif) {
      console.log('✅ SUCCESS - Enrolment successful!\n');
      console.log('Certificate received:');
      console.log(`  certif length: ${data.retourCertif.certif.length} bytes`);
      if (data.retourCertif.certifPSI) {
        console.log(`  certifPSI length: ${data.retourCertif.certifPSI.length} bytes`);
      }
      if (data.retourCertif.idApprl) {
        console.log(`  Real IDAPPRL: ${data.retourCertif.idApprl}`);
      }
      console.log('\n🎯 CSR FORMAT IS CORRECT!');
      console.log('   Problem with DEV is likely credentials/authorization.\n');
      console.log('⚠️  NOTE: Certificates NOT saved to database (read-only test).');
      console.log('   Ask manager if we should proceed with real ESSAI enrolment.\n');
    } else if (data.retourCertif?.listErr) {
      console.log('❌ FAILED\n');
      console.log('Errors:');
      data.retourCertif.listErr.forEach((err: any) => {
        const code = err.codRetour || 'N/A';
        console.log(`  [${code}] ${err.id}: ${err.mess}`);
      });
      console.log('\n🔍 Analysis:');
      if (data.retourCertif.listErr.some((e: any) => e.codRetour === '96')) {
        console.log('   Same error code 96 as DEV.');
        console.log('   This suggests CSR format issue OR credentials invalid in both envs.\n');
      }
    } else {
      console.log('⚠️  UNEXPECTED RESPONSE\n');
      console.log(JSON.stringify(data, null, 2));
    }

    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Error:', error);
    const logFile = join(logDir, `enrolment-essai-test-error-${timestamp}.log`);
    writeFileSync(logFile, `Error: ${error}\n${(error as Error).stack}`);
    console.log(`📝 Error log: ${logFile}`);
    process.exit(1);
  }
}

main();
