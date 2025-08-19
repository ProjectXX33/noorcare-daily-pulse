-- Add Manager Positions to Database Constraints
-- This updates the position constraint to include the new manager positions

DO $$
BEGIN
    -- Check if constraint exists before dropping
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_position_check' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_position_check;
        RAISE NOTICE 'Dropped existing users_position_check constraint';
    END IF;

    -- Add new position constraint that includes all manager positions
    ALTER TABLE users ADD CONSTRAINT users_position_check 
    CHECK (position IN (
        'Customer Service', 
        'Designer', 
        'Media Buyer', 
        'Copy Writing', 
        'Web Developer', 
        'Warehouse Staff',
        'Executive Director',
        'Content & Creative Manager',
        'Customer Retention Manager',
        'IT Manager'
    ));

    RAISE NOTICE 'Users table position constraint updated to include manager positions';
END $$;

-- Update existing users with manager roles to have corresponding positions (optional)
-- This helps align roles with positions for better organization

-- Update Content & Creative Managers
UPDATE users 
SET position = 'Content & Creative Manager' 
WHERE role = 'content_creative_manager' 
AND position NOT IN ('Content & Creative Manager');

-- Update Customer Retention Managers  
UPDATE users 
SET position = 'Customer Retention Manager' 
WHERE role = 'customer_retention_manager' 
AND position NOT IN ('Customer Retention Manager');

-- Update Digital Solution Managers to IT Manager position
UPDATE users 
SET position = 'IT Manager' 
WHERE role = 'digital_solution_manager' 
AND position NOT IN ('IT Manager');

-- Update admins to Executive Director position (optional)
UPDATE users 
SET position = 'Executive Director' 
WHERE role = 'admin' 
AND position NOT IN ('Executive Director');

-- Final notification
SELECT 'Manager positions have been successfully added to the database constraints!' as status;
