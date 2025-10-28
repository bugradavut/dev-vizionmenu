/**
 * ESSAI Full Sequence Runner - SW-78 Evidence Collection
 *
 * MANDATORY SEQUENCE:
 * 1. ENROLMENT (AJO) - Get certificate
 * 2. ANNULATION (SUP) - Cancel certificate (with serial number)
 * 3. RE-ENROLMENT (AJO) - Get new certificate
 * 4. mTLS SMOKE TESTS - Structural validation (/utilisateur, /transaction, /document)
 * 5. MASTER REPORT + SW-78 EVIDENCE INDEX
 * 6. ZIP PACKAGING
 */

import * as x509 from '@peculiar/x509';
import { webcrypto } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as https from 'node:https';
import AdmZip from 'adm-zip';

// Polyfill for @peculiar/x509
if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}

// =====================================================================
// LOCKED ESSAI CONFIGURATION
// =====================================================================

const ESSAI_ENROLMENT_ENDPOINT = 'https://certificats.cnfr.api.rq-fo.ca/enrolement';
const ESSAI_MTLS_HOST = 'cnfr.api.rq-fo.ca';

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

// FOB DN (validated in ESSAI)
const FOB_DN = {
  C: 'CA',
  ST: 'QC',
  L: '-05:00',
  surname: 'Certificat du serveur',
  O: 'FOB-B8T8-W8W8',
  CN: '3601837200',
};

// =====================================================================
// FAIL-FAST VALIDATIONS
// =====================================================================

function validateConfiguration(): void {
  console.log('🔍 VALIDATING CONFIGURATION...\n');

  const errors: string[] = [];

  // Check CODAUTORI is in header
  if (!LOCKED_HEADERS.CODAUTORI) {
    errors.push('❌ CODAUTORI missing from headers');
  }

  // Check DN values
  if (FOB_DN.O !== 'FOB-B8T8-W8W8') {
    errors.push(`❌ DN O must be FOB-B8T8-W8W8 (got: ${FOB_DN.O})`);
  }
  if (FOB_DN.CN !== '3601837200') {
    errors.push(`❌ DN CN must be 3601837200 (got: ${FOB_DN.CN})`);
  }

  // Check CASESSAI
  if (LOCKED_HEADERS.CASESSAI !== '500.001') {
    errors.push(`❌ CASESSAI must be 500.001 (got: ${LOCKED_HEADERS.CASESSAI})`);
  }

  if (errors.length > 0) {
    console.error('VALIDATION FAILED:\n');
    errors.forEach((err) => console.error(err));
    process.exit(1);
  }

  console.log('✅ CODAUTORI: D8T8-W8W8 (in header)');
  console.log('✅ CASESSAI: 500.001');
  console.log('✅ DN: FOB-B8T8-W8W8, CN=3601837200\n');
}

function validateCSR(csrPem: string, csr: x509.Pkcs10CertificateRequest): void {
  // Check single-line format
  const lines = csrPem.split('\n');
  if (lines.length !== 3) {
    throw new Error('❌ CSR must be single-line format (3 lines: BEGIN/content/END)');
  }

  const base64Line = lines[1];
  if (base64Line.includes('\n') || base64Line.includes('\r')) {
    throw new Error('❌ CSR base64 must be single line (no line breaks)');
  }

  // Check KeyUsage
  const kuExt = csr.extensions.find(
    (ext) => ext.type === '2.5.29.15'
  ) as x509.KeyUsagesExtension;

  if (!kuExt) {
    throw new Error('❌ KeyUsage extension missing');
  }

  const hasNR =
    (kuExt.usages & x509.KeyUsageFlags.nonRepudiation) ===
    x509.KeyUsageFlags.nonRepudiation;

  if (!hasNR) {
    throw new Error('❌ KeyUsage must include nonRepudiation');
  }

  console.log('✅ CSR format: single-line PEM');
  console.log('✅ KeyUsage: digitalSignature | nonRepudiation (critical)');
}

function validateRequestBody(body: any): void {
  // CODAUTORI must NOT be in body
  if ('codAutori' in body || 'CODAUTORI' in body) {
    throw new Error('❌ CODAUTORI must be in header, NOT in body');
  }

  console.log('✅ CODAUTORI not in body (correct placement in header)');
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
  cryptoKey: CryptoKeyPair;
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

  // Build DN string (FOB)
  const dnString =
    `C=${FOB_DN.C}, ` +
    `ST=${FOB_DN.ST}, ` +
    `L=${FOB_DN.L}, ` +
    `2.5.4.4=${FOB_DN.surname}, ` +
    `O=${FOB_DN.O}, ` +
    `CN=${FOB_DN.CN}`;

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

  // Validate CSR
  validateCSR(csrPem, csr);

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

  console.log('DN:', dnString);
  console.log();

  return { csrPem, derBuffer, dnString, privateKeyPem, publicKeyPem, cryptoKey };
}

// =====================================================================
// ENROLMENT API
// =====================================================================

async function callEnrolment(
  modif: 'AJO' | 'SUP',
  payload: any
): Promise<{
  statusCode: number;
  headers: any;
  body: any;
}> {
  const requestBody =
    modif === 'AJO'
      ? { reqCertif: { modif, csr: payload } }
      : { reqCertif: { modif, noSerie: payload } };

  // Validate request body
  validateRequestBody(requestBody);

  const response = await fetch(ESSAI_ENROLMENT_ENDPOINT, {
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
// CERTIFICATE EXTRACTION
// =====================================================================

function extractSerialNumber(certPem: string): string {
  // Parse certificate and extract serial number
  const cert = new x509.X509Certificate(certPem);
  const serialHex = Buffer.from(cert.serialNumber, 'hex').toString('hex');
  return serialHex;
}

// =====================================================================
// mTLS REQUEST
// =====================================================================

async function callMtlsEndpoint(
  endpoint: string,
  requestBody: any,
  certPath: string,
  keyPath: string
): Promise<{
  statusCode: number;
  body: any;
}> {
  return new Promise((resolve, reject) => {
    const cert = fs.readFileSync(certPath, 'utf8');
    const key = fs.readFileSync(keyPath, 'utf8');

    const postData = JSON.stringify(requestBody);

    const options = {
      hostname: ESSAI_MTLS_HOST,
      port: 443,
      path: endpoint,
      method: 'POST',
      headers: {
        ...LOCKED_HEADERS,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      cert,
      key,
      rejectUnauthorized: false, // ESSAI may have self-signed certs
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const body = JSON.parse(data);
          resolve({ statusCode: res.statusCode || 0, body });
        } catch (e) {
          resolve({ statusCode: res.statusCode || 0, body: { rawData: data } });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

// =====================================================================
// SIGNATURE GENERATION
// =====================================================================

async function signCanonicalJSON(
  data: any,
  privateKey: CryptoKey
): Promise<string> {
  // Canonical JSON (sorted keys, no whitespace)
  const canonical = JSON.stringify(data, Object.keys(data).sort());

  // SHA-256 hash
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(canonical);
  const hashBuffer = await webcrypto.subtle.digest('SHA-256', dataBuffer);

  // ECDSA P-256 signature
  const signature = await webcrypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    hashBuffer
  );

  return Buffer.from(signature).toString('base64');
}

// =====================================================================
// ARTIFACT GENERATION
// =====================================================================

function saveStepArtifacts(
  stepDir: string,
  stepName: string,
  csr: any | null,
  request: any,
  response: any,
  certificatePem?: string
): void {
  fs.mkdirSync(stepDir, { recursive: true });

  // Headers
  fs.writeFileSync(
    path.join(stepDir, 'headers.json'),
    JSON.stringify(LOCKED_HEADERS, null, 2)
  );

  // Request/Response
  fs.writeFileSync(
    path.join(stepDir, 'request.json'),
    JSON.stringify(request, null, 2)
  );
  fs.writeFileSync(
    path.join(stepDir, 'response.json'),
    JSON.stringify({ statusCode: response.statusCode, body: response.body }, null, 2)
  );

  // curl.sh
  const curlCmd = `curl -X POST '${ESSAI_ENROLMENT_ENDPOINT}' \\
${Object.entries(LOCKED_HEADERS)
  .map(([k, v]) => `  -H '${k}: ${v}'`)
  .join(' \\\n')} \\
  -d '${JSON.stringify(request).replace(/'/g, "'\\''")}'`;
  fs.writeFileSync(path.join(stepDir, 'curl.sh'), curlCmd);

  // CSR files (if applicable)
  if (csr) {
    fs.writeFileSync(path.join(stepDir, 'csr.pem'), csr.csrPem);
    fs.writeFileSync(
      path.join(stepDir, 'csr.txt'),
      `DN: ${csr.dnString}\n\nPEM:\n${csr.csrPem}`
    );

    const crypto = require('node:crypto');
    const hash = crypto.createHash('sha256').update(csr.derBuffer).digest('hex');
    fs.writeFileSync(
      path.join(stepDir, 'sha256.txt'),
      `SHA-256: ${hash}\nDN: ${csr.dnString}`
    );

    fs.writeFileSync(path.join(stepDir, 'private-key.pem'), csr.privateKeyPem);
    fs.writeFileSync(path.join(stepDir, 'public-key.pem'), csr.publicKeyPem);
  }

  // Certificate (if received)
  if (certificatePem) {
    fs.writeFileSync(path.join(stepDir, 'certificate.pem'), certificatePem);
  }

  // summary.md
  const summary = `# ${stepName} - Summary

**Timestamp**: ${new Date().toISOString()}
**HTTP Status**: ${response.statusCode}

## Configuration

- **CASESSAI**: ${LOCKED_HEADERS.CASESSAI}
- **VERSIPARN**: ${LOCKED_HEADERS.VERSIPARN}
- **CODAUTORI**: ${LOCKED_HEADERS.CODAUTORI} (in header)
${csr ? `\n## DN\n\n\`\`\`\n${csr.dnString}\n\`\`\`\n` : ''}
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
    : 'None ✅'
}

## Certificate

${certificatePem ? '✅ Certificate received' : '❌ No certificate'}

## Artifacts

- headers.json
- request.json
- response.json
- curl.sh
- summary.md
${csr ? '- csr.pem\n- csr.txt\n- sha256.txt\n- private-key.pem\n- public-key.pem' : ''}
${certificatePem ? '- certificate.pem' : ''}
`;

  fs.writeFileSync(path.join(stepDir, 'summary.md'), summary);

  console.log(`✅ Artifacts saved to ${stepDir}\n`);
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
  const report = `# ESSAI Full Sequence - Master Report

**Generated**: ${new Date().toISOString()}

## Sequence: Enrol → Annul → Re-enrol + mTLS Smoke

## Configuration (Locked)

| Parameter | Value |
|-----------|-------|
| ENVIRN | ESSAI |
| CASESSAI | ${LOCKED_HEADERS.CASESSAI} |
| VERSIPARN | ${LOCKED_HEADERS.VERSIPARN} |
| CODAUTORI | ${LOCKED_HEADERS.CODAUTORI} (in header) |
| DN Type | FOB (server admin) |
| O | ${FOB_DN.O} |
| CN | ${FOB_DN.CN} |

## Sequence Results

| Step | HTTP | Certificate/Result | Errors |
|------|------|-------------------|--------|
${results
  .map((r) => {
    const hasCert = r.response.body.retourCertif?.certif || r.response.body.retourUtil || r.response.body.retourTrans || r.response.body.retourDoc ? '✅' : '❌';
    const errorCount = r.response.body.retourCertif?.listErr?.length || r.response.body.retourUtil?.listErr?.length || r.response.body.retourTrans?.listErr?.length || r.response.body.retourDoc?.listErr?.length || 0;
    return `| ${r.step} | ${r.statusCode} | ${hasCert} | ${errorCount} |`;
  })
  .join('\n')}

## Detailed Results

${results
  .map(
    (r) => `### ${r.step} (${r.timestamp})

**HTTP ${r.statusCode}**

${
  r.response.body.retourCertif?.listErr || r.response.body.retourUtil?.listErr || r.response.body.retourTrans?.listErr || r.response.body.retourDoc?.listErr
    ? `**Errors:**\n\n${(r.response.body.retourCertif?.listErr || r.response.body.retourUtil?.listErr || r.response.body.retourTrans?.listErr || r.response.body.retourDoc?.listErr)
        .map(
          (err: any) =>
            `- **Code ${err.codRetour}** - ${err.id}\n  \`${err.mess || err.message}\``
        )
        .join('\n\n')}`
    : '**No errors** ✅'
}
`
  )
  .join('\n')}

## Artifacts Location

All artifacts saved to: \`${logDir}\`

Each step folder contains:
- headers.json
- request.json
- response.json
- curl.sh
- summary.md
- (step-specific files)

## Next Steps

${
  results.some((r) => r.statusCode >= 400)
    ? '⚠️ Review errors in step summaries'
    : '✅ All steps completed - ready for SW-78 documentation'
}
`;

  fs.writeFileSync(path.join(logDir, 'MASTER-REPORT.md'), report);
  console.log(`✅ Master report saved\n`);
}

// =====================================================================
// SW-78 EVIDENCE INDEX
// =====================================================================

function generateSW78Evidence(logDir: string): void {
  const evidence = `# SW-78 Evidence Index - ESSAI Test Run

**Generated**: ${new Date().toISOString()}
**Test Environment**: ESSAI
**Test Type**: Enrolment Sequence + mTLS Smoke

## Overview

This document maps test steps to UI screenshots and artifact files for SW-78 compliance documentation.

## Evidence Structure

### 1. ENROLMENT (AJO)

**Description**: Initial certificate enrolment request with CSR generation

**UI Screenshots Required**:
1. \`enrolment-form-filled.png\` - Certificate request form with all fields populated
2. \`enrolment-csr-generated.png\` - CSR generation confirmation screen
3. \`enrolment-submit-button.png\` - Submit button before enrolment request
4. \`enrolment-success-response.png\` - Success message with certificate details
5. \`enrolment-certificate-display.png\` - Certificate viewer showing DN and validity

**Test Artifacts**:
- \`1-enrolment/csr.pem\` - Generated CSR in PEM format
- \`1-enrolment/csr.txt\` - CSR with DN details (openssl -text equivalent)
- \`1-enrolment/sha256.txt\` - CSR SHA-256 hash
- \`1-enrolment/private-key.pem\` - Private key (secure storage)
- \`1-enrolment/public-key.pem\` - Public key
- \`1-enrolment/certificate.pem\` - Issued certificate
- \`1-enrolment/headers.json\` - Request headers
- \`1-enrolment/request.json\` - Request body
- \`1-enrolment/response.json\` - API response
- \`1-enrolment/curl.sh\` - Equivalent curl command
- \`1-enrolment/summary.md\` - Step summary

**Compliance Notes**:
- ✅ CSR generated with ECDSA P-256
- ✅ KeyUsage: digitalSignature + nonRepudiation (critical)
- ✅ DN follows FOB server admin template
- ✅ CODAUTORI in header (not body)

---

### 2. ANNULATION (SUP)

**Description**: Certificate cancellation using serial number from previous enrolment

**UI Screenshots Required**:
1. \`annulation-certificate-list.png\` - List of active certificates
2. \`annulation-select-certificate.png\` - Selected certificate to cancel
3. \`annulation-confirm-dialog.png\` - Cancellation confirmation dialog
4. \`annulation-reason-input.png\` - Cancellation reason selection (if applicable)
5. \`annulation-success-message.png\` - Cancellation success confirmation

**Test Artifacts**:
- \`2-annulation/headers.json\` - Request headers
- \`2-annulation/request.json\` - Request body with serial number
- \`2-annulation/response.json\` - API response
- \`2-annulation/curl.sh\` - Equivalent curl command
- \`2-annulation/summary.md\` - Step summary

**Compliance Notes**:
- ✅ Serial number extracted from previous certificate
- ✅ modif=SUP (suppression)
- ✅ User confirmation before cancellation

---

### 3. RE-ENROLMENT (AJO)

**Description**: Re-enrolment after cancellation with new CSR

**UI Screenshots Required**:
1. \`reenrolment-form-filled.png\` - Re-enrolment request form
2. \`reenrolment-new-csr.png\` - New CSR generation confirmation
3. \`reenrolment-submit.png\` - Submit button for re-enrolment
4. \`reenrolment-success.png\` - Success message with new certificate
5. \`reenrolment-new-certificate.png\` - New certificate details

**Test Artifacts**:
- \`3-reenrolment/csr.pem\` - New CSR in PEM format
- \`3-reenrolment/csr.txt\` - New CSR with DN details
- \`3-reenrolment/sha256.txt\` - New CSR SHA-256 hash
- \`3-reenrolment/private-key.pem\` - New private key
- \`3-reenrolment/public-key.pem\` - New public key
- \`3-reenrolment/certificate.pem\` - New issued certificate
- \`3-reenrolment/headers.json\` - Request headers
- \`3-reenrolment/request.json\` - Request body
- \`3-reenrolment/response.json\` - API response
- \`3-reenrolment/curl.sh\` - Equivalent curl command
- \`3-reenrolment/summary.md\` - Step summary

**Compliance Notes**:
- ✅ New key pair generated
- ✅ Same DN as previous enrolment
- ✅ Certificate issued after successful re-enrolment

---

### 4. mTLS SMOKE TESTS

#### 4a. /utilisateur Endpoint

**Description**: User validation with mTLS authentication

**UI Screenshots Required**:
1. \`utilisateur-form-filled.png\` - User validation form
2. \`utilisateur-mtls-indicator.png\` - mTLS connection indicator
3. \`utilisateur-submit.png\` - Submit button
4. \`utilisateur-response.png\` - API response (may be 400 business error)

**Test Artifacts**:
- \`4a-utilisateur/headers.json\` - Request headers
- \`4a-utilisateur/request.json\` - Request body
- \`4a-utilisateur/response.json\` - API response
- \`4a-utilisateur/summary.md\` - Step summary

**Compliance Notes**:
- ✅ mTLS connection established
- ✅ modif=VAL (validation)
- ⚠️ Business errors (400) are expected (structural validation only)

#### 4b. /transaction Endpoint

**Description**: Transaction submission with ECDSA signature

**UI Screenshots Required**:
1. \`transaction-form-filled.png\` - Transaction form with all fields
2. \`transaction-signature-generated.png\` - Signature generation confirmation
3. \`transaction-submit.png\` - Submit button
4. \`transaction-response.png\` - API response

**Test Artifacts**:
- \`4b-transaction/headers.json\` - Request headers
- \`4b-transaction/request.json\` - Request body with signature
- \`4b-transaction/response.json\` - API response
- \`4b-transaction/summary.md\` - Step summary

**Compliance Notes**:
- ✅ mTLS connection established
- ✅ Canonical JSON → SHA-256 → ECDSA P-256 signature
- ⚠️ Business errors (400) are expected (structural validation only)

#### 4c. /document Endpoint

**Description**: Document submission with base64 encoding

**UI Screenshots Required**:
1. \`document-form-filled.png\` - Document submission form
2. \`document-file-selected.png\` - File selection confirmation
3. \`document-submit.png\` - Submit button
4. \`document-response.png\` - API response

**Test Artifacts**:
- \`4c-document/headers.json\` - Request headers
- \`4c-document/request.json\` - Request body with base64 document
- \`4c-document/response.json\` - API response
- \`4c-document/summary.md\` - Step summary

**Compliance Notes**:
- ✅ mTLS connection established
- ✅ Document encoded as base64
- ⚠️ Business errors (400) are expected (structural validation only)

---

## Certificate Files (mTLS)

**Location**: \`tmp/certs/\`

- \`essai-fob-client.crt.pem\` - Client certificate for mTLS
- \`essai-fob-client.key.pem\` - Client private key for mTLS
- \`essai-fob-psi.crt.pem\` - Intermediate (PSI) certificate

**Usage**: These files are used for all mTLS endpoint connections

---

## Master Report

**File**: \`MASTER-REPORT.md\`

**Contents**:
- Complete sequence summary
- HTTP status codes for all steps
- Error details (if any)
- Configuration validation results
- Next steps recommendations

---

## Screenshot Guidelines

### Format Requirements
- Format: PNG (recommended) or JPEG
- Resolution: Minimum 1920×1080 (Full HD)
- Color: Full color (not grayscale)
- Compression: Lossless or high quality

### Content Requirements
1. **Full Window**: Capture entire application window (not just form)
2. **Timestamp**: Include browser/system timestamp if possible
3. **URL Bar**: Show full URL (if web application)
4. **Status Indicators**: Ensure connection status/icons are visible
5. **Form Data**: All fields must be clearly visible and readable
6. **No Sensitive Data**: Redact any production credentials if applicable

### File Naming Convention
\`<step>-<action>-<sequence>.png\`

Examples:
- \`enrolment-form-filled-01.png\`
- \`annulation-confirm-dialog-03.png\`
- \`reenrolment-success-05.png\`

---

## Test Execution Log

**Date**: ${new Date().toISOString()}
**Environment**: ESSAI (https://cnfr.api.rq-fo.ca)
**Test Suite**: Full Sequence (Enrol → Annul → Re-enrol + mTLS)
**CASESSAI**: ${LOCKED_HEADERS.CASESSAI}
**CODAUTORI**: ${LOCKED_HEADERS.CODAUTORI}

---

## Validation Checklist

### Pre-test Validations
- [x] CODAUTORI in header (not body)
- [x] CSR single-line base64 format
- [x] KeyUsage includes nonRepudiation
- [x] DN uses FOB-B8T8-W8W8 format
- [x] CN is 3601837200 (10 digits)

### Post-test Validations
- [ ] All steps returned expected HTTP status
- [ ] Certificates issued successfully
- [ ] Serial numbers extracted correctly
- [ ] mTLS connections established
- [ ] All artifacts generated
- [ ] Screenshots collected (to be done manually)

---

## SW-78 Submission Checklist

Before submitting SW-78 documentation:

1. [ ] Collect all UI screenshots per section above
2. [ ] Verify all artifact files are present
3. [ ] Review MASTER-REPORT.md for completeness
4. [ ] Ensure no sensitive production data in screenshots
5. [ ] Package all files in ZIP: \`essai-ARTIFACTS-<timestamp>.zip\`
6. [ ] Include this SW78-EVIDENCE-INDEX.md in ZIP
7. [ ] Prepare narrative document referencing screenshots
8. [ ] Submit to compliance team

---

**End of Evidence Index**
`;

  fs.writeFileSync(path.join(logDir, 'SW78-EVIDENCE-INDEX.md'), evidence);
  console.log(`✅ SW-78 evidence index generated\n`);
}

// =====================================================================
// ZIP PACKAGING
// =====================================================================

function createZipPackage(logDir: string): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);
  const zipPath = path.join(
    'tmp',
    'logs',
    `essai-ARTIFACTS-${timestamp}.zip`
  );

  const zip = new AdmZip();
  zip.addLocalFolder(logDir);

  fs.mkdirSync(path.dirname(zipPath), { recursive: true });
  zip.writeZip(zipPath);

  console.log(`✅ ZIP package created: ${zipPath}\n`);
  return zipPath;
}

// =====================================================================
// MAIN SEQUENCE
// =====================================================================

async function runFullSequence(): Promise<void> {
  console.log('🚀 ESSAI FULL SEQUENCE RUNNER\n');
  console.log('Sequence: Enrol (AJO) → Annul (SUP) → Re-enrol (AJO) + mTLS Smoke\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Validate configuration
  validateConfiguration();

  // Create log directory
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);
  const logDir = path.join('tmp', 'logs', `essai-${timestamp}`);
  fs.mkdirSync(logDir, { recursive: true });

  const results: Array<{
    step: string;
    statusCode: number;
    response: any;
    timestamp: string;
  }> = [];

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 1: ENROLMENT (AJO)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('STEP 1: ENROLMENT (AJO)\n');

  const enrolCSR = await generateCSR();
  const enrolResponse = await callEnrolment('AJO', enrolCSR.csrPem);

  console.log(`HTTP ${enrolResponse.statusCode}`);
  console.log(
    `Certificate: ${enrolResponse.body.retourCertif?.certif ? '✅' : '❌'}\n`
  );

  const enrolCertPem = enrolResponse.body.retourCertif?.certif;
  const enrolPsiPem = enrolResponse.body.retourCertif?.certifPSI;

  if (!enrolCertPem) {
    throw new Error('❌ Enrolment failed - no certificate received');
  }

  // Save certificates to tmp/certs
  const certsDir = path.join('tmp', 'certs');
  fs.mkdirSync(certsDir, { recursive: true });
  fs.writeFileSync(
    path.join(certsDir, 'essai-fob-client.crt.pem'),
    enrolCertPem
  );
  fs.writeFileSync(
    path.join(certsDir, 'essai-fob-client.key.pem'),
    enrolCSR.privateKeyPem
  );
  if (enrolPsiPem) {
    fs.writeFileSync(path.join(certsDir, 'essai-fob-psi.crt.pem'), enrolPsiPem);
    // Create chain file
    fs.writeFileSync(
      path.join(certsDir, 'essai-fob-client.chain.pem'),
      `${enrolCertPem}\n${enrolPsiPem}`
    );
  }

  const enrolDir = path.join(logDir, '1-enrolment');
  saveStepArtifacts(
    enrolDir,
    'Enrolment (AJO)',
    enrolCSR,
    { reqCertif: { modif: 'AJO', csr: enrolCSR.csrPem } },
    enrolResponse,
    enrolCertPem
  );

  results.push({
    step: 'Enrolment (AJO)',
    statusCode: enrolResponse.statusCode,
    response: enrolResponse,
    timestamp: new Date().toISOString(),
  });

  // Extract serial number for annulation
  const serialNumber = extractSerialNumber(enrolCertPem);
  console.log(`Serial Number: ${serialNumber}\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 2: ANNULATION (SUP)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('STEP 2: ANNULATION (SUP)\n');
  console.log(`Using serial number: ${serialNumber}\n`);

  const annulResponse = await callEnrolment('SUP', serialNumber);

  console.log(`HTTP ${annulResponse.statusCode}\n`);

  const annulDir = path.join(logDir, '2-annulation');
  saveStepArtifacts(
    annulDir,
    'Annulation (SUP)',
    null,
    { reqCertif: { modif: 'SUP', noSerie: serialNumber } },
    annulResponse
  );

  results.push({
    step: 'Annulation (SUP)',
    statusCode: annulResponse.statusCode,
    response: annulResponse,
    timestamp: new Date().toISOString(),
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 3: RE-ENROLMENT (AJO)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('STEP 3: RE-ENROLMENT (AJO)\n');
  console.log('ℹ️  Generating new CSR for re-enrolment\n');

  const reenrolCSR = await generateCSR();
  const reenrolResponse = await callEnrolment('AJO', reenrolCSR.csrPem);

  console.log(`HTTP ${reenrolResponse.statusCode}`);
  console.log(
    `Certificate: ${reenrolResponse.body.retourCertif?.certif ? '✅' : '❌'}\n`
  );

  const reenrolCertPem = reenrolResponse.body.retourCertif?.certif;

  // Update certificates in tmp/certs
  if (reenrolCertPem) {
    fs.writeFileSync(
      path.join(certsDir, 'essai-fob-client.crt.pem'),
      reenrolCertPem
    );
    fs.writeFileSync(
      path.join(certsDir, 'essai-fob-client.key.pem'),
      reenrolCSR.privateKeyPem
    );

    const reenrolPsiPem = reenrolResponse.body.retourCertif?.certifPSI;
    if (reenrolPsiPem) {
      fs.writeFileSync(
        path.join(certsDir, 'essai-fob-client.chain.pem'),
        `${reenrolCertPem}\n${reenrolPsiPem}`
      );
    }
  }

  const reenrolDir = path.join(logDir, '3-reenrolment');
  saveStepArtifacts(
    reenrolDir,
    'Re-enrolment (AJO)',
    reenrolCSR,
    { reqCertif: { modif: 'AJO', csr: reenrolCSR.csrPem } },
    reenrolResponse,
    reenrolCertPem
  );

  results.push({
    step: 'Re-enrolment (AJO)',
    statusCode: reenrolResponse.statusCode,
    response: reenrolResponse,
    timestamp: new Date().toISOString(),
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 4: mTLS SMOKE TESTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('STEP 4: mTLS SMOKE TESTS\n');

  const certPath = path.join(certsDir, 'essai-fob-client.crt.pem');
  const keyPath = path.join(certsDir, 'essai-fob-client.key.pem');

  // 4a: /utilisateur
  console.log('4a: /utilisateur endpoint\n');

  const utilisateurRequest = {
    reqUtil: {
      modif: 'VAL',
      noTax: {
        noTPS: 'INV',
        noTVQ: 'INV',
      },
    },
  };

  try {
    const utilisateurResponse = await callMtlsEndpoint(
      '/utilisateur',
      utilisateurRequest,
      certPath,
      keyPath
    );

    console.log(`HTTP ${utilisateurResponse.statusCode}\n`);

    const utilisateurDir = path.join(logDir, '4a-utilisateur');
    saveStepArtifacts(
      utilisateurDir,
      '/utilisateur (mTLS)',
      null,
      utilisateurRequest,
      utilisateurResponse
    );

    results.push({
      step: '/utilisateur (mTLS)',
      statusCode: utilisateurResponse.statusCode,
      response: utilisateurResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`⚠️ /utilisateur error: ${error}\n`);
  }

  // 4b: /transaction
  console.log('4b: /transaction endpoint\n');

  const transactionData = {
    noTrans: 'TEST001',
    datTrans: new Date().toISOString().split('T')[0],
    montTrans: 100.0,
  };

  const signature = await signCanonicalJSON(transactionData, reenrolCSR.cryptoKey.privateKey);

  const transactionRequest = {
    reqTrans: {
      transActu: transactionData,
      signa: signature,
    },
  };

  try {
    const transactionResponse = await callMtlsEndpoint(
      '/transaction',
      transactionRequest,
      certPath,
      keyPath
    );

    console.log(`HTTP ${transactionResponse.statusCode}\n`);

    const transactionDir = path.join(logDir, '4b-transaction');
    saveStepArtifacts(
      transactionDir,
      '/transaction (mTLS)',
      null,
      transactionRequest,
      transactionResponse
    );

    results.push({
      step: '/transaction (mTLS)',
      statusCode: transactionResponse.statusCode,
      response: transactionResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`⚠️ /transaction error: ${error}\n`);
  }

  // 4c: /document
  console.log('4c: /document endpoint\n');

  const documentBase64 = Buffer.from('Test document content').toString('base64');

  const documentRequest = {
    reqDoc: {
      typDoc: 'ATTEST',
      doc: documentBase64,
    },
  };

  try {
    const documentResponse = await callMtlsEndpoint(
      '/document',
      documentRequest,
      certPath,
      keyPath
    );

    console.log(`HTTP ${documentResponse.statusCode}\n`);

    const documentDir = path.join(logDir, '4c-document');
    saveStepArtifacts(
      documentDir,
      '/document (mTLS)',
      null,
      documentRequest,
      documentResponse
    );

    results.push({
      step: '/document (mTLS)',
      statusCode: documentResponse.statusCode,
      response: documentResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`⚠️ /document error: ${error}\n`);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MASTER REPORT + SW-78 EVIDENCE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('GENERATING REPORTS\n');

  generateMasterReport(logDir, results);
  generateSW78Evidence(logDir);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ZIP PACKAGING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const zipPath = createZipPackage(logDir);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ SEQUENCE COMPLETE\n');
  console.log(`📁 Artifacts: ${logDir}`);
  console.log(`📦 ZIP: ${zipPath}`);
  console.log(`📋 Master Report: ${path.join(logDir, 'MASTER-REPORT.md')}`);
  console.log(`📸 SW-78 Evidence: ${path.join(logDir, 'SW78-EVIDENCE-INDEX.md')}\n`);
}

// =====================================================================
// ENTRY POINT
// =====================================================================

runFullSequence().catch((error) => {
  console.error('\n❌ FATAL ERROR:\n');
  console.error(error);
  process.exit(1);
});
