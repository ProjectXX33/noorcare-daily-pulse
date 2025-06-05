-- Updated Designer Shift Support
-- This script removes Designer-specific shifts and allows Designers to use regular Day/Night shifts

-- 1. Update the shifts table to support both positions for existing shifts
ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_position_check;

-- Remove the position constraint entirely - shifts can be used by any position
-- This allows both Customer Service and Designer to use Day Shift and Night Shift

-- 2. Handle existing references before deleting Designer Day Shift
DO $$ 
DECLARE
    v_designer_shift_id UUID;
    v_day_shift_id UUID;
    v_night_shift_id UUID;
BEGIN
    -- Get shift IDs
    SELECT id INTO v_designer_shift_id FROM shifts WHERE name = 'Designer Day Shift' AND position = 'Designer' LIMIT 1;
    SELECT id INTO v_day_shift_id FROM shifts WHERE name = 'Day Shift' LIMIT 1;
    SELECT id INTO v_night_shift_id FROM shifts WHERE name = 'Night Shift' LIMIT 1;
    
    IF v_designer_shift_id IS NOT NULL AND v_day_shift_id IS NOT NULL THEN
        RAISE NOTICE 'Found Designer Day Shift: %, updating references...', v_designer_shift_id;
        
        -- Update monthly_shifts records to use regular Day Shift instead
        UPDATE monthly_shifts 
        SET shift_id = v_day_shift_id,
            updated_at = CURRENT_TIMESTAMP
        WHERE shift_id = v_designer_shift_id;
        
        RAISE NOTICE 'Updated % monthly_shifts records', (SELECT COUNT(*) FROM monthly_shifts WHERE shift_id = v_day_shift_id);
        
        -- Update shift_assignments records to use regular Day Shift instead
        UPDATE shift_assignments 
        SET assigned_shift_id = v_day_shift_id,
            updated_at = CURRENT_TIMESTAMP
        WHERE assigned_shift_id = v_designer_shift_id;
        
        RAISE NOTICE 'Updated % shift_assignments records', (SELECT COUNT(*) FROM shift_assignments WHERE assigned_shift_id = v_day_shift_id);
        
        -- Update performance_tracking records if the table exists
        BEGIN
            UPDATE performance_tracking 
            SET shift_id = v_day_shift_id
            WHERE shift_id = v_designer_shift_id;
            RAISE NOTICE 'Updated performance_tracking records';
        EXCEPTION 
            WHEN undefined_table THEN
                RAISE NOTICE 'performance_tracking table does not exist, skipping...';
        END;
        
    ELSE
        RAISE NOTICE 'Designer Day Shift not found or Day Shift not available';
    END IF;
END $$;

-- 3. Now safely remove the Designer Day Shift
DELETE FROM shifts WHERE name = 'Designer Day Shift' AND position = 'Designer';

-- 4. Update existing Day Shift and Night Shift to be position-agnostic
UPDATE shifts 
SET position = 'Customer Service' 
WHERE name IN ('Day Shift', 'Night Shift') AND position IS NOT NULL;

-- 5. Update shift assignments for Designer employees to use regular shifts
DO $$
DECLARE
    v_admin_id UUID;
    v_day_shift_id UUID;
    v_night_shift_id UUID;
    v_current_date DATE := CURRENT_DATE;
    designer_record RECORD;
    i INTEGER;
BEGIN
    -- Get admin and shift IDs
    SELECT id INTO v_admin_id FROM users WHERE role = 'admin' LIMIT 1;
    SELECT id INTO v_day_shift_id FROM shifts WHERE name = 'Day Shift' LIMIT 1;
    SELECT id INTO v_night_shift_id FROM shifts WHERE name = 'Night Shift' LIMIT 1;
    
    IF v_admin_id IS NOT NULL AND v_day_shift_id IS NOT NULL THEN
        -- Loop through all Designer employees
        FOR designer_record IN 
            SELECT id FROM users WHERE position = 'Designer' AND role = 'employee'
        LOOP
            -- Assign shifts for next 14 days
            FOR i IN 0..13 LOOP
                INSERT INTO shift_assignments (employee_id, work_date, assigned_shift_id, is_day_off, assigned_by)
                VALUES (
                    designer_record.id, 
                    v_current_date + i,
                    CASE 
                        WHEN (i % 7) = 5 THEN NULL -- Saturday off
                        WHEN (i % 7) = 6 THEN NULL -- Sunday off
                        WHEN i % 2 = 0 THEN v_day_shift_id -- Alternate day/night shifts
                        ELSE COALESCE(v_night_shift_id, v_day_shift_id) -- Use night shift if available, otherwise day
                    END,
                    CASE WHEN (i % 7) IN (5, 6) THEN TRUE ELSE FALSE END, -- Weekend off
                    v_admin_id
                )
                ON CONFLICT (employee_id, work_date) 
                DO UPDATE SET
                    assigned_shift_id = EXCLUDED.assigned_shift_id,
                    is_day_off = EXCLUDED.is_day_off,
                    assigned_by = EXCLUDED.assigned_by,
                    updated_at = CURRENT_TIMESTAMP;
            END LOOP;
        END LOOP;
        
        RAISE NOTICE 'Designer shift assignments updated to use regular Day/Night shifts';
    END IF;
END $$;

-- 6. Show all shifts for verification
SELECT 'Updated shifts system - Designers now use regular Day/Night shifts!' as result;

-- Show current shifts
SELECT 
    name,
    start_time,
    end_time,
    position,
    is_active,
    'Available for both Customer Service and Designer' as usage
FROM shifts
WHERE name IN ('Day Shift', 'Night Shift')
ORDER BY start_time;

-- Show summary of changes
SELECT 
    'Migration Summary' as info,
    (SELECT COUNT(*) FROM monthly_shifts ms JOIN shifts s ON ms.shift_id = s.id WHERE s.name = 'Day Shift') as monthly_shifts_using_day_shift,
    (SELECT COUNT(*) FROM shift_assignments sa JOIN shifts s ON sa.assigned_shift_id = s.id WHERE s.name = 'Day Shift') as assignments_using_day_shift,
    (SELECT COUNT(*) FROM shifts WHERE name = 'Designer Day Shift') as designer_day_shifts_remaining; 