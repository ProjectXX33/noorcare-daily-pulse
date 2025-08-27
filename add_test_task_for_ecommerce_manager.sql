-- Add a test task for the E-commerce Manager
-- Replace 'ECOMMERCE_MANAGER_USER_ID' with the actual E-commerce Manager user ID

-- First, let's find the E-commerce Manager user ID
SELECT id, name, username, team, position, role
FROM users 
WHERE role = 'ecommerce_manager' OR position = 'E-commerce Manager';

-- Then add a test task (uncomment and replace USER_ID after finding it above)
/*
INSERT INTO tasks (
  id,
  title,
  description,
  status,
  assigned_to,
  created_by,
  priority,
  project_type,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Test E-commerce Task',
  'This is a test task to verify the E-commerce Manager dashboard is working correctly.',
  'Not Started',
  'ECOMMERCE_MANAGER_USER_ID', -- Replace with actual user ID
  'ECOMMERCE_MANAGER_USER_ID', -- Replace with actual user ID
  'medium',
  'other',
  NOW(),
  NOW()
);
*/
