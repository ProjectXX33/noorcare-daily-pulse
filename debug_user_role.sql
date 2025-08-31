-- Debug script to check Dr Walaa's user role and position
-- This will help us understand why she can't edit events

-- Check all users with "Walaa" in their name
SELECT 
    id,
    name,
    email,
    role,
    position,
    department,
    team,
    created_at,
    updated_at
FROM users 
WHERE name ILIKE '%walaa%' OR name ILIKE '%Dr%Walaa%'
ORDER BY created_at DESC;

-- Check all users with content_creative_manager role
SELECT 
    id,
    name,
    email,
    role,
    position,
    department,
    team
FROM users 
WHERE role = 'content_creative_manager'
ORDER BY name;

-- Check all users with "Content & Creative Manager" position
SELECT 
    id,
    name,
    email,
    role,
    position,
    department,
    team
FROM users 
WHERE position = 'Content & Creative Manager'
ORDER BY name;

-- Check all users in Content & Creative Department
SELECT 
    id,
    name,
    email,
    role,
    position,
    department,
    team
FROM users 
WHERE team = 'Content & Creative Department' OR department ILIKE '%creative%'
ORDER BY name;

-- Show all unique roles in the database
SELECT DISTINCT role, COUNT(*) as count
FROM users 
GROUP BY role
ORDER BY role;

-- Show all unique positions in the database
SELECT DISTINCT position, COUNT(*) as count
FROM users 
GROUP BY position
ORDER BY position;

-- Show all unique teams in the database
SELECT DISTINCT team, COUNT(*) as count
FROM users 
WHERE team IS NOT NULL
GROUP BY team
ORDER BY team; 