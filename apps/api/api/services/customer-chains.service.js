const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get chain by slug for customer ordering
 * @param {string} slug - Chain slug from URL
 * @returns {Object} Chain data with basic info
 */
async function getChainBySlug(slug) {
  if (!slug) {
    throw new Error('Chain slug is required');
  }

  const { data: chain, error } = await supabase
    .from('restaurant_chains')
    .select('id, name, slug, description, logo_url')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !chain) {
    throw new Error('Chain not found or inactive');
  }

  return chain;
}

/**
 * Get active branches for a chain
 * @param {string} chainId - Chain ID
 * @returns {Array} Active branches with location data
 */
async function getChainBranches(chainId) {
  if (!chainId) {
    throw new Error('Chain ID is required');
  }

  const { data: branches, error } = await supabase
    .from('branches')
    .select(`
      id,
      name,
      slug, 
      address,
      location,
      phone,
      email
    `)
    .eq('chain_id', chainId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch branches: ${error.message}`);
  }

  return branches || [];
}

/**
 * Validate branch belongs to chain
 * @param {string} branchId - Branch ID
 * @param {string} chainId - Chain ID  
 * @returns {Object} Branch data if valid
 */
async function validateBranchForChain(branchId, chainId) {
  if (!branchId || !chainId) {
    throw new Error('Branch ID and Chain ID are required');
  }

  const { data: branch, error } = await supabase
    .from('branches')
    .select('id, name, chain_id')
    .eq('id', branchId)
    .eq('chain_id', chainId)
    .eq('is_active', true)
    .single();

  if (error || !branch) {
    throw new Error('Branch not found or does not belong to this chain');
  }

  return branch;
}

/**
 * Get chain by branch ID (for QR code compatibility)
 * @param {string} branchId - Branch ID
 * @returns {Object} Chain data for the branch
 */
async function getChainByBranchId(branchId) {
  if (!branchId) {
    throw new Error('Branch ID is required');
  }

  const { data: result, error } = await supabase
    .from('branches')
    .select(`
      id,
      name,
      restaurant_chains (
        id,
        name,
        slug,
        description,
        logo_url
      )
    `)
    .eq('id', branchId)
    .eq('is_active', true)
    .single();

  if (error || !result || !result.restaurant_chains) {
    throw new Error('Branch not found or chain is inactive');
  }

  return {
    branch: {
      id: result.id,
      name: result.name
    },
    chain: result.restaurant_chains
  };
}

module.exports = {
  getChainBySlug,
  getChainBranches,
  validateBranchForChain,
  getChainByBranchId
};