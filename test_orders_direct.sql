-- Test Order Submissions Table Directly
-- Run this to see what data exists in the order_submissions table

-- 1. Check if table exists and its structure
SELECT 'Table Structure' as test_type, 
       column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'order_submissions' 
ORDER BY ordinal_position;

-- 2. Check total count of orders
SELECT 'Total Orders' as test_type, COUNT(*) as count
FROM order_submissions;

-- 3. Check all statuses that exist
SELECT 'All Statuses' as test_type, status, COUNT(*) as count
FROM order_submissions 
GROUP BY status 
ORDER BY count DESC;

-- 4. Check August orders (all statuses)
SELECT 'August Orders (All)' as test_type, COUNT(*) as count,
       SUM(total_amount) as total_revenue
FROM order_submissions 
WHERE created_at >= '2025-08-01' AND created_at <= '2025-08-31';

-- 5. Check completed/delivered orders in August
SELECT 'August Completed Orders' as test_type, COUNT(*) as count,
       SUM(total_amount) as total_revenue
FROM order_submissions 
WHERE created_at >= '2025-08-01' 
  AND created_at <= '2025-08-31'
  AND status IN ('completed', 'delivered');

-- 6. Show sample orders
SELECT 'Sample Orders' as test_type, 
       woocommerce_order_id, status, total_amount, created_at
FROM order_submissions 
LIMIT 5;

-- 7. Check if there are any orders with 'completed' status
SELECT 'Completed Status Check' as test_type, COUNT(*) as count
FROM order_submissions 
WHERE status = 'completed';

-- 8. Check if there are any orders with 'delivered' status  
SELECT 'Delivered Status Check' as test_type, COUNT(*) as count
FROM order_submissions 
WHERE status = 'delivered';
