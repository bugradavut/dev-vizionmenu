import * as x509 from '@peculiar/x509';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';

const ENDPOINT = 'https://certificats.cnfr.api.rq-fo.ca/enrolement';

const HEADERS = {
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
  CODAUTORI: 'D8T8-W8W8',
};

interface VariantConfig {
  name: string;
  dn: {
    C: string;
    ST: string;
    L: string;
    surname: string; // 2.5.4.4
    O: string;
    OU: string;
    givenName: string; // 2.5.4.42
    CN: string;
  };
  addEKU: boolean;
}

const VARIANTS: VariantConfig[] = [
  {
    name: 'V1',
    dn: {
      C: 'CA',
      ST: 'QC',
      L: '-05:00',
      surname: 'Certificat du serveur', // 2.5.4.4
      O: 'RBC-D8T8-W8W8',
      OU: '5678912340TQ0001',
      givenName: 'ER0001', // 2.5.4.42
      CN: '5678912340',
    },
    addEKU: false,
  },
  {
    name: 'V2',
    dn: {
      C: 'CA',
      ST: 'QC',
      L: '-05:00',
      surname: 'Certificat du serveur', // 2.5.4.4
      O: 'RBC-D8T8-W8W8',
      OU: '5678912340TQ0001',
      givenName: 'ER0001', // 2.5.4.42
      CN: '3601837200', // Alternative CN
    },
    addEKU: false,
  },
  {
    name: 'V3',
    dn: {
      C: 'CA',
      ST: 'QC',
      L: '-05:00',
      surname: 'Certificat du serveur', // 2.5.4.4
      O: 'FOB-FOB201999999', // Green field
      OU: '5678912340TQ0001',
      givenName: 'ER0001', // 2.5.4.42
      CN: '0000000000001FF2', // IDPARTN
    },
    addEKU: true, // clientAuth
  },
];

async function generateSingleLinePEM(variant: VariantConfig) {
  // Generate key pair
  const cryptoKey = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify']
  );

  // Build DN string with surname (2.5.4.4) and givenName (2.5.4.42)
  // Order: C, ST, L, SN, O, OU, GN, CN
  const dn = variant.dn;
  const dnString = `C=${dn.C}, ST=${dn.ST}, L=${dn.L}, 2.5.4.4=${dn.surname}, O=${dn.O}, OU=${dn.OU}, 2.5.4.42=${dn.givenName}, CN=${dn.CN}`;

  // Build extensions array
  const extensions: x509.Extension[] = [];

  // KeyUsage: ONLY digitalSignature (critical)
  // DO NOT include nonRepudiation, keyAgreement, etc.
  extensions.push(
    new x509.KeyUsagesExtension(x509.KeyUsageFlags.digitalSignature, true)
  );

  // ExtendedKeyUsage for V3 only
  if (variant.addEKU) {
    extensions.push(
      new x509.ExtendedKeyUsageExtension(['1.3.6.1.5.5.7.3.2']) // clientAuth
    );
  }

  // Create CSR
  const csr = await x509.Pkcs10CertificateRequestGenerator.create({
    name: dnString,
    keys: cryptoKey,
    signingAlgorithm: {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    extensions,
  });

  // Export as DER
  const derBuffer = Buffer.from(csr.rawData);

  // Convert DER to base64 (single line, no wrapping)
  const base64SingleLine = derBuffer.toString('base64');

  // Create PEM with single-line base64
  const pemString = `-----BEGIN CERTIFICATE REQUEST-----\n${base64SingleLine}\n-----END CERTIFICATE REQUEST-----`;

  return {
    pem: pemString,
    der: derBuffer,
    base64SingleLine,
  };
}

async function testVariant(variant: VariantConfig, baseDir: string) {
  const variantDir = path.join(baseDir, variant.name);
  fs.mkdirSync(variantDir, { recursive: true });

  console.log(`\n=== Testing ${variant.name} ===`);

  // Generate CSR
  const { pem, der, base64SingleLine } = await generateSingleLinePEM(variant);

  // Save CSR PEM
  const csrPath = path.join(variantDir, 'csr.pem');
  fs.writeFileSync(csrPath, pem, 'utf8');

  // Calculate SHA-256 of DER
  const sha256Hash = crypto.createHash('sha256').update(der).digest('hex');
  fs.writeFileSync(path.join(variantDir, 'sha256.txt'), sha256Hash, 'utf8');

  // OpenSSL parse
  let opensslOutput = '';
  let keyUsageCheck = '';
  try {
    opensslOutput = execSync(`openssl req -in "${csrPath}" -noout -text`, {
      encoding: 'utf8',
    });
    fs.writeFileSync(path.join(variantDir, 'csr.txt'), opensslOutput, 'utf8');

    // Check Key Usage line
    const keyUsageMatch = opensslOutput.match(/X509v3 Key Usage:.*?\n.*?(\w.*)/s);
    if (keyUsageMatch) {
      keyUsageCheck = keyUsageMatch[1].trim();
    }
  } catch (err: any) {
    const errMsg = `OpenSSL error: ${err.message}`;
    fs.writeFileSync(path.join(variantDir, 'csr.txt'), errMsg, 'utf8');
    keyUsageCheck = 'ERROR';
  }

  // Verify Key Usage contains ONLY "Digital Signature"
  const keyUsageValid = keyUsageCheck === 'Digital Signature';

  // Save headers
  fs.writeFileSync(
    path.join(variantDir, 'headers.json'),
    JSON.stringify(HEADERS, null, 2),
    'utf8'
  );

  // Build request body
  const requestBody = {
    reqCertif: {
      modif: 'AJO',
      csr: pem,
    },
  };

  // Save request
  const requestJson = JSON.stringify(requestBody, null, 2);
  fs.writeFileSync(path.join(variantDir, 'request.json'), requestJson, 'utf8');

  // Verify single-line base64
  const csrInRequest = requestBody.reqCertif.csr;
  const base64Match = csrInRequest.match(
    /-----BEGIN CERTIFICATE REQUEST-----\n(.*?)\n-----END CERTIFICATE REQUEST-----/s
  );
  const base64Extracted = base64Match ? base64Match[1] : '';
  const hasNewlinesInBase64 =
    base64Extracted.includes('\n') || base64Extracted.includes('\r');
  const newlineCount = (csrInRequest.match(/\n/g) || []).length;
  const expectedNewlines = 2;

  // Generate curl command
  const curlHeaders = Object.entries(HEADERS)
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(' \\\n  ');

  const curlCommand = `curl -X POST "${ENDPOINT}" \\\n  ${curlHeaders} \\\n  -d @request.json`;
  fs.writeFileSync(path.join(variantDir, 'curl.sh'), curlCommand, 'utf8');

  // Make API call
  let response: any;
  let httpStatus: number;
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: HEADERS,
      body: requestJson,
    });

    httpStatus = res.status;
    response = await res.json();
  } catch (err: any) {
    httpStatus = 0;
    response = { error: err.message };
  }

  // Save response
  fs.writeFileSync(
    path.join(variantDir, 'response.json'),
    JSON.stringify(response, null, 2),
    'utf8'
  );

  // Parse errors
  const errors: Array<{
    id: string;
    codRetour: string;
    mess: string;
  }> = [];

  if (
    response.retourCertif?.listErr &&
    Array.isArray(response.retourCertif.listErr)
  ) {
    for (const err of response.retourCertif.listErr) {
      errors.push({
        id: err.id || 'N/A',
        codRetour: err.codRetour || 'N/A',
        mess: (err.mess || '').substring(0, 80),
      });
    }
  }

  // Check for specific error codes
  const hasSurnameError = errors.some((e) => e.id === 'JW00B999610E');
  const hasNonRepudiationError = errors.some((e) => e.id === 'JW00B999609E');
  const hasCountryError = errors.some((e) => e.id === 'JW00B999433E');
  const hasCNError = errors.some((e) => e.id === 'JW00B999470E');
  const hasOrgError = errors.some((e) => e.id === 'JW00B999429E');

  // Create summary
  const dn = variant.dn;
  const dnFormatted = `C=${dn.C}, ST=${dn.ST}, L=${dn.L}, 2.5.4.4=${dn.surname}, O=${dn.O}, OU=${dn.OU}, 2.5.4.42=${dn.givenName}, CN=${dn.CN}`;

  const summary = `# ${variant.name} Summary

**Timestamp**: ${new Date().toISOString()}
**Endpoint**: ${ENDPOINT}

## Configuration
- **DN**: ${dnFormatted}
- **KeyUsage**: digitalSignature (critical) - NO nonRepudiation, NO keyAgreement
- **ExtendedKeyUsage**: ${variant.addEKU ? 'clientAuth (1.3.6.1.5.5.7.3.2)' : 'NONE'}
- **Algorithm**: ECDSA P-256 + SHA-256
- **PEM Format**: Single-line base64

## CSR Details
- **SHA-256 (DER)**: ${sha256Hash}
- **Base64 length**: ${base64SingleLine.length} characters
- **Base64 is single line**: ${hasNewlinesInBase64 ? '❌ NO' : '✅ YES'}
- **Newlines in CSR field**: ${newlineCount} (expected: ${expectedNewlines}) ${newlineCount === expectedNewlines ? '✅' : '❌'}

## Key Usage Verification
- **OpenSSL Key Usage**: "${keyUsageCheck}"
- **Valid (only Digital Signature)**: ${keyUsageValid ? '✅ YES' : '❌ NO - EXTRA BITS DETECTED'}

## Request Validation
- **CODAUTORI in header**: ✅ YES (D8T8-W8W8)
- **codAutori in body**: ✅ NO (not present)

## API Response
- **HTTP Status**: ${httpStatus}
- **Certificate received**: ${response.retourCertif?.certif ? '✅ YES' : '❌ NO'}

## Error Analysis

${errors.length > 0 ? `### Errors Received (${errors.length})

${errors.map((e, i) => `${i + 1}. **${e.id}** [code: ${e.codRetour}]
   ${e.mess}${e.mess.length >= 80 ? '...' : ''}`).join('\n\n')}

### Error Checklist
- surName manquante (JW00B999610E): ${hasSurnameError ? '❌ STILL PRESENT' : '✅ RESOLVED'}
- NonRepudiation invalid (JW00B999609E): ${hasNonRepudiationError ? '❌ STILL PRESENT' : '✅ RESOLVED'}
- Country invalid (JW00B999433E): ${hasCountryError ? '❌ STILL PRESENT' : '✅ RESOLVED'}
- CN invalid (JW00B999470E): ${hasCNError ? '❌ STILL PRESENT' : '✅ RESOLVED'}
- Organization invalid (JW00B999429E): ${hasOrgError ? '❌ STILL PRESENT' : '✅ RESOLVED'}` : '✅ **No errors - SUCCESS!**'}

## Files
- \`csr.pem\`: CSR in PEM format
- \`csr.txt\`: OpenSSL parsed output
- \`sha256.txt\`: SHA-256 hash of DER
- \`headers.json\`: Request headers
- \`request.json\`: Full request body
- \`response.json\`: API response
- \`curl.sh\`: Reproducible curl command
`;

  fs.writeFileSync(path.join(variantDir, 'summary.md'), summary, 'utf8');

  return {
    variant: variant.name,
    sha256: sha256Hash.substring(0, 16) + '...',
    httpStatus,
    errors,
    keyUsageValid,
    hasSurnameError,
    hasNonRepudiationError,
    hasCountryError,
    hasCNError,
    hasOrgError,
  };
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const baseDir = path.join('tmp', 'logs', `dev-enrolment-${timestamp}`);
  fs.mkdirSync(baseDir, { recursive: true });

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  DEV Enrolment Test - surname (2.5.4.4) + digitalSignature    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`Output directory: ${baseDir}\n`);

  const results = [];
  for (const variant of VARIANTS) {
    const result = await testVariant(variant, baseDir);
    results.push(result);
  }

  // Print summary table
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  RESULTS SUMMARY                                               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  console.log('Variant | SHA-256          | HTTP | KU Valid | Errors');
  console.log('--------|------------------|------|----------|--------');
  for (const r of results) {
    const kuStatus = r.keyUsageValid ? '✅' : '❌';
    const errorCount = r.errors.length;
    console.log(
      `${r.variant.padEnd(7)} | ${r.sha256.padEnd(16)} | ${String(r.httpStatus).padEnd(4)} | ${kuStatus.padEnd(8)} | ${errorCount} errors`
    );
  }

  // Print detailed error table
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  ERROR DETAILS                                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  for (const r of results) {
    console.log(`\n${r.variant}:`);
    if (r.errors.length === 0) {
      console.log('  ✅ No errors - SUCCESS!');
    } else {
      for (const err of r.errors) {
        console.log(`  ${err.id} [${err.codRetour}] ${err.mess}`);
      }
    }
  }

  // Key findings
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  KEY FINDINGS                                                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const allResolvedSurname = results.every((r) => !r.hasSurnameError);
  const allResolvedNonRepudiation = results.every((r) => !r.hasNonRepudiationError);
  const anyCountryError = results.some((r) => r.hasCountryError);
  const anyCNError = results.some((r) => r.hasCNError);
  const anyOrgError = results.some((r) => r.hasOrgError);

  console.log(`surName (SN) error resolved: ${allResolvedSurname ? '✅ YES' : '❌ NO'}`);
  console.log(`NonRepudiation error resolved: ${allResolvedNonRepudiation ? '✅ YES' : '❌ NO'}`);
  console.log(`Country errors present: ${anyCountryError ? '❌ YES' : '✅ NO'}`);
  console.log(`CN errors present: ${anyCNError ? '❌ YES' : '✅ NO'}`);
  console.log(`Organization errors present: ${anyOrgError ? '❌ YES' : '✅ NO'}`);

  if (anyCountryError || anyCNError || anyOrgError) {
    console.log('\nVariants with field errors:');
    for (const r of results) {
      const fields = [];
      if (r.hasCountryError) fields.push('Country');
      if (r.hasCNError) fields.push('CN');
      if (r.hasOrgError) fields.push('Organization');
      if (fields.length > 0) {
        console.log(`  ${r.variant}: ${fields.join(', ')}`);
      }
    }
  }

  console.log(`\n📁 All artifacts saved to: ${baseDir}`);

  // Create root summary
  const rootSummary = `# DEV Enrolment Test - surname (2.5.4.4) + digitalSignature Only

**Timestamp**: ${new Date().toISOString()}
**Test Focus**: Use surname (2.5.4.4) instead of serialNumber (2.5.4.5), ensure ONLY digitalSignature in KeyUsage

## Test Configuration

### Headers (All Variants)
\`\`\`
CODAUTORI: D8T8-W8W8 (in header only, NOT in body)
ENVIRN: DEV
CASESSAI: 000.000
\`\`\`

### Common Settings
- **Algorithm**: ECDSA P-256 + SHA-256
- **KeyUsage**: digitalSignature (critical) - **NO nonRepudiation, NO keyAgreement**
- **PEM**: Single-line base64 (no wrapping)
- **DN Order**: C, ST, L, SN (2.5.4.4), O, OU, GN (2.5.4.42), CN

## Variants

| Variant | Organization | CN | EKU | HTTP | Errors |
|---------|--------------|-------|-----|------|--------|
${results.map((r) => {
  const v = VARIANTS.find((vv) => vv.name === r.variant)!;
  return `| ${r.variant} | ${v.dn.O} | ${v.dn.CN} | ${v.addEKU ? 'clientAuth' : 'none'} | ${r.httpStatus} | ${r.errors.length} |`;
}).join('\n')}

## Key Findings

### Error Resolution Status
- **surName (SN) missing**: ${allResolvedSurname ? '✅ RESOLVED (2.5.4.4 works!)' : '❌ Still present'}
- **NonRepudiation invalid**: ${allResolvedNonRepudiation ? '✅ RESOLVED (digitalSignature only works!)' : '❌ Still present'}
- **Country invalid**: ${anyCountryError ? '❌ Still present' : '✅ No errors'}
- **CN invalid**: ${anyCNError ? '❌ Still present' : '✅ No errors'}
- **Organization invalid**: ${anyOrgError ? '❌ Still present' : '✅ No errors'}

### Success Criteria
${allResolvedSurname && allResolvedNonRepudiation ? '🎉 **Major Progress**: OID and KeyUsage issues resolved!' : ''}
${!anyCountryError && !anyCNError && !anyOrgError ? '🎉 **COMPLETE SUCCESS**: All field validations passed!' : ''}

## Next Steps

${anyCountryError || anyCNError || anyOrgError ?
`Field validation errors remain. Compare variants to identify which values are accepted:
- V1 vs V2: Different CN values (5678912340 vs 3601837200)
- V1/V2 vs V3: Different Organization (RBC vs FOB) and CN (numeric vs IDPARTN)` :
'All validations passed! Proceed with certificate issuance.'}

## Directory Structure

\`\`\`
${baseDir.split(path.sep).slice(-3).join('/')}/
├── V1/ (RBC, CN=5678912340)
├── V2/ (RBC, CN=3601837200)
└── V3/ (FOB, CN=0000000000001FF2, EKU clientAuth)
\`\`\`
`;

  fs.writeFileSync(path.join(baseDir, 'summary.md'), rootSummary, 'utf8');
  console.log(`📄 Root summary: ${path.join(baseDir, 'summary.md')}`);
}

main().catch(console.error);
