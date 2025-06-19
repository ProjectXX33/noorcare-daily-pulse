-- Add break time tracking to check_ins table
-- This allows employees to take breaks during their work time

ALTER TABLE check_ins 
ADD COLUMN IF NOT EXISTS break_start_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS break_end_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS total_break_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_on_break BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS current_break_reason TEXT,
ADD COLUMN IF NOT EXISTS break_sessions JSONB DEFAULT '[]'::jsonb;

-- Add comments to document the new columns
COMMENT ON COLUMN check_ins.break_start_time 
IS 'Start time of current break session';

COMMENT ON COLUMN check_ins.break_end_time 
IS 'End time of current break session';

COMMENT ON COLUMN check_ins.total_break_minutes 
IS 'Total minutes spent on breaks during this check-in session';

COMMENT ON COLUMN check_ins.is_on_break 
IS 'Whether the employee is currently on a break';

COMMENT ON COLUMN check_ins.current_break_reason 
IS 'Reason for current break session';

COMMENT ON COLUMN check_ins.break_sessions 
IS 'Array of all break sessions with start/end times, duration, and reasons';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_check_ins_is_on_break 
ON check_ins(is_on_break) 
WHERE is_on_break = TRUE;

CREATE INDEX IF NOT EXISTS idx_check_ins_break_start 
ON check_ins(break_start_time) 
WHERE break_start_time IS NOT NULL;

-- Create GIN index for JSONB break_sessions column
CREATE INDEX IF NOT EXISTS idx_check_ins_break_sessions 
ON check_ins USING GIN (break_sessions);

-- Create schema_migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
    migration_name TEXT PRIMARY KEY,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Log the migration
INSERT INTO schema_migrations (migration_name, executed_at) 
VALUES ('add_break_time_tracking', NOW())
ON CONFLICT (migration_name) DO NOTHING; 