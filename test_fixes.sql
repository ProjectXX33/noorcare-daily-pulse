-- Quick test to verify notifications and tasks are working
-- Run this after running fix_notifications_and_tasks.sql

-- Test 1: Check if we have users
SELECT 'Current users:' as info;
SELECT role, count(*) FROM users GROUP BY role;

-- Test 2: Check notifications table structure
SELECT 'Notifications table structure:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'notifications' ORDER BY ordinal_position;

-- Test 3: Check tasks table structure
SELECT 'Tasks table structure:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'tasks' ORDER BY ordinal_position;

-- Test 4: Check current RLS policies
SELECT 'Notification policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'notifications';

SELECT 'Task policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'tasks';

-- Test 5: Count existing data
SELECT 'Current data counts:' as info;
SELECT 'notifications' as table_name, count(*) as count FROM notifications
UNION ALL
SELECT 'tasks' as table_name, count(*) as count FROM tasks;

-- Test 6: Clean up any test data from previous runs
DELETE FROM notifications WHERE title LIKE 'Test%';
DELETE FROM tasks WHERE title LIKE 'Test%'; 