# WEB-SRM Environment Variables (Phase 6)

## Runtime Integration Configuration

Add these to your `.env` file for WEB-SRM runtime integration:

```bash
# ============================================================================
# WEB-SRM Runtime Integration (Phase 6)
# ============================================================================
# Purpose: Enable real signature/QR generation on order completion
# Security: NO network calls - local persist only
# Environment: Disabled in production (NODE_ENV=production check)
# ============================================================================

# Master switch (default: false)
WEBSRM_ENABLED=false

# Persist target: files | db | none
# - files: Save to tmp/receipts/*.json (default, recommended for testing)
# - db: Save to database (requires WEBSRM_DB_ALLOW_WRITE=true + sandbox credentials)
# - none: Generate but don't save (testing only)
WEBSRM_PERSIST=files

# Database write protection (default: false)
# CRITICAL: Only set to 'true' when using SANDBOX database
# NEVER use with production database
WEBSRM_DB_ALLOW_WRITE=false

# Device/POS Configuration
WEBSRM_DEVICE_ID=POS-DEV-001
WEBSRM_PARTNER_ID=PARTNER-001
WEBSRM_CERT_CODE=TESTCODE

# Version Information
WEBSRM_VERSI=1.0.0
WEBSRM_VERSI_PARN=1.0.0
WEBSRM_IDSEV=SRS-001
WEBSRM_IDVERSI=1.0.0

# Cryptographic Keys (PEM format)
# These are sensitive - use secure storage in production
# For testing, use test keys (NOT production keys)
WEBSRM_PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg...
-----END PRIVATE KEY-----"

WEBSRM_CERT_PEM="-----BEGIN CERTIFICATE-----
MIIBkTCCATigAwIBAgIUXxQq...
-----END CERTIFICATE-----"

# ============================================================================
# Usage Examples
# ============================================================================

# 1. Disabled (default - safe for all environments)
WEBSRM_ENABLED=false
# Result: No WEB-SRM processing

# 2. File persist (recommended for local testing)
WEBSRM_ENABLED=true
WEBSRM_PERSIST=files
# Result: Creates tmp/receipts/websrm-{orderId}-{timestamp}.json

# 3. Database persist (sandbox only)
WEBSRM_ENABLED=true
WEBSRM_PERSIST=db
WEBSRM_DB_ALLOW_WRITE=true
SANDBOX_URL=https://your-sandbox-project.supabase.co
SANDBOX_KEY=your-sandbox-anon-key
# Result: Inserts into receipts table in sandbox database

# 4. Dry-run only (generate but don't save)
WEBSRM_ENABLED=true
WEBSRM_PERSIST=none
# Result: Signatures/QR generated, logged, but not saved

# ============================================================================
# Security Notes
# ============================================================================

# Production Protection:
# - Runtime adapter BLOCKED when NODE_ENV=production
# - Even if WEBSRM_ENABLED=true, production check prevents execution
# - This is a hard-coded safety check in runtime-adapter.ts

# Database Protection:
# - DB writes require WEBSRM_DB_ALLOW_WRITE=true
# - Only use sandbox credentials, never production
# - File persist is safer for testing (no DB access needed)

# Key Management:
# - Private keys are sensitive - use environment secrets
# - Test keys for DEV/ESSAI, real keys only for PROD (when ready)
# - Keys should be different per environment

# ============================================================================
# Testing Workflow
# ============================================================================

# Step 1: Start with disabled
WEBSRM_ENABLED=false
# Create order → No WEB-SRM activity

# Step 2: Enable file persist
WEBSRM_ENABLED=true
WEBSRM_PERSIST=files
# Create order → Check tmp/receipts/ for JSON output

# Step 3: Verify JSON structure
# - meta: tenantId, orderId, printMode, format, timestamps
# - signatures: signa_preced (88 chars), signa_actu (88 chars), payload_hash (64 chars)
# - qr: URL with signature (length <= 2048)
# - headers: Official WEB-SRM headers with ECDSASIG
# - canonical: Minified JSON payload

# Step 4: Validate signatures
# - signa_actu.length === 88 (Base64)
# - payload_hash.length === 64 (hex)
# - qr includes base64url signature (URL-safe)

# ============================================================================
# Phase 6 Status
# ============================================================================

# Current: Runtime integration active
# - Real ECDSA signatures ✅
# - Real canonical payloads ✅
# - Real official headers ✅
# - Real QR codes ✅
# - Local persist (files/db) ✅
# - NO network calls ✅

# Next (Phase 7): Network integration
# - HTTP client for WEB-SRM API
# - Error mapping (SW-73.A)
# - Queue/retry logic
# - Idempotency handling

# ============================================================================
