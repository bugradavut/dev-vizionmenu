/**
 * WEB-SRM DEV Enrolment - Single CSR Test
 *
 * Tests DEV enrolment with current CSR format (CN=IDPARTN, no OU/GN)
 * WITHOUT codAutori in headers
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Crypto } from '@peculiar/webcrypto';
import * as x509 from '@peculiar/x509';

const crypto = new Crypto();
x509.cryptoProvider.set(crypto);

// DEV Configuration
const DEV_CONFIG = {
  env: 'DEV',
  enrolmentUrl: 'https://certificats.cnfr.api.rq-fo.ca/enrolement',
  partnerId: '0000000000001FF2',
  certCode: 'FOB201999999',
  softwareId: '0000000000003973',
  softwareVersion: '00000000000045D6',
  versi: '0.1.0',
  activitySector: 'RBC',
  authCode: 'D8T8-W8W8', // NOT included in headers for DEV
};

// CSR Subject
const CSR_SUBJECT = {
  commonName: '0000000000001FF2', // IDPARTN
  organization: 'RBC-D8T8-W8W8',
  serialNumber: 'Certificat du serveur',
  country: 'CA',
  state: 'QC',
  locality: '-05:00',
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

// Generate ECDSA P-256 keypair
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

// Build CSR per SW-77-V specification
async function buildCSR(
  cryptoKey: CryptoKeyPair,
  subject: CSRSubject
): Promise<string> {
  // Build DN string per SW-77-V order: C, ST, L, SN, O, CN
  let dnParts: string[] = [];
  dnParts.push(`C=${subject.country}`);
  dnParts.push(`ST=${subject.state}`);
  dnParts.push(`L=${subject.locality}`);

  // SN must come BEFORE O per SW-77-V example
  if (subject.serialNumber) {
    dnParts.push(`2.5.4.5=${subject.serialNumber}`);
  }

  dnParts.push(`O=${subject.organization}`);
  dnParts.push(`CN=${subject.commonName}`);

  // OU and GN optional (not in SW-77-V examples)
  if (subject.organizationalUnit) {
    dnParts.push(`OU=${subject.organizationalUnit}`);
  }
  if (subject.givenName) {
    dnParts.push(`2.5.4.42=${subject.givenName}`);
  }

  const dn = dnParts.join(', ');

  // Build CSR
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
        true // critical
      ),
      new x509.ExtendedKeyUsageExtension(['1.3.6.1.5.5.7.3.8']), // Customer authentication
    ],
    attributes: [
      new x509.ChallengePasswordAttribute(''),
    ],
  });

  return csr.toString('pem');
}

async function main() {
  console.log('🧪 WEB-SRM DEV Enrolment - Single CSR Test\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logDir = join(process.cwd(), 'tmp', 'logs');
  mkdirSync(logDir, { recursive: true });

  try {
    // Generate keypair
    console.log('🔐 Generating ECDSA P-256 keypair...');
    const cryptoKey = await generateKeyPairP256();

    // Build CSR
    console.log('📝 Building CSR...');
    const csr = await buildCSR(cryptoKey, CSR_SUBJECT);

    const subjectDN = `C=${CSR_SUBJECT.country}, ST=${CSR_SUBJECT.state}, L=${CSR_SUBJECT.locality}, SN=${CSR_SUBJECT.serialNumber}, O=${CSR_SUBJECT.organization}, CN=${CSR_SUBJECT.commonName}`;
    console.log(`   Subject: ${subjectDN}`);
    console.log(`   CSR Length: ${csr.length} bytes\n`);

    // Headers (NO codAutori for DEV)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'ENVIRN': DEV_CONFIG.env,
      'APPRLINIT': 'SRV',
      'IDSEV': DEV_CONFIG.softwareId,
      'IDVERSI': DEV_CONFIG.softwareVersion,
      'CODCERTIF': DEV_CONFIG.certCode,
      'IDPARTN': DEV_CONFIG.partnerId,
      'VERSI': DEV_CONFIG.versi,
      'VERSIPARN': '0',
      'CASESSAI': '000.000',
    };

    // Body
    const body = {
      reqCertif: {
        modif: 'AJO',
        csr,
      },
    };

    // Log request
    let logContent = '=== WEB-SRM DEV Enrolment - Single CSR Test ===\n';
    logContent += `Timestamp: ${new Date().toISOString()}\n`;
    logContent += `Subject: ${subjectDN}\n\n`;
    logContent += `POST ${DEV_CONFIG.enrolmentUrl}\n\n`;
    logContent += 'Headers:\n';
    Object.entries(headers).forEach(([key, value]) => {
      logContent += `  ${key}: ${value}\n`;
    });
    logContent += `\nBody (${JSON.stringify(body).length} bytes):\n`;
    logContent += JSON.stringify(body, null, 2) + '\n\n';

    // Make request
    console.log('🌐 Calling RQ enrolment endpoint...');
    const response = await fetch(DEV_CONFIG.enrolmentUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // Log response
    logContent += '---\n';
    logContent += `Response: ${response.status} ${response.statusText}\n\n`;
    logContent += 'Headers:\n';
    response.headers.forEach((value, key) => {
      logContent += `  ${key}: ${value}\n`;
    });
    logContent += 'Body:\n';
    logContent += JSON.stringify(data, null, 2) + '\n';

    // Write log
    const logFile = join(logDir, `enrolment-dev-single-${timestamp}.log`);
    writeFileSync(logFile, logContent);
    console.log(`📝 Log: ${logFile}\n`);

    // Display results
    console.log(`📥 Response: ${response.status} ${response.statusText}\n`);

    if (data.retourCertif?.listErr) {
      console.log('❌ ERRORS:');
      data.retourCertif.listErr.forEach((err: any) => {
        const code = err.codRetour || 'N/A';
        console.log(`   [${code}] ${err.id}: ${err.mess}`);
      });
      console.log('');
    }

    if (response.ok && !data.retourCertif?.listErr) {
      console.log('✅ SUCCESS\n');
    }

    // Summary
    console.log('='.repeat(70));
    console.log('📊 SUMMARY');
    console.log('='.repeat(70));
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Errors: ${data.retourCertif?.listErr?.length || 0}`);
    console.log(`Log: ${logFile}`);
    console.log('');

    if (data.retourCertif?.listErr) {
      console.log('⏸️  Waiting for DN template from RQ. No further variant testing.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    const logFile = join(logDir, `enrolment-dev-single-error-${timestamp}.log`);
    writeFileSync(logFile, `Error: ${error}\n${(error as Error).stack}`);
    console.log(`📝 Error log: ${logFile}`);
    process.exit(1);
  }
}

main();
