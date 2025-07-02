-- Fix delay calculation for all-time overtime shifts
-- Set delay_minutes to 0 for all shifts where all_time_overtime = TRUE

-- First, let's see which shifts have all_time_overtime enabled
SELECT id, name, start_time, end_time, position, all_time_overtime 
FROM shifts 
WHERE all_time_overtime = TRUE
ORDER BY name;

-- Update monthly_shifts records to set delay_minutes = 0 for all-time overtime shifts
UPDATE monthly_shifts 
SET delay_minutes = 0,
    updated_at = NOW()
WHERE shift_id IN (
  SELECT id FROM shifts WHERE all_time_overtime = TRUE
)
AND delay_minutes > 0;

-- Verify the fix - show recent records for all-time overtime shifts
SELECT 
  ms.work_date,
  u.name as employee,
  s.name as shift,
  s.all_time_overtime,
  ms.regular_hours,
  ms.overtime_hours,
  ms.delay_minutes,
  ms.check_in_time,
  ms.check_out_time
FROM monthly_shifts ms
JOIN shifts s ON ms.shift_id = s.id
JOIN users u ON ms.user_id = u.id
WHERE s.all_time_overtime = TRUE
  AND ms.work_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY ms.work_date DESC, u.name; 