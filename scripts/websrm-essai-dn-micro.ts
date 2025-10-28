/**
 * ESSAI Enrolment - DN Micro Scan (5 variants)
 *
 * Testing micro variations of O and CN:
 * - O separator variations: -, none, _, space
 * - CN single digit variation
 *
 * Fixed: CODAUTORI=D8T8-W8W8, CASESSAI=500.001, all other config
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

// Micro test variants
const VARIANTS = [
  {
    id: 'A1',
    O: 'RBC-D8T8-W8W8',
    CN: '5678912340',
    description: 'Control: O=RBC-D8T8-W8W8, CN=5678912340',
    note: 'Baseline (already tested, expect only 93)',
  },
  {
    id: 'A1a',
    O: 'RBC-D8T8W8W8',
    CN: '5678912340',
    description: 'O separator test: Remove middle dash',
    note: 'Test if middle separator is required',
  },
  {
    id: 'A1b',
    O: 'RBC-D8T8_W8W8',
    CN: '5678912340',
    description: 'O separator test: Underscore instead of dash',
    note: 'Test if underscore is accepted',
  },
  {
    id: 'A1c',
    O: 'RBC-D8T8 W8W8',
    CN: '5678912340',
    description: 'O separator test: Space instead of dash',
    note: 'Test if space is accepted',
  },
  {
    id: 'A1d',
    O: 'RBC-D8T8-W8W8',
    CN: '5678912341',
    description: 'CN variation: Last digit +1 (5678912341)',
    note: 'Test if exact match required or range check',
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
  console.log(`Note: ${variant.note}`);
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
    const has93 = errors.some((e) => e.codRetour === '93');
    const has16 = errors.some((e) => e.codRetour === '16');
    const has95 = errors.some((e) => e.codRetour === '95');
    const has96 = errors.some((e) => e.codRetour === '96');
    const has14 = errors.some((e) => e.codRetour === '14');

    const nonDnErrors = errors.filter((e) => e.codRetour !== '93');

    if (nonDnErrors.length === 0 && has93) {
      diagnosis = 'ONLY_93';
      console.log(`⚠️  Format OK, value mismatch (only error 93)`);
    } else if (has16) {
      diagnosis = 'ERROR_16';
      console.log(`❌ FORMAT ERROR (16) ⚠️`);
    } else if (has95 || has96) {
      diagnosis = 'ERROR_95_96';
      console.log(`❌ STRUCTURAL ERROR (95/96) ⚠️`);
    } else if (has14) {
      diagnosis = 'ERROR_14';
      console.log(`❌ Authorization mismatch (14)`);
    } else {
      diagnosis = 'OTHER_ERROR';
      console.log(`❌ Other error`);
    }
  }

  // Create summary.md
  const summary = `# ESSAI DN Micro Scan - Variant ${variant.id}

**Config**: ${variant.description}
**Note**: ${variant.note}
**Timestamp**: ${new Date().toISOString()}

## Configuration

### Headers (Fixed)

\`\`\`
CODAUTORI: D8T8-W8W8 (in HEADER)
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
- O: ${variant.O}
- CN: ${variant.CN}

**Fixed Fields**:
- C=CA, ST=QC, L=-05:00
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

${errors.length > 0 ? `### Errors (Full Text)

${errors.map((e, i) => `${i + 1}. **[${e.codRetour || '?'}] ${e.id}**
   ${e.mess}`).join('\n\n')}` : ''}

## Files

- \`csr.pem\`: CSR in PEM format (single-line base64)
- \`csr.txt\`: OpenSSL parsed output
- \`sha256.txt\`: SHA-256 hash of DER
- \`headers.json\`: Request headers
- \`request.json\`: Request body
- \`response.json\`: API response (full error messages)
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
    note: variant.note,
  };
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const baseDir = path.join('tmp', 'logs', `essai-enrolment-DNmicro-${timestamp}`);
  fs.mkdirSync(baseDir, { recursive: true });

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  ESSAI Enrolment - DN Micro Scan (5 variants)                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`\n📁 Base output: ${baseDir}\n`);
  console.log(`🔒 Fixed: CODAUTORI=D8T8-W8W8, CASESSAI=500.001\n`);

  const results: any[] = [];

  // Run all 5 variants
  for (const variant of VARIANTS) {
    const result = await testVariant(variant, baseDir);
    results.push(result);
  }

  // Summary table
  console.log('\n' + '='.repeat(70));
  console.log('DN MICRO SCAN SUMMARY');
  console.log('='.repeat(70));

  console.log('\n| Variant | O | CN | HTTP | Diagnosis | Cert |');
  console.log('|---------|---|----|------|-----------|------|');
  results.forEach((r) => {
    const certIcon = r.certificateReceived ? '✅' : '❌';
    console.log(`| ${r.id} | ${r.O} | ${r.CN} | ${r.httpStatus} | ${r.diagnosis} | ${certIcon} |`);
  });

  // Check for any PASS
  const passed = results.find((r) => r.diagnosis === 'PASS');
  if (passed) {
    console.log(`\n✅✅✅ SUCCESS: Variant ${passed.id} PASSED! ✅✅✅`);
    console.log(`   🔒 ESSAI DN (final) - LOCKED:`);
    console.log(`   O: ${passed.O}`);
    console.log(`   CN: ${passed.CN}`);
  } else {
    console.log(`\n❌ NO PASS: All variants failed`);

    // Check if all are only 93
    const only93 = results.filter((r) => r.diagnosis === 'ONLY_93');
    const hasFormatErrors = results.filter((r) => r.diagnosis === 'ERROR_16');
    const hasStructuralErrors = results.filter((r) => r.diagnosis === 'ERROR_95_96');

    if (only93.length === results.length) {
      console.log(`   ✅ ALL variants show ONLY error 93 (format pass, value mismatch)`);
      console.log(`   → Format is 100% correct for all tested variations`);
      console.log(`   → Value assignment requires RQ mapping/partner registry`);
    } else if (only93.length > 0) {
      console.log(`   ⭐ ${only93.length} variant(s) with ONLY error 93:`);
      only93.forEach((r) => {
        console.log(`      ${r.id}: O=${r.O}, CN=${r.CN}`);
      });
    }

    if (hasFormatErrors.length > 0) {
      console.log(`   ❌ ${hasFormatErrors.length} variant(s) with FORMAT ERRORS (16):`);
      hasFormatErrors.forEach((r) => {
        console.log(`      ${r.id}: O=${r.O}, CN=${r.CN}`);
      });
    }

    if (hasStructuralErrors.length > 0) {
      console.log(`   ❌ ${hasStructuralErrors.length} variant(s) with STRUCTURAL ERRORS (95/96):`);
      hasStructuralErrors.forEach((r) => {
        console.log(`      ${r.id}: O=${r.O}, CN=${r.CN}`);
      });
    }
  }

  console.log(`\n📁 All artifacts: ${baseDir}\n`);

  // Create MASTER-REPORT.md
  const masterReport = `# ESSAI DN Micro Scan - Master Report

**Timestamp**: ${timestamp}
**Tests**: 5 (O separator variations + CN variation)

## Test Variants

${VARIANTS.map((v) => `- **${v.id}**: ${v.description}
  - ${v.note}`).join('\n')}

## Results Table

| Variant | O | CN | HTTP | Diagnosis | Cert | Errors |
|---------|---|----|------|-----------|------|--------|
${results.map((r) => `| ${r.id} | ${r.O} | ${r.CN} | ${r.httpStatus} | ${r.diagnosis} | ${r.certificateReceived ? 'YES ✅' : 'NO ❌'} | ${r.errors.length} |`).join('\n')}

## Error Details (Full Text)

${results.map((r) => `### ${r.id}: O=${r.O}, CN=${r.CN}

- HTTP: ${r.httpStatus}
- Diagnosis: ${r.diagnosis}
- Note: ${r.note}

${r.errors.length > 0 ? `**Errors (Complete Messages)**:
\`\`\`
${r.errors.map((e, i) => `${i + 1}. [${e.codRetour || '?'}] ${e.id}
   ${e.mess}`).join('\n\n')}
\`\`\`` : '✅ No errors'}

---
`).join('\n')}

## Analysis

${passed ? `### ✅✅✅ SUCCESS ✅✅✅

**Variant ${passed.id}** achieved HTTP 201 with certificate!

**ESSAI DN (final) - LOCKED**:
\`\`\`
O: ${passed.O}
CN: ${passed.CN}
\`\`\`

**Complete Configuration**:
\`\`\`yaml
Headers:
  CODAUTORI: D8T8-W8W8
  CASESSAI: 500.001
  VERSIPARN: 1.0.0
  ENVIRN: ESSAI
  ... (other fixed)

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

**Next Steps**:
1. Extract certificate from \`${passed.outputDir}/response.json\`
2. Save to \`tmp/certs/essai-client.crt.pem\`
3. Save private key to \`tmp/certs/essai-client.key.pem\`
4. Proceed with mTLS tests
` : `### ❌ NO SUCCESS

No variant achieved HTTP 201.

${only93.length === results.length ? `#### ✅ ALL Variants: Format Pass, Value Mismatch

**Finding**: ALL ${results.length} variants show **ONLY error 93** (DN value mismatch).

**This confirms**:
- ✅ Format is 100% correct for all tested O/CN variations
- ✅ Separator variations (-, none, _, space) all pass format validation
- ✅ CN single digit variation passes format validation
- ❌ Specific O/CN values don't match ESSAI's expected values

**Conclusion**:
- Format validation: **COMPLETE** ✅
- Value assignment: **Requires RQ mapping/partner registry**

**Next Action**: Contact RQ or check internal partner registry for:
- Assigned Organization (O) value for CASESSAI=500.001
- Assigned Common Name (CN) value (10 digits, matches TVQ pattern)

**Separator Rules** (all pass format validation):
- Dash: \`RBC-D8T8-W8W8\` → Only error 93 ✅
- No separator: \`RBC-D8T8W8W8\` → Check result
- Underscore: \`RBC-D8T8_W8W8\` → Check result
- Space: \`RBC-D8T8 W8W8\` → Check result

**CN Validation** (exact match vs range):
- CN=5678912340 → Only error 93 ✅
- CN=5678912341 (+1 digit) → Check if same error or different

` : `#### Mixed Results

${only93.length > 0 ? `**Format Pass (only error 93)**: ${only93.length} variant(s)
${only93.map((r) => `- ${r.id}: O=${r.O}, CN=${r.CN}`).join('\n')}
` : ''}

${hasFormatErrors.length > 0 ? `**⚠️ FORMAT ERRORS (16)**: ${hasFormatErrors.length} variant(s)
${hasFormatErrors.map((r) => `- ${r.id}: O=${r.O}, CN=${r.CN}
  ${r.errors.find((e) => e.codRetour === '16')?.mess || ''}`).join('\n')}
` : ''}

${hasStructuralErrors.length > 0 ? `**⚠️ STRUCTURAL ERRORS (95/96)**: ${hasStructuralErrors.length} variant(s)
${hasStructuralErrors.map((r) => `- ${r.id}: O=${r.O}, CN=${r.CN}
  ${r.errors.find((e) => ['95', '96'].includes(e.codRetour))?.mess || ''}`).join('\n')}
` : ''}
`}`}

## Artifacts

Each variant folder contains:
- \`csr.pem\` - Generated CSR
- \`csr.txt\` - OpenSSL output
- \`sha256.txt\` - DER hash
- \`headers.json\` - Request headers
- \`request.json\` - Request body
- \`response.json\` - API response (FULL error messages)
- \`curl.sh\` - Reproducible command
- \`summary.md\` - Test summary

## Conclusion

${passed ? `✅ **ESSAI enrolment DN configuration IDENTIFIED and LOCKED.**

Use configuration above for all future ESSAI enrolment requests.` : `${only93.length === results.length ? `✅ **Format validation COMPLETE**. All tested variations pass format checks.

❌ **Value assignment pending**. Exact O/CN values require RQ/partner registry consultation.

**Status**: Configuration is 100% correct structurally. Only value mapping remains.` : `❌ Mixed results. Some variations have format/structural errors while others pass.

Review error details above to identify which separator/CN patterns are acceptable.`}`}
`;

  fs.writeFileSync(path.join(baseDir, 'MASTER-REPORT.md'), masterReport, 'utf8');

  console.log(`📄 Master report: ${path.join(baseDir, 'MASTER-REPORT.md')}\n`);

  if (passed) {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  🎉 ESSAI ENROLMENT SUCCESSFUL! 🎉                           ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
  }
}

main().catch((error) => {
  console.error('❌ Suite error:', error.message);
  process.exit(1);
});
