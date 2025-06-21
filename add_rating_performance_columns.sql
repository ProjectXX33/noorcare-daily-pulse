-- Add Rating Performance Columns to admin_performance_dashboard table
-- This enables the new rating bonus system in performance calculations

-- Add rating-related columns if they don't exist
DO $$
BEGIN
    -- Add employee_rating_avg column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'admin_performance_dashboard' 
        AND column_name = 'employee_rating_avg'
    ) THEN
        ALTER TABLE admin_performance_dashboard 
        ADD COLUMN employee_rating_avg DECIMAL(3,2);
        
        COMMENT ON COLUMN admin_performance_dashboard.employee_rating_avg IS 'Average employee rating for the month (1-5 stars)';
        
        RAISE NOTICE 'Added employee_rating_avg column to admin_performance_dashboard table';
    END IF;

    -- Add task_rating_avg column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'admin_performance_dashboard' 
        AND column_name = 'task_rating_avg'
    ) THEN
        ALTER TABLE admin_performance_dashboard 
        ADD COLUMN task_rating_avg DECIMAL(3,2);
        
        COMMENT ON COLUMN admin_performance_dashboard.task_rating_avg IS 'Average task rating for the month (1-5 stars)';
        
        RAISE NOTICE 'Added task_rating_avg column to admin_performance_dashboard table';
    END IF;

    -- Add rating_bonus_points column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'admin_performance_dashboard' 
        AND column_name = 'rating_bonus_points'
    ) THEN
        ALTER TABLE admin_performance_dashboard 
        ADD COLUMN rating_bonus_points INTEGER DEFAULT 0;
        
        COMMENT ON COLUMN admin_performance_dashboard.rating_bonus_points IS 'Bonus/penalty points from ratings (+15 for 5-star, -10 for <2-star)';
        
        RAISE NOTICE 'Added rating_bonus_points column to admin_performance_dashboard table';
    END IF;

    -- Add total_ratings_count column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'admin_performance_dashboard' 
        AND column_name = 'total_ratings_count'
    ) THEN
        ALTER TABLE admin_performance_dashboard 
        ADD COLUMN total_ratings_count INTEGER DEFAULT 0;
        
        COMMENT ON COLUMN admin_performance_dashboard.total_ratings_count IS 'Total number of ratings received (employee + task ratings)';
        
        RAISE NOTICE 'Added total_ratings_count column to admin_performance_dashboard table';
    END IF;

    RAISE NOTICE '✅ All rating performance columns added successfully!';
END $$;

-- Create a function to explain the rating bonus system
CREATE OR REPLACE FUNCTION explain_rating_bonus_system()
RETURNS TABLE(
    rating_range TEXT,
    bonus_points INTEGER,
    description TEXT,
    emoji TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        '5.0 stars'::TEXT, 15, '🌟 Outstanding Performance - Excellent work!'::TEXT, '🌟'::TEXT
    UNION ALL
    SELECT 
        '4.5+ stars'::TEXT, 10, '⭐ Excellent Performance - Great job!'::TEXT, '⭐'::TEXT
    UNION ALL
    SELECT 
        '4.0+ stars'::TEXT, 5, '👍 Good Performance - Keep it up!'::TEXT, '👍'::TEXT
    UNION ALL
    SELECT 
        '3.0+ stars'::TEXT, 0, '😐 Average Performance - Room for improvement'::TEXT, '😐'::TEXT
    UNION ALL
    SELECT 
        '2.0+ stars'::TEXT, -5, '😕 Below Average - Needs improvement'::TEXT, '😕'::TEXT
    UNION ALL
    SELECT 
        'Under 2.0 stars'::TEXT, -10, '😞 Poor Performance - Immediate attention needed'::TEXT, '😞'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Show the rating bonus system
SELECT 
    rating_range,
    bonus_points,
    description,
    emoji
FROM explain_rating_bonus_system()
ORDER BY bonus_points DESC;

-- Verify all new columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'admin_performance_dashboard' 
AND column_name IN ('employee_rating_avg', 'task_rating_avg', 'rating_bonus_points', 'total_ratings_count')
ORDER BY column_name;

-- Show sample of performance data with new rating columns
SELECT 
    employee_name,
    month_year,
    average_performance_score,
    employee_rating_avg,
    task_rating_avg,
    rating_bonus_points,
    total_ratings_count,
    performance_status
FROM admin_performance_dashboard
ORDER BY updated_at DESC
LIMIT 5; 