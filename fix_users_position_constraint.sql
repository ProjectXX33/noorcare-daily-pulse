-- =====================================================
-- FIX USERS POSITION CONSTRAINT
-- =====================================================
-- This script fixes the constraint error you're experiencing
-- Run this in your Supabase SQL editor

-- 1. First, let's see what the current constraint looks like
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'users' 
    AND tc.constraint_name = 'users_position_check';

-- 2. Drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_position_check;

-- 3. Add the new constraint with Content Creator included
ALTER TABLE users ADD CONSTRAINT users_position_check 
CHECK (position IN (
    'Customer Service', 
    'Designer', 
    'Content Creator',  -- This was missing!
    'Media Buyer', 
    'Web Developer', 
    'Warehouse Staff', 
    'Executive Director', 
    'Content & Creative Manager', 
    'Customer Retention Manager', 
    'IT Manager',
    'Junior CRM Specialist'  -- Adding this since it was mentioned in the error
));

-- 4. Verify the constraint was added correctly
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'users' 
    AND tc.constraint_name = 'users_position_check';

-- 5. Test the constraint by trying to insert a test user
-- Uncomment the line below to test:
-- INSERT INTO users (name, position, email) VALUES ('Test User', 'Content Creator', 'test@example.com');

-- 6. Check if there are any existing users with invalid positions
SELECT id, name, position, email 
FROM users 
WHERE position NOT IN (
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
    'Junior CRM Specialist'
);

-- 7. Show all current positions in the system
SELECT DISTINCT position, COUNT(*) as user_count 
FROM users 
GROUP BY position 
ORDER BY position;
