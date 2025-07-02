-- Add is_locked Column to Tasks Table
-- This script adds a boolean is_locked column to the tasks table for explicit task locking.

-- Step 1: Add is_locked column with a default of FALSE
-- This ensures all existing tasks are unlocked by default.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

-- Step 2: Set existing "Unfinished" tasks to be locked
-- This ensures data consistency for tasks that were previously locked via status.
UPDATE tasks SET is_locked = TRUE WHERE status = 'Unfinished';

-- Step 3: Verify the updated table structure
SELECT 'Updated tasks table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name IN ('status', 'is_locked')
ORDER BY ordinal_position;

-- Step 4: Show completion message
SELECT 'Migration completed successfully!' as result,
       'Tasks table now has an is_locked column for explicit locking.' as description; 