-- Test Deletion of Specific Users
-- This script tests deletion of the provided user IDs

-- =====================================================
-- 1. VERIFY USERS EXIST BEFORE DELETION
-- =====================================================

SELECT 'Users to be deleted:' as info;
SELECT 
    id,
    name,
    email,
    "position",
    role,
    team
FROM users 
WHERE id IN (
    '71e9dc21-c9bd-46e8-b1f7-316ff9ef8404',
    'e9ac9d1d-aec7-4671-8290-969e02721ac5'
);

-- =====================================================
-- 2. CHECK FOR COMPENSATION RECORDS
-- =====================================================

-- Check if these users have any compensation records
SELECT 'Checking for compensation records...' as info;

-- Check all compensation-related tables for these users
DO $$
DECLARE
    comp_table RECORD;
    user_id UUID;
    record_count INTEGER;
BEGIN
    FOR user_id IN SELECT unnest(ARRAY['71e9dc21-c9bd-46e8-b1f7-316ff9ef8404'::UUID, 'e9ac9d1d-aec7-4671-8290-969e02721ac5'::UUID])
    LOOP
        RAISE NOTICE 'Checking user: %', user_id;
        
        FOR comp_table IN 
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name LIKE '%compensation%' 
            AND table_schema = 'public'
        LOOP
            BEGIN
                EXECUTE format('SELECT COUNT(*) FROM %I WHERE employee_id = $1 OR user_id = $1', comp_table.table_name) 
                INTO record_count USING user_id;
                
                IF record_count > 0 THEN
                    RAISE NOTICE 'Found % records in table % for user %', record_count, comp_table.table_name, user_id;
                END IF;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE 'Could not check table % for user %: %', comp_table.table_name, user_id, SQLERRM;
            END;
        END LOOP;
    END LOOP;
END $$;

-- =====================================================
-- 3. CHECK FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Show all foreign key constraints that reference users
SELECT 'Foreign key constraints that might prevent deletion:' as info;
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
-- 4. ATTEMPT DELETION OF FIRST USER
-- =====================================================

SELECT 'Attempting to delete first user: 71e9dc21-c9bd-46e8-b1f7-316ff9ef8404' as info;

-- Delete first user
DELETE FROM users WHERE id = '71e9dc21-c9bd-46e8-b1f7-316ff9ef8404';

-- Check if deletion was successful
SELECT 
    CASE 
        WHEN FOUND THEN '✅ Successfully deleted user: 71e9dc21-c9bd-46e8-b1f7-316ff9ef8404'
        ELSE '⚠️ User not found or already deleted: 71e9dc21-c9bd-46e8-b1f7-316ff9ef8404'
    END as deletion_status;

-- =====================================================
-- 5. ATTEMPT DELETION OF SECOND USER
-- =====================================================

SELECT 'Attempting to delete second user: e9ac9d1d-aec7-4671-8290-969e02721ac5' as info;

-- Delete second user
DELETE FROM users WHERE id = 'e9ac9d1d-aec7-4671-8290-969e02721ac5';

-- Check if deletion was successful
SELECT 
    CASE 
        WHEN FOUND THEN '✅ Successfully deleted user: e9ac9d1d-aec7-4671-8290-969e02721ac5'
        ELSE '⚠️ User not found or already deleted: e9ac9d1d-aec7-4671-8290-969e02721ac5'
    END as deletion_status;

-- =====================================================
-- 6. VERIFY DELETION
-- =====================================================

SELECT 'Verifying deletion - remaining users:' as info;
SELECT 
    id,
    name,
    email,
    "position",
    role
FROM users 
WHERE id IN (
    '71e9dc21-c9bd-46e8-b1f7-316ff9ef8404',
    'e9ac9d1d-aec7-4671-8290-969e02721ac5'
);

-- =====================================================
-- 7. FINAL STATUS
-- =====================================================

SELECT 'Deletion test completed!' as status;
SELECT 'If no users are shown above, deletion was successful.' as verification;
