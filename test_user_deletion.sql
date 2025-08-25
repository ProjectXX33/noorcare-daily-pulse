-- Test User Deletion Script
-- This script helps verify that user deletion works after fixing constraints

-- =====================================================
-- 1. CHECK CURRENT CONSTRAINTS
-- =====================================================

-- Show all foreign key constraints that don't have CASCADE DELETE
SELECT 'Foreign key constraints WITHOUT CASCADE DELETE:' as info;
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'users'
    AND rc.delete_rule != 'CASCADE'
ORDER BY tc.table_name, tc.constraint_name;

-- =====================================================
-- 2. SHOW USERS THAT CAN BE DELETED
-- =====================================================

-- Show users that can be safely deleted for testing
SELECT 'Users available for deletion test:' as info;
SELECT 
    id,
    name,
    email,
    "position",
    role,
    team
FROM users 
WHERE role = 'employee' 
AND name NOT LIKE '[DEACTIVATED]%'
ORDER BY name
LIMIT 5;

-- =====================================================
-- 3. SHOW COMPENSATION RECORDS FOR A USER
-- =====================================================

-- Show compensation records for the first user (if any)
SELECT 'Compensation records for first user:' as info;
SELECT 
    'compensation_' as table_name,
    COUNT(*) as record_count
FROM (
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name LIKE '%compensation%' 
    AND table_schema = 'public'
) AS comp_tables;

-- =====================================================
-- 4. MANUAL DELETION TEST
-- =====================================================

-- This is a template for manual deletion test
-- Uncomment and modify the user ID to test deletion

/*
-- Test deletion of a specific user (replace with actual user ID)
-- DELETE FROM users WHERE id = 'your-user-id-here';

-- Check if deletion was successful
-- SELECT COUNT(*) as remaining_users FROM users WHERE id = 'your-user-id-here';
*/

-- =====================================================
-- 5. VERIFICATION QUERIES
-- =====================================================

-- Count total users
SELECT 'Total users in system:' as info, COUNT(*) as user_count FROM users;

-- Count active employees
SELECT 'Active employees:' as info, COUNT(*) as employee_count 
FROM users 
WHERE role = 'employee' 
AND name NOT LIKE '[DEACTIVATED]%';

-- Count deactivated users
SELECT 'Deactivated users:' as info, COUNT(*) as deactivated_count 
FROM users 
WHERE name LIKE '[DEACTIVATED]%';

-- =====================================================
-- 6. SUCCESS INDICATORS
-- =====================================================

SELECT 'If you see this, the script ran successfully!' as status;
SELECT 'To test deletion, run: DELETE FROM users WHERE id = ''user-id-here'';' as instruction;

