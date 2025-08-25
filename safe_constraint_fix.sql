-- =====================================================
-- SAFE CONSTRAINT FIX FOR CONTENT CREATOR MIGRATION
-- =====================================================
-- This script safely fixes constraints by checking existing data first
-- Run this in your Supabase SQL editor

-- STEP 1: Check what tables actually exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('users', 'check_ins', 'work_reports', 'monthly_shifts', 'shift_assignments', 'performance_records')
ORDER BY table_name;

-- STEP 2: Check current positions in users table
SELECT DISTINCT position, COUNT(*) as user_count 
FROM users 
GROUP BY position 
ORDER BY position;

-- STEP 3: Check for any "Copy Writing" positions that need to be updated
SELECT id, name, position, email 
FROM users 
WHERE position = 'Copy Writing';

-- STEP 4: Update any remaining "Copy Writing" to "Content Creator"
UPDATE users 
SET position = 'Content Creator' 
WHERE position = 'Copy Writing';

-- STEP 5: Drop existing constraints (only if they exist)
DO $$
BEGIN
    -- Drop users table constraints
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'users' AND constraint_name = 'users_position_check'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_position_check;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'users' AND constraint_name = 'users_department_check'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_department_check;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'users' AND constraint_name = 'users_team_check'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_team_check;
    END IF;
    
    -- Drop check_ins table constraints
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'check_ins' AND constraint_name = 'check_ins_position_check'
    ) THEN
        ALTER TABLE check_ins DROP CONSTRAINT check_ins_position_check;
    END IF;
    
    -- Drop work_reports table constraints
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'work_reports' AND constraint_name = 'work_reports_position_check'
    ) THEN
        ALTER TABLE work_reports DROP CONSTRAINT work_reports_position_check;
    END IF;
    
    -- Drop monthly_shifts table constraints
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'monthly_shifts' AND constraint_name = 'monthly_shifts_position_check'
    ) THEN
        ALTER TABLE monthly_shifts DROP CONSTRAINT monthly_shifts_position_check;
    END IF;
    
    -- Drop shift_assignments table constraints
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'shift_assignments' AND constraint_name = 'shift_assignments_position_check'
    ) THEN
        ALTER TABLE shift_assignments DROP CONSTRAINT shift_assignments_position_check;
    END IF;
    
END $$;

-- STEP 6: Get all unique positions currently in the users table
-- This will be used to create a dynamic constraint
SELECT DISTINCT position 
FROM users 
ORDER BY position;

-- STEP 7: Add constraint for users table with all existing positions
-- (This will be created based on what positions actually exist in your data)
ALTER TABLE users ADD CONSTRAINT users_position_check 
CHECK (position IN (
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
));

-- STEP 8: Add constraints for other tables (only if they exist)
DO $$
BEGIN
    -- Add constraint for check_ins table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'check_ins') THEN
        ALTER TABLE check_ins ADD CONSTRAINT check_ins_position_check 
        CHECK (position IN (
            'Customer Service', 
            'Designer', 
            'Content Creator',
            'Media Buyer', 
            'Web Developer'
        ));
    END IF;
    
    -- Add constraint for work_reports table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_reports') THEN
        ALTER TABLE work_reports ADD CONSTRAINT work_reports_position_check 
        CHECK (position IN (
            'Customer Service', 
            'Designer', 
            'Content Creator',
            'Media Buyer', 
            'Web Developer'
        ));
    END IF;
    
    -- Add constraint for monthly_shifts table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'monthly_shifts') THEN
        ALTER TABLE monthly_shifts ADD CONSTRAINT monthly_shifts_position_check 
        CHECK (position IN (
            'Customer Service', 
            'Designer', 
            'Content Creator',
            'Media Buyer', 
            'Web Developer'
        ));
    END IF;
    
    -- Add constraint for shift_assignments table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shift_assignments') THEN
        ALTER TABLE shift_assignments ADD CONSTRAINT shift_assignments_position_check 
        CHECK (position IN (
            'Customer Service', 
            'Designer', 
            'Content Creator',
            'Media Buyer', 
            'Web Developer'
        ));
    END IF;
    
END $$;

-- STEP 9: Verify the constraints were added correctly
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name IN ('users', 'check_ins', 'work_reports', 'monthly_shifts', 'shift_assignments')
    AND tc.constraint_type = 'CHECK'
ORDER BY tc.table_name, tc.constraint_name;

-- STEP 10: Final verification - show all positions
SELECT DISTINCT position, COUNT(*) as user_count 
FROM users 
GROUP BY position 
ORDER BY position;
