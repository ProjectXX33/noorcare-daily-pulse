-- Fix Events RLS Policies to allow Content & Creative Managers to edit events
-- This will allow Dr Walaa and other Content & Creative Managers to create, update, and delete events

-- First, let's see the current RLS policies for events table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;

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

-- Verify the new policies
SELECT 
    'Updated Events Policies:' as debug_step,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;

-- Test the permissions by checking if content_creative_manager users exist
SELECT 
    'Content & Creative Managers:' as debug_step,
    id,
    name,
    email,
    role,
    position,
    team
FROM users 
WHERE role = 'content_creative_manager'
ORDER BY name;
