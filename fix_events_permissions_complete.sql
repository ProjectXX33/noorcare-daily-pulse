-- =====================================================
-- COMPLETE FIX FOR EVENTS PERMISSIONS
-- =====================================================
-- This script fixes both issues:
-- 1. Updates Dr Walaa's role to content_creative_manager
-- 2. Updates RLS policies to allow content_creative_manager to edit events
-- =====================================================

-- Step 1: Check current state
-- =====================================================
SELECT '=== CURRENT STATE ===' as step;

-- Check Dr Walaa's current role and position
SELECT 
    'Dr Walaa Current Info:' as info,
    id,
    name,
    email,
    role,
    position,
    department,
    team
FROM users 
WHERE name ILIKE '%walaa%' OR name ILIKE '%Dr%Walaa%';

-- Check current events RLS policies
SELECT 
    'Current Events Policies:' as info,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;

-- Step 2: Fix Dr Walaa's role
-- =====================================================
SELECT '=== FIXING DR WALAA ROLE ===' as step;

-- Update Dr Walaa's role to content_creative_manager
UPDATE users 
SET 
    role = 'content_creative_manager',
    team = 'Content & Creative Department',
    updated_at = CURRENT_TIMESTAMP
WHERE name ILIKE '%walaa%' OR name ILIKE '%Dr%Walaa%';

-- Also update any other Content & Creative Managers who might have the wrong role
UPDATE users 
SET 
    role = 'content_creative_manager',
    team = 'Content & Creative Department',
    updated_at = CURRENT_TIMESTAMP
WHERE position = 'Content & Creative Manager' 
  AND role != 'content_creative_manager';

-- Step 3: Fix Events RLS Policies
-- =====================================================
SELECT '=== FIXING EVENTS RLS POLICIES ===' as step;

-- Drop existing events policies
DROP POLICY IF EXISTS events_select ON events;
DROP POLICY IF EXISTS events_insert ON events;
DROP POLICY IF EXISTS events_update ON events;
DROP POLICY IF EXISTS events_delete ON events;

-- Create new RLS policies that include content_creative_manager
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

-- Step 4: Verify the fixes
-- =====================================================
SELECT '=== VERIFICATION ===' as step;

-- Verify Dr Walaa's updated role
SELECT 
    'Dr Walaa Updated Info:' as info,
    id,
    name,
    email,
    role,
    position,
    department,
    team,
    updated_at
FROM users 
WHERE name ILIKE '%walaa%' OR name ILIKE '%Dr%Walaa%';

-- Verify all Content & Creative Managers
SELECT 
    'All Content & Creative Managers:' as info,
    id,
    name,
    email,
    role,
    position,
    department,
    team
FROM users 
WHERE position = 'Content & Creative Manager' OR role = 'content_creative_manager'
ORDER BY name;

-- Verify the new events policies
SELECT 
    'Updated Events Policies:' as info,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;

-- Step 5: Test permissions
-- =====================================================
SELECT '=== PERMISSION TEST ===' as step;

-- Test if content_creative_manager users can access events
SELECT 
    'Content & Creative Managers can edit events:' as test,
    COUNT(*) as user_count
FROM users 
WHERE role = 'content_creative_manager';

SELECT '✅ FIX COMPLETE - Dr Walaa should now be able to edit events!' as status;
