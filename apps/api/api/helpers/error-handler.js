/**
 * Professional Error Handler
 * Enterprise-grade error handling with custom error classes
 */

const { logger } = require('../utils/logger');
const { APIError } = require('../errors/custom-errors');

/**
 * Standardized error response format using custom error classes
 * @param {Error} error - Error object (could be APIError or native Error)
 * @param {string} operation - Operation that failed
 * @returns {Object} Formatted error response
 */
function formatErrorResponse(error, operation = 'operation') {
  // If it's already an APIError, use its structured format
  if (error instanceof APIError) {
    return error.toJSON();
  }

  // Legacy compatibility - handle string-based error patterns
  const response = {
    error: {
      code: 'INTERNAL_ERROR',
      message: `Failed to ${operation}`,
      details: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }
  };

  // Handle specific legacy error patterns
  if (error.message) {
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
  }

  return response;
}

/**
 * Get appropriate HTTP status code from error
 * @param {Error} error - Error object (APIError or native Error)
 * @returns {number} HTTP status code
 */
function getHttpStatusCode(error) {
  // If it's an APIError, use its statusCode
  if (error instanceof APIError) {
    return error.statusCode;
  }

  // Legacy mapping for string-based error codes
  const statusMap = {
    'VALIDATION_ERROR': 400,
    'AUTH_ERROR': 401,
    'FORBIDDEN': 403,
    'NOT_FOUND': 404,
    'DATABASE_ERROR': 500,
    'INTERNAL_ERROR': 500
  };

  // If error has a statusCode property, use it
  if (error.statusCode && typeof error.statusCode === 'number') {
    return error.statusCode;
  }

  // For legacy compatibility, check error code
  if (error.errorCode && statusMap[error.errorCode]) {
    return statusMap[error.errorCode];
  }

  return 500; // Default to internal server error
}

/**
 * Professional Express error handler middleware
 * @param {Error} error - Error object (APIError or native Error)
 * @param {string} operation - Operation that failed
 * @param {Object} res - Express response object
 * @param {Object} req - Express request object (optional, for logging context)
 */
function handleControllerError(error, operation, res, req = null) {
  // Log error with context
  logger.error(`Controller error in ${operation}`, {
    error,
    req,
    meta: {
      operation,
      errorType: error.constructor.name,
      statusCode: error.statusCode || 500
    }
  });

  // Format response using new error handling
  const errorResponse = formatErrorResponse(error, operation);
  const statusCode = getHttpStatusCode(error);

  // Send structured error response
  res.status(statusCode).json(errorResponse);
}

/**
 * Express error middleware (for unhandled errors)
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function errorMiddleware(error, req, res, next) {
  handleControllerError(error, 'unhandled error', res, req);
}

module.exports = {
  formatErrorResponse,
  getHttpStatusCode,
  handleControllerError,
  errorMiddleware
};