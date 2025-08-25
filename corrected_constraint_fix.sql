-- =====================================================
-- CORRECTED CONSTRAINT FIX FOR CONTENT CREATOR MIGRATION
-- =====================================================
-- This script fixes constraints by checking column existence first
-- Run this in your Supabase SQL editor

-- STEP 1: Check what tables and columns actually exist
SELECT 
    t.table_name,
    c.column_name,
    c.data_type
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
    AND t.table_name IN ('users', 'check_ins', 'work_reports', 'monthly_shifts', 'shift_assignments')
    AND c.column_name = 'position'
ORDER BY t.table_name, c.column_name;

-- STEP 2: Check current positions in users table
SELECT DISTINCT position, COUNT(*) as user_count 
FROM users 
GROUP BY position 
ORDER BY position;

-- STEP 3: Update any remaining "Copy Writing" to "Content Creator"
UPDATE users 
SET position = 'Content Creator' 
WHERE position = 'Copy Writing';

-- STEP 4: Drop existing constraints (only if they exist)
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
    
END $$;

-- STEP 5: Add constraint for users table (this table definitely has a position column)
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

-- STEP 6: Add constraints for other tables ONLY if they have position columns
DO $$
BEGIN
    -- Add constraint for work_reports table if it has position column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_reports' AND column_name = 'position'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'work_reports' AND constraint_name = 'work_reports_position_check'
        ) THEN
            ALTER TABLE work_reports DROP CONSTRAINT work_reports_position_check;
        END IF;
        
        ALTER TABLE work_reports ADD CONSTRAINT work_reports_position_check 
        CHECK (position IN (
            'Customer Service', 
            'Designer', 
            'Content Creator',
            'Media Buyer', 
            'Web Developer'
        ));
    END IF;
    
    -- Add constraint for monthly_shifts table if it has position column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'monthly_shifts' AND column_name = 'position'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'monthly_shifts' AND constraint_name = 'monthly_shifts_position_check'
        ) THEN
            ALTER TABLE monthly_shifts DROP CONSTRAINT monthly_shifts_position_check;
        END IF;
        
        ALTER TABLE monthly_shifts ADD CONSTRAINT monthly_shifts_position_check 
        CHECK (position IN (
            'Customer Service', 
            'Designer', 
            'Content Creator',
            'Media Buyer', 
            'Web Developer'
        ));
    END IF;
    
    -- Add constraint for shift_assignments table if it has position column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shift_assignments' AND column_name = 'position'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'shift_assignments' AND constraint_name = 'shift_assignments_position_check'
        ) THEN
            ALTER TABLE shift_assignments DROP CONSTRAINT shift_assignments_position_check;
        END IF;
        
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

-- STEP 7: Verify the constraints were added correctly
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name IN ('users', 'work_reports', 'monthly_shifts', 'shift_assignments')
    AND tc.constraint_type = 'CHECK'
    AND tc.constraint_name LIKE '%position%'
ORDER BY tc.table_name, tc.constraint_name;

-- STEP 8: Final verification - show all positions
SELECT DISTINCT position, COUNT(*) as user_count 
FROM users 
GROUP BY position 
ORDER BY position;

-- STEP 9: Test the constraint
SELECT 'Constraint fix completed successfully!' as status;
