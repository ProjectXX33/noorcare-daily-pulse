-- Update the existing "OverTime" shift to enable all_time_overtime flag
-- This will make all time worked in this shift count as overtime

-- First, let's see what OverTime shifts exist
SELECT id, name, start_time, end_time, position, all_time_overtime 
FROM shifts 
WHERE name ILIKE '%overtime%' OR name ILIKE '%over%time%'
ORDER BY name;

-- Update all shifts with "OverTime" in the name to have all_time_overtime = true
UPDATE shifts 
SET all_time_overtime = TRUE, 
    updated_at = NOW()
WHERE (name ILIKE '%overtime%' OR name ILIKE '%over%time%')
  AND all_time_overtime != TRUE;

-- Verify the update
SELECT id, name, start_time, end_time, position, all_time_overtime 
FROM shifts 
WHERE all_time_overtime = TRUE
ORDER BY name; 