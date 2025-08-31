-- =====================================================
-- FIX DELAY CALCULATION ISSUE
-- =====================================================
-- This script fixes the delay calculation to properly show delays based on check-in time
-- =====================================================

-- Step 1: Check current delay calculation logic
-- =====================================================
SELECT '=== CURRENT DELAY CALCULATION ANALYSIS ===' as step;

-- Check if there are any grace period settings that might be affecting delay calculation
SELECT 
    name,
    start_time,
    end_time,
    grace_period_minutes,
    CASE 
        WHEN grace_period_minutes IS NOT NULL THEN 
            start_time + (grace_period_minutes || ' minutes')::interval
        ELSE start_time
    END as effective_start_time
FROM shifts 
WHERE is_active = true
ORDER BY name;

-- Step 2: Recalculate delays for recent shifts
-- =====================================================
SELECT '=== RECALCULATING DELAYS ===' as step;

-- Update delay calculations for recent shifts
UPDATE monthly_shifts 
SET delay_minutes = CASE 
    WHEN check_in_time IS NOT NULL AND shifts.start_time IS NOT NULL THEN
        -- Calculate delay based on check-in time vs scheduled start time
        ROUND(
            EXTRACT(EPOCH FROM (
                check_in_time - 
                (work_date + shifts.start_time)::timestamp
            )) / 60
        )
    ELSE 0
END,
updated_at = CURRENT_TIMESTAMP
FROM shifts
WHERE monthly_shifts.shift_id = shifts.id
  AND monthly_shifts.work_date >= CURRENT_DATE - INTERVAL '30 days'
  AND monthly_shifts.check_in_time IS NOT NULL;

-- Step 3: Ensure negative delays (early check-ins) are set to 0
-- =====================================================
SELECT '=== FIXING EARLY CHECK-INS ===' as step;

UPDATE monthly_shifts 
SET delay_minutes = 0,
    updated_at = CURRENT_TIMESTAMP
WHERE delay_minutes < 0
  AND work_date >= CURRENT_DATE - INTERVAL '30 days';

-- Step 4: Verify the fix worked
-- =====================================================
SELECT '=== VERIFYING DELAY CALCULATIONS ===' as step;

SELECT 
    u.name as employee_name,
    s.name as shift_name,
    s.start_time as scheduled_start,
    ms.work_date,
    ms.check_in_time,
    ms.delay_minutes,
    -- Manual verification calculation
    CASE 
        WHEN ms.check_in_time IS NOT NULL AND s.start_time IS NOT NULL THEN
            ROUND(
                EXTRACT(EPOCH FROM (
                    ms.check_in_time - 
                    (ms.work_date + s.start_time)::timestamp
                )) / 60
            )
        ELSE 0
    END as verification_delay,
    CASE 
        WHEN ms.delay_minutes = 0 AND ms.check_in_time > (ms.work_date + s.start_time)::timestamp THEN
            '❌ ISSUE: Should show delay'
        WHEN ms.delay_minutes > 0 AND ms.check_in_time <= (ms.work_date + s.start_time)::timestamp THEN
            '❌ ISSUE: Should be 0 delay'
        ELSE '✅ CORRECT'
    END as delay_status
FROM monthly_shifts ms
JOIN users u ON ms.user_id = u.id
JOIN shifts s ON ms.shift_id = s.id
WHERE ms.work_date >= CURRENT_DATE - INTERVAL '7 days'
  AND ms.check_in_time IS NOT NULL
ORDER BY ms.work_date DESC, u.name;

-- Step 5: Check specific Mahmoud shifts
-- =====================================================
SELECT '=== MAHMOUD SPECIFIC SHIFTS ===' as step;

SELECT 
    u.name as employee_name,
    s.name as shift_name,
    s.start_time as scheduled_start,
    ms.work_date,
    ms.check_in_time,
    ms.delay_minutes,
    CASE 
        WHEN ms.check_in_time > (ms.work_date + s.start_time)::timestamp THEN
            'Late - Should show delay'
        WHEN ms.check_in_time <= (ms.work_date + s.start_time)::timestamp THEN
            'On time or early - Should be 0'
        ELSE 'Unknown'
    END as expected_behavior
FROM monthly_shifts ms
JOIN users u ON ms.user_id = u.id
JOIN shifts s ON ms.shift_id = s.id
WHERE u.name ILIKE '%mahmoud%'
  AND ms.work_date >= CURRENT_DATE - INTERVAL '7 days'
  AND ms.check_in_time IS NOT NULL
ORDER BY ms.work_date DESC;

-- Step 6: Test summary
-- =====================================================
SELECT '=== TEST SUMMARY ===' as step;

SELECT 
    '✅ Delay calculations have been recalculated!' as message,
    '✅ Early check-ins (before scheduled start) = 0min delay' as rule_1,
    '✅ Late check-ins = actual delay in minutes' as rule_2,
    '✅ Check-in at 09:00 = 0min delay' as example_1,
    '✅ Check-in at 09:04 = 4min delay' as example_2,
    '✅ Check-in at 09:10 = 10min delay' as example_3;
