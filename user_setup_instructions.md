# User Setup Instructions

## Method 1: Users Sign Up First (Recommended)

### Step 1: Have users create accounts
1. Ask Mohamed Salem to sign up at your login page using: `mohamed.salem1107@gmail.com`
2. Ask Dr. Shrouq Alaa to sign up using: `dr.shrouq.alaa.noor1@gmail.com`

### Step 2: Update their roles after signup
After they sign up, run this SQL to update their roles:

```sql
-- Update Mohamed Salem to admin
UPDATE users 
SET 
    role = 'admin',
    department = 'Manager',
    position = 'Web Developer',
    name = 'Mohamed Salem',
    username = 'mohamed.salem',
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'mohamed.salem1107@gmail.com';

-- Update Dr. Shrouq Alaa to Customer Service
UPDATE users 
SET 
    role = 'employee',
    department = 'Doctor', 
    position = 'Customer Service',
    name = 'Dr. Shrouq Alaa',
    username = 'dr.shrouq.alaa',
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'dr.shrouq.alaa.noor1@gmail.com';
```

## Method 2: Admin Creates Auth Users First

If you have access to Supabase dashboard:

1. Go to Authentication → Users in Supabase dashboard
2. Click "Add user" for each email
3. Then run the original SQL from add_users.sql

## Method 3: Use Supabase Admin API (Advanced)

You can also create auth users programmatically, but Method 1 is easier and more secure. 