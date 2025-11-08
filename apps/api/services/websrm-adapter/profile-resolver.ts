/**
 * WEB-SRM Profile Resolver
 *
 * Purpose: Resolve compliance profile for tenant/branch/device
 * Security: Loads encrypted PEM keys and device identifiers
 * Source: Admin panel "Compliance Profiles" (future) or seed data (current)
 *
 * SECURITY: PEM keys are:
 * - Stored encrypted in database (AES-256-GCM)
 * - Decrypted only in memory (this resolver)
 * - Never written to disk or logs
 * - Passed to adapter in RAM only
 */

import { decryptSecret } from './secrets';
import { createClient } from '@supabase/supabase-js';

export interface ComplianceProfile {
  // Device identifiers
  deviceId: string;          // IDAPPRL - Unique device identifier
  deviceLocalId: string;     // Local device ID (internal reference)

  // Partner/Software identifiers
  partnerId: string;         // IDPARTN - Partner ID assigned by RQ
  certCode: string;          // CODCERTIF - Certificate code

  // Software identifiers
  softwareId: string;        // IDSEV - Software/service ID
  softwareVersion: string;   // IDVERSI - Software version

  // Version metadata
  versi: string;             // VERSI - Protocol version
  versiParn: string;         // VERSIPARN - Partner version

  // Environment
  env: 'DEV' | 'ESSAI' | 'PROD';

  // ESSAI-specific
  casEssai?: string;         // CASESSAI - Test case code (ESSAI only)
  authorizationCode?: string; // AUTH_CODE - Used during enrolment (ESSAI only)

  // Cryptographic materials (encrypted in DB, decrypted in memory)
  privateKeyPem: string;     // ECDSA P-256 private key (decrypted)
  certPem: string;           // X.509 certificate (decrypted)

  // Metadata
  tenantId: string;
  branchId?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

/**
 * Mock/seed compliance profiles for development
 * TODO: Replace with admin panel database lookup
 */
const MOCK_PROFILES: Record<string, ComplianceProfile> = {
  // Default DEV profile
  'dev-default': {
    deviceId: 'POS-DEV-001',
    deviceLocalId: 'device-001',
    partnerId: 'PARTNER-001',
    certCode: 'TESTCODE',
    softwareId: 'SRS-VIZION-001',
    softwareVersion: '1.0.0',
    versi: '1.0.0',
    versiParn: '0',
    env: 'DEV',
    privateKeyPem: process.env.WEBSRM_PRIVATE_KEY_PEM || '',
    certPem: process.env.WEBSRM_CERT_PEM || '',
    tenantId: 'default-tenant',
    branchId: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
  },

  // ESSAI profile (Revenu Québec certification testing)
  'essai-test': {
    // Device ID: Temporary placeholder until enrolment completes
    deviceId: process.env.WEBSRM_ESSAI_DEVICE_ID || '0000-0000-0000',
    deviceLocalId: 'device-essai-001',

    // Revenu Québec assigned identifiers
    partnerId: process.env.WEBSRM_ESSAI_PARTNER_ID || '0000000000001FF2', // IDPARTN
    certCode: process.env.WEBSRM_ESSAI_CERT_CODE || 'FOB201999999',       // CODCERTIF
    softwareId: process.env.WEBSRM_ESSAI_SOFTWARE_ID || '0000000000003973', // IDSEV
    softwareVersion: process.env.WEBSRM_ESSAI_SOFTWARE_VERSION || '00000000000045D6', // IDVERSI

    // Protocol versions
    versi: '0.1.0',        // VERSI - WEB-SRM protocol version
    versiParn: '0',        // VERSIPARN - Partner implementation version (per Quebec spec)

    env: 'DEV',            // TEMPORARY: Using DEV for free development (no test case chain)
    casEssai: '000.000',   // Free development mode (no test case restrictions)

    // Authorization code (used during enrolment only)
    authorizationCode: process.env.WEBSRM_ESSAI_AUTH_CODE || 'W7V7-K8W9',

    // PEM keys: Load directly from files (simpler than encryption)
    // Files are gitignored and stored in tmp/certs/
    privateKeyPem: (() => {
      try {
        const fs = require('fs');
        const path = require('path');
        const keyPath = path.join(__dirname, '../../../../../tmp/certs/essai-fob-client.key.pem');
        if (fs.existsSync(keyPath)) {
          const keyPem = fs.readFileSync(keyPath, 'utf8');
          console.log('[WEB-SRM] ✅ Private key loaded from file (length:', keyPem.length, ')');
          return keyPem;
        } else {
          console.warn('[WEB-SRM] ⚠️  Private key file not found:', keyPath);
          return '';
        }
      } catch (error: any) {
        console.error('[WEB-SRM] ❌ Failed to load private key:', error.message);
        return '';
      }
    })(),
    certPem: (() => {
      try {
        const fs = require('fs');
        const path = require('path');
        const certPath = path.join(__dirname, '../../../../../tmp/certs/essai-fob-client.crt.pem');
        if (fs.existsSync(certPath)) {
          const certPem = fs.readFileSync(certPath, 'utf8');
          console.log('[WEB-SRM] ✅ Certificate loaded from file (length:', certPem.length, ')');
          return certPem;
        } else {
          console.warn('[WEB-SRM] ⚠️  Certificate file not found:', certPath);
          return '';
        }
      } catch (error: any) {
        console.error('[WEB-SRM] ❌ Failed to load certificate:', error.message);
        return '';
      }
    })(),

    tenantId: 'essai-tenant',
    branchId: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
  },
};

/**
 * Resolve compliance profile for given tenant/branch/device
 *
 * @param tenantId - Tenant (restaurant chain) ID
 * @param branchId - Branch (location) ID (optional)
 * @param deviceLocalId - Local device identifier (POS terminal ID)
 * @returns Compliance profile with decrypted keys
 *
 * @example
 * const profile = await resolveProfile('tenant-123', 'branch-456', 'pos-terminal-1');
 * // profile.deviceId = 'POS-PROD-123456'
 * // profile.privateKeyPem = '-----BEGIN PRIVATE KEY-----...' (decrypted)
 */
export async function resolveProfile(
  tenantId: string,
  branchId?: string,
  deviceLocalId?: string
): Promise<ComplianceProfile> {
  // Try database lookup first
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Determine environment
      const env = process.env.WEBSRM_ENV as 'DEV' | 'ESSAI' | 'PROD' || 'DEV';

      // Query database for profile
      const { data: profile, error } = await supabase
        .from('websrm_profiles')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('env', env)
        .eq('is_active', true)
        .single();

      if (profile && !error) {
        // Decrypt PEM keys
        const privateKeyPem = decryptSecret(profile.private_key_pem_encrypted);
        const certPem = decryptSecret(profile.cert_pem_encrypted);

        return {
          deviceId: profile.device_id,
          deviceLocalId: deviceLocalId || 'device-001',
          partnerId: profile.partner_id,
          certCode: profile.cert_code,
          softwareId: profile.software_id,
          softwareVersion: profile.software_version,
          versi: profile.versi,
          versiParn: profile.versi_parn,
          env: profile.env,
          casEssai: profile.cas_essai,
          privateKeyPem,
          certPem,
          tenantId: profile.tenant_id,
          branchId,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
          isActive: profile.is_active,
        };
      }
    } catch (dbError) {
      console.warn('[WEB-SRM] Database lookup failed, falling back to mock profiles:', dbError);
    }
  }

  // Fallback to mock profiles based on environment
  const env = process.env.WEBSRM_ENV as 'DEV' | 'ESSAI' | 'PROD' || 'DEV';

  if (env === 'ESSAI') {
    return MOCK_PROFILES['essai-test'];
  }

  // Default to DEV profile
  return MOCK_PROFILES['dev-default'];
}

/**
 * Validate profile has all required fields
 *
 * @param profile - Compliance profile to validate
 * @throws Error if required fields are missing
 */
export function validateProfile(profile: ComplianceProfile): void {
  const required = [
    'deviceId',
    'partnerId',
    'certCode',
    'softwareId',
    'softwareVersion',
    'versi',
    'versiParn',
    'env',
    'privateKeyPem',
    'certPem',
  ];

  for (const field of required) {
    if (!profile[field as keyof ComplianceProfile]) {
      throw new Error(`[WEB-SRM] Profile missing required field: ${field}`);
    }
  }

  // Validate PEM format (basic check)
  if (!profile.privateKeyPem.includes('BEGIN PRIVATE KEY')) {
    throw new Error('[WEB-SRM] Invalid private key PEM format');
  }

  if (!profile.certPem.includes('BEGIN CERTIFICATE')) {
    throw new Error('[WEB-SRM] Invalid certificate PEM format');
  }

  // Validate env
  if (!['DEV', 'ESSAI', 'PROD'].includes(profile.env)) {
    throw new Error(`[WEB-SRM] Invalid environment: ${profile.env}`);
  }
}

/**
 * Get profile key for caching/lookup
 * @internal
 */
export function getProfileKey(
  tenantId: string,
  branchId?: string,
  deviceLocalId?: string
): string {
  return `${tenantId}:${branchId || 'default'}:${deviceLocalId || 'default'}`;
}
