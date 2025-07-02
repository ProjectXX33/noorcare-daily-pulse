-- Debug user role and notification settings
-- Run this in your Supabase SQL editor to check your user setup

-- Check current user role (Mohamed's account)
SELECT 
    'Current User Info:' as debug_step,
    id,
    name,
    email,
    role,
    position,
    created_at
FROM users 
WHERE email = 'mohamed.salem.noor5@gmail.com'
ORDER BY created_at DESC;

-- Check all warehouse users
SELECT 
    id,
    name,
    email,
    role,
    position,
    created_at
FROM users 
WHERE role = 'warehouse'
ORDER BY created_at DESC;

-- Check recent notifications for warehouse users
SELECT 
    n.id,
    n.title,
    n.message,
    n.related_to,
    n.created_at,
    u.name as user_name,
    u.email as user_email
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE u.role = 'warehouse'
  AND n.created_at >= NOW() - INTERVAL '7 days'
ORDER BY n.created_at DESC
LIMIT 20;

-- Check if the clear_highlights_for_final_statuses function exists
SELECT 
    'Function Check:' as debug_step,
    proname as function_name,
    CASE WHEN prosrc IS NOT NULL THEN 'Function exists and ready' ELSE 'Function missing' END as status
FROM pg_proc 
WHERE proname = 'clear_highlights_for_final_statuses';

-- UPDATE: Ensure Mohamed has warehouse role (run this if role is not 'warehouse')
-- UPDATE users 
-- SET role = 'warehouse', position = 'Warehouse Staff'
-- WHERE email = 'mohamed.salem.noor5@gmail.com'; 