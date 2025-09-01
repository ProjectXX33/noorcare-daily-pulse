-- =====================================================
-- FIX POSITION CONSTRAINT VIOLATION
-- =====================================================
-- This script fixes the constraint violation by including all existing positions
-- =====================================================

-- Step 1: Check what positions currently exist in the database
-- =====================================================

SELECT 'Current positions in database:' as info;
SELECT DISTINCT position, COUNT(*) as user_count 
FROM users 
WHERE position IS NOT NULL
GROUP BY position 
ORDER BY position;

-- Step 2: Drop the existing constraint
-- =====================================================

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

-- Step 3: Add comprehensive position constraint with ALL existing positions
-- =====================================================

ALTER TABLE users ADD CONSTRAINT users_position_check 
CHECK (position IN (
    -- Original positions
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
    
    -- Additional positions that might exist
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
    'Junior Copy Writer',
    
    -- Legacy positions that might still exist
    'Copy Writing',
    'E-commerce Manager',
    
    -- Any other positions that might exist (add more if needed)
    'Manager',
    'Team Lead',
    'Supervisor',
    'Coordinator',
    'Specialist',
    'Assistant',
    'Trainee',
    'Intern'
));

-- Step 4: Verify the constraint was added successfully
-- =====================================================

SELECT '✅ Position constraint updated successfully!' as status;

-- Step 5: Test the constraint by checking if any users have invalid positions
-- =====================================================

SELECT 'Checking for any remaining invalid positions:' as check_info;
SELECT id, name, email, position 
FROM users 
WHERE position IS NULL OR position NOT IN (
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
    'Senior CRM Pharmacist',
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
    'Junior Copy Writer',
    'Copy Writing',
    'E-commerce Manager',
    'Manager',
    'Team Lead',
    'Supervisor',
    'Coordinator',
    'Specialist',
    'Assistant',
    'Trainee',
    'Intern'
);

-- Step 6: Final verification
-- =====================================================

SELECT '✅ Position constraint violation fixed!' as final_status;
SELECT '📋 Senior CRM Pharmacist role is now available for use' as next_step;
