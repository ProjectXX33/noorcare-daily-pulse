-- Debug Script for Content Creative Dashboard Issues
-- Run this to check what data exists and identify potential issues

-- 1. Check if there are users with Content Creator position
SELECT 'Content Creator Users:' as info;
SELECT id, name, email, role, department, position, team, last_checkin
FROM users 
WHERE position = 'Content Creator'
ORDER BY name;

-- 2. Check all users in Content & Creative Department
SELECT 'Content & Creative Department Users:' as info;
SELECT id, name, email, role, department, position, team, last_checkin
FROM users 
WHERE team = 'Content & Creative Department'
ORDER BY name;

-- 3. Check all users with Content Creator, Designer, or Media Buyer positions
SELECT 'All Creative Team Users:' as info;
SELECT id, name, email, role, department, position, team, last_checkin
FROM users 
WHERE position IN ('Content Creator', 'Designer', 'Media Buyer')
ORDER BY position, name;

-- 4. Check recent check-ins for Creative team members
SELECT 'Recent Check-ins for Creative Team:' as info;
SELECT 
    ci.id,
    ci.user_id,
    u.name as user_name,
    u.position,
    u.team,
    ci.timestamp,
    ci.checkout_time,
    ci.check_out_time,
    DATE(ci.timestamp) as check_in_date
FROM check_ins ci
JOIN users u ON ci.user_id = u.id
WHERE u.position IN ('Content Creator', 'Designer', 'Media Buyer')
  AND ci.timestamp >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY ci.timestamp DESC;

-- 5. Check active check-ins today (not checked out)
SELECT 'Active Check-ins Today:' as info;
SELECT 
    ci.id,
    ci.user_id,
    u.name as user_name,
    u.position,
    u.team,
    ci.timestamp,
    ci.checkout_time,
    ci.check_out_time
FROM check_ins ci
JOIN users u ON ci.user_id = u.id
WHERE ci.timestamp >= CURRENT_DATE
  AND (ci.checkout_time IS NULL OR ci.check_out_time IS NULL)
ORDER BY ci.timestamp DESC;

-- 6. Check order_submissions table structure
SELECT 'Order Submissions Table Structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'order_submissions'
ORDER BY ordinal_position;

-- 7. Check recent order submissions
SELECT 'Recent Order Submissions:' as info;
SELECT 
    id,
    total_amount,
    amount,
    status,
    created_at,
    woocommerce_order_id
FROM order_submissions 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 10;
