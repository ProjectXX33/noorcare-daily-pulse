-- =====================================================
-- DEBUG DESIGNERS SHIFT TIMING ISSUE
-- =====================================================
-- This script checks the Designers Shift configuration and delay calculations
-- =====================================================

-- Step 1: Check Designers Shift configuration
-- =====================================================
SELECT '=== DESIGNERS SHIFT CONFIGURATION ===' as step;

SELECT 
    id,
    name,
    start_time,
    end_time,
    position,
    is_active,
    all_time_overtime,
    grace_period_minutes
FROM shifts 
WHERE name ILIKE '%designer%' OR name ILIKE '%designers%'
ORDER BY name;

-- Step 2: Check Mahmoud's recent shifts with detailed timing
-- =====================================================
SELECT '=== MAHMOUD RECENT SHIFTS DETAILED ===' as step;

SELECT 
    u.name as employee_name,
    s.name as shift_name,
    s.start_time as scheduled_start,
    s.end_time as scheduled_end,
    ms.work_date,
    ms.check_in_time,
    ms.check_out_time,
    ms.delay_minutes,
    ms.regular_hours,
    ms.overtime_hours,
    -- Manual delay calculation
    CASE 
        WHEN ms.check_in_time IS NOT NULL AND s.start_time IS NOT NULL THEN
            ROUND(
                EXTRACT(EPOCH FROM (
                    ms.check_in_time - 
                    (ms.work_date + s.start_time)::timestamp
                )) / 60
            )
        ELSE NULL
    END as calculated_delay_minutes,
    -- Check if check-in is before scheduled start (negative delay = early)
    CASE 
        WHEN ms.check_in_time IS NOT NULL AND s.start_time IS NOT NULL THEN
            ms.check_in_time < (ms.work_date + s.start_time)::timestamp
        ELSE NULL
    END as is_early_checkin
FROM monthly_shifts ms
JOIN users u ON ms.user_id = u.id
JOIN shifts s ON ms.shift_id = s.id
WHERE u.name ILIKE '%mahmoud%'
  AND ms.work_date >= CURRENT_DATE - INTERVAL '7 days'
  AND ms.check_in_time IS NOT NULL
ORDER BY ms.work_date DESC;

-- Step 3: Check all shifts to understand the timing system
-- =====================================================
SELECT '=== ALL ACTIVE SHIFTS ===' as step;

SELECT 
    name,
    start_time,
    end_time,
    position,
    CASE 
        WHEN name ILIKE '%day%' THEN '7 hours expected'
        WHEN name ILIKE '%night%' THEN '8 hours expected'
        ELSE 'Custom duration'
    END as expected_duration,
    CASE 
        WHEN start_time = '09:00:00' THEN '✅ Standard 9AM start'
        WHEN start_time < '09:00:00' THEN '⚠️ Early start'
        WHEN start_time > '09:00:00' THEN '⚠️ Late start'
        ELSE '❓ Unknown'
    END as start_time_analysis
FROM shifts 
WHERE is_active = true
ORDER BY start_time;

-- Step 4: Check if there are any grace period settings
-- =====================================================
SELECT '=== GRACE PERIOD SETTINGS ===' as step;

SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'shifts' 
  AND column_name LIKE '%grace%'
ORDER BY column_name;

-- Step 5: Test delay calculation manually
-- =====================================================
SELECT '=== MANUAL DELAY CALCULATION TEST ===' as step;

-- Test with specific dates from your data
SELECT 
    '2025-08-23 09:10:00' as checkin_time,
    '09:00:00' as scheduled_start,
    ROUND(
        EXTRACT(EPOCH FROM (
            '2025-08-23 09:10:00'::timestamp - 
            '2025-08-23 09:00:00'::timestamp
        )) / 60
    ) as delay_minutes_expected;

SELECT 
    '2025-08-21 09:04:00' as checkin_time,
    '09:00:00' as scheduled_start,
    ROUND(
        EXTRACT(EPOCH FROM (
            '2025-08-21 09:04:00'::timestamp - 
            '2025-08-21 09:00:00'::timestamp
        )) / 60
    ) as delay_minutes_expected;

SELECT 
    '2025-08-20 09:00:00' as checkin_time,
    '09:00:00' as scheduled_start,
    ROUND(
        EXTRACT(EPOCH FROM (
            '2025-08-20 09:00:00'::timestamp - 
            '2025-08-20 09:00:00'::timestamp
        )) / 60
    ) as delay_minutes_expected;

-- Step 6: Check if there are any special delay calculation rules
-- =====================================================
SELECT '=== DELAY CALCULATION RULES ===' as step;

SELECT 
    'Expected behavior:' as info,
    'Check-in at 09:00 = 0min delay' as rule_1,
    'Check-in at 09:04 = 4min delay' as rule_2,
    'Check-in at 09:10 = 10min delay' as rule_3,
    'Early check-in = 0min delay' as rule_4;
