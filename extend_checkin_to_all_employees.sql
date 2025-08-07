-- Extend Check-in/Check-out functionality to all employee positions
-- This script updates the shifts table to support all employee positions and creates default shifts

-- 1. Update the shifts table constraint to support all employee positions
ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_position_check;
ALTER TABLE shifts ADD CONSTRAINT shifts_position_check 
CHECK (position IN ('Customer Service', 'Designer', 'Media Buyer', 'Copy Writing', 'Web Developer'));

-- 2. Create default shifts for all employee positions
-- Standard office hours for most positions (9 AM - 6 PM)
INSERT INTO shifts (name, start_time, end_time, position)
VALUES 
    -- Copy Writing shifts (standard office hours)
    ('Copy Writing Day Shift', '09:00:00', '18:00:00', 'Copy Writing'),
    
    -- Media Buyer shifts (flexible hours for campaign management)
    ('Media Buyer Day Shift', '09:00:00', '18:00:00', 'Media Buyer'),
    ('Media Buyer Extended Shift', '08:00:00', '20:00:00', 'Media Buyer'),
    
    -- Web Developer shifts (standard development hours)
    ('Web Developer Day Shift', '09:00:00', '18:00:00', 'Web Developer'),
    ('Web Developer Flexible Shift', '10:00:00', '19:00:00', 'Web Developer'),
    
    -- Designer shifts (already exist, but adding more options)
    ('Designer Day Shift', '09:00:00', '18:00:00', 'Designer'),
    ('Designer Extended Shift', '08:00:00', '20:00:00', 'Designer')
ON CONFLICT DO NOTHING;

-- 3. Update RLS policies for shifts table to allow all employees to view their shifts
DROP POLICY IF EXISTS shifts_select ON shifts;
CREATE POLICY shifts_select ON shifts FOR SELECT USING (
    -- Admins can see all shifts
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    OR
    -- Employees can see shifts for their position
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND position = shifts.position)
);

-- 4. Update monthly_shifts RLS policies to allow all employees
DROP POLICY IF EXISTS monthly_shifts_select ON monthly_shifts;
CREATE POLICY monthly_shifts_select ON monthly_shifts FOR SELECT USING (
    -- Admins can see all records
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    OR
    -- Employees can see their own records
    user_id = auth.uid()
);

DROP POLICY IF EXISTS monthly_shifts_insert ON monthly_shifts;
CREATE POLICY monthly_shifts_insert ON monthly_shifts FOR INSERT WITH CHECK (
    -- Admins can insert for anyone
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    OR
    -- Employees can insert their own records
    user_id = auth.uid()
);

DROP POLICY IF EXISTS monthly_shifts_update ON monthly_shifts;
CREATE POLICY monthly_shifts_update ON monthly_shifts FOR UPDATE USING (
    -- Admins can update all records
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    OR
    -- Employees can update their own records
    user_id = auth.uid()
);

-- 5. Verify the changes
SELECT 'Shifts table updated successfully' as status;
SELECT count(*) as total_shifts FROM shifts;
SELECT position, count(*) as shift_count FROM shifts GROUP BY position;