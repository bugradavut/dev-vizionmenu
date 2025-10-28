/**
 * ESSAI Enrolment - Final DN Match Scan (4 variants)
 *
 * Testing:
 * - 2 CODAUTORI values: D8T8-W8W8, W7V7-K8W9
 * - 2 CN values: 5678912340, 3601837200
 * - O matches CODAUTORI: RBC-{CODAUTORI}
 *
 * Fixed: CASESSAI=500.001, VERSIPARN=1.0.0, all other DN fields
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

// Base headers (CODAUTORI will vary)
const BASE_HEADERS = {
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

// Test variants (2 CODAUTORI × 2 CN = 4 variants)
const VARIANTS = [
  {
    id: 'A1',
    group: 'A',
    CODAUTORI: 'D8T8-W8W8',
    O: 'RBC-D8T8-W8W8',
    CN: '5678912340',
    description: 'CODAUTORI=D8T8-W8W8, O=RBC-D8T8-W8W8, CN=5678912340',
  },
  {
    id: 'A2',
    group: 'A',
    CODAUTORI: 'D8T8-W8W8',
    O: 'RBC-D8T8-W8W8',
    CN: '3601837200',
    description: 'CODAUTORI=D8T8-W8W8, O=RBC-D8T8-W8W8, CN=3601837200',
  },
  {
    id: 'B1',
    group: 'B',
    CODAUTORI: 'W7V7-K8W9',
    O: 'RBC-W7V7-K8W9',
    CN: '5678912340',
    description: 'CODAUTORI=W7V7-K8W9, O=RBC-W7V7-K8W9, CN=5678912340',
  },
  {
    id: 'B2',
    group: 'B',
    CODAUTORI: 'W7V7-K8W9',
    O: 'RBC-W7V7-K8W9',
    CN: '3601837200',
    description: 'CODAUTORI=W7V7-K8W9, O=RBC-W7V7-K8W9, CN=3601837200',
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

  // Build headers with variant's CODAUTORI
  const headers = {
    ...BASE_HEADERS,
    CODAUTORI: variant.CODAUTORI,
  };

  // Generate keypair
  console.log('🔐 Generating ECDSA P-256 keypair...');
  const cryptoKey = await generateKeyPair();

  // Build DN string
  const dnString = buildDnString(variant.O, variant.CN);
  console.log(`📝 DN: ${dnString}`);
  console.log(`   CODAUTORI (header): ${variant.CODAUTORI}`);

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
      console.log(`   [${e.codRetour || '?'}] ${e.id}: ${e.mess}`);
    });
  } else {
    console.log(`✅ No errors`);
  }

  // Determine diagnosis
  let diagnosis = 'UNKNOWN';
  if (httpStatus === 201 && certificateReceived) {
    diagnosis = 'PASS';
    console.log(`✅✅✅ PASS - Certificate received!`);
  } else if (errors.length === 0) {
    diagnosis = 'FAIL_NO_ERRORS';
    console.log(`❌ FAIL - No errors but no certificate`);
  } else {
    // Check error types
    const has93 = errors.some((e) => e.codRetour === '93');
    const has16 = errors.some((e) => e.codRetour === '16');
    const has95 = errors.some((e) => e.codRetour === '95');
    const has96 = errors.some((e) => e.codRetour === '96');
    const has94 = errors.some((e) => e.codRetour === '94');

    const nonDnErrors = errors.filter((e) => e.codRetour !== '93');

    if (nonDnErrors.length === 0 && has93) {
      diagnosis = 'ONLY_93';
      console.log(`⚠️  Format OK, value mismatch (only error 93)`);
    } else if (has16) {
      diagnosis = 'ERROR_16';
      console.log(`❌ Format error (16)`);
    } else if (has95 || has96) {
      diagnosis = 'ERROR_95_96';
      console.log(`❌ Structural error (95/96)`);
    } else if (has94) {
      diagnosis = 'ERROR_94';
      console.log(`❌ Test case error (94)`);
    } else {
      diagnosis = 'OTHER_ERROR';
      console.log(`❌ Other error`);
    }
  }

  // Create summary.md
  const summary = `# ESSAI DN Match - Variant ${variant.id}

**Config**: ${variant.description}
**Timestamp**: ${new Date().toISOString()}

## Configuration

### Headers

\`\`\`
CODAUTORI: ${variant.CODAUTORI}  ← IN HEADER
CASESSAI: 500.001
VERSIPARN: 1.0.0
ENVIRN: ESSAI
... (other fixed headers)
\`\`\`

### DN

\`\`\`
${dnString}
\`\`\`

**Variable Fields**:
- CODAUTORI: ${variant.CODAUTORI} (in header)
- O: ${variant.O} (matches CODAUTORI)
- CN: ${variant.CN}

**Fixed Fields**:
- C: CA, ST: QC, L: -05:00
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
- **Certificate Received**: ${certificateReceived ? 'YES ✅✅✅' : 'NO ❌'}
- **Errors**: ${errors.length}

${errors.length > 0 ? `### Errors

${errors.map((e, i) => `${i + 1}. **[${e.codRetour || '?'}] ${e.id}**
   ${e.mess}`).join('\n\n')}` : ''}

## Files

- \`csr.pem\`: CSR in PEM format (single-line base64)
- \`csr.txt\`: OpenSSL parsed output
- \`sha256.txt\`: SHA-256 hash of DER
- \`headers.json\`: Request headers (CODAUTORI in header!)
- \`request.json\`: Request body (NO codAutori in body!)
- \`response.json\`: API response
- \`curl.sh\`: Reproducible curl command
`;

  fs.writeFileSync(path.join(outputDir, 'summary.md'), summary, 'utf8');

  return {
    id: variant.id,
    group: variant.group,
    CODAUTORI: variant.CODAUTORI,
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
  const baseDir = path.join('tmp', 'logs', `essai-enrolment-DNmatch-${timestamp}`);
  fs.mkdirSync(baseDir, { recursive: true });

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  ESSAI Enrolment - Final DN Match (4 variants)               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`\n📁 Base output: ${baseDir}\n`);
  console.log(`🔒 Fixed: CASESSAI=500.001, VERSIPARN=1.0.0\n`);

  const results: any[] = [];

  // Run all 4 variants
  for (const variant of VARIANTS) {
    const result = await testVariant(variant, baseDir);
    results.push(result);
  }

  // Summary table
  console.log('\n' + '='.repeat(70));
  console.log('FINAL DN MATCH SUMMARY');
  console.log('='.repeat(70));

  console.log('\n| Variant | CODAUTORI | O | CN | HTTP | Diagnosis | Cert |');
  console.log('|---------|-----------|---|----|------|-----------|------|');
  results.forEach((r) => {
    const certIcon = r.certificateReceived ? '✅' : '❌';
    const cnShort = r.CN.length > 10 ? r.CN.substring(0, 8) + '..' : r.CN;
    console.log(`| ${r.id} | ${r.CODAUTORI} | ${r.O} | ${cnShort} | ${r.httpStatus} | ${r.diagnosis} | ${certIcon} |`);
  });

  // Check for any PASS
  const passed = results.find((r) => r.diagnosis === 'PASS');
  if (passed) {
    console.log(`\n✅✅✅ SUCCESS: Variant ${passed.id} PASSED! ✅✅✅`);
    console.log(`   🔒 ESSAI DN (final) - LOCKED:`);
    console.log(`   CODAUTORI: ${passed.CODAUTORI}`);
    console.log(`   O: ${passed.O}`);
    console.log(`   CN: ${passed.CN}`);
    console.log(`   Certificate saved to: ${passed.outputDir}`);
  } else {
    console.log(`\n❌ NO PASS: All variants failed`);

    // Find closest (only error 93)
    const only93 = results.filter((r) => r.diagnosis === 'ONLY_93');
    if (only93.length > 0) {
      console.log(`   ⭐ Closest variant(s) (format OK, only error 93):`);
      only93.forEach((r) => {
        console.log(`      ${r.id}: CODAUTORI=${r.CODAUTORI}, O=${r.O}, CN=${r.CN}`);
      });
    }

    // Check for other errors
    const hasFormatErrors = results.filter((r) => r.diagnosis === 'ERROR_16');
    const hasStructuralErrors = results.filter((r) => r.diagnosis === 'ERROR_95_96');

    if (hasFormatErrors.length > 0) {
      console.log(`   ❌ ${hasFormatErrors.length} variant(s) with format errors (16)`);
    }
    if (hasStructuralErrors.length > 0) {
      console.log(`   ❌ ${hasStructuralErrors.length} variant(s) with structural errors (95/96)`);
    }
  }

  console.log(`\n📁 All artifacts: ${baseDir}\n`);

  // Create MASTER-REPORT.md
  const masterReport = `# ESSAI DN Match - Master Report

**Timestamp**: ${timestamp}
**Tests**: 4 (2 CODAUTORI × 2 CN)

## Configuration Matrix

### Fixed Parameters

- **CASESSAI**: 500.001
- **VERSIPARN**: 1.0.0
- **ENVIRN**: ESSAI
- **CODAUTORI**: In HEADER (NOT in body)
- **DN Fixed Fields**:
  - C=CA, ST=QC, L=-05:00
  - surname (2.5.4.4)=Certificat du serveur
  - OU=5678912340TQ0001
  - GN (2.5.4.42)=ER0001

### Variable Parameters

**Group A** (CODAUTORI=D8T8-W8W8):
- A1: O=RBC-D8T8-W8W8, CN=5678912340
- A2: O=RBC-D8T8-W8W8, CN=3601837200

**Group B** (CODAUTORI=W7V7-K8W9):
- B1: O=RBC-W7V7-K8W9, CN=5678912340
- B2: O=RBC-W7V7-K8W9, CN=3601837200

## Results Table

| Variant | CODAUTORI | O | CN | HTTP | Diagnosis | Cert | Errors |
|---------|-----------|---|----|------|-----------|------|--------|
${results.map((r) => `| ${r.id} | ${r.CODAUTORI} | ${r.O} | ${r.CN} | ${r.httpStatus} | ${r.diagnosis} | ${r.certificateReceived ? 'YES ✅' : 'NO ❌'} | ${r.errors.length} |`).join('\n')}

## Error Details

${results.map((r) => `### ${r.id}: CODAUTORI=${r.CODAUTORI}, O=${r.O}, CN=${r.CN}

- HTTP: ${r.httpStatus}
- Diagnosis: ${r.diagnosis}
- Errors: ${r.errors.length}

${r.errors.length > 0 ? `**Errors**:
${r.errors.map((e, i) => `${i + 1}. [${e.codRetour || '?'}] ${e.id}
   ${e.mess}`).join('\n')}` : 'No errors'}

---
`).join('\n')}

## Analysis

${passed ? `### ✅✅✅ SUCCESS ✅✅✅

**Variant ${passed.id}** achieved HTTP 201 with certificate!

**ESSAI DN (final) - LOCKED**:
\`\`\`
CODAUTORI: ${passed.CODAUTORI} (in HEADER)
O: ${passed.O}
CN: ${passed.CN}
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

**Complete Configuration**:
\`\`\`yaml
Headers:
  CODAUTORI: ${passed.CODAUTORI}
  CASESSAI: 500.001
  VERSIPARN: 1.0.0
  ENVIRN: ESSAI
  IDSEV: 0000000000003973
  IDVERSI: 00000000000045D6
  CODCERTIF: FOB201999999
  IDPARTN: 0000000000001FF2
  VERSI: 0.1.0

Body:
  {
    "reqCertif": {
      "modif": "AJO",
      "csr": "<pem>"
    }
  }

DN:
  C=CA, ST=QC, L=-05:00,
  2.5.4.4=Certificat du serveur,
  O=${passed.O},
  OU=5678912340TQ0001,
  2.5.4.42=ER0001,
  CN=${passed.CN}
\`\`\`

This configuration is now **LOCKED** for all future ESSAI enrolment requests.` : `### ❌ NO SUCCESS

No variant achieved HTTP 201.

${only93.length > 0 ? `**⭐ Closest Variants** (format OK, only DN mismatch - error 93):
${only93.map((r) => `- **${r.id}**: CODAUTORI=${r.CODAUTORI}, O=${r.O}, CN=${r.CN}`).join('\n')}

These variants have correct structure and format. Only the specific values don't match ESSAI expectations.` : ''}

${hasFormatErrors.length > 0 ? `**Format Errors (16)**:
${hasFormatErrors.map((r) => `- ${r.id}: ${r.errors.find((e) => e.codRetour === '16')?.mess || 'Format error'}`).join('\n')}` : ''}

${hasStructuralErrors.length > 0 ? `**Structural Errors (95/96)**:
${hasStructuralErrors.map((r) => `- ${r.id}: ${r.errors.find((e) => ['95', '96'].includes(e.codRetour))?.mess || 'Structural error'}`).join('\n')}` : ''}
`}

## Artifacts

Each variant folder contains:
- \`csr.pem\` - Generated CSR
- \`csr.txt\` - OpenSSL output
- \`sha256.txt\` - DER hash
- \`headers.json\` - Request headers (CODAUTORI in header)
- \`request.json\` - Request body (NO codAutori in body)
- \`response.json\` - API response
- \`curl.sh\` - Reproducible command
- \`summary.md\` - Test summary

## Conclusion

${passed ? `✅ **ESSAI enrolment DN configuration IDENTIFIED and LOCKED.**

Use the configuration above for all future ESSAI enrolment requests.

**Certificate Details**:
- Output folder: \`${passed.outputDir}\`
- Certificate file: See \`response.json\` in output folder

**Next Steps**:
1. Extract certificate from response
2. Save to \`tmp/certs/essai-client.crt.pem\`
3. Save private key to \`tmp/certs/essai-client.key.pem\`
4. Proceed with mTLS tests (/utilisateur, /transaction, /document)` : `❌ **No working DN configuration found.**

${only93.length > 0 ? `However, ${only93.length} variant(s) show only DN mismatch (no format/structural errors), indicating the configuration is very close. Further investigation or RQ consultation needed for exact O/CN values.` : `Multiple error types detected. Review error details above for next steps.`}`}
`;

  fs.writeFileSync(path.join(baseDir, 'MASTER-REPORT.md'), masterReport, 'utf8');

  console.log(`📄 Master report: ${path.join(baseDir, 'MASTER-REPORT.md')}\n`);

  // If passed, highlight certificate extraction
  if (passed) {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  🎉 ESSAI ENROLMENT SUCCESSFUL! 🎉                           ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    console.log(`Next steps:`);
    console.log(`1. Extract certificate from: ${path.join(passed.outputDir, 'response.json')}`);
    console.log(`2. Save to: tmp/certs/essai-client.crt.pem`);
    console.log(`3. Save private key to: tmp/certs/essai-client.key.pem`);
    console.log(`4. Proceed with mTLS tests\n`);
  }
}

main().catch((error) => {
  console.error('❌ Suite error:', error.message);
  process.exit(1);
});
