-- Quick test to add data and verify dashboard works
-- Run this to see the dashboard with real data

-- 1. Check current team members
SELECT 'Current Team Members:' as info;
SELECT id, name, position, team
FROM users 
WHERE position IN ('Content Creator', 'Designer', 'Media Buyer')
  AND team = 'Content & Creative Department'
ORDER BY name;

-- 2. Add a test check-in for one team member (uncomment to run)
/*
INSERT INTO check_ins (user_id, timestamp, created_at)
SELECT 
    u.id,
    CURRENT_TIMESTAMP - INTERVAL '1 hour',
    CURRENT_TIMESTAMP
FROM users u
WHERE u.name = 'Soad' 
  AND u.position = 'Designer'
  AND u.team = 'Content & Creative Department'
LIMIT 1;
*/

-- 3. Check if we have any completed orders for August
SELECT 'Completed Orders for August:' as info;
SELECT 
    COUNT(*) as total_orders,
    SUM(CAST(total_amount AS DECIMAL(10,2))) as total_revenue
FROM order_submissions
WHERE created_at >= '2025-08-01' 
  AND created_at <= '2025-08-31'
  AND status IN ('completed', 'delivered');

-- 4. Show sample orders
SELECT 'Sample Orders:' as info;
SELECT 
    id,
    status,
    total_amount,
    created_at
FROM order_submissions
WHERE status IN ('completed', 'delivered')
ORDER BY created_at DESC
LIMIT 5;

-- 5. Check active check-ins for today
SELECT 'Active Check-ins Today:' as info;
SELECT 
    ci.id,
    ci.user_id,
    u.name as user_name,
    u.position,
    ci.timestamp,
    CASE 
        WHEN ci.checkout_time IS NULL THEN 'Active'
        ELSE 'Checked Out'
    END as status
FROM check_ins ci
JOIN users u ON ci.user_id = u.id
WHERE DATE(ci.timestamp) = CURRENT_DATE
  AND u.position IN ('Content Creator', 'Designer', 'Media Buyer')
ORDER BY ci.timestamp DESC;
