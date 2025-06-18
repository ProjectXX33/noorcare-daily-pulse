-- Test User's Delay Formula: Delay to Finish = Delay Time - Regular Hours + Overtime
-- This script tests the exact formula provided by the user

SELECT '=== USER''S FORMULA TESTING ===' as header;
SELECT 'Delay to Finish = Delay Time - Regular Hours + Overtime' as formula;

-- Test Case 1: Mahmoud (Should have 0 delay to finish + 2h overtime)
SELECT '=== TEST CASE 1: MAHMOUD ===' as test_case;
SELECT 
    'Mahmoud' as employee,
    'Raw Delay: 30 minutes (0.5h)' as delay_time,
    'Regular Hours: 8h (full night shift)' as regular_hours,
    'Overtime: 2h' as overtime,
    'Formula: 30min - 480min + 120min = -330min' as calculation,
    'MAX(0, -330min) = 0 minutes' as result,
    '✅ Delay to Finish: 0 minutes' as final_result;

-- Test Case 2: Ahmed Farahat (Should have 32min delay to finish)
SELECT '=== TEST CASE 2: AHMED FARAHAT ===' as test_case;
SELECT 
    'Ahmed Farahat' as employee,
    'Raw Delay: 88 minutes (1h 28min late)' as delay_time,
    'Regular Hours: 6.47h (worked 6h 28min, but only 6.47h counted as regular)' as regular_hours,
    'Overtime: 0h (worked less than 7h expected)' as overtime,
    'Formula: 88min - 388min + 0min = -300min' as calculation,
    'MAX(0, -300min) = 0 minutes' as result,
    '🤔 This gives 0, but user expects 32min' as issue,
    'Need to adjust regular hours calculation' as note;

-- Alternative Ahmed calculation (if he worked exactly what he worked)
SELECT '=== AHMED ALTERNATIVE CALCULATION ===' as alternative;
SELECT 
    'Ahmed Farahat (Alternative)' as employee,
    'Raw Delay: 88 minutes' as delay_time,
    'Actual Hours Worked: 6.47h (388min)' as actual_worked,
    'But treating as Regular Hours for formula' as note,
    'Formula: 88min - 388min + 0min = -300min → 0min' as calculation,
    'Still gives 0, not 32min expected' as result;

-- Test Case 3: Shrouq Alaa (Should have 2h 53min delay)
SELECT '=== TEST CASE 3: SHROUQ ALAA ===' as test_case;
SELECT 
    'Shrouq Alaa' as employee,
    'Raw Delay: 0 minutes (checked in early)' as delay_time,
    'Regular Hours: 5.12h (5h 7min worked)' as regular_hours,
    'Overtime: 0h (worked less than 8h expected)' as overtime,
    'Formula: 0min - 307min + 0min = -307min' as calculation,
    'MAX(0, -307min) = 0 minutes' as result,
    '🤔 This gives 0, but user expects 2h 53min (173min)' as issue;

-- Investigation: Maybe Regular Hours should be capped at expected hours?
SELECT '=== INVESTIGATION: CAPPED REGULAR HOURS ===' as investigation;
SELECT 
    'Hypothesis: Regular Hours should be capped at expected shift hours' as hypothesis,
    'Ahmed: Worked 6.47h, Expected 7h → Regular = 6.47h' as ahmed_case,
    'Shrouq: Worked 5.12h, Expected 8h → Regular = 5.12h' as shrouq_case,
    'This still doesn''t explain the expected results' as conclusion;

-- Investigation: Maybe the formula is applied differently?
SELECT '=== INVESTIGATION: ALTERNATIVE INTERPRETATION ===' as alternative_interpretation;
SELECT 
    'Maybe the formula means:' as interpretation,
    'Delay to Finish = (Original Delay Time) - (Hours that offset delay) + (Overtime bonus)' as meaning,
    'Where Regular Hours might mean "hours that reduce delay"' as explanation,
    'Or Delay Time might be calculated differently' as possibility;

-- Verification needed
SELECT '=== VERIFICATION NEEDED ===' as verification;
SELECT 
    'Please clarify with user:' as request,
    '1. What exactly is "Delay Time" in the formula?' as question_1,
    '2. How should "Regular Hours" be calculated?' as question_2,
    '3. Should Regular Hours be capped at expected shift hours?' as question_3,
    '4. Can you provide exact numbers for one example?' as question_4;

-- Current shift times for reference
SELECT '=== CURRENT SHIFT TIMES ===' as shift_info;
SELECT 
    name,
    start_time,
    end_time,
    CASE 
        WHEN name ILIKE '%day%' THEN '7 hours expected'
        WHEN name ILIKE '%night%' THEN '8 hours expected'
        ELSE 'Unknown'
    END as expected_duration
FROM shifts 
WHERE is_active = true
ORDER BY start_time; 