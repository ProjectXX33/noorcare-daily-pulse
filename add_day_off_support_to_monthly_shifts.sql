-- Add proper day-off support to monthly_shifts table
-- This allows day-off records to be stored in monthly_shifts with NULL shift_id

-- First, drop the NOT NULL constraint on shift_id column if it exists
ALTER TABLE monthly_shifts 
ALTER COLUMN shift_id DROP NOT NULL;

-- Add is_day_off column to monthly_shifts table for easier querying
ALTER TABLE monthly_shifts 
ADD COLUMN IF NOT EXISTS is_day_off BOOLEAN DEFAULT FALSE;

-- Create a function to sync day-off records from shift_assignments to monthly_shifts
CREATE OR REPLACE FUNCTION sync_day_off_records() RETURNS VOID AS $$
BEGIN
    -- Insert day-off records from shift_assignments into monthly_shifts
    INSERT INTO monthly_shifts (
        user_id, 
        shift_id, 
        work_date, 
        regular_hours, 
        overtime_hours, 
        delay_minutes,
        is_day_off,
        created_at,
        updated_at
    )
    SELECT 
        sa.employee_id as user_id,
        NULL as shift_id,
        sa.work_date,
        0 as regular_hours,
        0 as overtime_hours,
        0 as delay_minutes,
        TRUE as is_day_off,
        CURRENT_TIMESTAMP as created_at,
        CURRENT_TIMESTAMP as updated_at
    FROM shift_assignments sa
    WHERE sa.is_day_off = TRUE
    AND NOT EXISTS (
        SELECT 1 FROM monthly_shifts ms 
        WHERE ms.user_id = sa.employee_id 
        AND ms.work_date = sa.work_date
    )
    -- Only sync recent day-off records (last 3 months)
    AND sa.work_date >= CURRENT_DATE - INTERVAL '3 months';

    -- Update existing monthly_shifts records to mark them as day-off
    UPDATE monthly_shifts 
    SET is_day_off = TRUE,
        shift_id = NULL,
        regular_hours = 0,
        overtime_hours = 0,
        delay_minutes = 0,
        updated_at = CURRENT_TIMESTAMP
    WHERE EXISTS (
        SELECT 1 FROM shift_assignments sa 
        WHERE sa.employee_id = monthly_shifts.user_id 
        AND sa.work_date = monthly_shifts.work_date 
        AND sa.is_day_off = TRUE
    )
    AND monthly_shifts.is_day_off = FALSE;

    RAISE NOTICE 'Day-off records synchronized successfully';
END;
$$ LANGUAGE plpgsql;

-- Run the sync function
SELECT sync_day_off_records();

-- Create a trigger to automatically create day-off records when shift assignments are made
CREATE OR REPLACE FUNCTION create_day_off_monthly_shift() RETURNS TRIGGER AS $$
BEGIN
    -- Only create monthly shift record if it's a day-off assignment
    IF NEW.is_day_off = TRUE THEN
        INSERT INTO monthly_shifts (
            user_id,
            shift_id,
            work_date,
            regular_hours,
            overtime_hours,
            delay_minutes,
            is_day_off,
            created_at,
            updated_at
        )
        VALUES (
            NEW.employee_id,
            NULL,
            NEW.work_date,
            0,
            0,
            0,
            TRUE,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (user_id, work_date) 
        DO UPDATE SET
            shift_id = NULL,
            is_day_off = TRUE,
            regular_hours = 0,
            overtime_hours = 0,
            delay_minutes = 0,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic day-off record creation
DROP TRIGGER IF EXISTS trigger_create_day_off_monthly_shift ON shift_assignments;
CREATE TRIGGER trigger_create_day_off_monthly_shift
    AFTER INSERT OR UPDATE ON shift_assignments
    FOR EACH ROW
    EXECUTE FUNCTION create_day_off_monthly_shift();

-- Add index for better performance on day-off queries
CREATE INDEX IF NOT EXISTS idx_monthly_shifts_is_day_off 
ON monthly_shifts(is_day_off, work_date) 
WHERE is_day_off = TRUE;

-- Add comment to explain the new column
COMMENT ON COLUMN monthly_shifts.is_day_off IS 'Indicates if this record represents a day off (shift_id will be NULL)';

-- Verify the changes
SELECT 'Monthly Shifts with Day Off Records:' as info;
SELECT 
    u.name as employee_name,
    ms.work_date,
    CASE 
        WHEN ms.is_day_off THEN 'Day Off' 
        ELSE s.name 
    END as shift_type,
    ms.regular_hours,
    ms.overtime_hours,
    ms.delay_minutes,
    ms.is_day_off
FROM monthly_shifts ms
JOIN users u ON ms.user_id = u.id
LEFT JOIN shifts s ON ms.shift_id = s.id
WHERE ms.work_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY ms.work_date DESC, u.name; 