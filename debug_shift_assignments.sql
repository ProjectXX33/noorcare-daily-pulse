-- Debug queries for shift assignments issues

-- 1. Check if shift_assignments table exists and its structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'shift_assignments' 
ORDER BY ordinal_position;

-- 2. Check existing shift assignments
SELECT 
    sa.*,
    u.name as employee_name,
    s.name as shift_name
FROM shift_assignments sa
LEFT JOIN users u ON sa.employee_id = u.id
LEFT JOIN shifts s ON sa.assigned_shift_id = s.id
ORDER BY sa.work_date DESC
LIMIT 10;

-- 3. Check if there are any RLS issues
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'shift_assignments';

-- 4. Check users with Customer Service position
SELECT id, name, email, position, role 
FROM users 
WHERE position = 'Customer Service';

-- 5. Check available shifts
SELECT id, name, start_time, end_time, position, is_active 
FROM shifts 
WHERE position = 'Customer Service' AND is_active = true;

-- 6. Test insert (this should work)
-- Uncomment and modify the IDs as needed:
/*
INSERT INTO shift_assignments (employee_id, work_date, assigned_shift_id, is_day_off, assigned_by)
VALUES (
    '[replace-with-actual-employee-id]',
    CURRENT_DATE + 1,
    '[replace-with-actual-shift-id]',
    false,
    '[replace-with-actual-admin-id]'
)
ON CONFLICT (employee_id, work_date) 
DO UPDATE SET
    assigned_shift_id = EXCLUDED.assigned_shift_id,
    is_day_off = EXCLUDED.is_day_off,
    assigned_by = EXCLUDED.assigned_by,
    updated_at = CURRENT_TIMESTAMP;
*/ 