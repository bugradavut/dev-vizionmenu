/**
 * ESSAI Enrolment - 2 Controlled Attempts (A → B)
 *
 * A) RBC DN (priority)
 * B) FOB DN (fallback if A gets DN mismatch 93)
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

// Headers (CODAUTORI IN HEADER, NOT BODY!)
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
  CODAUTORI: 'D8T8-W8W8', // IN HEADER!
};

// DN configs
const DN_CONFIGS = {
  A: {
    name: 'RBC DN',
    dn: {
      C: 'CA',
      ST: 'QC',
      L: '-05:00',
      surname: 'Certificat du serveur', // 2.5.4.4
      O: 'RBC-D8T8-W8W8',
      OU: '5678912340TQ0001',
      GN: 'ER0001', // 2.5.4.42
      CN: '5678912340',
    },
  },
  B: {
    name: 'FOB DN',
    dn: {
      C: 'CA',
      ST: 'QC',
      L: '-05:00',
      surname: 'Certificat du serveur', // 2.5.4.4
      O: 'FOB-FOB201999999',
      CN: '0000000000001FF2',
      // NO OU, NO GN
    },
  },
};

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

function buildDnString(dn: any): string {
  const parts: string[] = [];

  if (dn.C) parts.push(`C=${dn.C}`);
  if (dn.ST) parts.push(`ST=${dn.ST}`);
  if (dn.L) parts.push(`L=${dn.L}`);
  if (dn.surname) parts.push(`2.5.4.4=${dn.surname}`);
  if (dn.O) parts.push(`O=${dn.O}`);
  if (dn.OU) parts.push(`OU=${dn.OU}`);
  if (dn.GN) parts.push(`2.5.4.42=${dn.GN}`);
  if (dn.CN) parts.push(`CN=${dn.CN}`);

  return parts.join(', ');
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

async function testEnrolment(attemptId: 'A' | 'B', baseDir: string) {
  const config = DN_CONFIGS[attemptId];
  const outputDir = path.join(baseDir, attemptId);
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\n${'='.repeat(70)}`);
  console.log(`ATTEMPT ${attemptId}: ${config.name}`);
  console.log('='.repeat(70));

  // Generate keypair
  console.log('🔐 Generating ECDSA P-256 keypair...');
  const cryptoKey = await generateKeyPair();

  // Build DN string
  const dnString = buildDnString(config.dn);
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

  let status = 'UNKNOWN';
  if (httpStatus === 201 && certificateReceived) {
    status = 'PASS';
    console.log(`✅ PASS - Certificate received`);
  } else if (errors.some((e) => e.codRetour === '93')) {
    status = 'DN_MISMATCH';
    console.log(`⚠️  DN MISMATCH (93) - Try next attempt`);
  } else if (errors.some((e) => e.codRetour === '95' || e.codRetour === '96')) {
    status = 'STRUCTURAL_FAIL';
    console.log(`❌ STRUCTURAL FAIL (95/96) - Header/body/CSR issue`);
  } else {
    status = 'FAIL';
    console.log(`❌ FAIL - Unknown error`);
  }

  // Create summary.md
  const summary = `# ESSAI Enrolment - Attempt ${attemptId}

**Config**: ${config.name}
**Timestamp**: ${new Date().toISOString()}
**Endpoint**: ${ENDPOINT}

## Headers

\`\`\`
${Object.entries(HEADERS).map(([k, v]) => `${k}: ${v}`).join('\n')}
\`\`\`

## DN

\`\`\`
${dnString}
\`\`\`

## Request Body

\`\`\`json
${JSON.stringify(requestBody, null, 2)}
\`\`\`

## Results

- **HTTP Status**: ${httpStatus}
- **Status**: ${status}
- **Certificate Received**: ${certificateReceived ? 'YES' : 'NO'}
- **Errors**: ${errors.length}

${errors.length > 0 ? `### Errors

${errors.map((e, i) => `${i + 1}. **[${e.codRetour}] ${e.id}**
   ${e.mess}`).join('\n\n')}` : ''}

## Files

- \`csr.pem\`: CSR in PEM format (single-line base64)
- \`csr.txt\`: OpenSSL parsed output
- \`sha256.txt\`: SHA-256 hash of DER (${sha256Hash})
- \`headers.json\`: Request headers (CODAUTORI in header!)
- \`request.json\`: Request body (NO codAutori in body!)
- \`response.json\`: API response
- \`curl.sh\`: Reproducible curl command
`;

  fs.writeFileSync(path.join(outputDir, 'summary.md'), summary, 'utf8');

  return {
    attemptId,
    httpStatus,
    status,
    certificateReceived,
    errors,
    outputDir,
  };
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const baseDir = path.join('tmp', 'logs', `essai-enrolment-${timestamp}`);
  fs.mkdirSync(baseDir, { recursive: true });

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  ESSAI Enrolment - 2 Controlled Attempts (A → B)             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`\n📁 Base output: ${baseDir}\n`);

  const results: any[] = [];

  // Attempt A (RBC DN)
  const resultA = await testEnrolment('A', baseDir);
  results.push(resultA);

  // Check if we need attempt B
  if (resultA.status === 'DN_MISMATCH') {
    console.log(`\n⚠️  Attempt A got DN mismatch (93), trying Attempt B (FOB DN)...\n`);
    const resultB = await testEnrolment('B', baseDir);
    results.push(resultB);
  } else if (resultA.status === 'PASS') {
    console.log(`\n✅ Attempt A succeeded, skipping Attempt B\n`);
  } else {
    console.log(`\n❌ Attempt A failed with structural error, investigate before Attempt B\n`);
  }

  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(70));

  results.forEach((r) => {
    console.log(`\nAttempt ${r.attemptId}:`);
    console.log(`  HTTP: ${r.httpStatus}`);
    console.log(`  Status: ${r.status}`);
    console.log(`  Certificate: ${r.certificateReceived ? 'YES ✅' : 'NO ❌'}`);
    console.log(`  Errors: ${r.errors.length}`);
    console.log(`  Output: ${r.outputDir}`);
  });

  const passed = results.find((r) => r.status === 'PASS');
  if (passed) {
    console.log(`\n✅ SUCCESS: Attempt ${passed.attemptId} passed`);
    console.log(`📁 Artifacts: ${passed.outputDir}`);
  } else {
    console.log(`\n❌ FAILURE: No attempt succeeded`);
    console.log(`📁 All artifacts: ${baseDir}`);
  }

  console.log('');
}

main().catch((error) => {
  console.error('❌ Suite error:', error.message);
  process.exit(1);
});
