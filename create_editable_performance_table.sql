-- Create Editable Performance Dashboard Table
-- This replaces the read-only view with an editable table

-- 1. Drop the existing view if it exists
DROP VIEW IF EXISTS admin_performance_dashboard;

-- 2. Create editable performance dashboard table
CREATE TABLE admin_performance_dashboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    month_year TEXT NOT NULL,
    total_working_days INTEGER DEFAULT 0,
    total_delay_minutes INTEGER DEFAULT 0,
    total_delay_hours NUMERIC(5,2) DEFAULT 0,
    total_overtime_hours NUMERIC(5,2) DEFAULT 0,
    average_performance_score NUMERIC(5,2) DEFAULT 0,
    punctuality_percentage NUMERIC(5,2) DEFAULT 0,
    performance_status TEXT DEFAULT 'Good',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, month_year)
);

-- 3. Enable RLS (Row Level Security)
ALTER TABLE admin_performance_dashboard ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "Admin can view all performance data" ON admin_performance_dashboard
    FOR SELECT USING (auth.jwt() ->> 'role' = 'authenticated');

CREATE POLICY "Admin can insert performance data" ON admin_performance_dashboard
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'authenticated');

CREATE POLICY "Admin can update performance data" ON admin_performance_dashboard
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'authenticated');

CREATE POLICY "Admin can delete performance data" ON admin_performance_dashboard
    FOR DELETE USING (auth.jwt() ->> 'role' = 'authenticated');

-- 5. Create indexes for better performance
CREATE INDEX idx_admin_performance_employee_month ON admin_performance_dashboard(employee_id, month_year);
CREATE INDEX idx_admin_performance_month ON admin_performance_dashboard(month_year);
CREATE INDEX idx_admin_performance_score ON admin_performance_dashboard(average_performance_score DESC);

-- 6. Create function to auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_performance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for auto-updating timestamp
CREATE TRIGGER update_admin_performance_updated_at_trigger
    BEFORE UPDATE ON admin_performance_dashboard
    FOR EACH ROW EXECUTE FUNCTION update_admin_performance_updated_at();

-- 8. Insert sample data for current month
INSERT INTO admin_performance_dashboard (
    employee_id, 
    employee_name, 
    month_year, 
    total_working_days, 
    total_delay_minutes, 
    total_delay_hours, 
    total_overtime_hours, 
    average_performance_score, 
    punctuality_percentage, 
    performance_status
) 
SELECT 
    u.id,
    u.name,
    TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
    CASE WHEN u.position = 'Customer Service' THEN 20 ELSE 0 END,
    CASE WHEN u.position = 'Customer Service' THEN (random() * 180)::integer ELSE 0 END,
    CASE WHEN u.position = 'Customer Service' THEN (random() * 3)::numeric(5,2) ELSE 0 END,
    CASE WHEN u.position = 'Customer Service' THEN (random() * 10)::numeric(5,2) ELSE 0 END,
    CASE WHEN u.position = 'Customer Service' THEN (85 + random() * 15)::numeric(5,2) ELSE 0 END,
    CASE WHEN u.position = 'Customer Service' THEN (80 + random() * 20)::numeric(5,2) ELSE 0 END,
    CASE 
        WHEN u.position = 'Customer Service' AND random() > 0.7 THEN 'Excellent'
        WHEN u.position = 'Customer Service' AND random() > 0.4 THEN 'Good'
        WHEN u.position = 'Customer Service' THEN 'Needs Improvement'
        ELSE 'Good'
    END
FROM users u 
WHERE u.position = 'Customer Service' AND u.role = 'employee'
ON CONFLICT (employee_id, month_year) DO NOTHING;

-- 9. Create function to calculate performance automatically (optional)
CREATE OR REPLACE FUNCTION calculate_performance_score(
    delay_minutes INTEGER,
    working_days INTEGER
) RETURNS NUMERIC AS $$
BEGIN
    -- Base score of 100, subtract 1 point per 5 minutes of delay per day
    RETURN GREATEST(0, 100 - (delay_minutes::NUMERIC / GREATEST(working_days, 1) / 5));
END;
$$ LANGUAGE plpgsql;

-- 10. Create function to update performance status based on score
CREATE OR REPLACE FUNCTION update_performance_status() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.performance_status = CASE
        WHEN NEW.average_performance_score >= 95 THEN 'Excellent'
        WHEN NEW.average_performance_score >= 85 THEN 'Good'  
        WHEN NEW.average_performance_score >= 70 THEN 'Needs Improvement'
        ELSE 'Poor'
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger to auto-update performance status
CREATE TRIGGER update_performance_status_trigger
    BEFORE INSERT OR UPDATE ON admin_performance_dashboard
    FOR EACH ROW EXECUTE FUNCTION update_performance_status();

-- 12. Verify the table was created successfully
SELECT 'Editable admin_performance_dashboard table created successfully!' as status;

-- 13. Show the current data
SELECT 
    employee_name,
    month_year,
    total_working_days,
    total_delay_hours,
    total_overtime_hours,
    average_performance_score,
    performance_status
FROM admin_performance_dashboard
ORDER BY average_performance_score DESC; 