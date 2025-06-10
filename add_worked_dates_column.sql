-- Add worked_dates column to admin_performance_dashboard table
-- This will help track unique working days more accurately

-- Add the worked_dates column to store array of dates worked in a month
ALTER TABLE admin_performance_dashboard 
ADD COLUMN IF NOT EXISTS worked_dates TEXT[] DEFAULT '{}';

-- Create an index for better performance on worked_dates queries
CREATE INDEX IF NOT EXISTS idx_admin_performance_worked_dates 
ON admin_performance_dashboard USING GIN (worked_dates);

-- Add a comment to document the column
COMMENT ON COLUMN admin_performance_dashboard.worked_dates 
IS 'Array of dates (YYYY-MM-DD) when employee worked during the month';

-- Update existing records to populate worked_dates based on total_working_days
-- This is a one-time migration to handle existing data
UPDATE admin_performance_dashboard 
SET worked_dates = (
    SELECT ARRAY(
        SELECT generate_series(
            date_trunc('month', CURRENT_DATE)::date,
            date_trunc('month', CURRENT_DATE)::date + INTERVAL '1 month' - INTERVAL '1 day',
            '1 day'::interval
        )::date::text
        LIMIT total_working_days
    )
)
WHERE worked_dates = '{}' AND total_working_days > 0;

-- Add a check constraint to ensure worked_dates array length matches total_working_days
ALTER TABLE admin_performance_dashboard 
ADD CONSTRAINT check_worked_dates_count 
CHECK (array_length(worked_dates, 1) = total_working_days OR worked_dates = '{}'); 