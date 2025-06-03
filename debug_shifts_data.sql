-- Debug Script for Shifts Data Issues
-- Run this to check what data exists and identify potential issues

-- 1. Check if shifts table has data
SELECT 'Available Shifts:' as info;
SELECT id, name, start_time, end_time, position, is_active 
FROM shifts 
WHERE position = 'Customer Service' AND is_active = true
ORDER BY start_time;

-- 2. Check users with Customer Service position
SELECT 'Customer Service Users:' as info;
SELECT id, name, email, role, department, position, last_checkin
FROM users 
WHERE position = 'Customer Service'
ORDER BY name;

-- 3. Check recent check-ins for Customer Service employees
SELECT 'Recent Check-ins:' as info;
SELECT 
    ci.id,
    ci.user_id,
    u.name as user_name,
    u.position,
    ci.timestamp,
    ci.checkout_time,
    DATE(ci.timestamp) as check_in_date
FROM check_ins ci
JOIN users u ON ci.user_id = u.id
WHERE u.position = 'Customer Service'
  AND ci.timestamp >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY ci.timestamp DESC;

-- 4. Check monthly_shifts table data
SELECT 'Monthly Shifts Data:' as info;
SELECT 
    ms.id,
    ms.user_id,
    u.name as user_name,
    ms.shift_id,
    s.name as shift_name,
    ms.work_date,
    ms.check_in_time,
    ms.check_out_time,
    ms.regular_hours,
    ms.overtime_hours
FROM monthly_shifts ms
JOIN users u ON ms.user_id = u.id
JOIN shifts s ON ms.shift_id = s.id
WHERE ms.work_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY ms.work_date DESC, u.name;

-- 5. Check for orphaned check-ins (check-ins without monthly_shift records)
SELECT 'Check-ins without Monthly Shift Records:' as info;
SELECT 
    ci.id as checkin_id,
    ci.user_id,
    u.name as user_name,
    ci.timestamp,
    ci.checkout_time,
    DATE(ci.timestamp) as work_date
FROM check_ins ci
JOIN users u ON ci.user_id = u.id
LEFT JOIN monthly_shifts ms ON (ms.user_id = ci.user_id AND ms.work_date = DATE(ci.timestamp))
WHERE u.position = 'Customer Service'
  AND ci.timestamp >= CURRENT_DATE - INTERVAL '30 days'
  AND ms.id IS NULL
ORDER BY ci.timestamp DESC;

-- 6. Count data by table for today
SELECT 'Data Counts for Today:' as info;
SELECT 
    'check_ins' as table_name,
    COUNT(*) as count
FROM check_ins ci
JOIN users u ON ci.user_id = u.id
WHERE u.position = 'Customer Service'
  AND DATE(ci.timestamp) = CURRENT_DATE

UNION ALL

SELECT 
    'monthly_shifts' as table_name,
    COUNT(*) as count
FROM monthly_shifts ms
JOIN users u ON ms.user_id = u.id
WHERE u.position = 'Customer Service'
  AND ms.work_date = CURRENT_DATE;

-- 7. Show current month date range for reference
SELECT 'Current Month Date Range:' as info;
SELECT 
    DATE_TRUNC('month', CURRENT_DATE) as month_start,
    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::date as month_end,
    CURRENT_DATE as today; 