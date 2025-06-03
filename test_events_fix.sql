-- Test Events Fix
-- Run this after running the fixed_sql_for_supabase.sql

-- 1. Verify events table exists and has correct structure
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY ordinal_position;

-- 2. Check if we have any admin users to test with
SELECT id, name, email, role FROM users WHERE role = 'admin' LIMIT 1;

-- 3. Test inserting a sample event
DO $$
DECLARE
    admin_id UUID;
BEGIN
    -- Get first admin user
    SELECT id INTO admin_id FROM users WHERE role = 'admin' LIMIT 1;
    
    IF admin_id IS NOT NULL THEN
        -- Insert sample event
        INSERT INTO events (title, description, start_date, end_date, created_by)
        VALUES (
            'Sample Event',
            'This is a test event to verify the events system is working',
            CURRENT_TIMESTAMP + INTERVAL '1 day',
            CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '2 hours',
            admin_id
        );
        
        RAISE NOTICE 'Sample event created successfully!';
    ELSE
        RAISE NOTICE 'No admin user found. Please create an admin user first.';
    END IF;
END $$;

-- 4. Test selecting events (mimics what the frontend does)
SELECT 
    id, 
    title, 
    description, 
    start_date as start, 
    end_date as end, 
    created_by, 
    created_at
FROM events 
ORDER BY start_date ASC;

-- 5. Check RLS policies are working
SELECT 
    policyname, 
    cmd, 
    permissive
FROM pg_policies 
WHERE tablename = 'events';

-- 6. Clean up test data (optional)
-- DELETE FROM events WHERE title = 'Sample Event'; 