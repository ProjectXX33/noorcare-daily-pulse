-- =====================================================
-- SIMPLE USERS CONSTRAINT FIX
-- =====================================================
-- This script only fixes the users table constraint
-- Run this in your Supabase SQL editor

-- 1. Drop the problematic constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_position_check;

-- 2. Update any remaining "Copy Writing" to "Content Creator"
UPDATE users 
SET position = 'Content Creator' 
WHERE position = 'Copy Writing';

-- 3. Add the new constraint with Content Creator included
ALTER TABLE users ADD CONSTRAINT users_position_check 
CHECK (position IN (
    'Customer Service', 
    'Designer', 
    'Content Creator',
    'Media Buyer', 
    'Web Developer', 
    'Warehouse Staff', 
    'Executive Director', 
    'Content & Creative Manager', 
    'Customer Retention Manager', 
    'IT Manager',
    'Junior CRM Specialist',
    'Junior Ads Specialist',
    'Creative Designer',
    'Digital Solutions Specialist',
    'Digital Solutions Coordinator',
    'Customer Retention Specialist',
    'Customer Success Coordinator',
    'Customer Service Agent',
    'Senior Customer Service Agent',
    'Media Buyer Specialist',
    'Senior Media Buyer',
    'Junior Media Buyer',
    'Warehouse Operator',
    'Senior Warehouse Operator',
    'Copy Writer',
    'Senior Copy Writer',
    'Junior Copy Writer'
));

-- 4. Verify it works
SELECT 'Users constraint fixed successfully!' as status;

-- 5. Show current positions
SELECT DISTINCT position, COUNT(*) as user_count 
FROM users 
GROUP BY position 
ORDER BY position;
