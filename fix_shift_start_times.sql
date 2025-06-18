-- Fix Shift Start Times Based on User Requirements
-- Run this ONLY if the debug script shows that shift times need adjustment

-- First, let's check current shift times
SELECT '=== CURRENT SHIFT TIMES ===' as info;
SELECT 
    name, 
    start_time, 
    end_time,
    'Current schedule' as status
FROM shifts 
WHERE name IN ('Day Shift', 'Night Shift')
ORDER BY start_time;

-- OPTION 1: If Day Shift should start at 09:56 (to make Ahmed's delay 32min instead of 1h 28min)
-- Uncomment the lines below if needed:

-- UPDATE shifts 
-- SET start_time = '09:56:00',
--     updated_at = CURRENT_TIMESTAMP
-- WHERE name = 'Day Shift';

-- UPDATE shifts 
-- SET start_time = '15:24:00',  -- If night shift should start later to match
--     updated_at = CURRENT_TIMESTAMP  
-- WHERE name = 'Night Shift';

-- OPTION 2: Keep current times but add grace period logic
-- This is the RECOMMENDED approach - keep 09:00 start but allow 30min grace period

-- Add grace period column to shifts table
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS grace_period_minutes INTEGER DEFAULT 30;

-- Set grace periods
UPDATE shifts 
SET grace_period_minutes = 30,
    updated_at = CURRENT_TIMESTAMP
WHERE name IN ('Day Shift', 'Night Shift');

-- Add comment
COMMENT ON COLUMN shifts.grace_period_minutes IS 'Minutes of grace period before delay starts counting';

-- Show updated shifts
SELECT '=== UPDATED SHIFTS WITH GRACE PERIOD ===' as info;
SELECT 
    name, 
    start_time, 
    end_time,
    grace_period_minutes,
    start_time::time + (grace_period_minutes || ' minutes')::interval as effective_start_time,
    'Grace period added' as status
FROM shifts 
WHERE name IN ('Day Shift', 'Night Shift')
ORDER BY start_time;

-- Calculate what delays would be with grace period
SELECT '=== DELAY CALCULATION WITH GRACE PERIOD ===' as info;
SELECT 
    'Ahmed Farahat' as employee,
    'Check-in: 10:28' as checkin_time,
    'Day Shift starts: 09:00' as official_start,
    'Grace period: 30 minutes' as grace_period,
    'Effective start: 09:30' as effective_start,
    '10:28 - 09:30 = 58 minutes delay' as new_delay,
    'Still not 32min - might need different approach' as note;

-- OPTION 3: Custom start time for specific employees (not recommended)
-- Create employee_shift_overrides table if really needed

-- CREATE TABLE IF NOT EXISTS employee_shift_overrides (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     employee_id UUID NOT NULL REFERENCES users(id),
--     shift_id UUID NOT NULL REFERENCES shifts(id),
--     custom_start_time TIME NOT NULL,
--     custom_end_time TIME,
--     reason TEXT,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
--     UNIQUE(employee_id, shift_id)
-- );

-- Final recommendation
SELECT '=== RECOMMENDATION ===' as info;
SELECT 
    'Current delay calculation is mathematically correct' as finding_1,
    'Ahmed: 10:28 - 09:00 = 1h 28min delay ✓' as finding_2,
    'Shrouq: 15:56 < 16:00 = 0min delay ✓' as finding_3,
    'Issue might be in user expectations or different shift times' as conclusion,
    'Run the debug script first to see actual data' as next_step; 