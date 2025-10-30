-- Migration: Offline Mode Sessions Tracking (SW-78 FO-105 Step 2)
-- Purpose: Track when offline mode activates and deactivates in the SRS
-- Date: 2025-10-30

-- Create offline_mode_sessions table
CREATE TABLE IF NOT EXISTS offline_mode_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Branch association
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,

  -- Session timing
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ,
  duration_seconds INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN deactivated_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (deactivated_at - activated_at))::INTEGER
      ELSE NULL
    END
  ) STORED,

  -- Session metadata
  orders_created INTEGER NOT NULL DEFAULT 0,
  device_info JSONB,
  user_agent TEXT,

  -- Network information
  last_network_status TEXT CHECK (last_network_status IN ('offline', 'online')),
  sync_attempts INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_offline_sessions_branch_id
  ON offline_mode_sessions(branch_id);

CREATE INDEX IF NOT EXISTS idx_offline_sessions_activated_at
  ON offline_mode_sessions(activated_at DESC);

CREATE INDEX IF NOT EXISTS idx_offline_sessions_deactivated_at
  ON offline_mode_sessions(deactivated_at DESC)
  WHERE deactivated_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_offline_sessions_active
  ON offline_mode_sessions(branch_id, activated_at)
  WHERE deactivated_at IS NULL;

-- Add comments for documentation
COMMENT ON TABLE offline_mode_sessions IS
  'SW-78 FO-105: Tracks offline mode activation/deactivation events for Quebec SRS compliance';

COMMENT ON COLUMN offline_mode_sessions.activated_at IS
  'Timestamp when offline mode was activated (network lost)';

COMMENT ON COLUMN offline_mode_sessions.deactivated_at IS
  'Timestamp when offline mode was deactivated (network restored). NULL = still offline';

COMMENT ON COLUMN offline_mode_sessions.duration_seconds IS
  'Calculated duration in seconds between activation and deactivation';

COMMENT ON COLUMN offline_mode_sessions.orders_created IS
  'Number of offline orders created during this session';

-- Enable Row Level Security (RLS)
ALTER TABLE offline_mode_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Branch staff can view their own branch sessions
CREATE POLICY "Branch staff can view own branch offline sessions"
  ON offline_mode_sessions
  FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM branch_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: System can insert offline sessions
CREATE POLICY "System can insert offline sessions"
  ON offline_mode_sessions
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: System can update offline sessions
CREATE POLICY "System can update offline sessions"
  ON offline_mode_sessions
  FOR UPDATE
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_offline_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at_offline_sessions ON offline_mode_sessions;
CREATE TRIGGER set_updated_at_offline_sessions
  BEFORE UPDATE ON offline_mode_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_offline_session_updated_at();
