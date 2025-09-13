// =====================================================
// ERROR HANDLER HELPER
// Standardized error handling across all controllers
// =====================================================

/**
 * Standardized error response format
 * @param {Object} error - Error object
 * @param {string} operation - Operation that failed (e.g., 'create user', 'fetch orders')
 * @returns {Object} Formatted error response
 */
function formatErrorResponse(error, operation = 'operation') {
  // Default response structure
  const response = {
    error: {
      code: 'INTERNAL_ERROR',
      message: `Failed to ${operation}`,
      details: error.message
    }
  };

  // Handle specific error types
  if (error.message.includes('Failed to create auth user')) {
    response.error.code = 'AUTH_ERROR';
    response.error.message = 'User authentication setup failed';
  } else if (error.message.includes('Failed to add user to branch')) {
    response.error.code = 'DATABASE_ERROR';
    response.error.message = 'User profile creation failed';
  } else if (error.message.includes('Insufficient permissions')) {
    response.error.code = 'FORBIDDEN';
    response.error.message = 'Insufficient permissions for this operation';
  } else if (error.message.includes('User not found')) {
    response.error.code = 'NOT_FOUND';
    response.error.message = 'User not found';
  } else if (error.message.includes('Order not found')) {
    response.error.code = 'NOT_FOUND';
    response.error.message = 'Order not found';
  } else if (error.message.includes('Branch not found')) {
    response.error.code = 'NOT_FOUND';
    response.error.message = 'Branch not found';
  } else if (error.message.includes('Invalid role')) {
    response.error.code = 'VALIDATION_ERROR';
    response.error.message = 'Invalid role specified';
  } else if (error.message.includes('Invalid order status')) {
    response.error.code = 'VALIDATION_ERROR';
    response.error.message = 'Invalid order status';
  }

  return response;
}

/**
 * Get appropriate HTTP status code based on error code
 * @param {string} errorCode - Error code from formatErrorResponse
 * @returns {number} HTTP status code
 */
function getHttpStatusCode(errorCode) {
  const statusMap = {
    'VALIDATION_ERROR': 400,
    'AUTH_ERROR': 401,
    'FORBIDDEN': 403,
    'NOT_FOUND': 404,
    'DATABASE_ERROR': 500,
    'INTERNAL_ERROR': 500
  };

  return statusMap[errorCode] || 500;
}

/**
 * Express error handler middleware
 * @param {Error} error - Error object
 * @param {string} operation - Operation that failed
 * @param {Object} res - Express response object
 */
function handleControllerError(error, operation, res) {
  console.error(`${operation} error:`, error);
  
  const errorResponse = formatErrorResponse(error, operation);
  const statusCode = getHttpStatusCode(errorResponse.error.code);
  
  res.status(statusCode).json(errorResponse);
}

module.exports = {
  formatErrorResponse,
  getHttpStatusCode,
  handleControllerError
};