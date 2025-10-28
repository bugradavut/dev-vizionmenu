/**
 * WEB-SRM DEV - /document Smoke Test with mTLS
 *
 * Goal: Verify mTLS authentication and basic request structure
 * Expected: Business/schema validation errors (NOT SSL certificate errors)
 *
 * Endpoint: https://cnfr.api.rq-fo.ca/document
 * Auth: Mutual TLS (client certificate from enrolment)
 * Headers: Same 10+1 set as /utilisateur (DEV, CODAUTORI in header)
 */

import * as fs from 'fs';
import * as path from 'path';
import { createMtlsClient, getCertPaths } from './lib/websrm-mtls-client';

// DEV Headers (same as /utilisateur and /transaction)
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
const DOCUMENT_ENDPOINT = 'https://cnfr.api.rq-fo.ca/document';

// Body variants (minimal skeletons)
const BODY_VARIANTS = {
  V1: {
    // Completely empty
  },
  V2: {
    reqDoc: {}, // Empty reqDoc
  },
  V3: {
    reqDoc: {
      modif: 'AJO', // Add document
      noTax: {
        noTPS: '5678912340',
        noTVQ: '5678912340',
      },
    },
  },
};

interface TestResult {
  variant: string;
  httpStatus: number;
  errors: any[];
  response: any;
  success: boolean;
  mtlsWorked: boolean;
}

async function runTest(variant: keyof typeof BODY_VARIANTS): Promise<TestResult> {
  const body = BODY_VARIANTS[variant];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputDir = path.join('tmp', 'logs', `dev-document-smoke-${timestamp}`, variant);
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing: /document with mTLS - ${variant}`);
  console.log(`URL: ${DOCUMENT_ENDPOINT}`);
  console.log(`${'='.repeat(70)}\n`);

  // Create mTLS client
  const client = createMtlsClient();
  const certPaths = client.getPaths();

  console.log(`🔐 Using mTLS certificates:`);
  console.log(`   Key: ${certPaths.key}`);
  console.log(`   Cert: ${certPaths.cert}`);
  console.log(`   CA: ${certPaths.chain}`);
  console.log(`   TLS Verify: ✅ ENABLED\n`);

  // Save artifacts
  fs.writeFileSync(
    path.join(outputDir, 'headers.json'),
    JSON.stringify(DEV_HEADERS, null, 2),
    'utf8'
  );

  fs.writeFileSync(
    path.join(outputDir, 'request.json'),
    JSON.stringify(body, null, 2),
    'utf8'
  );

  const curlHeaders = Object.entries(DEV_HEADERS)
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(' \\\n  ');

  const curlCommand = `curl -v -X POST "${DOCUMENT_ENDPOINT}" \\\n  --cert ${certPaths.cert} \\\n  --key ${certPaths.key} \\\n  --cacert ${certPaths.chain} \\\n  ${curlHeaders} \\\n  -d '${JSON.stringify(body)}'`;
  fs.writeFileSync(path.join(outputDir, 'curl.sh'), curlCommand, 'utf8');

  // Make API call
  console.log(`🌐 Calling ${DOCUMENT_ENDPOINT} with mTLS...\n`);

  let httpStatus: number;
  let response: any;
  let errors: any[] = [];
  let success = false;
  let mtlsWorked = false;

  try {
    const res = await client.post(DOCUMENT_ENDPOINT, DEV_HEADERS, body);

    httpStatus = res.status;
    response = res.json || {
      error: 'Non-JSON response',
      contentType: res.headers['content-type'],
      preview: res.body.substring(0, 500),
    };

    // Parse errors
    if (response.retourDoc?.listErr) {
      errors = response.retourDoc.listErr;
    }

    // Check if mTLS worked
    const isSSLError =
      res.body.includes('No required SSL certificate') ||
      res.body.includes('certificate required');
    mtlsWorked = !isSSLError;

    success = mtlsWorked && (httpStatus === 200 || httpStatus === 201);
  } catch (err: any) {
    httpStatus = 0;
    response = { error: err.message, stack: err.stack };
    mtlsWorked = false;
  }

  // Save response
  fs.writeFileSync(
    path.join(outputDir, 'response.json'),
    JSON.stringify(response, null, 2),
    'utf8'
  );

  console.log(`📥 Response: HTTP ${httpStatus}`);
  console.log(`   mTLS Auth: ${mtlsWorked ? '✅ YES' : '❌ NO'}`);
  console.log(`   Success: ${success ? '✅ YES' : '❌ NO'}`);
  console.log(`   Errors: ${errors.length}\n`);

  if (errors.length > 0) {
    errors.forEach((err, i) => {
      console.log(`   ${i + 1}. [${err.codRetour || '?'}] ${err.id}:`);
      console.log(`      ${err.mess?.substring(0, 100)}`);
    });
    console.log('');
  }

  // Create summary
  const summary = `# /document Smoke Test - ${variant}

**Timestamp**: ${new Date().toISOString()}
**Endpoint**: ${DOCUMENT_ENDPOINT}
**Result**: ${success ? '✅ SUCCESS' : mtlsWorked ? '⚠️  mTLS OK, validation failed' : '❌ FAILED'}

## mTLS Configuration

**Private Key**: \`${certPaths.key}\`
**Client Certificate**: \`${certPaths.cert}\`
**CA Chain**: \`${certPaths.chain}\`
**TLS Verify**: ✅ ENABLED (\`rejectUnauthorized: true\`)

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
**mTLS Authentication**: ${mtlsWorked ? '✅ Succeeded' : '❌ Failed'}

${
  errors.length > 0
    ? `### Validation Errors (${errors.length})

| # | Error ID | Code | Message |
|---|----------|------|---------|
${errors.map((e, i) => `| ${i + 1} | ${e.id} | ${e.codRetour || 'N/A'} | ${e.mess?.substring(0, 80)} |`).join('\n')}`
    : httpStatus === 200 || httpStatus === 201
      ? '### ✅ Success - No Errors'
      : '### Response Details\n\n```json\n' + JSON.stringify(response, null, 2) + '\n```'
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
    success,
    mtlsWorked,
  };
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  WEB-SRM DEV - /document Smoke Test (mTLS)                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const results: TestResult[] = [];

  // Run all variants
  for (const variant of Object.keys(BODY_VARIANTS) as Array<keyof typeof BODY_VARIANTS>) {
    try {
      const result = await runTest(variant);
      results.push(result);
    } catch (err: any) {
      console.error(`❌ Test ${variant} failed: ${err.message}\n`);
      results.push({
        variant,
        httpStatus: 0,
        errors: [],
        response: { error: err.message },
        success: false,
        mtlsWorked: false,
      });
    }
  }

  // Print summary table
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  SUMMARY TABLE                                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('┌─────────┬────────┬──────────┬─────────┬────────────────────────┐');
  console.log('│ Variant │ Status │ mTLS     │ Result  │ Errors                 │');
  console.log('├─────────┼────────┼──────────┼─────────┼────────────────────────┤');

  for (const result of results) {
    const statusStr = String(result.httpStatus).padEnd(6);
    const mtlsStr = result.mtlsWorked ? '✅ YES  ' : '❌ NO   ';
    const resultStr = result.success ? '✅ PASS' : result.mtlsWorked ? '⚠️  PART' : '❌ FAIL';
    const errSummary =
      result.errors.length > 0
        ? `${result.errors.length} validation errors`
        : result.success
          ? 'None'
          : 'See response';

    console.log(
      `│ ${result.variant.padEnd(7)} │ ${statusStr} │ ${mtlsStr} │ ${resultStr} │ ${errSummary.substring(0, 22).padEnd(22)} │`
    );
  }
  console.log('└─────────┴────────┴──────────┴─────────┴────────────────────────┘\n');

  // Analysis
  console.log('\n📊 Analysis:\n');

  const anyMtlsSuccess = results.some((r) => r.mtlsWorked);
  const anySuccess = results.some((r) => r.success);

  if (anySuccess) {
    console.log(`✅ Full success achieved\n`);
  } else if (anyMtlsSuccess) {
    console.log('⚠️  mTLS authentication works, validation errors expected.');
    console.log('   🎯 Goal achieved: No "SSL certificate required" errors!\n');
  } else {
    console.log('❌ mTLS authentication failed\n');
  }

  // Save report
  const reportPath = path.join('tmp', 'logs', `dev-document-smoke-REPORT-${timestamp}.md`);

  const report = `# WEB-SRM DEV - /document Smoke Test Report

**Generated**: ${new Date().toISOString()}
**Environment**: DEV
**Endpoint**: ${DOCUMENT_ENDPOINT}
**Authentication**: Mutual TLS (mTLS)

## Results Summary

| Variant | HTTP | mTLS Auth | Result | Errors |
|---------|------|-----------|--------|--------|
${results
  .map(
    (r) =>
      `| ${r.variant} | ${r.httpStatus} | ${r.mtlsWorked ? '✅' : '❌'} | ${r.success ? '✅ PASS' : r.mtlsWorked ? '⚠️  PARTIAL' : '❌ FAIL'} | ${r.errors.length} |`
  )
  .join('\n')}

## Conclusion

${
  anySuccess
    ? `✅ Full success achieved.`
    : anyMtlsSuccess
      ? `⚠️  **Smoke test PASSED**: mTLS authentication works.\n\n✅ Client certificate accepted\n✅ Request reaches business logic\n✅ No "SSL certificate required" errors`
      : `❌ mTLS authentication failed.`
}
`;

  fs.writeFileSync(reportPath, report, 'utf8');

  console.log(`📄 Full report: ${reportPath}\n`);

  process.exit(anyMtlsSuccess ? 0 : 1);
}

main().catch((error) => {
  console.error('❌ Test error:', error.message);
  process.exit(1);
});
