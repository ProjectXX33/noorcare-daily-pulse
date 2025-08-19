-- Check if there are any event Q&A records
-- Run this in your Supabase SQL editor

-- Check the event_qa table
SELECT 
  'event_qa' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_records
FROM event_qa;

-- Check the event_qa_with_users view
SELECT 
  'event_qa_with_users' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_records
FROM event_qa_with_users;

-- Check events with Q&A
SELECT 
  e.id,
  e.title,
  COUNT(eqa.id) as qa_count
FROM events e
LEFT JOIN event_qa eqa ON e.id = eqa.event_id AND eqa.is_active = true
GROUP BY e.id, e.title
ORDER BY qa_count DESC;

-- Check if the event_qa_with_users view exists and has data
SELECT 
  'event_qa_with_users_view' as check_type,
  EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_name = 'event_qa_with_users'
  ) as view_exists;

-- Sample Q&A records if any exist
SELECT 
  eqa.id,
  eqa.event_id,
  eqa.question,
  eqa.answer,
  eqa.is_active,
  eqa.created_at,
  e.title as event_title
FROM event_qa eqa
LEFT JOIN events e ON eqa.event_id = e.id
ORDER BY eqa.created_at DESC
LIMIT 10;
