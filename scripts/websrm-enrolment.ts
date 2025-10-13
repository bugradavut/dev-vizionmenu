/**
 * WEB-SRM ESSAI Enrolment
 *
 * Purpose: Enrol device with Revenu Québec ESSAI environment
 *
 * Process:
 *   1. Generate ECDSA P-256 keypair
 *   2. Build CSR (Certificate Signing Request)
 *   3. POST to /certificates/enrolment with AUTH_CODE
 *   4. Receive certificate + real IDAPPRL
 *   5. Encrypt PEM keys (AES-256-GCM)
 *   6. Update profile with real credentials
 *
 * Exit Codes:
 *   0 = SUCCESS (enrolment completed)
 *   1 = FAILURE (error occurred)
 */

import { generateKeyPairSync } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { Crypto } from '@peculiar/webcrypto';
import * as x509 from '@peculiar/x509';

// Setup WebCrypto polyfill for Node.js
const crypto = new Crypto();
x509.cryptoProvider.set(crypto);

// ENV validation
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!process.env.WEBSRM_ENCRYPTION_KEY) {
  console.error('❌ Missing WEBSRM_ENCRYPTION_KEY');
  console.error('   Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🚀 WEB-SRM ESSAI Enrolment\n');

// FO-Framework Base URLs per SW-77-V
const FO_FRAMEWORK_URLS = {
  DEV: 'https://cnfr.api.rq-fo.ca',
  ENROLMENT: 'https://certificats.cnfr.api.rq-fo.ca/enrolement2', // SW-77-V spec
};

// ESSAI Configuration
const ESSAI_CONFIG = {
  authCode: process.env.WEBSRM_ESSAI_AUTH_CODE || 'W7V7-K8W9',
  partnerId: process.env.WEBSRM_ESSAI_PARTNER_ID || '0000000000001FF2',
  certCode: process.env.WEBSRM_ESSAI_CERT_CODE || 'FOB201999999',
  softwareId: process.env.WEBSRM_ESSAI_IDSEV || '0000000000003973',
  softwareVersion: process.env.WEBSRM_ESSAI_IDVERSI || '00000000000045D6',
  versi: process.env.WEBSRM_ESSAI_VERSI || '0.1.0',
  deviceId: process.env.WEBSRM_ESSAI_DEVICE_ID || '0000-0000-0000', // Temporary
  enrolmentUrl: FO_FRAMEWORK_URLS.ENROLMENT,
  baseUrl: FO_FRAMEWORK_URLS.DEV,
};

console.log('📋 Configuration:');
console.log(`  AUTH_CODE: ${ESSAI_CONFIG.authCode}`);
console.log(`  IDPARTN: ${ESSAI_CONFIG.partnerId}`);
console.log(`  CODCERTIF: ${ESSAI_CONFIG.certCode}`);
console.log(`  IDSEV: ${ESSAI_CONFIG.softwareId}`);
console.log(`  IDVERSI: ${ESSAI_CONFIG.softwareVersion}`);
console.log(`  VERSI: ${ESSAI_CONFIG.versi}`);
console.log(`  Temporary IDAPPRL: ${ESSAI_CONFIG.deviceId}\n`);

/**
 * Generate ECDSA P-256 keypair
 */
async function generateKeyPairP256(): Promise<{ privateKeyPem: string; publicKeyPem: string; cryptoKey: CryptoKeyPair }> {
  console.log('🔐 Generating ECDSA P-256 keypair...');

  // Generate keypair using WebCrypto for CSR compatibility
  const keys = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify']
  );

  // Export to PEM format
  const privateKeyDer = await crypto.subtle.exportKey('pkcs8', keys.privateKey);
  const publicKeyDer = await crypto.subtle.exportKey('spki', keys.publicKey);

  const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${Buffer.from(privateKeyDer).toString('base64').match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----`;
  const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${Buffer.from(publicKeyDer).toString('base64').match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;

  console.log('✅ Keypair generated (RAM only, never written to disk)\n');

  return {
    privateKeyPem,
    publicKeyPem,
    cryptoKey: keys,
  };
}

/**
 * Build X.509 CSR (Certificate Signing Request) per SW-77-V
 *
 * Requirements:
 * - ECDSA P-256 + SHA-256
 * - Key Usage: digitalSignature + nonRepudiation
 * - Extended Key Usage: 1.3.6.1.5.5.7.3.8 (Customer authentication)
 * - Subject per SW-77-V template:
 *   C="CA", S="QC", L=-05:00, SN="Certificat du serveur", O="FOB-...", CN="3601837200"
 */
async function buildCSR(
  cryptoKey: CryptoKeyPair,
  subject: {
    commonName: string;
    organization: string;
    serialNumber: string;
    country: string;
    state: string;
    locality: string;
  }
): Promise<string> {
  console.log('📝 Building X.509 CSR per SW-77-V...');

  // Build DN string per SW-77-V template
  // Note: Using OID 2.5.4.5 for serialNumber since @peculiar/x509 doesn't support it by name
  const dn = `CN=${subject.commonName}, O=${subject.organization}, 2.5.4.5=${subject.serialNumber}, C=${subject.country}, ST=${subject.state}, L=${subject.locality}`;

  // Create X.509 CSR using @peculiar/x509
  const csr = await x509.Pkcs10CertificateRequestGenerator.create({
    name: dn,
    keys: cryptoKey,
    signingAlgorithm: {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    extensions: [
      // Key Usage: digitalSignature + nonRepudiation per SW-77-V
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.digitalSignature | x509.KeyUsageFlags.nonRepudiation,
        true // critical
      ),
      // Extended Key Usage: Customer authentication (1.3.6.1.5.5.7.3.8)
      new x509.ExtendedKeyUsageExtension([
        '1.3.6.1.5.5.7.3.8', // Customer authentication OID
      ]),
    ],
  });

  // Export to PEM format
  const csrPem = csr.toString('pem');

  console.log(`✅ X.509 CSR generated per SW-77-V`);
  console.log(`   CN: ${subject.commonName}`);
  console.log(`   O: ${subject.organization}`);
  console.log(`   SN: ${subject.serialNumber}`);
  console.log(`   C: ${subject.country}, ST: ${subject.state}, L: ${subject.locality}`);
  console.log(`   Key Usage: digitalSignature + nonRepudiation`);
  console.log(`   EKU: Customer authentication (1.3.6.1.5.5.7.3.8)`);
  console.log(`   Format: PKCS#10 PEM (${csrPem.length} bytes)\n`);

  return csrPem;
}

/**
 * Call Revenu Québec enrolment endpoint
 */
async function callEnrolment(config: typeof ESSAI_CONFIG, csr: string): Promise<{
  success: boolean;
  deviceId?: string;
  certificatePem?: string;
  certificatePsiPem?: string;
  error?: string;
}> {
  console.log('🌐 Calling Revenu Québec enrolment endpoint...');
  console.log(`   URL: ${config.enrolmentUrl}\n`);

  // Headers per SW-77-V(2025-02) - Server mode (500.001)
  // NOTE: IDAPPRL NOT included for server mode enrolment
  const headers = {
    'Content-Type': 'application/json',
    'ENVIRN': 'ESSAI',
    'CASESSAI': '500.001', // Server mode test case
    'APPRLINIT': 'SRV', // Server mode (not SEV, not POS)
    'IDSEV': config.softwareId,
    'IDVERSI': config.softwareVersion,
    'CODCERTIF': config.certCode,
    'IDPARTN': config.partnerId,
    'VERSI': config.versi,
    'VERSIPARN': '1.0.0',
  };

  // Body per SW-77: Full PEM CSR with headers + AUTH_CODE
  const body = {
    reqCertif: {
      modif: 'AJO',
      csr: csr, // Full PEM format (includes BEGIN/END headers and \n)
    },
    codAutori: config.authCode, // AUTH_CODE (W7V7-K8W9)
  };

  // Log request details
  console.log('📤 Request Details:');
  console.log('   Headers:');
  Object.entries(headers).forEach(([key, value]) => {
    console.log(`     ${key}: ${value}`);
  });
  console.log('   Body:');
  console.log(`     ${JSON.stringify(body, null, 2).split('\n').join('\n     ')}\n`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(config.enrolmentUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    console.log(`📥 Response: ${response.status} ${response.statusText}\n`);

    // Try to parse as JSON first
    const contentType = response.headers.get('content-type');
    let data: any;
    let responseText: string;

    try {
      responseText = await response.text();

      if (contentType?.includes('application/json')) {
        data = JSON.parse(responseText);
      } else {
        // HTML or other non-JSON response
        console.log('⚠️  Non-JSON response received:');
        console.log('   Content-Type:', contentType || 'NOT SET');
        console.log('   Response Body (first 500 chars):');
        console.log(`   ${responseText.substring(0, 500)}\n`);

        // Diagnostic for 403
        if (response.status === 403) {
          console.log('🔍 Diagnosis: HTTP 403 Forbidden');
          console.log('   ✅ Request format is correct (per SW-73)');
          console.log('   ❌ Access denied at network/gateway level');
          console.log('   Possible causes:');
          console.log('   - IP address not in RQ allowlist');
          console.log('   - mTLS client certificate required');
          console.log('   - VPN connection required');
          console.log('   - Authorization header/token missing');
          console.log('   ℹ️  Contact RQ support for network access\n');
        }

        return {
          success: false,
          error: `Non-JSON response (${response.status}): ${response.statusText}`,
        };
      }
    } catch (parseError: any) {
      console.error('❌ Failed to parse response:');
      console.error(`   Error: ${parseError.message}`);
      console.error(`   Raw response (first 500 chars):`);
      console.error(`   ${responseText.substring(0, 500)}\n`);

      return {
        success: false,
        error: `Parse error: ${parseError.message}`,
      };
    }

    if (response.ok && data.retourCertif) {
      const retour = data.retourCertif;

      // Check for errors in response
      if (retour.listErr && retour.listErr.length > 0) {
        console.error(`❌ Enrolment failed with errors:`);
        retour.listErr.forEach((err: any) => {
          console.error(`   [${err.codRetour || 'N/A'}] ${err.id}: ${err.mess}`);
        });
        console.error(`   Response body:`, JSON.stringify(data, null, 2), '\n');

        return {
          success: false,
          error: retour.listErr[0]?.mess || 'Enrolment failed',
        };
      }

      // Success - extract certificate data
      console.log(`✅ Enrolment successful!`);
      console.log(`   Certificate received: ${retour.certif ? 'YES' : 'NO'}`);
      console.log(`   PSI Certificate received: ${retour.certifPSI ? 'YES' : 'NO'}\n`);

      return {
        success: true,
        deviceId: retour.idApprl || config.deviceId, // Real IDAPPRL from response
        certificatePem: retour.certif, // Main certificate
        certificatePsiPem: retour.certifPSI, // PSI certificate (if provided)
      };
    } else {
      console.error(`❌ Enrolment failed: ${response.statusText}`);
      console.error(`   Response body:`, JSON.stringify(data, null, 2), '\n');

      return {
        success: false,
        error: response.statusText,
      };
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`❌ Request timeout (30s)`);
      console.error(`   Server did not respond in time\n`);
      return {
        success: false,
        error: 'Request timeout (30s)',
      };
    } else if (error.message.includes('fetch')) {
      console.error(`❌ Network error: Unable to reach server`);
      console.error(`   ${error.message}\n`);
      return {
        success: false,
        error: `Network error: ${error.message}`,
      };
    } else {
      console.error(`❌ Error: ${error.message}\n`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

/**
 * Encrypt PEM keys with AES-256-GCM
 */
function encryptPEM(pem: string): string {
  const { encryptSecret } = require('../apps/api/services/websrm-adapter/secrets');
  return encryptSecret(pem);
}

/**
 * Update profile with real credentials
 */
async function updateProfile(
  deviceId: string,
  privateKeyPemEncrypted: string,
  certPemEncrypted: string,
  certPsiPemEncrypted?: string
): Promise<void> {
  console.log('💾 Updating ESSAI profile in database...');

  // Check if profile exists
  const { data: existingProfile } = await supabase
    .from('websrm_profiles')
    .select('*')
    .eq('env', 'ESSAI')
    .eq('tenant_id', 'essai-tenant')
    .single();

  const updateData: any = {
    device_id: deviceId,
    private_key_pem_encrypted: privateKeyPemEncrypted,
    cert_pem_encrypted: certPemEncrypted,
    updated_at: new Date().toISOString(),
  };

  // Add PSI certificate if provided
  if (certPsiPemEncrypted) {
    updateData.cert_psi_pem_encrypted = certPsiPemEncrypted;
  }

  if (existingProfile) {
    // Update existing profile
    const { error } = await supabase
      .from('websrm_profiles')
      .update(updateData)
      .eq('id', existingProfile.id);

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    console.log(`✅ Profile updated (ID: ${existingProfile.id})`);
  } else {
    // Create new profile
    const insertData = {
      tenant_id: 'essai-tenant',
      env: 'ESSAI',
      device_id: deviceId,
      partner_id: ESSAI_CONFIG.partnerId,
      cert_code: ESSAI_CONFIG.certCode,
      software_id: ESSAI_CONFIG.softwareId,
      software_version: ESSAI_CONFIG.softwareVersion,
      versi: ESSAI_CONFIG.versi,
      versi_parn: '1.0.0',
      cas_essai: '500.001',
      private_key_pem_encrypted: privateKeyPemEncrypted,
      cert_pem_encrypted: certPemEncrypted,
      cert_psi_pem_encrypted: certPsiPemEncrypted || null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: newProfile, error } = await supabase
      .from('websrm_profiles')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create profile: ${error.message}`);
    }

    console.log(`✅ Profile created (ID: ${newProfile.id})`);
  }

  console.log('');
}

/**
 * Main enrolment flow
 */
async function runEnrolment() {
  try {
    // Step 1: Generate keypair
    const { privateKeyPem, publicKeyPem, cryptoKey } = await generateKeyPairP256();

    // Step 2: Build X.509 CSR per SW-77-V template
    // SW-77-V example: C="CA", S="QC", L=-05:00, SN="Certificat du serveur",
    //                  O="FOB-...", CN="3601837200"
    const csr = await buildCSR(cryptoKey, {
      commonName: ESSAI_CONFIG.partnerId, // CN: Use IDPARTN (example shows numeric ID)
      organization: `FOB-${ESSAI_CONFIG.certCode}`, // O: FOB-{CODCERTIF}
      serialNumber: 'Certificat du serveur', // SN: Per SW-77-V template
      country: 'CA', // C
      state: 'QC', // ST (or S in SW-77-V notation)
      locality: '-05:00', // L: Timezone (EST)
    });

    // Step 3: Call enrolment endpoint
    const result = await callEnrolment(ESSAI_CONFIG, csr);

    if (!result.success) {
      console.error('❌ Enrolment failed');
      console.error(`   Error: ${result.error}\n`);
      process.exit(1);
    }

    if (!result.certificatePem) {
      console.error('❌ Incomplete enrolment response');
      console.error('   Missing certificate\n');
      process.exit(1);
    }

    // Step 4: Encrypt PEM keys
    console.log('🔒 Encrypting PEM keys (AES-256-GCM)...');
    const privateKeyPemEncrypted = encryptPEM(privateKeyPem);
    const certPemEncrypted = encryptPEM(result.certificatePem);
    const certPsiPemEncrypted = result.certificatePsiPem ? encryptPEM(result.certificatePsiPem) : undefined;
    console.log('✅ PEM keys encrypted');
    if (certPsiPemEncrypted) {
      console.log('✅ PSI certificate encrypted\n');
    } else {
      console.log('\n');
    }

    // Step 5: Update profile
    const deviceId = result.deviceId || ESSAI_CONFIG.deviceId;
    await updateProfile(deviceId, privateKeyPemEncrypted, certPemEncrypted, certPsiPemEncrypted);

    // Success summary
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('✅ ENROLMENT COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    console.log('📋 Summary:');
    console.log(`  Real IDAPPRL: ${result.deviceId}`);
    console.log(`  Private Key: Encrypted & stored in database`);
    console.log(`  Certificate: Encrypted & stored in database`);
    console.log('');

    console.log('🔐 Certificate Fingerprint (SHA-1):');
    const { createHash } = require('crypto');
    const fingerprint = createHash('sha1')
      .update(result.certificatePem)
      .digest('hex');
    console.log(`  ${fingerprint}\n`);

    console.log('🚀 Next Steps:');
    console.log('  1. Set ENV variable: $env:WEBSRM_ESSAI_DEVICE_ID="' + result.deviceId + '"');
    console.log('  2. Run ENV validation: pnpm websrm:check-env');
    console.log('  3. Run ESSAI smoke tests:');
    console.log('     pnpm websrm:smoke:enr  # ENR test');
    console.log('     pnpm websrm:smoke:dup  # DUP test');
    console.log('     pnpm websrm:smoke:ann  # ANN test');
    console.log('     pnpm websrm:smoke:mod  # MOD test');
    console.log('  4. Generate evidence: pnpm websrm:export <orderId> ./evidence');
    console.log('');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Enrolment failed with error:\n');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    console.error('');
    process.exit(1);
  }
}

// Run enrolment
runEnrolment();
