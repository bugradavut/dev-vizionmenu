import * as x509 from '@peculiar/x509';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';

const ENDPOINT = 'https://certificats.cnfr.api.rq-fo.ca/enrolement';

const HEADERS = {
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

const DN = {
  C: 'CA',
  ST: 'QC',
  L: '-05:00',
  serialNumber: 'Certificat du serveur', // 2.5.4.5
  O: 'RBC-D8T8-W8W8',
  OU: '5678912340TQ0001',
  givenName: 'ER0001', // 2.5.4.42
  CN: '5678912340',
};

interface Variant {
  name: string;
  addEKU: boolean;
}

const VARIANTS: Variant[] = [
  { name: 'V1', addEKU: false }, // No EKU
  { name: 'V2', addEKU: true },  // EKU clientAuth (1.3.6.1.5.5.7.3.2)
];

async function generateSingleLinePEM(variant: Variant) {
  // Generate key pair
  const cryptoKey = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify']
  );

  // Build DN string - exact order: C → ST → L → SN (2.5.4.5) → O → OU → GN (2.5.4.42) → CN
  const dnString = `C=${DN.C}, ST=${DN.ST}, L=${DN.L}, 2.5.4.5=${DN.serialNumber}, O=${DN.O}, OU=${DN.OU}, 2.5.4.42=${DN.givenName}, CN=${DN.CN}`;

  // Build extensions array
  const extensions: x509.Extension[] = [];

  // KeyUsage: ONLY digitalSignature (critical)
  // NO keyAgreement - explicitly only digitalSignature
  extensions.push(
    new x509.KeyUsagesExtension(x509.KeyUsageFlags.digitalSignature, true)
  );

  // ExtendedKeyUsage if V2
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
  // Format: -----BEGIN CERTIFICATE REQUEST-----\n<single_line_base64>\n-----END CERTIFICATE REQUEST-----
  const pemString = `-----BEGIN CERTIFICATE REQUEST-----\n${base64SingleLine}\n-----END CERTIFICATE REQUEST-----`;

  return {
    pem: pemString,
    der: derBuffer,
    base64SingleLine,
  };
}

async function testVariant(variant: Variant, baseDir: string) {
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
  try {
    const opensslOutput = execSync(`openssl req -in "${csrPath}" -noout -text`, {
      encoding: 'utf8',
    });
    fs.writeFileSync(path.join(variantDir, 'csr.txt'), opensslOutput, 'utf8');
  } catch (err: any) {
    fs.writeFileSync(
      path.join(variantDir, 'csr.txt'),
      `OpenSSL error: ${err.message}`,
      'utf8'
    );
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
      csr: pem, // This contains \n after BEGIN and before END, but base64 content is single line
    },
  };

  // Save request
  const requestJson = JSON.stringify(requestBody, null, 2);
  fs.writeFileSync(path.join(variantDir, 'request.json'), requestJson, 'utf8');

  // Verify that the base64 in the PEM is actually single line (no \n within base64 content)
  const csrInRequest = requestBody.reqCertif.csr;
  const base64Match = csrInRequest.match(/-----BEGIN CERTIFICATE REQUEST-----\n(.*?)\n-----END CERTIFICATE REQUEST-----/s);
  const base64Extracted = base64Match ? base64Match[1] : '';
  const hasNewlinesInBase64 = base64Extracted.includes('\n') || base64Extracted.includes('\r');

  // Hex dump of request.json for verification
  const requestBuffer = Buffer.from(requestJson, 'utf8');
  const hexDump = requestBuffer.toString('hex');
  fs.writeFileSync(path.join(variantDir, 'request-hex.txt'), hexDump, 'utf8');

  // Additional validation: count newlines in the JSON csr field
  const newlineCount = (csrInRequest.match(/\n/g) || []).length;
  const expectedNewlines = 2; // One after BEGIN, one before END

  // Generate curl command
  const curlHeaders = Object.entries(HEADERS)
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(' \\\n  ');

  const curlCommand = `curl -X POST "${ENDPOINT}" \\\n  ${curlHeaders} \\\n  -H "Content-Type: application/json" \\\n  -d @request.json`;
  fs.writeFileSync(path.join(variantDir, 'curl.sh'), curlCommand, 'utf8');

  // Make API call
  let response: any;
  let httpStatus: number;
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        ...HEADERS,
        'Content-Type': 'application/json',
      },
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

  // Parse error
  let errorSummary = 'N/A';
  if (response.listErr && Array.isArray(response.listErr) && response.listErr.length > 0) {
    const firstErr = response.listErr[0];
    errorSummary = `[${firstErr.codErr}] ${firstErr.messErr}`;
  }

  // Create summary
  const summary = `# ${variant.name} Summary

**Timestamp**: ${new Date().toISOString()}
**Endpoint**: ${ENDPOINT}

## Configuration
- **DN**: C=CA, ST=QC, L=-05:00, 2.5.4.5=Certificat du serveur, O=RBC-D8T8-W8W8, OU=5678912340TQ0001, 2.5.4.42=ER0001, CN=5678912340
- **KeyUsage**: digitalSignature (critical) - NO keyAgreement
- **ExtendedKeyUsage**: ${variant.addEKU ? 'clientAuth (1.3.6.1.5.5.7.3.2)' : 'NONE'}
- **Algorithm**: ECDSA P-256 + SHA-256
- **PEM Format**: Single-line base64 (no wrapping within base64 content)

## CSR Details
- **SHA-256 (DER)**: ${sha256Hash}
- **Base64 length**: ${base64SingleLine.length} characters
- **Base64 is single line**: ${hasNewlinesInBase64 ? '❌ NO (contains \\n or \\r)' : '✅ YES'}
- **Newlines in CSR field**: ${newlineCount} (expected: ${expectedNewlines}) ${newlineCount === expectedNewlines ? '✅' : '❌'}

## Request Validation
- **CODAUTORI in header**: ✅ YES (D8T8-W8W8)
- **codAutori in body**: ✅ NO (not present)
- **CSR format**: \`-----BEGIN CERTIFICATE REQUEST-----\\n<single_line>\\n-----END CERTIFICATE REQUEST-----\`

## API Response
- **HTTP Status**: ${httpStatus}
- **Certificate received**: ${response.certif ? '✅ YES' : '❌ NO'}
- **Error**: ${errorSummary}

${response.listErr && response.listErr.length > 0 ? `## Error Details
\`\`\`json
${JSON.stringify(response.listErr, null, 2)}
\`\`\`` : ''}

## Hex Dump Analysis
- Request JSON hex dump saved to \`request-hex.txt\`
- Verify no extra \\n (0x0a) or \\r (0x0d) bytes within base64 content

## Files
- \`csr.pem\`: CSR in PEM format (single-line base64)
- \`csr.txt\`: OpenSSL parsed output
- \`sha256.txt\`: SHA-256 hash of DER
- \`headers.json\`: Request headers
- \`request.json\`: Full request body
- \`request-hex.txt\`: Hex dump of request.json
- \`response.json\`: API response
- \`curl.sh\`: Reproducible curl command
`;

  fs.writeFileSync(path.join(variantDir, 'summary.md'), summary, 'utf8');

  return {
    variant: variant.name,
    sha256: sha256Hash.slice(0, 16) + '...',
    httpStatus,
    errorSummary,
    singleLineOk: !hasNewlinesInBase64 && newlineCount === expectedNewlines,
  };
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const baseDir = path.join('tmp', 'logs', `dev-enrolment-${timestamp}`);
  fs.mkdirSync(baseDir, { recursive: true });

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  DEV Enrolment Test - Single-Line Base64 PEM                  ║');
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
  console.log('Variant | SHA-256          | HTTP | Single-Line | Error');
  console.log('--------|------------------|------|-------------|-------');
  for (const r of results) {
    const singleLineStatus = r.singleLineOk ? '✅ YES' : '❌ NO';
    console.log(
      `${r.variant.padEnd(7)} | ${r.sha256.padEnd(16)} | ${String(r.httpStatus).padEnd(4)} | ${singleLineStatus.padEnd(11)} | ${r.errorSummary}`
    );
  }

  console.log(`\n📁 All artifacts saved to: ${baseDir}`);

  // Create root summary
  const rootSummary = `# DEV Enrolment Test - Single-Line Base64 PEM

**Timestamp**: ${new Date().toISOString()}
**Test Focus**: Single-line base64 in PEM (no wrapping), SN included, no keyAgreement

## Test Configuration

### Headers (All Variants)
- ENVIRN: DEV
- APPRLINIT: SRV
- CASESSAI: 000.000
- VERSIPARN: 0
- IDSEV: 0000000000003973
- IDVERSI: 00000000000045D6
- CODCERTIF: FOB201999999
- IDPARTN: 0000000000001FF2
- VERSI: 0.1.0
- **CODAUTORI: D8T8-W8W8** (in header only, NOT in body)

### DN (All Variants)
\`\`\`
C=CA, ST=QC, L=-05:00, 2.5.4.5=Certificat du serveur, O=RBC-D8T8-W8W8, OU=5678912340TQ0001, 2.5.4.42=ER0001, CN=5678912340
\`\`\`

Order: C → ST → L → SN (2.5.4.5) → O → OU → GN (2.5.4.42) → CN

### Key & Signature
- Algorithm: ECDSA P-256 + SHA-256
- KeyUsage: digitalSignature (critical) - **NO keyAgreement**

### PEM Format
- BEGIN line followed by single \\n
- Base64 content in **ONE LINE** (no wrapping, no CRLF, no BOM)
- END line preceded by single \\n

## Variants

| Variant | ExtendedKeyUsage | Result |
|---------|------------------|--------|
${results.map(r => `| ${r.variant} | ${r.variant === 'V1' ? 'NONE' : 'clientAuth (1.3.6.1.5.5.7.3.2)'} | HTTP ${r.httpStatus} - ${r.errorSummary} |`).join('\n')}

## Key Findings

${results.every(r => !r.singleLineOk) ? '⚠️ **Warning**: Some variants have newlines within base64 content - check request-hex.txt' : '✅ All variants have proper single-line base64'}

${results.some(r => r.httpStatus !== 400) ? '🎉 **Success**: At least one variant returned non-400 status!' : ''}

${results.every(r => r.errorSummary.includes('[96]')) ? '⚠️ **Note**: All variants still return Error 96 (CSR validation failure)' : ''}

${results.some(r => !r.errorSummary.includes('[96]') && r.httpStatus !== 200) ? '🔍 **Progress**: Different error code detected - this indicates CSR format requirements are being met!' : ''}

## Next Steps

${results.every(r => r.errorSummary.includes('[96]')) ?
`- If Error 96 persists, check if it now specifies which DN field is invalid
- Review hex dumps in request-hex.txt to confirm no encoding issues
- Consider if DEV environment requires backend provisioning` :
`- Review new error codes for specific field requirements
- Adjust CSR configuration based on error messages`}

## Directory Structure

\`\`\`
${baseDir.split(path.sep).slice(-3).join('/')}/
├── V1/
│   ├── csr.pem
│   ├── csr.txt (OpenSSL parse)
│   ├── sha256.txt
│   ├── headers.json
│   ├── request.json
│   ├── request-hex.txt
│   ├── response.json
│   ├── curl.sh
│   └── summary.md
└── V2/
    ├── csr.pem
    ├── csr.txt
    ├── sha256.txt
    ├── headers.json
    ├── request.json
    ├── request-hex.txt
    ├── response.json
    ├── curl.sh
    └── summary.md
\`\`\`
`;

  fs.writeFileSync(path.join(baseDir, 'summary.md'), rootSummary, 'utf8');
  console.log(`📄 Root summary: ${path.join(baseDir, 'summary.md')}`);
}

main().catch(console.error);
