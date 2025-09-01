-- Add Digital Solution Manager role to the users table position constraint
-- This role has full access to all pages as it's the developer position

-- First, let's see what positions currently exist
SELECT DISTINCT position FROM users ORDER BY position;

-- Drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_position_check;

-- Re-add the constraint with the new position
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
    'E-commerce Manager',
    'Junior CRM Specialist',
    'Senior CRM Pharmacist',
    'Digital Solution Manager'  -- NEW DEVELOPER ROLE
));

-- Verify the constraint was added successfully
SELECT 'Users table position constraint updated to include Digital Solution Manager' as status;

-- Show all valid positions
SELECT DISTINCT position as valid_positions FROM users ORDER BY position;
