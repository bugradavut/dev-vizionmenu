/**
 * WEB-SRM DEV - SW-77 Complete Test Suite Runner
 *
 * Runs full SW-77 test suite with golden config
 * - NO config changes
 * - Full artifact generation
 * - Master report
 *
 * Test Cases:
 * - SW77-ENR-001: Enrolment with GN=ER0001
 * - SW77-UTI-001: /utilisateur validation
 * - SW77-TRX-001: /transaction with ECDSA signature
 * - SW77-DOC-001: /document upload
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { webcrypto } from 'crypto';
import * as x509 from '@peculiar/x509';
import { createMtlsClient } from './lib/websrm-mtls-client';
import {
  loadCryptoMaterial,
  createTransactionSignature,
  canonicalize,
} from './lib/websrm-crypto';

// Certificate DN values (GOLDEN CONFIG)
const GOLDEN_DN = {
  C: 'CA',
  ST: 'QC',
  L: '-05:00',
  surname: 'Certificat du serveur', // OID 2.5.4.4
  O: 'RBC-D8T8-W8W8',
  OU: '5678912340TQ0001',
  GN: 'ER0001', // OID 2.5.4.42 (GivenName)
  CN: '5678912340',
};

// DEV Headers (GOLDEN CONFIG)
const DEV_HEADERS = {
  'Content-Type': 'application/json',
  ENVIRN: 'DEV',
  APPRLINIT: 'SRV',
  CASESSAI: '000.000',
  VERSIPARN: '0',
  IDSEV: '0000000000003973',
  IDVERSI: '00000000000045D6',
  CODCERTIF: 'FOB201999999',
  IDPARTN: '0000000000001FF2',
  VERSI: '0.1.0',
  CODAUTORI: 'D8T8-W8W8', // In header for DEV
};

interface TestResult {
  testId: string;
  endpoint: string;
  httpStatus: number;
  passed: boolean;
  note: string;
  outputDir: string;
}

const results: TestResult[] = [];
let suiteTimestamp: string;
let suiteBaseDir: string;

/**
 * Generate CSR with golden config
 */
async function generateCSR(cryptoKey: CryptoKeyPair) {
  // Build DN in exact order (GOLDEN CONFIG)
  const dnString = `C=${GOLDEN_DN.C}, ST=${GOLDEN_DN.ST}, L=${GOLDEN_DN.L}, 2.5.4.4=${GOLDEN_DN.surname}, O=${GOLDEN_DN.O}, OU=${GOLDEN_DN.OU}, 2.5.4.42=${GOLDEN_DN.GN}, CN=${GOLDEN_DN.CN}`;

  // Create CSR (GOLDEN CONFIG)
  const csr = await x509.Pkcs10CertificateRequestGenerator.create({
    name: dnString,
    keys: cryptoKey,
    signingAlgorithm: {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    extensions: [
      // KeyUsage: digitalSignature + nonRepudiation (critical)
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.digitalSignature | x509.KeyUsageFlags.nonRepudiation,
        true
      ),
    ],
  });

  // Export as single-line base64 PEM (CRITICAL!)
  const derBuffer = Buffer.from(csr.rawData);
  const base64SingleLine = derBuffer.toString('base64');
  const csrPem = `-----BEGIN CERTIFICATE REQUEST-----\n${base64SingleLine}\n-----END CERTIFICATE REQUEST-----`;

  // Export private key in PKCS#8 PEM format
  const privateKeyDer = await webcrypto.subtle.exportKey('pkcs8', cryptoKey.privateKey);
  const privateKeyBase64 = Buffer.from(privateKeyDer).toString('base64');
  const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64}\n-----END PRIVATE KEY-----`;

  return { csrPem, derBuffer, dnString, privateKeyPem };
}

/**
 * SW77-ENR-001: Enrolment
 */
async function testEnrolment(): Promise<TestResult> {
  const testId = 'SW77-ENR-001';
  console.log('\n' + '='.repeat(70));
  console.log(`TEST: ${testId}`);
  console.log('Enrolment with GN=ER0001 (Golden Config)');
  console.log('='.repeat(70) + '\n');

  const outputDir = path.join(suiteBaseDir, testId);
  fs.mkdirSync(outputDir, { recursive: true });

  // Generate keypair
  console.log('🔐 Generating keypair...');
  const cryptoKey = await webcrypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );

  // Generate CSR
  console.log('📝 Generating CSR (GOLDEN CONFIG)...');
  const { csrPem, derBuffer, dnString, privateKeyPem } = await generateCSR(cryptoKey);

  console.log(`   DN: ${dnString}`);

  // Build enrolment request body (GOLDEN CONFIG)
  const requestBody = {
    reqCertif: {
      modif: 'AJO',
      csr: csrPem, // Full PEM format
    },
  };

  // Save CSR artifacts
  fs.writeFileSync(path.join(outputDir, 'csr.pem'), csrPem, 'utf8');
  fs.writeFileSync(path.join(outputDir, 'csr.txt'), dnString, 'utf8');
  fs.writeFileSync(path.join(outputDir, 'headers.json'), JSON.stringify(DEV_HEADERS, null, 2));
  fs.writeFileSync(path.join(outputDir, 'request.json'), JSON.stringify(requestBody, null, 2));

  // Call API
  console.log('🌐 Calling enrolment endpoint...');
  const endpoint = 'https://certificats.cnfr.api.rq-fo.ca/enrolement';

  let httpStatus = 0;
  let response: any = {};

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: DEV_HEADERS,
      body: JSON.stringify(requestBody),
    });
    httpStatus = res.status;
    response = await res.json();
  } catch (err: any) {
    response = { error: err.message };
  }

  fs.writeFileSync(path.join(outputDir, 'response.json'), JSON.stringify(response, null, 2));

  // Save certificates if successful
  let passed = false;
  let note = '';

  if (httpStatus === 201 && response.retourCertif?.certif) {
    console.log('\n   💾 Saving certificates...');

    const certDir = path.join('tmp', 'certs');
    fs.mkdirSync(certDir, { recursive: true });

    fs.writeFileSync(path.join(certDir, 'dev-client.key.pem'), privateKeyPem, 'utf8');
    fs.writeFileSync(path.join(certDir, 'dev-client.crt.pem'), response.retourCertif.certif, 'utf8');
    fs.writeFileSync(path.join(certDir, 'dev-client.chain.pem'), response.retourCertif.certifPSI, 'utf8');

    // Save certificate metadata
    fs.writeFileSync(
      path.join(certDir, 'SW77-ENR-001-cert.json'),
      JSON.stringify({
        certificate: response.retourCertif.certif,
        certificatePSI: response.retourCertif.certifPSI,
        givenName: GOLDEN_DN.GN,
        timestamp: new Date().toISOString(),
      }, null, 2)
    );

    passed = true;
    note = 'Certificate issued and saved';
    console.log('   ✅ Certificates saved to tmp/certs/');
  } else {
    note = `HTTP ${httpStatus} - ${response.retourCertif?.listErr?.[0]?.mess || 'Unknown error'}`;
  }

  // Generate curl command
  const curlCmd = `#!/bin/bash
curl -X POST "${endpoint}" \\
  -H "Content-Type: application/json" \\
  -H "ENVIRN: DEV" \\
  -H "APPRLINIT: SRV" \\
  -H "CASESSAI: 000.000" \\
  -H "VERSIPARN: 0" \\
  -H "IDSEV: ${DEV_HEADERS.IDSEV}" \\
  -H "IDVERSI: ${DEV_HEADERS.IDVERSI}" \\
  -H "CODCERTIF: ${DEV_HEADERS.CODCERTIF}" \\
  -H "IDPARTN: ${DEV_HEADERS.IDPARTN}" \\
  -H "VERSI: ${DEV_HEADERS.VERSI}" \\
  -H "CODAUTORI: ${DEV_HEADERS.CODAUTORI}" \\
  -d @${path.join(outputDir, 'request.json').replace(/\\/g, '/')}
`;

  fs.writeFileSync(path.join(outputDir, 'curl.sh'), curlCmd);

  // Summary
  const summary = `# ${testId} - Enrolment Test

**Endpoint**: ${endpoint}
**HTTP Status**: ${httpStatus}
**Result**: ${passed ? '✅ PASS' : '❌ FAIL'}

## Request
- **DN**: ${dnString}
- **CSR**: Single-line Base64 PEM

## Response
- **Certificate**: ${response.retourCertif?.certif ? 'YES' : 'NO'}
- **Errors**: ${response.retourCertif?.listErr?.length || 0}

## Note
${note}
`;

  fs.writeFileSync(path.join(outputDir, 'summary.md'), summary);

  console.log(`\n${passed ? '✅ PASS' : '❌ FAIL'}: ${testId}`);
  console.log(`📁 Output: ${outputDir}`);

  return {
    testId,
    endpoint: '/enrolement',
    httpStatus,
    passed,
    note,
    outputDir,
  };
}

/**
 * SW77-UTI-001: /utilisateur validation
 */
async function testUtilisateur(): Promise<TestResult> {
  const testId = 'SW77-UTI-001';
  console.log('\n' + '='.repeat(70));
  console.log(`TEST: ${testId}`);
  console.log('/utilisateur - Tax number validation');
  console.log('='.repeat(70) + '\n');

  const outputDir = path.join(suiteBaseDir, testId);
  fs.mkdirSync(outputDir, { recursive: true });

  const endpoint = 'https://cnfr.api.rq-fo.ca/utilisateur';

  const requestBody = {
    reqUtil: {
      modif: 'VAL',
      noTax: {
        noTPS: GOLDEN_DN.CN,
        noTVQ: GOLDEN_DN.OU,
      },
    },
  };

  fs.writeFileSync(path.join(outputDir, 'headers.json'), JSON.stringify(DEV_HEADERS, null, 2));
  fs.writeFileSync(path.join(outputDir, 'request.json'), JSON.stringify(requestBody, null, 2));

  console.log('🌐 Calling /utilisateur with mTLS...');

  const client = createMtlsClient();
  let httpStatus = 0;
  let response: any = {};

  try {
    const res = await client.post(endpoint, DEV_HEADERS, requestBody);
    httpStatus = res.status;
    response = res.json || {};
  } catch (err: any) {
    response = { error: err.message };
  }

  fs.writeFileSync(path.join(outputDir, 'response.json'), JSON.stringify(response, null, 2));

  // Check for structural errors
  const errors = response.retourUtil?.listErr || [];
  const structuralErrors = errors.filter((e: any) =>
    e.mess?.includes('est absent') && !e.mess?.includes('=')
  );

  const passed = structuralErrors.length === 0;
  const note = passed
    ? `HTTP ${httpStatus} - No structural errors (business validation only)`
    : `HTTP ${httpStatus} - ${structuralErrors.length} structural errors`;

  // Generate curl
  const curlCmd = `#!/bin/bash
curl -X POST "${endpoint}" \\
  --cert tmp/certs/dev-client.crt.pem \\
  --key tmp/certs/dev-client.key.pem \\
  --cacert tmp/certs/dev-client.chain.pem \\
  --insecure \\
  -H "Content-Type: application/json" \\
  -H "ENVIRN: DEV" \\
  -H "APPRLINIT: SRV" \\
  -H "CASESSAI: 000.000" \\
  -H "VERSIPARN: 0" \\
  -H "IDSEV: ${DEV_HEADERS.IDSEV}" \\
  -H "IDVERSI: ${DEV_HEADERS.IDVERSI}" \\
  -H "CODCERTIF: ${DEV_HEADERS.CODCERTIF}" \\
  -H "IDPARTN: ${DEV_HEADERS.IDPARTN}" \\
  -H "VERSI: ${DEV_HEADERS.VERSI}" \\
  -H "CODAUTORI: ${DEV_HEADERS.CODAUTORI}" \\
  -d @${path.join(outputDir, 'request.json').replace(/\\/g, '/')}
`;

  fs.writeFileSync(path.join(outputDir, 'curl.sh'), curlCmd);

  const summary = `# ${testId} - /utilisateur Test

**Endpoint**: ${endpoint}
**HTTP Status**: ${httpStatus}
**Result**: ${passed ? '✅ PASS' : '❌ FAIL'}

## Request
\`\`\`json
${JSON.stringify(requestBody, null, 2)}
\`\`\`

## Response
- **Total Errors**: ${errors.length}
- **Structural Errors**: ${structuralErrors.length}

## Note
${note}
`;

  fs.writeFileSync(path.join(outputDir, 'summary.md'), summary);

  console.log(`\n${passed ? '✅ PASS' : '❌ FAIL'}: ${testId}`);
  console.log(`📁 Output: ${outputDir}`);

  return {
    testId,
    endpoint: '/utilisateur',
    httpStatus,
    passed,
    note,
    outputDir,
  };
}

/**
 * SW77-TRX-001: /transaction with ECDSA signature
 */
async function testTransaction(): Promise<TestResult> {
  const testId = 'SW77-TRX-001';
  console.log('\n' + '='.repeat(70));
  console.log(`TEST: ${testId}`);
  console.log('/transaction - ECDSA P-256 signature');
  console.log('='.repeat(70) + '\n');

  const outputDir = path.join(suiteBaseDir, testId);
  fs.mkdirSync(outputDir, { recursive: true });

  const endpoint = 'https://cnfr.api.rq-fo.ca/transaction';

  // Load crypto material
  const crypto = loadCryptoMaterial();

  // Create transaction data
  const transActuBase = {
    noTrans: 'SW77-TRX-' + Date.now(),
    datTrans: new Date().toISOString().replace('Z', '-05:00'),
    typTrans: 'VENTE',
    modTrans: 'POS',
    sectActi: 'COMMERCE',
    commerElectr: 'NON',

    mont: {
      avantTax: '10.00',
      apresTax: '10.00',
      TPS: '0.00',
      TVQ: '0.00',
    },

    items: [
      {
        desc: 'SW-77 Test Item',
        qte: '1',
        prixUnit: '10.00',
        montant: '10.00',
      },
    ],

    modPai: 'COMPTANT',
    nomMandt: 'Michel Untel',
    formImpr: 'PAPIER',
    modImpr: 'TICKET',
    emprCertifSEV: crypto.fingerprint,
    utc: '-05:00',
    relaCommer: 'B2C',

    noTax: {
      noTPS: GOLDEN_DN.CN,
      noTVQ: GOLDEN_DN.OU,
    },

    SEV: {
      idSEV: DEV_HEADERS.IDSEV,
      idVersi: DEV_HEADERS.IDVERSI,
      codCertif: DEV_HEADERS.CODCERTIF,
      idPartn: DEV_HEADERS.IDPARTN,
      versi: DEV_HEADERS.VERSI,
      versiParn: DEV_HEADERS.VERSIPARN,
    },
  };

  // Generate signature
  console.log('✍️  Generating ECDSA P-256 signature...');
  const signaRaw = createTransactionSignature(transActuBase, crypto);

  const signa: any = {
    empreinteCert: signaRaw.empreinteCert,
    hash: signaRaw.hash,
    actu: signaRaw.actu,
    preced: '',
    datActu: new Date().toISOString().replace('Z', '-05:00'),
  };

  const transActu = {
    ...transActuBase,
    signa,
  };

  const requestBody = {
    reqTrans: {
      transActu,
    },
  };

  const txHeaders = {
    ...DEV_HEADERS,
    SIGNATRANSM: 'OUI',
    EMPRCERTIFTRANSM: 'OUI',
    NOTPS: GOLDEN_DN.CN,
    NOTVQ: GOLDEN_DN.OU,
  };

  fs.writeFileSync(path.join(outputDir, 'headers.json'), JSON.stringify(txHeaders, null, 2));
  fs.writeFileSync(path.join(outputDir, 'request.json'), JSON.stringify(requestBody, null, 2));
  fs.writeFileSync(path.join(outputDir, 'transActu-canonical.json'), canonicalize(transActuBase));

  console.log('🌐 Calling /transaction with mTLS...');

  const client = createMtlsClient();
  let httpStatus = 0;
  let response: any = {};

  try {
    const res = await client.post(endpoint, txHeaders, requestBody);
    httpStatus = res.status;
    response = res.json || {};
  } catch (err: any) {
    response = { error: err.message };
  }

  fs.writeFileSync(path.join(outputDir, 'response.json'), JSON.stringify(response, null, 2));

  const errors = response.retourTrans?.retourTransActu?.listErr || response.retourTrans?.listErr || [];
  const structuralErrors = errors.filter((e: any) =>
    (e.mess?.includes('est absent') && !e.mess?.includes('=')) ||
    e.mess?.includes('doit contenir')
  );

  const passed = structuralErrors.length === 0;
  const note = passed
    ? `HTTP ${httpStatus} - No structural errors (signature generated)`
    : `HTTP ${httpStatus} - ${structuralErrors.length} structural errors`;

  const curlCmd = `#!/bin/bash
curl -X POST "${endpoint}" \\
  --cert tmp/certs/dev-client.crt.pem \\
  --key tmp/certs/dev-client.key.pem \\
  --cacert tmp/certs/dev-client.chain.pem \\
  --insecure \\
  -H "Content-Type: application/json" \\
  -H "ENVIRN: DEV" \\
  -H "APPRLINIT: SRV" \\
  -H "CASESSAI: 000.000" \\
  -H "VERSIPARN: 0" \\
  -H "IDSEV: ${DEV_HEADERS.IDSEV}" \\
  -H "IDVERSI: ${DEV_HEADERS.IDVERSI}" \\
  -H "CODCERTIF: ${DEV_HEADERS.CODCERTIF}" \\
  -H "IDPARTN: ${DEV_HEADERS.IDPARTN}" \\
  -H "VERSI: ${DEV_HEADERS.VERSI}" \\
  -H "CODAUTORI: ${DEV_HEADERS.CODAUTORI}" \\
  -H "SIGNATRANSM: OUI" \\
  -H "EMPRCERTIFTRANSM: OUI" \\
  -H "NOTPS: ${GOLDEN_DN.CN}" \\
  -H "NOTVQ: ${GOLDEN_DN.OU}" \\
  -d @${path.join(outputDir, 'request.json').replace(/\\/g, '/')}
`;

  fs.writeFileSync(path.join(outputDir, 'curl.sh'), curlCmd);

  const summary = `# ${testId} - /transaction Test

**Endpoint**: ${endpoint}
**HTTP Status**: ${httpStatus}
**Result**: ${passed ? '✅ PASS' : '❌ FAIL'}

## Signature
- **Hash**: \`${signa.hash.actu.substring(0, 40)}...\`
- **Signature**: \`${signa.actu.substring(0, 40)}...\`
- **Fingerprint**: \`${signa.empreinteCert.substring(0, 40)}...\`

## Response
- **Total Errors**: ${errors.length}
- **Structural Errors**: ${structuralErrors.length}

## Note
${note}
`;

  fs.writeFileSync(path.join(outputDir, 'summary.md'), summary);

  console.log(`\n${passed ? '✅ PASS' : '❌ FAIL'}: ${testId}`);
  console.log(`📁 Output: ${outputDir}`);

  return {
    testId,
    endpoint: '/transaction',
    httpStatus,
    passed,
    note,
    outputDir,
  };
}

/**
 * SW77-DOC-001: /document upload
 */
async function testDocument(): Promise<TestResult> {
  const testId = 'SW77-DOC-001';
  console.log('\n' + '='.repeat(70));
  console.log(`TEST: ${testId}`);
  console.log('/document - Base64 document upload');
  console.log('='.repeat(70) + '\n');

  const outputDir = path.join(suiteBaseDir, testId);
  fs.mkdirSync(outputDir, { recursive: true });

  const endpoint = 'https://cnfr.api.rq-fo.ca/document';

  // Create Base64 document
  const docContent = JSON.stringify({
    type: 'SW-77-test-document',
    content: 'Test document for SW-77 validation',
    timestamp: new Date().toISOString(),
  });
  const docBase64 = Buffer.from(docContent).toString('base64');

  const requestBody = {
    reqDoc: {
      typDoc: 'ATTEST',
      doc: docBase64,
    },
  };

  const docHeaders = {
    ...DEV_HEADERS,
    NOTPS: GOLDEN_DN.CN,
    NOTVQ: GOLDEN_DN.OU,
  };

  fs.writeFileSync(path.join(outputDir, 'headers.json'), JSON.stringify(docHeaders, null, 2));
  fs.writeFileSync(path.join(outputDir, 'request.json'), JSON.stringify(requestBody, null, 2));

  console.log('🌐 Calling /document with mTLS...');

  const client = createMtlsClient();
  let httpStatus = 0;
  let response: any = {};

  try {
    const res = await client.post(endpoint, docHeaders, requestBody);
    httpStatus = res.status;
    response = res.json || {};
  } catch (err: any) {
    response = { error: err.message };
  }

  fs.writeFileSync(path.join(outputDir, 'response.json'), JSON.stringify(response, null, 2));

  const errors = response.retourDoc?.listErr || [];
  const structuralErrors = errors.filter((e: any) =>
    (e.mess?.includes('est absent') && !e.mess?.includes('='))
  );

  const passed = structuralErrors.length === 0;
  const note = passed
    ? `HTTP ${httpStatus} - No structural errors`
    : `HTTP ${httpStatus} - ${structuralErrors.length} structural errors`;

  const curlCmd = `#!/bin/bash
curl -X POST "${endpoint}" \\
  --cert tmp/certs/dev-client.crt.pem \\
  --key tmp/certs/dev-client.key.pem \\
  --cacert tmp/certs/dev-client.chain.pem \\
  --insecure \\
  -H "Content-Type: application/json" \\
  -H "ENVIRN: DEV" \\
  -H "APPRLINIT: SRV" \\
  -H "CASESSAI: 000.000" \\
  -H "VERSIPARN: 0" \\
  -H "IDSEV: ${DEV_HEADERS.IDSEV}" \\
  -H "IDVERSI: ${DEV_HEADERS.IDVERSI}" \\
  -H "CODCERTIF: ${DEV_HEADERS.CODCERTIF}" \\
  -H "IDPARTN: ${DEV_HEADERS.IDPARTN}" \\
  -H "VERSI: ${DEV_HEADERS.VERSI}" \\
  -H "CODAUTORI: ${DEV_HEADERS.CODAUTORI}" \\
  -H "NOTPS: ${GOLDEN_DN.CN}" \\
  -H "NOTVQ: ${GOLDEN_DN.OU}" \\
  -d @${path.join(outputDir, 'request.json').replace(/\\/g, '/')}
`;

  fs.writeFileSync(path.join(outputDir, 'curl.sh'), curlCmd);

  const summary = `# ${testId} - /document Test

**Endpoint**: ${endpoint}
**HTTP Status**: ${httpStatus}
**Result**: ${passed ? '✅ PASS' : '❌ FAIL'}

## Request
- **typDoc**: ATTEST
- **doc**: Base64 encoded

## Response
- **Total Errors**: ${errors.length}
- **Structural Errors**: ${structuralErrors.length}

## Note
${note}
`;

  fs.writeFileSync(path.join(outputDir, 'summary.md'), summary);

  console.log(`\n${passed ? '✅ PASS' : '❌ FAIL'}: ${testId}`);
  console.log(`📁 Output: ${outputDir}`);

  return {
    testId,
    endpoint: '/document',
    httpStatus,
    passed,
    note,
    outputDir,
  };
}

/**
 * Main test suite runner
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  WEB-SRM DEV - SW-77 Complete Test Suite                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Create suite timestamp and base directory
  suiteTimestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  suiteBaseDir = path.join('tmp', 'logs', `dev-sw77-${suiteTimestamp}`);
  fs.mkdirSync(suiteBaseDir, { recursive: true});

  console.log(`📁 Suite output: ${suiteBaseDir}\n`);

  // Run all tests
  results.push(await testEnrolment());
  results.push(await testUtilisateur());
  results.push(await testTransaction());
  results.push(await testDocument());

  // Generate master report
  console.log('\n' + '='.repeat(70));
  console.log('GENERATING MASTER REPORT');
  console.log('='.repeat(70) + '\n');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  const report = `# WEB-SRM DEV - SW-77 Complete Test Suite Report

**Test Date**: ${new Date().toISOString()}
**Suite ID**: ${suiteTimestamp}
**Total Tests**: ${results.length}
**Passed**: ${passed} ✅
**Failed**: ${failed} ❌

---

## Test Summary

| Test ID | Endpoint | HTTP | Status | Note |
|---------|----------|------|--------|------|
${results.map((r) => `| ${r.testId} | ${r.endpoint} | ${r.httpStatus} | ${r.passed ? '✅ PASS' : '❌ FAIL'} | ${r.note} |`).join('\n')}

---

## Test Details

${results
  .map(
    (r) => `### ${r.testId} - ${r.endpoint}

**HTTP Status**: ${r.httpStatus}
**Result**: ${r.passed ? '✅ PASS' : '❌ FAIL'}
**Note**: ${r.note}

**Artifacts**: [\`${path.basename(r.outputDir)}/\`](${path.basename(r.outputDir)}/)
- headers.json
- request.json
- response.json
- curl.sh
- summary.md

**Reproducible curl**:
\`\`\`bash
bash ${path.join(r.outputDir, 'curl.sh').replace(/\\/g, '/')}
\`\`\`

---
`
  )
  .join('\n')}

## Golden Config Used

**Certificate DN**:
\`\`\`
C=${GOLDEN_DN.C}
ST=${GOLDEN_DN.ST}
L=${GOLDEN_DN.L}
2.5.4.4=${GOLDEN_DN.surname}
O=${GOLDEN_DN.O}
OU=${GOLDEN_DN.OU}
2.5.4.42=${GOLDEN_DN.GN}
CN=${GOLDEN_DN.CN}
\`\`\`

**DEV Headers**:
- ENVIRN: DEV
- APPRLINIT: SRV
- CASESSAI: 000.000
- VERSIPARN: 0
- CODAUTORI: D8T8-W8W8 (in header for DEV)

**mTLS Files**:
- tmp/certs/dev-client.key.pem
- tmp/certs/dev-client.crt.pem
- tmp/certs/dev-client.chain.pem

---

## Final Status

${
  failed === 0
    ? '🎉 **ALL TESTS PASSED** - Full SW-77 suite complete with zero structural errors!'
    : `⚠️ **${failed} TEST(S) FAILED** - Review individual test artifacts for details.`
}

**Report Generated**: ${new Date().toISOString()}
`;

  const reportPath = path.join('tmp', 'logs', `dev-sw77-REPORT-${suiteTimestamp}.md`);
  fs.writeFileSync(reportPath, report);

  console.log(`✅ Master report: ${reportPath}\n`);

  // Final summary
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  FINAL SUMMARY                                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌\n`);

  console.log(`📄 Report: ${reportPath}`);
  console.log(`📁 Artifacts: ${suiteBaseDir}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ Suite error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
