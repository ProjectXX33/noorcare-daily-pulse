-- Add new users to the system
-- Note: These users need to be created in Supabase Auth first, then added to the users table

-- Add admin user: mohamed.salem1107@gmail.com
INSERT INTO users (
    id,
    username, 
    name,
    email,
    role,
    department,
    position,
    created_at,
    updated_at
) VALUES (
    '9bfe07eb-e36d-4582-82d9-ecbe215bfc8c',
    'mohamed.salem',
    'Mohamed Salem',
    'mohamed.salem1107@gmail.com',
    'admin',
    'Manager',
    'Web Developer',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    position = EXCLUDED.position,
    updated_at = CURRENT_TIMESTAMP;

-- Add Customer Service employee: dr.shrouq.alaa.noor1@gmail.com  
INSERT INTO users (
    id,
    username,
    name, 
    email,
    role,
    department,
    position,
    created_at,
    updated_at
) VALUES (
    'c4759acf-ba8e-44f1-9476-a2475719b0eb',
    'dr.shrouq.alaa',
    'Dr. Shrouq Alaa',
    'dr.shrouq.alaa.noor1@gmail.com',
    'employee',
    'Doctor',
    'Customer Service',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    position = EXCLUDED.position,
    updated_at = CURRENT_TIMESTAMP; 