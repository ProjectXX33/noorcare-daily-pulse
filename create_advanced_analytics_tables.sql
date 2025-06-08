-- Advanced Analytics Tables for NoorCare Employee Management System
-- Run this script in Supabase SQL Editor to create enhanced analytics capabilities

-- =====================================================
-- 1. ANALYTICS DATA WAREHOUSE TABLES
-- =====================================================

-- Daily Analytics Summary Table
CREATE TABLE IF NOT EXISTS daily_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    total_employees INTEGER DEFAULT 0,
    total_check_ins INTEGER DEFAULT 0,
    total_check_outs INTEGER DEFAULT 0,
    total_work_hours DECIMAL(10,2) DEFAULT 0,
    total_overtime_hours DECIMAL(10,2) DEFAULT 0,
    average_delay_minutes DECIMAL(8,2) DEFAULT 0,
    attendance_rate DECIMAL(5,2) DEFAULT 0,
    performance_score DECIMAL(5,2) DEFAULT 0,
    total_tasks_created INTEGER DEFAULT 0,
    total_tasks_completed INTEGER DEFAULT 0,
    total_work_reports INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Employee Performance Trends Table
CREATE TABLE IF NOT EXISTS employee_performance_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    work_hours DECIMAL(5,2) DEFAULT 0,
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    delay_minutes INTEGER DEFAULT 0,
    performance_score DECIMAL(5,2) DEFAULT 100,
    tasks_completed INTEGER DEFAULT 0,
    reports_submitted INTEGER DEFAULT 0,
    mood_rating INTEGER,
    productivity_score DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date)
);

-- Department Analytics Table
CREATE TABLE IF NOT EXISTS department_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    total_employees INTEGER DEFAULT 0,
    present_employees INTEGER DEFAULT 0,
    total_work_hours DECIMAL(10,2) DEFAULT 0,
    average_performance DECIMAL(5,2) DEFAULT 0,
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    total_reports INTEGER DEFAULT 0,
    budget_utilization DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(department, date)
);

-- =====================================================
-- 2. ADVANCED REPORTING TABLES
-- =====================================================

-- Weekly Analytics Summary
CREATE TABLE IF NOT EXISTS weekly_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    department VARCHAR(100),
    total_employees INTEGER DEFAULT 0,
    average_attendance_rate DECIMAL(5,2) DEFAULT 0,
    total_work_hours DECIMAL(10,2) DEFAULT 0,
    average_overtime_hours DECIMAL(8,2) DEFAULT 0,
    productivity_index DECIMAL(8,2) DEFAULT 0,
    satisfaction_score DECIMAL(5,2) DEFAULT 0,
    tasks_completion_rate DECIMAL(5,2) DEFAULT 0,
    reports_submission_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(week_start_date, department)
);

-- Monthly Analytics Summary
CREATE TABLE IF NOT EXISTS monthly_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month_year VARCHAR(7) NOT NULL, -- Format: '2025-01'
    department VARCHAR(100),
    total_employees INTEGER DEFAULT 0,
    average_attendance_rate DECIMAL(5,2) DEFAULT 0,
    total_work_hours DECIMAL(12,2) DEFAULT 0,
    total_overtime_hours DECIMAL(10,2) DEFAULT 0,
    payroll_cost DECIMAL(15,2) DEFAULT 0,
    productivity_index DECIMAL(8,2) DEFAULT 0,
    employee_satisfaction DECIMAL(5,2) DEFAULT 0,
    turnover_rate DECIMAL(5,2) DEFAULT 0,
    training_hours DECIMAL(8,2) DEFAULT 0,
    goal_achievement_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(month_year, department)
);

-- =====================================================
-- 3. BUSINESS INTELLIGENCE TABLES
-- =====================================================

-- Key Performance Indicators (KPI) Tracking
CREATE TABLE IF NOT EXISTS kpi_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_name VARCHAR(100) NOT NULL,
    kpi_category VARCHAR(50) NOT NULL,
    target_value DECIMAL(12,2) NOT NULL,
    actual_value DECIMAL(12,2) NOT NULL,
    measurement_period VARCHAR(20) NOT NULL,
    measurement_date DATE NOT NULL,
    department VARCHAR(100),
    variance_percentage DECIMAL(8,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'on_track',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Analytics Events Log (for tracking user interactions with analytics)
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL, -- 'view_dashboard', 'export_report', 'filter_data'
    event_details JSONB,
    dashboard_page VARCHAR(100),
    filters_applied JSONB,
    export_format VARCHAR(20), -- 'pdf', 'excel', 'csv'
    session_id UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Custom Reports Configuration
CREATE TABLE IF NOT EXISTS custom_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_name VARCHAR(200) NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL, -- 'attendance', 'performance', 'productivity', 'custom'
    filters JSONB, -- JSON configuration for filters
    columns JSONB, -- JSON array of selected columns
    chart_type VARCHAR(50), -- 'bar', 'line', 'pie', 'table'
    scheduled_frequency VARCHAR(20), -- 'none', 'daily', 'weekly', 'monthly'
    recipients JSONB, -- JSON array of user IDs to receive report
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 4. INDEXES FOR PERFORMANCE
-- =====================================================

-- Daily Analytics Indexes
CREATE INDEX idx_daily_analytics_date ON daily_analytics(date DESC);

-- Employee Performance Trends Indexes
CREATE INDEX idx_employee_performance_trends_employee ON employee_performance_trends(employee_id);
CREATE INDEX idx_employee_performance_trends_date ON employee_performance_trends(date DESC);
CREATE INDEX idx_employee_performance_trends_performance ON employee_performance_trends(performance_score DESC);

-- Department Analytics Indexes
CREATE INDEX idx_department_analytics_dept_date ON department_analytics(department, date DESC);

-- Weekly Analytics Indexes
CREATE INDEX idx_weekly_analytics_week_dept ON weekly_analytics(week_start_date DESC, department);

-- Monthly Analytics Indexes
CREATE INDEX idx_monthly_analytics_month_dept ON monthly_analytics(month_year DESC, department);

-- KPI Tracking Indexes
CREATE INDEX idx_kpi_tracking_name_date ON kpi_tracking(kpi_name, measurement_date DESC);
CREATE INDEX idx_kpi_tracking_category ON kpi_tracking(kpi_category);

-- Analytics Events Indexes
CREATE INDEX idx_analytics_events_user_time ON analytics_events(user_id, created_at DESC);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all analytics tables
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_performance_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Daily Analytics (Admin can view all, employees can view limited data)
CREATE POLICY "daily_analytics_admin_all" ON daily_analytics 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "daily_analytics_employee_view" ON daily_analytics 
FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'employee'));

-- RLS Policies for Employee Performance Trends
CREATE POLICY "performance_trends_admin_all" ON employee_performance_trends 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "performance_trends_employee_own" ON employee_performance_trends 
FOR SELECT USING (employee_id = auth.uid());

-- RLS Policies for Department Analytics
CREATE POLICY "department_analytics_admin_all" ON department_analytics 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "department_analytics_employee_view" ON department_analytics 
FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'employee'));

-- RLS Policies for Weekly Analytics
CREATE POLICY "weekly_analytics_admin_all" ON weekly_analytics 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for Monthly Analytics
CREATE POLICY "monthly_analytics_admin_all" ON monthly_analytics 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for KPI Tracking
CREATE POLICY "kpi_tracking_admin_all" ON kpi_tracking 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies for Analytics Events
CREATE POLICY "analytics_events_admin_all" ON analytics_events 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "analytics_events_user_own" ON analytics_events 
FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for Custom Reports
CREATE POLICY "custom_reports_admin_all" ON custom_reports 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "custom_reports_user_own" ON custom_reports 
FOR SELECT USING (created_by = auth.uid() OR is_public = true);

CREATE POLICY "custom_reports_user_insert" ON custom_reports 
FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "custom_reports_user_update" ON custom_reports 
FOR UPDATE USING (created_by = auth.uid());

-- =====================================================
-- 6. FUNCTIONS FOR DATA AGGREGATION
-- =====================================================

-- Function to update daily analytics
CREATE OR REPLACE FUNCTION update_daily_analytics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
    INSERT INTO daily_analytics (
        date,
        total_employees,
        total_check_ins,
        total_check_outs,
        total_work_hours,
        total_overtime_hours,
        average_delay_minutes,
        attendance_rate,
        total_tasks_created,
        total_tasks_completed,
        total_work_reports
    )
    SELECT 
        target_date,
        (SELECT COUNT(*) FROM users WHERE role = 'employee'),
        (SELECT COUNT(*) FROM check_ins WHERE DATE(check_in_time) = target_date),
        (SELECT COUNT(*) FROM check_ins WHERE DATE(check_out_time) = target_date),
        COALESCE((
            SELECT SUM(EXTRACT(EPOCH FROM (check_out_time - check_in_time))/3600.0)
            FROM check_ins 
            WHERE DATE(check_in_time) = target_date AND check_out_time IS NOT NULL
        ), 0),
        COALESCE((
            SELECT SUM(GREATEST(0, EXTRACT(EPOCH FROM (check_out_time - check_in_time))/3600.0 - 8))
            FROM check_ins 
            WHERE DATE(check_in_time) = target_date AND check_out_time IS NOT NULL
        ), 0),
        COALESCE((
            SELECT AVG(delay_minutes)
            FROM admin_performance_dashboard apd
            JOIN users u ON apd.employee_id = u.id
            WHERE TO_CHAR(target_date, 'YYYY-MM') = apd.month_year
        ), 0),
        CASE 
            WHEN (SELECT COUNT(*) FROM users WHERE role = 'employee') > 0 THEN
                ((SELECT COUNT(*) FROM check_ins WHERE DATE(check_in_time) = target_date) * 100.0 / 
                 (SELECT COUNT(*) FROM users WHERE role = 'employee'))
            ELSE 0
        END,
        (SELECT COUNT(*) FROM tasks WHERE DATE(created_at) = target_date),
        (SELECT COUNT(*) FROM tasks WHERE DATE(updated_at) = target_date AND status = 'complete'),
        (SELECT COUNT(*) FROM work_reports WHERE date = target_date)
    ON CONFLICT (date) DO UPDATE SET
        total_employees = EXCLUDED.total_employees,
        total_check_ins = EXCLUDED.total_check_ins,
        total_check_outs = EXCLUDED.total_check_outs,
        total_work_hours = EXCLUDED.total_work_hours,
        total_overtime_hours = EXCLUDED.total_overtime_hours,
        average_delay_minutes = EXCLUDED.average_delay_minutes,
        attendance_rate = EXCLUDED.attendance_rate,
        total_tasks_created = EXCLUDED.total_tasks_created,
        total_tasks_completed = EXCLUDED.total_tasks_completed,
        total_work_reports = EXCLUDED.total_work_reports,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate productivity index
CREATE OR REPLACE FUNCTION calculate_productivity_index(
    department_name VARCHAR DEFAULT NULL,
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
) RETURNS DECIMAL AS $$
DECLARE
    productivity_score DECIMAL := 0;
    attendance_weight DECIMAL := 0.3;
    performance_weight DECIMAL := 0.4;
    task_completion_weight DECIMAL := 0.3;
    
    avg_attendance DECIMAL;
    avg_performance DECIMAL;
    avg_task_completion DECIMAL;
BEGIN
    -- Calculate average attendance rate
    SELECT AVG(attendance_rate) INTO avg_attendance
    FROM daily_analytics
    WHERE date BETWEEN start_date AND end_date;
    
    -- Calculate average performance score
    SELECT AVG(average_performance_score) INTO avg_performance
    FROM admin_performance_dashboard
    WHERE TO_DATE(month_year || '-01', 'YYYY-MM-DD') BETWEEN start_date AND end_date
    AND (department_name IS NULL OR employee_id IN (
        SELECT id FROM users WHERE department = department_name
    ));
    
    -- Calculate task completion rate
    WITH task_stats AS (
        SELECT 
            COUNT(*) as total_tasks,
            COUNT(CASE WHEN status = 'complete' THEN 1 END) as completed_tasks
        FROM tasks t
        JOIN users u ON t.assigned_to = u.id
        WHERE DATE(t.created_at) BETWEEN start_date AND end_date
        AND (department_name IS NULL OR u.department = department_name)
    )
    SELECT 
        CASE 
            WHEN total_tasks > 0 THEN (completed_tasks * 100.0 / total_tasks)
            ELSE 0 
        END INTO avg_task_completion
    FROM task_stats;
    
    -- Calculate weighted productivity index
    productivity_score := 
        (COALESCE(avg_attendance, 0) * attendance_weight) +
        (COALESCE(avg_performance, 0) * performance_weight) +
        (COALESCE(avg_task_completion, 0) * task_completion_weight);
    
    RETURN productivity_score;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. VIEWS FOR EASY ANALYTICS QUERIES
-- =====================================================

-- Real-time Dashboard View
CREATE OR REPLACE VIEW analytics_dashboard_realtime AS
SELECT 
    -- Today's metrics
    (SELECT COUNT(*) FROM users WHERE role = 'employee') as total_employees,
    (SELECT COUNT(*) FROM check_ins WHERE DATE(check_in_time) = CURRENT_DATE) as today_check_ins,
    (SELECT COUNT(*) FROM check_ins WHERE DATE(check_in_time) = CURRENT_DATE AND check_out_time IS NOT NULL) as today_check_outs,
    (SELECT COUNT(*) FROM tasks WHERE status = 'in-progress') as active_tasks,
    (SELECT COUNT(*) FROM work_reports WHERE date = CURRENT_DATE) as today_reports,
    
    -- Performance metrics
    (SELECT AVG(average_performance_score) FROM admin_performance_dashboard WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')) as avg_performance,
    (SELECT calculate_productivity_index()) as productivity_index,
    
    -- Weekly trends
    (SELECT COUNT(*) FROM check_ins WHERE check_in_time >= CURRENT_DATE - INTERVAL '7 days') as week_check_ins,
    (SELECT COUNT(*) FROM tasks WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND status = 'complete') as week_completed_tasks;

-- Employee Analytics Summary View
CREATE OR REPLACE VIEW employee_analytics_summary AS
SELECT 
    u.id,
    u.name,
    u.department,
    u.position,
    apd.average_performance_score,
    apd.punctuality_percentage,
    apd.total_working_days,
    apd.total_overtime_hours,
    COUNT(t.id) as total_tasks,
    COUNT(CASE WHEN t.status = 'complete' THEN 1 END) as completed_tasks,
    COUNT(wr.id) as total_reports,
    COALESCE(AVG(tr.rating), 0) as avg_task_rating
FROM users u
LEFT JOIN admin_performance_dashboard apd ON u.id = apd.employee_id 
    AND apd.month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
LEFT JOIN tasks t ON u.id = t.assigned_to 
    AND DATE(t.created_at) >= DATE_TRUNC('month', CURRENT_DATE)
LEFT JOIN work_reports wr ON u.id = wr.user_id 
    AND wr.date >= DATE_TRUNC('month', CURRENT_DATE)
LEFT JOIN task_ratings tr ON t.id = tr.task_id
WHERE u.role = 'employee'
GROUP BY u.id, u.name, u.department, u.position, apd.average_performance_score, 
         apd.punctuality_percentage, apd.total_working_days, apd.total_overtime_hours;

-- =====================================================
-- 8. SAMPLE DATA INSERTION (OPTIONAL)
-- =====================================================

-- Insert sample KPIs
INSERT INTO kpi_tracking (kpi_name, kpi_category, target_value, actual_value, measurement_period, measurement_date, department) VALUES
('Employee Attendance Rate', 'attendance', 95.0, 92.5, 'monthly', CURRENT_DATE, 'Engineering'),
('Average Performance Score', 'productivity', 85.0, 88.2, 'monthly', CURRENT_DATE, 'Engineering'),
('Task Completion Rate', 'productivity', 90.0, 87.3, 'weekly', CURRENT_DATE, 'Customer Service'),
('Employee Satisfaction', 'quality', 4.5, 4.2, 'monthly', CURRENT_DATE, NULL);

-- =====================================================
-- 9. AUTOMATED TRIGGERS (OPTIONAL)
-- =====================================================

-- Trigger to auto-update daily analytics at midnight
-- Note: This would require a scheduled job in production
-- For now, you can manually call: SELECT update_daily_analytics();

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 'Advanced Analytics Tables Created Successfully! 🎉' as message,
       'Tables: daily_analytics, employee_performance_trends, department_analytics, weekly_analytics, monthly_analytics, kpi_tracking, analytics_events, custom_reports' as created_tables,
       'Views: analytics_dashboard_realtime, employee_analytics_summary' as created_views,
       'Functions: update_daily_analytics(), calculate_productivity_index()' as created_functions; 