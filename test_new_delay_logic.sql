-- Test New Delay Logic - Verify User's Examples
-- This script tests the new "Delay to Finish" calculation

-- Test Case 1: Mahmoud (Should have 0 delay to finish + 2h overtime)
SELECT '=== TEST CASE 1: MAHMOUD ===' as test_case;
SELECT 
    'Mahmoud Example' as employee,
    'Assumption: Worked 10 hours (8 expected + 2 overtime)' as scenario,
    'Raw delay: 30min late check-in' as raw_delay,
    'Calculation: 30min - 2h overtime = 0 delay to finish' as formula,
    '✅ Result: 0 delay to finish + 2h overtime' as expected_result;

-- Test Case 2: Ahmed Farahat (Should have 32min delay to finish)
SELECT '=== TEST CASE 2: AHMED FARAHAT ===' as test_case;
SELECT 
    'Ahmed Farahat' as employee,
    'Check-in: 10:28, Shift start: 09:00' as times,
    'Raw delay: 1h 28min (88 minutes)' as raw_delay,
    'Worked: 6h 28min, Expected: 7h' as hours_worked,
    'Hours short: 32min (0.53h)' as hours_short,
    'Total delay: 1h 28min + 32min short = 2h' as calculation,
    'Wait... this doesn\'t match 32min expected' as issue,
    'Maybe shift start time is different?' as note;

-- Test Case 3: Shrouq Alaa (Should have 2h 53min delay for leaving early)
SELECT '=== TEST CASE 3: SHROUQ ALAA ===' as test_case;
SELECT 
    'Shrouq Alaa' as employee,
    'Check-in: 15:56, Shift start: 16:00 (Night)' as times,
    'Raw delay: 0min (checked in 4min early)' as raw_delay,
    'Worked: 5h 7min, Expected: 8h' as hours_worked,
    'Hours short: 2h 53min' as hours_short,
    'Total delay: 0min + 2h 53min short = 2h 53min' as calculation,
    '✅ Result: 2h 53min delay (matches expected)' as result;

-- Calculation formulas for reference
SELECT '=== NEW DELAY CALCULATION FORMULAS ===' as info;
SELECT 
    'Full/Overtime Work:' as scenario_1,
    'Delay to Finish = MAX(0, Raw Delay - Overtime Hours)' as formula_1,
    'Early Checkout:' as scenario_2,
    'Delay to Finish = Hours Short + Raw Delay' as formula_2,
    'Where Raw Delay = Check-in Time - Scheduled Start Time' as note_1,
    'Where Hours Short = Expected Hours - Actual Hours Worked' as note_2;

-- Ahmed's issue investigation
SELECT '=== AHMED INVESTIGATION ===' as investigation;
SELECT 
    'Current Logic: 1h 28min + 32min = 2h total delay' as current_calc,
    'User expects: Only 32min delay to finish' as user_expectation,
    'Possible explanations:' as explanations,
    '1. Shift start time is 09:56 instead of 09:00' as option_1,
    '2. Different calculation method needed' as option_2,
    '3. Overtime should offset the raw delay differently' as option_3;

-- Check actual data if available
SELECT '=== CHECK ACTUAL SHIFT START TIMES ===' as check;
SELECT 
    name as shift_name,
    start_time,
    end_time,
    CASE 
        WHEN name ILIKE '%day%' THEN '7 hours expected'
        WHEN name ILIKE '%night%' THEN '8 hours expected'
        ELSE 'Unknown duration'
    END as expected_duration
FROM shifts 
WHERE is_active = true
ORDER BY start_time;

-- Verification queries
SELECT '=== VERIFICATION NEEDED ===' as verification;
SELECT 
    'Run this after implementing new logic:' as instruction,
    '1. Check Ahmed: Should show 32min delay to finish' as step_1,
    '2. Check Shrouq: Should show 2h 53min delay to finish' as step_2,
    '3. Check Mahmoud: Should show 0min delay + 2h overtime' as step_3,
    'If Ahmed still shows wrong result, check shift start time' as note; 