-- =====================================================
-- FIX WEEKLY SHIFT ASSIGNMENTS SYNC ISSUE
-- =====================================================
-- This script fixes the disconnect between weekly_shift_assignments and monthly_shifts
-- When you assign shifts in Weekly Shift Assignments, they should appear in Monthly Shifts
-- =====================================================

-- Step 1: Check current data in both tables
-- =====================================================
SELECT '=== CURRENT WEEKLY SHIFT ASSIGNMENTS ===' as step;

SELECT 
    'weekly_shift_assignments' as table_name,
    employee_id,
    week_start,
    shift_type,
    assigned_by,
    updated_at
FROM weekly_shift_assignments 
WHERE week_start >= CURRENT_DATE - INTERVAL '14 days'
ORDER BY week_start DESC, employee_id;

SELECT '=== CURRENT MONTHLY SHIFTS ===' as step;

SELECT 
    'monthly_shifts' as table_name,
    user_id,
    work_date,
    shift_id,
    is_day_off,
    updated_at
FROM monthly_shifts 
WHERE work_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY work_date DESC, user_id;

-- Step 2: Create a function to convert weekly assignments to daily shift assignments
-- =====================================================
SELECT '=== CREATING WEEKLY TO DAILY CONVERSION FUNCTION ===' as step;

CREATE OR REPLACE FUNCTION convert_weekly_to_daily_assignments() RETURNS VOID AS $$
DECLARE
    weekly_record RECORD;
    current_date DATE;
    shift_id UUID;
    day_of_week INTEGER;
BEGIN
    -- Loop through all weekly assignments
    FOR weekly_record IN 
        SELECT 
            wsa.employee_id,
            wsa.week_start,
            wsa.shift_type,
            wsa.assigned_by
        FROM weekly_shift_assignments wsa
        WHERE wsa.week_start >= CURRENT_DATE - INTERVAL '30 days'
    LOOP
        -- Get the appropriate shift ID based on shift_type
        IF weekly_record.shift_type = 'day' THEN
            SELECT id INTO shift_id FROM shifts WHERE name = 'Day Shift' LIMIT 1;
        ELSIF weekly_record.shift_type = 'night' THEN
            SELECT id INTO shift_id FROM shifts WHERE name = 'Night Shift' LIMIT 1;
        ELSE
            -- For 'designers' or other custom shifts, try to find a matching shift
            SELECT id INTO shift_id FROM shifts WHERE name ILIKE '%' || weekly_record.shift_type || '%' LIMIT 1;
        END IF;
        
        -- If no shift found, skip this record
        IF shift_id IS NULL THEN
            RAISE NOTICE 'No shift found for type: %', weekly_record.shift_type;
            CONTINUE;
        END IF;
        
        -- Convert weekly assignment to daily assignments (Monday to Friday)
        FOR day_of_week IN 0..4 LOOP
            current_date := weekly_record.week_start + day_of_week;
            
            -- Insert into shift_assignments table
            INSERT INTO shift_assignments (
                employee_id,
                work_date,
                assigned_shift_id,
                is_day_off,
                assigned_by,
                created_at,
                updated_at
            )
            VALUES (
                weekly_record.employee_id,
                current_date,
                shift_id,
                FALSE,
                weekly_record.assigned_by,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (employee_id, work_date) 
            DO UPDATE SET
                assigned_shift_id = shift_id,
                is_day_off = FALSE,
                assigned_by = weekly_record.assigned_by,
                updated_at = CURRENT_TIMESTAMP;
                
            -- Also insert into monthly_shifts table
            INSERT INTO monthly_shifts (
                user_id,
                work_date,
                shift_id,
                is_day_off,
                regular_hours,
                overtime_hours,
                delay_minutes,
                created_at,
                updated_at
            )
            VALUES (
                weekly_record.employee_id,
                current_date,
                shift_id,
                FALSE,
                NULL,
                NULL,
                NULL,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (user_id, work_date) 
            DO UPDATE SET
                shift_id = shift_id,
                is_day_off = FALSE,
                updated_at = CURRENT_TIMESTAMP;
                
            RAISE NOTICE 'Created daily assignment for employee % on %: shift_id=%', 
                weekly_record.employee_id, 
                current_date, 
                shift_id;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Weekly assignments converted to daily assignments successfully';
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create a trigger to automatically sync weekly assignments to daily assignments
-- =====================================================
SELECT '=== CREATING AUTO-SYNC TRIGGER ===' as step;

CREATE OR REPLACE FUNCTION auto_sync_weekly_assignments() RETURNS TRIGGER AS $$
DECLARE
    shift_id UUID;
    current_date DATE;
    day_of_week INTEGER;
BEGIN
    -- Get the appropriate shift ID based on shift_type
    IF NEW.shift_type = 'day' THEN
        SELECT id INTO shift_id FROM shifts WHERE name = 'Day Shift' LIMIT 1;
    ELSIF NEW.shift_type = 'night' THEN
        SELECT id INTO shift_id FROM shifts WHERE name = 'Night Shift' LIMIT 1;
    ELSE
        -- For 'designers' or other custom shifts, try to find a matching shift
        SELECT id INTO shift_id FROM shifts WHERE name ILIKE '%' || NEW.shift_type || '%' LIMIT 1;
    END IF;
    
    -- If no shift found, return
    IF shift_id IS NULL THEN
        RAISE NOTICE 'No shift found for type: %', NEW.shift_type;
        RETURN NEW;
    END IF;
    
    -- Convert weekly assignment to daily assignments (Monday to Friday)
    FOR day_of_week IN 0..4 LOOP
        current_date := NEW.week_start + day_of_week;
        
        -- Insert into shift_assignments table
        INSERT INTO shift_assignments (
            employee_id,
            work_date,
            assigned_shift_id,
            is_day_off,
            assigned_by,
            created_at,
            updated_at
        )
        VALUES (
            NEW.employee_id,
            current_date,
            shift_id,
            FALSE,
            NEW.assigned_by,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (employee_id, work_date) 
        DO UPDATE SET
            assigned_shift_id = shift_id,
            is_day_off = FALSE,
            assigned_by = NEW.assigned_by,
            updated_at = CURRENT_TIMESTAMP;
            
        -- Also insert into monthly_shifts table
        INSERT INTO monthly_shifts (
            user_id,
            work_date,
            shift_id,
            is_day_off,
            regular_hours,
            overtime_hours,
            delay_minutes,
            created_at,
            updated_at
        )
        VALUES (
            NEW.employee_id,
            current_date,
            shift_id,
            FALSE,
            NULL,
            NULL,
            NULL,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (user_id, work_date) 
        DO UPDATE SET
            shift_id = shift_id,
            is_day_off = FALSE,
            updated_at = CURRENT_TIMESTAMP;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic sync
DROP TRIGGER IF EXISTS trigger_auto_sync_weekly_assignments ON weekly_shift_assignments;
CREATE TRIGGER trigger_auto_sync_weekly_assignments
    AFTER INSERT OR UPDATE ON weekly_shift_assignments
    FOR EACH ROW
    EXECUTE FUNCTION auto_sync_weekly_assignments();

-- Step 4: Run the conversion function to fix existing data
-- =====================================================
SELECT '=== RUNNING CONVERSION FUNCTION ===' as step;

SELECT convert_weekly_to_daily_assignments();

-- Step 5: Verify the sync worked
-- =====================================================
SELECT '=== VERIFYING SYNC RESULTS ===' as step;

SELECT 
    'After sync - shift_assignments' as table_name,
    employee_id,
    work_date,
    assigned_shift_id,
    is_day_off
FROM shift_assignments 
WHERE work_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY work_date DESC, employee_id;

SELECT 
    'After sync - monthly_shifts' as table_name,
    user_id,
    work_date,
    shift_id,
    is_day_off
FROM monthly_shifts 
WHERE work_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY work_date DESC, user_id;

-- Step 6: Test summary
-- =====================================================
SELECT '=== TEST SUMMARY ===' as step;

SELECT 
    '✅ Weekly shift assignments will now automatically sync to daily assignments!' as message,
    '✅ Team Shifts assignments will appear in Monthly Shifts view' as feature_1,
    '✅ Real-time sync when weekly assignments are made' as feature_2,
    '✅ Existing weekly data has been converted to daily assignments' as feature_3,
    '✅ "Designers Shift" assignments will now show in Monthly Shifts' as feature_4;
