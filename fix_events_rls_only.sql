-- =====================================================
-- FIX EVENTS RLS POLICIES ONLY
-- =====================================================
-- Dr Walaa's role is already correct (content_creative_manager)
-- This script only fixes the RLS policies to allow content_creative_manager to edit events
-- =====================================================

-- Step 1: Check current events RLS policies
-- =====================================================
SELECT '=== CURRENT EVENTS POLICIES ===' as step;

SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;

-- Step 2: Drop existing events policies
-- =====================================================
SELECT '=== DROPPING OLD POLICIES ===' as step;

DROP POLICY IF EXISTS events_select ON events;
DROP POLICY IF EXISTS events_insert ON events;
DROP POLICY IF EXISTS events_update ON events;
DROP POLICY IF EXISTS events_delete ON events;

-- Step 3: Create new RLS policies that include content_creative_manager
-- =====================================================
SELECT '=== CREATING NEW POLICIES ===' as step;

-- Everyone can view events
CREATE POLICY events_select ON events FOR SELECT USING (true);

-- Only admins and content_creative_manager can create events
CREATE POLICY events_insert ON events FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'content_creative_manager')
    )
);

-- Only admins, content_creative_manager, and event creators can update events
CREATE POLICY events_update ON events FOR UPDATE USING (
    created_by = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'content_creative_manager')
    )
);

-- Only admins, content_creative_manager, and event creators can delete events
CREATE POLICY events_delete ON events FOR DELETE USING (
    created_by = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'content_creative_manager')
    )
);

-- Step 4: Verify the new policies
-- =====================================================
SELECT '=== VERIFYING NEW POLICIES ===' as step;

SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%content_creative_manager%' OR with_check LIKE '%content_creative_manager%' 
        THEN '✅ PASS - Includes content_creative_manager'
        ELSE '❌ FAIL - Missing content_creative_manager'
    END as status
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;

-- Step 5: Verify Dr Walaa's role is correct
-- =====================================================
SELECT '=== VERIFYING DR WALAA ===' as step;

SELECT 
    name,
    role,
    position,
    team,
    CASE 
        WHEN role = 'content_creative_manager' THEN '✅ PASS - Role is correct'
        ELSE '❌ FAIL - Role is ' || role
    END as role_status
FROM users 
WHERE name ILIKE '%walaa%' OR name ILIKE '%Dr%Walaa%';

-- Step 6: Test summary
-- =====================================================
SELECT '=== TEST SUMMARY ===' as step;

SELECT 
    'Dr Walaa should now be able to edit events!' as message,
    'Role: content_creative_manager ✅' as role_check,
    'RLS Policies: Updated to include content_creative_manager ✅' as rls_check;
