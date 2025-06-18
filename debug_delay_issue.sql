-- Debug Delay Calculation Issue
-- This script checks the current shift assignments and helps understand delay calculations

-- 1. Check current shifts and their start times
SELECT '=== CURRENT SHIFTS ===' as info;
SELECT 
    id,
    name,
    start_time,
    end_time,
    position,
    is_active,
    CASE 
        WHEN name ILIKE '%day%' THEN '7 hours expected'
        WHEN name ILIKE '%night%' THEN '8 hours expected'
        ELSE 'Unknown duration'
    END as expected_duration
FROM shifts 
WHERE is_active = true
ORDER BY start_time;

-- 2. Check recent monthly_shifts with delay calculations
SELECT '=== RECENT SHIFTS WITH DELAY ===' as info;
SELECT 
    u.name as employee_name,
    s.name as shift_type,
    s.start_time as scheduled_start,
    ms.work_date,
    DATE_PART('hour', ms.check_in_time) || ':' || LPAD(DATE_PART('minute', ms.check_in_time)::text, 2, '0') as actual_checkin,
    DATE_PART('hour', ms.check_out_time) || ':' || LPAD(DATE_PART('minute', ms.check_out_time)::text, 2, '0') as actual_checkout,
    ms.delay_minutes,
    ROUND((ms.regular_hours + ms.overtime_hours)::numeric, 2) as total_hours_worked,
    ms.regular_hours,
    ms.overtime_hours,
    -- Manual delay calculation for verification
    ROUND(
        EXTRACT(EPOCH FROM (ms.check_in_time - (ms.work_date + s.start_time)::timestamp)) / 60
    ) as calculated_delay_minutes
FROM monthly_shifts ms
JOIN users u ON ms.user_id = u.id
JOIN shifts s ON ms.shift_id = s.id
WHERE ms.work_date >= CURRENT_DATE - INTERVAL '7 days'
  AND ms.check_in_time IS NOT NULL
  AND ms.check_out_time IS NOT NULL
ORDER BY ms.work_date DESC, u.name;

-- 3. Check if there are any custom shift assignments that might affect start times
SELECT '=== SHIFT ASSIGNMENTS ===' as info;
SELECT 
    u.name as employee_name,
    sa.work_date,
    s.name as assigned_shift,
    s.start_time as shift_start_time,
    sa.is_day_off
FROM shift_assignments sa
JOIN users u ON sa.employee_id = u.id
LEFT JOIN shifts s ON sa.assigned_shift_id = s.id
WHERE sa.work_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY sa.work_date DESC, u.name;

-- 4. Calculate what Ahmed's delay SHOULD be if different start times
SELECT '=== AHMED DELAY ANALYSIS ===' as info;
SELECT 
    'Ahmed Farahat' as employee,
    'Current System: Day Shift starts at 09:00' as scenario_1,
    '10:28 - 09:00 = 1h 28min delay' as result_1,
    'If Day Shift started at 09:56: 10:28 - 09:56 = 32min delay' as scenario_2,
    'User expects 32min, so maybe shift starts at 09:56?' as analysis;

-- 5. Show all employees current delay and overtime status
SELECT '=== ALL EMPLOYEE STATUS ===' as info;
SELECT 
    u.name as employee_name,
    s.name as current_shift,
    COALESCE(ms.delay_minutes, 0) as delay_minutes,
    CASE 
        WHEN COALESCE(ms.delay_minutes, 0) = 0 THEN '✅ On Time'
        WHEN ms.delay_minutes <= 30 THEN '⚠️ Minor Delay'
        WHEN ms.delay_minutes <= 60 THEN '🔶 Moderate Delay'
        ELSE '🔴 Significant Delay'
    END as delay_status,
    COALESCE(ms.regular_hours + ms.overtime_hours, 0) as total_hours_worked,
    CASE 
        WHEN s.name ILIKE '%day%' AND (ms.regular_hours + ms.overtime_hours) < 7 THEN '⚠️ Early Checkout'
        WHEN s.name ILIKE '%night%' AND (ms.regular_hours + ms.overtime_hours) < 8 THEN '⚠️ Early Checkout'
        WHEN ms.overtime_hours > 0 THEN '🔥 Overtime Worked'
        ELSE '✅ Normal Hours'
    END as hours_status
FROM users u
LEFT JOIN monthly_shifts ms ON u.id = ms.user_id AND ms.work_date = CURRENT_DATE
LEFT JOIN shifts s ON ms.shift_id = s.id
WHERE u.position = 'Customer Service'
ORDER BY u.name;

-- 6. Recommendations
SELECT '=== RECOMMENDATIONS ===' as info;
SELECT 
    'Issue 1: Ahmed shows 1h 28min delay but user expects 32min' as problem_1,
    'Solution: Check if Day Shift should start at 09:56 instead of 09:00' as solution_1,
    'Issue 2: Shrouq worked only 5h 7min for Night Shift (expected 8h)' as problem_2,
    'Solution: Add early checkout penalty tracking' as solution_2,
    'Use UPDATE shifts SET start_time = ''09:56:00'' WHERE name = ''Day Shift''; if needed' as action_needed; 