-- Update Database to Support Check-in/out and Shift Assignments for All Employee Positions
-- This script enables all employee positions to use check-in functionality and have shifts assigned

-- =====================================================
-- 1. UPDATE SHIFT ASSIGNMENTS RLS POLICIES
-- =====================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "shift_assignments_system_read" ON shift_assignments;
DROP POLICY IF EXISTS "shift_assignments_employee_view_own" ON shift_assignments;

-- Create updated policies that support all employee positions
CREATE POLICY "shift_assignments_system_read_all_employees" ON shift_assignments
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'employee'
    )
);

CREATE POLICY "shift_assignments_employee_view_own_all_positions" ON shift_assignments
FOR SELECT 
TO authenticated
USING (
    employee_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- =====================================================
-- 2. UPDATE SHIFTS TABLE CONSTRAINTS
-- =====================================================

-- Update shifts table to support all positions
DO $$
BEGIN
    -- Drop existing position constraint if it exists
    BEGIN
        ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_position_check;
    EXCEPTION
        WHEN undefined_object THEN NULL;
    END;
    
    -- Add new constraint supporting all employee positions
    ALTER TABLE shifts ADD CONSTRAINT shifts_position_check 
    CHECK (position IN ('Customer Service', 'Designer', 'Media Buyer', 'Copy Writing', 'Web Developer', 'Warehouse Staff'));
    
    RAISE NOTICE 'Shifts table position constraint updated to support all employee positions';
END $$;

-- =====================================================
-- 3. CREATE DEFAULT SHIFTS FOR ALL POSITIONS
-- =====================================================

-- Insert default shifts for all employee positions if they don't exist
INSERT INTO shifts (name, start_time, end_time, position, is_active) VALUES
    ('Day Shift', '09:00', '16:00', 'Copy Writing', true),
    ('Night Shift', '16:00', '00:00', 'Copy Writing', true),
    ('Day Shift', '09:00', '17:00', 'Media Buyer', true), 
    ('Night Shift', '17:00', '01:00', 'Media Buyer', true),
    ('Day Shift', '09:00', '17:00', 'Web Developer', true),
    ('Night Shift', '17:00', '01:00', 'Web Developer', true),
    ('Day Shift', '08:00', '16:00', 'Warehouse Staff', true),
    ('Night Shift', '16:00', '00:00', 'Warehouse Staff', true)
ON CONFLICT (name, position) DO NOTHING;

-- =====================================================
-- 4. UPDATE WEEKLY SHIFT ASSIGNMENTS POLICIES
-- =====================================================

-- Drop existing restrictive policies for weekly shift assignments
DROP POLICY IF EXISTS "weekly_shift_assignments_employee_view" ON weekly_shift_assignments;

-- Create updated policy for all employee positions
CREATE POLICY "weekly_shift_assignments_employee_view_all_positions" ON weekly_shift_assignments 
FOR SELECT USING (
    employee_id = auth.uid() AND 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'employee')
);

-- =====================================================
-- 5. VERIFY UPDATES
-- =====================================================

-- Verify shift assignments policies
SELECT 
    'shift_assignments' as table_name,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'shift_assignments'
ORDER BY policyname;

-- Verify shifts table constraint
SELECT 
    'shifts' as table_name,
    constraint_name,
    check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.constraint_table_usage ctu ON cc.constraint_name = ctu.constraint_name
WHERE ctu.table_name = 'shifts' 
AND cc.constraint_name LIKE '%position%';

-- Show available shifts by position
SELECT 
    position,
    COUNT(*) as shift_count,
    STRING_AGG(name, ', ') as available_shifts
FROM shifts 
WHERE is_active = true 
GROUP BY position 
ORDER BY position;

RAISE NOTICE 'Database updated successfully to support check-in/out and shift assignments for all employee positions';
RAISE NOTICE 'All employee positions can now: 1) Check-in/out, 2) Be assigned shifts, 3) View their shift assignments'; 