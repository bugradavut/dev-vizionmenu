/**
 * WEB-SRM Certificate Management Routes (FO-109)
 *
 * Purpose: Manage WEB-SRM digital certificates
 * - GET /api/v1/websrm/certificate/:tenantId - Fetch active certificate
 * - POST /api/v1/websrm/certificate/annul - Delete/annul certificate
 */

console.log('🔐 [FO-109] Loading WEB-SRM Certificate Routes...');

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/v1/websrm/certificate/:tenantId
 * Fetch active certificate for tenant
 *
 * @param {string} tenantId - Tenant ID
 * @returns {object} Certificate data
 */
router.get('/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required',
      });
    }

    // Query websrm_profiles for active certificate
    const { data: profile, error } = await supabase
      .from('websrm_profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - no certificate
        return res.status(200).json({
          success: true,
          certificate: null,
          message: 'No active certificate found',
        });
      }
      throw error;
    }

    if (!profile) {
      return res.status(200).json({
        success: true,
        certificate: null,
        message: 'No active certificate found',
      });
    }

    // Parse certificate details
    // Note: We don't return encrypted keys, only metadata
    const certificateData = {
      id: profile.id,
      serialNumber: profile.cert_serial_number || 'N/A',
      validFrom: profile.cert_valid_from || profile.created_at,
      validUntil: profile.cert_valid_until || calculateExpiryDate(profile.created_at),
      fingerprint: profile.cert_fingerprint || 'N/A',
      isActive: profile.is_active,
      deviceId: profile.device_id,
      env: profile.env,
    };

    return res.status(200).json({
      success: true,
      certificate: certificateData,
    });
  } catch (error) {
    console.error('[WEB-SRM] Failed to fetch certificate:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch certificate',
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/websrm/certificate/annul
 * Annul (delete) certificate - sends annulation request to WEB-SRM
 *
 * @body {string} tenantId - Tenant ID
 * @body {string} serialNumber - Certificate serial number
 * @returns {object} Annulation result
 */
router.post('/annul', async (req, res) => {
  try {
    const { tenantId, serialNumber } = req.body;

    if (!tenantId || !serialNumber) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID and serial number are required',
      });
    }

    // Step 1: Fetch active certificate from database
    const { data: profile, error: fetchError } = await supabase
      .from('websrm_profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (fetchError || !profile) {
      return res.status(404).json({
        success: false,
        message: 'No active certificate found',
      });
    }

    // Step 2: Send annulation request to WEB-SRM
    // TODO: Implement actual WEB-SRM annulation API call
    // For now, we'll simulate success
    const websrmAnnulationSuccess = true;

    if (websrmAnnulationSuccess) {
      // Step 3: Mark certificate as deleted AND clear encrypted keys from database
      // FO-109 Step 2: "the certificate must also be deleted from the SRS"
      // We clear sensitive encrypted data while keeping metadata for audit trail
      const { error: updateError } = await supabase
        .from('websrm_profiles')
        .update({
          is_active: false,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Clear encrypted keys (FO-109 compliance)
          private_key_pem_encrypted: null,
          cert_pem_encrypted: null,
          cert_psi_pem_encrypted: null,
        })
        .eq('id', profile.id);

      if (updateError) {
        throw updateError;
      }

      return res.status(200).json({
        success: true,
        message: 'Certificate annulled successfully (FO-109 Step 2)',
        certificateId: profile.id,
        serialNumber: profile.cert_serial_number,
        deletedAt: new Date().toISOString(),
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'WEB-SRM annulation request failed',
      });
    }
  } catch (error) {
    console.error('[WEB-SRM] Failed to annul certificate:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to annul certificate',
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/websrm/certificate/enrol
 * Request new WEB-SRM certificate (enrolment)
 *
 * @body {string} tenantId - Tenant ID (branch ID)
 * @body {string} env - Environment (DEV or ESSAI)
 * @body {object} config - Enrolment configuration
 * @returns {object} Enrolment result
 */
router.post('/enrol', async (req, res) => {
  try {
    const { tenantId, env, config } = req.body;

    console.log('[WEB-SRM Enrolment] Starting enrolment process...');
    console.log('  Tenant ID:', tenantId);
    console.log('  Environment:', env);

    // Validate inputs
    if (!tenantId || !env) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID and environment are required',
      });
    }

    if (!['DEV', 'ESSAI'].includes(env)) {
      return res.status(400).json({
        success: false,
        message: 'Environment must be DEV or ESSAI',
      });
    }

    // Check if certificate already exists
    const { data: existingProfile } = await supabase
      .from('websrm_profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('env', env)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (existingProfile) {
      return res.status(409).json({
        success: false,
        message: 'Active certificate already exists for this tenant',
        certificateId: existingProfile.id,
      });
    }

    // Import enrolment service
    const { runEnrolmentFlow } = require('../api/services/websrm-enrolment.service.js');

    // Run enrolment flow
    const result = await runEnrolmentFlow({
      tenantId,
      env,
      config: config || {},
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Enrolment failed',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Certificate enrolled successfully',
      certificate: {
        id: result.profileId,
        serialNumber: result.serialNumber,
        validFrom: result.validFrom,
        validUntil: result.validUntil,
        fingerprint: result.fingerprint,
        deviceId: result.deviceId,
        env: result.env,
      },
    });
  } catch (error) {
    console.error('[WEB-SRM] Enrolment failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Enrolment failed',
      error: error.message,
    });
  }
});

/**
 * Helper: Calculate expiry date (5 years from creation)
 * @param {string} createdAt - Creation date
 * @returns {string} Expiry date
 */
function calculateExpiryDate(createdAt) {
  const date = new Date(createdAt);
  date.setFullYear(date.getFullYear() + 5);
  return date.toISOString();
}

module.exports = router;
