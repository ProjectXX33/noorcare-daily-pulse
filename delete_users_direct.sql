-- Direct Deletion of Specific Users
-- Simple script to delete the provided user IDs

-- =====================================================
-- DELETE USERS DIRECTLY
-- =====================================================

-- Delete first user
DELETE FROM users WHERE id = '71e9dc21-c9bd-46e8-b1f7-316ff9ef8404';

-- Delete second user  
DELETE FROM users WHERE id = 'e9ac9d1d-aec7-4671-8290-969e02721ac5';

-- =====================================================
-- VERIFY DELETION
-- =====================================================

-- Check if users still exist
SELECT 'Users after deletion (should be empty):' as info;
SELECT 
    id,
    name,
    email,
    "position"
FROM users 
WHERE id IN (
    '71e9dc21-c9bd-46e8-b1f7-316ff9ef8404',
    'e9ac9d1d-aec7-4671-8290-969e02721ac5'
);

SELECT 'Deletion completed!' as status;

