-- Add all_time_overtime column to shifts table
-- This column allows marking custom shifts to have all time counted as overtime

ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS all_time_overtime BOOLEAN DEFAULT FALSE;

-- Add a comment to explain the column
COMMENT ON COLUMN shifts.all_time_overtime IS 'When true, all time worked in this shift is counted as overtime instead of regular time';

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_shifts_all_time_overtime 
ON shifts(all_time_overtime) 
WHERE all_time_overtime = TRUE;

-- Update existing custom shifts to have the default value
UPDATE shifts 
SET all_time_overtime = FALSE 
WHERE all_time_overtime IS NULL; 