-- Create sample shift assignments and test data for performance dashboard

-- 1. Get current user IDs and create shift assignments
DO $$
DECLARE
    v_admin_id UUID;
    v_employee_id UUID;
    v_day_shift_id UUID;
    v_night_shift_id UUID;
    v_current_date DATE := CURRENT_DATE;
    v_work_date DATE;
    i INTEGER;
BEGIN
    -- Get required IDs
    SELECT id INTO v_admin_id FROM users WHERE role = 'admin' LIMIT 1;
    SELECT id INTO v_employee_id FROM users WHERE email = 'dr.shrouq.alaa.noor1@gmail.com' LIMIT 1;
    SELECT id INTO v_day_shift_id FROM shifts WHERE name = 'Day Shift' AND position = 'Customer Service' LIMIT 1;
    SELECT id INTO v_night_shift_id FROM shifts WHERE name = 'Night Shift' AND position = 'Customer Service' LIMIT 1;
    
    -- Check if we have all required data
    IF v_admin_id IS NULL THEN
        RAISE NOTICE 'Warning: No admin user found';
        RETURN;
    END IF;
    
    IF v_employee_id IS NULL THEN
        RAISE NOTICE 'Warning: No employee found with email dr.shrouq.alaa.noor1@gmail.com';
        RETURN;
    END IF;
    
    IF v_day_shift_id IS NULL OR v_night_shift_id IS NULL THEN
        RAISE NOTICE 'Warning: Day Shift or Night Shift not found';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Creating shift assignments for user: %', v_employee_id;
    
    -- 2. Create shift assignments for the past week and next week (14 days total)
    FOR i IN -7..7 LOOP
        v_work_date := v_current_date + i;
        
        INSERT INTO shift_assignments (employee_id, work_date, assigned_shift_id, is_day_off, assigned_by)
        VALUES (
            v_employee_id,
            v_work_date,
            CASE 
                WHEN EXTRACT(dow FROM v_work_date) IN (0, 6) THEN NULL -- Weekend off
                WHEN EXTRACT(dow FROM v_work_date) IN (1, 3, 5) THEN v_day_shift_id -- Mon, Wed, Fri = Day shift
                ELSE v_night_shift_id -- Tue, Thu = Night shift
            END,
            CASE 
                WHEN EXTRACT(dow FROM v_work_date) IN (0, 6) THEN TRUE -- Weekend off
                ELSE FALSE 
            END,
            v_admin_id
        )
        ON CONFLICT (employee_id, work_date) 
        DO UPDATE SET
            assigned_shift_id = EXCLUDED.assigned_shift_id,
            is_day_off = EXCLUDED.is_day_off,
            assigned_by = EXCLUDED.assigned_by,
            updated_at = CURRENT_TIMESTAMP;
    END LOOP;
    
    RAISE NOTICE 'Shift assignments created successfully';
    
    -- 3. Create sample performance tracking data for working days in current month
    FOR v_work_date IN 
        SELECT generate_series(
            DATE_TRUNC('month', CURRENT_DATE),
            CURRENT_DATE - INTERVAL '1 day',
            INTERVAL '1 day'
        )::date
    LOOP
        -- Skip weekends
        IF EXTRACT(dow FROM v_work_date) NOT IN (0, 6) THEN
            INSERT INTO performance_tracking (
                employee_id, 
                work_date, 
                shift_id, 
                scheduled_start_time, 
                actual_check_in_time, 
                actual_check_out_time,
                delay_minutes,
                total_work_minutes,
                regular_hours,
                overtime_hours,
                performance_score
            )
            VALUES (
                v_employee_id,
                v_work_date,
                CASE 
                    WHEN EXTRACT(dow FROM v_work_date) IN (1, 3, 5) THEN v_day_shift_id
                    ELSE v_night_shift_id
                END,
                CASE 
                    WHEN EXTRACT(dow FROM v_work_date) IN (1, 3, 5) THEN '09:00:00'::time
                    ELSE '16:00:00'::time
                END,
                v_work_date + CASE 
                    WHEN EXTRACT(dow FROM v_work_date) IN (1, 3, 5) THEN 
                        '09:00:00'::time + (random() * INTERVAL '30 minutes')
                    ELSE 
                        '16:00:00'::time + (random() * INTERVAL '20 minutes')
                END,
                v_work_date + CASE 
                    WHEN EXTRACT(dow FROM v_work_date) IN (1, 3, 5) THEN 
                        '17:00:00'::time + (random() * INTERVAL '2 hours')
                    ELSE 
                        '00:00:00'::time + INTERVAL '1 day' + (random() * INTERVAL '1 hour')
                END,
                (random() * 30)::integer, -- Random delay 0-30 min
                (480 + (random() * 120))::integer, -- 8-10 hours of work
                (8.0 + (random() * 2))::numeric(4,2), -- 8-10 regular hours
                GREATEST(0, (random() * 2))::numeric(4,2), -- 0-2 overtime hours
                (80 + (random() * 20))::numeric(5,2) -- Score 80-100
            )
            ON CONFLICT (employee_id, work_date) DO NOTHING;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Performance tracking data created successfully';
    
    -- 4. Update the monthly performance summary
    PERFORM update_performance_summary(v_employee_id, TO_CHAR(CURRENT_DATE, 'YYYY-MM'));
    
    RAISE NOTICE 'Monthly performance summary updated';
    
END $$;

-- 5. Verify the data was created
SELECT 'Sample data creation completed!' as result;

-- 6. Show current shift assignments
SELECT 
    'Current shift assignments:' as info,
    sa.work_date,
    u.name as employee,
    COALESCE(s.name, 'Day Off') as shift,
    sa.is_day_off
FROM shift_assignments sa
JOIN users u ON sa.employee_id = u.id
LEFT JOIN shifts s ON sa.assigned_shift_id = s.id
WHERE sa.work_date BETWEEN CURRENT_DATE - INTERVAL '3 days' AND CURRENT_DATE + INTERVAL '3 days'
  AND u.email = 'dr.shrouq.alaa.noor1@gmail.com'
ORDER BY sa.work_date;

-- 7. Show performance dashboard data
SELECT 
    'Performance dashboard data:' as info,
    employee_name,
    month_year,
    total_working_days,
    total_delay_hours,
    total_overtime_hours,
    average_performance_score,
    performance_status
FROM admin_performance_dashboard
WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM'); 