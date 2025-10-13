-- WEB-SRM Circuit Breaker State Table - Phase 9
--
-- Purpose: Shared circuit breaker state across multiple API instances
-- Previous: In-memory (process-scoped) - inconsistent across restarts/instances
-- Now: DB-backed - persistent and shared
--
-- Migration: 20251010_websrm_circuit_breaker.sql
-- Author: Phase 9 - ESSAI Live Integration
-- Date: 2025-01-10

-- ============================================================================
-- Circuit Breaker State Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS websrm_circuit_breaker (
  -- Primary key: Unique identifier for CB context
  -- Format: '<env>:<operation>' (e.g., 'essai:transaction', 'prod:transaction')
  key TEXT PRIMARY KEY,

  -- Consecutive failure counter (for TEMP_UNAVAILABLE errors only)
  -- Threshold: 5 consecutive failures → state transitions to OPEN
  consecutive_failures INTEGER NOT NULL DEFAULT 0,

  -- Circuit breaker state
  -- 'CLOSED' = Normal operation (accepting requests)
  -- 'OPEN' = Circuit tripped (rejecting requests, waiting for timeout)
  -- 'HALF_OPEN' = Testing recovery (allowing limited requests)
  state TEXT NOT NULL DEFAULT 'CLOSED',

  -- Timestamp when circuit opened (NULL if not open)
  -- Used for auto-close after timeout (60 seconds)
  opened_at TIMESTAMPTZ,

  -- Last state update timestamp
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Index on state for monitoring queries (find all OPEN circuits)
CREATE INDEX IF NOT EXISTS idx_websrm_cb_state
  ON websrm_circuit_breaker(state);

-- Index on opened_at for timeout checks
CREATE INDEX IF NOT EXISTS idx_websrm_cb_opened_at
  ON websrm_circuit_breaker(opened_at)
  WHERE opened_at IS NOT NULL;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE websrm_circuit_breaker IS
  'Shared circuit breaker state for WEB-SRM API calls. Prevents cascading failures by temporarily blocking requests after sustained errors.';

COMMENT ON COLUMN websrm_circuit_breaker.key IS
  'Unique identifier: <env>:<operation> (e.g., essai:transaction)';

COMMENT ON COLUMN websrm_circuit_breaker.consecutive_failures IS
  'Counter for consecutive TEMP_UNAVAILABLE errors. Resets on success or non-retryable errors.';

COMMENT ON COLUMN websrm_circuit_breaker.state IS
  'Circuit state: CLOSED (normal), OPEN (tripped), HALF_OPEN (testing recovery)';

COMMENT ON COLUMN websrm_circuit_breaker.opened_at IS
  'Timestamp when circuit opened. NULL when state is CLOSED.';

COMMENT ON COLUMN websrm_circuit_breaker.updated_at IS
  'Last state change timestamp. Updated on every state transition.';

-- ============================================================================
-- Initial Data (Optional - for monitoring)
-- ============================================================================

-- Insert default entries for each environment
-- These will be created on-demand by the application, but pre-seeding
-- helps with monitoring/dashboard setup

INSERT INTO websrm_circuit_breaker (key, state)
VALUES
  ('dev:transaction', 'CLOSED'),
  ('essai:transaction', 'CLOSED'),
  ('prod:transaction', 'CLOSED')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- Rollback (DOWN migration)
-- ============================================================================

-- To rollback this migration:
-- DROP TABLE IF EXISTS websrm_circuit_breaker CASCADE;
