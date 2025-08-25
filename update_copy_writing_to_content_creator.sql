-- =====================================================
-- UPDATE COPY WRITING TO CONTENT CREATOR
-- =====================================================
-- This script updates all references from "Copy Writing" to "Content Creator"
-- Run this script in your Supabase SQL editor

-- 1. Update users table position column
UPDATE users 
SET position = 'Content Creator' 
WHERE position = 'Copy Writing';

-- 2. Update any department references
UPDATE users 
SET department = 'Content Creator Department' 
WHERE department = 'Copy Writing Department';

-- 3. Update team references
UPDATE users 
SET team = 'Content Creator Department' 
WHERE team = 'Copy Writing Department';

-- 4. Update shift assignments table
UPDATE shift_assignments 
SET position = 'Content Creator' 
WHERE position = 'Copy Writing';

-- 5. Update monthly_shifts table
UPDATE monthly_shifts 
SET position = 'Content Creator' 
WHERE position = 'Copy Writing';

-- 6. Update work_reports table
UPDATE work_reports 
SET position = 'Content Creator' 
WHERE position = 'Copy Writing';

-- 7. Update performance_records table
UPDATE performance_records 
SET position = 'Content Creator' 
WHERE position = 'Copy Writing';

-- 8. Update task_assignments table (if exists)
UPDATE task_assignments 
SET assigned_position = 'Content Creator' 
WHERE assigned_position = 'Copy Writing';

-- 9. Update any shift names
UPDATE shifts 
SET name = REPLACE(name, 'Copy Writing', 'Content Creator') 
WHERE name LIKE '%Copy Writing%';

-- 10. Update any shift descriptions
UPDATE shifts 
SET description = REPLACE(description, 'Copy Writing', 'Content Creator') 
WHERE description LIKE '%Copy Writing%';

-- 11. Update any notification templates
UPDATE notification_templates 
SET content = REPLACE(content, 'Copy Writing', 'Content Creator') 
WHERE content LIKE '%Copy Writing%';

-- 12. Update any system settings or configurations
UPDATE system_settings 
SET value = REPLACE(value, 'Copy Writing', 'Content Creator') 
WHERE value LIKE '%Copy Writing%';

-- 13. Update any audit logs or history tables
UPDATE audit_logs 
SET old_value = REPLACE(old_value, 'Copy Writing', 'Content Creator') 
WHERE old_value LIKE '%Copy Writing%';

UPDATE audit_logs 
SET new_value = REPLACE(new_value, 'Copy Writing', 'Content Creator') 
WHERE new_value LIKE '%Copy Writing%';

-- 14. Update any custom fields or metadata
UPDATE user_metadata 
SET metadata = jsonb_set(
    metadata, 
    '{position}', 
    '"Content Creator"'::jsonb
) 
WHERE metadata->>'position' = 'Copy Writing';

-- 15. Update any team assignments
UPDATE team_members 
SET position = 'Content Creator' 
WHERE position = 'Copy Writing';

-- 16. Update any role assignments
UPDATE user_roles 
SET role_name = 'Content Creator' 
WHERE role_name = 'Copy Writing';

-- 17. Update any department constraints (if using check constraints)
-- Note: You may need to drop and recreate constraints

-- 18. Update any foreign key references
UPDATE department_assignments 
SET department_name = 'Content Creator Department' 
WHERE department_name = 'Copy Writing Department';

-- 19. Update any reporting or analytics tables
UPDATE analytics_data 
SET position = 'Content Creator' 
WHERE position = 'Copy Writing';

-- 20. Update any backup or archive tables
UPDATE archived_users 
SET position = 'Content Creator' 
WHERE position = 'Copy Writing';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if any "Copy Writing" references remain
SELECT 'users' as table_name, COUNT(*) as count 
FROM users 
WHERE position = 'Copy Writing' OR department LIKE '%Copy Writing%' OR team LIKE '%Copy Writing%'
UNION ALL
SELECT 'shifts' as table_name, COUNT(*) as count 
FROM shifts 
WHERE name LIKE '%Copy Writing%' OR description LIKE '%Copy Writing%'
UNION ALL
SELECT 'work_reports' as table_name, COUNT(*) as count 
FROM work_reports 
WHERE position = 'Copy Writing'
UNION ALL
SELECT 'performance_records' as table_name, COUNT(*) as count 
FROM performance_records 
WHERE position = 'Copy Writing';

-- Show updated Content Creator users
SELECT id, name, position, department, team 
FROM users 
WHERE position = 'Content Creator' 
ORDER BY name;

-- Show all positions in the system
SELECT DISTINCT position 
FROM users 
ORDER BY position;

-- =====================================================
-- ROLLBACK SCRIPT (if needed)
-- =====================================================
/*
-- To rollback changes, run these commands:

UPDATE users 
SET position = 'Copy Writing' 
WHERE position = 'Content Creator';

UPDATE users 
SET department = 'Copy Writing Department' 
WHERE department = 'Content Creator Department';

UPDATE users 
SET team = 'Copy Writing Department' 
WHERE team = 'Content Creator Department';

-- ... repeat for other tables as needed
*/
