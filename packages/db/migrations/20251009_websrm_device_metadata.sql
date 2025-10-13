-- ============================================================================
-- WEB-SRM Device Metadata - Phase 6.1
-- ============================================================================
-- Created: 2025-01-09
-- Purpose: Add device/software identifiers to receipts table
--   - device_id (IDAPPRL) for audit trail
--   - Optional: env, software_id, software_version for compliance tracking
--   - metadata JSONB for flexible future extensions
--
-- NOTE: Additive patch - safe to apply after 20251008_websrm_patch.sql
-- ============================================================================

-- ============================================================================
-- UP Migration
-- ============================================================================

-- 1) receipts: Add device_id column (required for audit)
--    Reason: Track which POS device generated the receipt
ALTER TABLE receipts
  ADD COLUMN device_id TEXT NOT NULL DEFAULT 'UNKNOWN';

-- Remove default after backfill (future manual step)
-- ALTER TABLE receipts ALTER COLUMN device_id DROP DEFAULT;

-- 2) receipts: Add environment column (DEV/ESSAI/PROD)
--    Reason: Track which environment generated the receipt
ALTER TABLE receipts
  ADD COLUMN env TEXT CHECK (env IN ('DEV', 'ESSAI', 'PROD'));

-- 3) receipts: Add software identifiers (optional, for compliance)
--    Reason: Track software version that generated the receipt
ALTER TABLE receipts
  ADD COLUMN software_id TEXT,
  ADD COLUMN software_version TEXT;

-- 4) receipts: Add metadata JSONB for flexible extensions
--    Reason: Store additional compliance data without schema changes
--    Examples: { "partnerId": "...", "certCode": "...", "versi": "..." }
ALTER TABLE receipts
  ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

-- 5) Index: device_id for fast device-based queries
CREATE INDEX idx_receipts_device ON receipts(device_id);

-- 6) Index: env for environment-based filtering
CREATE INDEX idx_receipts_env ON receipts(env) WHERE env IS NOT NULL;

-- 7) Index: GIN index on metadata for JSONB queries
CREATE INDEX idx_receipts_metadata ON receipts USING GIN (metadata);

-- ============================================================================
-- DOWN Migration
-- ============================================================================

-- Drop indexes
DROP INDEX IF EXISTS idx_receipts_metadata;
DROP INDEX IF EXISTS idx_receipts_env;
DROP INDEX IF EXISTS idx_receipts_device;

-- Drop columns (reverse order)
ALTER TABLE receipts
  DROP COLUMN IF EXISTS metadata;

ALTER TABLE receipts
  DROP COLUMN IF EXISTS software_version,
  DROP COLUMN IF EXISTS software_id;

ALTER TABLE receipts
  DROP COLUMN IF EXISTS env;

ALTER TABLE receipts
  DROP COLUMN IF EXISTS device_id;

-- ============================================================================
-- End of Migration
-- ============================================================================
