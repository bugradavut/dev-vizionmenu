-- Add GST and QST tax registration numbers to branches table
-- Required for Quebec SRS (Sales Recording System) FO-108 compliance
-- GST (Goods and Services Tax) - Federal tax registration number
-- QST (Quebec Sales Tax) - Provincial tax registration number

-- Add columns
ALTER TABLE branches
ADD COLUMN IF NOT EXISTS gst_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS qst_number VARCHAR(20);

-- Add comments for documentation
COMMENT ON COLUMN branches.gst_number IS 'GST (Goods and Services Tax) registration number. Format: XXXXXXXXXRTXXXX (9 digits + RT + 4 digits)';
COMMENT ON COLUMN branches.qst_number IS 'QST (Quebec Sales Tax) registration number. Format: XXXXXXXXXXTYXXXX (10 digits + TQ + 4 digits)';

-- Add check constraints for format validation (optional - frontend will validate)
ALTER TABLE branches
ADD CONSTRAINT check_gst_format
  CHECK (gst_number IS NULL OR gst_number ~ '^\d{9}RT\d{4}$'),
ADD CONSTRAINT check_qst_format
  CHECK (qst_number IS NULL OR qst_number ~ '^\d{10}TQ\d{4}$');
