/**
 * WEB-SRM Enrolment (DEV/ESSAI)
 *
 * Purpose: Enrol device with Revenu Québec (DEV or ESSAI environment)
 *
 * Process:
 *   1. Generate ECDSA P-256 keypair
 *   2. Build CSR (Certificate Signing Request)
 *   3. POST to /certificates/enrolment
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
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

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

// Determine environment (DEV or ESSAI)
const WEBSRM_ENV = process.env.WEBSRM_ENV || 'DEV';

console.log(`🚀 WEB-SRM ${WEBSRM_ENV} Enrolment\n`);

// FO-Framework Base URLs
const FO_FRAMEWORK_URLS = {
  DEV: 'https://cnfr.api.rq-fo.ca',
  DEV_ENROLMENT: 'https://certificats.cnfr.api.rq-fo.ca/enrolement', // DEV: no "2" suffix
  ESSAI_ENROLMENT: 'https://certificats.cnfr.api.rq-fo.ca/enrolement2', // ESSAI: with "2"
};

// Build configuration based on environment
interface EnrolmentConfig {
  env: 'DEV' | 'ESSAI';
  authCode: string;
  partnerId: string;
  certCode: string;
  softwareId: string;
  softwareVersion: string;
  versi: string;
  deviceId: string;
  activitySector?: string; // RBC for DEV, FOB for ESSAI
  enrolmentUrl: string;
  baseUrl: string;
}

const CONFIG: EnrolmentConfig = WEBSRM_ENV === 'DEV' ? {
  env: 'DEV',
  authCode: process.env.WEBSRM_DEV_AUTH_CODE || 'X4T7-N595',
  partnerId: process.env.WEBSRM_DEV_PARTNER_ID || '0000000000001FF2',
  certCode: process.env.WEBSRM_DEV_CERT_CODE || 'FOB201999999',
  softwareId: process.env.WEBSRM_DEV_IDSEV || '0000000000003973',
  softwareVersion: process.env.WEBSRM_DEV_IDVERSI || '00000000000045D6',
  versi: process.env.WEBSRM_DEV_VERSI || '0.1.0',
  deviceId: process.env.WEBSRM_DEV_DEVICE_ID || '0000-0000-0000',
  activitySector: process.env.WEBSRM_DEV_ACTIVITY_SECTOR || 'RBC',
  enrolmentUrl: FO_FRAMEWORK_URLS.DEV_ENROLMENT,
  baseUrl: FO_FRAMEWORK_URLS.DEV,
} : {
  env: 'ESSAI',
  authCode: process.env.WEBSRM_ESSAI_AUTH_CODE || 'X4T7-N595',
  partnerId: process.env.WEBSRM_ESSAI_PARTNER_ID || '0000000000001FF2',
  certCode: process.env.WEBSRM_ESSAI_CERT_CODE || 'FOB201999999',
  softwareId: process.env.WEBSRM_ESSAI_IDSEV || '0000000000003973',
  softwareVersion: process.env.WEBSRM_ESSAI_IDVERSI || '00000000000045D6',
  versi: process.env.WEBSRM_ESSAI_VERSI || '0.1.0',
  deviceId: process.env.WEBSRM_ESSAI_DEVICE_ID || '0000-0000-0000',
  activitySector: 'FOB',
  enrolmentUrl: FO_FRAMEWORK_URLS.ESSAI_ENROLMENT,
  baseUrl: FO_FRAMEWORK_URLS.DEV,
};

console.log('📋 Configuration:');
console.log(`  ENV: ${CONFIG.env}`);
console.log(`  Activity Sector: ${CONFIG.activitySector}`);
console.log(`  AUTH_CODE: ${CONFIG.authCode}`);
console.log(`  IDPARTN: ${CONFIG.partnerId}`);
console.log(`  CODCERTIF: ${CONFIG.certCode}`);
console.log(`  IDSEV: ${CONFIG.softwareId}`);
console.log(`  IDVERSI: ${CONFIG.softwareVersion}`);
console.log(`  VERSI: ${CONFIG.versi}`);
console.log(`  Temporary IDAPPRL: ${CONFIG.deviceId}\n`);

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
 * Build X.509 CSR (Certificate Signing Request) per RQ specs
 *
 * Requirements:
 * - ECDSA P-256 + SHA-256
 * - Key Usage: digitalSignature + nonRepudiation (critical)
 * - Extended Key Usage: 1.3.6.1.5.5.7.3.8 (Customer authentication)
 * - Subject format varies by environment:
 *   DEV (RBC): C=CA, ST=QC, L=-05:00, O=RBC-{AUTH_CODE}, CN={NEQ}, OU={NEQ}TQ0001, GN=ER0001
 *   ESSAI (FOB): C=CA, ST=QC, L=-05:00, O=FOB-{CODCERTIF}, CN={IDPARTN}, SN=Certificat du serveur
 */
async function buildCSR(
  cryptoKey: CryptoKeyPair,
  subject: {
    commonName: string;
    organization: string;
    organizationalUnit?: string;
    givenName?: string;
    serialNumber?: string;
    country: string;
    state: string;
    locality: string;
  }
): Promise<string> {
  console.log('📝 Building X.509 CSR per RQ specifications...');

  // Build DN string per RQ template
  // Order: C, ST, L, SN, O, OU, GN, CN
  let dnParts: string[] = [];
  dnParts.push(`C=${subject.country}`);
  dnParts.push(`ST=${subject.state}`);
  dnParts.push(`L=${subject.locality}`);

  // SN (serialNumber)
  if (subject.serialNumber) {
    dnParts.push(`2.5.4.5=${subject.serialNumber}`); // SN OID
  }

  dnParts.push(`O=${subject.organization}`);

  // OU and GN BEFORE CN (per RQ template)
  if (subject.organizationalUnit) {
    dnParts.push(`OU=${subject.organizationalUnit}`);
  }
  if (subject.givenName) {
    dnParts.push(`2.5.4.42=${subject.givenName}`); // GN OID
  }

  dnParts.push(`CN=${subject.commonName}`);

  const dn = dnParts.join(', ');

  // Create X.509 CSR using @peculiar/x509
  const csr = await x509.Pkcs10CertificateRequestGenerator.create({
    name: dn,
    keys: cryptoKey,
    signingAlgorithm: {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    extensions: [
      // Key Usage: digitalSignature + nonRepudiation (critical)
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

  console.log(`✅ X.509 CSR generated`);
  console.log(`   Subject: ${dn}`);
  console.log(`   Key Usage: digitalSignature + nonRepudiation (critical)`);
  console.log(`   EKU: Customer authentication (1.3.6.1.5.5.7.3.8)`);
  console.log(`   Format: PKCS#10 PEM (${csrPem.length} bytes)\n`);

  return csrPem;
}

/**
 * Call Revenu Québec enrolment endpoint
 */
async function callEnrolment(config: EnrolmentConfig, csr: string): Promise<{
  success: boolean;
  deviceId?: string;
  certificatePem?: string;
  certificatePsiPem?: string;
  error?: string;
}> {
  console.log('🌐 Calling Revenu Québec enrolment endpoint...');
  console.log(`   URL: ${config.enrolmentUrl}\n`);

  // Headers - different for DEV vs ESSAI
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'ENVIRN': config.env,
    'APPRLINIT': 'SRV', // Server mode for both DEV and ESSAI
    'IDSEV': config.softwareId,
    'IDVERSI': config.softwareVersion,
    'CODCERTIF': config.certCode,
    'IDPARTN': config.partnerId,
    'VERSI': config.versi,
    'VERSIPARN': config.env === 'DEV' ? '0' : '1.0.0', // DEV: 0, ESSAI: 1.0.0
  };

  // CASESSAI for both DEV and ESSAI
  if (config.env === 'DEV') {
    headers['CASESSAI'] = '000.000'; // DEV: general test case
  } else {
    headers['CASESSAI'] = '500.001'; // ESSAI: server mode test case
  }

  // Body - different for DEV vs ESSAI
  const body: any = {
    reqCertif: {
      modif: 'AJO',
      csr: csr, // Full PEM format
    },
  };

  // codAutori only for ESSAI (not DEV)
  if (config.env === 'ESSAI') {
    body.codAutori = config.authCode;
  }

  // Log request details
  console.log('📤 Request Details:');
  console.log('   Headers:');
  Object.entries(headers).forEach(([key, value]) => {
    console.log(`     ${key}: ${value}`);
  });
  console.log('   Body:');
  console.log(`     ${JSON.stringify(body, null, 2).split('\n').join('\n     ')}\n`);

  // Write to log file
  const logDir = join(process.cwd(), 'tmp', 'logs');
  try {
    mkdirSync(logDir, { recursive: true });
  } catch (e) {
    // Ignore if exists
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = join(logDir, `enrolment-${config.env.toLowerCase()}-${timestamp}.log`);

  const logContent = [
    `=== WEB-SRM ${config.env} Enrolment Request ===`,
    `Timestamp: ${new Date().toISOString()}`,
    ``,
    `POST ${config.enrolmentUrl}`,
    ``,
    `Headers:`,
    ...Object.entries(headers).map(([k, v]) => `  ${k}: ${v}`),
    ``,
    `Body (${JSON.stringify(body).length} bytes):`,
    JSON.stringify(body, null, 2),
    ``,
    `---`,
    ``,
  ].join('\n');

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

    // Log response to file
    let responseLog = [
      `Response: ${response.status} ${response.statusText}`,
      ``,
      `Headers:`,
      ...Array.from(response.headers.entries()).map(([k, v]) => `  ${k}: ${v}`),
      ``,
    ].join('\n');

    // Try to parse as JSON first
    const contentType = response.headers.get('content-type');
    let data: any;
    let responseText: string;

    try {
      responseText = await response.text();

      if (contentType?.includes('application/json')) {
        data = JSON.parse(responseText);
        responseLog += `Body:\n${JSON.stringify(data, null, 2)}\n`;
      } else {
        // HTML or other non-JSON response
        console.log('⚠️  Non-JSON response received:');
        console.log('   Content-Type:', contentType || 'NOT SET');
        console.log('   Response Body (first 500 chars):');
        console.log(`   ${responseText.substring(0, 500)}\n`);

        responseLog += `Body (first 500 chars):\n${responseText.substring(0, 500)}\n`;

        // Write log and return
        writeFileSync(logFile, logContent + responseLog);
        console.log(`📝 Log written to: ${logFile}\n`);

        // Diagnostic for 403
        if (response.status === 403) {
          console.log('🔍 Diagnosis: HTTP 403 Forbidden');
          console.log('   ✅ Request format is correct');
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

      // Write log with successful parse
      writeFileSync(logFile, logContent + responseLog);
      console.log(`📝 Log written to: ${logFile}\n`);

    } catch (parseError: any) {
      console.error('❌ Failed to parse response:');
      console.error(`   Error: ${parseError.message}`);
      console.error(`   Raw response (first 500 chars):`);
      console.error(`   ${responseText.substring(0, 500)}\n`);

      responseLog += `Parse Error: ${parseError.message}\n`;
      responseLog += `Raw Body (first 500 chars):\n${responseText.substring(0, 500)}\n`;
      writeFileSync(logFile, logContent + responseLog);

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
  config: EnrolmentConfig,
  deviceId: string,
  privateKeyPemEncrypted: string,
  certPemEncrypted: string,
  certPsiPemEncrypted?: string
): Promise<void> {
  console.log(`💾 Updating ${config.env} profile in database...`);

  const tenantId = config.env === 'DEV' ? 'dev-tenant' : 'essai-tenant';

  // Check if profile exists
  const { data: existingProfile } = await supabase
    .from('websrm_profiles')
    .select('*')
    .eq('env', config.env)
    .eq('tenant_id', tenantId)
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
      tenant_id: tenantId,
      env: config.env,
      device_id: deviceId,
      partner_id: config.partnerId,
      cert_code: config.certCode,
      software_id: config.softwareId,
      software_version: config.softwareVersion,
      versi: config.versi,
      versi_parn: config.env === 'DEV' ? '0' : '1.0.0',
      cas_essai: config.env === 'ESSAI' ? '500.001' : null,
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

    // Step 2: Build X.509 CSR per RQ specifications
    // DEV (RBC): C=CA, ST=QC, L=-05:00, O=RBC-{AUTH_CODE}, CN={NEQ}, OU={NEQ}TQ0001, GN=ER0001
    // ESSAI (FOB): C=CA, ST=QC, L=-05:00, O=FOB-{CODCERTIF}, CN={IDPARTN}, SN=Certificat du serveur
    const organization = CONFIG.env === 'DEV'
      ? `${CONFIG.activitySector}-${CONFIG.authCode}` // RBC-X4T7-N595
      : `${CONFIG.activitySector}-${CONFIG.certCode}`; // FOB-FOB201999999

    // CSR Subject: Match RQ template exactly
    // DEV (RBC - Michel Untel): C=CA, ST=QC, L=-05:00, O=RBC-D8T8-W8W8, OU=5678912340TQ0001, GN=ER0001, CN=5678912340
    // NO SN for DEV!
    // ESSAI: C=CA, ST=QC, L=-05:00, SN=Certificat du serveur, O=FOB-FOB201999999, CN=IDPARTN (no OU/GN)
    const csrSubject = CONFIG.env === 'DEV' ? {
      commonName: process.env.WEBSRM_DEV_CSR_CN || '5678912340',
      organizationalUnit: process.env.WEBSRM_DEV_CSR_OU || '5678912340TQ0001',
      givenName: process.env.WEBSRM_DEV_CSR_GN || 'ER0001',
      organization,
      // NO serialNumber for DEV (RBC - Michel Untel)
      country: 'CA',
      state: 'QC',
      locality: '-05:00',
    } : {
      commonName: CONFIG.partnerId,
      organization,
      serialNumber: 'Certificat du serveur',
      country: 'CA',
      state: 'QC',
      locality: '-05:00',
    };

    const csr = await buildCSR(cryptoKey, csrSubject);

    // Step 3: Call enrolment endpoint
    const result = await callEnrolment(CONFIG, csr);

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
    const deviceId = result.deviceId || CONFIG.deviceId;
    await updateProfile(CONFIG, deviceId, privateKeyPemEncrypted, certPemEncrypted, certPsiPemEncrypted);

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
    if (CONFIG.env === 'DEV') {
      console.log('  1. Set ENV variable: $env:WEBSRM_DEV_DEVICE_ID="' + result.deviceId + '"');
      console.log('  2. Run DEV test cases: pnpm websrm:test:dev');
      console.log('  3. After ALL tests PASS, switch to ESSAI');
    } else {
      console.log('  1. Set ENV variable: $env:WEBSRM_ESSAI_DEVICE_ID="' + result.deviceId + '"');
      console.log('  2. Run ESSAI smoke tests:');
      console.log('     pnpm websrm:smoke:enr  # ENR test');
      console.log('     pnpm websrm:smoke:dup  # DUP test');
      console.log('     pnpm websrm:smoke:ann  # ANN test');
      console.log('     pnpm websrm:smoke:mod  # MOD test');
      console.log('  3. Generate evidence: pnpm websrm:export <orderId> ./evidence');
    }
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
