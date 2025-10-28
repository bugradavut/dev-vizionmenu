/**
 * WEB-SRM DEV - /utilisateur Endpoint Testing
 *
 * Test Matrix:
 * - URL A: https://cnfr.api.rq-fo.ca/utilisateur
 * - URL B: https://certificats.cnfr.api.rq-fo.ca/utilisateur
 * - Body V1: { reqUtilisateur: { gn: "ER0001", ou: "5678912340TQ0001" } }
 * - Body V2: { reqUtilisateur: { } }
 *
 * NO idApprl field in any variant
 */

import * as fs from 'fs';
import * as path from 'path';

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
  CODAUTORI: 'D8T8-W8W8',
};

// Test matrix
const ENDPOINTS = {
  A: 'https://cnfr.api.rq-fo.ca/utilisateur',
  B: 'https://certificats.cnfr.api.rq-fo.ca/utilisateur',
};

const BODY_VARIANTS = {
  V1: {
    reqUtilisateur: {
      gn: 'ER0001',
      ou: '5678912340TQ0001',
    },
  },
  V2: {
    reqUtilisateur: {},
  },
};

interface TestResult {
  endpoint: 'A' | 'B';
  variant: 'V1' | 'V2';
  url: string;
  httpStatus: number;
  errors: any[];
  response: any;
  outputDir: string;
}

async function runTest(
  endpoint: 'A' | 'B',
  variant: 'V1' | 'V2',
  timestamp: string
): Promise<TestResult> {
  const url = ENDPOINTS[endpoint];
  const body = BODY_VARIANTS[variant];

  const outputDir = path.join(
    'tmp',
    'logs',
    `dev-utilisateur-${timestamp}`,
    `${endpoint}-${variant}`
  );
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing: ${endpoint}-${variant}`);
  console.log(`URL: ${url}`);
  console.log(`${'='.repeat(70)}\n`);

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

  // Generate curl command
  const curlHeaders = Object.entries(DEV_HEADERS)
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(' \\\n  ');

  const curlCommand = `curl -v -X POST "${url}" \\\n  ${curlHeaders} \\\n  -d '${JSON.stringify(body)}'`;
  fs.writeFileSync(path.join(outputDir, 'curl.sh'), curlCommand, 'utf8');

  // Make API call
  let httpStatus: number;
  let response: any;
  let errors: any[] = [];

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: DEV_HEADERS,
      body: JSON.stringify(body),
    });

    httpStatus = res.status;

    // Parse response
    const contentType = res.headers.get('content-type');
    const responseText = await res.text();

    if (contentType?.includes('application/json')) {
      response = JSON.parse(responseText);
    } else {
      response = {
        error: 'Non-JSON response',
        contentType,
        preview: responseText.substring(0, 500),
      };
    }

    // Parse errors
    if (response.retourUtilisateur?.listErr) {
      errors = response.retourUtilisateur.listErr;
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

  // Create summary
  const summary = `# /utilisateur Test Summary - ${endpoint}-${variant}

**Timestamp**: ${new Date().toISOString()}
**Endpoint**: ${endpoint} - ${url}
**Body Variant**: ${variant}

## Configuration

### Headers
\`\`\`
${Object.entries(DEV_HEADERS)
  .map(([k, v]) => `${k}: ${v}`)
  .join('\n')}
\`\`\`

### Request Body
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
    : httpStatus === 200
      ? '### ✅ Success - No Errors'
      : '### Response Details\n\n```json\n' + JSON.stringify(response, null, 2) + '\n```'
}

## Files
- \`headers.json\`: Request headers
- \`request.json\`: Request body
- \`response.json\`: API response
- \`curl.sh\`: Reproducible curl command
`;

  fs.writeFileSync(path.join(outputDir, 'summary.md'), summary, 'utf8');

  return {
    endpoint,
    variant,
    url,
    httpStatus,
    errors,
    response,
    outputDir,
  };
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  WEB-SRM DEV - /utilisateur Endpoint Testing                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const results: TestResult[] = [];

  // Run all combinations
  for (const endpoint of ['A', 'B'] as const) {
    for (const variant of ['V1', 'V2'] as const) {
      const result = await runTest(endpoint, variant, timestamp);
      results.push(result);
    }
  }

  // Print summary table
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  SUMMARY TABLE                                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('┌──────────┬─────┬────────┬────────────────────────────────────────┐');
  console.log('│ Endpoint │ Var │ Status │ Errors                                 │');
  console.log('├──────────┼─────┼────────┼────────────────────────────────────────┤');

  for (const result of results) {
    const errSummary =
      result.errors.length > 0
        ? result.errors
            .map((e) => `${e.id}[${e.codRetour}]: ${e.mess.substring(0, 80)}`)
            .join('; ')
        : result.httpStatus === 200
          ? '✅ Success'
          : result.httpStatus === 403
            ? '403 Forbidden (Azure Gateway)'
            : result.httpStatus === 0
              ? `Network error`
              : `HTTP ${result.httpStatus}`;

    const endpointLabel = `${result.endpoint} (${result.url.includes('cnfr.api.rq-fo.ca') ? 'cnfr' : 'certificats'})`;
    console.log(
      `│ ${endpointLabel.padEnd(8)} │ ${result.variant.padEnd(3)} │ ${String(result.httpStatus).padEnd(6)} │ ${errSummary.substring(0, 38).padEnd(38)} │`
    );
  }
  console.log('└──────────┴─────┴────────┴────────────────────────────────────────┘\n');

  // Detailed error reporting
  const errorsFound = results.filter((r) => r.errors.length > 0);
  if (errorsFound.length > 0) {
    console.log('\n📋 Detailed Errors:\n');
    for (const result of errorsFound) {
      console.log(`${result.endpoint}-${result.variant}: ${result.url}`);
      for (const err of result.errors) {
        console.log(`  • [${err.id}] ${err.codRetour}: ${err.mess}`);
      }
      console.log('');
    }
  }

  // Analysis
  console.log('\n📊 Analysis:\n');

  const aResults = results.filter((r) => r.endpoint === 'A');
  const bResults = results.filter((r) => r.endpoint === 'B');

  const aSuccess = aResults.some((r) => r.httpStatus === 200);
  const bSuccess = bResults.some((r) => r.httpStatus === 200);

  const aAll403 = aResults.every((r) => r.httpStatus === 403);
  const bAll403 = bResults.every((r) => r.httpStatus === 403);

  if (bAll403 && !aAll403) {
    console.log('❌ Endpoint B: All tests returned 403 Forbidden');
    console.log('✅ Recommendation: Drop endpoint B, continue with endpoint A\n');
  }

  if (aSuccess) {
    const successResult = aResults.find((r) => r.httpStatus === 200);
    console.log(`✅ Success found: ${successResult?.endpoint}-${successResult?.variant}`);
    console.log(`   URL: ${successResult?.url}`);
    console.log(`   Body: ${successResult?.variant}\n`);
  }

  // Check for 400 errors with missing field messages
  const missingFields: string[] = [];
  for (const result of results) {
    if (result.httpStatus === 400) {
      for (const err of result.errors) {
        if (err.mess.includes('manquant') || err.mess.includes('obligatoire')) {
          missingFields.push(`${result.endpoint}-${result.variant}: ${err.mess}`);
        }
      }
    }
  }

  if (missingFields.length > 0) {
    console.log('⚠️  Missing Required Fields Detected:\n');
    for (const field of missingFields) {
      console.log(`   ${field}`);
    }
    console.log('\n💡 Suggestion: Run second round with identified required fields\n');
  }

  // Save final report
  const reportPath = path.join('tmp', 'logs', `dev-utilisateur-REPORT-${timestamp}.md`);

  const report = `# WEB-SRM DEV - /utilisateur Endpoint Test Report

**Generated**: ${new Date().toISOString()}
**Environment**: DEV
**Total Tests**: ${results.length}

## Test Matrix

| Endpoint | Variant | URL | HTTP Status | Errors | Output |
|----------|---------|-----|-------------|--------|--------|
${results
  .map((r) => {
    const errCount = r.errors.length;
    const errSummary =
      errCount > 0
        ? r.errors.map((e) => e.id).join(', ')
        : r.httpStatus === 200
          ? '✅'
          : r.httpStatus === 403
            ? '403 Forbidden'
            : 'See response';
    return `| ${r.endpoint} | ${r.variant} | ${r.url} | ${r.httpStatus} | ${errSummary} | [${path.relative(process.cwd(), r.outputDir)}](${r.outputDir}) |`;
  })
  .join('\n')}

## Analysis

### Endpoint A (cnfr.api.rq-fo.ca)
${aResults
  .map((r) => `- ${r.variant}: HTTP ${r.httpStatus} ${r.errors.length > 0 ? `- ${r.errors.length} errors` : ''}`)
  .join('\n')}

### Endpoint B (certificats.cnfr.api.rq-fo.ca)
${bResults
  .map((r) => `- ${r.variant}: HTTP ${r.httpStatus} ${r.errors.length > 0 ? `- ${r.errors.length} errors` : ''}`)
  .join('\n')}

${bAll403 && !aAll403 ? '### ❌ Recommendation\n\nEndpoint B returns 403 Forbidden for all variants. Continue with Endpoint A only.\n' : ''}

${missingFields.length > 0 ? `### ⚠️ Missing Required Fields\n\n${missingFields.map((f) => `- ${f}`).join('\n')}\n` : ''}

## Detailed Results

${results
  .map((r) => {
    return `### ${r.endpoint}-${r.variant}

**URL**: ${r.url}
**HTTP Status**: ${r.httpStatus}
**Errors**: ${r.errors.length}

${
  r.errors.length > 0
    ? r.errors
        .map(
          (e, i) => `${i + 1}. **${e.id}** [${e.codRetour}]
   ${e.mess}`
        )
        .join('\n\n')
    : r.httpStatus === 200
      ? '✅ **Success**'
      : '```json\n' + JSON.stringify(r.response, null, 2) + '\n```'
}

---
`;
  })
  .join('\n')}
`;

  fs.writeFileSync(reportPath, report, 'utf8');

  console.log(`📄 Full report: ${reportPath}\n`);
}

main().catch((error) => {
  console.error('❌ Test error:', error.message);
  process.exit(1);
});
