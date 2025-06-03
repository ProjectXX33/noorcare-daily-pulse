-- Add Weekly Shift Assignments Table
-- This allows admins to assign Customer Service employees to day/night shifts for specific weeks

-- Create weekly_shift_assignments table
CREATE TABLE IF NOT EXISTS weekly_shift_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL, -- Monday of the week
    shift_type TEXT CHECK(shift_type IN ('day', 'night')) NOT NULL,
    assigned_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, week_start) -- One assignment per employee per week
);

-- Enable RLS
ALTER TABLE weekly_shift_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can view and manage all assignments
CREATE POLICY weekly_shift_assignments_admin_all ON weekly_shift_assignments 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Customer Service employees can view their own assignments
CREATE POLICY weekly_shift_assignments_employee_view ON weekly_shift_assignments 
FOR SELECT USING (
    employee_id = auth.uid() AND 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND position = 'Customer Service')
);

-- Insert sample data for current week
DO $$
DECLARE
    v_admin_id UUID;
    v_employee_id UUID;
    v_current_monday DATE;
BEGIN
    -- Get current Monday
    v_current_monday := DATE_TRUNC('week', CURRENT_DATE);
    
    -- Get admin and employee IDs
    SELECT id INTO v_admin_id FROM users WHERE role = 'admin' LIMIT 1;
    SELECT id INTO v_employee_id FROM users WHERE position = 'Customer Service' AND role = 'employee' LIMIT 1;
    
    IF v_admin_id IS NOT NULL AND v_employee_id IS NOT NULL THEN
        -- Insert sample assignment
        INSERT INTO weekly_shift_assignments (employee_id, week_start, shift_type, assigned_by)
        VALUES (v_employee_id, v_current_monday, 'day', v_admin_id)
        ON CONFLICT (employee_id, week_start) DO NOTHING;
        
        RAISE NOTICE 'Sample weekly assignment created for current week';
    END IF;
END $$;

-- Test the table
SELECT 'Weekly shift assignments:' as info;
SELECT 
    wsa.*,
    u.name as employee_name,
    assigned.name as assigned_by_name
FROM weekly_shift_assignments wsa
JOIN users u ON wsa.employee_id = u.id
JOIN users assigned ON wsa.assigned_by = assigned.id
ORDER BY wsa.week_start DESC, u.name; 