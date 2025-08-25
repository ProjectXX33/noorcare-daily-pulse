-- Add test Content Creator user for demonstration
-- This will help test the Content Creative Dashboard

-- First, check if test user already exists
DO $$
BEGIN
    -- Check if test user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'content.creator@noorcare.com') THEN
        -- Insert test Content Creator user
        INSERT INTO users (
            id,
            username,
            name,
            email,
            role,
            department,
            position,
            team,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'content_creator_test',
            'Dr. Shrouq Alaa',
            'content.creator@noorcare.com',
            'employee',
            'Creative',
            'Content Creator',
            'Content & Creative Department',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Test Content Creator user created successfully';
    ELSE
        RAISE NOTICE 'Test Content Creator user already exists';
    END IF;
END $$;

-- Verify the user was created
SELECT 'Test Content Creator User:' as info;
SELECT id, name, email, role, department, position, team
FROM users 
WHERE email = 'content.creator@noorcare.com';

-- Add a test check-in for today (if user exists)
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get the test user ID
    SELECT id INTO test_user_id 
    FROM users 
    WHERE email = 'content.creator@noorcare.com';
    
    IF test_user_id IS NOT NULL THEN
        -- Check if there's already a check-in for today
        IF NOT EXISTS (
            SELECT 1 FROM check_ins 
            WHERE user_id = test_user_id 
            AND DATE(timestamp) = CURRENT_DATE
        ) THEN
            -- Insert test check-in for today
            INSERT INTO check_ins (
                id,
                user_id,
                timestamp,
                created_at
            ) VALUES (
                gen_random_uuid(),
                test_user_id,
                NOW(),
                NOW()
            );
            
            RAISE NOTICE 'Test check-in created for today';
        ELSE
            RAISE NOTICE 'Test check-in already exists for today';
        END IF;
    END IF;
END $$;

-- Verify the check-in was created
SELECT 'Test Check-in for Today:' as info;
SELECT 
    ci.id,
    ci.user_id,
    u.name as user_name,
    u.position,
    ci.timestamp,
    ci.checkout_time,
    ci.check_out_time
FROM check_ins ci
JOIN users u ON ci.user_id = u.id
WHERE u.email = 'content.creator@noorcare.com'
  AND DATE(ci.timestamp) = CURRENT_DATE;
