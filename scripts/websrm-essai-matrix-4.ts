/**
 * ESSAI Enrolment - 4x Matrix Validation
 *
 * Variables:
 * - CASESSAI: 000.000 vs 500.001
 * - codAutori placement: header vs body
 *
 * Fixed DN (RBC-based):
 * C=CA, ST=QC, L=-05:00, 2.5.4.4=Certificat du serveur,
 * O=RBC-D8T8-W8W8, OU=5678912340TQ0001, 2.5.4.42=ER0001, CN=5678912340
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

const ENDPOINT = 'https://certificats.cnfr.api.rq-fo.ca/enrolement';

// Common headers (will be modified per attempt)
const BASE_HEADERS = {
  'Content-Type': 'application/json',
  ENVIRN: 'ESSAI',
  APPRLINIT: 'SRV',
  VERSIPARN: '1.0.0',
  IDSEV: '0000000000003973',
  IDVERSI: '00000000000045D6',
  CODCERTIF: 'FOB201999999',
  IDPARTN: '0000000000001FF2',
  VERSI: '0.1.0',
};

// Fixed DN (RBC-based)
const DN = {
  C: 'CA',
  ST: 'QC',
  L: '-05:00',
  surname: 'Certificat du serveur', // 2.5.4.4
  O: 'RBC-D8T8-W8W8',
  OU: '5678912340TQ0001',
  GN: 'ER0001', // 2.5.4.42
  CN: '5678912340',
};

const DN_STRING = `C=${DN.C}, ST=${DN.ST}, L=${DN.L}, 2.5.4.4=${DN.surname}, O=${DN.O}, OU=${DN.OU}, 2.5.4.42=${DN.GN}, CN=${DN.CN}`;

// Test matrix configurations
const MATRIX = [
  {
    id: 'A1',
    casessai: '000.000',
    codAutoriInHeader: true,
    description: 'CASESSAI=000.000, CODAUTORI in header',
  },
  {
    id: 'A2',
    casessai: '000.000',
    codAutoriInHeader: false,
    description: 'CASESSAI=000.000, codAutori in body',
  },
  {
    id: 'B1',
    casessai: '500.001',
    codAutoriInHeader: true,
    description: 'CASESSAI=500.001, CODAUTORI in header',
  },
  {
    id: 'B2',
    casessai: '500.001',
    codAutoriInHeader: false,
    description: 'CASESSAI=500.001, codAutori in body',
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

async function generateCSR(cryptoKey: CryptoKeyPair) {
  const csr = await x509.Pkcs10CertificateRequestGenerator.create({
    name: DN_STRING,
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
    ],
  });

  // Export as single-line base64 PEM
  const derBuffer = Buffer.from(csr.rawData);
  const base64SingleLine = derBuffer.toString('base64');
  const csrPem = `-----BEGIN CERTIFICATE REQUEST-----\n${base64SingleLine}\n-----END CERTIFICATE REQUEST-----`;

  return { csrPem, derBuffer };
}

async function testAttempt(config: any, baseDir: string) {
  const outputDir = path.join(baseDir, config.id);
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\n${'='.repeat(70)}`);
  console.log(`TEST ${config.id}: ${config.description}`);
  console.log('='.repeat(70));

  // Build headers
  const headers = {
    ...BASE_HEADERS,
    CASESSAI: config.casessai,
  };

  if (config.codAutoriInHeader) {
    headers.CODAUTORI = 'D8T8-W8W8'; // UPPERCASE in header
  }

  // Generate keypair
  console.log('🔐 Generating ECDSA P-256 keypair...');
  const cryptoKey = await generateKeyPair();

  console.log(`📝 DN: ${DN_STRING}`);

  // Generate CSR
  const { csrPem, derBuffer } = await generateCSR(cryptoKey);
  console.log(`✅ CSR generated (${derBuffer.length} bytes DER)`);

  // Save CSR
  fs.writeFileSync(path.join(outputDir, 'csr.pem'), csrPem, 'utf8');

  // SHA-256 hash
  const sha256Hash = crypto.createHash('sha256').update(derBuffer).digest('hex');
  fs.writeFileSync(path.join(outputDir, 'sha256.txt'), sha256Hash, 'utf8');

  // OpenSSL parse
  try {
    const opensslOutput = execSync(`openssl req -in "${path.join(outputDir, 'csr.pem')}" -noout -text`, {
      encoding: 'utf8',
    });
    fs.writeFileSync(path.join(outputDir, 'csr.txt'), opensslOutput, 'utf8');
  } catch (err: any) {
    console.log(`⚠️  OpenSSL parse failed: ${err.message}`);
  }

  // Request body
  const requestBody: any = {
    reqCertif: {
      modif: 'AJO',
      csr: csrPem,
    },
  };

  if (!config.codAutoriInHeader) {
    requestBody.codAutori = 'D8T8-W8W8'; // camelCase in body
  }

  // Save artifacts
  fs.writeFileSync(path.join(outputDir, 'headers.json'), JSON.stringify(headers, null, 2), 'utf8');
  fs.writeFileSync(path.join(outputDir, 'request.json'), JSON.stringify(requestBody, null, 2), 'utf8');

  // Generate curl command
  const curlHeaders = Object.entries(headers)
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(' \\\n  ');

  const curlCommand = `curl -X POST "${ENDPOINT}" \\\n  ${curlHeaders} \\\n  -d @request.json`;
  fs.writeFileSync(path.join(outputDir, 'curl.sh'), curlCommand, 'utf8');

  // Make API call
  console.log(`🌐 Calling ${ENDPOINT}...`);
  console.log(`   CASESSAI: ${config.casessai}`);
  console.log(`   codAutori: ${config.codAutoriInHeader ? 'HEADER' : 'BODY'}`);

  let httpStatus = 0;
  let response: any = {};

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
    });
    httpStatus = res.status;
    response = await res.json();
  } catch (err: any) {
    response = { error: err.message };
  }

  fs.writeFileSync(path.join(outputDir, 'response.json'), JSON.stringify(response, null, 2), 'utf8');

  // Analyze response
  const errors: any[] = [];
  let certificateReceived = false;

  if (response.retourCertif) {
    if (response.retourCertif.listErr && response.retourCertif.listErr.length > 0) {
      errors.push(...response.retourCertif.listErr);
    }
    if (response.retourCertif.certif) {
      certificateReceived = true;
    }
  }

  // Console summary
  console.log(`📥 HTTP ${httpStatus}`);
  if (errors.length > 0) {
    console.log(`❌ Errors (${errors.length}):`);
    errors.slice(0, 2).forEach((e) => {
      console.log(`   [${e.codRetour}] ${e.id}: ${e.mess}`);
    });
  }

  // Determine status
  let diagnosis = 'UNKNOWN';
  if (httpStatus === 201 && certificateReceived) {
    diagnosis = 'PASS';
    console.log(`✅ PASS - Certificate received!`);
  } else if (errors.some((e) => e.codRetour === '93')) {
    diagnosis = 'DN_MISMATCH_93';
    console.log(`⚠️  DN MISMATCH (93)`);
  } else if (errors.some((e) => e.codRetour === '95' || e.codRetour === '96')) {
    diagnosis = 'STRUCTURAL_95_96';
    console.log(`❌ STRUCTURAL (95/96)`);
  } else if (errors.some((e) => e.codRetour === '16')) {
    diagnosis = 'INVALID_FORMAT_16';
    console.log(`❌ INVALID FORMAT (16)`);
  } else {
    diagnosis = 'FAIL';
    console.log(`❌ FAIL - Other error`);
  }

  // Create summary.md
  const summary = `# ESSAI Enrolment - Test ${config.id}

**Config**: ${config.description}
**Timestamp**: ${new Date().toISOString()}

## Configuration

### Headers

\`\`\`
${Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\n')}
\`\`\`

### DN (Fixed)

\`\`\`
${DN_STRING}
\`\`\`

### Request Body

\`\`\`json
${JSON.stringify(requestBody, null, 2)}
\`\`\`

## Results

- **HTTP Status**: ${httpStatus}
- **Diagnosis**: ${diagnosis}
- **Certificate Received**: ${certificateReceived ? 'YES ✅' : 'NO ❌'}
- **Errors**: ${errors.length}

${errors.length > 0 ? `### Errors

${errors.map((e, i) => `${i + 1}. **[${e.codRetour}] ${e.id}**
   ${e.mess}`).join('\n\n')}` : ''}

## Files

- \`csr.pem\`: CSR in PEM format (single-line base64)
- \`csr.txt\`: OpenSSL parsed output
- \`sha256.txt\`: SHA-256 hash of DER
- \`headers.json\`: Request headers
- \`request.json\`: Request body
- \`response.json\`: API response
- \`curl.sh\`: Reproducible curl command
`;

  fs.writeFileSync(path.join(outputDir, 'summary.md'), summary, 'utf8');

  return {
    id: config.id,
    casessai: config.casessai,
    codAutoriLocation: config.codAutoriInHeader ? 'HEADER' : 'BODY',
    httpStatus,
    diagnosis,
    certificateReceived,
    errors,
    outputDir,
  };
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const baseDir = path.join('tmp', 'logs', `essai-matrix-${timestamp}`);
  fs.mkdirSync(baseDir, { recursive: true });

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  ESSAI Enrolment - 4x Matrix Validation                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`\n📁 Base output: ${baseDir}\n`);
  console.log(`🔒 Fixed DN: ${DN_STRING}\n`);

  const results: any[] = [];

  // Run all 4 tests
  for (const config of MATRIX) {
    const result = await testAttempt(config, baseDir);
    results.push(result);
  }

  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('MATRIX SUMMARY');
  console.log('='.repeat(70));

  console.log('\n| Test | CASESSAI | codAutori | HTTP | Diagnosis | Cert |');
  console.log('|------|----------|-----------|------|-----------|------|');
  results.forEach((r) => {
    const certIcon = r.certificateReceived ? '✅' : '❌';
    console.log(`| ${r.id}   | ${r.casessai} | ${r.codAutoriLocation.padEnd(6)} | ${r.httpStatus} | ${r.diagnosis.padEnd(17)} | ${certIcon} |`);
  });

  // Check for any PASS
  const passed = results.find((r) => r.diagnosis === 'PASS');
  if (passed) {
    console.log(`\n✅ SUCCESS: Test ${passed.id} passed!`);
    console.log(`   CASESSAI: ${passed.casessai}`);
    console.log(`   codAutori: ${passed.codAutoriLocation}`);
    console.log(`   Output: ${passed.outputDir}`);
  } else {
    console.log(`\n❌ NO PASS: All tests failed`);

    // Analysis
    const dnMismatches = results.filter((r) => r.diagnosis === 'DN_MISMATCH_93');
    const structuralFails = results.filter((r) => r.diagnosis === 'STRUCTURAL_95_96');

    if (dnMismatches.length === 4) {
      console.log(`   ⚠️  All 4 tests show DN mismatch (93) → DN needs revision`);
    } else if (structuralFails.length > 0) {
      console.log(`   ❌ ${structuralFails.length} tests have structural errors (95/96)`);
      structuralFails.forEach((r) => {
        console.log(`      ${r.id}: ${r.errors[0]?.mess || 'Unknown'}`);
      });
    }
  }

  console.log(`\n📁 All artifacts: ${baseDir}\n`);

  // Create master report
  const masterReport = `# ESSAI Matrix Test - Master Report

**Timestamp**: ${timestamp}
**Tests**: 4 (2x2 matrix)

## Matrix Configuration

- **CASESSAI**: 000.000 vs 500.001
- **codAutori placement**: HEADER vs BODY
- **Fixed DN**: RBC-based (same for all tests)

## Results Table

| Test | CASESSAI | codAutori | HTTP | Diagnosis | Certificate | Errors |
|------|----------|-----------|------|-----------|-------------|--------|
${results.map((r) => `| ${r.id} | ${r.casessai} | ${r.codAutoriLocation} | ${r.httpStatus} | ${r.diagnosis} | ${r.certificateReceived ? 'YES ✅' : 'NO ❌'} | ${r.errors.length} |`).join('\n')}

## Analysis

${passed ? `### ✅ Success

Test **${passed.id}** passed with:
- CASESSAI: ${passed.casessai}
- codAutori: ${passed.codAutoriLocation}

This is the correct configuration for ESSAI enrolment.
` : `### ❌ No Success

${dnMismatches.length === 4 ? `All 4 tests show **DN mismatch (code 93)**.

**Conclusion**: The header/body configuration and CASESSAI values are not the issue. The DN values (O, CN) need to be revised to match ESSAI's expectations.

**Next Step**: Contact RQ for ESSAI-specific DN requirements.` : `Mixed results - structural errors detected.

${structuralFails.length > 0 ? `**Structural failures (95/96)**: ${structuralFails.map((r) => r.id).join(', ')}` : ''}
${dnMismatches.length > 0 ? `**DN mismatches (93)**: ${dnMismatches.map((r) => r.id).join(', ')}` : ''}
`}
`}

## Test Details

${results.map((r) => `### ${r.id}: ${r.casessai} / ${r.codAutoriLocation}

- HTTP: ${r.httpStatus}
- Diagnosis: ${r.diagnosis}
- Errors: ${r.errors.length}
- Output: \`${r.outputDir}\`

${r.errors.length > 0 ? `**Errors**:
${r.errors.slice(0, 3).map((e, i) => `${i + 1}. [${e.codRetour}] ${e.id}: ${e.mess}`).join('\n')}
` : ''}
`).join('\n')}

## Artifacts

Each test has:
- \`csr.pem\` - Generated CSR
- \`csr.txt\` - OpenSSL output
- \`sha256.txt\` - DER hash
- \`headers.json\` - Request headers
- \`request.json\` - Request body
- \`response.json\` - API response
- \`curl.sh\` - Reproducible command
- \`summary.md\` - Test summary

## Conclusion

${passed ? `The correct ESSAI enrolment configuration is:
- CASESSAI: ${passed.casessai}
- codAutori placement: ${passed.codAutoriLocation}
- DN: RBC-based (as tested)

Certificate successfully received.` : `No configuration succeeded. ${dnMismatches.length === 4 ? 'All tests show DN mismatch - DN values need revision.' : 'Mixed errors - further investigation needed.'}`}
`;

  fs.writeFileSync(path.join(baseDir, 'MASTER-REPORT.md'), masterReport, 'utf8');

  console.log(`📄 Master report: ${path.join(baseDir, 'MASTER-REPORT.md')}\n`);
}

main().catch((error) => {
  console.error('❌ Suite error:', error.message);
  process.exit(1);
});
