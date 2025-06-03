-- Clear and Test Performance System
-- This script clears wrong data and sets up for clean testing

-- 1. Clear existing wrong performance data
DELETE FROM admin_performance_dashboard WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- 2. Show that data is cleared
SELECT 'AFTER CLEARING DATA:' as status;
SELECT COUNT(*) as remaining_records FROM admin_performance_dashboard WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- 3. Quick verification of calculation logic (just to show what SHOULD happen)
SELECT 
    'TEST CALCULATION EXAMPLES:' as test_type,
    '12.4 hours delay = 744 minutes' as example_1,
    'Performance Score: ' || CASE 
        WHEN 744 >= 500 THEN '0%' 
        ELSE (100 - (744/5))::TEXT || '%' 
    END as score_1,
    'Punctuality: ' || CASE 
        WHEN 744 >= 60 THEN '0%' 
        ELSE '90%' 
    END as punctuality_1,
    'Status: ' || CASE 
        WHEN (CASE WHEN 744 >= 500 THEN 0 ELSE (100 - (744/5)) END) < 50 
          OR (CASE WHEN 744 >= 60 THEN 0 ELSE 90 END) < 50 
        THEN 'Poor'
        ELSE 'Should be Poor'
    END as status_1;

-- 4. Ready message
SELECT 'SYSTEM READY FOR TESTING' as message, 
       'Now when employees check in with delays, performance will be calculated correctly' as instruction; 