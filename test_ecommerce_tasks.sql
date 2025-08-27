-- Test query to check tasks for E-commerce Manager
-- Replace 'USER_ID_HERE' with the actual E-commerce Manager user ID

-- Check all tasks
SELECT 
  t.id,
  t.title,
  t.description,
  t.status,
  t.assigned_to,
  t.created_by,
  u1.name as assigned_to_name,
  u1.team as assigned_to_team,
  u1.position as assigned_to_position,
  u2.name as created_by_name
FROM tasks t
LEFT JOIN users u1 ON t.assigned_to = u1.id
LEFT JOIN users u2 ON t.created_by = u2.id
ORDER BY t.created_at DESC
LIMIT 10;

-- Check tasks assigned to E-commerce Manager (replace USER_ID_HERE)
-- SELECT 
--   t.id,
--   t.title,
--   t.description,
--   t.status,
--   t.assigned_to,
--   t.created_by
-- FROM tasks t
-- WHERE t.assigned_to = 'USER_ID_HERE' OR t.created_by = 'USER_ID_HERE'
-- ORDER BY t.created_at DESC;

-- Check E-commerce Manager user details
-- SELECT id, name, username, team, position, role
-- FROM users 
-- WHERE role = 'ecommerce_manager' OR position = 'E-commerce Manager';
