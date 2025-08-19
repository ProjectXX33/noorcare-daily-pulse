-- Update last_seen for Content & Creative team members to simulate recent activity
-- This will help test the online status functionality

-- Update Ahmed Ashraf (Media Buyer) - active 2 minutes ago
UPDATE users 
SET last_seen = NOW() - INTERVAL '2 minutes'
WHERE name = 'Ahmed Ashraf' AND position = 'Media Buyer';

-- Update Soad (Designer) - active 10 minutes ago  
UPDATE users 
SET last_seen = NOW() - INTERVAL '10 minutes'
WHERE name = 'Soad' AND position = 'Designer';

-- Update Mahmoud Elrefaey (Designer) - active 1 hour ago
UPDATE users 
SET last_seen = NOW() - INTERVAL '1 hour'
WHERE name = 'Mahmoud Elrefaey' AND position = 'Designer';

-- Update Shrouq Alaa (Copy Writing) - active 30 minutes ago
UPDATE users 
SET last_seen = NOW() - INTERVAL '30 minutes'
WHERE name = 'Shrouq Alaa' AND position = 'Copy Writing';

-- Verify the updates
SELECT name, position, last_seen, 
  CASE 
    WHEN last_seen >= NOW() - INTERVAL '5 minutes' THEN 'Online'
    WHEN last_seen >= NOW() - INTERVAL '1 hour' THEN 'Recently Active'
    ELSE 'Offline'
  END as status
FROM users 
WHERE name IN ('Ahmed Ashraf', 'Soad', 'Mahmoud Elrefaey', 'Shrouq Alaa')
ORDER BY last_seen DESC;
