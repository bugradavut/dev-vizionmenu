/**
 * ESSAI Enrolment - DN Scan (2x2 matrix)
 *
 * Fixed:
 * - CASESSAI: 500.001
 * - CODAUTORI: D8T8-W8W8 (in HEADER)
 * - VERSIPARN: 1.0.0
 * - DN fields: C, ST, L, surname, OU, GN (fixed)
 *
 * Variables (2x2):
 * - O: RBC vs RBC-D8T8-W8W8
 * - CN: 5678912340 vs 5678912340TQ0001
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

// Fixed headers
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
  CODAUTORI: 'D8T8-W8W8', // IN HEADER
};

// Fixed DN fields
const DN_FIXED = {
  C: 'CA',
  ST: 'QC',
  L: '-05:00',
  surname: 'Certificat du serveur', // 2.5.4.4
  OU: '5678912340TQ0001',
  GN: 'ER0001', // 2.5.4.42 givenName
};

// DN variants (2x2 matrix)
const DN_VARIANTS = [
  {
    id: 'V1',
    O: 'RBC',
    CN: '5678912340',
    description: 'O=RBC, CN=5678912340',
  },
  {
    id: 'V2',
    O: 'RBC',
    CN: '5678912340TQ0001',
    description: 'O=RBC, CN=5678912340TQ0001',
  },
  {
    id: 'V3',
    O: 'RBC-D8T8-W8W8',
    CN: '5678912340',
    description: 'O=RBC-D8T8-W8W8, CN=5678912340',
  },
  {
    id: 'V4',
    O: 'RBC-D8T8-W8W8',
    CN: '5678912340TQ0001',
    description: 'O=RBC-D8T8-W8W8, CN=5678912340TQ0001',
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

function buildDnString(O: string, CN: string): string {
  // Order: C, ST, L, 2.5.4.4 (surname), O, OU, 2.5.4.42 (GN), CN
  return `C=${DN_FIXED.C}, ST=${DN_FIXED.ST}, L=${DN_FIXED.L}, 2.5.4.4=${DN_FIXED.surname}, O=${O}, OU=${DN_FIXED.OU}, 2.5.4.42=${DN_FIXED.GN}, CN=${CN}`;
}

async function generateCSR(cryptoKey: CryptoKeyPair, dnString: string) {
  const csr = await x509.Pkcs10CertificateRequestGenerator.create({
    name: dnString,
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

async function testVariant(variant: any, baseDir: string) {
  const outputDir = path.join(baseDir, variant.id);
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\n${'='.repeat(70)}`);
  console.log(`VARIANT ${variant.id}: ${variant.description}`);
  console.log('='.repeat(70));

  // Generate keypair
  console.log('🔐 Generating ECDSA P-256 keypair...');
  const cryptoKey = await generateKeyPair();

  // Build DN string
  const dnString = buildDnString(variant.O, variant.CN);
  console.log(`📝 DN: ${dnString}`);

  // Generate CSR
  const { csrPem, derBuffer } = await generateCSR(cryptoKey, dnString);
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

  // Request body (NO codAutori!)
  const requestBody = {
    reqCertif: {
      modif: 'AJO',
      csr: csrPem,
    },
  };

  // Save artifacts
  fs.writeFileSync(path.join(outputDir, 'headers.json'), JSON.stringify(HEADERS, null, 2), 'utf8');
  fs.writeFileSync(path.join(outputDir, 'request.json'), JSON.stringify(requestBody, null, 2), 'utf8');

  // Generate curl command
  const curlHeaders = Object.entries(HEADERS)
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(' \\\n  ');

  const curlCommand = `curl -X POST "${ENDPOINT}" \\\n  ${curlHeaders} \\\n  -d @request.json`;
  fs.writeFileSync(path.join(outputDir, 'curl.sh'), curlCommand, 'utf8');

  // Make API call
  console.log(`🌐 Calling ${ENDPOINT}...`);
  let httpStatus = 0;
  let response: any = {};

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: HEADERS,
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
  let casEssai = '';

  if (response.retourCertif) {
    casEssai = response.retourCertif.casEssai || '';
    if (response.retourCertif.listErr && response.retourCertif.listErr.length > 0) {
      errors.push(...response.retourCertif.listErr);
    }
    if (response.retourCertif.certif) {
      certificateReceived = true;
    }
  }

  // Console summary
  console.log(`📥 HTTP ${httpStatus}`);
  console.log(`   casEssai: ${casEssai}`);
  if (errors.length > 0) {
    console.log(`❌ Errors (${errors.length}):`);
    errors.forEach((e) => {
      console.log(`   [${e.codRetour}] ${e.id}: ${e.mess}`);
    });
  }

  // Determine status
  let diagnosis = 'UNKNOWN';
  if (httpStatus === 201 && certificateReceived) {
    diagnosis = 'PASS';
    console.log(`✅ PASS - Certificate received!`);
  } else if (errors.length === 0) {
    diagnosis = 'FAIL_NO_ERRORS';
    console.log(`❌ FAIL - No errors but no certificate`);
  } else {
    // Check error types
    const has93 = errors.some((e) => e.codRetour === '93');
    const has94 = errors.some((e) => e.codRetour === '94');
    const has95 = errors.some((e) => e.codRetour === '95');
    const has96 = errors.some((e) => e.codRetour === '96');
    const has16 = errors.some((e) => e.codRetour === '16');

    const nonDnErrors = errors.filter((e) => e.codRetour !== '93');

    if (nonDnErrors.length === 0) {
      diagnosis = 'ONLY_DN_MISMATCH_93';
      console.log(`⚠️  ONLY DN MISMATCH (93) - Close!`);
    } else if (has94 || has95 || has96) {
      diagnosis = 'STRUCTURAL_ERROR';
      console.log(`❌ STRUCTURAL ERROR (94/95/96)`);
    } else if (has16) {
      diagnosis = 'INVALID_FORMAT_16';
      console.log(`❌ INVALID FORMAT (16)`);
    } else {
      diagnosis = 'OTHER_ERROR';
      console.log(`❌ OTHER ERROR`);
    }
  }

  // Create summary.md
  const summary = `# ESSAI DN Scan - Variant ${variant.id}

**Config**: ${variant.description}
**Timestamp**: ${new Date().toISOString()}

## Configuration

### Headers (Fixed)

\`\`\`
CASESSAI: 500.001
CODAUTORI: D8T8-W8W8 (in HEADER)
VERSIPARN: 1.0.0
ENVIRN: ESSAI
... (other headers)
\`\`\`

### DN

\`\`\`
${dnString}
\`\`\`

**Variable Fields**:
- O: ${variant.O}
- CN: ${variant.CN}

**Fixed Fields**:
- C: CA
- ST: QC
- L: -05:00
- surname (2.5.4.4): Certificat du serveur
- OU: 5678912340TQ0001
- GN (2.5.4.42): ER0001

### Request Body

\`\`\`json
${JSON.stringify(requestBody, null, 2)}
\`\`\`

## Results

- **HTTP Status**: ${httpStatus}
- **Diagnosis**: ${diagnosis}
- **casEssai**: ${casEssai}
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
    id: variant.id,
    O: variant.O,
    CN: variant.CN,
    httpStatus,
    casEssai,
    diagnosis,
    certificateReceived,
    errors,
    outputDir,
  };
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const baseDir = path.join('tmp', 'logs', `essai-enrolment-DNscan-${timestamp}`);
  fs.mkdirSync(baseDir, { recursive: true });

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  ESSAI Enrolment - DN Scan (2x2 Matrix)                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`\n📁 Base output: ${baseDir}\n`);
  console.log(`🔒 Fixed config: CASESSAI=500.001, CODAUTORI in HEADER\n`);

  const results: any[] = [];

  // Run all 4 variants
  for (const variant of DN_VARIANTS) {
    const result = await testVariant(variant, baseDir);
    results.push(result);
  }

  // Summary table
  console.log('\n' + '='.repeat(70));
  console.log('DN SCAN SUMMARY');
  console.log('='.repeat(70));

  console.log('\n| Variant | O | CN | HTTP | Diagnosis | Cert |');
  console.log('|---------|---|----|----- |-----------|------|');
  results.forEach((r) => {
    const certIcon = r.certificateReceived ? '✅' : '❌';
    const oShort = r.O.length > 15 ? r.O.substring(0, 12) + '...' : r.O;
    const cnShort = r.CN.length > 15 ? r.CN.substring(0, 12) + '...' : r.CN;
    console.log(`| ${r.id} | ${oShort} | ${cnShort} | ${r.httpStatus} | ${r.diagnosis} | ${certIcon} |`);
  });

  // Check for any PASS
  const passed = results.find((r) => r.diagnosis === 'PASS');
  if (passed) {
    console.log(`\n✅ SUCCESS: Variant ${passed.id} passed!`);
    console.log(`   O: ${passed.O}`);
    console.log(`   CN: ${passed.CN}`);
    console.log(`   🔒 LOCKED as "ESSAI DN (enrolment)"`);
  } else {
    console.log(`\n❌ NO PASS: All variants failed`);

    // Analysis
    const onlyDnMismatch = results.filter((r) => r.diagnosis === 'ONLY_DN_MISMATCH_93');
    const structuralErrors = results.filter((r) => r.diagnosis === 'STRUCTURAL_ERROR');

    if (onlyDnMismatch.length > 0) {
      console.log(`   ⚠️  ${onlyDnMismatch.length} variant(s) with ONLY DN mismatch (93):`);
      onlyDnMismatch.forEach((r) => {
        console.log(`      ${r.id}: O=${r.O}, CN=${r.CN}`);
      });
    }

    if (structuralErrors.length > 0) {
      console.log(`   ❌ ${structuralErrors.length} variant(s) with structural errors (94/95/96):`);
      structuralErrors.forEach((r) => {
        console.log(`      ${r.id}: ${r.errors[0]?.mess || 'Unknown'}`);
      });
    }
  }

  console.log(`\n📁 All artifacts: ${baseDir}\n`);

  // Create MASTER-REPORT.md
  const masterReport = `# ESSAI DN Scan - Master Report

**Timestamp**: ${timestamp}
**Tests**: 4 (2×2 DN matrix)

## Configuration Matrix

### Fixed Parameters

- **CASESSAI**: 500.001
- **VERSIPARN**: 1.0.0
- **CODAUTORI**: D8T8-W8W8 (in HEADER, NOT in body)
- **ENVIRN**: ESSAI
- **DN Fixed Fields**:
  - C=CA
  - ST=QC
  - L=-05:00
  - surname (2.5.4.4)=Certificat du serveur
  - OU=5678912340TQ0001
  - GN (2.5.4.42)=ER0001

### Variable Parameters (2×2)

- **O**: RBC vs RBC-D8T8-W8W8
- **CN**: 5678912340 vs 5678912340TQ0001

## Results Table

| Variant | O | CN | HTTP | casEssai | Diagnosis | Cert | Errors |
|---------|---|----|----- |----------|-----------|------|--------|
${results.map((r) => `| ${r.id} | ${r.O} | ${r.CN} | ${r.httpStatus} | ${r.casEssai} | ${r.diagnosis} | ${r.certificateReceived ? 'YES ✅' : 'NO ❌'} | ${r.errors.length} |`).join('\n')}

## Error Details

${results.map((r) => `### ${r.id}: O=${r.O}, CN=${r.CN}

- HTTP: ${r.httpStatus}
- Diagnosis: ${r.diagnosis}
- Errors: ${r.errors.length}

${r.errors.length > 0 ? `**Errors**:
${r.errors.map((e, i) => `${i + 1}. [${e.codRetour}] ${e.id}
   ${e.mess}`).join('\n')}` : 'No errors'}

---
`).join('\n')}

## Analysis

${passed ? `### ✅ SUCCESS

**Variant ${passed.id}** achieved HTTP 201 with certificate!

**ESSAI DN (enrolment) - LOCKED**:
\`\`\`
O=${passed.O}
CN=${passed.CN}
\`\`\`

**Full DN**:
\`\`\`
C=CA, ST=QC, L=-05:00,
2.5.4.4=Certificat du serveur,
O=${passed.O},
OU=5678912340TQ0001,
2.5.4.42=ER0001,
CN=${passed.CN}
\`\`\`

This configuration is now confirmed for ESSAI enrolment.` : `### ❌ NO SUCCESS

No variant achieved HTTP 201.

${onlyDnMismatch.length > 0 ? `**Close Variants** (only DN mismatch, no structural errors):
${onlyDnMismatch.map((r) => `- ${r.id}: O=${r.O}, CN=${r.CN}`).join('\n')}

These variants have correct structure but DN values still don't match ESSAI expectations.` : ''}

${structuralErrors.length > 0 ? `**Structural Errors** (94/95/96 detected):
${structuralErrors.map((r) => `- ${r.id}: ${r.errors.find((e) => ['94', '95', '96'].includes(e.codRetour))?.mess || 'Unknown'}`).join('\n')}

These indicate configuration issues beyond just DN values.` : ''}

${onlyDnMismatch.length === 0 && structuralErrors.length === 0 ? `All variants failed with mixed or unknown errors. Manual review required.` : ''}
`}

## Artifacts

Each variant folder contains:
- \`csr.pem\` - Generated CSR
- \`csr.txt\` - OpenSSL output
- \`sha256.txt\` - DER hash
- \`headers.json\` - Request headers
- \`request.json\` - Request body
- \`response.json\` - API response
- \`curl.sh\` - Reproducible command
- \`summary.md\` - Test summary

## Conclusion

${passed ? `✅ **ESSAI enrolment DN configuration identified and locked.**

Use O=${passed.O}, CN=${passed.CN} for all future ESSAI enrolment requests.` : `❌ **No working DN configuration found in this 2×2 scan.**

${onlyDnMismatch.length > 0 ? `However, ${onlyDnMismatch.length} variant(s) show only DN mismatch (no structural errors), indicating we're close. Further DN value exploration or RQ consultation needed.` : `Structural errors or other issues detected. Review error details above.`}`}
`;

  fs.writeFileSync(path.join(baseDir, 'MASTER-REPORT.md'), masterReport, 'utf8');

  console.log(`📄 Master report: ${path.join(baseDir, 'MASTER-REPORT.md')}\n`);
}

main().catch((error) => {
  console.error('❌ Suite error:', error.message);
  process.exit(1);
});
