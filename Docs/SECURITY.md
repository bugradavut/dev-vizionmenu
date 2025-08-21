# Security Assessment & Action Plan - Vizion Menu

**Assessment Date**: January 2025  
**Project**: Vizion Menu - Multi-tenant Restaurant Management Platform  
**Assessed By**: Claude Code Security Analysis

---

## 🚨 CRITICAL SECURITY VULNERABILITIES (Priority 1 - Immediate Action Required)

### 1. **HARDCODED SUPABASE KEYS** ⭐⭐⭐⭐⭐
**Risk Level**: CRITICAL  
**File**: `apps/api/api/index.js:14-17`

**Issue**:
```javascript
// SECURITY RISK: Hardcoded production keys in source code
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
process.env.SUPABASE_JWT_SECRET = 'or/5hRDTnnaMIMEtgHVxOSB/HUvvB9qazVSKGTtlDSCGGzQoVIZ/IA5lbfuZTyYdM+TCuKeib11cckjlw1yYCw=='
```

**Impact**: 
- Full database access for anyone with source code access
- Complete data breach potential
- All user data, orders, and business information exposed

**Fix Action**:
1. Remove hardcoded keys from `apps/api/api/index.js` and `apps/api/index.js`
2. Regenerate ALL Supabase keys immediately in Supabase dashboard
3. Update Vercel environment variables with new keys
4. Verify .env files are properly gitignored

**Code Fix**:
```javascript
// Replace hardcoded values with proper environment check
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config();
  } catch (error) {
    console.error('Environment variables not found. Please check Vercel configuration.');
    process.exit(1);
  }
}
```

---

### 2. **JWT TOKEN SIGNATURE VALIDATION MISSING** ⭐⭐⭐⭐
**Risk Level**: HIGH  
**File**: `apps/api/api/middleware/auth.middleware.js:75`

**Issue**:
```javascript
// SECURITY RISK: No signature validation
const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
```

**Impact**:
- Attackers can create fake JWT tokens
- Unauthorized access to all protected endpoints
- Complete authentication bypass

**Fix Action**:
Install jsonwebtoken and verify signatures:
```bash
cd apps/api && npm install jsonwebtoken
```

**Code Fix**:
```javascript
const jwt = require('jsonwebtoken');

// Replace manual parsing with proper verification
try {
  const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
  currentUserId = payload.sub;
} catch (error) {
  return res.status(401).json({
    error: { code: 'UNAUTHORIZED', message: 'Invalid token signature' }
  });
}
```

---

### 3. **USER CREDENTIALS IN LOCALSTORAGE** ⭐⭐⭐
**Risk Level**: MEDIUM-HIGH  
**File**: `apps/web/src/contexts/auth-context.tsx:154`

**Issue**:
```javascript
// SECURITY RISK: Storing credentials in localStorage
localStorage.setItem(USER_CREDENTIALS_KEY, JSON.stringify({
  email: email,
  timestamp: Date.now()
}));
```

**Impact**:
- XSS attacks can steal user credentials
- Persistent credential exposure
- No secure storage mechanism

**Fix Action**:
```javascript
// Option 1: Remove credential storage entirely (recommended)
// Remove USER_CREDENTIALS_KEY usage completely

// Option 2: Use secure session storage only for UI state
sessionStorage.setItem('auth-ui-state', JSON.stringify({
  lastLoginTime: Date.now()
  // No sensitive data
}));
```

---

## ⚠️ HIGH PRIORITY SECURITY ISSUES (Priority 2 - Fix Within 1 Week)

### 4. **PRODUCTION CONSOLE LOGS** ⭐⭐⭐
**Risk Level**: MEDIUM  
**Files**: 39 files with console.log statements

**Issue**: Debug information exposed in production browser console

**Impact**: 
- Sensitive data leakage
- Application logic exposure
- Performance degradation

**Fix Action**:
Create production build script to remove console logs:
```javascript
// Add to next.config.ts
const nextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error']
    } : false
  }
}
```

---

### 5. **CORS WILDCARD CONFIGURATION** ⭐⭐⭐
**Risk Level**: MEDIUM  
**File**: `apps/api/api/index.js:73`

**Issue**:
```javascript
// SECURITY RISK: Allows all origins
res.header('Access-Control-Allow-Origin', '*');
```

**Impact**: 
- CSRF attack vulnerability
- No origin validation
- Potential data theft from malicious sites

**Fix Action**:
```javascript
// Replace with specific allowed origins
const allowedOrigins = [
  'https://dev-vizionmenu.vercel.app',
  'https://vizionmenu.com',
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  // ... rest of CORS headers
  next();
});
```

---

### 6. **INPUT VALIDATION GAPS** ⭐⭐⭐
**Risk Level**: MEDIUM  
**Files**: `users.controller.js`, `orders.controller.js`

**Issue**: Missing input sanitization and validation

**Impact**: 
- Potential injection attacks
- Data corruption
- System instability

**Fix Action**:
Install validation library and implement:
```bash
cd apps/api && npm install joi
```

```javascript
const Joi = require('joi');

// Add validation schemas
const userValidationSchema = Joi.object({
  email: Joi.string().email().required(),
  full_name: Joi.string().max(100).required(),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional(),
  role: Joi.string().valid('chain_owner', 'branch_manager', 'staff').required()
});

// Use in controllers
const { error, value } = userValidationSchema.validate(req.body);
if (error) {
  return res.status(400).json({
    error: { code: 'VALIDATION_ERROR', message: error.details[0].message }
  });
}
```

---

## 🔧 MEDIUM PRIORITY IMPROVEMENTS (Priority 3 - Fix Within 1 Month)

### 7. **RATE LIMITING ENHANCEMENT** ⭐⭐
**Risk Level**: LOW-MEDIUM  
**File**: `apps/api/api/middleware/rate-limit.middleware.js`

**Issue**: IP-based rate limiting can be bypassed with proxies/VPN

**Fix Action**:
Implement user-based rate limiting:
```javascript
// Enhanced rate limiting
const advancedRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.currentUserId || req.ip;
  },
  // Different limits for authenticated vs anonymous users
  skip: (req) => {
    if (req.currentUserId) {
      // Authenticated users get higher limits
      return false;
    }
    // Anonymous users get stricter limits
    return false;
  }
});
```

---

### 8. **ERROR MESSAGE SANITIZATION** ⭐⭐
**Risk Level**: LOW  
**File**: `apps/api/api/helpers/error-handler.js`

**Issue**: Detailed error messages expose internal system information

**Fix Action**:
```javascript
function handleControllerError(error, operation, res) {
  console.error(`Error in ${operation}:`, error);

  // Sanitize error messages for production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const sanitizedError = {
    code: error.code || 'INTERNAL_ERROR',
    message: isDevelopment ? error.message : 'An internal error occurred',
    ...(isDevelopment && { stack: error.stack })
  };

  res.status(error.statusCode || 500).json({ error: sanitizedError });
}
```

---

## 🐛 CODE QUALITY & BUG FIXES (Priority 4 - Fix When Convenient)

### 9. **NULL/UNDEFINED TYPE SAFETY** ⭐⭐
**Files**: Multiple files with string-based null checks

**Issue**:
```javascript
// Poor type checking
if (!branch_id || branch_id === 'undefined' || branch_id === 'null')
```

**Fix Action**:
```javascript
// Proper type checking
if (!branch_id || typeof branch_id !== 'string' || branch_id.trim() === '')
```

---

### 10. **HARDCODED VALUES REMOVAL** ⭐⭐
**File**: `apps/web/src/app/settings/users/page.tsx:33`

**Issue**:
```javascript
// Hardcoded fallback UUID
const currentBranchId = user?.branch_id || "550e8400-e29b-41d4-a716-446655440002";
```

**Fix Action**:
```javascript
// Proper error handling instead of hardcoded fallback
const currentBranchId = user?.branch_id;
if (!currentBranchId) {
  // Handle missing branch context appropriately
  return <ErrorMessage message="Branch context not available" />;
}
```

---

### 11. **TODO ITEMS CLEANUP** ⭐
**Count**: 47 unfinished TODO items

**Action Plan**:
- Review all TODO comments
- Either implement the feature or remove the TODO
- Create proper issues for complex TODOs

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Critical Security (Do Immediately)
- [ ] **Remove hardcoded Supabase keys from source code**
- [ ] **Regenerate all Supabase keys**
- [ ] **Update Vercel environment variables**
- [ ] **Implement JWT signature validation**
- [ ] **Remove user credentials from localStorage**

### Phase 2: High Priority (Within 1 Week)
- [ ] **Configure specific CORS origins**
- [ ] **Remove production console.log statements**
- [ ] **Implement input validation with Joi**
- [ ] **Add request sanitization middleware**

### Phase 3: Medium Priority (Within 1 Month)
- [ ] **Enhance rate limiting with user-based logic**
- [ ] **Sanitize error messages for production**
- [ ] **Implement proper logging with Winston**
- [ ] **Add security headers middleware**

### Phase 4: Code Quality (Ongoing)
- [ ] **Fix null/undefined type checks**
- [ ] **Remove hardcoded values**
- [ ] **Complete or remove TODO items**
- [ ] **Add comprehensive test coverage**

---

## 🛡️ SECURITY BEST PRACTICES GOING FORWARD

### 1. **Environment Variable Management**
- Never commit secrets to git
- Use different keys for development/staging/production
- Implement key rotation policy

### 2. **Authentication & Authorization**
- Always validate JWT signatures
- Implement proper session management
- Use least privilege principle for permissions

### 3. **Input Validation**
- Validate all user inputs
- Sanitize data before database operations
- Use parameterized queries

### 4. **Monitoring & Logging**
- Implement security event logging
- Monitor for suspicious activities
- Set up alerts for authentication failures

### 5. **Regular Security Reviews**
- Conduct monthly security assessments
- Keep dependencies updated
- Review new code for security implications

---

## 📞 EMERGENCY CONTACTS

If a security breach is suspected:
1. **Immediately revoke all API keys**
2. **Check Supabase dashboard for unusual activity**
3. **Review access logs in Vercel**
4. **Notify all team members**

**Next Security Review**: March 2025

---

*This document should be kept confidential and updated as security improvements are implemented.*