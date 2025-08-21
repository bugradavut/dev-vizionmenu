// =====================================================
// RATE LIMITING MIDDLEWARE
// API abuse prevention with configurable limits
// =====================================================

const rateLimit = require('express-rate-limit');

/**
 * General API rate limiting
 * Applies to all endpoints unless overridden
 * Development: More lenient limits for testing
 */
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 10000 : 1000, // Dev: 10k, Prod: 1k requests
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful requests in some cases
  skipSuccessfulRequests: false,
  // Custom key generator (could be used for user-based limiting)
  keyGenerator: (req) => {
    // Use IP address as key, but could be enhanced with user ID for authenticated requests
    return req.ip;
  }
});

/**
 * Strict rate limiting for authentication endpoints
 * Prevents brute force attacks on login/register
 */
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth attempts per windowMs
  message: {
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts from this IP, please try again later.',
      retryAfter: '15 minutes'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests for auth endpoints
  skipSuccessfulRequests: true,
  keyGenerator: (req) => req.ip
});

/**
 * Moderate rate limiting for order creation
 * Prevents spam orders while allowing normal usage
 */
const orderCreationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes  
  max: 10, // Limit each IP to 10 order creations per 5 minutes
  message: {
    error: {
      code: 'ORDER_RATE_LIMIT_EXCEEDED',
      message: 'Too many orders created from this IP, please wait before creating another order.',
      retryAfter: '5 minutes'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
});

/**
 * Strict rate limiting for admin operations
 * Prevents abuse of sensitive operations
 * Development: More lenient limits for testing
 */
const adminRateLimit = rateLimit({
  windowMs: process.env.NODE_ENV === 'development' ? 5 * 60 * 1000 : 10 * 60 * 1000, // Dev: 5 min, Prod: 10 min
  max: process.env.NODE_ENV === 'development' ? 500 : 50, // Dev: 500, Prod: 50 operations
  message: {
    error: {
      code: 'ADMIN_RATE_LIMIT_EXCEEDED',
      message: 'Too many administrative operations from this IP, please try again later.',
      retryAfter: process.env.NODE_ENV === 'development' ? '5 minutes' : '10 minutes'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
});

/**
 * Very strict rate limiting for password reset/sensitive operations
 */
const sensitiveRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 sensitive operations per hour
  message: {
    error: {
      code: 'SENSITIVE_RATE_LIMIT_EXCEEDED',
      message: 'Too many sensitive operations from this IP, please try again later.',
      retryAfter: '1 hour'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
});

/**
 * Lenient rate limiting for public/customer endpoints
 * Allows higher usage for customer-facing features
 */
const publicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per 15 minutes
  message: {
    error: {
      code: 'PUBLIC_RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
});

module.exports = {
  generalRateLimit,
  authRateLimit,
  orderCreationRateLimit,
  adminRateLimit,
  sensitiveRateLimit,
  publicRateLimit
};