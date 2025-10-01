// =====================================================
// UBER EATS OAUTH ROUTES
// Restaurant owner OAuth flow for connecting Uber Eats accounts
// =====================================================

const express = require('express');
const router = express.Router();

/**
 * Initiate OAuth flow - Redirect restaurant owner to Uber authorization page
 * GET /api/v1/uber-eats/auth/connect?branch_id=xxx
 */
router.get('/connect', async (req, res) => {
  try {
    const { branch_id } = req.query;

    if (!branch_id) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'branch_id is required'
      });
    }

    // Check if running in test mode
    const UBER_EATS_TEST_MODE = process.env.UBER_EATS_TEST_MODE === 'true';

    if (UBER_EATS_TEST_MODE) {
      // Mock mode: Redirect directly to callback with mock code
      console.log('🧪 MOCK MODE: Simulating Uber OAuth redirect');
      return res.redirect(`/api/v1/uber-eats/auth/callback?code=MOCK_AUTH_CODE&state=${branch_id}`);
    }

    // Production mode: Build real Uber OAuth URL
    const clientId = process.env.UBER_EATS_CLIENT_ID;
    const redirectUri = `${process.env.API_BASE_URL || 'https://dev-vizionmenu-web.vercel.app'}/api/v1/uber-eats/auth/callback`;

    if (!clientId) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'UBER_EATS_CLIENT_ID not configured'
      });
    }

    // Build OAuth authorization URL
    const authUrl = new URL('https://login.uber.com/oauth/v2/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'eats.pos_provisioning eats.store eats.order');
    authUrl.searchParams.set('state', branch_id); // Security: prevent CSRF attacks

    console.log(`🔐 Redirecting to Uber OAuth for branch: ${branch_id}`);
    res.redirect(authUrl.toString());

  } catch (error) {
    console.error('OAuth connect error:', error);
    res.status(500).json({
      error: 'OAuth initialization failed',
      message: error.message
    });
  }
});

/**
 * OAuth callback handler - Receives authorization code from Uber
 * GET /api/v1/uber-eats/auth/callback?code=xxx&state=branch_id
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state: branch_id } = req.query;

    if (!code || !branch_id) {
      return res.status(400).json({
        error: 'Invalid callback',
        message: 'Missing code or state parameter'
      });
    }

    const { createClient } = require('@supabase/supabase-js');
    const { encryptToString } = require('../utils/encryption');

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Check if running in test mode
    const UBER_EATS_TEST_MODE = process.env.UBER_EATS_TEST_MODE === 'true';

    let accessToken, refreshToken, expiresIn, storeId, merchantId, scopes;

    if (UBER_EATS_TEST_MODE) {
      // Mock mode: Generate fake tokens
      console.log('🧪 MOCK MODE: Simulating token exchange');
      accessToken = 'mock_access_token_' + Date.now();
      refreshToken = 'mock_refresh_token_' + Date.now();
      expiresIn = 3600; // 1 hour
      storeId = 'mock-store-' + branch_id.substring(0, 8);
      merchantId = 'mock-merchant-' + branch_id.substring(0, 8);
      scopes = ['eats.pos_provisioning', 'eats.store', 'eats.order'];

    } else {
      // Production mode: Exchange code for real tokens
      const clientId = process.env.UBER_EATS_CLIENT_ID;
      const clientSecret = process.env.UBER_EATS_CLIENT_SECRET;
      const redirectUri = `${process.env.API_BASE_URL || 'https://dev-vizionmenu-web.vercel.app'}/api/v1/uber-eats/auth/callback`;

      if (!clientId || !clientSecret) {
        return res.status(500).json({
          error: 'Configuration error',
          message: 'UBER_EATS_CLIENT_ID or CLIENT_SECRET not configured'
        });
      }

      // Exchange authorization code for access token
      const tokenResponse = await fetch('https://login.uber.com/oauth/v2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri
        })
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`);
      }

      const tokenData = await tokenResponse.json();
      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token;
      expiresIn = tokenData.expires_in || 3600;
      scopes = tokenData.scope ? tokenData.scope.split(' ') : [];

      // Fetch store information from Uber API
      const storeResponse = await fetch('https://api.uber.com/v1/eats/stores', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (storeResponse.ok) {
        const storeData = await storeResponse.json();
        if (storeData.stores && storeData.stores.length > 0) {
          storeId = storeData.stores[0].id;
          merchantId = storeData.stores[0].merchant_id || storeId;
        }
      }
    }

    // Calculate token expiration time
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // Encrypt tokens before storing
    const encryptedAccessToken = encryptToString(accessToken);
    const encryptedRefreshToken = encryptToString(refreshToken);

    // Store in database
    const { data, error } = await supabase
      .from('platform_integrations')
      .upsert({
        branch_id: branch_id,
        platform: 'uber_eats',
        store_id: storeId,
        uber_merchant_id: merchantId,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: tokenExpiresAt.toISOString(),
        oauth_scopes: scopes,
        integration_status: 'active',
        activated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'branch_id,platform'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`✅ Uber Eats OAuth completed for branch: ${branch_id}`);
    console.log(`   Store ID: ${storeId}`);
    console.log(`   Token expires: ${tokenExpiresAt.toISOString()}`);

    // Redirect to frontend success page
    const frontendUrl = process.env.FRONTEND_URL || 'https://dev-vizionmenu.vercel.app';
    res.redirect(`${frontendUrl}/settings/branch?uber_eats=connected&store_id=${storeId}`);

  } catch (error) {
    console.error('OAuth callback error:', error);

    // Redirect to frontend error page
    const frontendUrl = process.env.FRONTEND_URL || 'https://dev-vizionmenu.vercel.app';
    res.redirect(`${frontendUrl}/settings/integrations?uber_eats=error&message=${encodeURIComponent(error.message)}`);
  }
});

/**
 * Get OAuth connection status for a branch
 * GET /api/v1/uber-eats/auth/status?branch_id=xxx
 */
router.get('/status', async (req, res) => {
  try {
    const { branch_id } = req.query;

    if (!branch_id) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'branch_id is required'
      });
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Check if integration exists and is active
    const { data: integration, error } = await supabase
      .from('platform_integrations')
      .select('integration_status, store_id, uber_merchant_id, activated_at, token_expires_at')
      .eq('branch_id', branch_id)
      .eq('platform', 'uber_eats')
      .single();

    if (error || !integration) {
      return res.json({
        connected: false,
        status: 'not_connected'
      });
    }

    // Check if token is expired
    const isExpired = integration.token_expires_at && new Date(integration.token_expires_at) < new Date();

    res.json({
      connected: integration.integration_status === 'active',
      status: integration.integration_status,
      store_id: integration.store_id,
      merchant_id: integration.uber_merchant_id,
      activated_at: integration.activated_at,
      token_expired: isExpired
    });

  } catch (error) {
    console.error('OAuth status check error:', error);
    res.status(500).json({
      error: 'Status check failed',
      message: error.message
    });
  }
});

/**
 * Disconnect Uber Eats integration
 * DELETE /api/v1/uber-eats/auth/disconnect?branch_id=xxx
 */
router.delete('/disconnect', async (req, res) => {
  try {
    const { branch_id } = req.query;

    if (!branch_id) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'branch_id is required'
      });
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Update integration status to removed
    const { error } = await supabase
      .from('platform_integrations')
      .update({
        integration_status: 'removed',
        deactivated_at: new Date().toISOString()
      })
      .eq('branch_id', branch_id)
      .eq('platform', 'uber_eats');

    if (error) {
      throw error;
    }

    console.log(`✅ Uber Eats disconnected for branch: ${branch_id}`);

    res.json({
      success: true,
      message: 'Uber Eats integration disconnected successfully'
    });

  } catch (error) {
    console.error('OAuth disconnect error:', error);
    res.status(500).json({
      error: 'Disconnect failed',
      message: error.message
    });
  }
});

module.exports = router;
