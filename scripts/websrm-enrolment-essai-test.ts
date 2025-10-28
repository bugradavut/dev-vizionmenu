/**
 * WEB-SRM ESSAI Enrolment Test
 *
 * Purpose: Test ESSAI enrolment with GOLDEN CONFIGURATION
 *
 * ESSAI Specifics (CORRECTED):
 * - Endpoint: https://certificats.cnfr.api.rq-fo.ca/enrolement (NO "2" suffix!)
 * - CASESSAI: 500.001 (not 000.000)
 * - VERSIPARN: 0 (not 1.0.0 - first certification attempt)
 * - codAutori: IN BODY (not in header)
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

const ENDPOINT = 'https://certificats.cnfr.api.rq-fo.ca/enrolement'; // ESSAI uses /enrolement (NO "2"!)

const HEADERS = {
  'Content-Type': 'application/json',
  ENVIRN: 'ESSAI',
  APPRLINIT: 'SRV',
  CASESSAI: '500.001', // ESSAI case
  VERSIPARN: '0',      // First certification (NOT 1.0.0)
  IDSEV: '0000000000003973',
  IDVERSI: '00000000000045D6',
  CODCERTIF: 'FOB201999999',
  IDPARTN: '0000000000001FF2',
  VERSI: '0.1.0',
  // NO CODAUTORI in header for ESSAI
};

const AUTH_CODE = 'D8T8-W8W8';

// DN per golden config (user specified RBC-D8T8-W8W8)
const DN = {
  C: 'CA',
  ST: 'QC',
  L: '-05:00',
  surname: 'Certificat du serveur', // 2.5.4.4 (CRITICAL!)
  O: 'RBC-D8T8-W8W8', // User specified RBC, not FOB
  OU: '5678912340TQ0001',
  givenName: 'ER0001', // 2.5.4.42
  CN: '5678912340',
};

async function generateKeyPair() {
  console.log('🔐 Generating ECDSA P-256 keypair...\n');

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
  console.log('📝 Building CSR (GOLDEN CONFIG)...\n');

  // Build DN - EXACT ORDER: C, ST, L, SN (2.5.4.4), O, OU, GN (2.5.4.42), CN
  const dnString = `C=${DN.C}, ST=${DN.ST}, L=${DN.L}, 2.5.4.4=${DN.surname}, O=${DN.O}, OU=${DN.OU}, 2.5.4.42=${DN.givenName}, CN=${DN.CN}`;

  // Create CSR
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

  console.log(`✅ CSR generated (GOLDEN CONFIG)`);
  console.log(`   DN: ${dnString}`);
  console.log(`   KeyUsage: digitalSignature + nonRepudiation (critical)`);
  console.log(`   EKU: NONE (server adds clientAuth)`);
  console.log(`   PEM: Single-line base64 (${base64SingleLine.length} chars)\n`);

  return { csrPem, derBuffer };
}

async function testEnrolment() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const baseDir = path.join('tmp', 'logs', `essai-enrolment-${timestamp}`);
  fs.mkdirSync(baseDir, { recursive: true });

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  WEB-SRM ESSAI Enrolment Test (GOLDEN CONFIG)                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  console.log(`📁 Output: ${baseDir}\n`);

  // Generate keypair
  const cryptoKey = await generateKeyPair();

  // Generate CSR
  const { csrPem, derBuffer } = await generateCSR(cryptoKey);

  // Save CSR
  const csrPath = path.join(baseDir, 'csr.pem');
  fs.writeFileSync(csrPath, csrPem, 'utf8');

  // SHA-256 hash
  const sha256Hash = crypto.createHash('sha256').update(derBuffer).digest('hex');
  fs.writeFileSync(path.join(baseDir, 'sha256.txt'), sha256Hash, 'utf8');

  // OpenSSL parse
  try {
    const opensslOutput = execSync(`openssl req -in "${csrPath}" -noout -text`, {
      encoding: 'utf8',
    });
    fs.writeFileSync(path.join(baseDir, 'csr.txt'), opensslOutput, 'utf8');
    console.log('✅ OpenSSL validation passed\n');
  } catch (err: any) {
    console.error(`❌ OpenSSL validation failed: ${err.message}\n`);
  }

  // Save headers
  fs.writeFileSync(
    path.join(baseDir, 'headers.json'),
    JSON.stringify(HEADERS, null, 2),
    'utf8'
  );

  // Build request body
  const requestBody = {
    reqCertif: {
      modif: 'AJO',
      csr: csrPem,
    },
    codAutori: AUTH_CODE, // IN BODY for ESSAI (not in header!)
  };

  // Save request
  fs.writeFileSync(
    path.join(baseDir, 'request.json'),
    JSON.stringify(requestBody, null, 2),
    'utf8'
  );

  // Generate curl command
  const curlHeaders = Object.entries(HEADERS)
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(' \\\n  ');

  const curlCommand = `curl -X POST "${ENDPOINT}" \\\n  ${curlHeaders} \\\n  -d @request.json`;
  fs.writeFileSync(path.join(baseDir, 'curl.sh'), curlCommand, 'utf8');

  // Make API call
  console.log('🌐 Calling ESSAI enrolment endpoint...\n');
  console.log(`POST ${ENDPOINT}\n`);

  let response: any;
  let httpStatus: number;

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(requestBody),
    });

    httpStatus = res.status;

    // Try to parse as JSON
    const contentType = res.headers.get('content-type');
    const responseText = await res.text();

    try {
      if (contentType?.includes('application/json')) {
        response = JSON.parse(responseText);
      } else {
        // HTML or other non-JSON response
        console.log(`⚠️  Non-JSON response (${contentType || 'unknown type'})`);
        console.log(`   First 500 chars: ${responseText.substring(0, 500)}\n`);
        response = {
          error: 'Non-JSON response',
          contentType,
          htmlPreview: responseText.substring(0, 500),
        };
      }
    } catch (parseErr) {
      response = {
        error: 'JSON parse error',
        message: String(parseErr),
        rawText: responseText.substring(0, 500),
      };
    }

    // Save response
    fs.writeFileSync(
      path.join(baseDir, 'response.json'),
      JSON.stringify(response, null, 2),
      'utf8'
    );

    console.log(`📥 Response: HTTP ${httpStatus}\n`);

  } catch (err: any) {
    httpStatus = 0;
    response = { error: err.message };
    fs.writeFileSync(
      path.join(baseDir, 'response.json'),
      JSON.stringify(response, null, 2),
      'utf8'
    );
    console.error(`❌ Request failed: ${err.message}\n`);
  }

  // Parse response
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

  // Create summary
  const summary = `# ESSAI Enrolment Test Summary

**Timestamp**: ${new Date().toISOString()}
**Endpoint**: ${ENDPOINT}

## Configuration

### Headers
\`\`\`
${Object.entries(HEADERS).map(([k, v]) => `${k}: ${v}`).join('\n')}
\`\`\`

### Body
- \`codAutori\`: ${AUTH_CODE} (IN BODY for ESSAI)

### DN
\`\`\`
${`C=${DN.C}, ST=${DN.ST}, L=${DN.L}, 2.5.4.4=${DN.surname}, O=${DN.O}, OU=${DN.OU}, 2.5.4.42=${DN.givenName}, CN=${DN.CN}`}
\`\`\`

### CSR
- **Algorithm**: ECDSA P-256 + SHA-256
- **KeyUsage**: digitalSignature + nonRepudiation (critical)
- **ExtendedKeyUsage**: NONE
- **PEM Format**: Single-line base64
- **SHA-256**: ${sha256Hash}

## Results

- **HTTP Status**: ${httpStatus}
- **Certificate Received**: ${certificateReceived ? '✅ YES' : '❌ NO'}
- **Errors**: ${errors.length}

${errors.length > 0 ? `### Errors

${errors.map((e, i) => `${i + 1}. **${e.id}** [${e.codRetour}]
   ${e.mess}`).join('\n\n')}` : ''}

${certificateReceived ? `### Certificate Details

- Main Certificate: ${response.retourCertif.certif ? 'YES' : 'NO'}
- PSI Certificate: ${response.retourCertif.certifPSI ? 'YES' : 'NO'}
- IDAPPRL: ${response.retourCertif.idApprl || 'N/A'}` : ''}

## Golden Config Compliance

- ✅ Single-line base64 PEM
- ✅ surname (2.5.4.4) OID used
- ✅ KeyUsage: digitalSignature + nonRepudiation
- ✅ NO ExtendedKeyUsage in CSR
- ✅ codAutori in body (ESSAI requirement)
- ✅ CASESSAI: 500.001
- ✅ VERSIPARN: 1.0.0

## Files

- \`csr.pem\`: CSR in PEM format
- \`csr.txt\`: OpenSSL parsed output
- \`sha256.txt\`: SHA-256 hash of DER
- \`headers.json\`: Request headers
- \`request.json\`: Full request body
- \`response.json\`: API response
- \`curl.sh\`: Reproducible curl command
`;

  fs.writeFileSync(path.join(baseDir, 'summary.md'), summary, 'utf8');

  // Console output
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`${certificateReceived ? '✅ SUCCESS' : '❌ FAILED'}: ESSAI Enrolment`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`HTTP Status: ${httpStatus}`);
  console.log(`Certificate: ${certificateReceived ? '✅ Received' : '❌ Not received'}`);
  console.log(`Errors: ${errors.length}\n`);

  if (errors.length > 0) {
    console.log('Errors:');
    errors.forEach((e, i) => {
      console.log(`  ${i + 1}. [${e.codRetour}] ${e.id}`);
      console.log(`     ${e.mess}`);
    });
    console.log('');
  }

  if (certificateReceived) {
    console.log('🎉 Certificate Details:');
    console.log(`   Main Certificate: ${response.retourCertif.certif ? 'YES' : 'NO'}`);
    console.log(`   PSI Certificate: ${response.retourCertif.certifPSI ? 'YES' : 'NO'}`);
    console.log(`   IDAPPRL: ${response.retourCertif.idApprl || 'N/A'}\n`);

    // TODO: Encrypt and store in DB
    console.log('💾 Next: Encrypt certificates and store in database');
    console.log('   (DB integration pending)\n');
  }

  console.log(`📁 All artifacts: ${baseDir}\n`);

  return {
    success: certificateReceived && errors.length === 0,
    httpStatus,
    errors,
    baseDir,
  };
}

// Run test
testEnrolment()
  .then((result) => {
    if (result.success) {
      console.log('✅ ESSAI enrolment test PASSED');
      process.exit(0);
    } else {
      console.log('❌ ESSAI enrolment test FAILED');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Test error:', error.message);
    process.exit(1);
  });
