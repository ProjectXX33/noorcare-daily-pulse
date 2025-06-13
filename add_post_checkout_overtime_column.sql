-- Add column to track additional overtime recorded after checkout
-- This helps prevent duplicate overtime recordings

ALTER TABLE monthly_shifts 
ADD COLUMN IF NOT EXISTS additional_overtime_recorded BOOLEAN DEFAULT FALSE;

-- Add a comment to explain the column
COMMENT ON COLUMN monthly_shifts.additional_overtime_recorded IS 'Tracks whether additional overtime was recorded after the original checkout';

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_monthly_shifts_additional_overtime 
ON monthly_shifts(additional_overtime_recorded) 
WHERE additional_overtime_recorded = TRUE; 