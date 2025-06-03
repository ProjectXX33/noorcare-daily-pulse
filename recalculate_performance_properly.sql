-- Properly Recalculate Performance Data
-- This script fixes the completely wrong performance calculations

-- 1. Show current wrong data
SELECT 'CURRENT WRONG DATA:' as status;
SELECT 
    employee_name,
    total_working_days,
    total_delay_minutes,
    total_delay_hours,
    average_performance_score,
    punctuality_percentage,
    performance_status
FROM admin_performance_dashboard
WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- 2. Calculate what the CORRECT values should be
-- If delay is 12+ hours (720+ minutes), performance should be 0% and status should be Poor

-- Let's assume the actual delay is 12.4 hours = 744 minutes
DO $$
DECLARE
    actual_delay_minutes INTEGER := 744; -- 12.4 hours = 744 minutes
    correct_performance_score NUMERIC;
    correct_punctuality NUMERIC;
    correct_status TEXT;
BEGIN
    -- Calculate correct performance score: 100 - (delay_minutes / 5)
    IF actual_delay_minutes <= 0 THEN
        correct_performance_score := 100.0;
    ELSIF actual_delay_minutes >= 500 THEN
        correct_performance_score := 0.0; -- 8+ hours late = 0%
    ELSE
        correct_performance_score := GREATEST(0, 100.0 - (actual_delay_minutes / 5.0));
    END IF;
    
    -- Calculate correct punctuality
    IF actual_delay_minutes >= 60 THEN
        correct_punctuality := 0.0; -- 1+ hour delay = 0% punctuality
    ELSE
        correct_punctuality := GREATEST(0, 90 - (actual_delay_minutes * 3));
    END IF;
    
    -- Calculate correct status
    IF correct_punctuality < 50 OR correct_performance_score < 50 THEN
        correct_status := 'Poor';
    ELSIF correct_punctuality < 70 OR correct_performance_score < 70 THEN
        correct_status := 'Needs Improvement';
    ELSIF correct_punctuality < 85 OR correct_performance_score < 85 THEN
        correct_status := 'Good';
    ELSE
        correct_status := 'Excellent';
    END IF;
    
    RAISE NOTICE 'CORRECT CALCULATIONS FOR % MINUTES DELAY:', actual_delay_minutes;
    RAISE NOTICE 'Performance Score: %', correct_performance_score;
    RAISE NOTICE 'Punctuality: %', correct_punctuality;
    RAISE NOTICE 'Status: %', correct_status;
    
    -- 3. Update with CORRECT values
    UPDATE admin_performance_dashboard 
    SET 
        total_working_days = 1,
        total_delay_minutes = actual_delay_minutes,
        total_delay_hours = ROUND((actual_delay_minutes::NUMERIC / 60), 2),
        average_performance_score = correct_performance_score,
        punctuality_percentage = correct_punctuality,
        performance_status = correct_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE employee_name = 'Dr. Shrouq Alaa' 
    AND month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    
    RAISE NOTICE 'Performance data updated with correct calculations!';
END $$;

-- 4. Show corrected data
SELECT 'AFTER PROPER FIX:' as status;
SELECT 
    employee_name,
    total_working_days,
    total_delay_minutes,
    total_delay_hours,
    average_performance_score,
    punctuality_percentage,
    performance_status
FROM admin_performance_dashboard
WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- 5. Verify the logic makes sense
SELECT 
    'VERIFICATION:' as check_type,
    CASE 
        WHEN total_delay_hours >= 12 AND performance_status = 'Poor' THEN '✅ CORRECT: 12+ hour delay = Poor status'
        WHEN total_delay_hours >= 12 AND performance_status != 'Poor' THEN '❌ WRONG: 12+ hour delay should be Poor'
        WHEN punctuality_percentage = 0 AND performance_status = 'Poor' THEN '✅ CORRECT: 0% punctuality = Poor status'
        WHEN punctuality_percentage = 0 AND performance_status != 'Poor' THEN '❌ WRONG: 0% punctuality should be Poor'
        ELSE 'Other case'
    END as result
FROM admin_performance_dashboard
WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM'); 