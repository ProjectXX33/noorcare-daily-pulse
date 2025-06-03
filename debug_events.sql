-- Debug Events Table Issues
-- Run these queries one by one to identify the problem

-- 1. Check if events table exists
SELECT tablename FROM pg_tables WHERE tablename = 'events';

-- 2. Check events table structure
\d events;

-- 3. Check if there are any events
SELECT COUNT(*) FROM events;

-- 4. Test a simple select
SELECT * FROM events LIMIT 5;

-- 5. Check RLS policies for events
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'events';

-- 6. Test inserting a sample event (as admin)
INSERT INTO events (title, description, start_date, created_by)
VALUES (
    'Test Event', 
    'This is a test event', 
    CURRENT_TIMESTAMP, 
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
);

-- 7. Try to fetch events like the frontend does
SELECT id, title, description, start_date as start, end_date as end, created_by, created_at
FROM events 
ORDER BY start_date ASC; 