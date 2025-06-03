-- Update existing users after they sign up
-- Run this AFTER the users have signed up through your normal signup process

-- Update Mohamed Salem to admin role
UPDATE users 
SET 
    role = 'admin',
    department = 'Manager',
    position = 'Web Developer',
    name = 'Mohamed Salem',
    username = 'mohamed.salem',
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'mohamed.salem1107@gmail.com';

-- Update Dr. Shrouq Alaa to Customer Service employee
UPDATE users 
SET 
    role = 'employee',
    department = 'Doctor', 
    position = 'Customer Service',
    name = 'Dr. Shrouq Alaa',
    username = 'dr.shrouq.alaa',
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'dr.shrouq.alaa.noor1@gmail.com';

-- Verify the updates
SELECT id, username, name, email, role, department, position 
FROM users 
WHERE email IN ('mohamed.salem1107@gmail.com', 'dr.shrouq.alaa.noor1@gmail.com');

-- Verify the update
SELECT id, name, email, role, position FROM users 
WHERE email = 'dr.shrouq.alaa.noor1@gmail.com'; 