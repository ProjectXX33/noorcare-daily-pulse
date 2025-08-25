-- Check check_ins table for potential issues
-- This will help us understand why the API is failing

-- 1. Check table structure for 'check_ins'
SELECT 'Check_ins Table Structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'check_ins'
ORDER BY ordinal_position;

-- 2. Check total count of check-ins
SELECT 'Total Check-ins Count:' as info;
SELECT COUNT(*) as total_check_ins FROM check_ins;

-- 3. Check recent check-ins (last 10) to see column values
SELECT 'Recent Check-ins (last 10):' as info;
SELECT
    id,
    user_id,
    timestamp,
    checkout_time,
    check_out_time,
    created_at
FROM check_ins
ORDER BY timestamp DESC
LIMIT 10;

-- 4. Check active check-ins (where checkout_time or check_out_time is NULL)
SELECT 'Active Check-ins (today):' as info;
SELECT
    ci.id,
    ci.user_id,
    u.name as user_name,
    u.position,
    ci.timestamp,
    ci.checkout_time,
    ci.check_out_time
FROM check_ins ci
JOIN users u ON ci.user_id = u.id
WHERE DATE(ci.timestamp) = CURRENT_DATE
  AND (ci.checkout_time IS NULL OR ci.check_out_time IS NULL)
ORDER BY ci.timestamp DESC;

-- 5. Check check-ins for Content Creative team members today
SELECT 'Content Creative Team Check-ins (today):' as info;
SELECT
    ci.id,
    ci.user_id,
    u.name as user_name,
    u.position,
    ci.timestamp,
    ci.checkout_time,
    ci.check_out_time
FROM check_ins ci
JOIN users u ON ci.user_id = u.id
WHERE DATE(ci.timestamp) = CURRENT_DATE
  AND u.position IN ('Content Creator', 'Designer', 'Media Buyer')
ORDER BY ci.timestamp DESC;
