-- Add early checkout penalty column to monthly_shifts table
-- This tracks how many hours early an employee left before their shift ended

ALTER TABLE monthly_shifts 
ADD COLUMN IF NOT EXISTS early_checkout_penalty NUMERIC(5,2) DEFAULT 0;

-- Add a comment to explain the column
COMMENT ON COLUMN monthly_shifts.early_checkout_penalty IS 'Number of hours the employee left early before their scheduled shift end time';

-- Create an index for performance on early_checkout_penalty
CREATE INDEX IF NOT EXISTS idx_monthly_shifts_early_checkout_penalty 
ON monthly_shifts(early_checkout_penalty) 
WHERE early_checkout_penalty > 0;

-- Create schema_migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
    migration_name TEXT PRIMARY KEY,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Log the migration
INSERT INTO schema_migrations (migration_name, executed_at) 
VALUES ('add_early_checkout_penalty_column', NOW())
ON CONFLICT (migration_name) DO NOTHING; 