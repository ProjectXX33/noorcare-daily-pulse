-- =====================================================
-- COMPLETE CONSTRAINT FIX FOR CONTENT CREATOR MIGRATION
-- =====================================================
-- This script fixes all constraint issues after updating Copy Writing to Content Creator
-- Run this in your Supabase SQL editor

-- STEP 1: Check current constraints
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name IN ('users', 'check_ins', 'work_reports', 'monthly_shifts', 'shift_assignments', 'performance_records')
    AND tc.constraint_type = 'CHECK'
ORDER BY tc.table_name, tc.constraint_name;

-- STEP 2: Drop all existing position-related constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_position_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_department_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_team_check;

ALTER TABLE check_ins DROP CONSTRAINT IF EXISTS check_ins_position_check;
ALTER TABLE work_reports DROP CONSTRAINT IF EXISTS work_reports_position_check;
ALTER TABLE monthly_shifts DROP CONSTRAINT IF EXISTS monthly_shifts_position_check;
ALTER TABLE shift_assignments DROP CONSTRAINT IF EXISTS shift_assignments_position_check;
ALTER TABLE performance_records DROP CONSTRAINT IF EXISTS performance_records_position_check;

-- STEP 3: Add updated constraints for users table
ALTER TABLE users ADD CONSTRAINT users_position_check 
CHECK (position IN (
    'Customer Service', 
    'Designer', 
    'Content Creator',  -- Updated from Copy Writing
    'Media Buyer', 
    'Web Developer', 
    'Warehouse Staff', 
    'Executive Director', 
    'Content & Creative Manager', 
    'Customer Retention Manager', 
    'IT Manager',
    'Junior CRM Specialist',
    'Junior Ads Specialist',
    'Creative Designer',
    'Digital Solutions Specialist',
    'Digital Solutions Coordinator',
    'Customer Retention Specialist',
    'Customer Success Coordinator',
    'Customer Service Agent',
    'Senior Customer Service Agent',
    'Media Buyer Specialist',
    'Senior Media Buyer',
    'Junior Media Buyer',
    'Warehouse Operator',
    'Senior Warehouse Operator',
    'Copy Writer',
    'Senior Copy Writer',
    'Junior Copy Writer'
));

-- STEP 4: Add constraints for other tables
ALTER TABLE check_ins ADD CONSTRAINT check_ins_position_check 
CHECK (position IN (
    'Customer Service', 
    'Designer', 
    'Content Creator',  -- Updated from Copy Writing
    'Media Buyer', 
    'Web Developer'
));

ALTER TABLE work_reports ADD CONSTRAINT work_reports_position_check 
CHECK (position IN (
    'Customer Service', 
    'Designer', 
    'Content Creator',  -- Updated from Copy Writing
    'Media Buyer', 
    'Web Developer'
));

ALTER TABLE monthly_shifts ADD CONSTRAINT monthly_shifts_position_check 
CHECK (position IN (
    'Customer Service', 
    'Designer', 
    'Content Creator',  -- Updated from Copy Writing
    'Media Buyer', 
    'Web Developer'
));

ALTER TABLE shift_assignments ADD CONSTRAINT shift_assignments_position_check 
CHECK (position IN (
    'Customer Service', 
    'Designer', 
    'Content Creator',  -- Updated from Copy Writing
    'Media Buyer', 
    'Web Developer'
));

ALTER TABLE performance_records ADD CONSTRAINT performance_records_position_check 
CHECK (position IN (
    'Customer Service', 
    'Designer', 
    'Content Creator',  -- Updated from Copy Writing
    'Media Buyer', 
    'Web Developer'
));

-- STEP 5: Verify all constraints were added correctly
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name IN ('users', 'check_ins', 'work_reports', 'monthly_shifts', 'shift_assignments', 'performance_records')
    AND tc.constraint_type = 'CHECK'
ORDER BY tc.table_name, tc.constraint_name;

-- STEP 6: Check for any data inconsistencies
SELECT 'users' as table_name, COUNT(*) as invalid_count 
FROM users 
WHERE position NOT IN (
    'Customer Service', 
    'Designer', 
    'Content Creator', 
    'Media Buyer', 
    'Web Developer', 
    'Warehouse Staff', 
    'Executive Director', 
    'Content & Creative Manager', 
    'Customer Retention Manager', 
    'IT Manager',
    'Junior CRM Specialist',
    'Junior Ads Specialist',
    'Creative Designer',
    'Digital Solutions Specialist',
    'Digital Solutions Coordinator',
    'Customer Retention Specialist',
    'Customer Success Coordinator',
    'Customer Service Agent',
    'Senior Customer Service Agent',
    'Media Buyer Specialist',
    'Senior Media Buyer',
    'Junior Media Buyer',
    'Warehouse Operator',
    'Senior Warehouse Operator',
    'Copy Writer',
    'Senior Copy Writer',
    'Junior Copy Writer'
)
UNION ALL
SELECT 'check_ins' as table_name, COUNT(*) as invalid_count 
FROM check_ins 
WHERE position NOT IN ('Customer Service', 'Designer', 'Content Creator', 'Media Buyer', 'Web Developer')
UNION ALL
SELECT 'work_reports' as table_name, COUNT(*) as invalid_count 
FROM work_reports 
WHERE position NOT IN ('Customer Service', 'Designer', 'Content Creator', 'Media Buyer', 'Web Developer')
UNION ALL
SELECT 'monthly_shifts' as table_name, COUNT(*) as invalid_count 
FROM monthly_shifts 
WHERE position NOT IN ('Customer Service', 'Designer', 'Content Creator', 'Media Buyer', 'Web Developer')
UNION ALL
SELECT 'shift_assignments' as table_name, COUNT(*) as invalid_count 
FROM shift_assignments 
WHERE position NOT IN ('Customer Service', 'Designer', 'Content Creator', 'Media Buyer', 'Web Developer')
UNION ALL
SELECT 'performance_records' as table_name, COUNT(*) as invalid_count 
FROM performance_records 
WHERE position NOT IN ('Customer Service', 'Designer', 'Content Creator', 'Media Buyer', 'Web Developer');

-- STEP 7: Show all current positions in the system
SELECT DISTINCT position, COUNT(*) as user_count 
FROM users 
GROUP BY position 
ORDER BY position;

-- STEP 8: Test the constraints
-- Uncomment these lines to test:
/*
INSERT INTO users (name, position, email) VALUES ('Test Content Creator', 'Content Creator', 'test@example.com');
INSERT INTO users (name, position, email) VALUES ('Test Copy Writing', 'Copy Writing', 'test2@example.com'); -- This should fail
*/
