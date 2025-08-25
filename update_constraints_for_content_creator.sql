-- =====================================================
-- UPDATE CONSTRAINTS FOR CONTENT CREATOR
-- =====================================================
-- This script updates database constraints to include 'Content Creator'
-- Run this after updating the data

-- 1. Drop existing check constraints on users table (if they exist)
-- Note: You may need to adjust table names based on your schema

-- Drop constraint on position column (if exists)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_position_check;

-- Drop constraint on department column (if exists)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_department_check;

-- Drop constraint on team column (if exists)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_team_check;

-- 2. Add new check constraints with Content Creator included

-- Add constraint for position column
ALTER TABLE users ADD CONSTRAINT users_position_check 
CHECK (position IN (
    'Customer Service', 
    'Designer', 
    'Content Creator',  -- Updated from 'Copy Writing'
    'Media Buyer', 
    'Web Developer', 
    'Warehouse Staff', 
    'Executive Director', 
    'Content & Creative Manager', 
    'Customer Retention Manager', 
    'IT Manager'
));

-- Add constraint for department column (if needed)
ALTER TABLE users ADD CONSTRAINT users_department_check 
CHECK (department IN (
    'Customer Service Department',
    'Design Department', 
    'Content Creator Department',  -- Updated from 'Copy Writing Department'
    'Media Buyer Department',
    'Web Development Department',
    'Warehouse Department',
    'Content & Creative Department',
    'Customer Retention Department',
    'IT Department',
    'Digital Solutions Department'
));

-- Add constraint for team column (if needed)
ALTER TABLE users ADD CONSTRAINT users_team_check 
CHECK (team IN (
    'Customer Service Department',
    'Design Department', 
    'Content Creator Department',  -- Updated from 'Copy Writing Department'
    'Media Buyer Department',
    'Web Development Department',
    'Warehouse Department',
    'Content & Creative Department',
    'Customer Retention Department',
    'IT Department',
    'Digital Solutions Department'
));

-- 3. Update any other table constraints

-- Update check_ins table constraints
ALTER TABLE check_ins DROP CONSTRAINT IF EXISTS check_ins_position_check;
ALTER TABLE check_ins ADD CONSTRAINT check_ins_position_check 
CHECK (position IN (
    'Customer Service', 
    'Designer', 
    'Content Creator',  -- Updated from 'Copy Writing'
    'Media Buyer', 
    'Web Developer'
));

-- Update work_reports table constraints
ALTER TABLE work_reports DROP CONSTRAINT IF EXISTS work_reports_position_check;
ALTER TABLE work_reports ADD CONSTRAINT work_reports_position_check 
CHECK (position IN (
    'Customer Service', 
    'Designer', 
    'Content Creator',  -- Updated from 'Copy Writing'
    'Media Buyer', 
    'Web Developer'
));

-- Update monthly_shifts table constraints
ALTER TABLE monthly_shifts DROP CONSTRAINT IF EXISTS monthly_shifts_position_check;
ALTER TABLE monthly_shifts ADD CONSTRAINT monthly_shifts_position_check 
CHECK (position IN (
    'Customer Service', 
    'Designer', 
    'Content Creator',  -- Updated from 'Copy Writing'
    'Media Buyer', 
    'Web Developer'
));

-- Update shift_assignments table constraints
ALTER TABLE shift_assignments DROP CONSTRAINT IF EXISTS shift_assignments_position_check;
ALTER TABLE shift_assignments ADD CONSTRAINT shift_assignments_position_check 
CHECK (position IN (
    'Customer Service', 
    'Designer', 
    'Content Creator',  -- Updated from 'Copy Writing'
    'Media Buyer', 
    'Web Developer'
));

-- Update performance_records table constraints
ALTER TABLE performance_records DROP CONSTRAINT IF EXISTS performance_records_position_check;
ALTER TABLE performance_records ADD CONSTRAINT performance_records_position_check 
CHECK (position IN (
    'Customer Service', 
    'Designer', 
    'Content Creator',  -- Updated from 'Copy Writing'
    'Media Buyer', 
    'Web Developer'
));

-- 4. Update any enum types (if using PostgreSQL enums)

-- If you have enum types, you might need to update them like this:
-- ALTER TYPE position_enum ADD VALUE 'Content Creator';
-- ALTER TYPE position_enum DROP VALUE 'Copy Writing';

-- 5. Update any foreign key constraints (if they reference position values)

-- Example: If you have a positions lookup table
-- UPDATE positions_lookup SET position_name = 'Content Creator' WHERE position_name = 'Copy Writing';

-- 6. Verify constraints
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

-- 7. Test the constraints
-- Try inserting a user with 'Content Creator' position
-- INSERT INTO users (name, position, email) VALUES ('Test User', 'Content Creator', 'test@example.com');

-- Try inserting a user with old 'Copy Writing' position (should fail)
-- INSERT INTO users (name, position, email) VALUES ('Test User 2', 'Copy Writing', 'test2@example.com');
