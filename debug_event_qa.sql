-- Debug Event Q&A System
-- Run these queries in Supabase SQL Editor to check Q&A functionality

-- =====================================================
-- 1. CHECK IF EVENT_QA TABLE EXISTS
-- =====================================================
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'event_qa'
) AS table_exists;

-- =====================================================
-- 2. CHECK TABLE STRUCTURE
-- =====================================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'event_qa' 
ORDER BY ordinal_position;

-- =====================================================
-- 3. CHECK IF VIEW EXISTS
-- =====================================================
SELECT EXISTS (
    SELECT FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'event_qa_with_users'
) AS view_exists;

-- =====================================================
-- 4. CHECK ALL Q&A DATA
-- =====================================================
SELECT 
    eq.*,
    e.title as event_title,
    creator.name as creator_name,
    answerer.name as answerer_name
FROM event_qa eq
LEFT JOIN events e ON eq.event_id = e.id
LEFT JOIN users creator ON eq.created_by = creator.id
LEFT JOIN users answerer ON eq.answered_by = answerer.id
ORDER BY eq.created_at DESC;

-- =====================================================
-- 5. CHECK Q&A COUNT PER EVENT
-- =====================================================
SELECT 
    e.title as event_title,
    e.id as event_id,
    COUNT(eq.id) as total_questions,
    COUNT(eq.answer) as answered_questions,
    COUNT(eq.id) - COUNT(eq.answer) as unanswered_questions
FROM events e
LEFT JOIN event_qa eq ON e.id = eq.event_id AND eq.is_active = true
GROUP BY e.id, e.title
ORDER BY total_questions DESC;

-- =====================================================
-- 6. CHECK RLS POLICIES
-- =====================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'event_qa';

-- =====================================================
-- 7. CHECK RECENT Q&A ACTIVITY
-- =====================================================
SELECT 
    eq.question,
    eq.answer,
    eq.created_at,
    eq.answered_at,
    e.title as event_title,
    creator.name as question_by,
    answerer.name as answered_by
FROM event_qa eq
LEFT JOIN events e ON eq.event_id = e.id
LEFT JOIN users creator ON eq.created_by = creator.id
LEFT JOIN users answerer ON eq.answered_by = answerer.id
WHERE eq.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY eq.created_at DESC;

-- =====================================================
-- 8. TEST INSERT SAMPLE Q&A (OPTIONAL)
-- =====================================================
-- Only run this if you want to test with sample data

/*
DO $$
DECLARE
    sample_event_id UUID;
    current_user_id UUID;
BEGIN
    -- Get first event
    SELECT id INTO sample_event_id FROM events LIMIT 1;
    
    -- Get current user (replace with actual user ID)
    SELECT id INTO current_user_id FROM users WHERE role = 'admin' LIMIT 1;
    
    IF sample_event_id IS NOT NULL AND current_user_id IS NOT NULL THEN
        -- Insert test question
        INSERT INTO event_qa (event_id, question, created_by) VALUES
        (sample_event_id, 'Test question: What time does the event start?', current_user_id);
        
        RAISE NOTICE 'Test Q&A inserted successfully!';
        RAISE NOTICE 'Event ID: %', sample_event_id;
        RAISE NOTICE 'User ID: %', current_user_id;
    ELSE
        RAISE NOTICE 'No events or users found for testing.';
    END IF;
END $$;
*/

-- =====================================================
-- 9. CHECK FOR ERRORS IN TRIGGERS
-- =====================================================
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'event_qa';

-- =====================================================
-- 10. VERIFY UUID GENERATION
-- =====================================================
SELECT uuid_generate_v4() as test_uuid;

-- =====================================================
-- 11. CHECK AUTH USER (for RLS testing)
-- =====================================================
SELECT auth.uid() as current_user_id;

-- =====================================================
-- 12. SIMPLE Q&A VIEW FOR SPECIFIC EVENT
-- =====================================================
-- Replace 'your-event-id' with actual event ID
/*
SELECT 
    question,
    answer,
    created_at,
    answered_at,
    CASE 
        WHEN answer IS NOT NULL THEN 'Answered'
        ELSE 'Waiting for answer'
    END as status
FROM event_qa 
WHERE event_id = 'your-event-id' 
AND is_active = true
ORDER BY order_index, created_at;
*/ 