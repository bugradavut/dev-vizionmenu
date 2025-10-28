/**
 * WEB-SRM DEV - /utilisateur Endpoint Testing with mTLS
 *
 * Requirements:
 * - Mutual TLS authentication using client certificate from enrolment
 * - URL: https://cnfr.api.rq-fo.ca/utilisateur
 * - Same 10 headers + CODAUTORI (in header, NOT body)
 * - Body variants: V1 (empty), V2 (with gn/ou)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// DEV Headers (same as enrolment)
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
  CODAUTORI: 'D8T8-W8W8', // In header for DEV
};

// Endpoint
const UTILISATEUR_ENDPOINT = 'https://cnfr.api.rq-fo.ca/utilisateur';

// Body variants
const BODY_VARIANTS = {
  V1: {
    reqUtil: {}, // Empty - will show missing fields
  },
  V2: {
    reqUtil: {
      gn: 'ER0001', // Invalid field
      ou: '5678912340TQ0001', // Invalid field
    },
  },
  V3: {
    reqUtil: {
      modif: 'VAL', // VAL for validation? Or CON for consultation?
      noTax: {
        noTPS: '5678912340',
        noTVQ: '5678912340',
      },
    },
  },
};

interface TestResult {
  variant: 'V1' | 'V2' | 'V3';
  httpStatus: number;
  errors: any[];
  response: any;
  outputDir: string;
  success: boolean;
}

async function runTest(variant: 'V1' | 'V2' | 'V3', timestamp: string): Promise<TestResult> {
  const body = BODY_VARIANTS[variant];

  const outputDir = path.join('tmp', 'logs', `dev-utilisateur-mtls-${timestamp}`, variant);
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing: /utilisateur with mTLS - ${variant}`);
  console.log(`URL: ${UTILISATEUR_ENDPOINT}`);
  console.log(`${'='.repeat(70)}\n`);

  // Load mTLS files
  const certDir = path.join('tmp', 'certs');
  const keyPath = path.join(certDir, 'dev-client.key.pem');
  const certPath = path.join(certDir, 'dev-client.crt.pem');
  const chainPath = path.join(certDir, 'dev-client.chain.pem');

  // Verify files exist
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Private key not found: ${keyPath}. Run enrolment first.`);
  }
  if (!fs.existsSync(certPath)) {
    throw new Error(`Certificate not found: ${certPath}. Run enrolment first.`);
  }
  if (!fs.existsSync(chainPath)) {
    throw new Error(`CA chain not found: ${chainPath}. Run enrolment first.`);
  }

  console.log(`🔐 Loading mTLS certificates:`);
  console.log(`   Key: ${keyPath}`);
  console.log(`   Cert: ${certPath}`);
  console.log(`   CA: ${chainPath}\n`);

  // Load certificates
  const privateKey = fs.readFileSync(keyPath, 'utf8');
  const certificate = fs.readFileSync(certPath, 'utf8');
  const ca = fs.readFileSync(chainPath, 'utf8');

  // Save headers
  fs.writeFileSync(
    path.join(outputDir, 'headers.json'),
    JSON.stringify(DEV_HEADERS, null, 2),
    'utf8'
  );

  // Save request body
  fs.writeFileSync(
    path.join(outputDir, 'request.json'),
    JSON.stringify(body, null, 2),
    'utf8'
  );

  // Generate curl command (with mTLS)
  const curlHeaders = Object.entries(DEV_HEADERS)
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(' \\\n  ');

  const curlCommand = `curl -v -X POST "${UTILISATEUR_ENDPOINT}" \\\n  --cert ${certPath} \\\n  --key ${keyPath} \\\n  --cacert ${chainPath} \\\n  ${curlHeaders} \\\n  -d '${JSON.stringify(body)}'`;
  fs.writeFileSync(path.join(outputDir, 'curl.sh'), curlCommand, 'utf8');

  // Make API call with mTLS using native https module
  console.log(`🌐 Calling ${UTILISATEUR_ENDPOINT} with mTLS...\n`);

  let httpStatus: number;
  let response: any;
  let errors: any[] = [];
  let success = false;

  try {
    const url = new URL(UTILISATEUR_ENDPOINT);
    const requestBody = JSON.stringify(body);

    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        ...DEV_HEADERS,
        'Content-Length': Buffer.byteLength(requestBody),
      },
      cert: certificate,
      key: privateKey,
      ca: ca,
      // Temporarily disable server cert verification for testing
      // In production, ensure proper CA bundle is configured
      rejectUnauthorized: false,
    };

    const responseData = await new Promise<{ status: number; body: string; headers: any }>(
      (resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            resolve({
              status: res.statusCode || 0,
              body: data,
              headers: res.headers,
            });
          });
        });

        req.on('error', (err) => {
          reject(err);
        });

        req.write(requestBody);
        req.end();
      }
    );

    httpStatus = responseData.status;

    // Parse response
    const contentType = responseData.headers['content-type'] || '';
    const responseText = responseData.body;

    if (contentType.includes('application/json')) {
      response = JSON.parse(responseText);
    } else {
      response = {
        error: 'Non-JSON response',
        contentType,
        preview: responseText.substring(0, 500),
      };
    }

    // Parse errors
    if (response.retourUtil?.listErr) {
      errors = response.retourUtil.listErr;
    }

    // Check success
    success = httpStatus === 200 || httpStatus === 201;
  } catch (err: any) {
    httpStatus = 0;
    response = { error: err.message, stack: err.stack };
  }

  // Save response
  fs.writeFileSync(
    path.join(outputDir, 'response.json'),
    JSON.stringify(response, null, 2),
    'utf8'
  );

  console.log(`📥 Response: HTTP ${httpStatus}`);
  console.log(`   Success: ${success ? '✅ YES' : '❌ NO'}`);
  console.log(`   Errors: ${errors.length}\n`);

  if (errors.length > 0) {
    errors.forEach((err, i) => {
      console.log(`   ${i + 1}. [${err.codRetour}] ${err.id}:`);
      console.log(`      ${err.mess?.substring(0, 100)}`);
    });
    console.log('');
  }

  // Create summary
  const summary = `# /utilisateur mTLS Test Summary - ${variant}

**Timestamp**: ${new Date().toISOString()}
**Endpoint**: ${UTILISATEUR_ENDPOINT}
**Body Variant**: ${variant}
**Result**: ${success ? '✅ SUCCESS' : '❌ FAILED'}

## mTLS Configuration

**Private Key**: \`${keyPath}\`
**Client Certificate**: \`${certPath}\`
**CA Chain**: \`${chainPath}\`

## Headers
\`\`\`
${Object.entries(DEV_HEADERS)
  .map(([k, v]) => `${k}: ${v}`)
  .join('\n')}
\`\`\`

## Request Body
\`\`\`json
${JSON.stringify(body, null, 2)}
\`\`\`

## Response

**HTTP Status**: ${httpStatus}
**Content-Type**: ${response.contentType || 'application/json'}

${
  errors.length > 0
    ? `### Errors (${errors.length})

${errors
  .map(
    (e, i) => `${i + 1}. **${e.id}** [${e.codRetour}]
   ${e.mess}`
  )
  .join('\n\n')}`
    : success
      ? '### ✅ Success - No Errors'
      : '### Response Details\n\n```json\n' + JSON.stringify(response, null, 2) + '\n```'
}

## Analysis

${
  success
    ? `✅ **Success**: /utilisateur endpoint accepted mTLS authentication and returned ${httpStatus}.`
    : errors.length > 0
      ? `❌ **Failed**: mTLS authentication succeeded but request validation failed.\n\nRequired fields or validation issues:\n${errors.map((e) => `- ${e.id}: ${e.mess}`).join('\n')}`
      : httpStatus === 400 && response.preview?.includes('No required SSL certificate')
        ? `❌ **Failed**: mTLS not properly configured. Server still requesting client certificate.`
        : httpStatus === 403
          ? `❌ **Failed**: 403 Forbidden - Certificate rejected or insufficient permissions.`
          : `❌ **Failed**: HTTP ${httpStatus} - ${response.error || 'Unknown error'}`
}

## Files
- \`headers.json\`: Request headers
- \`request.json\`: Request body
- \`response.json\`: API response
- \`curl.sh\`: Reproducible curl command with mTLS
`;

  fs.writeFileSync(path.join(outputDir, 'summary.md'), summary, 'utf8');

  return {
    variant,
    httpStatus,
    errors,
    response,
    outputDir,
    success,
  };
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  WEB-SRM DEV - /utilisateur Endpoint Testing (mTLS)           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const results: TestResult[] = [];

  // Run all variants
  for (const variant of ['V1', 'V2', 'V3'] as const) {
    try {
      const result = await runTest(variant, timestamp);
      results.push(result);
    } catch (err: any) {
      console.error(`❌ Test ${variant} failed: ${err.message}\n`);
      results.push({
        variant,
        httpStatus: 0,
        errors: [],
        response: { error: err.message },
        outputDir: '',
        success: false,
      });
    }
  }

  // Print summary table
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  SUMMARY TABLE                                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('┌─────────┬────────┬─────────┬────────────────────────────────────┐');
  console.log('│ Variant │ Status │ Result  │ Errors                             │');
  console.log('├─────────┼────────┼─────────┼────────────────────────────────────┤');

  for (const result of results) {
    const statusStr = String(result.httpStatus).padEnd(6);
    const resultStr = result.success ? '✅ PASS' : '❌ FAIL';
    const errSummary =
      result.errors.length > 0
        ? result.errors
            .map((e) => `${e.id}[${e.codRetour}]`)
            .join(', ')
            .substring(0, 32)
        : result.httpStatus === 200 || result.httpStatus === 201
          ? 'None'
          : result.response.error?.substring(0, 32) || 'See response';

    console.log(
      `│ ${result.variant.padEnd(7)} │ ${statusStr} │ ${resultStr} │ ${errSummary.padEnd(34)} │`
    );
  }
  console.log('└─────────┴────────┴─────────┴────────────────────────────────────┘\n');

  // Detailed error reporting
  const errorsFound = results.filter((r) => r.errors.length > 0);
  if (errorsFound.length > 0) {
    console.log('\n📋 Detailed Errors:\n');
    for (const result of errorsFound) {
      console.log(`${result.variant}:`);
      for (const err of result.errors) {
        console.log(`  • [${err.id}] ${err.codRetour}: ${err.mess}`);
      }
      console.log('');
    }
  }

  // Analysis
  console.log('\n📊 Analysis:\n');

  const anySuccess = results.some((r) => r.success);
  const allFailed = results.every((r) => !r.success);

  if (anySuccess) {
    const successResult = results.find((r) => r.success);
    console.log(`✅ Success found with ${successResult?.variant}`);
    console.log(`   HTTP ${successResult?.httpStatus}`);
    console.log(`   Body: ${JSON.stringify(BODY_VARIANTS[successResult!.variant])}\n`);
  } else if (allFailed) {
    console.log('❌ All tests failed\n');

    // Check for common issues
    const sslErrors = results.filter(
      (r) => r.response.preview?.includes('No required SSL certificate')
    );
    const authErrors = results.filter((r) => r.httpStatus === 403);
    const validationErrors = results.filter((r) => r.errors.length > 0);

    if (sslErrors.length > 0) {
      console.log('⚠️  Issue: mTLS not properly configured');
      console.log('   Server still requesting SSL certificate\n');
    } else if (authErrors.length > 0) {
      console.log('⚠️  Issue: 403 Forbidden');
      console.log('   Certificate rejected or insufficient permissions\n');
    } else if (validationErrors.length > 0) {
      console.log('⚠️  Issue: Request validation failed');
      console.log('   mTLS succeeded but request body has issues\n');
      console.log('   Missing required fields:');
      for (const result of validationErrors) {
        for (const err of result.errors) {
          if (err.mess.includes('manquant') || err.mess.includes('obligatoire')) {
            console.log(`   - ${err.mess}`);
          }
        }
      }
      console.log('');
    }
  }

  // Save final report
  const reportPath = path.join('tmp', 'logs', `dev-utilisateur-mtls-REPORT-${timestamp}.md`);

  const report = `# WEB-SRM DEV - /utilisateur mTLS Test Report

**Generated**: ${new Date().toISOString()}
**Environment**: DEV
**Endpoint**: ${UTILISATEUR_ENDPOINT}
**Authentication**: Mutual TLS (mTLS)
**Total Tests**: ${results.length}
**Passed**: ${results.filter((r) => r.success).length}
**Failed**: ${results.filter((r) => !r.success).length}

## Test Results

| Variant | HTTP Status | Result | Errors | Output |
|---------|-------------|--------|--------|--------|
${results
  .map((r) => {
    const errCount = r.errors.length;
    const errSummary =
      errCount > 0 ? r.errors.map((e) => e.id).join(', ') : r.success ? '✅' : 'See response';
    return `| ${r.variant} | ${r.httpStatus} | ${r.success ? '✅ PASS' : '❌ FAIL'} | ${errSummary} | [${path.relative(process.cwd(), r.outputDir)}](${r.outputDir}) |`;
  })
  .join('\n')}

## mTLS Configuration

- **Private Key**: \`tmp/certs/dev-client.key.pem\`
- **Client Certificate**: \`tmp/certs/dev-client.crt.pem\`
- **CA Chain**: \`tmp/certs/dev-client.chain.pem\`

## Detailed Results

${results
  .map((r) => {
    return `### ${r.variant}

**HTTP Status**: ${r.httpStatus}
**Result**: ${r.success ? '✅ SUCCESS' : '❌ FAILED'}
**Errors**: ${r.errors.length}

${
  r.errors.length > 0
    ? r.errors
        .map(
          (e, i) => `${i + 1}. **${e.id}** [${e.codRetour}]
   ${e.mess}`
        )
        .join('\n\n')
    : r.success
      ? '✅ **Success**'
      : '```json\n' + JSON.stringify(r.response, null, 2) + '\n```'
}

---
`;
  })
  .join('\n')}

## Next Steps

${
  anySuccess
    ? `✅ Success achieved with ${results.find((r) => r.success)?.variant}. Use this configuration for /transaction and /document tests.`
    : `❌ All tests failed. Investigate:\n${
        results.some((r) => r.response.preview?.includes('No required SSL certificate'))
          ? '- mTLS configuration (verify cert/key/ca files)\n'
          : ''
      }${results.some((r) => r.httpStatus === 403) ? '- Certificate permissions/validity\n' : ''}${
        results.some((r) => r.errors.length > 0)
          ? '- Required request fields (see error messages)\n'
          : ''
      }`
}
`;

  fs.writeFileSync(reportPath, report, 'utf8');

  console.log(`📄 Full report: ${reportPath}\n`);

  process.exit(anySuccess ? 0 : 1);
}

main().catch((error) => {
  console.error('❌ Test error:', error.message);
  process.exit(1);
});
