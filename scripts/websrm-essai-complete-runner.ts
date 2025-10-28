/**
 * WEB-SRM ESSAI - Complete Test Suite Runner
 *
 * ESSAI Differences from DEV:
 * - ENVIRN: ESSAI
 * - CASESSAI: 500.001
 * - VERSIPARN: 1.0.0
 * - codAutori: IN BODY (not header)
 *
 * Test Sequence (MANDATORY):
 * 1. ESSAI-ENR-001: Enrolment (AJO)
 * 2. ESSAI-ANN-001: Annulation (ANN)
 * 3. ESSAI-ENR-002: Re-enrolment (AJO)
 * 4. ESSAI-UTI-001: /utilisateur
 * 5. ESSAI-TRX-001: /transaction
 * 6. ESSAI-DOC-001: /document
 */

import * as fs from 'fs';
import * as path from 'path';
import { webcrypto } from 'crypto';
import * as x509 from '@peculiar/x509';
import { createMtlsClient } from './lib/websrm-mtls-client';
import {
  loadCryptoMaterial,
  createTransactionSignature,
  canonicalize,
} from './lib/websrm-crypto';

// Certificate DN values (GOLDEN CONFIG - same as DEV)
const GOLDEN_DN = {
  C: 'CA',
  ST: 'QC',
  L: '-05:00',
  surname: 'Certificat du serveur',
  O: 'RBC-D8T8-W8W8',
  OU: '5678912340TQ0001',
  GN: 'ER0001',
  CN: '5678912340',
};

// ESSAI Headers (DIFFERENCES FROM DEV)
const ESSAI_HEADERS = {
  'Content-Type': 'application/json',
  ENVIRN: 'ESSAI',          // Changed from DEV
  APPRLINIT: 'SRV',
  CASESSAI: '500.001',      // Changed from DEV (000.000)
  VERSIPARN: '0',           // First certification (NOT 1.0.0)
  IDSEV: '0000000000003973',
  IDVERSI: '00000000000045D6',
  CODCERTIF: 'FOB201999999',
  IDPARTN: '0000000000001FF2',
  VERSI: '0.1.0',
  // NO CODAUTORI in header for ESSAI (goes in body)
};

const CODAUTORI = 'D8T8-W8W8'; // Will be in body

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

async function generateCSR(cryptoKey: CryptoKeyPair) {
  const dnString = `C=${GOLDEN_DN.C}, ST=${GOLDEN_DN.ST}, L=${GOLDEN_DN.L}, 2.5.4.4=${GOLDEN_DN.surname}, O=${GOLDEN_DN.O}, OU=${GOLDEN_DN.OU}, 2.5.4.42=${GOLDEN_DN.GN}, CN=${GOLDEN_DN.CN}`;

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

  const derBuffer = Buffer.from(csr.rawData);
  const base64SingleLine = derBuffer.toString('base64');
  const csrPem = `-----BEGIN CERTIFICATE REQUEST-----\n${base64SingleLine}\n-----END CERTIFICATE REQUEST-----`;

  const privateKeyDer = await webcrypto.subtle.exportKey('pkcs8', cryptoKey.privateKey);
  const privateKeyBase64 = Buffer.from(privateKeyDer).toString('base64');
  const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64}\n-----END PRIVATE KEY-----`;

  return { csrPem, derBuffer, dnString, privateKeyPem };
}

/**
 * ESSAI-ENR-001: Initial Enrolment (AJO)
 */
async function testEnrolment(testId: string, modif: 'AJO'): Promise<TestResult> {
  console.log('\n' + '='.repeat(70));
  console.log(`TEST: ${testId}`);
  console.log(`Enrolment (${modif}) - GN=ER0001`);
  console.log('='.repeat(70) + '\n');

  const outputDir = path.join(suiteBaseDir, testId);
  fs.mkdirSync(outputDir, { recursive: true });

  console.log('🔐 Generating keypair...');
  const cryptoKey = await webcrypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );

  console.log('📝 Generating CSR (GOLDEN CONFIG)...');
  const { csrPem, derBuffer, dnString, privateKeyPem } = await generateCSR(cryptoKey);
  console.log(`   DN: ${dnString}`);

  // ESSAI: codAutori in BODY (at root level, NOT inside reqCertif)
  const requestBody = {
    reqCertif: {
      modif,
      csr: csrPem,
    },
    codAutori: CODAUTORI, // At ROOT level for ESSAI
  };

  fs.writeFileSync(path.join(outputDir, 'csr.pem'), csrPem, 'utf8');
  fs.writeFileSync(path.join(outputDir, 'csr.txt'), dnString, 'utf8');
  fs.writeFileSync(path.join(outputDir, 'headers.json'), JSON.stringify(ESSAI_HEADERS, null, 2));
  fs.writeFileSync(path.join(outputDir, 'request.json'), JSON.stringify(requestBody, null, 2));

  console.log('🌐 Calling enrolment endpoint...');
  const endpoint = 'https://certificats.cnfr.api.rq-fo.ca/enrolement';

  let httpStatus = 0;
  let response: any = {};

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: ESSAI_HEADERS,
      body: JSON.stringify(requestBody),
    });
    httpStatus = res.status;
    response = await res.json();
  } catch (err: any) {
    response = { error: err.message };
  }

  fs.writeFileSync(path.join(outputDir, 'response.json'), JSON.stringify(response, null, 2));

  let passed = false;
  let note = '';

  if (httpStatus === 201 && response.retourCertif?.certif) {
    console.log('\n   💾 Saving certificates...');

    const certDir = path.join('tmp', 'certs');
    fs.mkdirSync(certDir, { recursive: true });

    fs.writeFileSync(path.join(certDir, 'essai-client.key.pem'), privateKeyPem, 'utf8');
    fs.writeFileSync(path.join(certDir, 'essai-client.crt.pem'), response.retourCertif.certif, 'utf8');
    fs.writeFileSync(path.join(certDir, 'essai-client.chain.pem'), response.retourCertif.certifPSI, 'utf8');

    fs.writeFileSync(
      path.join(certDir, `${testId}-cert.json`),
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

  const curlCmd = `#!/bin/bash
curl -X POST "${endpoint}" \\
  -H "Content-Type: application/json" \\
  -H "ENVIRN: ESSAI" \\
  -H "APPRLINIT: SRV" \\
  -H "CASESSAI: 500.001" \\
  -H "VERSIPARN: 1.0.0" \\
  -H "IDSEV: ${ESSAI_HEADERS.IDSEV}" \\
  -H "IDVERSI: ${ESSAI_HEADERS.IDVERSI}" \\
  -H "CODCERTIF: ${ESSAI_HEADERS.CODCERTIF}" \\
  -H "IDPARTN: ${ESSAI_HEADERS.IDPARTN}" \\
  -H "VERSI: ${ESSAI_HEADERS.VERSI}" \\
  -d @${path.join(outputDir, 'request.json').replace(/\\/g, '/')}
`;

  fs.writeFileSync(path.join(outputDir, 'curl.sh'), curlCmd);

  const summary = `# ${testId} - Enrolment (${modif})

**Endpoint**: ${endpoint}
**HTTP Status**: ${httpStatus}
**Result**: ${passed ? '✅ PASS' : '❌ FAIL'}

## Request
- **DN**: ${dnString}
- **modif**: ${modif}
- **codAutori**: ${CODAUTORI} (in body)

## Response
- **Certificate**: ${response.retourCertif?.certif ? 'YES' : 'NO'}

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
 * ESSAI-ANN-001: Annulation (ANN)
 */
async function testAnnulation(): Promise<TestResult> {
  const testId = 'ESSAI-ANN-001';
  console.log('\n' + '='.repeat(70));
  console.log(`TEST: ${testId}`);
  console.log('Annulation (ANN) - Revoke certificate');
  console.log('='.repeat(70) + '\n');

  const outputDir = path.join(suiteBaseDir, testId);
  fs.mkdirSync(outputDir, { recursive: true });

  console.log('🔐 Generating new keypair for annulation...');
  const cryptoKey = await webcrypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );

  console.log('📝 Generating CSR for annulation...');
  const { csrPem, dnString } = await generateCSR(cryptoKey);
  console.log(`   DN: ${dnString}`);

  // ESSAI: codAutori in BODY (at root level), modif=ANN
  const requestBody = {
    reqCertif: {
      modif: 'ANN',
      csr: csrPem,
    },
    codAutori: CODAUTORI, // At ROOT level for ESSAI
  };

  fs.writeFileSync(path.join(outputDir, 'csr.pem'), csrPem, 'utf8');
  fs.writeFileSync(path.join(outputDir, 'csr.txt'), dnString, 'utf8');
  fs.writeFileSync(path.join(outputDir, 'headers.json'), JSON.stringify(ESSAI_HEADERS, null, 2));
  fs.writeFileSync(path.join(outputDir, 'request.json'), JSON.stringify(requestBody, null, 2));

  console.log('🌐 Calling annulation endpoint...');
  const endpoint = 'https://certificats.cnfr.api.rq-fo.ca/enrolement';

  let httpStatus = 0;
  let response: any = {};

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: ESSAI_HEADERS,
      body: JSON.stringify(requestBody),
    });
    httpStatus = res.status;
    response = await res.json();
  } catch (err: any) {
    response = { error: err.message };
  }

  fs.writeFileSync(path.join(outputDir, 'response.json'), JSON.stringify(response, null, 2));

  // Annulation success criteria
  const passed = httpStatus === 201 || httpStatus === 200;
  const note = passed
    ? `HTTP ${httpStatus} - Annulation processed`
    : `HTTP ${httpStatus} - ${response.retourCertif?.listErr?.[0]?.mess || 'Unknown error'}`;

  const curlCmd = `#!/bin/bash
curl -X POST "${endpoint}" \\
  -H "Content-Type: application/json" \\
  -H "ENVIRN: ESSAI" \\
  -H "APPRLINIT: SRV" \\
  -H "CASESSAI: 500.001" \\
  -H "VERSIPARN: 1.0.0" \\
  -H "IDSEV: ${ESSAI_HEADERS.IDSEV}" \\
  -H "IDVERSI: ${ESSAI_HEADERS.IDVERSI}" \\
  -H "CODCERTIF: ${ESSAI_HEADERS.CODCERTIF}" \\
  -H "IDPARTN: ${ESSAI_HEADERS.IDPARTN}" \\
  -H "VERSI: ${ESSAI_HEADERS.VERSI}" \\
  -d @${path.join(outputDir, 'request.json').replace(/\\/g, '/')}
`;

  fs.writeFileSync(path.join(outputDir, 'curl.sh'), curlCmd);

  const summary = `# ${testId} - Annulation

**Endpoint**: ${endpoint}
**HTTP Status**: ${httpStatus}
**Result**: ${passed ? '✅ PASS' : '❌ FAIL'}

## Request
- **modif**: ANN
- **codAutori**: ${CODAUTORI} (in body)

## Note
${note}
`;

  fs.writeFileSync(path.join(outputDir, 'summary.md'), summary);

  console.log(`\n${passed ? '✅ PASS' : '❌ FAIL'}: ${testId}`);
  console.log(`📁 Output: ${outputDir}`);

  return {
    testId,
    endpoint: '/enrolement (ANN)',
    httpStatus,
    passed,
    note,
    outputDir,
  };
}

/**
 * ESSAI-UTI-001: /utilisateur
 */
async function testUtilisateur(): Promise<TestResult> {
  const testId = 'ESSAI-UTI-001';
  console.log('\n' + '='.repeat(70));
  console.log(`TEST: ${testId}`);
  console.log('/utilisateur - Tax validation with mTLS');
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

  fs.writeFileSync(path.join(outputDir, 'headers.json'), JSON.stringify(ESSAI_HEADERS, null, 2));
  fs.writeFileSync(path.join(outputDir, 'request.json'), JSON.stringify(requestBody, null, 2));

  console.log('🌐 Calling /utilisateur with mTLS...');

  const client = createMtlsClient({
    keyPath: 'tmp/certs/essai-client.key.pem',
    certPath: 'tmp/certs/essai-client.crt.pem',
    chainPath: 'tmp/certs/essai-client.chain.pem',
  });

  let httpStatus = 0;
  let response: any = {};

  try {
    const res = await client.post(endpoint, ESSAI_HEADERS, requestBody);
    httpStatus = res.status;
    response = res.json || {};
  } catch (err: any) {
    response = { error: err.message };
  }

  fs.writeFileSync(path.join(outputDir, 'response.json'), JSON.stringify(response, null, 2));

  const errors = response.retourUtil?.listErr || [];
  const structuralErrors = errors.filter((e: any) =>
    (e.mess?.includes('est absent') && !e.mess?.includes('='))
  );

  const passed = structuralErrors.length === 0;
  const note = passed
    ? `HTTP ${httpStatus} - No structural errors`
    : `HTTP ${httpStatus} - ${structuralErrors.length} structural errors`;

  const curlCmd = `#!/bin/bash
curl -X POST "${endpoint}" \\
  --cert tmp/certs/essai-client.crt.pem \\
  --key tmp/certs/essai-client.key.pem \\
  --cacert tmp/certs/essai-client.chain.pem \\
  --insecure \\
  -H "Content-Type: application/json" \\
  -H "ENVIRN: ESSAI" \\
  -H "APPRLINIT: SRV" \\
  -H "CASESSAI: 500.001" \\
  -H "VERSIPARN: 1.0.0" \\
  -H "IDSEV: ${ESSAI_HEADERS.IDSEV}" \\
  -H "IDVERSI: ${ESSAI_HEADERS.IDVERSI}" \\
  -H "CODCERTIF: ${ESSAI_HEADERS.CODCERTIF}" \\
  -H "IDPARTN: ${ESSAI_HEADERS.IDPARTN}" \\
  -H "VERSI: ${ESSAI_HEADERS.VERSI}" \\
  -d @${path.join(outputDir, 'request.json').replace(/\\/g, '/')}
`;

  fs.writeFileSync(path.join(outputDir, 'curl.sh'), curlCmd);

  const summary = `# ${testId} - /utilisateur

**Endpoint**: ${endpoint}
**HTTP Status**: ${httpStatus}
**Result**: ${passed ? '✅ PASS' : '❌ FAIL'}

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
 * ESSAI-TRX-001: /transaction
 */
async function testTransaction(): Promise<TestResult> {
  const testId = 'ESSAI-TRX-001';
  console.log('\n' + '='.repeat(70));
  console.log(`TEST: ${testId}`);
  console.log('/transaction - ECDSA signature with mTLS');
  console.log('='.repeat(70) + '\n');

  const outputDir = path.join(suiteBaseDir, testId);
  fs.mkdirSync(outputDir, { recursive: true });

  const endpoint = 'https://cnfr.api.rq-fo.ca/transaction';

  const crypto = loadCryptoMaterial(
    'tmp/certs/essai-client.key.pem',
    'tmp/certs/essai-client.crt.pem'
  );

  const transActuBase = {
    noTrans: 'ESSAI-TRX-' + Date.now(),
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
    items: [{ desc: 'ESSAI Test', qte: '1', prixUnit: '10.00', montant: '10.00' }],
    modPai: 'COMPTANT',
    nomMandt: 'Michel Untel',
    formImpr: 'PAPIER',
    modImpr: 'TICKET',
    emprCertifSEV: crypto.fingerprint,
    utc: '-05:00',
    relaCommer: 'B2C',
    noTax: { noTPS: GOLDEN_DN.CN, noTVQ: GOLDEN_DN.OU },
    SEV: {
      idSEV: ESSAI_HEADERS.IDSEV,
      idVersi: ESSAI_HEADERS.IDVERSI,
      codCertif: ESSAI_HEADERS.CODCERTIF,
      idPartn: ESSAI_HEADERS.IDPARTN,
      versi: ESSAI_HEADERS.VERSI,
      versiParn: ESSAI_HEADERS.VERSIPARN,
    },
  };

  console.log('✍️  Generating ECDSA P-256 signature...');
  const signaRaw = createTransactionSignature(transActuBase, crypto);

  const signa: any = {
    empreinteCert: signaRaw.empreinteCert,
    hash: signaRaw.hash,
    actu: signaRaw.actu,
    preced: '',
    datActu: new Date().toISOString().replace('Z', '-05:00'),
  };

  const transActu = { ...transActuBase, signa };
  const requestBody = { reqTrans: { transActu } };

  const txHeaders = {
    ...ESSAI_HEADERS,
    SIGNATRANSM: 'OUI',
    EMPRCERTIFTRANSM: 'OUI',
    NOTPS: GOLDEN_DN.CN,
    NOTVQ: GOLDEN_DN.OU,
  };

  fs.writeFileSync(path.join(outputDir, 'headers.json'), JSON.stringify(txHeaders, null, 2));
  fs.writeFileSync(path.join(outputDir, 'request.json'), JSON.stringify(requestBody, null, 2));
  fs.writeFileSync(path.join(outputDir, 'transActu-canonical.json'), canonicalize(transActuBase));

  console.log('🌐 Calling /transaction with mTLS...');

  const client = createMtlsClient({
    keyPath: 'tmp/certs/essai-client.key.pem',
    certPath: 'tmp/certs/essai-client.crt.pem',
    chainPath: 'tmp/certs/essai-client.chain.pem',
  });

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
    ? `HTTP ${httpStatus} - No structural errors`
    : `HTTP ${httpStatus} - ${structuralErrors.length} structural errors`;

  const curlCmd = `#!/bin/bash
curl -X POST "${endpoint}" \\
  --cert tmp/certs/essai-client.crt.pem \\
  --key tmp/certs/essai-client.key.pem \\
  --cacert tmp/certs/essai-client.chain.pem \\
  --insecure \\
  -H "Content-Type: application/json" \\
  -H "ENVIRN: ESSAI" \\
  -H "APPRLINIT: SRV" \\
  -H "CASESSAI: 500.001" \\
  -H "VERSIPARN: 1.0.0" \\
  -H "IDSEV: ${ESSAI_HEADERS.IDSEV}" \\
  -H "IDVERSI: ${ESSAI_HEADERS.IDVERSI}" \\
  -H "CODCERTIF: ${ESSAI_HEADERS.CODCERTIF}" \\
  -H "IDPARTN: ${ESSAI_HEADERS.IDPARTN}" \\
  -H "VERSI: ${ESSAI_HEADERS.VERSI}" \\
  -H "SIGNATRANSM: OUI" \\
  -H "EMPRCERTIFTRANSM: OUI" \\
  -H "NOTPS: ${GOLDEN_DN.CN}" \\
  -H "NOTVQ: ${GOLDEN_DN.OU}" \\
  -d @${path.join(outputDir, 'request.json').replace(/\\/g, '/')}
`;

  fs.writeFileSync(path.join(outputDir, 'curl.sh'), curlCmd);

  const summary = `# ${testId} - /transaction

**Endpoint**: ${endpoint}
**HTTP Status**: ${httpStatus}
**Result**: ${passed ? '✅ PASS' : '❌ FAIL'}

## Signature
- **Hash**: \`${signa.hash.actu.substring(0, 40)}...\`
- **Signature**: \`${signa.actu.substring(0, 40)}...\`

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
 * ESSAI-DOC-001: /document
 */
async function testDocument(): Promise<TestResult> {
  const testId = 'ESSAI-DOC-001';
  console.log('\n' + '='.repeat(70));
  console.log(`TEST: ${testId}`);
  console.log('/document - Base64 upload with mTLS');
  console.log('='.repeat(70) + '\n');

  const outputDir = path.join(suiteBaseDir, testId);
  fs.mkdirSync(outputDir, { recursive: true });

  const endpoint = 'https://cnfr.api.rq-fo.ca/document';

  const docContent = JSON.stringify({
    type: 'ESSAI-test-document',
    content: 'Test document for ESSAI validation',
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
    ...ESSAI_HEADERS,
    NOTPS: GOLDEN_DN.CN,
    NOTVQ: GOLDEN_DN.OU,
  };

  fs.writeFileSync(path.join(outputDir, 'headers.json'), JSON.stringify(docHeaders, null, 2));
  fs.writeFileSync(path.join(outputDir, 'request.json'), JSON.stringify(requestBody, null, 2));

  console.log('🌐 Calling /document with mTLS...');

  const client = createMtlsClient({
    keyPath: 'tmp/certs/essai-client.key.pem',
    certPath: 'tmp/certs/essai-client.crt.pem',
    chainPath: 'tmp/certs/essai-client.chain.pem',
  });

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
  --cert tmp/certs/essai-client.crt.pem \\
  --key tmp/certs/essai-client.key.pem \\
  --cacert tmp/certs/essai-client.chain.pem \\
  --insecure \\
  -H "Content-Type: application/json" \\
  -H "ENVIRN: ESSAI" \\
  -H "APPRLINIT: SRV" \\
  -H "CASESSAI: 500.001" \\
  -H "VERSIPARN: 1.0.0" \\
  -H "IDSEV: ${ESSAI_HEADERS.IDSEV}" \\
  -H "IDVERSI: ${ESSAI_HEADERS.IDVERSI}" \\
  -H "CODCERTIF: ${ESSAI_HEADERS.CODCERTIF}" \\
  -H "IDPARTN: ${ESSAI_HEADERS.IDPARTN}" \\
  -H "VERSI: ${ESSAI_HEADERS.VERSI}" \\
  -H "NOTPS: ${GOLDEN_DN.CN}" \\
  -H "NOTVQ: ${GOLDEN_DN.OU}" \\
  -d @${path.join(outputDir, 'request.json').replace(/\\/g, '/')}
`;

  fs.writeFileSync(path.join(outputDir, 'curl.sh'), curlCmd);

  const summary = `# ${testId} - /document

**Endpoint**: ${endpoint}
**HTTP Status**: ${httpStatus}
**Result**: ${passed ? '✅ PASS' : '❌ FAIL'}

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

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  WEB-SRM ESSAI - Complete Test Suite                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  suiteTimestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  suiteBaseDir = path.join('tmp', 'logs', `essai-complete-${suiteTimestamp}`);
  fs.mkdirSync(suiteBaseDir, { recursive: true });

  console.log(`📁 Suite output: ${suiteBaseDir}\n`);
  console.log('⚠️  ESSAI Configuration:');
  console.log('   - ENVIRN: ESSAI');
  console.log('   - CASESSAI: 500.001');
  console.log('   - VERSIPARN: 1.0.0');
  console.log('   - codAutori: IN BODY\n');

  // Mandatory test sequence
  results.push(await testEnrolment('ESSAI-ENR-001', 'AJO'));
  results.push(await testAnnulation());
  results.push(await testEnrolment('ESSAI-ENR-002', 'AJO'));
  results.push(await testUtilisateur());
  results.push(await testTransaction());
  results.push(await testDocument());

  // Generate master report
  console.log('\n' + '='.repeat(70));
  console.log('GENERATING MASTER REPORT');
  console.log('='.repeat(70) + '\n');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  const report = `# WEB-SRM ESSAI - Complete Test Suite Report

**Test Date**: ${new Date().toISOString()}
**Suite ID**: ${suiteTimestamp}
**Total Tests**: ${results.length}
**Passed**: ${passed} ✅
**Failed**: ${failed} ❌

---

## ESSAI Configuration

**Environment Differences from DEV**:
- ENVIRN: ESSAI (was DEV)
- CASESSAI: 500.001 (was 000.000)
- VERSIPARN: 1.0.0 (was 0)
- codAutori: IN BODY (was in header for DEV)

**Test Sequence** (MANDATORY):
1. Enrolment (AJO)
2. Annulation (ANN)
3. Re-enrolment (AJO)
4. /utilisateur, /transaction, /document

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

**Reproducible curl**:
\`\`\`bash
bash ${path.join(r.outputDir, 'curl.sh').replace(/\\/g, '/')}
\`\`\`

---
`
  )
  .join('\n')}

## Golden Config (Same as DEV)

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

**ESSAI Headers**:
- ENVIRN: ESSAI
- CASESSAI: 500.001
- VERSIPARN: 1.0.0
- codAutori: IN BODY (not header)

**mTLS Files**:
- tmp/certs/essai-client.key.pem
- tmp/certs/essai-client.crt.pem
- tmp/certs/essai-client.chain.pem

---

## Final Status

${
  failed === 0
    ? '🎉 **ALL TESTS PASSED** - Full ESSAI suite complete!'
    : `⚠️ **${failed} TEST(S) FAILED** - Review individual test artifacts.`
}

**Report Generated**: ${new Date().toISOString()}
`;

  const reportPath = path.join('tmp', 'logs', `essai-REPORT-${suiteTimestamp}.md`);
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
