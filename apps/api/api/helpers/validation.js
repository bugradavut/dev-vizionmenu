// =====================================================
// INPUT VALIDATION HELPER
// Comprehensive input validation and sanitization
// =====================================================

/**
 * Validate required fields are present and not empty
 * @param {Object} data - Data object to validate
 * @param {Array} requiredFields - Array of required field names
 * @throws {Error} If any required field is missing or empty
 */
function validateRequiredFields(data, requiredFields) {
  const missingFields = [];
  
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      missingFields.push(field);
    }
  }
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @throws {Error} If email format is invalid
 */
function validateEmail(email) {
  if (!email) return;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
}

/**
 * Validate phone number format (basic)
 * @param {string} phone - Phone number to validate
 * @throws {Error} If phone format is invalid
 */
function validatePhone(phone) {
  if (!phone) return;
  
  // Basic phone validation - allows various formats
  const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
  if (!phoneRegex.test(phone)) {
    throw new Error('Invalid phone number format');
  }
}

/**
 * Validate string length
 * @param {string} value - String to validate
 * @param {string} fieldName - Field name for error message
 * @param {number} minLength - Minimum length
 * @param {number} maxLength - Maximum length
 * @throws {Error} If length is invalid
 */
function validateStringLength(value, fieldName, minLength = 0, maxLength = 255) {
  if (!value) return;
  
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  
  if (value.length < minLength) {
    throw new Error(`${fieldName} must be at least ${minLength} characters`);
  }
  
  if (value.length > maxLength) {
    throw new Error(`${fieldName} must be no more than ${maxLength} characters`);
  }
}

/**
 * Validate number range
 * @param {number} value - Number to validate
 * @param {string} fieldName - Field name for error message
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @throws {Error} If number is out of range
 */
function validateNumberRange(value, fieldName, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (value === null || value === undefined) return;
  
  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  
  if (num < min || num > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }
}

/**
 * Validate price (must be positive number with max 2 decimal places)
 * @param {number} price - Price to validate
 * @param {string} fieldName - Field name for error message
 * @throws {Error} If price is invalid
 */
function validatePrice(price, fieldName = 'price') {
  if (price === null || price === undefined) return;
  
  const num = Number(price);
  if (isNaN(num) || num < 0) {
    throw new Error(`${fieldName} must be a positive number`);
  }
  
  // Check decimal places (max 2)
  if ((num * 100) % 1 !== 0) {
    throw new Error(`${fieldName} cannot have more than 2 decimal places`);
  }
  
  // Maximum price validation (reasonable limit)
  if (num > 99999.99) {
    throw new Error(`${fieldName} cannot exceed $99,999.99`);
  }
}

/**
 * Validate UUID format
 * @param {string} id - UUID to validate
 * @param {string} fieldName - Field name for error message
 * @throws {Error} If UUID format is invalid
 */
function validateUUID(id, fieldName = 'id') {
  if (!id) throw new Error(`${fieldName} is required`);
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }
}

/**
 * Validate array and its items
 * @param {Array} array - Array to validate
 * @param {string} fieldName - Field name for error message
 * @param {number} minLength - Minimum array length
 * @param {number} maxLength - Maximum array length
 * @throws {Error} If array is invalid
 */
function validateArray(array, fieldName, minLength = 0, maxLength = 1000) {
  if (!Array.isArray(array)) {
    throw new Error(`${fieldName} must be an array`);
  }
  
  if (array.length < minLength) {
    throw new Error(`${fieldName} must have at least ${minLength} items`);
  }
  
  if (array.length > maxLength) {
    throw new Error(`${fieldName} cannot have more than ${maxLength} items`);
  }
}

/**
 * Sanitize string input (basic XSS protection)
 * @param {string} input - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(input) {
  if (!input || typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Validate order status
 * @param {string} status - Status to validate
 * @throws {Error} If status is invalid
 */
function validateOrderStatus(status) {
  const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'rejected'];
  
  if (!status) {
    throw new Error('Status is required');
  }
  
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Valid options: ${validStatuses.join(', ')}`);
  }
}

/**
 * Validate user role
 * @param {string} role - Role to validate
 * @throws {Error} If role is invalid
 */
function validateUserRole(role) {
  const validRoles = ['chain_owner', 'branch_manager', 'branch_staff', 'branch_cashier'];
  
  if (!role) {
    throw new Error('Role is required');
  }
  
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role. Valid options: ${validRoles.join(', ')}`);
  }
}

/**
 * Comprehensive user data validation
 * @param {Object} userData - User data to validate
 * @param {boolean} isUpdate - Whether this is an update operation
 * @returns {Object} Sanitized user data
 */
function validateUserData(userData, isUpdate = false) {
  const requiredFields = isUpdate ? [] : ['email', 'full_name', 'role'];
  
  // Validate required fields for creation
  if (!isUpdate) {
    validateRequiredFields(userData, requiredFields);
  }
  
  // Validate individual fields if provided
  if (userData.email) {
    validateEmail(userData.email);
  }
  
  if (userData.phone) {
    validatePhone(userData.phone);
  }
  
  if (userData.full_name) {
    validateStringLength(userData.full_name, 'full_name', 2, 100);
  }
  
  if (userData.role) {
    validateUserRole(userData.role);
  }
  
  // Sanitize string fields
  return {
    ...userData,
    full_name: userData.full_name ? sanitizeString(userData.full_name) : userData.full_name,
    email: userData.email ? userData.email.toLowerCase().trim() : userData.email,
    phone: userData.phone ? userData.phone.trim() : userData.phone
  };
}

/**
 * Comprehensive menu item validation
 * @param {Object} itemData - Menu item data to validate
 * @param {boolean} isUpdate - Whether this is an update operation
 * @returns {Object} Sanitized menu item data
 */
function validateMenuItemData(itemData, isUpdate = false) {
  const requiredFields = isUpdate ? [] : ['name', 'price'];
  
  // Validate required fields for creation
  if (!isUpdate) {
    validateRequiredFields(itemData, requiredFields);
  }
  
  // Validate individual fields if provided
  if (itemData.name) {
    validateStringLength(itemData.name, 'name', 2, 200);
  }
  
  if (itemData.description) {
    validateStringLength(itemData.description, 'description', 0, 1000);
  }
  
  if (itemData.price !== undefined) {
    validatePrice(itemData.price, 'price');
  }
  
  if (itemData.preparation_time !== undefined) {
    validateNumberRange(itemData.preparation_time, 'preparation_time', 1, 180); // 1-180 minutes
  }
  
  if (itemData.allergens && Array.isArray(itemData.allergens)) {
    validateArray(itemData.allergens, 'allergens', 0, 20);
  }
  
  // Sanitize string fields
  return {
    ...itemData,
    name: itemData.name ? sanitizeString(itemData.name) : itemData.name,
    description: itemData.description ? sanitizeString(itemData.description) : itemData.description
  };
}

/**
 * Validate order source
 * @param {string} source - Order source to validate
 * @throws {Error} If source is invalid
 */
function validateOrderSource(source) {
  const validSources = ['qr_code', 'web', 'uber_eats', 'doordash', 'skipthedishes'];
  
  if (!source) {
    throw new Error('Source is required');
  }
  
  if (!validSources.includes(source)) {
    throw new Error(`Invalid source. Valid options: ${validSources.join(', ')}`);
  }
}

/**
 * Validate order type
 * @param {string} orderType - Order type to validate
 * @throws {Error} If order type is invalid
 */
function validateOrderType(orderType) {
  const validOrderTypes = ['dine_in', 'takeout', 'delivery'];
  
  if (!orderType) {
    throw new Error('Order type is required');
  }
  
  if (!validOrderTypes.includes(orderType)) {
    throw new Error(`Invalid order type. Valid options: ${validOrderTypes.join(', ')}`);
  }
}

/**
 * Comprehensive order data validation
 * @param {Object} orderData - Order data to validate
 * @returns {Object} Sanitized order data
 */
function validateOrderData(orderData) {
  const requiredFields = ['customer', 'items', 'orderType', 'source'];
  
  // Validate required fields
  validateRequiredFields(orderData, requiredFields);
  
  // Validate individual fields
  validateOrderType(orderData.orderType);
  validateOrderSource(orderData.source);
  
  // Validate customer data
  if (orderData.customer) {
    if (orderData.customer.name) {
      validateStringLength(orderData.customer.name, 'customer.name', 2, 100);
    }
    if (orderData.customer.phone) {
      validatePhone(orderData.customer.phone);
    }
    if (orderData.customer.email) {
      validateEmail(orderData.customer.email);
    }
  }
  
  // Validate items array
  validateArray(orderData.items, 'items', 1, 50);
  
  // Validate optional fields
  if (orderData.tableNumber !== undefined) {
    validateNumberRange(orderData.tableNumber, 'tableNumber', 1, 999);
  }
  
  if (orderData.notes) {
    validateStringLength(orderData.notes, 'notes', 0, 500);
  }
  
  if (orderData.specialInstructions) {
    validateStringLength(orderData.specialInstructions, 'specialInstructions', 0, 1000);
  }
  
  // Sanitize string fields
  return {
    ...orderData,
    customer: {
      ...orderData.customer,
      name: orderData.customer.name ? sanitizeString(orderData.customer.name) : orderData.customer.name,
      email: orderData.customer.email ? orderData.customer.email.toLowerCase().trim() : orderData.customer.email,
      phone: orderData.customer.phone ? orderData.customer.phone.trim() : orderData.customer.phone
    },
    notes: orderData.notes ? sanitizeString(orderData.notes) : orderData.notes,
    specialInstructions: orderData.specialInstructions ? sanitizeString(orderData.specialInstructions) : orderData.specialInstructions
  };
}

/**
 * Comprehensive menu category validation
 * @param {Object} categoryData - Category data to validate
 * @param {boolean} isUpdate - Whether this is an update operation
 * @returns {Object} Sanitized category data
 */
function validateCategoryData(categoryData, isUpdate = false) {
  const requiredFields = isUpdate ? [] : ['name'];
  
  // Validate required fields for creation
  if (!isUpdate) {
    validateRequiredFields(categoryData, requiredFields);
  }
  
  // Validate individual fields if provided
  if (categoryData.name) {
    validateStringLength(categoryData.name, 'name', 2, 100);
  }
  
  if (categoryData.description) {
    validateStringLength(categoryData.description, 'description', 0, 500);
  }
  
  if (categoryData.display_order !== undefined) {
    validateNumberRange(categoryData.display_order, 'display_order', 0, 999);
  }
  
  if (categoryData.icon) {
    validateStringLength(categoryData.icon, 'icon', 0, 50);
  }
  
  // Sanitize string fields
  return {
    ...categoryData,
    name: categoryData.name ? sanitizeString(categoryData.name) : categoryData.name,
    description: categoryData.description ? sanitizeString(categoryData.description) : categoryData.description,
    icon: categoryData.icon ? sanitizeString(categoryData.icon) : categoryData.icon
  };
}

module.exports = {
  validateRequiredFields,
  validateEmail,
  validatePhone,
  validateStringLength,
  validateNumberRange,
  validatePrice,
  validateUUID,
  validateArray,
  sanitizeString,
  validateOrderStatus,
  validateUserRole,
  validateUserData,
  validateMenuItemData,
  validateOrderSource,
  validateOrderType,
  validateOrderData,
  validateCategoryData
};