// =====================================================
// CSRF PROTECTION MIDDLEWARE
// Cross-Site Request Forgery protection
// =====================================================

const crypto = require('crypto');

/**
 * Simple CSRF token generator
 * Creates a secure random token for CSRF protection
 */
function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * CSRF Protection Middleware
 * Validates CSRF tokens for state-changing operations
 */
const csrfProtection = (req, res, next) => {
  // Skip CSRF protection for development mode
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  // Skip CSRF protection for GET, HEAD, OPTIONS requests (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF protection for API requests with proper authentication
  // In a typical SPA setup, CSRF protection might be handled by SameSite cookies
  // For API-only access with JWT tokens, CSRF is less of a concern
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  // For requests without authentication or with cookie-based auth,
  // require CSRF token
  const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
    return res.status(403).json({
      error: {
        code: 'CSRF_TOKEN_INVALID',
        message: 'Invalid or missing CSRF token'
      }
    });
  }

  next();
};

/**
 * CSRF Token Generation Endpoint
 * Provides CSRF tokens for clients that need them
 */
const generateCSRFTokenEndpoint = (req, res) => {
  const token = generateCSRFToken();
  
  // Store in session if using sessions
  if (req.session) {
    req.session.csrfToken = token;
  }

  res.json({
    csrfToken: token,
    message: 'CSRF token generated successfully'
  });
};

/**
 * Enhanced security headers middleware
 * Adds security-related HTTP headers
 */
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Strict transport security (HTTPS only)
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' https:; " +
    "connect-src 'self' https:; " +
    "frame-ancestors 'none';"
  );
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Remove server header for security
  res.removeHeader('X-Powered-By');
  
  next();
};

/**
 * Request logging middleware for security monitoring
 */
const securityLogger = (req, res, next) => {
  // Log suspicious activities
  const suspiciousPatterns = [
    /\.\.\//, // Path traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection
    /exec\s*\(/i, // Code injection
  ];

  const userAgent = req.headers['user-agent'] || '';
  const url = req.url;
  const body = JSON.stringify(req.body);

  let suspicious = false;
  suspiciousPatterns.forEach(pattern => {
    if (pattern.test(url) || pattern.test(body) || pattern.test(userAgent)) {
      suspicious = true;
    }
  });

  if (suspicious) {
    console.warn('🚨 SUSPICIOUS REQUEST DETECTED:', {
      ip: req.ip,
      method: req.method,
      url: req.url,
      userAgent: userAgent,
      timestamp: new Date().toISOString()
    });
  }

  next();
};

module.exports = {
  csrfProtection,
  generateCSRFTokenEndpoint,
  securityHeaders,
  securityLogger,
  generateCSRFToken
};