-- Fix Notifications and Tasks Issues
-- This script addresses the problems with notification creation and task creation

-- Step 1: Check current notification table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

-- Step 2: Fix notifications table structure if needed
-- Add missing columns that might be causing issues
DO $$
BEGIN
    -- Check if created_by column exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'created_by') THEN
        ALTER TABLE notifications ADD COLUMN created_by UUID REFERENCES users(id);
        RAISE NOTICE 'Added created_by column to notifications table';
    END IF;
    
    -- Check if related_to and related_id columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'related_to') THEN
        ALTER TABLE notifications ADD COLUMN related_to TEXT;
        RAISE NOTICE 'Added related_to column to notifications table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'related_id') THEN
        ALTER TABLE notifications ADD COLUMN related_id TEXT;
        RAISE NOTICE 'Added related_id column to notifications table';
    END IF;
END $$;

-- Step 3: Drop and recreate RLS policies for notifications
DROP POLICY IF EXISTS notifications_select ON notifications;
DROP POLICY IF EXISTS notifications_insert ON notifications;
DROP POLICY IF EXISTS notifications_update ON notifications;
DROP POLICY IF EXISTS notifications_delete ON notifications;

-- Create proper RLS policies for notifications
-- Users can see their own notifications or if they're admin
CREATE POLICY notifications_select ON notifications FOR SELECT 
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Allow authenticated users to insert notifications (needed for system notifications)
CREATE POLICY notifications_insert ON notifications FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own notifications (mark as read)
CREATE POLICY notifications_update ON notifications FOR UPDATE 
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Only admins can delete notifications
CREATE POLICY notifications_delete ON notifications FOR DELETE 
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Step 4: Fix tasks table RLS policies to ensure proper task creation
DROP POLICY IF EXISTS tasks_select ON tasks;
DROP POLICY IF EXISTS tasks_insert ON tasks;
DROP POLICY IF EXISTS tasks_update ON tasks;
DROP POLICY IF EXISTS tasks_delete ON tasks;

-- Tasks policies: admins can do everything, employees can see their assigned tasks
CREATE POLICY tasks_select ON tasks FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') OR 
    assigned_to = auth.uid() OR 
    created_by = auth.uid()
);

CREATE POLICY tasks_insert ON tasks FOR INSERT 
WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') OR 
    created_by = auth.uid()
);

CREATE POLICY tasks_update ON tasks FOR UPDATE 
USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') OR 
    assigned_to = auth.uid() OR 
    created_by = auth.uid()
);

CREATE POLICY tasks_delete ON tasks FOR DELETE 
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Step 5: Test notification creation
DO $$
DECLARE
    test_user_id UUID;
    admin_user_id UUID;
BEGIN
    -- Get a test user (admin)
    SELECT id INTO admin_user_id FROM users WHERE role = 'admin' LIMIT 1;
    
    -- Get a test employee
    SELECT id INTO test_user_id FROM users WHERE role = 'employee' LIMIT 1;
    
    IF admin_user_id IS NOT NULL AND test_user_id IS NOT NULL THEN
        -- Test inserting a notification
        INSERT INTO notifications (user_id, title, message, created_by, related_to, related_id)
        VALUES (
            test_user_id,
            'Test Notification',
            'This is a test notification to verify the system is working',
            admin_user_id,
            'system',
            'test'
        );
        
        RAISE NOTICE 'Test notification created successfully!';
    ELSE
        RAISE NOTICE 'No admin or employee users found for testing';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating test notification: %', SQLERRM;
END $$;

-- Step 6: Test task creation
DO $$
DECLARE
    test_user_id UUID;
    admin_user_id UUID;
BEGIN
    -- Get admin and employee users
    SELECT id INTO admin_user_id FROM users WHERE role = 'admin' LIMIT 1;
    SELECT id INTO test_user_id FROM users WHERE role = 'employee' LIMIT 1;
    
    IF admin_user_id IS NOT NULL AND test_user_id IS NOT NULL THEN
        -- Test inserting a task
        INSERT INTO tasks (title, description, assigned_to, status, progress_percentage, created_by)
        VALUES (
            'Test Task',
            'This is a test task to verify the system is working',
            test_user_id,
            'On Hold',
            0,
            admin_user_id
        );
        
        RAISE NOTICE 'Test task created successfully!';
    ELSE
        RAISE NOTICE 'No admin or employee users found for testing';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating test task: %', SQLERRM;
END $$;

-- Step 7: Check final table structures
\echo 'Final notifications table structure:'
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

\echo 'Final tasks table structure:'
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;

-- Step 8: Clean up test data (optional)
-- DELETE FROM notifications WHERE title = 'Test Notification';
-- DELETE FROM tasks WHERE title = 'Test Task'; 