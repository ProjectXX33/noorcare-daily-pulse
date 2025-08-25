-- =====================================================
-- Minimal SQL Script to Update 'Customer Service' to 'Junior CRM Specialist'
-- =====================================================

-- Start transaction
BEGIN;

-- 1. Update users table
UPDATE users 
SET position = 'Junior CRM Specialist' 
WHERE position = 'Customer Service';

-- 2. Fix users position constraint
DO $$ 
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'users_position_check') THEN
        ALTER TABLE users DROP CONSTRAINT users_position_check;
    END IF;
    
    -- Add new constraint with Junior CRM Specialist
    ALTER TABLE users ADD CONSTRAINT users_position_check 
    CHECK (position IN (
        'Junior CRM Specialist', 'Designer', 'Media Buyer', 'Content Creator', 
        'Web Developer', 'Warehouse Staff', 'Executive Director', 
        'Content & Creative Manager', 'Customer Retention Manager', 'IT Manager'
    ));
END $$;

-- Verification
SELECT 'Migration completed!' as status;
SELECT 'Users updated:' as table_name, COUNT(*) as count FROM users WHERE position = 'Junior CRM Specialist';

-- Commit transaction
COMMIT;
