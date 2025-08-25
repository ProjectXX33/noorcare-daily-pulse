-- Add test check-ins for Content Creative team members
-- This will help demonstrate the "Active Today" functionality

-- First, let's check the current team members
SELECT 'Content Creative Team Members:' as info;
SELECT id, name, position, team
FROM users 
WHERE position IN ('Content Creator', 'Designer', 'Media Buyer')
  AND team = 'Content & Creative Department'
ORDER BY name;

-- Check existing check-ins for today
SELECT 'Existing check-ins for today:' as info;
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

-- Add test check-ins for team members who don't have check-ins today
-- (Uncomment and run this section to add test data)
/*
INSERT INTO check_ins (user_id, timestamp, created_at)
SELECT 
    u.id,
    CURRENT_TIMESTAMP - INTERVAL '2 hours', -- Checked in 2 hours ago
    CURRENT_TIMESTAMP
FROM users u
WHERE u.position IN ('Content Creator', 'Designer', 'Media Buyer')
  AND u.team = 'Content & Creative Department'
  AND u.name IN ('Soad', 'Mahmoud Elrefaey', 'Shrouq Alaa')
  AND NOT EXISTS (
    SELECT 1 FROM check_ins ci 
    WHERE ci.user_id = u.id 
    AND DATE(ci.timestamp) = CURRENT_DATE
  );
*/

-- Check the result after adding test data
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
