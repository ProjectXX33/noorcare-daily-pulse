-- Fix Dr Walaa's role to content_creative_manager
-- This will allow her to edit events as a Content & Creative Manager

-- First, let's see Dr Walaa's current role and position
SELECT 
    'Current Dr Walaa Info:' as debug_step,
    id,
    name,
    email,
    role,
    position,
    department,
    team
FROM users 
WHERE name ILIKE '%walaa%' OR name ILIKE '%Dr%Walaa%';

-- Update Dr Walaa's role to content_creative_manager
UPDATE users 
SET 
    role = 'content_creative_manager',
    team = 'Content & Creative Department',
    updated_at = CURRENT_TIMESTAMP
WHERE name ILIKE '%walaa%' OR name ILIKE '%Dr%Walaa%';

-- Verify the update
SELECT 
    'Updated Dr Walaa Info:' as debug_step,
    id,
    name,
    email,
    role,
    position,
    department,
    team,
    updated_at
FROM users 
WHERE name ILIKE '%walaa%' OR name ILIKE '%Dr%Walaa%';

-- Also update any other Content & Creative Managers who might have the wrong role
UPDATE users 
SET 
    role = 'content_creative_manager',
    team = 'Content & Creative Department',
    updated_at = CURRENT_TIMESTAMP
WHERE position = 'Content & Creative Manager' 
  AND role != 'content_creative_manager';

-- Show all Content & Creative Managers after the fix
SELECT 
    'All Content & Creative Managers:' as debug_step,
    id,
    name,
    email,
    role,
    position,
    department,
    team
FROM users 
WHERE position = 'Content & Creative Manager' OR role = 'content_creative_manager'
ORDER BY name;
