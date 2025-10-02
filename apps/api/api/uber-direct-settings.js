/**
 * Uber Direct Branch Settings API
 * Handles branch-specific credential management
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Save Uber Direct credentials for a branch
 * POST /api/v1/uber-direct/branch-settings/:branchId
 */
async function saveBranchCredentials(req, res) {
  try {
    const { branchId } = req.params;
    const { enabled, customer_id, client_id, client_secret } = req.body;

    // Get existing credentials to check if we need new secret
    const { data: existingBranch } = await supabase
      .from('branches')
      .select('uber_direct_client_secret')
      .eq('id', branchId)
      .single();

    // Validate required fields
    if (enabled && (!customer_id || !client_id)) {
      return res.status(400).json({
        error: 'Missing required credentials',
        message: 'Please fill in Customer ID and Client ID to enable Uber Direct'
      });
    }

    // If enabling for first time and no existing secret, require client_secret
    if (enabled && !client_secret && !existingBranch?.uber_direct_client_secret) {
      return res.status(400).json({
        error: 'Missing required credentials',
        message: 'Please fill in Client Secret to enable Uber Direct'
      });
    }

    // TODO: Add encryption for client_secret
    const encryptedClientSecret = client_secret || existingBranch?.uber_direct_client_secret; // Keep existing if not provided

    // Update branch with credentials
    const updateData = {
      uber_direct_enabled: enabled,
      uber_direct_customer_id: enabled ? customer_id : null,
      uber_direct_client_id: enabled ? client_id : null,
      updated_at: new Date().toISOString()
    };

    // Only update secret if provided
    if (client_secret || !enabled) {
      updateData.uber_direct_client_secret = enabled ? encryptedClientSecret : null;
    }

    const { data, error } = await supabase
      .from('branches')
      .update(updateData)
      .eq('id', branchId)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to save branch credentials:', error);
      return res.status(500).json({
        error: 'Failed to save credentials',
        message: error.message
      });
    }

    console.log(`✅ Uber Direct credentials saved for branch ${branchId}`);

    res.json({
      success: true,
      message: 'Uber Direct credentials saved successfully',
      branch: {
        id: data.id,
        name: data.name,
        uber_direct_enabled: data.uber_direct_enabled,
        has_credentials: !!(data.uber_direct_client_id && data.uber_direct_customer_id)
      }
    });

  } catch (error) {
    console.error('❌ Error saving branch credentials:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

/**
 * Get Uber Direct credentials status for a branch
 * GET /api/v1/uber-direct/branch-settings/:branchId
 */
async function getBranchCredentials(req, res) {
  try {
    const { branchId } = req.params;

    const { data: branch, error } = await supabase
      .from('branches')
      .select('id, name, uber_direct_enabled, uber_direct_customer_id, uber_direct_client_id')
      .eq('id', branchId)
      .single();

    if (error || !branch) {
      return res.status(404).json({
        error: 'Branch not found',
        message: error?.message || 'Invalid branch ID'
      });
    }

    res.json({
      success: true,
      branch: {
        id: branch.id,
        name: branch.name,
        uber_direct_enabled: branch.uber_direct_enabled || false,
        has_credentials: !!(branch.uber_direct_client_id && branch.uber_direct_customer_id),
        customer_id: branch.uber_direct_customer_id || '',
        client_id: branch.uber_direct_client_id || ''
        // Note: Never return client_secret
      }
    });

  } catch (error) {
    console.error('❌ Error getting branch credentials:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

/**
 * Test Uber Direct connection for a branch
 * POST /api/v1/uber-direct/branch-settings/:branchId/test
 */
async function testBranchConnection(req, res) {
  try {
    const { branchId } = req.params;

    // Import service here to avoid circular dependency
    const uberDirectService = require('./services/uber-direct.service.js');

    // Test connection by getting branch credentials and authenticating
    const credentials = await uberDirectService.getBranchCredentials(branchId);
    const token = await uberDirectService.getBranchToken(credentials);

    if (token) {
      res.json({
        success: true,
        message: 'Connection successful',
        customer_id: credentials.customerId
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Authentication failed'
      });
    }

  } catch (error) {
    console.error('❌ Connection test failed:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  saveBranchCredentials,
  getBranchCredentials,
  testBranchConnection
};