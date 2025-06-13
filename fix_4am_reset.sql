-- Fix 4 AM Reset Configuration
-- This script updates the work time configuration to use 4 AM reset

-- Update existing work time configuration to use 4 AM reset
UPDATE work_time_config 
SET daily_reset_time = '04:00:00',
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'default';

-- If no configuration exists, create it with 4 AM reset
INSERT INTO work_time_config (name, daily_reset_time, work_day_start, work_day_end)
VALUES ('default', '04:00:00', '09:00:00', '00:00:00')
ON CONFLICT (name) DO UPDATE SET
    daily_reset_time = '04:00:00',
    updated_at = CURRENT_TIMESTAMP;

-- Verify the configuration
SELECT 
    name,
    daily_reset_time,
    work_day_start,
    work_day_end,
    updated_at
FROM work_time_config 
WHERE name = 'default'; 