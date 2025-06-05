-- Quick Fix: Assign Shift for Today
-- This will enable shift tracking for the current user

DO $$
DECLARE
    v_user_id UUID;
    v_admin_id UUID;
    v_day_shift_id UUID;
    v_today DATE := CURRENT_DATE;
    v_user_email TEXT := 'dr.shrouq.alaa.noor1@gmail.com'; -- Replace with actual user email
    rec RECORD; -- Declare record variable for loops
BEGIN
    -- Get user ID
    SELECT id INTO v_user_id 
    FROM users 
    WHERE email = v_user_email 
    AND position IN ('Customer Service', 'Designer')
    LIMIT 1;
    
    -- Get admin ID
    SELECT id INTO v_admin_id 
    FROM users 
    WHERE role = 'admin' 
    LIMIT 1;
    
    -- Get Day Shift ID
    SELECT id INTO v_day_shift_id 
    FROM shifts 
    WHERE name = 'Day Shift' 
    AND position IN ('Customer Service', 'Designer')
    LIMIT 1;
    
    -- Check if we have all required IDs
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User not found with email: %', v_user_email;
        RAISE NOTICE 'Available users:';
        FOR rec IN SELECT email, name, position FROM users WHERE position IN ('Customer Service', 'Designer') LOOP
            RAISE NOTICE '  - %: % (%)', rec.email, rec.name, rec.position;
        END LOOP;
        RETURN;
    END IF;
    
    IF v_admin_id IS NULL THEN
        RAISE NOTICE 'No admin user found';
        RETURN;
    END IF;
    
    IF v_day_shift_id IS NULL THEN
        RAISE NOTICE 'Day Shift not found. Available shifts:';
        FOR rec IN SELECT name, start_time, end_time, position FROM shifts LOOP
            RAISE NOTICE '  - %: % - % (%)', rec.name, rec.start_time, rec.end_time, rec.position;
        END LOOP;
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found user: % (ID: %)', v_user_email, v_user_id;
    RAISE NOTICE 'Found admin: %', v_admin_id;
    RAISE NOTICE 'Found Day Shift: %', v_day_shift_id;
    
    -- Assign shift for today
    INSERT INTO shift_assignments (
        employee_id, 
        work_date, 
        assigned_shift_id, 
        is_day_off, 
        assigned_by
    ) VALUES (
        v_user_id,
        v_today,
        v_day_shift_id,
        FALSE,
        v_admin_id
    )
    ON CONFLICT (employee_id, work_date) 
    DO UPDATE SET
        assigned_shift_id = v_day_shift_id,
        is_day_off = FALSE,
        assigned_by = v_admin_id,
        updated_at = CURRENT_TIMESTAMP;
    
    RAISE NOTICE 'SUCCESS: Shift assigned for % on %', v_user_email, v_today;
    RAISE NOTICE 'Shift tracking should now be available!';
    
END $$;

-- Verify the assignment was created
SELECT 
    'VERIFICATION:' as status,
    u.email,
    u.name,
    sa.work_date,
    s.name as shift_name,
    s.start_time,
    s.end_time,
    sa.is_day_off
FROM shift_assignments sa
JOIN users u ON sa.employee_id = u.id
JOIN shifts s ON sa.assigned_shift_id = s.id
WHERE sa.work_date = CURRENT_DATE
ORDER BY u.name;

-- Show instructions
SELECT 
    'NEXT STEPS:' as instruction,
    '1. Check-in/check-out should now work with shift tracking' as step1,
    '2. Go to Admin → Shift Management to assign more shifts' as step2,
    '3. Run the debug script again to verify everything works' as step3; 