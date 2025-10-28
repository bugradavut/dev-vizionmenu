/**
 * WEB-SRM DEV - /utilisateur Complete Test
 *
 * Goal: Test /utilisateur with complete, valid payload
 * Expected: HTTP 200 or meaningful business validation (no missing field errors)
 *
 * Endpoint: https://cnfr.api.rq-fo.ca/utilisateur
 * Auth: Mutual TLS
 */

import * as fs from 'fs';
import * as path from 'path';
import { createMtlsClient, getCertPaths } from './lib/websrm-mtls-client';

// Certificate DN values (from golden config)
const CERT_VALUES = {
  CN: '5678912340',           // noTPS
  OU: '5678912340TQ0001',     // noTVQ
  GN: 'ER0001',
  surname: 'Certificat du serveur',
};

// DEV Headers (complete set)
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
  CODAUTORI: 'D8T8-W8W8', // DEV: in header
};

// Endpoint
const ENDPOINT = 'https://cnfr.api.rq-fo.ca/utilisateur';

// Complete request body
const REQUEST_BODY = {
  reqUtil: {
    modif: 'VAL',
    noTax: {
      noTPS: CERT_VALUES.CN,   // 5678912340
      noTVQ: CERT_VALUES.OU,   // 5678912340TQ0001
    },
  },
};

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  WEB-SRM DEV - /utilisateur Complete Test                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputDir = path.join('tmp', 'logs', `dev-utilisateur-complete-${timestamp}`);
  fs.mkdirSync(outputDir, { recursive: true });

  // Create mTLS client
  const client = createMtlsClient();
  const certPaths = client.getPaths();

  console.log(`🔐 Using mTLS certificates:`);
  console.log(`   Key: ${certPaths.key}`);
  console.log(`   Cert: ${certPaths.cert}`);
  console.log(`   CA: ${certPaths.chain}\n`);

  console.log(`📋 Certificate values (from DN):`);
  console.log(`   CN (noTPS): ${CERT_VALUES.CN}`);
  console.log(`   OU (noTVQ): ${CERT_VALUES.OU}`);
  console.log(`   GN: ${CERT_VALUES.GN}\n`);

  // Save artifacts
  fs.writeFileSync(
    path.join(outputDir, 'headers.json'),
    JSON.stringify(DEV_HEADERS, null, 2),
    'utf8'
  );

  fs.writeFileSync(
    path.join(outputDir, 'request.json'),
    JSON.stringify(REQUEST_BODY, null, 2),
    'utf8'
  );

  const curlHeaders = Object.entries(DEV_HEADERS)
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(' \\\n  ');

  const curlCommand = `curl -v -X POST "${ENDPOINT}" \\\n  --cert ${certPaths.cert} \\\n  --key ${certPaths.key} \\\n  --cacert ${certPaths.chain} \\\n  ${curlHeaders} \\\n  -d '${JSON.stringify(REQUEST_BODY)}'`;
  fs.writeFileSync(path.join(outputDir, 'curl.sh'), curlCommand, 'utf8');

  // Make request
  console.log(`🌐 Calling ${ENDPOINT}...\n`);

  let httpStatus: number;
  let response: any;
  let errors: any[] = [];

  try {
    const res = await client.post(ENDPOINT, DEV_HEADERS, REQUEST_BODY);

    httpStatus = res.status;
    response = res.json || {
      error: 'Non-JSON response',
      contentType: res.headers['content-type'],
      preview: res.body.substring(0, 500),
    };

    // Parse errors
    if (response.retourUtil?.listErr) {
      errors = response.retourUtil.listErr;
    }
  } catch (err: any) {
    httpStatus = 0;
    response = { error: err.message };
  }

  // Save response
  fs.writeFileSync(
    path.join(outputDir, 'response.json'),
    JSON.stringify(response, null, 2),
    'utf8'
  );

  // Analyze result
  console.log(`📥 Response: HTTP ${httpStatus}\n`);

  if (httpStatus === 200 || httpStatus === 201) {
    console.log('✅ SUCCESS: Request accepted\n');
  } else if (httpStatus === 400) {
    console.log('⚠️  HTTP 400: Validation errors\n');
  } else {
    console.log('❌ FAILED\n');
  }

  // Print errors
  if (errors.length > 0) {
    console.log(`Errors (${errors.length}):\n`);
    errors.forEach((err, i) => {
      console.log(`${i + 1}. [${err.codRetour || '?'}] ${err.id}`);
      console.log(`   ${err.mess}\n`);
    });
  } else if (httpStatus === 200) {
    console.log('✅ No errors - validation passed\n');
  }

  // Check for missing field errors
  const missingFieldErrors = errors.filter(
    (e) => e.mess?.includes('absent') || e.mess?.includes('manquant')
  );

  if (missingFieldErrors.length > 0) {
    console.log(`❌ Missing field errors detected (${missingFieldErrors.length}):\n`);
    missingFieldErrors.forEach((e) => console.log(`   - ${e.mess}`));
    console.log('');
  } else {
    console.log('✅ No missing field errors\n');
  }

  // Print tax validation result
  if (response.retourUtil?.noTax) {
    console.log('📊 Tax Validation Result:\n');
    console.log(`   noTPS: ${response.retourUtil.noTax.noTPS}`);
    console.log(`   noTVQ: ${response.retourUtil.noTax.noTVQ}\n`);

    if (
      response.retourUtil.noTax.noTPS === 'VAL' ||
      response.retourUtil.noTax.noTVQ === 'VAL'
    ) {
      console.log('✅ Tax numbers validated successfully\n');
    } else if (
      response.retourUtil.noTax.noTPS === 'INV' ||
      response.retourUtil.noTax.noTVQ === 'INV'
    ) {
      console.log('⚠️  Tax numbers invalid (expected for test data)\n');
    }
  }

  // Create summary
  const summary = `# /utilisateur Complete Test Summary

**Timestamp**: ${new Date().toISOString()}
**Endpoint**: ${ENDPOINT}
**HTTP Status**: ${httpStatus}
**Result**: ${httpStatus === 200 ? '✅ SUCCESS' : httpStatus === 400 ? '⚠️  VALIDATION ERRORS' : '❌ FAILED'}

## Certificate Values (DN)

- **CN** (noTPS): ${CERT_VALUES.CN}
- **OU** (noTVQ): ${CERT_VALUES.OU}
- **GN**: ${CERT_VALUES.GN}
- **surname**: ${CERT_VALUES.surname}

## mTLS Configuration

- **Private Key**: \`${certPaths.key}\`
- **Client Certificate**: \`${certPaths.cert}\`
- **CA Chain**: \`${certPaths.chain}\`

## Headers

\`\`\`json
${JSON.stringify(DEV_HEADERS, null, 2)}
\`\`\`

## Request Body

\`\`\`json
${JSON.stringify(REQUEST_BODY, null, 2)}
\`\`\`

## Response

\`\`\`json
${JSON.stringify(response, null, 2)}
\`\`\`

## Validation Result

${
  errors.length === 0
    ? '✅ **No errors** - Request validation passed'
    : `### Errors (${errors.length})

| # | ID | Code | Message |
|---|----|----|---------|
${errors.map((e, i) => `| ${i + 1} | ${e.id} | ${e.codRetour || 'N/A'} | ${e.mess?.substring(0, 80)} |`).join('\n')}`
}

${
  missingFieldErrors.length > 0
    ? `### ❌ Missing Field Errors (${missingFieldErrors.length})

${missingFieldErrors.map((e) => `- ${e.mess}`).join('\n')}`
    : '### ✅ No Missing Field Errors'
}

${
  response.retourUtil?.noTax
    ? `### Tax Validation Result

- **noTPS**: ${response.retourUtil.noTax.noTPS}
- **noTVQ**: ${response.retourUtil.noTax.noTVQ}

${
  response.retourUtil.noTax.noTPS === 'VAL' || response.retourUtil.noTax.noTVQ === 'VAL'
    ? '✅ Tax numbers **validated** successfully'
    : response.retourUtil.noTax.noTPS === 'INV' || response.retourUtil.noTax.noTVQ === 'INV'
      ? '⚠️  Tax numbers **invalid** (expected for test data - numbers not registered in RQ system)'
      : ''
}`
    : ''
}

## Files

- \`headers.json\`: Request headers
- \`request.json\`: Request body
- \`response.json\`: API response
- \`curl.sh\`: Reproducible curl command with mTLS
`;

  fs.writeFileSync(path.join(outputDir, 'summary.md'), summary, 'utf8');

  console.log(`📄 Summary saved: ${outputDir}/summary.md\n`);

  // Exit code
  const success = httpStatus === 200 || (httpStatus === 400 && missingFieldErrors.length === 0);
  process.exit(success ? 0 : 1);
}

main().catch((error) => {
  console.error('❌ Test error:', error.message);
  process.exit(1);
});
