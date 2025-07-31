# Vision Menu - Deployment Workflow & Architecture

**Complete deployment guide for Vision Menu multi-tenant restaurant management platform**

---

## 🏗️ Repository & Environment Setup

### **Dual Repository Strategy**

**Development Repository**: `dev-vizionmenu` 
- **Purpose**: Active development, testing, and feature implementation
- **Auto-deploy**: `dev-vizionmenu.vercel.app` (frontend) + `dev-vizionmenu-web.vercel.app` (API)
- **Database**: Shared Supabase instance with development data
- **Branch**: `main` branch triggers automatic deployment

**Company Repository**: `Food-Ordering-System`
- **Purpose**: Production-ready, stable releases only
- **Deployment**: Manual deployment after thorough testing
- **Code Quality**: Only tested, stable features are promoted
- **Release Cycle**: Versioned releases with proper tagging

---

## 🏗️ Unified Backend Architecture

### **Express.js Unified Implementation**

Vision Menu uses a **unified Express.js backend** that runs identically in development and production:

```
Development:  node apps/api/api/index.js → http://localhost:3001
Production:   Vercel Serverless Function → https://dev-vizionmenu-web.vercel.app
```

### **Key Architecture Benefits**

1. **Production-Development Parity**: Identical code execution in all environments
2. **Zero Configuration Deployment**: Same Express.js app runs everywhere
3. **Simplified Debugging**: Consistent behavior across environments  
4. **Single Codebase Maintenance**: No separate development/production codebases
5. **Rapid Deployment**: Direct deployment without build transformations

### **Implementation Details**

```javascript
// apps/api/api/index.js - Unified Express.js server
const app = express();

// Development: Auto-detect and run as standalone server
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`🚀 Express API running on http://localhost:${PORT}`);
  });
}

// Production: Export for Vercel serverless function
module.exports = app;
```

### **Database & Service Integration**

- **Database**: Single Supabase PostgreSQL instance across all environments
- **Authentication**: Supabase Auth with custom JWT claims
- **File Storage**: Supabase Storage for uploads and assets
- **Environment Variables**: Managed through Vercel dashboard
- **Consistent API Responses**: Unified `{data: ..., meta: ...}` format

---

## 🔄 Complete Development Workflow

### **1. Local Development**

```bash
# Start all services locally
pnpm dev                    # All apps (web + api + worker)
pnpm dev:web               # Frontend only (http://localhost:3000)
pnpm dev:api               # Backend only (http://localhost:3001)
pnpm dev:worker            # Background worker only

# Development commands
pnpm build                 # Build all packages
pnpm lint                  # Lint all code
pnpm type-check           # TypeScript validation
```

### **2. Feature Development Process**

```bash
# 1. Create feature branch (optional for solo dev)
git checkout -b feature/user-management-enhancement

# 2. Develop with hot reload
pnpm dev

# 3. Test locally with full functionality
# - Frontend: http://localhost:3000
# - Backend: http://localhost:3001
# - Database: Live Supabase instance

# 4. Commit with conventional commits
git add .
git commit -m "feat: enhance user role assignment with hierarchy validation"
git push origin main  # or feature branch
```

### **3. Automatic Deployment (Development)**

**Every push to `main` branch triggers:**

1. **Frontend Deployment**:
   - **URL**: `https://dev-vizionmenu.vercel.app`
   - **Build**: Next.js production build
   - **Assets**: Static optimization and CDN distribution

2. **Backend Deployment**:
   - **URL**: `https://dev-vizionmenu-web.vercel.app`
   - **Function**: Express.js as Vercel serverless function
   - **Environment**: Production environment variables

3. **Database**: 
   - **Connection**: Same Supabase instance
   - **Data**: Shared development/production data
   - **RLS**: Branch-level security policies active

### **4. Testing & Validation Phase**

```bash
# Comprehensive testing checklist
1. ✅ Frontend functionality at dev-vizionmenu.vercel.app
2. ✅ API endpoints responding at dev-vizionmenu-web.vercel.app  
3. ✅ Authentication flow working correctly
4. ✅ User management operations functional
5. ✅ Role-based access control enforced
6. ✅ Database operations completing successfully
7. ✅ Error handling working properly
8. ✅ Performance acceptable
```

### **5. Production Release Process**

When development version is stable and tested:

#### **Option A: Manual Deployment**
```bash
# Add company repository as remote (one-time setup)
git remote add company https://github.com/vizionmenu/Food-Ordering-System.git

# Deploy to production
git push company main
```

#### **Option B: Automated Script** (Recommended)
```powershell
# Windows PowerShell - runs comprehensive checks
.\deploy-to-company.ps1 "v1.3.0 - User management system complete"

# Script performs:
# - Switches to main branch
# - Pulls latest changes
# - Checks for uncommitted changes
# - Runs build and type checking
# - Deploys to company repository
# - Creates release tag
```

---

## 📦 Deployment Scripts & Automation

### **PowerShell Deployment Script (`deploy-to-company.ps1`)**

Automated production deployment with comprehensive validation:

```powershell
# Complete deployment automation
.\deploy-to-company.ps1 "v1.3.0 - User management system with RBAC complete"

# Script workflow:
1. ✅ Switches to main branch
2. ✅ Pulls latest changes from origin
3. ✅ Checks for uncommitted changes  
4. ✅ Runs TypeScript type checking
5. ✅ Runs build process (all packages)
6. ✅ Runs linting validation
7. ✅ Creates release tag
8. ✅ Pushes to company repository
9. ✅ Provides deployment confirmation
```

### **Environment Variables Management**

**Required Vercel Environment Variables:**
```bash
# Supabase Configuration
SUPABASE_URL=https://hfaqldkvnefjerosndxr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_JWT_SECRET=or/5hRDT...

# Application Configuration  
FRONTEND_URL=https://dev-vizionmenu.vercel.app
NODE_ENV=production

# Optional: Redis for background jobs
REDIS_URL=redis://...
```

---

## 🚨 Critical Deployment Guidelines

### **⚠️ Development Repository Rules**
- **All development happens in dev repository**
- **Never commit directly to company repository**
- **Company repository receives only tested, stable code**
- **Use feature branches for experimental features**

### **✅ Pre-Deployment Checklist**

**Required Validations:**
- [ ] **Authentication system fully functional**
- [ ] **User management CRUD operations working**
- [ ] **Role-based access control enforced**
- [ ] **API endpoints responding correctly**
- [ ] **Database operations completing successfully**
- [ ] **Frontend UI responsive and functional**
- [ ] **Error handling working properly**
- [ ] **Build process completing without errors**
- [ ] **TypeScript compilation successful**
- [ ] **ESLint validation passing**

**Quality Assurance:**
- [ ] **Manual testing completed on dev environment**
- [ ] **Cross-browser compatibility verified**
- [ ] **Mobile responsiveness tested**
- [ ] **Performance metrics acceptable**
- [ ] **Security features validated**

### **🔄 Emergency Hotfix Workflow**

For critical production issues:

```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-auth-bug

# 2. Implement fix with minimal changes
git add .
git commit -m "hotfix: resolve JWT token validation issue"

# 3. Push to development for testing
git push origin hotfix/critical-auth-bug

# 4. Test thoroughly on dev environment
# Verify fix at: dev-vizionmenu.vercel.app

# 5. Merge to main after validation
git checkout main  
git merge hotfix/critical-auth-bug
git push origin main

# 6. Deploy to production immediately
git push company main

# 7. Monitor production deployment
```

---

## 📊 Monitoring & Observability

### **Production Monitoring**

**Frontend Monitoring:**
- **URL**: `https://dev-vizionmenu.vercel.app`
- **Metrics**: Core Web Vitals, performance, error rates
- **Analytics**: User interactions, page load times

**Backend API Monitoring:**
- **URL**: `https://dev-vizionmenu-web.vercel.app`
- **Health Check**: `/health` endpoint
- **Metrics**: Response times, error rates, throughput
- **Logging**: Structured error logging with Winston

**Database Monitoring:**
- **Platform**: Supabase Dashboard
- **Metrics**: Query performance, connection pools
- **Security**: RLS policy enforcement, auth events

### **Development Resources**

- **Development Frontend**: `https://dev-vizionmenu.vercel.app`
- **Development API**: `https://dev-vizionmenu-web.vercel.app`
- **Company Repository**: `https://github.com/vizionmenu/Food-Ordering-System`
- **Vercel Dashboard**: Deployment logs and performance analytics
- **Supabase Dashboard**: Database management and monitoring

---

## 🛠️ Troubleshooting Guide

### **Common Deployment Issues**

#### **Problem: "Permission denied to company repository"**
```bash
# Solution 1: SSH Key Setup
ssh-keygen -t ed25519 -C "your-email@example.com"
# Add SSH key to GitHub organization

# Solution 2: HTTPS with Personal Access Token  
git remote set-url company https://username:token@github.com/vizionmenu/Food-Ordering-System.git
```

#### **Problem: "Merge conflicts during deployment"**
```bash
# Fetch latest from company repository
git remote add company https://github.com/vizionmenu/Food-Ordering-System.git
git fetch company
git pull company main

# Resolve conflicts manually
git add .
git commit -m "resolve: merge conflicts from company repository"
git push company main
```

#### **Problem: "Build fails on Vercel deployment"**
```bash
# Test build locally first
pnpm build

# Check for dependency issues
pnpm install
rm -rf node_modules/.cache
pnpm install

# Verify TypeScript compilation
pnpm type-check

# Check environment variables in Vercel dashboard
```

#### **Problem: "Database connection issues"**
```bash
# Verify Supabase configuration
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Test database connection locally
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('Database connection test:', supabase);
"
```

#### **Problem: "Authentication not working after deployment"**
```bash
# Check JWT configuration
# Verify SUPABASE_JWT_SECRET matches Supabase project
# Confirm frontend NEXT_PUBLIC_SUPABASE_URL is correct
# Test auth endpoints with curl:

curl -X GET https://dev-vizionmenu-web.vercel.app/health
curl -X GET https://dev-vizionmenu-web.vercel.app/auth/profile \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🎯 Deployment Status & Metrics

**Current Status**: ✅ **Production Ready**
- **User Management System**: Fully implemented and deployed
- **Authentication**: Multi-tenant auth with Supabase integration
- **API Endpoints**: User CRUD operations production-ready
- **Frontend**: Responsive Next.js application deployed
- **Database**: Supabase with RLS policies active

**Next Deployment Targets**:
- **Order Management System**: Complete CRUD operations
- **Menu Management**: Category and item management
- **Real-time Features**: WebSocket integration
- **Background Jobs**: Email and notification processing

---

**Last Updated**: January 2025 | **Deployment Version**: v1.0.0** 