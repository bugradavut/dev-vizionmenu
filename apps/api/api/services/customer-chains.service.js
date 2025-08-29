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
 * Get branches by location with distance calculation
 * @param {string} chainId - Chain ID
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radiusKm - Search radius in kilometers (default: 50)
 * @returns {Array} Branches sorted by distance
 */
async function getBranchesByLocation(chainId, lat, lng, radiusKm = 50) {
  if (!chainId || !lat || !lng) {
    throw new Error('Chain ID, latitude, and longitude are required');
  }

  // Using ST_Distance_Sphere for distance calculation in meters
  const { data: branches, error } = await supabase
    .rpc('get_branches_by_location', {
      p_chain_id: chainId,
      p_lat: lat,
      p_lng: lng,
      p_radius_km: radiusKm
    });

  if (error) {
    throw new Error(`Failed to fetch branches by location: ${error.message}`);
  }

  return branches || [];
}

/**
 * Get branches by address using geocoding
 * @param {string} chainId - Chain ID  
 * @param {string} address - Search address
 * @returns {Array} Branches near the address
 */
async function getBranchesByAddress(chainId, address) {
  if (!chainId || !address) {
    throw new Error('Chain ID and address are required');
  }

  // This would integrate with a geocoding service
  // For now, return all branches (to be enhanced with actual geocoding)
  const branches = await getChainBranches(chainId);
  
  // TODO: Add address-based filtering logic
  // For now, return all branches with a note
  return branches.map(branch => ({
    ...branch,
    distance: null, // Will be calculated after geocoding
    address_match: address
  }));
}

/**
 * Get branches grouped by city
 * @param {string} chainId - Chain ID
 * @returns {Object} Branches grouped by city
 */
async function getBranchesByCity(chainId) {
  if (!chainId) {
    throw new Error('Chain ID is required');
  }

  const branches = await getChainBranches(chainId);
  
  // Group branches by city (extracted from address)
  const branchesByCity = branches.reduce((acc, branch) => {
    // Extract city from address (simple extraction)
    const addressParts = branch.address?.split(',') || [];
    const city = addressParts[addressParts.length - 2]?.trim() || 'Unknown';
    
    if (!acc[city]) {
      acc[city] = [];
    }
    acc[city].push(branch);
    
    return acc;
  }, {});

  return branchesByCity;
}

/**
 * Validate delivery availability for address
 * @param {string} chainId - Chain ID
 * @param {string} address - Delivery address
 * @param {string} apartmentNumber - Apartment/unit number
 * @returns {Object} Delivery validation result
 */
async function validateDeliveryAddress(chainId, address, apartmentNumber = '') {
  if (!chainId || !address) {
    throw new Error('Chain ID and address are required');
  }

  // For now, simple validation logic
  // TODO: Integrate with actual delivery zone validation
  const branches = await getChainBranches(chainId);
  
  // Find branches that could deliver to this address
  const availableBranches = branches.filter(branch => {
    // Simple validation - in real implementation, check delivery zones
    return branch.address && address.length > 10; // Basic validation
  });

  return {
    isAvailable: availableBranches.length > 0,
    availableBranches,
    estimatedDeliveryTime: availableBranches.length > 0 ? '30-45 minutes' : null,
    deliveryFee: availableBranches.length > 0 ? 2.99 : null,
    fullAddress: `${address}${apartmentNumber ? `, ${apartmentNumber}` : ''}`
  };
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

/**
 * Get branch settings for customer ordering (public - no auth)
 * Returns only essential settings needed for customer experience
 * @param {string} branchId - Branch ID
 * @returns {Object} Branch settings data
 */
async function getBranchSettings(branchId) {
  // Get branch settings from database
  const { data: branchData, error: branchError } = await supabase
    .from('branches')
    .select('id, name, settings, is_active')
    .eq('id', branchId)
    .eq('is_active', true)
    .single();

  if (branchError || !branchData) {
    console.error('Branch settings fetch error:', branchError);
    throw new Error('Branch not found');
  }

  // Default settings if none exist
  const defaultSettings = {
    orderFlow: 'standard',
    timingSettings: {
      baseDelay: 20,
      temporaryBaseDelay: 0,
      deliveryDelay: 15,
      temporaryDeliveryDelay: 0,
      autoReady: false
    },
    paymentSettings: {
      allowOnlinePayment: true,
      allowCounterPayment: false,
      defaultPaymentMethod: 'online'
    }
  };

  const settings = { ...defaultSettings, ...branchData.settings };

  return {
    branchId: branchData.id,
    branchName: branchData.name,
    settings: settings
  };
}

module.exports = {
  getChainBySlug,
  getChainBranches,
  validateBranchForChain,
  getBranchesByLocation,
  getBranchesByAddress,
  getBranchesByCity,
  validateDeliveryAddress,
  getChainByBranchId,
  getBranchSettings
};