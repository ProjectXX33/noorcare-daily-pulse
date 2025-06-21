-- Ensure admin_performance_dashboard table has all necessary columns for enhanced performance tracking
-- This SQL adds missing columns if they don't exist

-- Add total_break_minutes column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'admin_performance_dashboard' 
        AND column_name = 'total_break_minutes'
    ) THEN
        ALTER TABLE admin_performance_dashboard 
        ADD COLUMN total_break_minutes INTEGER DEFAULT 0;
        
        COMMENT ON COLUMN admin_performance_dashboard.total_break_minutes IS 'Total break time in minutes for the month';
        
        RAISE NOTICE 'Added total_break_minutes column to admin_performance_dashboard table';
    ELSE
        RAISE NOTICE 'total_break_minutes column already exists in admin_performance_dashboard table';
    END IF;
END $$;

-- Update existing records to calculate break time from monthly_shifts if available
DO $$
BEGIN
    -- Update records that don't have break time data
    UPDATE admin_performance_dashboard apd
    SET total_break_minutes = COALESCE((
        SELECT SUM(ms.total_break_minutes)
        FROM monthly_shifts ms
        WHERE ms.user_id = apd.employee_id
        AND TO_CHAR(ms.work_date::date, 'YYYY-MM') = apd.month_year
        AND ms.total_break_minutes IS NOT NULL
    ), 0)
    WHERE apd.total_break_minutes IS NULL OR apd.total_break_minutes = 0;
    
    RAISE NOTICE 'Updated existing records with break time data from monthly_shifts';
END $$;

-- Verify the column exists and show sample data
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'admin_performance_dashboard' 
AND column_name = 'total_break_minutes';

-- Show sample of updated data
SELECT 
    employee_name,
    month_year,
    total_working_days,
    total_break_minutes,
    total_delay_minutes,
    total_regular_hours,
    average_performance_score,
    performance_status
FROM admin_performance_dashboard
WHERE total_break_minutes > 0
ORDER BY total_break_minutes DESC
LIMIT 5; 