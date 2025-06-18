-- Analyze Current Data to Understand Delay Calculation
-- Based on the user's screenshot showing "All Clear" results

SELECT '=== ANALYSIS OF CURRENT DATA ===' as header;

-- Case 1: Ahmed Farahat (18/06/2025)
SELECT '=== AHMED FARAHAT ANALYSIS ===' as case_1;
SELECT 
    'Ahmed Farahat (18/06/2025)' as employee,
    'Check-in: 10:28, Day Shift starts: 09:00' as timing,
    'Raw Delay: 10:28 - 09:00 = 1h 28min = 88 minutes' as raw_delay,
    'Worked: 6h 28min = 388 minutes' as time_worked,
    'Current Formula: 88min - 388min = -300min → 0 (All Clear)' as current_result,
    'User expects: 32 minutes delay' as expected_result,
    'Possible issue: Formula subtracts too much' as analysis;

-- Case 2: Shrouq Alaa (18/06/2025) 
SELECT '=== SHROUQ ALAA ANALYSIS ===' as case_2;
SELECT 
    'Shrouq Alaa (18/06/2025)' as employee,
    'Check-in: 15:56, Night Shift starts: 16:00' as timing,
    'Raw Delay: 15:56 - 16:00 = -4min (early) = 0 minutes' as raw_delay,
    'Worked: 5h 7min = 307 minutes' as time_worked,
    'Expected Shift: 8h = 480 minutes' as expected_shift,
    'Hours Short: 480 - 307 = 173min = 2h 53min' as hours_short,
    'Current Formula: 0min - 307min = -307min → 0 (All Clear)' as current_result,
    'User expects: 2h 53min delay (173 minutes)' as expected_result,
    'Analysis: Delay should be hours short, not formula result' as analysis;

-- Alternative interpretations
SELECT '=== ALTERNATIVE FORMULA INTERPRETATIONS ===' as alternatives;

-- Interpretation 1: Maybe only subtract expected hours, not actual hours
SELECT 
    'INTERPRETATION 1: Subtract Expected Hours Only' as interpretation,
    'Ahmed: 88min - (7h * 60) = 88 - 420 = -332min → 0' as ahmed_calc,
    'Still gives 0, not 32min expected' as ahmed_result,
    'Shrouq: 0min - (8h * 60) = 0 - 480 = -480min → 0' as shrouq_calc,
    'Still gives 0, not 173min expected' as shrouq_result;

-- Interpretation 2: Maybe the formula works differently for early checkout
SELECT 
    'INTERPRETATION 2: Different Logic for Early Checkout' as interpretation,
    'For early checkout: Delay = Hours Short (ignore formula)' as rule_1,
    'For full work: Delay = Formula result' as rule_2,
    'Ahmed worked 6.47h < 7h expected → Use hours short?' as ahmed_rule,
    'But 7h - 6.47h = 0.53h = 32min ✅ This matches!' as ahmed_match,
    'Shrouq worked 5.12h < 8h expected → Use hours short' as shrouq_rule,
    'But 8h - 5.12h = 2.88h = 173min ✅ This matches!' as shrouq_match;

-- The real solution might be different
SELECT '=== POSSIBLE REAL SOLUTION ===' as solution;
SELECT 
    'Maybe the formula is:' as hypothesis,
    'IF (worked < expected): Delay = Expected Hours - Worked Hours' as rule_1,
    'ELSE: Delay = Raw Delay - (Worked Hours - Expected Hours)' as rule_2,
    'This would mean:' as explanation,
    'Early checkout = Show hours missing as delay' as case_1,
    'Overtime = Show adjusted delay after overtime offset' as case_2;

-- Test the new hypothesis
SELECT '=== TEST NEW HYPOTHESIS ===' as test;
SELECT 
    'Ahmed (worked < expected):' as ahmed_test,
    'Delay = 7h - 6.47h = 0.53h = 32min ✅' as ahmed_result,
    'Shrouq (worked < expected):' as shrouq_test, 
    'Delay = 8h - 5.12h = 2.88h = 173min ✅' as shrouq_result,
    'This matches user expectations!' as conclusion;

-- For overtime workers like Mahmoud
SELECT '=== MAHMOUD OVERTIME CASE ===' as mahmoud;
SELECT 
    'Mahmoud worked overtime (assumption):' as case_description,
    'Worked: 10h, Expected: 8h (night shift)' as hours,
    'Raw Delay: 30min (late check-in)' as raw_delay,
    'Formula: 30min - (10h - 8h) = 30min - 2h = 30 - 120 = -90min → 0' as calculation,
    'User expects: 0 delay ✅' as expected,
    'This would work!' as result; 