/**
 * ESSAI Enrolment - FOB DN Single Test
 *
 * This is the most accurate configuration based on validation:
 * - CASESSAI=500.001 (validated)
 * - CODAUTORI=D8T8-W8W8 in header (validated)
 * - FOB DN (server admin line) instead of RBC
 *
 * Previous attempts with RBC DN returned error 93 (value mismatch).
 * This test uses FOB DN which should match the assigned product/flow.
 */

import * as x509 from '@peculiar/x509';
import { webcrypto } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Polyfill for @peculiar/x509
if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}

// =====================================================================
// CONFIGURATION (FOB DN - Server Admin)
// =====================================================================

const ESSAI_ENDPOINT = 'https://certificats.cnfr.api.rq-fo.ca/enrolement';

const HEADERS = {
  'Content-Type': 'application/json',
  ENVIRN: 'ESSAI',
  APPRLINIT: 'SRV',
  CASESSAI: '500.001',
  VERSIPARN: '1.0.0',
  IDSEV: '0000000000003973',
  IDVERSI: '00000000000045D6',
  CODCERTIF: 'FOB201999999',
  IDPARTN: '0000000000001FF2',
  VERSI: '0.1.0',
  CODAUTORI: 'D8T8-W8W8',
};

// FOB DN (server admin line)
const DN = {
  C: 'CA',
  ST: 'QC',
  L: '-05:00',
  surname: 'Certificat du serveur',
  O: 'FOB-B8T8-W8W8',
  CN: '3601837200',
  // OU: no
  // GN: no
};

// =====================================================================
// CSR GENERATION
// =====================================================================

async function generateCSR(): Promise<{
  csrPem: string;
  derBuffer: Buffer;
  dnString: string;
  privateKeyPem: string;
  publicKeyPem: string;
}> {
  console.log('🔐 Generating CSR with FOB DN...\n');

  const algorithm = {
    name: 'ECDSA',
    namedCurve: 'P-256',
  };

  const cryptoKey = await webcrypto.subtle.generateKey(algorithm, true, [
    'sign',
    'verify',
  ]);

  // Build DN string (FOB server admin)
  const dnString =
    `C=${DN.C}, ` +
    `ST=${DN.ST}, ` +
    `L=${DN.L}, ` +
    `2.5.4.4=${DN.surname}, ` +
    `O=${DN.O}, ` +
    `CN=${DN.CN}`;

  console.log('DN:', dnString);

  const csr = await x509.Pkcs10CertificateRequestGenerator.create({
    name: dnString,
    keys: cryptoKey,
    signingAlgorithm: { name: 'ECDSA', hash: 'SHA-256' },
    extensions: [
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.digitalSignature | x509.KeyUsageFlags.nonRepudiation,
        true
      ),
    ],
  });

  // Generate single-line PEM
  const derBuffer = Buffer.from(csr.rawData);
  const base64SingleLine = derBuffer.toString('base64');
  const csrPem = `-----BEGIN CERTIFICATE REQUEST-----\n${base64SingleLine}\n-----END CERTIFICATE REQUEST-----`;

  console.log('✅ CSR generated (ECDSA P-256 + SHA-256)');
  console.log('✅ KeyUsage: digitalSignature | nonRepudiation (critical)');
  console.log('✅ PEM format: single-line base64\n');

  // Export keys
  const privateKeyDer = await webcrypto.subtle.exportKey(
    'pkcs8',
    cryptoKey.privateKey
  );
  const privateKeyBase64 = Buffer.from(privateKeyDer).toString('base64');
  const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64}\n-----END PRIVATE KEY-----`;

  const publicKeyDer = await webcrypto.subtle.exportKey(
    'spki',
    cryptoKey.publicKey
  );
  const publicKeyBase64 = Buffer.from(publicKeyDer).toString('base64');
  const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64}\n-----END PUBLIC KEY-----`;

  return { csrPem, derBuffer, dnString, privateKeyPem, publicKeyPem };
}

// =====================================================================
// API CALL
// =====================================================================

async function callEnrolmentAPI(csrPem: string): Promise<{
  statusCode: number;
  headers: any;
  body: any;
}> {
  console.log('🌐 Calling ESSAI enrolment API...\n');

  const requestBody = {
    reqCertif: {
      modif: 'AJO',
      csr: csrPem,
    },
    // NO codAutori in body (in header only)
  };

  console.log(`POST ${ESSAI_ENDPOINT}`);
  console.log('Headers:', JSON.stringify(HEADERS, null, 2));

  const response = await fetch(ESSAI_ENDPOINT, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(requestBody),
  });

  const responseBody = await response.json();

  console.log(`\nHTTP ${response.status}\n`);

  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: responseBody,
  };
}

// =====================================================================
// ARTIFACT GENERATION
// =====================================================================

function saveArtifacts(
  logDir: string,
  csr: {
    csrPem: string;
    derBuffer: Buffer;
    dnString: string;
    privateKeyPem: string;
    publicKeyPem: string;
  },
  response: any
): void {
  fs.mkdirSync(logDir, { recursive: true });

  // CSR files
  fs.writeFileSync(path.join(logDir, 'csr.pem'), csr.csrPem);
  fs.writeFileSync(
    path.join(logDir, 'csr.txt'),
    `DN: ${csr.dnString}\n\nPEM:\n${csr.csrPem}`
  );

  // SHA-256 hash
  const crypto = require('node:crypto');
  const hash = crypto.createHash('sha256').update(csr.derBuffer).digest('hex');
  fs.writeFileSync(
    path.join(logDir, 'sha256.txt'),
    `SHA-256: ${hash}\nDN: ${csr.dnString}`
  );

  // Keys
  fs.writeFileSync(path.join(logDir, 'private-key.pem'), csr.privateKeyPem);
  fs.writeFileSync(path.join(logDir, 'public-key.pem'), csr.publicKeyPem);

  // Request/Response
  fs.writeFileSync(
    path.join(logDir, 'headers.json'),
    JSON.stringify(HEADERS, null, 2)
  );

  const requestBody = {
    reqCertif: {
      modif: 'AJO',
      csr: csr.csrPem,
    },
  };
  fs.writeFileSync(
    path.join(logDir, 'request.json'),
    JSON.stringify(requestBody, null, 2)
  );

  fs.writeFileSync(
    path.join(logDir, 'response.json'),
    JSON.stringify(response, null, 2)
  );

  // curl.sh
  const curlCmd = `curl -X POST '${ESSAI_ENDPOINT}' \\
${Object.entries(HEADERS)
  .map(([k, v]) => `  -H '${k}: ${v}'`)
  .join(' \\\n')} \\
  -d '${JSON.stringify(requestBody).replace(/'/g, "'\\''")}'`;
  fs.writeFileSync(path.join(logDir, 'curl.sh'), curlCmd);

  // summary.md
  const hasCert = response.body.retourCertif?.certif ? '✅' : '❌';
  const errors = response.body.retourCertif?.listErr || [];

  const summary = `# ESSAI FOB Enrolment - Summary

**Timestamp**: ${new Date().toISOString()}
**HTTP Status**: ${response.statusCode}
**Certificate**: ${hasCert}

## Configuration

- **CASESSAI**: ${HEADERS.CASESSAI}
- **VERSIPARN**: ${HEADERS.VERSIPARN}
- **CODAUTORI**: ${HEADERS.CODAUTORI} (in header)
- **DN Type**: FOB (server admin)

## DN

\`\`\`
${csr.dnString}
\`\`\`

## Response

\`\`\`json
${JSON.stringify(response.body, null, 2)}
\`\`\`

## Errors

${
  errors.length > 0
    ? errors
        .map(
          (err: any) =>
            `### Error ${err.codRetour}\n\n- **ID**: ${err.id}\n- **Message**: ${err.mess || err.message}\n`
        )
        .join('\n')
    : 'None ✅'
}

## Analysis

${
  response.statusCode === 201
    ? '✅ **SUCCESS** - Certificate issued'
    : errors.length > 0
      ? errors.some((e: any) => e.codRetour === '93')
        ? '⚠️ **Value Mismatch (93)** - DN values do not match expected\n\nFields reported in errors:\n' +
          errors.map((e: any) => `- ${e.mess || e.message}`).join('\n')
        : errors.some((e: any) => e.codRetour === '16')
          ? '❌ **Format Error (16)** - DN format is invalid'
          : `❌ **Error ${errors[0].codRetour}** - ${errors[0].mess || errors[0].message}`
      : `⚠️ **Unexpected Response** - HTTP ${response.statusCode}`
}

## Artifacts

- csr.pem
- csr.txt
- sha256.txt
- private-key.pem
- public-key.pem
- headers.json
- request.json
- response.json
- curl.sh
- summary.md
`;
  fs.writeFileSync(path.join(logDir, 'summary.md'), summary);

  console.log(`✅ Artifacts saved to ${logDir}\n`);
}

// =====================================================================
// CONSOLE REPORT
// =====================================================================

function printReport(response: any, csr: any): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ESSAI FOB ENROLMENT RESULT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`HTTP Status: ${response.statusCode}`);
  console.log(
    `Certificate: ${response.body.retourCertif?.certif ? '✅' : '❌'}\n`
  );

  const errors = response.body.retourCertif?.listErr || [];

  if (errors.length > 0) {
    console.log('ERRORS:\n');
    errors.forEach((err: any) => {
      console.log(`[${err.codRetour}] ${err.id}`);
      console.log(`  ${err.mess || err.message}\n`);
    });

    // Analysis
    const has93 = errors.some((e: any) => e.codRetour === '93');
    const has16 = errors.some((e: any) => e.codRetour === '16');

    if (has93) {
      console.log('⚠️  ERROR 93 (Value Mismatch)\n');
      console.log('DN values do not match expected values in RQ registry.');
      console.log('Fields reported in errors:');
      errors
        .filter((e: any) => e.codRetour === '93')
        .forEach((e: any) => {
          // Extract field from message (e.g., "csr/O=...")
          const match = (e.mess || e.message).match(/csr\/([^=]+)=/);
          if (match) {
            console.log(`  - ${match[1]}`);
          }
        });
      console.log('\n');
    }

    if (has16) {
      console.log('❌ ERROR 16 (Format Error)\n');
      console.log('DN format is invalid.\n');
    }
  } else {
    console.log('✅ NO ERRORS\n');
  }

  console.log('DN Used:');
  console.log(`  ${csr.dnString}\n`);

  console.log('Configuration:');
  console.log(`  CASESSAI: ${HEADERS.CASESSAI}`);
  console.log(`  VERSIPARN: ${HEADERS.VERSIPARN}`);
  console.log(`  CODAUTORI: ${HEADERS.CODAUTORI} (header)`);
  console.log(`  O: ${DN.O}`);
  console.log(`  CN: ${DN.CN}\n`);

  if (response.statusCode === 201) {
    console.log('🎉 SUCCESS - Certificate issued!\n');
    console.log('Next steps:');
    console.log('  1. Extract certificate from response.json');
    console.log('  2. Save to tmp/certs/essai-client.crt.pem');
    console.log('  3. Proceed to SW-77 sequence: enrol → annul → re-enrol\n');
  } else if (errors.some((e: any) => e.codRetour === '93')) {
    console.log('⚠️  NEXT STEP:\n');
    console.log('Check RQ registry for correct O/CN values.');
    console.log('FOB DN may need different values than tested.\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// =====================================================================
// MAIN
// =====================================================================

async function run(): Promise<void> {
  console.log('\n🚀 ESSAI FOB ENROLMENT - SINGLE TEST\n');
  console.log('Configuration: B1 (CASESSAI=500.001 + CODAUTORI header)');
  console.log('DN: FOB server admin line\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Generate CSR
  const csr = await generateCSR();

  // Call API
  const response = await callEnrolmentAPI(csr.csrPem);

  // Create log directory
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);
  const logDir = path.join('tmp', 'logs', `essai-enrolment-fob-${timestamp}`);

  // Save artifacts
  saveArtifacts(logDir, csr, response);

  // Print report
  printReport(response, csr);
}

run().catch((error) => {
  console.error('\n❌ FATAL ERROR:\n');
  console.error(error);
  process.exit(1);
});
