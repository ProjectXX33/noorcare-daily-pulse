-- =====================================================
-- SENIOR CRM PHARMACIST ROLE IMPLEMENTATION
-- =====================================================
-- This SQL file adds a new Senior CRM Pharmacist role with the same permissions as Junior CRM Specialist
-- Role: employee (same as Junior CRM Specialist)
-- Position: Senior CRM Pharmacist
-- Access: Same dashboard and pages as Junior CRM Specialist
-- =====================================================

-- Step 1: Update position constraint to include Senior CRM Pharmacist
-- =====================================================

-- First, drop the existing constraint if it exists
DO $$
BEGIN
    -- Drop existing position constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_position_check' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_position_check;
        RAISE NOTICE 'Dropped existing users_position_check constraint';
    END IF;
END $$;

-- Add new position constraint that includes Senior CRM Pharmacist
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
    'Senior CRM Pharmacist',  -- NEW ROLE
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

-- Notify completion
SELECT 'Users table position constraint updated to include Senior CRM Pharmacist' as status;

-- Step 2: Verify the constraint was added correctly
-- =====================================================

SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'users' 
    AND tc.constraint_name = 'users_position_check';

-- Step 3: Show current positions for verification
-- =====================================================

SELECT 'Current positions in database:' as info;
SELECT DISTINCT position, COUNT(*) as user_count 
FROM users 
GROUP BY position 
ORDER BY position;

-- Step 4: Create a test user with Senior CRM Pharmacist role (optional)
-- =====================================================
-- Uncomment the following lines to create a test user:
/*
INSERT INTO users (id, username, name, email, role, department, position) VALUES 
(
    gen_random_uuid(), 
    'senior_crm_pharmacist_test', 
    'Senior CRM Pharmacist Test User', 
    'senior.crm.pharmacist@test.com', 
    'employee', 
    'General', 
    'Senior CRM Pharmacist'
);
*/

-- Step 5: Final verification
-- =====================================================

SELECT '✅ Senior CRM Pharmacist role implementation completed successfully!' as status;
SELECT '📋 Next steps:' as next_steps;
SELECT '   1. Update frontend route components to include Senior CRM Pharmacist' as step1;
SELECT '   2. Update sidebar navigation filtering logic' as step2;
SELECT '   3. Test access to Customer Service pages' as step3;
SELECT '   4. Verify dashboard access and permissions' as step4;
