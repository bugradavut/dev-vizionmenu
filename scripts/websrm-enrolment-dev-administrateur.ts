/**
 * WEB-SRM DEV Enrolment - Administrateur du serveur - RBC
 *
 * Using credentials that match the test case pattern:
 * CODCERTIF: FOB201999999 → O=FOB-B8T8-W8W8
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Crypto } from '@peculiar/webcrypto';
import * as x509 from '@peculiar/x509';

const crypto = new Crypto();
x509.cryptoProvider.set(crypto);

console.log('🧪 WEB-SRM DEV Enrolment - Administrateur du serveur - RBC\n');

// DEV Configuration (matching Administrateur du serveur - RBC test case)
const DEV_CONFIG = {
  env: 'DEV',
  enrolmentUrl: 'https://certificats.cnfr.api.rq-fo.ca/enrolement', // DEV: no "2"
  partnerId: '0000000000001FF2',
  certCode: 'FOB201999999',
  softwareId: '0000000000003973',
  softwareVersion: '00000000000045D6',
  versi: '0.1.0',
  authCode: 'B8T8-W8W8', // From Screenshot-3 - Administrateur du serveur RBC
};

console.log('📋 Configuration:');
console.log(`  Test Case: Administrateur du serveur - RBC`);
console.log(`  CODCERTIF: ${DEV_CONFIG.certCode} (FOB pattern)`);
console.log(`  Organization: FOB-${DEV_CONFIG.authCode} (matches CODCERTIF)`);
console.log(`  Authorization Code: ${DEV_CONFIG.authCode}`);
console.log(`  IDPARTN: ${DEV_CONFIG.partnerId}`);
console.log(`  CSR CN: 3601837200 (from Screenshot-3)`);
console.log(`  CSR OU/GN: N/A (from Screenshot-3)\n`);

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

// Build CSR for Administrateur du serveur - RBC
async function buildCSR(cryptoKey: CryptoKeyPair): Promise<string> {
  console.log('📝 Building CSR for Administrateur du serveur - RBC...');

  // CSR Subject per Screenshot-3:
  // CN: 3601837200
  // OU: N/A
  // GN: N/A
  // Organization: FOB-B8T8-W8W8
  const subject = [
    `C=CA`,
    `ST=QC`,
    `L=-05:00`,
    `2.5.4.5=Certificat du serveur`, // SN
    `O=FOB-${DEV_CONFIG.authCode}`,  // FOB-B8T8-W8W8
    `CN=3601837200`,                 // From Screenshot-3
  ].join(', ');

  console.log(`   Subject: ${subject}`);
  console.log(`   (No OU/GN per Screenshot-3)\n`);

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
      'ENVIRN': DEV_CONFIG.env,
      'APPRLINIT': 'SRV',
      'IDSEV': DEV_CONFIG.softwareId,
      'IDVERSI': DEV_CONFIG.softwareVersion,
      'CODCERTIF': DEV_CONFIG.certCode,
      'IDPARTN': DEV_CONFIG.partnerId,
      'VERSI': DEV_CONFIG.versi,
      'VERSIPARN': '0',      // DEV: 0
      'CASESSAI': '000.000', // DEV: 000.000
    };

    // Body (NO codAutori for DEV)
    const body = {
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
    console.log(`     reqCertif.modif: AJO`);
    console.log(`     reqCertif.csr: <${csr.length} bytes>`);
    console.log(`   (NO codAutori in body for DEV)\n`);

    // Log request
    let logContent = '=== WEB-SRM DEV Enrolment - Administrateur du serveur - RBC ===\n';
    logContent += `Timestamp: ${new Date().toISOString()}\n`;
    logContent += `Test Case: Administrateur du serveur - RBC\n`;
    logContent += `Pattern Match: CODCERTIF (FOB201999999) → Organization (FOB-B8T8-W8W8)\n\n`;
    logContent += `POST ${DEV_CONFIG.enrolmentUrl}\n\n`;
    logContent += 'Headers:\n';
    Object.entries(headers).forEach(([key, value]) => {
      logContent += `  ${key}: ${value}\n`;
    });
    logContent += `\nBody (${JSON.stringify(body).length} bytes):\n`;
    logContent += JSON.stringify(body, null, 2) + '\n\n';
    logContent += `CSR Subject: C=CA, ST=QC, L=-05:00, SN=Certificat du serveur, O=FOB-B8T8-W8W8, CN=3601837200\n\n`;

    // Step 4: Make request
    console.log('🌐 Calling DEV enrolment endpoint...\n');
    const response = await fetch(DEV_CONFIG.enrolmentUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    console.log(`📥 Response: ${response.status} ${response.statusText}\n`);

    // Parse response
    const contentType = response.headers.get('content-type');
    let data: any;
    let responseText: string;

    try {
      responseText = await response.text();

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
    const logFile = join(logDir, `enrolment-dev-administrateur-${timestamp}.log`);
    writeFileSync(logFile, logContent);
    console.log(`📝 Log: ${logFile}\n`);

    // Display result
    console.log('='.repeat(70));
    console.log('📊 RESULT');
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
      console.log('\n🎉 Pattern match was correct!');
      console.log('   CODCERTIF (FOB) → Organization (FOB-B8T8-W8W8) worked!\n');
      console.log('⚠️  Next: Save certificates to DB and proceed to test case 500.\n');
    } else if (data.retourCertif?.listErr) {
      console.log('❌ FAILED\n');
      console.log('Errors:');
      data.retourCertif.listErr.forEach((err: any) => {
        const code = err.codRetour || 'N/A';
        console.log(`  [${code}] ${err.id}: ${err.mess}`);
      });
      console.log('\n🔍 Analysis:');
      const has96 = data.retourCertif.listErr.some((e: any) => e.codRetour === '96');
      if (has96) {
        console.log('   Still error code 96 (invalid CSR structure).');
        console.log('   Pattern match correct but credentials may still be invalid.\n');
      }
    } else {
      console.log('⚠️  UNEXPECTED RESPONSE\n');
      console.log(JSON.stringify(data, null, 2));
    }

    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Error:', error);
    const logFile = join(logDir, `enrolment-dev-administrateur-error-${timestamp}.log`);
    writeFileSync(logFile, `Error: ${error}\n${(error as Error).stack}`);
    console.log(`📝 Error log: ${logFile}`);
    process.exit(1);
  }
}

main();
