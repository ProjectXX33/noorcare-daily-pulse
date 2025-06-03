-- Advanced Performance Tracking and Shift Management System
-- This adds delay tracking, performance metrics, and day-off management

-- 1. Create shift_assignments table (daily level assignments)
CREATE TABLE IF NOT EXISTS shift_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    assigned_shift_id UUID REFERENCES shifts(id),
    is_day_off BOOLEAN DEFAULT FALSE,
    assigned_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, work_date)
);

-- 2. Create performance_tracking table
CREATE TABLE IF NOT EXISTS performance_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    shift_id UUID REFERENCES shifts(id),
    scheduled_start_time TIME NOT NULL,
    actual_check_in_time TIMESTAMP WITH TIME ZONE,
    actual_check_out_time TIMESTAMP WITH TIME ZONE,
    delay_minutes INTEGER DEFAULT 0, -- Positive = late, Negative = early
    total_work_minutes INTEGER DEFAULT 0,
    regular_hours DECIMAL(4,2) DEFAULT 0,
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    performance_score DECIMAL(3,2) DEFAULT 100.00, -- 100 = perfect, decreases with delays
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, work_date)
);

-- 3. Create employee_performance_summary table (monthly aggregates)
CREATE TABLE IF NOT EXISTS employee_performance_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL, -- Format: '2025-06'
    total_working_days INTEGER DEFAULT 0,
    total_days_off INTEGER DEFAULT 0,
    total_delay_minutes INTEGER DEFAULT 0,
    total_early_minutes INTEGER DEFAULT 0, -- When they come early
    total_overtime_hours DECIMAL(5,2) DEFAULT 0,
    total_regular_hours DECIMAL(5,2) DEFAULT 0,
    average_performance_score DECIMAL(3,2) DEFAULT 100.00,
    punctuality_percentage DECIMAL(3,2) DEFAULT 100.00, -- % of on-time check-ins
    rank_position INTEGER, -- 1 = best performer
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, month_year)
);

-- 4. Enable RLS for all new tables
ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_performance_summary ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for shift_assignments
CREATE POLICY shift_assignments_admin_all ON shift_assignments 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY shift_assignments_employee_view ON shift_assignments 
FOR SELECT USING (
    employee_id = auth.uid() AND 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND position = 'Customer Service')
);

-- 6. RLS Policies for performance_tracking
CREATE POLICY performance_tracking_admin_all ON performance_tracking 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY performance_tracking_employee_view ON performance_tracking 
FOR SELECT USING (
    employee_id = auth.uid() AND 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND position = 'Customer Service')
);

-- 7. RLS Policies for employee_performance_summary
CREATE POLICY performance_summary_admin_all ON employee_performance_summary 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY performance_summary_employee_view ON employee_performance_summary 
FOR SELECT USING (
    employee_id = auth.uid() AND 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND position = 'Customer Service')
);

-- 8. Function to calculate performance score based on delays
CREATE OR REPLACE FUNCTION calculate_performance_score(delay_minutes INTEGER)
RETURNS DECIMAL(3,2) AS $$
BEGIN
    -- Perfect score (100) decreases by 1 point per 5 minutes late
    -- Early check-ins don't decrease score
    IF delay_minutes <= 0 THEN 
        RETURN 100.00;
    ELSIF delay_minutes <= 300 THEN -- Up to 5 hours late
        RETURN GREATEST(0, 100.00 - (delay_minutes / 5.0));
    ELSE
        RETURN 0.00; -- More than 5 hours late = 0 score
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 9. Function to update performance summary
CREATE OR REPLACE FUNCTION update_performance_summary(emp_id UUID, work_month TEXT)
RETURNS VOID AS $$
DECLARE
    summary_data RECORD;
BEGIN
    -- Calculate summary data for the employee and month
    SELECT 
        COUNT(*) as working_days,
        COALESCE(SUM(CASE WHEN delay_minutes > 0 THEN delay_minutes ELSE 0 END), 0) as total_delays,
        COALESCE(SUM(CASE WHEN delay_minutes < 0 THEN ABS(delay_minutes) ELSE 0 END), 0) as total_early,
        COALESCE(SUM(overtime_hours), 0) as total_overtime,
        COALESCE(SUM(regular_hours), 0) as total_regular,
        COALESCE(AVG(performance_score), 100) as avg_score,
        COALESCE(COUNT(CASE WHEN delay_minutes <= 5 THEN 1 END) * 100.0 / COUNT(*), 100) as punctuality
    INTO summary_data
    FROM performance_tracking
    WHERE employee_id = emp_id 
    AND TO_CHAR(work_date, 'YYYY-MM') = work_month;
    
    -- Upsert the summary
    INSERT INTO employee_performance_summary (
        employee_id, month_year, total_working_days, 
        total_delay_minutes, total_early_minutes,
        total_overtime_hours, total_regular_hours,
        average_performance_score, punctuality_percentage
    ) VALUES (
        emp_id, work_month, summary_data.working_days,
        summary_data.total_delays, summary_data.total_early,
        summary_data.total_overtime, summary_data.total_regular,
        summary_data.avg_score, summary_data.punctuality
    )
    ON CONFLICT (employee_id, month_year) 
    DO UPDATE SET
        total_working_days = summary_data.working_days,
        total_delay_minutes = summary_data.total_delays,
        total_early_minutes = summary_data.total_early,
        total_overtime_hours = summary_data.total_overtime,
        total_regular_hours = summary_data.total_regular,
        average_performance_score = summary_data.avg_score,
        punctuality_percentage = summary_data.punctuality,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- 10. Insert sample shift assignments for next week
DO $$
DECLARE
    v_admin_id UUID;
    v_employee_id UUID;
    v_day_shift_id UUID;
    v_night_shift_id UUID;
    v_current_date DATE := CURRENT_DATE;
    i INTEGER;
BEGIN
    -- Get IDs
    SELECT id INTO v_admin_id FROM users WHERE role = 'admin' LIMIT 1;
    SELECT id INTO v_employee_id FROM users WHERE position = 'Customer Service' AND role = 'employee' LIMIT 1;
    SELECT id INTO v_day_shift_id FROM shifts WHERE name = 'Day Shift' LIMIT 1;
    SELECT id INTO v_night_shift_id FROM shifts WHERE name = 'Night Shift' LIMIT 1;
    
    IF v_admin_id IS NOT NULL AND v_employee_id IS NOT NULL THEN
        -- Assign shifts for next 14 days
        FOR i IN 0..13 LOOP
            INSERT INTO shift_assignments (employee_id, work_date, assigned_shift_id, is_day_off, assigned_by)
            VALUES (
                v_employee_id, 
                v_current_date + i,
                CASE 
                    WHEN (i % 7) = 5 THEN NULL -- Saturday off
                    WHEN (i % 7) = 6 THEN NULL -- Sunday off  
                    WHEN i % 2 = 0 THEN v_day_shift_id -- Alternate day/night
                    ELSE v_night_shift_id
                END,
                CASE WHEN (i % 7) IN (5, 6) THEN TRUE ELSE FALSE END, -- Weekend off
                v_admin_id
            )
            ON CONFLICT (employee_id, work_date) DO NOTHING;
        END LOOP;
        
        RAISE NOTICE 'Sample shift assignments created for next 14 days';
    END IF;
END $$;

-- 11. Create view for easy admin dashboard queries
CREATE OR REPLACE VIEW admin_performance_dashboard AS
SELECT 
    u.id as employee_id,
    u.name as employee_name,
    eps.month_year,
    eps.total_working_days,
    eps.total_days_off,
    eps.total_delay_minutes,
    ROUND(eps.total_delay_minutes / 60.0, 1) as total_delay_hours,
    eps.total_overtime_hours,
    eps.average_performance_score,
    eps.punctuality_percentage,
    eps.rank_position,
    CASE 
        WHEN eps.average_performance_score >= 95 THEN '🏆 Excellent'
        WHEN eps.average_performance_score >= 85 THEN '⭐ Good' 
        WHEN eps.average_performance_score >= 70 THEN '⚠️ Needs Improvement'
        ELSE '❌ Poor'
    END as performance_status
FROM users u
JOIN employee_performance_summary eps ON u.id = eps.employee_id
WHERE u.position = 'Customer Service'
ORDER BY eps.month_year DESC, eps.average_performance_score DESC;

-- Test the tables
SELECT 'Performance tracking system created successfully!' as result; 