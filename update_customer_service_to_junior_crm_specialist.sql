-- =====================================================
-- SQL Script to Update 'Customer Service' to 'Junior CRM Specialist'
-- =====================================================

-- Start transaction for safe execution
BEGIN;

-- =====================================================
-- 1. UPDATE USERS TABLE
-- =====================================================
UPDATE users 
SET position = 'Junior CRM Specialist' 
WHERE position = 'Customer Service';

-- =====================================================
-- 2. UPDATE CHECK_INS TABLE
-- =====================================================
UPDATE check_ins 
SET position = 'Junior CRM Specialist' 
WHERE position = 'Customer Service';

-- =====================================================
-- 3. UPDATE WORK_REPORTS TABLE
-- =====================================================
UPDATE work_reports 
SET position = 'Junior CRM Specialist' 
WHERE position = 'Customer Service';

-- =====================================================
-- 4. UPDATE MONTHLY_SHIFTS TABLE
-- =====================================================
UPDATE monthly_shifts 
SET position = 'Junior CRM Specialist' 
WHERE position = 'Customer Service';

-- =====================================================
-- 5. UPDATE SHIFT_ASSIGNMENTS TABLE
-- =====================================================
UPDATE shift_assignments 
SET position = 'Junior CRM Specialist' 
WHERE position = 'Customer Service';

-- =====================================================
-- 6. UPDATE SHIFTS TABLE (name and description fields)
-- =====================================================
UPDATE shifts 
SET name = REPLACE(name, 'Customer Service', 'Junior CRM Specialist'),
    description = REPLACE(description, 'Customer Service', 'Junior CRM Specialist')
WHERE name LIKE '%Customer Service%' OR description LIKE '%Customer Service%';

-- =====================================================
-- 7. UPDATE PERFORMANCE_RECORDS TABLE (if exists)
-- =====================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'performance_records') THEN
        UPDATE performance_records 
        SET position = 'Junior CRM Specialist' 
        WHERE position = 'Customer Service';
    END IF;
END $$;

-- =====================================================
-- 8. UPDATE TASK_ASSIGNMENTS TABLE (if exists)
-- =====================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_assignments') THEN
        UPDATE task_assignments 
        SET position = 'Junior CRM Specialist' 
        WHERE position = 'Customer Service';
    END IF;
END $$;

-- =====================================================
-- 9. UPDATE NOTIFICATION_TEMPLATES TABLE (if exists)
-- =====================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_templates') THEN
        UPDATE notification_templates 
        SET title = REPLACE(title, 'Customer Service', 'Junior CRM Specialist'),
            content = REPLACE(content, 'Customer Service', 'Junior CRM Specialist')
        WHERE title LIKE '%Customer Service%' OR content LIKE '%Customer Service%';
    END IF;
END $$;

-- =====================================================
-- 10. UPDATE SYSTEM_SETTINGS TABLE (if exists)
-- =====================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_settings') THEN
        UPDATE system_settings 
        SET value = REPLACE(value, 'Customer Service', 'Junior CRM Specialist')
        WHERE key LIKE '%customer_service%' OR value LIKE '%Customer Service%';
    END IF;
END $$;

-- =====================================================
-- 11. UPDATE AUDIT_LOGS TABLE (if exists)
-- =====================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        UPDATE audit_logs 
        SET action_details = REPLACE(action_details, 'Customer Service', 'Junior CRM Specialist'),
            user_metadata = REPLACE(user_metadata::text, 'Customer Service', 'Junior CRM Specialist')::jsonb
        WHERE action_details LIKE '%Customer Service%' OR user_metadata::text LIKE '%Customer Service%';
    END IF;
END $$;

-- =====================================================
-- 12. UPDATE USER_METADATA (if exists in users table)
-- =====================================================
UPDATE users 
SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{position}',
    '"Junior CRM Specialist"'
)
WHERE metadata->>'position' = 'Customer Service';

-- =====================================================
-- 13. UPDATE TEAM_MEMBERS TABLE (if exists)
-- =====================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
        UPDATE team_members 
        SET position = 'Junior CRM Specialist' 
        WHERE position = 'Customer Service';
    END IF;
END $$;

-- =====================================================
-- 14. UPDATE USER_ROLES TABLE (if exists)
-- =====================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        UPDATE user_roles 
        SET role_name = REPLACE(role_name, 'Customer Service', 'Junior CRM Specialist')
        WHERE role_name LIKE '%Customer Service%';
    END IF;
END $$;

-- =====================================================
-- 15. UPDATE DEPARTMENT_ASSIGNMENTS TABLE (if exists)
-- =====================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'department_assignments') THEN
        UPDATE department_assignments 
        SET position = 'Junior CRM Specialist' 
        WHERE position = 'Customer Service';
    END IF;
END $$;

-- =====================================================
-- 16. UPDATE DATABASE CONSTRAINTS
-- =====================================================

-- Drop existing position constraints
DO $$ 
BEGIN
    -- Drop users position constraint
    IF EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'users_position_check') THEN
        ALTER TABLE users DROP CONSTRAINT users_position_check;
    END IF;
    
    -- Drop check_ins position constraint (if column exists)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'check_ins' AND column_name = 'position') THEN
        IF EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'check_ins_position_check') THEN
            ALTER TABLE check_ins DROP CONSTRAINT check_ins_position_check;
        END IF;
    END IF;
    
    -- Drop work_reports position constraint (if column exists)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_reports' AND column_name = 'position') THEN
        IF EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'work_reports_position_check') THEN
            ALTER TABLE work_reports DROP CONSTRAINT work_reports_position_check;
        END IF;
    END IF;
    
    -- Drop monthly_shifts position constraint (if column exists)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monthly_shifts' AND column_name = 'position') THEN
        IF EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'monthly_shifts_position_check') THEN
            ALTER TABLE monthly_shifts DROP CONSTRAINT monthly_shifts_position_check;
        END IF;
    END IF;
    
    -- Drop shift_assignments position constraint (if column exists)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shift_assignments' AND column_name = 'position') THEN
        IF EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'shift_assignments_position_check') THEN
            ALTER TABLE shift_assignments DROP CONSTRAINT shift_assignments_position_check;
        END IF;
    END IF;
END $$;

-- Add updated position constraints
DO $$ 
BEGIN
    -- Add users position constraint
    ALTER TABLE users ADD CONSTRAINT users_position_check 
    CHECK (position IN (
        'Junior CRM Specialist', 'Designer', 'Media Buyer', 'Content Creator', 
        'Web Developer', 'Warehouse Staff', 'Executive Director', 
        'Content & Creative Manager', 'Customer Retention Manager', 'IT Manager',
        'Junior CRM Specialist', 'Junior Ads Specialist', 'Senior Copy Writer',
        'Junior Copy Writer', 'Copy Writer', 'Customer Retention Specialist',
        'Customer Success Coordinator', 'Senior Customer Service Agent',
        'Customer Service Agent', 'Media Buyer Specialist', 'Senior Media Buyer',
        'Junior Media Buyer', 'Warehouse Operator', 'Senior Warehouse Operator',
        'Digital Solutions Specialist', 'Digital Solutions Coordinator'
    ));
    
    -- Add check_ins position constraint (if column exists)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'check_ins' AND column_name = 'position') THEN
        ALTER TABLE check_ins ADD CONSTRAINT check_ins_position_check 
        CHECK (position IN (
            'Junior CRM Specialist', 'Designer', 'Media Buyer', 'Content Creator', 
            'Web Developer', 'Warehouse Staff', 'Executive Director', 
            'Content & Creative Manager', 'Customer Retention Manager', 'IT Manager'
        ));
    END IF;
    
    -- Add work_reports position constraint (if column exists)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_reports' AND column_name = 'position') THEN
        ALTER TABLE work_reports ADD CONSTRAINT work_reports_position_check 
        CHECK (position IN (
            'Junior CRM Specialist', 'Designer', 'Media Buyer', 'Content Creator', 
            'Web Developer', 'Warehouse Staff', 'Executive Director', 
            'Content & Creative Manager', 'Customer Retention Manager', 'IT Manager'
        ));
    END IF;
    
    -- Add monthly_shifts position constraint (if column exists)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monthly_shifts' AND column_name = 'position') THEN
        ALTER TABLE monthly_shifts ADD CONSTRAINT monthly_shifts_position_check 
        CHECK (position IN (
            'Junior CRM Specialist', 'Designer', 'Media Buyer', 'Content Creator', 
            'Web Developer', 'Warehouse Staff', 'Executive Director', 
            'Content & Creative Manager', 'Customer Retention Manager', 'IT Manager'
        ));
    END IF;
    
    -- Add shift_assignments position constraint (if column exists)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shift_assignments' AND column_name = 'position') THEN
        ALTER TABLE shift_assignments ADD CONSTRAINT shift_assignments_position_check 
        CHECK (position IN (
            'Junior CRM Specialist', 'Designer', 'Media Buyer', 'Content Creator', 
            'Web Developer', 'Warehouse Staff', 'Executive Director', 
            'Content & Creative Manager', 'Customer Retention Manager', 'IT Manager'
        ));
    END IF;
END $$;

-- =====================================================
-- 17. VERIFICATION QUERIES
-- =====================================================

-- Verify users table update
SELECT 'Users table' as table_name, COUNT(*) as updated_count 
FROM users WHERE position = 'Junior CRM Specialist';

-- Verify check_ins table update
SELECT 'Check_ins table' as table_name, COUNT(*) as updated_count 
FROM check_ins WHERE position = 'Junior CRM Specialist';

-- Verify work_reports table update
SELECT 'Work_reports table' as table_name, COUNT(*) as updated_count 
FROM work_reports WHERE position = 'Junior CRM Specialist';

-- Verify monthly_shifts table update
SELECT 'Monthly_shifts table' as table_name, COUNT(*) as updated_count 
FROM monthly_shifts WHERE position = 'Junior CRM Specialist';

-- Verify shift_assignments table update
SELECT 'Shift_assignments table' as table_name, COUNT(*) as updated_count 
FROM shift_assignments WHERE position = 'Junior CRM Specialist';

-- Verify shifts table update
SELECT 'Shifts table' as table_name, COUNT(*) as updated_count 
FROM shifts WHERE name LIKE '%Junior CRM Specialist%' OR description LIKE '%Junior CRM Specialist%';

-- =====================================================
-- 18. ROLLBACK INSTRUCTIONS (if needed)
-- =====================================================

-- If you need to rollback, run these commands:
/*
-- Rollback users table
UPDATE users SET position = 'Customer Service' WHERE position = 'Junior CRM Specialist';

-- Rollback check_ins table
UPDATE check_ins SET position = 'Customer Service' WHERE position = 'Junior CRM Specialist';

-- Rollback work_reports table
UPDATE work_reports SET position = 'Customer Service' WHERE position = 'Junior CRM Specialist';

-- Rollback monthly_shifts table
UPDATE monthly_shifts SET position = 'Customer Service' WHERE position = 'Junior CRM Specialist';

-- Rollback shift_assignments table
UPDATE shift_assignments SET position = 'Customer Service' WHERE position = 'Junior CRM Specialist';

-- Rollback shifts table
UPDATE shifts 
SET name = REPLACE(name, 'Junior CRM Specialist', 'Customer Service'),
    description = REPLACE(description, 'Junior CRM Specialist', 'Customer Service')
WHERE name LIKE '%Junior CRM Specialist%' OR description LIKE '%Junior CRM Specialist%';
*/

-- =====================================================
-- COMMIT TRANSACTION
-- =====================================================
COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT 'Migration completed successfully! All "Customer Service" references have been updated to "Junior CRM Specialist".' as status;
