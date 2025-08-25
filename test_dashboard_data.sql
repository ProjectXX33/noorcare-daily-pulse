-- Test Dashboard Data for Content Creative Team
-- Run this to see what data exists

-- 1. Check Content Creative team members
SELECT 'Team Members' as test_type, COUNT(*) as count, 
       STRING_AGG(name, ', ') as names
FROM users 
WHERE position = 'Content Creator' OR department = 'Content & Creative Department';

-- 2. Check check-ins for today (2025-08-25)
SELECT 'Check-ins Today' as test_type, COUNT(*) as count,
       STRING_AGG(user_id::text, ', ') as user_ids
FROM check_ins 
WHERE DATE(timestamp) = '2025-08-25';

-- 3. Check monthly_shifts for today
SELECT 'Monthly Shifts Today' as test_type, COUNT(*) as count,
       STRING_AGG(user_id::text, ', ') as user_ids
FROM monthly_shifts 
WHERE work_date = '2025-08-25';

-- 4. Check order_submissions table structure
SELECT 'Order Submissions Structure' as test_type, 
       column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'order_submissions' 
ORDER BY ordinal_position;

-- 5. Check order_submissions statuses
SELECT 'Order Statuses' as test_type, status, COUNT(*) as count
FROM order_submissions 
GROUP BY status 
ORDER BY count DESC;

-- 6. Check August orders
SELECT 'August Orders' as test_type, COUNT(*) as count,
       SUM(total_amount) as total_revenue
FROM order_submissions 
WHERE created_at >= '2025-08-01' AND created_at <= '2025-08-31';

-- 7. Check completed orders in August
SELECT 'Completed August Orders' as test_type, COUNT(*) as count,
       SUM(total_amount) as total_revenue
FROM order_submissions 
WHERE created_at >= '2025-08-01' 
  AND created_at <= '2025-08-31'
  AND status IN ('completed', 'delivered');
