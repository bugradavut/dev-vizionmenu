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

// DN that passed validation in V1
const DN = {
  C: 'CA',
  ST: 'QC',
  L: '-05:00',
  surname: 'Certificat du serveur', // 2.5.4.4
  O: 'RBC-D8T8-W8W8',
  OU: '5678912340TQ0001',
  givenName: 'ER0001', // 2.5.4.42
  CN: '5678912340',
};

interface VariantConfig {
  name: string;
  keyUsageFlags: x509.KeyUsageFlags;
  critical: boolean;
  description: string;
}

const VARIANTS: VariantConfig[] = [
  {
    name: 'KU-A',
    keyUsageFlags: x509.KeyUsageFlags.digitalSignature,
    critical: false,
    description: 'digitalSignature only (critical=false)',
  },
  {
    name: 'KU-B',
    keyUsageFlags:
      x509.KeyUsageFlags.digitalSignature | x509.KeyUsageFlags.nonRepudiation,
    critical: false,
    description: 'digitalSignature + nonRepudiation (critical=false)',
  },
  {
    name: 'KU-C',
    keyUsageFlags:
      x509.KeyUsageFlags.digitalSignature | x509.KeyUsageFlags.nonRepudiation,
    critical: true,
    description: 'digitalSignature + nonRepudiation (critical=true)',
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
  const dnString = `C=${DN.C}, ST=${DN.ST}, L=${DN.L}, 2.5.4.4=${DN.surname}, O=${DN.O}, OU=${DN.OU}, 2.5.4.42=${DN.givenName}, CN=${DN.CN}`;

  // Build extensions array
  const extensions: x509.Extension[] = [];

  // KeyUsage with specified flags and critical setting
  extensions.push(
    new x509.KeyUsagesExtension(variant.keyUsageFlags, variant.critical)
  );

  // NO ExtendedKeyUsage for any variant

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

  console.log(`\n=== Testing ${variant.name}: ${variant.description} ===`);

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
  let keyUsageLine = '';
  try {
    opensslOutput = execSync(`openssl req -in "${csrPath}" -noout -text`, {
      encoding: 'utf8',
    });
    fs.writeFileSync(path.join(variantDir, 'csr.txt'), opensslOutput, 'utf8');

    // Extract Key Usage section
    const keyUsageMatch = opensslOutput.match(
      /X509v3 Key Usage:(.*?)(\n\s+.*?)(?=\n\S|\n$)/s
    );
    if (keyUsageMatch) {
      keyUsageLine = `X509v3 Key Usage:${keyUsageMatch[1]}${keyUsageMatch[2] || ''}`.trim();
    }
  } catch (err: any) {
    const errMsg = `OpenSSL error: ${err.message}`;
    fs.writeFileSync(path.join(variantDir, 'csr.txt'), errMsg, 'utf8');
    keyUsageLine = 'ERROR';
  }

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

  // Check for NonRepudiation error
  const hasNonRepudiationError = errors.some((e) => e.id === 'JW00B999609E');

  // Check for success
  const hasSuccess = httpStatus === 200 || response.retourCertif?.certif;

  // Create summary
  const dnFormatted = `C=${DN.C}, ST=${DN.ST}, L=${DN.L}, 2.5.4.4=${DN.surname}, O=${DN.O}, OU=${DN.OU}, 2.5.4.42=${DN.givenName}, CN=${DN.CN}`;

  const summary = `# ${variant.name} Summary

**Timestamp**: ${new Date().toISOString()}
**Endpoint**: ${ENDPOINT}

## Configuration
- **Variant**: ${variant.description}
- **DN**: ${dnFormatted}
- **Algorithm**: ECDSA P-256 + SHA-256
- **ExtendedKeyUsage**: NONE
- **PEM Format**: Single-line base64

## KeyUsage Configuration
- **Flags**: ${variant.keyUsageFlags.toString(2).padStart(9, '0')} (binary)
- **Critical**: ${variant.critical}
- **OpenSSL Output**:
  \`\`\`
  ${keyUsageLine}
  \`\`\`

## CSR Details
- **SHA-256 (DER)**: ${sha256Hash}
- **Base64 length**: ${base64SingleLine.length} characters
- **Base64 is single line**: ${hasNewlinesInBase64 ? '❌ NO' : '✅ YES'}
- **Newlines in CSR field**: ${newlineCount} (expected: 2) ${newlineCount === 2 ? '✅' : '❌'}

## Request Validation
- **CODAUTORI in header**: ✅ YES (D8T8-W8W8)
- **codAutori in body**: ✅ NO (not present)

## API Response
- **HTTP Status**: ${httpStatus}
- **Certificate received**: ${hasSuccess ? '✅ YES - SUCCESS!' : '❌ NO'}

## Error Analysis

${errors.length > 0 ? `### Errors Received (${errors.length})

${errors.map((e, i) => `${i + 1}. **${e.id}** [code: ${e.codRetour}]
   ${e.mess}${e.mess.length >= 80 ? '...' : ''}`).join('\n\n')}

### Key Error Status
- **NonRepudiation error (JW00B999609E)**: ${hasNonRepudiationError ? '❌ PRESENT' : '✅ RESOLVED'}` : '✅ **No errors - SUCCESS!**'}

## Diagnostic Interpretation

${hasSuccess ? '🎉 **SUCCESS**: This KeyUsage configuration is accepted!' : ''}
${!hasNonRepudiationError && errors.length === 0 ? '🎉 **NonRepudiation error resolved**: This confirms the correct KeyUsage configuration!' : ''}
${hasNonRepudiationError ? '❌ **NonRepudiation error persists**: This KeyUsage configuration does not resolve the issue.' : ''}

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
    description: variant.description,
    sha256: sha256Hash.substring(0, 16) + '...',
    httpStatus,
    errors,
    keyUsageLine,
    hasNonRepudiationError,
    hasSuccess,
  };
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const baseDir = path.join('tmp', 'logs', `dev-enrolment-${timestamp}`);
  fs.mkdirSync(baseDir, { recursive: true });

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  DEV Enrolment Test - KeyUsage Diagnosis                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`Output directory: ${baseDir}\n`);
  console.log('Testing KeyUsage combinations to diagnose NonRepudiation error...\n');

  const results = [];
  for (const variant of VARIANTS) {
    const result = await testVariant(variant, baseDir);
    results.push(result);
  }

  // Print summary table
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  RESULTS SUMMARY                                               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  console.log('Variant | SHA-256          | HTTP | Errors | NonRepudiation');
  console.log('--------|------------------|------|--------|----------------');
  for (const r of results) {
    const errorCount = r.errors.length;
    const nrStatus = r.hasNonRepudiationError ? '❌ YES' : '✅ NO';
    console.log(
      `${r.variant.padEnd(7)} | ${r.sha256.padEnd(16)} | ${String(r.httpStatus).padEnd(4)} | ${String(errorCount).padEnd(6)} | ${nrStatus}`
    );
  }

  // Print KeyUsage details
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  KEYUSAGE DETAILS                                              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  for (const r of results) {
    console.log(`${r.variant}: ${r.description}`);
    console.log(`  OpenSSL: ${r.keyUsageLine}`);
    console.log('');
  }

  // Print detailed errors
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  ERROR DETAILS                                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  for (const r of results) {
    console.log(`${r.variant}:`);
    if (r.errors.length === 0) {
      console.log('  ✅ No errors - SUCCESS!\n');
    } else {
      for (const err of r.errors) {
        console.log(`  [${err.codRetour}] ${err.id}`);
        console.log(`  ${err.mess}${err.mess.length >= 80 ? '...' : ''}`);
      }
      console.log('');
    }
  }

  // Diagnostic analysis
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  DIAGNOSTIC ANALYSIS                                           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const kuA = results.find((r) => r.variant === 'KU-A');
  const kuB = results.find((r) => r.variant === 'KU-B');
  const kuC = results.find((r) => r.variant === 'KU-C');

  if (kuA && !kuA.hasNonRepudiationError && (kuB?.hasNonRepudiationError || kuC?.hasNonRepudiationError)) {
    console.log('✅ **DIAGNOSIS**: nonRepudiation bit is FORBIDDEN');
    console.log('   - Use ONLY digitalSignature (KU-A configuration)');
    console.log('   - critical flag can be false');
  } else if ((kuB && !kuB.hasNonRepudiationError) || (kuC && !kuC.hasNonRepudiationError)) {
    console.log('✅ **DIAGNOSIS**: nonRepudiation bit is REQUIRED');
    if (kuB && !kuB.hasNonRepudiationError && kuC?.hasNonRepudiationError) {
      console.log('   - Use digitalSignature + nonRepudiation');
      console.log('   - critical flag must be FALSE (KU-B configuration)');
    } else if (kuC && !kuC.hasNonRepudiationError && kuB?.hasNonRepudiationError) {
      console.log('   - Use digitalSignature + nonRepudiation');
      console.log('   - critical flag must be TRUE (KU-C configuration)');
    } else if (kuB && kuC && !kuB.hasNonRepudiationError && !kuC.hasNonRepudiationError) {
      console.log('   - Use digitalSignature + nonRepudiation');
      console.log('   - critical flag can be either true or false');
    }
  } else if (kuA?.hasNonRepudiationError && kuB?.hasNonRepudiationError && kuC?.hasNonRepudiationError) {
    console.log('⚠️  **DIAGNOSIS**: Error message is MISLEADING');
    console.log('   - All KeyUsage configurations still produce NonRepudiation error');
    console.log('   - The error may originate from a different layer');
    console.log('   - Review full error sets and CSR differences for other issues');
  }

  const anySuccess = results.some((r) => r.hasSuccess);
  if (anySuccess) {
    console.log('\n🎉 **SUCCESS**: At least one configuration was accepted!');
    const successVariants = results.filter((r) => r.hasSuccess);
    for (const r of successVariants) {
      console.log(`   ✅ ${r.variant}: ${r.description}`);
    }
  }

  console.log(`\n📁 All artifacts saved to: ${baseDir}`);

  // Create root summary
  const rootSummary = `# DEV Enrolment Test - KeyUsage Diagnosis

**Timestamp**: ${new Date().toISOString()}
**Test Focus**: Diagnose NonRepudiation error by testing different KeyUsage configurations

## Test Configuration

### Common Settings (All Variants)
- **DN**: C=CA, ST=QC, L=-05:00, 2.5.4.4=Certificat du serveur, O=RBC-D8T8-W8W8, OU=5678912340TQ0001, 2.5.4.42=ER0001, CN=5678912340
- **Algorithm**: ECDSA P-256 + SHA-256
- **ExtendedKeyUsage**: NONE (not included)
- **PEM**: Single-line base64
- **CODAUTORI**: D8T8-W8W8 (header only, NOT in body)

### Variants Tested

| Variant | KeyUsage | Critical | HTTP | Errors | NonRepudiation Error |
|---------|----------|----------|------|--------|---------------------|
${results.map((r) => `| ${r.variant} | ${r.description.split('(')[0].trim()} | ${r.description.includes('critical=true') ? 'true' : 'false'} | ${r.httpStatus} | ${r.errors.length} | ${r.hasNonRepudiationError ? '❌ YES' : '✅ NO'} |`).join('\n')}

## Diagnostic Results

${
  kuA && !kuA.hasNonRepudiationError && (kuB?.hasNonRepudiationError || kuC?.hasNonRepudiationError)
    ? `### ✅ DIAGNOSIS: nonRepudiation is FORBIDDEN

- **Working configuration**: KU-A (digitalSignature only, critical=false)
- **Failing configurations**: KU-B/KU-C (include nonRepudiation bit)
- **Conclusion**: The API rejects CSRs with nonRepudiation bit set`
    : ''
}
${
  (kuB && !kuB.hasNonRepudiationError) || (kuC && !kuC.hasNonRepudiationError)
    ? `### ✅ DIAGNOSIS: nonRepudiation is REQUIRED

- **Working configuration**: ${kuB && !kuB.hasNonRepudiationError ? 'KU-B' : ''}${kuC && !kuC.hasNonRepudiationError ? 'KU-C' : ''}
- **Failing configuration**: KU-A (digitalSignature only)
- **Critical flag**: ${kuB && !kuB.hasNonRepudiationError && kuC?.hasNonRepudiationError ? 'must be FALSE' : kuC && !kuC.hasNonRepudiationError && kuB?.hasNonRepudiationError ? 'must be TRUE' : 'can be either true or false'}
- **Conclusion**: The API requires both digitalSignature and nonRepudiation bits`
    : ''
}
${
  kuA?.hasNonRepudiationError && kuB?.hasNonRepudiationError && kuC?.hasNonRepudiationError
    ? `### ⚠️ DIAGNOSIS: Error message is MISLEADING

- **All variants failed**: KU-A, KU-B, and KU-C all produce the same NonRepudiation error
- **Possible causes**:
  1. The error originates from a different validation layer (not KeyUsage)
  2. Additional configuration is required (e.g., specific EKU, attributes)
  3. Backend provisioning issue
- **Next steps**: Review full error sets and CSR structure for other issues`
    : ''
}

## Error Details by Variant

${results
  .map(
    (r) => `### ${r.variant}: ${r.description}

**OpenSSL KeyUsage Output**:
\`\`\`
${r.keyUsageLine}
\`\`\`

${
  r.errors.length > 0
    ? `**Errors**:
${r.errors.map((e, i) => `${i + 1}. [${e.codRetour}] ${e.id}: ${e.mess}`).join('\n')}`
    : '✅ **No errors - SUCCESS!**'
}
`
  )
  .join('\n')}

## Success Criteria

${anySuccess ? `🎉 **SUCCESS**: Certificate enrolment succeeded with at least one configuration!

Working configurations:
${results
  .filter((r) => r.hasSuccess)
  .map((r) => `- ${r.variant}: ${r.description}`)
  .join('\n')}` : 'No successful enrolments yet. Review error details above.'}

## Directory Structure

\`\`\`
${baseDir.split(path.sep).slice(-3).join('/')}/
├── KU-A/ (digitalSignature only, critical=false)
├── KU-B/ (digitalSignature + nonRepudiation, critical=false)
└── KU-C/ (digitalSignature + nonRepudiation, critical=true)
\`\`\`

Each directory contains:
- csr.pem, csr.txt, sha256.txt
- headers.json, request.json, response.json
- curl.sh, summary.md
`;

  fs.writeFileSync(path.join(baseDir, 'summary.md'), rootSummary, 'utf8');
  console.log(`📄 Root summary: ${path.join(baseDir, 'summary.md')}`);
}

main().catch(console.error);
