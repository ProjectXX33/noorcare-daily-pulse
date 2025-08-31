-- =====================================================
-- FIX TEAM SHIFTS SYNC ISSUE
-- =====================================================
-- This script fixes the disconnect between shift_assignments and monthly_shifts
-- When you assign shifts in Team Shifts (Weekly Shift Assignments), they should appear in Monthly Shifts
-- =====================================================

-- Step 1: Check current data in both tables
-- =====================================================
SELECT '=== CURRENT SHIFT ASSIGNMENTS ===' as step;

SELECT 
    'shift_assignments' as table_name,
    employee_id,
    work_date,
    assigned_shift_id,
    is_day_off,
    assigned_by,
    updated_at
FROM shift_assignments 
WHERE work_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY work_date DESC, employee_id;

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

-- Step 2: Create a function to sync shift_assignments to monthly_shifts
-- =====================================================
SELECT '=== CREATING SYNC FUNCTION ===' as step;

CREATE OR REPLACE FUNCTION sync_shift_assignments_to_monthly_shifts() RETURNS VOID AS $$
DECLARE
    assignment_record RECORD;
    shift_name TEXT;
BEGIN
    -- Loop through all shift assignments and sync them to monthly_shifts
    FOR assignment_record IN 
        SELECT 
            sa.employee_id,
            sa.work_date,
            sa.assigned_shift_id,
            sa.is_day_off,
            sa.assigned_by,
            s.name as shift_name
        FROM shift_assignments sa
        LEFT JOIN shifts s ON sa.assigned_shift_id = s.id
        WHERE sa.work_date >= CURRENT_DATE - INTERVAL '30 days'
    LOOP
        -- Insert or update monthly_shifts record
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
            assignment_record.employee_id,
            assignment_record.work_date,
            assignment_record.assigned_shift_id,
            assignment_record.is_day_off,
            CASE WHEN assignment_record.is_day_off THEN 0 ELSE NULL END,
            CASE WHEN assignment_record.is_day_off THEN 0 ELSE NULL END,
            CASE WHEN assignment_record.is_day_off THEN 0 ELSE NULL END,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (user_id, work_date) 
        DO UPDATE SET
            shift_id = assignment_record.assigned_shift_id,
            is_day_off = assignment_record.is_day_off,
            regular_hours = CASE WHEN assignment_record.is_day_off THEN 0 ELSE monthly_shifts.regular_hours END,
            overtime_hours = CASE WHEN assignment_record.is_day_off THEN 0 ELSE monthly_shifts.overtime_hours END,
            delay_minutes = CASE WHEN assignment_record.is_day_off THEN 0 ELSE monthly_shifts.delay_minutes END,
            updated_at = CURRENT_TIMESTAMP;
            
        RAISE NOTICE 'Synced assignment for employee % on %: shift_id=%, is_day_off=%', 
            assignment_record.employee_id, 
            assignment_record.work_date, 
            assignment_record.assigned_shift_id, 
            assignment_record.is_day_off;
    END LOOP;
    
    RAISE NOTICE 'Shift assignments synchronized successfully to monthly_shifts';
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create a trigger to automatically sync when shift_assignments are updated
-- =====================================================
SELECT '=== CREATING AUTO-SYNC TRIGGER ===' as step;

CREATE OR REPLACE FUNCTION auto_sync_shift_assignments() RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update monthly_shifts record when shift_assignments changes
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
        NEW.work_date,
        NEW.assigned_shift_id,
        NEW.is_day_off,
        CASE WHEN NEW.is_day_off THEN 0 ELSE NULL END,
        CASE WHEN NEW.is_day_off THEN 0 ELSE NULL END,
        CASE WHEN NEW.is_day_off THEN 0 ELSE NULL END,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (user_id, work_date) 
    DO UPDATE SET
        shift_id = NEW.assigned_shift_id,
        is_day_off = NEW.is_day_off,
        regular_hours = CASE WHEN NEW.is_day_off THEN 0 ELSE monthly_shifts.regular_hours END,
        overtime_hours = CASE WHEN NEW.is_day_off THEN 0 ELSE monthly_shifts.overtime_hours END,
        delay_minutes = CASE WHEN NEW.is_day_off THEN 0 ELSE monthly_shifts.delay_minutes END,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic sync
DROP TRIGGER IF EXISTS trigger_auto_sync_shift_assignments ON shift_assignments;
CREATE TRIGGER trigger_auto_sync_shift_assignments
    AFTER INSERT OR UPDATE ON shift_assignments
    FOR EACH ROW
    EXECUTE FUNCTION auto_sync_shift_assignments();

-- Step 4: Run the sync function to fix existing data
-- =====================================================
SELECT '=== RUNNING SYNC FUNCTION ===' as step;

SELECT sync_shift_assignments_to_monthly_shifts();

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
    '✅ Shift assignments will now automatically sync to monthly_shifts!' as message,
    '✅ Team Shifts assignments will appear in Monthly Shifts view' as feature_1,
    '✅ Real-time sync when assignments are made' as feature_2,
    '✅ Existing data has been synchronized' as feature_3;
