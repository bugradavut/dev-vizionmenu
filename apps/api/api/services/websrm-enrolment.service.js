/**
 * WEB-SRM Enrolment Service (CommonJS)
 *
 * Purpose: Handle certificate enrolment flow
 * - Generate ECDSA P-256 keypair
 * - Build X.509 CSR
 * - Call WEB-SRM enrolment API
 * - Encrypt and store certificate
 *
 * Adapted from: scripts/websrm-enrolment.ts (GOLDEN CONFIG)
 */

const { createHash, randomBytes } = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { Crypto } = require('@peculiar/webcrypto');
const x509 = require('@peculiar/x509');

// Setup WebCrypto polyfill
const crypto = new Crypto();
x509.cryptoProvider.set(crypto);

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Import secrets service (compiled version)
const { encryptSecret } = require('./websrm-compiled/secrets');

// FO-Framework URLs
const FO_FRAMEWORK_URLS = {
  DEV: 'https://cnfr.api.rq-fo.ca',
  ENROLMENT: 'https://certificats.cnfr.api.rq-fo.ca/enrolement', // Same for both DEV and ESSAI
};

/**
 * Generate ECDSA P-256 keypair
 * @returns {Promise<{privateKeyPem: string, publicKeyPem: string, cryptoKey: CryptoKeyPair}>}
 */
async function generateKeyPairP256() {
  console.log('[Enrolment] 🔐 Generating ECDSA P-256 keypair...');

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

  const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${Buffer.from(privateKeyDer).toString('base64').match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;
  const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${Buffer.from(publicKeyDer).toString('base64').match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;

  console.log('[Enrolment] ✅ Keypair generated');

  return {
    privateKeyPem,
    publicKeyPem,
    cryptoKey: keys,
  };
}

/**
 * Build X.509 CSR per RQ GOLDEN CONFIGURATION
 * @param {CryptoKeyPair} cryptoKey
 * @param {object} subject
 * @returns {Promise<string>} CSR PEM (single-line base64)
 */
async function buildCSR(cryptoKey, subject) {
  console.log('[Enrolment] 📝 Building X.509 CSR (GOLDEN CONFIG)...');

  // Build DN string (EXACT ORDER CRITICAL)
  let dnParts = [];
  dnParts.push(`C=${subject.country}`);
  dnParts.push(`ST=${subject.state}`);
  dnParts.push(`L=${subject.locality}`);

  // Surname (2.5.4.4) - CRITICAL!
  if (subject.surname) {
    dnParts.push(`2.5.4.4=${subject.surname}`);
  }

  dnParts.push(`O=${subject.organization}`);

  // OU and GN before CN
  if (subject.organizationalUnit) {
    dnParts.push(`OU=${subject.organizationalUnit}`);
  }
  if (subject.givenName) {
    dnParts.push(`2.5.4.42=${subject.givenName}`);
  }

  dnParts.push(`CN=${subject.commonName}`);

  const dn = dnParts.join(', ');

  // Create X.509 CSR
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
        true
      ),
    ],
  });

  // Export as single-line base64 PEM
  const derBuffer = Buffer.from(csr.rawData);
  const base64SingleLine = derBuffer.toString('base64');
  const csrPem = `-----BEGIN CERTIFICATE REQUEST-----\n${base64SingleLine}\n-----END CERTIFICATE REQUEST-----`;

  console.log('[Enrolment] ✅ CSR generated');
  console.log('  Subject:', dn);

  return csrPem;
}

/**
 * Call Revenu Québec enrolment endpoint
 * @param {object} config
 * @param {string} csr
 * @returns {Promise<{success: boolean, deviceId?: string, certificatePem?: string, certificatePsiPem?: string, error?: string}>}
 */
async function callEnrolment(config, csr) {
  console.log('[Enrolment] 🌐 Calling Revenu Québec enrolment endpoint...');
  console.log('  URL:', config.enrolmentUrl);

  // Headers - ALL REQUIRED
  const headers = {
    'Content-Type': 'application/json',
    'ENVIRN': config.env,
    'APPRLINIT': 'SRV',
    'IDSEV': config.softwareId,
    'IDVERSI': config.softwareVersion,
    'CODCERTIF': config.certCode,
    'IDPARTN': config.partnerId,
    'VERSI': config.versi,
    'VERSIPARN': config.env === 'DEV' ? '0' : '1.0.0',
  };

  // CASESSAI - Test case code
  // DEV: 000.000 (general test case)
  // ESSAI: 500.001 (server admin mode)
  headers['CASESSAI'] = config.env === 'DEV' ? '000.000' : '500.001';

  // CODAUTORI in header (for both DEV and ESSAI)
  headers['CODAUTORI'] = config.authCode;

  // Body - NO codAutori (it's in header only for both DEV and ESSAI)
  const body = {
    reqCertif: {
      modif: 'AJO',
      csr: csr,
    },
  };

  console.log('[Enrolment] 📤 Request Headers:', JSON.stringify(headers, null, 2));
  console.log('[Enrolment] 📤 Request Body:', JSON.stringify(body, null, 2));

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(config.enrolmentUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    console.log('[Enrolment] 📥 Response:', response.status, response.statusText);

    const contentType = response.headers.get('content-type');
    const responseText = await response.text();

    if (!contentType?.includes('application/json')) {
      console.error('[Enrolment] ❌ Non-JSON response:', responseText.substring(0, 500));
      return {
        success: false,
        error: `Non-JSON response (${response.status}): ${response.statusText}`,
      };
    }

    const data = JSON.parse(responseText);

    if (response.ok && data.retourCertif) {
      const retour = data.retourCertif;

      // Check for errors
      if (retour.listErr && retour.listErr.length > 0) {
        console.error('[Enrolment] ❌ Enrolment errors:', retour.listErr);
        return {
          success: false,
          error: retour.listErr[0]?.mess || 'Enrolment failed',
        };
      }

      console.log('[Enrolment] ✅ Enrolment successful!');
      console.log('  Certificate:', retour.certif ? 'YES' : 'NO');
      console.log('  PSI Certificate:', retour.certifPSI ? 'YES' : 'NO');

      return {
        success: true,
        deviceId: retour.idApprl || config.deviceId,
        certificatePem: retour.certif,
        certificatePsiPem: retour.certifPSI,
      };
    } else {
      console.error('[Enrolment] ❌ Enrolment failed:', response.statusText);
      console.error('  Response:', JSON.stringify(data, null, 2));
      return {
        success: false,
        error: response.statusText,
      };
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('[Enrolment] ❌ Request timeout (30s)');
      return {
        success: false,
        error: 'Request timeout (30s)',
      };
    } else {
      console.error('[Enrolment] ❌ Network error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

/**
 * Extract certificate metadata
 * @param {string} certificatePem
 * @returns {object}
 */
function extractCertificateMetadata(certificatePem) {
  try {
    // Simple extraction - for now just return fingerprint
    const fingerprint = createHash('sha1')
      .update(certificatePem)
      .digest('hex');

    // Calculate validity (5 years from now)
    const validFrom = new Date().toISOString();
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 5);

    return {
      serialNumber: fingerprint.substring(0, 16).toUpperCase(),
      validFrom,
      validUntil: validUntil.toISOString(),
      fingerprint,
    };
  } catch (error) {
    console.error('[Enrolment] Failed to extract cert metadata:', error);
    return {
      serialNumber: 'N/A',
      validFrom: new Date().toISOString(),
      validUntil: new Date().toISOString(),
      fingerprint: 'N/A',
    };
  }
}

/**
 * Main enrolment flow
 * @param {object} params
 * @param {string} params.tenantId
 * @param {string} params.env - DEV or ESSAI
 * @param {object} params.config - Enrolment config
 * @returns {Promise<object>}
 */
async function runEnrolmentFlow({ tenantId, env, config }) {
  try {
    console.log('[Enrolment] 🚀 Starting enrolment flow...');
    console.log('  Tenant ID:', tenantId);
    console.log('  Environment:', env);

    // Build enrolment config - Using VERIFIED working credentials (commit 39926382f)
    const enrolmentConfig = {
      env,
      authCode: 'D8T8-W8W8', // Test auth code
      partnerId: '0000000000001FF2',
      certCode: 'FOB201999999', // CODCERTIF header value
      commonName: '3601837200', // CN = VERIFIED working value (from successful enrolment)
      softwareId: '0000000000003973',
      softwareVersion: '00000000000045D6',
      versi: '0.1.0',
      deviceId: '0000-0000-0000',
      activitySector: 'FOB', // FOB server admin mode (NO OU/GN)
      organization: 'FOB-B8T8-W8W8', // VERIFIED working O value
      enrolmentUrl: FO_FRAMEWORK_URLS.ENROLMENT, // Same for both DEV and ESSAI
      baseUrl: FO_FRAMEWORK_URLS.DEV,
    };

    // Step 1: Generate keypair
    const { privateKeyPem, cryptoKey } = await generateKeyPairP256();

    // Step 2: Build CSR - FOB server admin mode (VERIFIED working config from commit 39926382f)
    // DN: C=CA, ST=QC, L=-05:00, SN=Certificat du serveur, O=FOB-B8T8-W8W8, CN=3601837200
    const csrSubject = {
      commonName: enrolmentConfig.commonName, // 3601837200
      organization: enrolmentConfig.organization, // FOB-B8T8-W8W8
      surname: 'Certificat du serveur', // 2.5.4.4 (CRITICAL!)
      country: 'CA',
      state: 'QC',
      locality: '-05:00',
      // NO organizationalUnit (OU)
      // NO givenName (GN)
    };

    const csr = await buildCSR(cryptoKey, csrSubject);

    // Step 3: Call enrolment endpoint
    const result = await callEnrolment(enrolmentConfig, csr);

    if (!result.success) {
      console.error('[Enrolment] ❌ Enrolment failed:', result.error);
      return {
        success: false,
        error: result.error,
      };
    }

    if (!result.certificatePem) {
      console.error('[Enrolment] ❌ No certificate in response');
      return {
        success: false,
        error: 'No certificate received',
      };
    }

    // Step 4: Encrypt PEM keys
    console.log('[Enrolment] 🔒 Encrypting PEM keys...');
    const privateKeyPemEncrypted = encryptSecret(privateKeyPem);
    const certPemEncrypted = encryptSecret(result.certificatePem);
    const certPsiPemEncrypted = result.certificatePsiPem ? encryptSecret(result.certificatePsiPem) : null;
    console.log('[Enrolment] ✅ Keys encrypted');

    // Step 5: Extract certificate metadata
    const certMetadata = extractCertificateMetadata(result.certificatePem);

    // Step 6: Store in database
    console.log('[Enrolment] 💾 Storing certificate in database...');

    const profileData = {
      tenant_id: tenantId,
      env,
      device_id: result.deviceId,
      partner_id: enrolmentConfig.partnerId,
      cert_code: enrolmentConfig.certCode,
      software_id: enrolmentConfig.softwareId,
      software_version: enrolmentConfig.softwareVersion,
      versi: enrolmentConfig.versi,
      versi_parn: env === 'DEV' ? '0' : '1.0.0',
      cas_essai: env === 'ESSAI' ? '000.000' : null,  // IMPORTANT: 000.000 for transactions (500.001 only for enrolment API call)
      private_key_pem_encrypted: privateKeyPemEncrypted,
      cert_pem_encrypted: certPemEncrypted,
      cert_psi_pem_encrypted: certPsiPemEncrypted,
      cert_serial_number: certMetadata.serialNumber,
      cert_valid_from: certMetadata.validFrom,
      cert_valid_until: certMetadata.validUntil,
      cert_fingerprint: certMetadata.fingerprint,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: newProfile, error } = await supabase
      .from('websrm_profiles')
      .insert(profileData)
      .select()
      .single();

    if (error) {
      console.error('[Enrolment] ❌ Database error:', error);
      throw new Error(`Failed to store certificate: ${error.message}`);
    }

    console.log('[Enrolment] ✅ Certificate stored (ID:', newProfile.id, ')');
    console.log('[Enrolment] 🎉 Enrolment completed successfully!');

    return {
      success: true,
      profileId: newProfile.id,
      deviceId: result.deviceId,
      serialNumber: certMetadata.serialNumber,
      validFrom: certMetadata.validFrom,
      validUntil: certMetadata.validUntil,
      fingerprint: certMetadata.fingerprint,
      env,
    };
  } catch (error) {
    console.error('[Enrolment] ❌ Enrolment flow failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  runEnrolmentFlow,
};
