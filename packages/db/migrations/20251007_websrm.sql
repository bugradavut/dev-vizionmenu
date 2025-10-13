-- ============================================================================
-- WEB-SRM Schema Migration - Phase 5.5
-- ============================================================================
-- Created: 2025-01-07
-- Phase: 5.5 (Offline migration draft - NO production deployment yet)
--
-- Purpose:
--   - Store WEB-SRM fiscal receipts (hashes + signatures only, NO PII)
--   - Transaction queue for async processing
--   - Audit log for compliance tracking
--
-- Security:
--   - NO PII stored (only transaction IDs, hashes, signatures)
--   - All sensitive data is in encrypted format
--   - Audit trail for all operations
--
-- Multi-tenancy:
--   - All tables have tenant_id for isolation
--   - Indexes on (tenant_id, ...) for query performance
--
-- NOTE: This migration will be reviewed and approved before deployment.
--       Phase 5.5 testing is OFFLINE ONLY with pg-mem.
-- ============================================================================

-- ============================================================================
-- UP Migration
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enum: websrm_queue_status
-- Status for transaction queue processing
-- ----------------------------------------------------------------------------
CREATE TYPE websrm_queue_status AS ENUM (
  'pending',      -- Waiting to be processed
  'processing',   -- Currently being sent to WEB-SRM
  'completed',    -- Successfully sent and confirmed
  'failed',       -- Failed after retries
  'cancelled'     -- Manually cancelled or invalidated
);

-- ----------------------------------------------------------------------------
-- Function: set_updated_at()
-- Trigger function to automatically update updated_at timestamp
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Table: receipts
-- Stores fiscal receipts returned by WEB-SRM API
-- ----------------------------------------------------------------------------
-- Purpose:
--   - Store receipt data for customer access
--   - Track signature chain integrity
--   - Support receipt verification and reprints
--
-- Security:
--   - NO PII: Only order IDs (UUID), signatures, and hashes
--   - Signatures are ECDSA P-256 P1363 Base64 (88 chars)
--   - Hashes are SHA-256 hex (64 chars)
--
-- Multi-tenancy:
--   - tenant_id + order_id for isolation
--   - Unique constraint on (tenant_id, order_id, format, print_mode)
--
-- Receipt Types (format):
--   - CUSTOMER: Customer copy (fiscal receipt)
--   - MERCHANT: Merchant copy (for accounting)
--   - INTERNAL: Internal copy (audit/reprint)
--
-- Print Modes (print_mode):
--   - PAPER: Physical receipt printed
--   - ELECTRONIC: Email/SMS/QR delivery only
-- ----------------------------------------------------------------------------
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, -- Branch/restaurant ID (multi-tenant isolation)

  -- Order reference (NO customer PII)
  order_id UUID NOT NULL, -- References orders(id) - internal order UUID

  -- WEB-SRM transaction metadata
  websrm_transaction_id TEXT, -- WEB-SRM assigned ID (e.g., 'SRM-123456')
  transaction_timestamp TIMESTAMPTZ NOT NULL, -- Québec local time (EST/EDT)

  -- Receipt format and content
  format TEXT NOT NULL CHECK (format IN ('CUSTOMER', 'MERCHANT', 'INTERNAL')),
  print_mode TEXT NOT NULL CHECK (print_mode IN ('PAPER', 'ELECTRONIC')),

  -- Signature chain (ECDSA P-256 P1363 Base64)
  -- NOTE: These are cryptographic signatures, NOT customer data
  signa_preced TEXT NOT NULL CHECK (signa_preced ~ '^[A-Za-z0-9+/=]{88}$'),
  signa_actu TEXT NOT NULL CHECK (signa_actu ~ '^[A-Za-z0-9+/=]{88}$'),

  -- Canonical payload hash (SHA-256 hex)
  payload_hash TEXT NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),

  -- QR code data (URL for verification portal)
  qr_data TEXT,

  -- Receipt content (base64-encoded PDF or text)
  receipt_content TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE (tenant_id, order_id, format, print_mode)
);

-- Indexes for receipts
CREATE INDEX idx_receipts_tenant_order ON receipts(tenant_id, order_id);
CREATE INDEX idx_receipts_tenant_created ON receipts(tenant_id, created_at DESC);
CREATE INDEX idx_receipts_websrm_txn ON receipts(websrm_transaction_id) WHERE websrm_transaction_id IS NOT NULL;
CREATE INDEX idx_receipts_tenant_timestamp ON receipts(tenant_id, transaction_timestamp DESC);

-- Trigger for updated_at
CREATE TRIGGER receipts_updated_at
  BEFORE UPDATE ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- Table: websrm_transaction_queue
-- Queue for async WEB-SRM transaction processing
-- ----------------------------------------------------------------------------
-- Purpose:
--   - Queue transactions for background processing
--   - Retry failed transactions with exponential backoff
--   - Track processing status and errors
--
-- Security:
--   - NO PII: Only order IDs and cryptographic hashes
--   - Error messages sanitized (no sensitive data)
--
-- Multi-tenancy:
--   - tenant_id for isolation
--   - Separate queues per tenant
-- ----------------------------------------------------------------------------
CREATE TABLE websrm_transaction_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Order reference
  order_id UUID NOT NULL,

  -- Idempotency (prevent duplicate processing)
  idempotency_key TEXT NOT NULL, -- Unique key for deduplication (e.g., hash of order+timestamp)

  -- Queue status
  status websrm_queue_status NOT NULL DEFAULT 'pending',

  -- Processing metadata
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Retry logic
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0 AND retry_count <= 20),
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,

  -- Request data (hashes only, NO PII)
  canonical_payload_hash TEXT NOT NULL CHECK (canonical_payload_hash ~ '^[a-f0-9]{64}$'),
  request_signature TEXT CHECK (request_signature ~ '^[A-Za-z0-9+/=]{88}$'),

  -- Response data
  websrm_transaction_id TEXT,
  response_code TEXT,

  -- Error tracking (sanitized messages only)
  error_message TEXT,
  last_error_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE (tenant_id, order_id),
  UNIQUE (tenant_id, idempotency_key) -- Prevent duplicate queue entries
);

-- Indexes for transaction queue
CREATE INDEX idx_queue_tenant_status ON websrm_transaction_queue(tenant_id, status);
CREATE INDEX idx_queue_status_scheduled ON websrm_transaction_queue(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_queue_status_retry ON websrm_transaction_queue(status, next_retry_at) WHERE status = 'failed' AND next_retry_at IS NOT NULL;
CREATE INDEX idx_queue_tenant_order ON websrm_transaction_queue(tenant_id, order_id);
CREATE INDEX idx_queue_idempotency ON websrm_transaction_queue(tenant_id, idempotency_key); -- Fast duplicate check

-- Trigger for updated_at
CREATE TRIGGER queue_updated_at
  BEFORE UPDATE ON websrm_transaction_queue
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- Table: websrm_audit_log
-- Audit trail for all WEB-SRM operations
-- ----------------------------------------------------------------------------
-- Purpose:
--   - Compliance: Track all interactions with WEB-SRM API
--   - Debugging: Detailed logs for troubleshooting
--   - Security: Audit trail for all operations
--
-- Security:
--   - NO PII: Only order IDs, hashes, and sanitized metadata
--   - Request/response bodies stored as hashes only
--   - IP addresses NOT stored (privacy compliance)
--
-- Retention:
--   - Recommend: Keep for 7 years (Québec tax law requirement)
--   - Partition by year for performance
-- ----------------------------------------------------------------------------
CREATE TABLE websrm_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Operation metadata
  operation TEXT NOT NULL, -- 'transaction', 'cancellation', 'status', etc.
  order_id UUID, -- May be NULL for system operations

  -- Request metadata
  request_method TEXT NOT NULL, -- 'POST', 'GET', etc.
  request_path TEXT NOT NULL, -- '/transaction', '/cancellation', etc.
  request_body_hash TEXT CHECK (request_body_hash ~ '^[a-f0-9]{64}$'), -- SHA-256 of request body
  request_signature TEXT CHECK (request_signature ~ '^[A-Za-z0-9+/=]{88}$'), -- ECDSA signature

  -- Response metadata
  response_status INTEGER, -- HTTP status code
  response_body_hash TEXT CHECK (response_body_hash ~ '^[a-f0-9]{64}$'), -- SHA-256 of response body
  websrm_transaction_id TEXT, -- WEB-SRM assigned ID

  -- Timing
  duration_ms INTEGER, -- Request duration in milliseconds

  -- Error tracking (sanitized only)
  error_code TEXT,
  error_message TEXT, -- Sanitized error message (NO PII)

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit log
CREATE INDEX idx_audit_tenant_created ON websrm_audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_tenant_order ON websrm_audit_log(tenant_id, order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_audit_operation ON websrm_audit_log(operation, created_at DESC);
CREATE INDEX idx_audit_websrm_txn ON websrm_audit_log(websrm_transaction_id) WHERE websrm_transaction_id IS NOT NULL;

-- NOTE: No updated_at trigger for audit log (append-only, no updates)

-- ============================================================================
-- DOWN Migration
-- ============================================================================

-- Drop tables (reverse order of creation)
DROP TABLE IF EXISTS websrm_audit_log;
DROP TABLE IF EXISTS websrm_transaction_queue;
DROP TABLE IF EXISTS receipts;

-- Drop function
DROP FUNCTION IF EXISTS set_updated_at();

-- Drop enum
DROP TYPE IF EXISTS websrm_queue_status;

-- ============================================================================
-- End of Migration
-- ============================================================================
