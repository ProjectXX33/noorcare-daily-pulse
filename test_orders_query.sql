-- Test the exact query that the API should be running
-- This will help us verify the data and identify any issues

-- 1. Test the exact date range and status filter
SELECT 'Exact API Query Test:' as info;
SELECT 
    COUNT(*) as total_orders,
    SUM(CAST(total_amount AS DECIMAL(10,2))) as total_revenue
FROM order_submissions
WHERE created_at >= '2025-08-01T00:00:00' 
  AND created_at <= '2025-08-31T23:59:59'
  AND status IN ('completed', 'delivered')
  AND status NOT IN ('cancelled', 'tamara-o-canceled');

-- 2. Show the actual orders that match our criteria
SELECT 'Matching Orders Details:' as info;
SELECT 
    id,
    status,
    total_amount,
    created_at,
    woocommerce_order_id
FROM order_submissions
WHERE created_at >= '2025-08-01T00:00:00' 
  AND created_at <= '2025-08-31T23:59:59'
  AND status IN ('completed', 'delivered')
  AND status NOT IN ('cancelled', 'tamara-o-canceled')
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if there are any orders with different date formats
SELECT 'Orders with different date formats:' as info;
SELECT 
    id,
    status,
    total_amount,
    created_at,
    DATE(created_at) as date_only
FROM order_submissions
WHERE status IN ('completed', 'delivered')
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check the total count by status for August
SELECT 'August Orders by Status:' as info;
SELECT 
    status,
    COUNT(*) as count,
    SUM(CAST(total_amount AS DECIMAL(10,2))) as revenue
FROM order_submissions
WHERE created_at >= '2025-08-01' 
  AND created_at <= '2025-08-31'
  AND status IN ('completed', 'delivered')
GROUP BY status
ORDER BY count DESC;
