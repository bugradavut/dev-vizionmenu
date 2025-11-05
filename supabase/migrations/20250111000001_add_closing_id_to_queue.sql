-- =====================================================
-- ADD CLOSING_ID TO WEBSRM TRANSACTION QUEUE
-- SW-78 FO-115: Support FER (Fermeture) daily closing transactions
-- =====================================================

-- Add closing_id column to support FER transactions
ALTER TABLE websrm_transaction_queue
ADD COLUMN IF NOT EXISTS closing_id UUID REFERENCES daily_closings(id);

-- Add index for closing_id lookups
CREATE INDEX IF NOT EXISTS idx_websrm_queue_closing_id
ON websrm_transaction_queue(closing_id);

-- Update constraint: either order_id OR closing_id must be present (not both)
-- Note: This is a check constraint to ensure data integrity
ALTER TABLE websrm_transaction_queue
ADD CONSTRAINT check_order_or_closing
CHECK (
  (order_id IS NOT NULL AND closing_id IS NULL) OR
  (order_id IS NULL AND closing_id IS NOT NULL)
);

-- Add comment
COMMENT ON COLUMN websrm_transaction_queue.closing_id IS
'Daily closing ID for FER (Fermeture) transactions. Mutually exclusive with order_id.';
