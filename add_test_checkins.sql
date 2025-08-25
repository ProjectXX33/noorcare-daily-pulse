-- Add test check-ins for Content Creative team members
-- This will help demonstrate the "Active Today" functionality

-- First, let's check if there are any existing check-ins for today
SELECT 'Existing check-ins for today:' as info;
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

-- Add test check-ins for team members (only if they don't already have check-ins today)
-- This will make some team members appear as "Active Today"

-- Note: Replace the user IDs with actual IDs from your database
-- You can get the user IDs by running: SELECT id, name, position FROM users WHERE position IN ('Content Creator', 'Designer', 'Media Buyer');

-- Example (uncomment and modify with actual user IDs):
/*
INSERT INTO check_ins (user_id, timestamp, created_at)
SELECT 
    u.id,
    CURRENT_TIMESTAMP - INTERVAL '2 hours', -- Checked in 2 hours ago
    CURRENT_TIMESTAMP
FROM users u
WHERE u.position IN ('Content Creator', 'Designer', 'Media Buyer')
  AND u.name IN ('Shrouq Alaa', 'Soad', 'Mahmoud Elrefaey')
  AND NOT EXISTS (
    SELECT 1 FROM check_ins ci 
    WHERE ci.user_id = u.id 
    AND DATE(ci.timestamp) = CURRENT_DATE
  );
*/

-- Check the result
SELECT 'Updated check-ins for today:' as info;
SELECT 
    ci.id,
    ci.user_id,
    u.name as user_name,
    u.position,
    ci.timestamp,
    ci.checkout_time,
    ci.check_out_time,
    CASE 
        WHEN ci.checkout_time IS NULL AND ci.check_out_time IS NULL THEN 'Active'
        ELSE 'Checked Out'
    END as status
FROM check_ins ci
JOIN users u ON ci.user_id = u.id
WHERE DATE(ci.timestamp) = CURRENT_DATE
  AND u.position IN ('Content Creator', 'Designer', 'Media Buyer')
ORDER BY ci.timestamp DESC;
