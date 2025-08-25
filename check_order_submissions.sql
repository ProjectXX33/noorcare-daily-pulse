-- Check order_submissions table for August data
-- This will help us understand what data exists and why the API might be failing

-- 1. Check table structure
SELECT 'Order Submissions Table Structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'order_submissions'
ORDER BY ordinal_position;

-- 2. Check total count of orders
SELECT 'Total Orders Count:' as info;
SELECT COUNT(*) as total_orders FROM order_submissions;

-- 3. Check orders by status
SELECT 'Orders by Status:' as info;
SELECT status, COUNT(*) as count
FROM order_submissions
GROUP BY status
ORDER BY count DESC;

-- 4. Check August orders (all statuses)
SELECT 'August Orders (All Statuses):' as info;
SELECT 
    status,
    COUNT(*) as count,
    SUM(CAST(total_amount AS DECIMAL(10,2))) as total_revenue
FROM order_submissions
WHERE created_at >= '2025-08-01' AND created_at <= '2025-08-31'
GROUP BY status
ORDER BY count DESC;

-- 5. Check completed orders for August
SELECT 'Completed Orders for August:' as info;
SELECT 
    COUNT(*) as completed_count,
    SUM(CAST(total_amount AS DECIMAL(10,2))) as completed_revenue
FROM order_submissions
WHERE created_at >= '2025-08-01' 
  AND created_at <= '2025-08-31'
  AND status IN ('completed', 'shipped', 'delivered');

-- 6. Sample of recent orders
SELECT 'Recent Orders Sample:' as info;
SELECT 
    id,
    status,
    total_amount,
    created_at,
    woocommerce_order_id
FROM order_submissions
ORDER BY created_at DESC
LIMIT 10;

-- 7. Check if there are any orders with the expected statuses
SELECT 'Orders with Expected Statuses:' as info;
SELECT 
    status,
    COUNT(*) as count
FROM order_submissions
WHERE status IN ('completed', 'shipped', 'delivered')
GROUP BY status;
