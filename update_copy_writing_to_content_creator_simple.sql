-- =====================================================
-- SIMPLE UPDATE: COPY WRITING TO CONTENT CREATOR
-- =====================================================
-- This script updates the most common tables
-- Run this in your Supabase SQL editor

-- 1. Update users table (main table)
UPDATE users 
SET position = 'Content Creator' 
WHERE position = 'Copy Writing';

-- 2. Update department references in users table
UPDATE users 
SET department = 'Content Creator Department' 
WHERE department = 'Copy Writing Department';

-- 3. Update team references in users table
UPDATE users 
SET team = 'Content Creator Department' 
WHERE team = 'Copy Writing Department';

-- 4. Update check_ins table
UPDATE check_ins 
SET position = 'Content Creator' 
WHERE position = 'Copy Writing';

-- 5. Update work_reports table
UPDATE work_reports 
SET position = 'Content Creator' 
WHERE position = 'Copy Writing';

-- 6. Update monthly_shifts table
UPDATE monthly_shifts 
SET position = 'Content Creator' 
WHERE position = 'Copy Writing';

-- 7. Update shift_assignments table
UPDATE shift_assignments 
SET position = 'Content Creator' 
WHERE position = 'Copy Writing';

-- 8. Update any shift names
UPDATE shifts 
SET name = REPLACE(name, 'Copy Writing', 'Content Creator') 
WHERE name LIKE '%Copy Writing%';

-- 9. Update any shift descriptions
UPDATE shifts 
SET description = REPLACE(description, 'Copy Writing', 'Content Creator') 
WHERE description LIKE '%Copy Writing%';

-- 10. Update performance_records table
UPDATE performance_records 
SET position = 'Content Creator' 
WHERE position = 'Copy Writing';

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check remaining Copy Writing references
SELECT 'users' as table_name, COUNT(*) as remaining_count 
FROM users 
WHERE position = 'Copy Writing' OR department LIKE '%Copy Writing%' OR team LIKE '%Copy Writing%'
UNION ALL
SELECT 'check_ins' as table_name, COUNT(*) as remaining_count 
FROM check_ins 
WHERE position = 'Copy Writing'
UNION ALL
SELECT 'work_reports' as table_name, COUNT(*) as remaining_count 
FROM work_reports 
WHERE position = 'Copy Writing'
UNION ALL
SELECT 'monthly_shifts' as table_name, COUNT(*) as remaining_count 
FROM monthly_shifts 
WHERE position = 'Copy Writing'
UNION ALL
SELECT 'shift_assignments' as table_name, COUNT(*) as remaining_count 
FROM shift_assignments 
WHERE position = 'Copy Writing'
UNION ALL
SELECT 'performance_records' as table_name, COUNT(*) as remaining_count 
FROM performance_records 
WHERE position = 'Copy Writing';

-- Show all Content Creator users
SELECT id, name, position, department, team, email 
FROM users 
WHERE position = 'Content Creator' 
ORDER BY name;

-- Show all positions in the system
SELECT DISTINCT position, COUNT(*) as user_count 
FROM users 
GROUP BY position 
ORDER BY position;
