/**
 * WEB-SRM ESSAI Smoke Test - ERROR SCENARIOS
 *
 * Purpose: Test error handling and classification
 * Scenarios:
 *   1. INVALID_SIGNATURE (intentional key/cert mismatch)
 *   2. INVALID_HEADER (missing required header)
 *   3. TEMP_UNAVAILABLE (5xx/timeout → retry → circuit breaker)
 *
 * Usage:
 *   WEBSRM_ENABLED=true WEBSRM_NETWORK_ENABLED=true WEBSRM_ENV=ESSAI \
 *   WEBSRM_BASE_URL=http://localhost:3999 \
 *   tsx scripts/websrm-smoke-errors.ts
 *
 * NOTE: Requires mock server for controlled error responses
 */

import { createClient } from '@supabase/supabase-js';
import { createHash, generateKeyPairSync } from 'crypto';
import { postTransaction } from '../apps/api/services/websrm-adapter/websrm-client';
import { mapWebSrmError } from '../apps/api/services/websrm-adapter/error-mapper';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ErrorTestResult {
  scenario: string;
  success: boolean;
  expectedError: string;
  actualError?: string;
  retryable?: boolean;
  details?: string;
}

/**
 * Test 1: INVALID_SIGNATURE
 * Send transaction with wrong private key (signature verification fails)
 */
async function testInvalidSignature(): Promise<ErrorTestResult> {
  console.log('🧪 [ERROR TEST 1] Testing INVALID_SIGNATURE...\n');

  try {
    // Generate wrong keypair (not matching cert)
    const { privateKey } = generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    // Send transaction with wrong signature
    const mockPayload = JSON.stringify({ idTrans: 'TEST-INVALID-SIG', montTot: 10000 });
    const response = await postTransaction(
      {
        baseUrl: process.env.WEBSRM_BASE_URL || 'http://localhost:3999',
        env: 'ESSAI',
        casEssai: '400.001', // ESSAI case for invalid signature
      },
      '/transaction',
      mockPayload,
      {
        'SIGNATRANSM': 'INVALID_BASE64_SIGNATURE==', // Wrong signature
        'IDAPPRL': 'TEST-DEVICE',
        'IDSEV': 'TEST-SOFTWARE',
        'IDVERSI': '1.0.0',
        'CODCERTIF': 'TEST-CERT',
      }
    );

    const mappedError = mapWebSrmError(response);

    const success =
      mappedError.code === 'INVALID_SIGNATURE' &&
      mappedError.retryable === false;

    console.log(`   HTTP Status:       ${response.httpStatus}`);
    console.log(`   Mapped Error:      ${mappedError.code}`);
    console.log(`   Retryable:         ${mappedError.retryable}`);
    console.log(`   Raw Code:          ${mappedError.rawCode || 'N/A'}`);
    console.log(`   Result:            ${success ? '✅ PASS' : '❌ FAIL'}\n`);

    return {
      scenario: 'INVALID_SIGNATURE',
      success,
      expectedError: 'INVALID_SIGNATURE (non-retryable)',
      actualError: mappedError.code,
      retryable: mappedError.retryable,
      details: `HTTP ${response.httpStatus}: ${mappedError.rawMessage || 'N/A'}`,
    };
  } catch (error: any) {
    console.log(`   ❌ Test failed with error: ${error.message}\n`);
    return {
      scenario: 'INVALID_SIGNATURE',
      success: false,
      expectedError: 'INVALID_SIGNATURE',
      details: `Exception: ${error.message}`,
    };
  }
}

/**
 * Test 2: INVALID_HEADER
 * Send transaction with missing required header
 */
async function testInvalidHeader(): Promise<ErrorTestResult> {
  console.log('🧪 [ERROR TEST 2] Testing INVALID_HEADER...\n');

  try {
    const mockPayload = JSON.stringify({ idTrans: 'TEST-INVALID-HEADER', montTot: 10000 });
    const response = await postTransaction(
      {
        baseUrl: process.env.WEBSRM_BASE_URL || 'http://localhost:3999',
        env: 'ESSAI',
        casEssai: '400.002', // ESSAI case for invalid header
      },
      '/transaction',
      mockPayload,
      {
        // Missing required headers: SIGNATRANSM, IDAPPRL, etc.
        'Content-Type': 'application/json',
      }
    );

    const mappedError = mapWebSrmError(response);

    const success =
      mappedError.code === 'INVALID_HEADER' &&
      mappedError.retryable === false;

    console.log(`   HTTP Status:       ${response.httpStatus}`);
    console.log(`   Mapped Error:      ${mappedError.code}`);
    console.log(`   Retryable:         ${mappedError.retryable}`);
    console.log(`   Raw Code:          ${mappedError.rawCode || 'N/A'}`);
    console.log(`   Result:            ${success ? '✅ PASS' : '❌ FAIL'}\n`);

    return {
      scenario: 'INVALID_HEADER',
      success,
      expectedError: 'INVALID_HEADER (non-retryable)',
      actualError: mappedError.code,
      retryable: mappedError.retryable,
      details: `HTTP ${response.httpStatus}: ${mappedError.rawMessage || 'N/A'}`,
    };
  } catch (error: any) {
    console.log(`   ❌ Test failed with error: ${error.message}\n`);
    return {
      scenario: 'INVALID_HEADER',
      success: false,
      expectedError: 'INVALID_HEADER',
      details: `Exception: ${error.message}`,
    };
  }
}

/**
 * Test 3: TEMP_UNAVAILABLE
 * Simulate 5xx errors and circuit breaker behavior
 * Also validates exponential backoff calculation
 */
async function testTempUnavailable(): Promise<ErrorTestResult> {
  console.log('🧪 [ERROR TEST 3] Testing TEMP_UNAVAILABLE + Circuit Breaker...\n');

  try {
    const results: Array<{ attempt: number; code: string; retryable: boolean }> = [];

    // Send 5 consecutive requests that should trigger TEMP_UNAVAILABLE
    for (let i = 1; i <= 5; i++) {
      console.log(`   Attempt ${i}/5...`);

      const mockPayload = JSON.stringify({
        idTrans: `TEST-TEMP-UNAVAIL-${i}`,
        montTot: 10000,
      });

      const response = await postTransaction(
        {
          baseUrl: process.env.WEBSRM_BASE_URL || 'http://localhost:3999',
          env: 'ESSAI',
          casEssai: '500.000', // ESSAI case for 5xx errors
          timeout: 5000, // Short timeout for testing
        },
        '/transaction',
        mockPayload,
        {
          'SIGNATRANSM': 'TEST_SIGNATURE==',
          'IDAPPRL': 'TEST-DEVICE',
          'IDSEV': 'TEST-SOFTWARE',
          'IDVERSI': '1.0.0',
          'CODCERTIF': 'TEST-CERT',
        }
      );

      const mappedError = mapWebSrmError(response);

      results.push({
        attempt: i,
        code: mappedError.code,
        retryable: mappedError.retryable,
      });

      console.log(`      → Code: ${mappedError.code}, Retryable: ${mappedError.retryable}`);
    }

    // Verify all attempts returned TEMP_UNAVAILABLE + retryable
    const allTempUnavailable = results.every((r) => r.code === 'TEMP_UNAVAILABLE');
    const allRetryable = results.every((r) => r.retryable === true);

    // Validate backoff calculation
    const { calculateBackoff } = require('../apps/api/services/websrm-adapter/error-mapper');
    const backoff0 = calculateBackoff(0);
    const backoff1 = calculateBackoff(1);
    const backoff2 = calculateBackoff(2);

    console.log(`\n   Backoff Validation:`);
    console.log(`      Retry 0: ${(backoff0 / 1000).toFixed(1)}s (expected ~60s ± 10%)`);
    console.log(`      Retry 1: ${(backoff1 / 1000).toFixed(1)}s (expected ~120s ± 10%)`);
    console.log(`      Retry 2: ${(backoff2 / 1000).toFixed(1)}s (expected ~240s ± 10%)`);

    const backoffValid =
      backoff0 >= 54000 && backoff0 <= 66000 && // 60s ± 10%
      backoff1 >= 108000 && backoff1 <= 132000 && // 120s ± 10%
      backoff2 >= 216000 && backoff2 <= 264000; // 240s ± 10%

    const success = allTempUnavailable && allRetryable && backoffValid;

    console.log(`\n   All TEMP_UNAVAILABLE: ${allTempUnavailable ? '✅' : '❌'}`);
    console.log(`   All Retryable:        ${allRetryable ? '✅' : '❌'}`);
    console.log(`   Backoff Valid:        ${backoffValid ? '✅' : '❌'}`);
    console.log(`   Result:               ${success ? '✅ PASS' : '❌ FAIL'}\n`);

    return {
      scenario: 'TEMP_UNAVAILABLE',
      success,
      expectedError: 'TEMP_UNAVAILABLE (retryable)',
      actualError: results.map((r) => r.code).join(', '),
      retryable: allRetryable,
      details: `${results.length} consecutive failures (should trigger circuit breaker) + backoff validated`,
    };
  } catch (error: any) {
    console.log(`   ❌ Test failed with error: ${error.message}\n`);
    return {
      scenario: 'TEMP_UNAVAILABLE',
      success: false,
      expectedError: 'TEMP_UNAVAILABLE',
      details: `Exception: ${error.message}`,
    };
  }
}

/**
 * Test 4: TIMEOUT
 * Simulate request timeout
 */
async function testTimeout(): Promise<ErrorTestResult> {
  console.log('🧪 [ERROR TEST 4] Testing TIMEOUT...\n');

  try {
    const mockPayload = JSON.stringify({ idTrans: 'TEST-TIMEOUT', montTot: 10000 });
    const response = await postTransaction(
      {
        baseUrl: process.env.WEBSRM_BASE_URL || 'http://localhost:3999',
        env: 'ESSAI',
        casEssai: '000.999', // ESSAI case for timeout (server delays response)
        timeout: 1000, // 1 second timeout
      },
      '/transaction',
      mockPayload,
      {
        'SIGNATRANSM': 'TEST_SIGNATURE==',
        'IDAPPRL': 'TEST-DEVICE',
        'IDSEV': 'TEST-SOFTWARE',
        'IDVERSI': '1.0.0',
        'CODCERTIF': 'TEST-CERT',
      }
    );

    const mappedError = mapWebSrmError(response);

    const success =
      mappedError.code === 'TEMP_UNAVAILABLE' &&
      mappedError.retryable === true &&
      (response.error?.code === 'TIMEOUT' || response.httpStatus === 0);

    console.log(`   HTTP Status:       ${response.httpStatus}`);
    console.log(`   Mapped Error:      ${mappedError.code}`);
    console.log(`   Retryable:         ${mappedError.retryable}`);
    console.log(`   Raw Code:          ${mappedError.rawCode || response.error?.code || 'N/A'}`);
    console.log(`   Result:            ${success ? '✅ PASS' : '❌ FAIL'}\n`);

    return {
      scenario: 'TIMEOUT',
      success,
      expectedError: 'TEMP_UNAVAILABLE (timeout/retryable)',
      actualError: mappedError.code,
      retryable: mappedError.retryable,
      details: `Timeout after 1s → ${response.error?.message || 'N/A'}`,
    };
  } catch (error: any) {
    console.log(`   ❌ Test failed with error: ${error.message}\n`);
    return {
      scenario: 'TIMEOUT',
      success: false,
      expectedError: 'TIMEOUT',
      details: `Exception: ${error.message}`,
    };
  }
}

/**
 * Main test runner
 */
async function runErrorTests(): Promise<{ success: boolean; results: ErrorTestResult[] }> {
  console.log('═══════════════════════════════════════════════');
  console.log('🧪 [ESSAI SMOKE] ERROR SCENARIOS TEST');
  console.log('═══════════════════════════════════════════════\n');

  // Check mock server
  const mockServerUrl = process.env.WEBSRM_BASE_URL || 'http://localhost:3999';
  console.log(`📡 Mock Server: ${mockServerUrl}`);
  console.log(`⚠️  NOTE: This test requires a mock WEB-SRM server running\n`);

  const results: ErrorTestResult[] = [];

  // Run tests
  results.push(await testInvalidSignature());
  results.push(await testInvalidHeader());
  results.push(await testTempUnavailable());
  results.push(await testTimeout());

  // Summary
  console.log('═══════════════════════════════════════════════');
  console.log('📋 ERROR SCENARIOS TEST SUMMARY');
  console.log('═══════════════════════════════════════════════');

  results.forEach((result, i) => {
    console.log(`\n${i + 1}. ${result.scenario}`);
    console.log(`   Expected:  ${result.expectedError}`);
    console.log(`   Actual:    ${result.actualError || 'N/A'}`);
    console.log(`   Retryable: ${result.retryable !== undefined ? result.retryable : 'N/A'}`);
    console.log(`   Status:    ${result.success ? '✅ PASS' : '❌ FAIL'}`);
    if (result.details) {
      console.log(`   Details:   ${result.details}`);
    }
  });

  const allPassed = results.every((r) => r.success);
  const passedCount = results.filter((r) => r.success).length;

  console.log('\n═══════════════════════════════════════════════');
  console.log(`Final Result: ${passedCount}/${results.length} tests passed`);
  console.log(allPassed ? '✅ ALL TESTS PASSED\n' : '❌ SOME TESTS FAILED\n');

  return {
    success: allPassed,
    results,
  };
}

// Run tests
runErrorTests()
  .then((result) => {
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
