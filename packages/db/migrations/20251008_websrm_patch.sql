-- ============================================================================
-- WEB-SRM Schema Patch - Phase 5.5.1
-- ============================================================================
-- Created: 2025-01-08
-- Purpose: Minor refinements to WEB-SRM schema
--   - QR data length limit for receipts
--   - Additional indexes for audit log performance
--   - cod_retour tracking for WEB-SRM response codes
--   - Queue scheduling optimization indexes
--
-- NOTE: This is an additive patch - safe to apply after 20251007_websrm.sql
-- ============================================================================

-- ============================================================================
-- UP Migration
-- ============================================================================

-- 1) receipts: qr_data length limit (NULL allowed; if present ≤ 2048)
--    Reason: Prevent QR URL/data explosion; PDF/print limits compliance
ALTER TABLE receipts
  ADD CONSTRAINT receipts_qr_data_len_check
  CHECK (qr_data IS NULL OR length(qr_data) <= 2048);

-- 2) websrm_audit_log: request_path index (fast filtering/reporting)
--    Reason: Common query pattern - filter by API endpoint
CREATE INDEX idx_audit_request_path
  ON websrm_audit_log (request_path);

-- 3) websrm_audit_log: cod_retour column + index
--    Reason: Track WEB-SRM response codes ("code retour") for error analysis
--    Note: Separate from HTTP status (response_status) - WEB-SRM specific code
ALTER TABLE websrm_audit_log
  ADD COLUMN cod_retour VARCHAR(32);

CREATE INDEX idx_audit_cod_retour
  ON websrm_audit_log (cod_retour)
  WHERE cod_retour IS NOT NULL; -- Partial index (only non-null values)

-- 4) websrm_audit_log: response_status index (HTTP status filtering)
--    Reason: Common query - find all 4xx/5xx errors
CREATE INDEX idx_audit_response_status
  ON websrm_audit_log (response_status)
  WHERE response_status IS NOT NULL; -- Partial index

-- 5) websrm_transaction_queue: Scheduling optimization indexes
--    Reason: Fast lookup for queue consumers (pending items by schedule time)

-- Pending items by scheduled_at (initial queue processing)
CREATE INDEX idx_queue_pending_scheduled
  ON websrm_transaction_queue (scheduled_at)
  WHERE status = 'pending' AND scheduled_at IS NOT NULL;

-- Pending items by next_retry_at (retry/backoff processing)
CREATE INDEX idx_queue_pending_next_retry
  ON websrm_transaction_queue (next_retry_at)
  WHERE status = 'pending' AND next_retry_at IS NOT NULL;

-- ============================================================================
-- DOWN Migration
-- ============================================================================

-- Drop indexes (reverse order)
DROP INDEX IF EXISTS idx_queue_pending_next_retry;
DROP INDEX IF EXISTS idx_queue_pending_scheduled;
DROP INDEX IF EXISTS idx_audit_response_status;
DROP INDEX IF EXISTS idx_audit_cod_retour;
DROP INDEX IF EXISTS idx_audit_request_path;

-- Drop receipts qr_data length check
ALTER TABLE receipts
  DROP CONSTRAINT IF EXISTS receipts_qr_data_len_check;

-- Drop cod_retour column (rollback)
ALTER TABLE websrm_audit_log
  DROP COLUMN IF EXISTS cod_retour;

-- ============================================================================
-- End of Migration
-- ============================================================================
