/**
 * WEB-SRM ESSAI Mock Enrolment
 *
 * Purpose: Generate ephemeral keys and save to DB (for testing without RQ endpoint)
 *
 * Usage: When RQ enrolment endpoint is unreachable, use this to proceed with smoke tests
 */

import { generateKeyPairSync, createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

// ENV validation
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

if (!process.env.WEBSRM_ENCRYPTION_KEY) {
  console.error('❌ Missing WEBSRM_ENCRYPTION_KEY');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🚀 WEB-SRM ESSAI Mock Enrolment (Offline)\n');
console.log('⚠️  NOTE: This is a MOCK enrolment for testing purposes.');
console.log('⚠️  Real enrolment requires connectivity to Revenu Québec ESSAI endpoint.\n');

const ESSAI_CONFIG = {
  partnerId: process.env.WEBSRM_ESSAI_PARTNER_ID || '0000000000001FF2',
  certCode: process.env.WEBSRM_ESSAI_CERT_CODE || 'FOB201999999',
  softwareId: process.env.WEBSRM_ESSAI_IDSEV || '0000000000003973',
  softwareVersion: process.env.WEBSRM_ESSAI_IDVERSI || '00000000000045D6',
  versi: process.env.WEBSRM_ESSAI_VERSI || '0.1.0',
  authCode: process.env.WEBSRM_ESSAI_AUTH_CODE || 'W7V7-K8W9',
  mockDeviceId: 'ESSAI-MOCK-' + Date.now().toString().slice(-8), // Mock device ID
};

console.log('📋 Configuration:');
console.log(`  Mock IDAPPRL: ${ESSAI_CONFIG.mockDeviceId}`);
console.log(`  IDPARTN: ${ESSAI_CONFIG.partnerId}`);
console.log(`  CODCERTIF: ${ESSAI_CONFIG.certCode}`);
console.log(`  IDSEV: ${ESSAI_CONFIG.softwareId}`);
console.log(`  IDVERSI: ${ESSAI_CONFIG.softwareVersion}\n`);

// Generate ECDSA P-256 keypair
console.log('🔐 Generating ECDSA P-256 keypair...');
const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
console.log('✅ Keypair generated\n');

// Generate mock certificate
console.log('📜 Generating mock certificate...');
const mockCert = `-----BEGIN CERTIFICATE-----
MIIBkTCCATigAwIBAgIUMock${Date.now().toString().slice(-10)}wCgYIKoZIzj0E
AwIwEjEQMA4GA1UEAwwHRVNTQUktQ0EwHhcNMjUwMTEwMDAwMDAwWhcNMjYwMTEw
MDAwMDAwWjASMRAwDgYDVQQDDAdFU1NBSS1DQTBZMBMGByqGSM49AgEGCCqGSM49
AwEHA0IABHRlc3QtcHVibGljLWtleS1mb3ItZXNzYWktbW9jay1lbnJvbG1lbnQB
MAAwHQYDVR0OBBYEFI5hLMdp0KV3MmJCWqXQMvLT8i8uMAoGCCqGSM49BAMCA0cA
MEQCIFRlc3Qtc2lnbmF0dXJlLWZvci1lc3NhaS1tb2NrLWNlcnRpZmljYXRlAiA=
-----END CERTIFICATE-----`;
console.log('✅ Mock certificate generated\n');

// Encrypt PEM keys
console.log('🔒 Encrypting PEM keys (AES-256-GCM)...');
const { encryptSecret } = require('../apps/api/services/websrm-adapter/secrets');
const privateKeyEncrypted = encryptSecret(privateKey);
const certEncrypted = encryptSecret(mockCert);
console.log('✅ PEM keys encrypted\n');

// Update/Create profile in DB
async function saveProfile() {
  console.log('💾 Saving profile to database...');

  const { data: existing } = await supabase
    .from('websrm_profiles')
    .select('*')
    .eq('env', 'ESSAI')
    .eq('tenant_id', 'essai-tenant')
    .single();

  const profileData = {
    tenant_id: 'essai-tenant',
    env: 'ESSAI',
    device_id: ESSAI_CONFIG.mockDeviceId,
    partner_id: ESSAI_CONFIG.partnerId,
    cert_code: ESSAI_CONFIG.certCode,
    software_id: ESSAI_CONFIG.softwareId,
    software_version: ESSAI_CONFIG.softwareVersion,
    versi: ESSAI_CONFIG.versi,
    versi_parn: '1.0.0',
    cas_essai: '000.000',
    private_key_pem_encrypted: privateKeyEncrypted,
    cert_pem_encrypted: certEncrypted,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase
      .from('websrm_profiles')
      .update(profileData)
      .eq('id', existing.id);

    if (error) throw new Error(`Update failed: ${error.message}`);
    console.log(`✅ Profile updated (ID: ${existing.id})\n`);
  } else {
    const { data, error } = await supabase
      .from('websrm_profiles')
      .insert({ ...profileData, created_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw new Error(`Insert failed: ${error.message}`);
    console.log(`✅ Profile created (ID: ${data.id})\n`);
  }
}

async function run() {
  try {
    await saveProfile();

    // Calculate certificate fingerprint
    const fingerprint = createHash('sha1').update(mockCert).digest('hex');

    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('✅ MOCK ENROLMENT COMPLETED');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    console.log('📋 Summary:');
    console.log(`  Mock IDAPPRL: ${ESSAI_CONFIG.mockDeviceId}`);
    console.log(`  Private Key: Encrypted & stored`);
    console.log(`  Certificate: Mock (encrypted & stored)`);
    console.log(`  Fingerprint (SHA-1): ${fingerprint}\n`);

    console.log('🚀 Next Steps:');
    console.log(`  1. Set ENV: $env:WEBSRM_ESSAI_DEVICE_ID="${ESSAI_CONFIG.mockDeviceId}"`);
    console.log('  2. Run: pnpm websrm:essai:offline  # Test with mock keys');
    console.log('  3. When RQ endpoint is available, run real enrolment');
    console.log('');

    console.log('⚠️  IMPORTANT:');
    console.log('  - These are MOCK keys for testing only');
    console.log('  - They will NOT work with real Revenu Québec endpoint');
    console.log('  - For certification, you MUST use real enrolment');
    console.log('');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Mock enrolment failed:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

run();
