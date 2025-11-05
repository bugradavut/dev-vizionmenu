-- =====================================================
-- SW-78 FO-115 Step 2: Daily Closing Receipts (FER)
-- Quebec WEB-SRM compliance - Track daily closing receipts
-- =====================================================

-- Create daily_closings table
CREATE TABLE IF NOT EXISTS daily_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  closing_date DATE NOT NULL,

  -- Summary data (calculated from orders)
  total_sales DECIMAL(10,2) DEFAULT 0,
  total_refunds DECIMAL(10,2) DEFAULT 0,
  net_sales DECIMAL(10,2) DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  gst_collected DECIMAL(10,2) DEFAULT 0,
  qst_collected DECIMAL(10,2) DEFAULT 0,

  -- Payment method breakdown
  cash_total DECIMAL(10,2) DEFAULT 0,
  card_total DECIMAL(10,2) DEFAULT 0,

  -- Status tracking
  status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'completed', 'cancelled')),

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,

  -- User tracking
  created_by UUID ON DELETE SET NULL,
  cancelled_by UUID ON DELETE SET NULL,

  -- WEB-SRM integration
  websrm_transaction_id VARCHAR(255), -- FER transaction ID from WEB-SRM
  websrm_queue_id UUID REFERENCES websrm_transaction_queue(id) ON DELETE SET NULL,

  -- Audit timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one closing per branch per day
  CONSTRAINT unique_branch_closing_date UNIQUE(branch_id, closing_date)
);

-- Create indexes for performance
CREATE INDEX idx_daily_closings_branch_id ON daily_closings(branch_id);
CREATE INDEX idx_daily_closings_closing_date ON daily_closings(closing_date);
CREATE INDEX idx_daily_closings_status ON daily_closings(status);
CREATE INDEX idx_daily_closings_created_at ON daily_closings(created_at);

-- Enable Row Level Security
ALTER TABLE daily_closings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their branch's closings
CREATE POLICY "Users can view their branch closings"
  ON daily_closings
  FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM branch_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Only branch managers and chain owners can create closings
CREATE POLICY "Branch managers can create closings"
  ON daily_closings
  FOR INSERT
  WITH CHECK (
    branch_id IN (
      SELECT branch_id FROM branch_users
      WHERE user_id = auth.uid()
      AND role IN ('branch_manager', 'chain_owner', 'platform_admin')
    )
  );

-- RLS Policy: Only creator or managers can update closings
CREATE POLICY "Managers can update closings"
  ON daily_closings
  FOR UPDATE
  USING (
    branch_id IN (
      SELECT branch_id FROM branch_users
      WHERE user_id = auth.uid()
      AND role IN ('branch_manager', 'chain_owner', 'platform_admin')
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_closings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_daily_closings_updated_at
  BEFORE UPDATE ON daily_closings
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_closings_updated_at();

-- Add comment to table
COMMENT ON TABLE daily_closings IS 'SW-78 FO-115: Daily closing receipts for Quebec WEB-SRM compliance (FER transactions)';
COMMENT ON COLUMN daily_closings.status IS 'Closing status: draft (started but not completed), completed (sent to WEB-SRM), cancelled (abandoned before completion)';
COMMENT ON COLUMN daily_closings.websrm_transaction_id IS 'WEB-SRM FER transaction ID returned after successful submission';
