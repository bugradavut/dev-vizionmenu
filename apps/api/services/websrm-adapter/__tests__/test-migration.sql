-- ============================================================================
-- WEB-SRM Test Migration (Simplified for pg-mem)
-- ============================================================================
-- This is a simplified version of the production migration for offline testing
-- Differences from production:
-- - No gen_random_uuid() (pg-mem doesn't support it)
-- - No TRIGGER functions (pg-mem doesn't support TRIGGER type)
-- - No updated_at triggers
-- ============================================================================

-- ============================================================================
-- UP Migration
-- ============================================================================

-- Enum: websrm_queue_status
CREATE TYPE websrm_queue_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled'
);

-- Table: receipts
CREATE TABLE receipts (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  order_id UUID NOT NULL,
  websrm_transaction_id TEXT,
  transaction_timestamp TIMESTAMPTZ NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('fiscal', 'duplicate', 'reprint')),
  print_mode TEXT NOT NULL CHECK (print_mode IN ('auto', 'manual')),
  signa_preced TEXT NOT NULL CHECK (signa_preced ~ '^[A-Za-z0-9+/=]{88}$'),
  signa_actu TEXT NOT NULL CHECK (signa_actu ~ '^[A-Za-z0-9+/=]{88}$'),
  payload_hash TEXT NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  qr_data TEXT,
  receipt_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, order_id, format, print_mode)
);

CREATE INDEX idx_receipts_tenant_order ON receipts(tenant_id, order_id);
CREATE INDEX idx_receipts_tenant_created ON receipts(tenant_id, created_at DESC);
CREATE INDEX idx_receipts_websrm_txn ON receipts(websrm_transaction_id) WHERE websrm_transaction_id IS NOT NULL;
CREATE INDEX idx_receipts_tenant_timestamp ON receipts(tenant_id, transaction_timestamp DESC);

-- Table: websrm_transaction_queue
CREATE TABLE websrm_transaction_queue (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  order_id UUID NOT NULL,
  status websrm_queue_status NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0 AND retry_count <= 20),
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  canonical_payload_hash TEXT NOT NULL CHECK (canonical_payload_hash ~ '^[a-f0-9]{64}$'),
  request_signature TEXT CHECK (request_signature ~ '^[A-Za-z0-9+/=]{88}$'),
  websrm_transaction_id TEXT,
  response_code TEXT,
  error_message TEXT,
  last_error_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, order_id)
);

CREATE INDEX idx_queue_tenant_status ON websrm_transaction_queue(tenant_id, status);
CREATE INDEX idx_queue_status_scheduled ON websrm_transaction_queue(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_queue_status_retry ON websrm_transaction_queue(status, next_retry_at) WHERE status = 'failed' AND next_retry_at IS NOT NULL;
CREATE INDEX idx_queue_tenant_order ON websrm_transaction_queue(tenant_id, order_id);

-- Table: websrm_audit_log
CREATE TABLE websrm_audit_log (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  operation TEXT NOT NULL,
  order_id UUID,
  request_method TEXT NOT NULL,
  request_path TEXT NOT NULL,
  request_body_hash TEXT CHECK (request_body_hash ~ '^[a-f0-9]{64}$'),
  request_signature TEXT CHECK (request_signature ~ '^[A-Za-z0-9+/=]{88}$'),
  response_status INTEGER,
  response_body_hash TEXT CHECK (response_body_hash ~ '^[a-f0-9]{64}$'),
  websrm_transaction_id TEXT,
  duration_ms INTEGER,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant_created ON websrm_audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_tenant_order ON websrm_audit_log(tenant_id, order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_audit_operation ON websrm_audit_log(operation, created_at DESC);
CREATE INDEX idx_audit_websrm_txn ON websrm_audit_log(websrm_transaction_id) WHERE websrm_transaction_id IS NOT NULL;

-- ============================================================================
-- DOWN Migration
-- ============================================================================

DROP TABLE IF EXISTS websrm_audit_log;
DROP TABLE IF EXISTS websrm_transaction_queue;
DROP TABLE IF EXISTS receipts;
DROP TYPE IF EXISTS websrm_queue_status;

-- ============================================================================
-- End of Migration
-- ============================================================================
