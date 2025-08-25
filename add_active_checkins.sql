-- Add active check-ins for Content Creative team members
-- This will make "Active Today" show a number greater than 0

-- First, let's see what team members we have
SELECT 'Content Creative Team Members:' as info;
SELECT id, name, position 
FROM users 
WHERE position IN ('Content Creator', 'Designer', 'Media Buyer')
  AND team = 'Content & Creative Department'
ORDER BY name;

-- Check if there are any check-ins for today
SELECT 'Check-ins for today:' as info;
SELECT 
    ci.id,
    ci.user_id,
    u.name as user_name,
    ci.timestamp,
    ci.checkout_time
FROM check_ins ci
JOIN users u ON ci.user_id = u.id
WHERE DATE(ci.timestamp) = CURRENT_DATE
ORDER BY ci.timestamp DESC;

-- Add check-ins for team members (uncomment to run)
/*
INSERT INTO check_ins (user_id, timestamp, created_at)
VALUES 
    -- Replace these user IDs with actual IDs from your team members
    ('user-id-1', CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP),
    ('user-id-2', CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_TIMESTAMP);
*/

-- Check the result
SELECT 'Active check-ins after adding:' as info;
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
