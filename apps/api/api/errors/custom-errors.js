/**
 * Custom Error Classes for VizionMenu API
 * Enterprise-level error handling with structured error codes
 */

/**
 * Base API Error class
 * All custom errors extend from this
 */
class APIError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true; // Distinguishes operational errors from programming errors

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.errorCode,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp
      }
    };
  }
}

/**
 * Validation Error - 400
 * For input validation failures
 */
class ValidationError extends APIError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Authentication Error - 401
 * For authentication failures
 */
class AuthenticationError extends APIError {
  constructor(message = 'Authentication required', details = null) {
    super(message, 401, 'AUTHENTICATION_ERROR', details);
  }
}

/**
 * Authorization Error - 403
 * For authorization/permission failures
 */
class AuthorizationError extends APIError {
  constructor(message = 'Insufficient permissions', details = null) {
    super(message, 403, 'AUTHORIZATION_ERROR', details);
  }
}

/**
 * Not Found Error - 404
 * For resource not found scenarios
 */
class NotFoundError extends APIError {
  constructor(resource = 'Resource', id = null) {
    const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND', { resource, id });
  }
}

/**
 * Conflict Error - 409
 * For conflicts like duplicate resources
 */
class ConflictError extends APIError {
  constructor(message, details = null) {
    super(message, 409, 'CONFLICT_ERROR', details);
  }
}

/**
 * Database Error - 500
 * For database operation failures
 */
class DatabaseError extends APIError {
  constructor(message, operation = null, details = null) {
    super(message, 500, 'DATABASE_ERROR', { operation, ...details });
  }
}

/**
 * External Service Error - 502
 * For third-party service failures
 */
class ExternalServiceError extends APIError {
  constructor(service, message, details = null) {
    super(`External service error: ${service} - ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', { service, ...details });
  }
}

/**
 * Rate Limit Error - 429
 * For rate limiting scenarios
 */
class RateLimitError extends APIError {
  constructor(message = 'Rate limit exceeded', retryAfter = null) {
    super(message, 429, 'RATE_LIMIT_ERROR', { retryAfter });
  }
}

/**
 * Business Logic Error - 422
 * For business rule violations
 */
class BusinessLogicError extends APIError {
  constructor(message, rule = null, details = null) {
    super(message, 422, 'BUSINESS_LOGIC_ERROR', { rule, ...details });
  }
}

/**
 * Error factory function to create appropriate error instances
 * @param {Error} originalError - The original error
 * @param {string} context - Context where error occurred
 * @returns {APIError} - Appropriate error instance
 */
function createErrorFromOriginal(originalError, context = 'Unknown') {
  // If it's already an APIError, return as is
  if (originalError instanceof APIError) {
    return originalError;
  }

  const message = originalError.message || 'Unknown error occurred';

  // Database-specific errors
  if (originalError.code) {
    switch (originalError.code) {
      case '23505': // PostgreSQL unique violation
        return new ConflictError('Duplicate entry', {
          constraint: originalError.constraint,
          detail: originalError.detail
        });

      case '23503': // PostgreSQL foreign key violation
        return new ValidationError('Referenced resource does not exist', {
          constraint: originalError.constraint,
          detail: originalError.detail
        });

      case '42703': // PostgreSQL undefined column
        return new DatabaseError('Database schema error', context, {
          column: originalError.column,
          table: originalError.table
        });

      case '42P01': // PostgreSQL undefined table
        return new DatabaseError('Table not found', context, {
          table: originalError.table
        });

      default:
        return new DatabaseError(message, context, {
          originalCode: originalError.code
        });
    }
  }

  // Network/HTTP errors
  if (originalError.response) {
    return new ExternalServiceError(
      originalError.config?.baseURL || 'Unknown service',
      message,
      {
        status: originalError.response.status,
        data: originalError.response.data
      }
    );
  }

  // Default to generic API error
  return new APIError(message, 500, 'INTERNAL_ERROR', { context });
}

module.exports = {
  APIError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
  RateLimitError,
  BusinessLogicError,
  createErrorFromOriginal
};