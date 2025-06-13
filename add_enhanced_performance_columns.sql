-- Enhanced Performance Tracking Columns
-- Add comprehensive performance metrics to admin_performance_dashboard table
-- Run this SQL in your Supabase SQL Editor

-- Add new columns for enhanced performance tracking
ALTER TABLE admin_performance_dashboard 
ADD COLUMN IF NOT EXISTS total_logins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS app_usage_hours DECIMAL(6,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tasks_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tasks_success_rate DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS check_ins_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_daily_hours DECIMAL(5,2) DEFAULT 0.00;

-- Add comments to document the new columns
COMMENT ON COLUMN admin_performance_dashboard.total_logins 
IS 'Number of unique days the employee logged into the application';

COMMENT ON COLUMN admin_performance_dashboard.app_usage_hours 
IS 'Total hours spent using the application (based on work hours)';

COMMENT ON COLUMN admin_performance_dashboard.tasks_completed 
IS 'Number of tasks completed by the employee in the month';

COMMENT ON COLUMN admin_performance_dashboard.tasks_success_rate 
IS 'Percentage of tasks completed successfully (completed/total * 100)';

COMMENT ON COLUMN admin_performance_dashboard.check_ins_count 
IS 'Total number of check-in sessions performed by the employee';

COMMENT ON COLUMN admin_performance_dashboard.average_daily_hours 
IS 'Average working hours per day (total_work_hours / working_days)';

-- Create indexes for better performance on the new columns
CREATE INDEX IF NOT EXISTS idx_admin_performance_total_logins 
ON admin_performance_dashboard(total_logins);

CREATE INDEX IF NOT EXISTS idx_admin_performance_tasks_completed 
ON admin_performance_dashboard(tasks_completed);

CREATE INDEX IF NOT EXISTS idx_admin_performance_app_usage 
ON admin_performance_dashboard(app_usage_hours);

CREATE INDEX IF NOT EXISTS idx_admin_performance_success_rate 
ON admin_performance_dashboard(tasks_success_rate);

-- Update RLS policies to include new columns (if needed)
-- The existing policies should automatically cover the new columns

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'admin_performance_dashboard' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Sample query to test the new columns
SELECT 
    employee_name,
    total_working_days,
    total_logins,
    app_usage_hours,
    tasks_completed,
    tasks_success_rate,
    check_ins_count,
    average_daily_hours,
    average_performance_score
FROM admin_performance_dashboard 
WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
ORDER BY average_performance_score DESC
LIMIT 5; 