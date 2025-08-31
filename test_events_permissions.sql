-- Test script to verify events permissions are working
-- Run this after applying the fix to confirm everything works

-- Test 1: Check if Dr Walaa has the correct role
SELECT 
    'Test 1 - Dr Walaa Role Check:' as test_name,
    CASE 
        WHEN role = 'content_creative_manager' THEN '✅ PASS - Role is correct'
        ELSE '❌ FAIL - Role is ' || role
    END as result,
    name,
    role,
    position,
    team
FROM users 
WHERE name ILIKE '%walaa%' OR name ILIKE '%Dr%Walaa%';

-- Test 2: Check if events RLS policies include content_creative_manager
SELECT 
    'Test 2 - Events RLS Policies Check:' as test_name,
    policyname,
    CASE 
        WHEN qual LIKE '%content_creative_manager%' OR with_check LIKE '%content_creative_manager%' 
        THEN '✅ PASS - Policy includes content_creative_manager'
        ELSE '❌ FAIL - Policy missing content_creative_manager'
    END as result
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;

-- Test 3: Check if all Content & Creative Managers have correct role
SELECT 
    'Test 3 - All Content & Creative Managers:' as test_name,
    name,
    CASE 
        WHEN role = 'content_creative_manager' THEN '✅ PASS'
        ELSE '❌ FAIL - Role is ' || role
    END as role_check,
    CASE 
        WHEN team = 'Content & Creative Department' THEN '✅ PASS'
        ELSE '❌ FAIL - Team is ' || COALESCE(team, 'NULL')
    END as team_check
FROM users 
WHERE position = 'Content & Creative Manager'
ORDER BY name;

-- Test 4: Count total users with content_creative_manager role
SELECT 
    'Test 4 - Total Content & Creative Managers:' as test_name,
    COUNT(*) as total_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ PASS - Found ' || COUNT(*) || ' Content & Creative Managers'
        ELSE '❌ FAIL - No Content & Creative Managers found'
    END as result
FROM users 
WHERE role = 'content_creative_manager';

-- Test 5: Verify events table exists and has RLS enabled
SELECT 
    'Test 5 - Events Table Check:' as test_name,
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity = true THEN '✅ PASS - RLS enabled'
        ELSE '❌ FAIL - RLS not enabled'
    END as rls_status
FROM pg_tables 
WHERE tablename = 'events';

-- Summary
SELECT '=== SUMMARY ===' as summary;
SELECT 
    'If all tests show ✅ PASS, then Dr Walaa should be able to edit events!' as message;
