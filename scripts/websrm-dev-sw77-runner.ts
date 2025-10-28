/**
 * WEB-SRM DEV - SW-77 Test Runner
 *
 * Purpose: Run SW-77 certification test cases on DEV environment
 *
 * Golden Config (Locked):
 * - Endpoint: https://certificats.cnfr.api.rq-fo.ca/enrolement
 * - ENVIRN: DEV
 * - CASESSAI: 000.000
 * - VERSIPARN: 0
 * - CODAUTORI: D8T8-W8W8 (in header, NOT in body)
 * - DN: RBC-D8T8-W8W8 (Michel Untel)
 */

import * as x509 from '@peculiar/x509';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';
import { Crypto } from '@peculiar/webcrypto';

// Setup WebCrypto
const webcrypto = new Crypto();
x509.cryptoProvider.set(webcrypto);

// GOLDEN CONFIG (LOCKED - DO NOT MODIFY)
const DEV_ENDPOINT = 'https://certificats.cnfr.api.rq-fo.ca/enrolement';

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
  CODAUTORI: 'D8T8-W8W8', // In header (DEV requirement)
};

// Golden DN (RBC - Michel Untel) - LOCKED CONFIGURATION
const GOLDEN_DN = {
  C: 'CA',
  ST: 'QC',
  L: '-05:00',
  surname: 'Certificat du serveur', // 2.5.4.4 (CRITICAL!)
  O: 'RBC-D8T8-W8W8',
  OU: '5678912340TQ0001',
  givenName: 'ER0001', // 2.5.4.42 (LOCKED - only authorized GN for D8T8-W8W8)
  CN: '5678912340',
};

type TestType = 'enrolment' | 'utilisateur' | 'transaction' | 'document';

interface TestCase {
  id: string;
  type: TestType;
  description: string;
  dn?: Partial<typeof GOLDEN_DN>; // Override DN fields (for enrolment)
  endpoint?: string; // Override endpoint
  requestBody?: any; // Custom request body (for utilisateur/transaction/document)
  expectedStatus: number;
  expectedErrors?: string[]; // Expected error IDs
  requiresCertificate?: boolean; // Requires certificate from previous enrolment
}

// SW-77 Test Cases
const TEST_CASES: TestCase[] = [
  // §2.1.2 - Enrolment Tests
  {
    id: 'SW77-ENR-001',
    type: 'enrolment',
    description: 'Enrolment - Michel Untel with GN=ER0001 (Golden Config)',
    dn: { givenName: 'ER0001' },
    expectedStatus: 201,
  },
  // TR0001 removed - not authorized for this CODAUTORI

  // §2.1.3 - Utilisateur Tests (User Validation)
  {
    id: 'SW77-UTI-001',
    type: 'utilisateur',
    description: 'Utilisateur - Validate Michel Untel (RBC) with IDAPPRL',
    endpoint: 'https://cnfr.api.rq-fo.ca/utilisateur', // Correct URL for utilisateur
    requiresCertificate: true,
    expectedStatus: 200,
  },
];

async function generateKeyPair() {
  const keys = await webcrypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify']
  );
  return keys;
}

async function generateCSR(cryptoKey: CryptoKeyPair, dnOverrides: Partial<typeof GOLDEN_DN> = {}) {
  // Merge golden DN with overrides
  const dn = { ...GOLDEN_DN, ...dnOverrides };

  // Build DN string - EXACT ORDER: C, ST, L, SN (2.5.4.4), O, OU, GN (2.5.4.42), CN
  const dnString = `C=${dn.C}, ST=${dn.ST}, L=${dn.L}, 2.5.4.4=${dn.surname}, O=${dn.O}, OU=${dn.OU}, 2.5.4.42=${dn.givenName}, CN=${dn.CN}`;

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
      // NO ExtendedKeyUsage (server adds clientAuth automatically)
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

async function runTestCase(
  testCase: TestCase,
  storedCertificate?: any
): Promise<{
  passed: boolean;
  httpStatus: number;
  errors: any[];
  certificateReceived: boolean;
  outputDir: string;
}> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputDir = path.join('tmp', 'logs', `dev-sw77-${testCase.id}-${timestamp}`);
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\n${'='.repeat(70)}`);
  console.log(`TEST: ${testCase.id}`);
  console.log(`${testCase.description}`);
  console.log(`Type: ${testCase.type.toUpperCase()}`);
  console.log(`${'='.repeat(70)}\n`);

  let requestBody: any;
  let csrPem = '';
  let derBuffer: Buffer | null = null;
  let dnString = '';
  let sha256Hash = '';

  let privateKeyPem = '';

  if (testCase.type === 'enrolment') {
    // Generate keypair
    console.log('🔐 Generating keypair...');
    const cryptoKey = await generateKeyPair();

    // Generate CSR
    console.log('📝 Generating CSR (GOLDEN CONFIG)...');
    const csrResult = await generateCSR(cryptoKey, testCase.dn);
    csrPem = csrResult.csrPem;
    derBuffer = csrResult.derBuffer;
    dnString = csrResult.dnString;
    privateKeyPem = csrResult.privateKeyPem;

    // Save CSR
    const csrPath = path.join(outputDir, 'csr.pem');
    fs.writeFileSync(csrPath, csrPem, 'utf8');

    // SHA-256 hash
    sha256Hash = crypto.createHash('sha256').update(derBuffer).digest('hex');
    fs.writeFileSync(path.join(outputDir, 'sha256.txt'), sha256Hash, 'utf8');

    // OpenSSL parse
    let opensslOutput = '';
    try {
      opensslOutput = execSync(`openssl req -in "${csrPath}" -noout -text`, {
        encoding: 'utf8',
      });
      fs.writeFileSync(path.join(outputDir, 'csr.txt'), opensslOutput, 'utf8');
    } catch (err: any) {
      opensslOutput = `OpenSSL error: ${err.message}`;
      fs.writeFileSync(path.join(outputDir, 'csr.txt'), opensslOutput, 'utf8');
    }

    console.log(`   DN: ${dnString}`);
    console.log(`   SHA-256: ${sha256Hash.substring(0, 16)}...`);

    // Build enrolment request body
    requestBody = {
      reqCertif: {
        modif: 'AJO',
        csr: csrPem,
      },
      // NO codAutori in body for DEV
    };
  } else if (testCase.type === 'utilisateur') {
    // Load certificate from previous enrolment
    if (!storedCertificate) {
      throw new Error(`Test ${testCase.id} requires certificate but none provided`);
    }

    console.log(`📜 Using certificate from enrolment`);
    console.log(`   IDAPPRL: ${storedCertificate.idApprl}`);
    console.log(`   GivenName: ${storedCertificate.givenName}`);

    // Save reference to certificate being used
    fs.writeFileSync(
      path.join(outputDir, 'certificate-ref.json'),
      JSON.stringify(storedCertificate, null, 2),
      'utf8'
    );

    // Build utilisateur request body (adjust based on actual API requirements)
    requestBody = testCase.requestBody || {
      reqUtilisateur: {
        idApprl: storedCertificate.idApprl,
      },
    };
  } else {
    throw new Error(`Unsupported test type: ${testCase.type}`);
  }

  // Save headers
  fs.writeFileSync(
    path.join(outputDir, 'headers.json'),
    JSON.stringify(DEV_HEADERS, null, 2),
    'utf8'
  );

  // Save request body
  fs.writeFileSync(
    path.join(outputDir, 'request.json'),
    JSON.stringify(requestBody, null, 2),
    'utf8'
  );

  // Generate curl command
  const curlHeaders = Object.entries(DEV_HEADERS)
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(' \\\n  ');

  const curlCommand = `curl -v -X POST "${testCase.endpoint || DEV_ENDPOINT}" \\\n  ${curlHeaders} \\\n  --data-binary @request.json`;
  fs.writeFileSync(path.join(outputDir, 'curl.sh'), curlCommand, 'utf8');

  // Make API call
  console.log(`🌐 Calling ${testCase.endpoint || DEV_ENDPOINT}...\n`);

  let httpStatus: number;
  let response: any;
  let errors: any[] = [];
  let certificateReceived = false;

  try {
    const res = await fetch(testCase.endpoint || DEV_ENDPOINT, {
      method: 'POST',
      headers: DEV_HEADERS,
      body: JSON.stringify(requestBody),
    });

    httpStatus = res.status;

    // Parse response
    const contentType = res.headers.get('content-type');
    const responseText = await res.text();

    if (contentType?.includes('application/json')) {
      response = JSON.parse(responseText);
    } else {
      response = {
        error: 'Non-JSON response',
        contentType,
        preview: responseText.substring(0, 500),
      };
    }

    // Save response
    fs.writeFileSync(
      path.join(outputDir, 'response.json'),
      JSON.stringify(response, null, 2),
      'utf8'
    );

    // Parse errors
    if (response.retourCertif?.listErr) {
      errors = response.retourCertif.listErr;
    }

    // Check for certificate
    if (response.retourCertif?.certif) {
      certificateReceived = true;

      // Save certificate and IDAPPRL to persistent storage
      const certStorageDir = path.join('tmp', 'certs');
      fs.mkdirSync(certStorageDir, { recursive: true });

      // Save mTLS files for client authentication (standard naming)
      const clientKeyPath = path.join(certStorageDir, 'dev-client.key.pem');
      const clientCertPath = path.join(certStorageDir, 'dev-client.crt.pem');
      const clientChainPath = path.join(certStorageDir, 'dev-client.chain.pem');

      // Save private key (NEVER log this!)
      fs.writeFileSync(clientKeyPath, privateKeyPem, 'utf8');

      // Save client certificate
      fs.writeFileSync(clientCertPath, response.retourCertif.certif, 'utf8');

      // Save CA chain
      fs.writeFileSync(clientChainPath, response.retourCertif.certifPSI, 'utf8');

      const certData = {
        testId: testCase.id,
        timestamp: new Date().toISOString(),
        idApprl: response.retourCertif.idApprl || null,
        certificate: response.retourCertif.certif || null,
        certificatePSI: response.retourCertif.certifPSI || null,
        privateKey: privateKeyPem, // Stored but NOT logged
        givenName: (testCase.dn?.givenName || GOLDEN_DN.givenName),
        mtlsFiles: {
          key: clientKeyPath,
          cert: clientCertPath,
          chain: clientChainPath,
        },
      };

      fs.writeFileSync(
        path.join(certStorageDir, `${testCase.id}-cert.json`),
        JSON.stringify(certData, null, 2),
        'utf8'
      );

      // Also save to test output directory
      fs.writeFileSync(
        path.join(outputDir, 'certificate.json'),
        JSON.stringify(certData, null, 2),
        'utf8'
      );

      console.log(`   💾 Certificate saved`);
      console.log(`      - Private key: ${clientKeyPath}`);
      console.log(`      - Certificate: ${clientCertPath}`);
      console.log(`      - CA chain: ${clientChainPath}`);
    }

    console.log(`📥 Response: HTTP ${httpStatus}`);
    console.log(`   Certificate: ${certificateReceived ? '✅ YES' : '❌ NO'}`);
    console.log(`   Errors: ${errors.length}\n`);

    if (errors.length > 0) {
      errors.forEach((err, i) => {
        console.log(`   ${i + 1}. [${err.codRetour}] ${err.id}: ${err.mess?.substring(0, 80)}`);
      });
      console.log('');
    }

  } catch (err: any) {
    httpStatus = 0;
    response = { error: err.message };
    fs.writeFileSync(
      path.join(outputDir, 'response.json'),
      JSON.stringify(response, null, 2),
      'utf8'
    );
    console.error(`❌ Request failed: ${err.message}\n`);
  }

  // Determine pass/fail
  const passed = httpStatus === testCase.expectedStatus &&
    (testCase.expectedStatus === 201 ? certificateReceived : true) &&
    (testCase.expectedErrors
      ? testCase.expectedErrors.every(expId => errors.some(e => e.id === expId))
      : true);

  // Create summary
  const summary = `# ${testCase.id} - Test Summary

**Description**: ${testCase.description}
**Timestamp**: ${new Date().toISOString()}
**Result**: ${passed ? '✅ PASS' : '❌ FAIL'}

## Configuration

### Endpoint
\`\`\`
${testCase.endpoint || DEV_ENDPOINT}
\`\`\`

### Headers
\`\`\`
${Object.entries(DEV_HEADERS).map(([k, v]) => `${k}: ${v}`).join('\n')}
\`\`\`

### DN
\`\`\`
${dnString}
\`\`\`

### CSR
${testCase.type === 'enrolment' ? `- **Algorithm**: ECDSA P-256 + SHA-256
- **KeyUsage**: digitalSignature + nonRepudiation (critical)
- **ExtendedKeyUsage**: NONE (server adds clientAuth)
- **PEM Format**: Single-line base64
- **SHA-256**: ${sha256Hash}` : `- **N/A** (not an enrolment test)`}

## Expected vs Actual

- **Expected HTTP Status**: ${testCase.expectedStatus}
- **Actual HTTP Status**: ${httpStatus}
- **Expected Certificate**: ${testCase.expectedStatus === 201 ? 'YES' : 'N/A'}
- **Actual Certificate**: ${certificateReceived ? 'YES' : 'NO'}
${testCase.expectedErrors ? `- **Expected Errors**: ${testCase.expectedErrors.join(', ')}` : ''}

## Response Details

### HTTP Status: ${httpStatus}

${errors.length > 0 ? `### Errors (${errors.length})

${errors.map((e, i) => `${i + 1}. **${e.id}** [${e.codRetour}]
   ${e.mess}`).join('\n\n')}` : '### ✅ No Errors'}

${certificateReceived ? `### Certificate Received

- Main Certificate: ${response.retourCertif.certif ? 'YES' : 'NO'}
- PSI Certificate: ${response.retourCertif.certifPSI ? 'YES' : 'NO'}
- IDAPPRL: ${response.retourCertif.idApprl || 'N/A'}` : ''}

## Test Result

${passed ? '✅ **PASS**: All assertions met' : '❌ **FAIL**: Assertions not met'}

${!passed ? `### Failure Reasons

${httpStatus !== testCase.expectedStatus ? `- HTTP status mismatch: expected ${testCase.expectedStatus}, got ${httpStatus}` : ''}
${testCase.expectedStatus === 201 && !certificateReceived ? '- Certificate not received' : ''}
${testCase.expectedErrors && !testCase.expectedErrors.every(expId => errors.some(e => e.id === expId)) ? `- Expected errors not found: ${testCase.expectedErrors.join(', ')}` : ''}` : ''}

## Files

- \`csr.pem\`: CSR in PEM format
- \`csr.txt\`: OpenSSL parsed output
- \`sha256.txt\`: SHA-256 hash
- \`headers.json\`: Request headers
- \`request.json\`: Request body
- \`response.json\`: API response
- \`curl.sh\`: Reproducible curl command
`;

  fs.writeFileSync(path.join(outputDir, 'summary.md'), summary, 'utf8');

  console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${testCase.id}`);
  console.log(`📁 Output: ${outputDir}\n`);

  return {
    passed,
    httpStatus,
    errors,
    certificateReceived,
    outputDir,
  };
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  WEB-SRM DEV - SW-77 Test Runner                              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  console.log(`Total test cases: ${TEST_CASES.length}\n`);

  const results = [];
  let storedCertificate: any = null;

  for (const testCase of TEST_CASES) {
    // Load certificate if test requires it
    let certToUse = storedCertificate;

    if (testCase.requiresCertificate && !storedCertificate) {
      // Try to load from disk
      const certPath = path.join('tmp', 'certs', 'SW77-ENR-001-cert.json');
      if (fs.existsSync(certPath)) {
        console.log(`📂 Loading certificate from ${certPath}\n`);
        storedCertificate = JSON.parse(fs.readFileSync(certPath, 'utf8'));
        certToUse = storedCertificate;
      }
    }

    const result = await runTestCase(testCase, certToUse);
    results.push({ testCase, result });

    // Store certificate from successful enrolment for subsequent tests
    if (testCase.type === 'enrolment' && result.certificateReceived) {
      const certPath = path.join('tmp', 'certs', `${testCase.id}-cert.json`);
      storedCertificate = JSON.parse(fs.readFileSync(certPath, 'utf8'));
      console.log(`✅ Certificate stored for subsequent tests\n`);
    }
  }

  // Generate final report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const reportPath = path.join('tmp', 'logs', `dev-sw77-REPORT-${timestamp}.md`);

  const passCount = results.filter(r => r.result.passed).length;
  const failCount = results.length - passCount;

  const report = `# WEB-SRM DEV - SW-77 Test Report

**Generated**: ${new Date().toISOString()}
**Environment**: DEV
**Total Tests**: ${results.length}
**Passed**: ${passCount}
**Failed**: ${failCount}

## Summary

| Test ID | Description | HTTP | Certificate | Result | Output |
|---------|-------------|------|-------------|--------|--------|
${results.map(({ testCase, result }) => {
  const status = result.httpStatus;
  const cert = result.certificateReceived ? '✅' : '❌';
  const pass = result.passed ? '✅ PASS' : '❌ FAIL';
  const output = path.relative(process.cwd(), result.outputDir);
  return `| ${testCase.id} | ${testCase.description} | ${status} | ${cert} | ${pass} | [${output}](${output}) |`;
}).join('\n')}

## Test Results by Category

### ✅ Passed Tests (${passCount})

${results.filter(r => r.result.passed).map(({ testCase }) => `- ${testCase.id}: ${testCase.description}`).join('\n')}

${failCount > 0 ? `### ❌ Failed Tests (${failCount})

${results.filter(r => !r.result.passed).map(({ testCase, result }) => `- ${testCase.id}: ${testCase.description}
  - HTTP: ${result.httpStatus} (expected: ${testCase.expectedStatus})
  - Certificate: ${result.certificateReceived ? 'YES' : 'NO'}
  - Errors: ${result.errors.length}`).join('\n\n')}` : ''}

## Golden Configuration (Used for All Tests)

\`\`\`
Endpoint: ${DEV_ENDPOINT}
ENVIRN: DEV
CASESSAI: 000.000
VERSIPARN: 0
CODAUTORI: D8T8-W8W8 (in header)

DN: C=CA, ST=QC, L=-05:00, 2.5.4.4=Certificat du serveur,
    O=RBC-D8T8-W8W8, OU=5678912340TQ0001, 2.5.4.42=ER0001, CN=5678912340

KeyUsage: digitalSignature + nonRepudiation (critical)
ExtendedKeyUsage: NONE (server adds clientAuth)
PEM: Single-line base64
\`\`\`

## Next Steps

${failCount === 0 ? '✅ All DEV tests passed! Ready to proceed to ESSAI testing.' : `❌ Fix failed tests before proceeding to ESSAI.

Review failed test outputs and adjust test cases or golden configuration as needed.`}
`;

  fs.writeFileSync(reportPath, report, 'utf8');

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  FINAL REPORT                                                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  console.log(`Total: ${results.length} tests`);
  console.log(`Passed: ${passCount} ✅`);
  console.log(`Failed: ${failCount} ❌\n`);
  console.log(`📄 Report: ${reportPath}\n`);

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ Test runner error:', error.message);
  process.exit(1);
});
