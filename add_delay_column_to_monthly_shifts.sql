-- Add delay column to monthly_shifts table
-- This tracks how many minutes late an employee was for their shift

ALTER TABLE monthly_shifts 
ADD COLUMN IF NOT EXISTS delay_minutes NUMERIC(5,2) DEFAULT 0;

-- Add a comment to explain the column
COMMENT ON COLUMN monthly_shifts.delay_minutes IS 'Number of minutes the employee was late for their scheduled shift start time';

-- Create an index for performance on delay_minutes
CREATE INDEX IF NOT EXISTS idx_monthly_shifts_delay_minutes 
ON monthly_shifts(delay_minutes) 
WHERE delay_minutes > 0;

-- Update the additional_overtime_recorded column if it doesn't exist
ALTER TABLE monthly_shifts 
ADD COLUMN IF NOT EXISTS additional_overtime_recorded BOOLEAN DEFAULT FALSE;

-- Add a comment to explain the additional_overtime_recorded column
COMMENT ON COLUMN monthly_shifts.additional_overtime_recorded IS 'Tracks whether additional overtime was recorded after the original checkout'; 