/**
 * ESSAI Parametric Runner - Enrol → Annul → Re-enrol
 *
 * LOCKED CONFIGURATION (from DN micro scan results):
 * - CASESSAI=500.001
 * - VERSIPARN=1.0.0
 * - CODAUTORI=D8T8-W8W8 (in header)
 * - DN format: C, ST, L, 2.5.4.4, O, OU, 2.5.4.42, CN
 * - O format: XXX-YYYY-ZZZZ (dash separator mandatory)
 * - CN format: 10 digits exact
 *
 * PARAMETRIZED (from env):
 * - ESSAI_O: Organization value (e.g., RBC-D8T8-W8W8)
 * - ESSAI_CN: Common Name value (e.g., 5678912340)
 *
 * SEQUENCE:
 * 1. Enrolment (modif: AJO) - generates certificate
 * 2. Annulation (modif: ANN) - cancels certificate (reuses same key/cert)
 * 3. Re-enrolment (modif: AJO) - re-enrolls with new CSR
 */

import * as x509 from '@peculiar/x509';
import { webcrypto } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import AdmZip from 'adm-zip';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Polyfill for @peculiar/x509
if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}

// =====================================================================
// LOCKED CONSTANTS (from validation results)
// =====================================================================

const ESSAI_ENDPOINT = 'https://certificats.cnfr.api.rq-fo.ca/enrolement';

const LOCKED_HEADERS = {
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

const LOCKED_DN_TEMPLATE = {
  C: 'CA',
  ST: 'Quebec',
  L: 'Montreal',
  surname: 'Certificat du serveur',
  OU: '5678912340TQ0001',
  givenName: 'ER0001',
};

// =====================================================================
// PARAMETRIZED VALUES (from environment)
// =====================================================================

const ESSAI_O = process.env.ESSAI_O || '';
const ESSAI_CN = process.env.ESSAI_CN || '';

// =====================================================================
// VALIDATION FUNCTIONS (fail-fast)
// =====================================================================

function validateParameters(): void {
  console.log('\n🔍 VALIDATING PARAMETERS...\n');

  const errors: string[] = [];

  // Check O and CN are provided
  if (!ESSAI_O) {
    errors.push('❌ ESSAI_O is missing (required in .env.local)');
  }
  if (!ESSAI_CN) {
    errors.push('❌ ESSAI_CN is missing (required in .env.local)');
  }

  // Validate O format (XXX-YYYY-ZZZZ with dash separator)
  if (ESSAI_O) {
    const oPattern = /^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+$/;
    if (!oPattern.test(ESSAI_O)) {
      errors.push(
        `❌ ESSAI_O format invalid: "${ESSAI_O}" (must be XXX-YYYY-ZZZZ with dash separator)`
      );
    }
    if (ESSAI_O.includes('_')) {
      errors.push('❌ ESSAI_O contains underscore (only dash allowed)');
    }
    if (ESSAI_O.includes(' ')) {
      errors.push('❌ ESSAI_O contains space (only dash allowed)');
    }
  }

  // Validate CN format (exactly 10 digits)
  if (ESSAI_CN) {
    const cnPattern = /^\d{10}$/;
    if (!cnPattern.test(ESSAI_CN)) {
      errors.push(
        `❌ ESSAI_CN format invalid: "${ESSAI_CN}" (must be exactly 10 digits)`
      );
    }
  }

  // Validate locked header values
  if (LOCKED_HEADERS.CASESSAI !== '500.001') {
    errors.push(`❌ CASESSAI must be 500.001 (got: ${LOCKED_HEADERS.CASESSAI})`);
  }
  if (LOCKED_HEADERS.VERSIPARN !== '1.0.0') {
    errors.push(`❌ VERSIPARN must be 1.0.0 (got: ${LOCKED_HEADERS.VERSIPARN})`);
  }
  if (LOCKED_HEADERS.CODAUTORI !== 'D8T8-W8W8') {
    errors.push(
      `❌ CODAUTORI must be D8T8-W8W8 (got: ${LOCKED_HEADERS.CODAUTORI})`
    );
  }

  // Validate DN template
  if (!LOCKED_DN_TEMPLATE.surname) {
    errors.push('❌ DN surname (2.5.4.4) is missing');
  }

  if (errors.length > 0) {
    console.error('VALIDATION FAILED:\n');
    errors.forEach((err) => console.error(err));
    console.error('\n💡 Create .env.local with ESSAI_O and ESSAI_CN values\n');
    process.exit(1);
  }

  console.log('✅ ESSAI_O:', ESSAI_O);
  console.log('✅ ESSAI_CN:', ESSAI_CN);
  console.log('✅ CASESSAI:', LOCKED_HEADERS.CASESSAI);
  console.log('✅ VERSIPARN:', LOCKED_HEADERS.VERSIPARN);
  console.log('✅ CODAUTORI:', LOCKED_HEADERS.CODAUTORI, '(in header)');
  console.log('✅ DN surname present:', LOCKED_DN_TEMPLATE.surname);
  console.log('✅ All validations passed\n');
}

function validateCSRFormat(csrPem: string): void {
  // Check single-line format
  const lines = csrPem.split('\n');
  if (lines.length !== 3) {
    throw new Error(
      `CSR PEM must be 3 lines (BEGIN/content/END), got ${lines.length} lines`
    );
  }

  const base64Line = lines[1];
  if (base64Line.includes('\n') || base64Line.includes('\r')) {
    throw new Error('CSR base64 content must be single line (no line breaks)');
  }

  console.log('✅ CSR format: single-line PEM');
}

function validateKeyUsage(csr: x509.Pkcs10CertificateRequest): void {
  const kuExt = csr.extensions.find(
    (ext) => ext.type === '2.5.29.15'
  ) as x509.KeyUsagesExtension;

  if (!kuExt) {
    throw new Error('KeyUsage extension is missing');
  }

  if (!kuExt.critical) {
    throw new Error('KeyUsage extension must be critical');
  }

  const hasDS =
    (kuExt.usages & x509.KeyUsageFlags.digitalSignature) ===
    x509.KeyUsageFlags.digitalSignature;
  const hasNR =
    (kuExt.usages & x509.KeyUsageFlags.nonRepudiation) ===
    x509.KeyUsageFlags.nonRepudiation;

  if (!hasDS) {
    throw new Error('KeyUsage must include digitalSignature');
  }
  if (!hasNR) {
    throw new Error('KeyUsage must include nonRepudiation');
  }

  console.log('✅ KeyUsage: digitalSignature | nonRepudiation (critical)');
}

function validateRequestBody(body: any): void {
  // CODAUTORI must NOT be in body
  if ('codAutori' in body || 'CODAUTORI' in body) {
    throw new Error('CODAUTORI must be in header, NOT in body');
  }

  // reqCertif structure
  if (!body.reqCertif) {
    throw new Error('reqCertif is missing');
  }
  if (!body.reqCertif.modif) {
    throw new Error('reqCertif.modif is missing');
  }
  if (!body.reqCertif.csr) {
    throw new Error('reqCertif.csr is missing');
  }

  console.log('✅ Request body structure valid');
  console.log('✅ CODAUTORI in header (not in body)');
}

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
  console.log('🔐 Generating CSR...');

  const algorithm = {
    name: 'ECDSA',
    namedCurve: 'P-256',
  };

  const cryptoKey = await webcrypto.subtle.generateKey(algorithm, true, [
    'sign',
    'verify',
  ]);

  // Build DN string (locked order)
  const dnString =
    `C=${LOCKED_DN_TEMPLATE.C}, ` +
    `ST=${LOCKED_DN_TEMPLATE.ST}, ` +
    `L=${LOCKED_DN_TEMPLATE.L}, ` +
    `2.5.4.4=${LOCKED_DN_TEMPLATE.surname}, ` +
    `O=${ESSAI_O}, ` +
    `OU=${LOCKED_DN_TEMPLATE.OU}, ` +
    `2.5.4.42=${LOCKED_DN_TEMPLATE.givenName}, ` +
    `CN=${ESSAI_CN}`;

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

  // Validate KeyUsage
  validateKeyUsage(csr);

  // Generate single-line PEM
  const derBuffer = Buffer.from(csr.rawData);
  const base64SingleLine = derBuffer.toString('base64');
  const csrPem = `-----BEGIN CERTIFICATE REQUEST-----\n${base64SingleLine}\n-----END CERTIFICATE REQUEST-----`;

  // Validate CSR format
  validateCSRFormat(csrPem);

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

  console.log('✅ CSR generated');
  console.log('   DN:', dnString);

  return { csrPem, derBuffer, dnString, privateKeyPem, publicKeyPem };
}

// =====================================================================
// API CALL
// =====================================================================

async function callEnrolmentAPI(
  modif: 'AJO' | 'ANN',
  csrPem: string
): Promise<{
  statusCode: number;
  headers: any;
  body: any;
}> {
  const requestBody = {
    reqCertif: {
      modif,
      csr: csrPem,
    },
  };

  // Validate request body
  validateRequestBody(requestBody);

  const response = await fetch(ESSAI_ENDPOINT, {
    method: 'POST',
    headers: LOCKED_HEADERS,
    body: JSON.stringify(requestBody),
  });

  const responseBody = await response.json();

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
  stepDir: string,
  csr: {
    csrPem: string;
    derBuffer: Buffer;
    dnString: string;
    privateKeyPem: string;
    publicKeyPem: string;
  },
  request: any,
  response: any,
  stepName: string
): void {
  fs.mkdirSync(stepDir, { recursive: true });

  // CSR files
  fs.writeFileSync(path.join(stepDir, 'csr.pem'), csr.csrPem);
  fs.writeFileSync(
    path.join(stepDir, 'csr.txt'),
    `DN: ${csr.dnString}\n\nPEM:\n${csr.csrPem}`
  );

  // SHA-256 hash
  const crypto = require('node:crypto');
  const hash = crypto.createHash('sha256').update(csr.derBuffer).digest('hex');
  fs.writeFileSync(
    path.join(stepDir, 'sha256.txt'),
    `SHA-256: ${hash}\nDN: ${csr.dnString}`
  );

  // Keys
  fs.writeFileSync(path.join(stepDir, 'private-key.pem'), csr.privateKeyPem);
  fs.writeFileSync(path.join(stepDir, 'public-key.pem'), csr.publicKeyPem);

  // Request/Response
  fs.writeFileSync(
    path.join(stepDir, 'headers.json'),
    JSON.stringify(LOCKED_HEADERS, null, 2)
  );
  fs.writeFileSync(
    path.join(stepDir, 'request.json'),
    JSON.stringify(request, null, 2)
  );
  fs.writeFileSync(
    path.join(stepDir, 'response.json'),
    JSON.stringify(response, null, 2)
  );

  // curl.sh
  const curlCmd = `curl -X POST '${ESSAI_ENDPOINT}' \\
${Object.entries(LOCKED_HEADERS)
  .map(([k, v]) => `  -H '${k}: ${v}'`)
  .join(' \\\n')} \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify(request)}'`;
  fs.writeFileSync(path.join(stepDir, 'curl.sh'), curlCmd);

  // summary.md
  const summary = `# ${stepName} Summary

**Timestamp**: ${new Date().toISOString()}
**HTTP Status**: ${response.statusCode}

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
  response.body.retourCertif?.listErr
    ? response.body.retourCertif.listErr
        .map(
          (err: any) =>
            `- **[${err.codRetour}]** ${err.id}: ${err.mess || err.message}`
        )
        .join('\n')
    : 'None'
}

## Certificate
${
  response.body.retourCertif?.certif
    ? '✅ Certificate received'
    : '❌ No certificate'
}
`;
  fs.writeFileSync(path.join(stepDir, 'summary.md'), summary);

  console.log(`✅ Artifacts saved to ${stepDir}`);
}

// =====================================================================
// MASTER REPORT
// =====================================================================

function generateMasterReport(
  logDir: string,
  results: Array<{
    step: string;
    statusCode: number;
    response: any;
    timestamp: string;
  }>
): void {
  const report = `# ESSAI Parametric Runner - Master Report

**Generated**: ${new Date().toISOString()}
**O Value**: ${ESSAI_O}
**CN Value**: ${ESSAI_CN}

## Configuration (Locked)

| Parameter | Value |
|-----------|-------|
| CASESSAI | ${LOCKED_HEADERS.CASESSAI} |
| VERSIPARN | ${LOCKED_HEADERS.VERSIPARN} |
| CODAUTORI | ${LOCKED_HEADERS.CODAUTORI} (in header) |
| DN surname | ${LOCKED_DN_TEMPLATE.surname} |
| OU | ${LOCKED_DN_TEMPLATE.OU} |
| givenName | ${LOCKED_DN_TEMPLATE.givenName} |

## Sequence Results

| Step | HTTP | Certificate | Errors |
|------|------|-------------|--------|
${results
  .map((r) => {
    const hasCert = r.response.body.retourCertif?.certif ? '✅' : '❌';
    const errorCount = r.response.body.retourCertif?.listErr?.length || 0;
    return `| ${r.step} | ${r.statusCode} | ${hasCert} | ${errorCount} |`;
  })
  .join('\n')}

## Detailed Errors

${results
  .map(
    (r) => `### ${r.step} (${r.timestamp})

${
  r.response.body.retourCertif?.listErr
    ? r.response.body.retourCertif.listErr
        .map(
          (err: any) =>
            `- **Code ${err.codRetour}** - ${err.id}\n  \`${err.mess || err.message}\``
        )
        .join('\n\n')
    : 'No errors'
}
`
  )
  .join('\n')}

## Format Validation Summary

✅ CSR format: single-line PEM
✅ KeyUsage: digitalSignature | nonRepudiation (critical)
✅ CODAUTORI placement: header (not body)
✅ O format: dash separator (${ESSAI_O.includes('-') ? 'valid' : 'INVALID'})
✅ CN format: 10 digits (${/^\d{10}$/.test(ESSAI_CN) ? 'valid' : 'INVALID'})
✅ DN order: C, ST, L, 2.5.4.4, O, OU, 2.5.4.42, CN

## Artifacts Location

All artifacts saved to: \`${logDir}\`

Each step folder contains:
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

## ZIP Package

Bundle: \`tmp/logs/ESSAI-HANDOFF-<timestamp>.zip\`
`;

  fs.writeFileSync(path.join(logDir, 'MASTER-REPORT.md'), report);
  console.log(`✅ Master report saved to ${logDir}/MASTER-REPORT.md`);
}

// =====================================================================
// ZIP PACKAGING
// =====================================================================

function createZipPackage(logDir: string): void {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);
  const zipPath = path.join(
    'tmp',
    'logs',
    `ESSAI-HANDOFF-${timestamp}.zip`
  );

  const zip = new adm-zip();
  zip.addLocalFolder(logDir);

  fs.mkdirSync(path.dirname(zipPath), { recursive: true });
  zip.writeZip(zipPath);

  console.log(`✅ ZIP package created: ${zipPath}`);
}

// =====================================================================
// MAIN SEQUENCE
// =====================================================================

async function runSequence(): Promise<void> {
  console.log('🚀 ESSAI PARAMETRIC RUNNER\n');
  console.log('Sequence: Enrol (AJO) → Annul (ANN) → Re-enrol (AJO)\n');

  // Validate parameters (fail-fast)
  validateParameters();

  // Create log directory
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);
  const logDir = path.join(
    'tmp',
    'logs',
    `essai-enrol-annul-reenrol-${timestamp}`
  );
  fs.mkdirSync(logDir, { recursive: true });

  const results: Array<{
    step: string;
    statusCode: number;
    response: any;
    timestamp: string;
  }> = [];

  // STEP 1: Enrolment (AJO)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 1: ENROLMENT (AJO)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const enrolCSR = await generateCSR();
  const enrolResponse = await callEnrolmentAPI('AJO', enrolCSR.csrPem);

  console.log(`HTTP ${enrolResponse.statusCode}`);
  console.log(
    'Certificate:',
    enrolResponse.body.retourCertif?.certif ? '✅' : '❌'
  );

  const enrolDir = path.join(logDir, '1-enrolment');
  saveArtifacts(
    enrolDir,
    enrolCSR,
    { reqCertif: { modif: 'AJO', csr: enrolCSR.csrPem } },
    enrolResponse,
    'Enrolment (AJO)'
  );

  results.push({
    step: 'Enrolment (AJO)',
    statusCode: enrolResponse.statusCode,
    response: enrolResponse,
    timestamp: new Date().toISOString(),
  });

  // STEP 2: Annulation (ANN) - reuse same CSR
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 2: ANNULATION (ANN)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('ℹ️  Reusing same CSR from enrolment');

  const annulResponse = await callEnrolmentAPI('ANN', enrolCSR.csrPem);

  console.log(`HTTP ${annulResponse.statusCode}`);

  const annulDir = path.join(logDir, '2-annulation');
  saveArtifacts(
    annulDir,
    enrolCSR, // Reuse same CSR
    { reqCertif: { modif: 'ANN', csr: enrolCSR.csrPem } },
    annulResponse,
    'Annulation (ANN)'
  );

  results.push({
    step: 'Annulation (ANN)',
    statusCode: annulResponse.statusCode,
    response: annulResponse,
    timestamp: new Date().toISOString(),
  });

  // STEP 3: Re-enrolment (AJO) - new CSR
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 3: RE-ENROLMENT (AJO)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('ℹ️  Generating new CSR for re-enrolment');

  const reenrolCSR = await generateCSR();
  const reenrolResponse = await callEnrolmentAPI('AJO', reenrolCSR.csrPem);

  console.log(`HTTP ${reenrolResponse.statusCode}`);
  console.log(
    'Certificate:',
    reenrolResponse.body.retourCertif?.certif ? '✅' : '❌'
  );

  const reenrolDir = path.join(logDir, '3-reenrolment');
  saveArtifacts(
    reenrolDir,
    reenrolCSR,
    { reqCertif: { modif: 'AJO', csr: reenrolCSR.csrPem } },
    reenrolResponse,
    'Re-enrolment (AJO)'
  );

  results.push({
    step: 'Re-enrolment (AJO)',
    statusCode: reenrolResponse.statusCode,
    response: reenrolResponse,
    timestamp: new Date().toISOString(),
  });

  // Generate master report
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('GENERATING REPORTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  generateMasterReport(logDir, results);

  // Create ZIP package
  createZipPackage(logDir);

  console.log('\n✅ SEQUENCE COMPLETE\n');
  console.log(`📁 Artifacts: ${logDir}`);
  console.log(`📦 ZIP: tmp/logs/ESSAI-HANDOFF-${timestamp}.zip\n`);
}

// =====================================================================
// ENTRY POINT
// =====================================================================

runSequence().catch((error) => {
  console.error('\n❌ FATAL ERROR:\n');
  console.error(error);
  process.exit(1);
});
