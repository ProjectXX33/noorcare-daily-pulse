-- Add Priority Column to Tasks Table
-- This script adds a priority column to the tasks table

-- Step 1: Add priority column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'priority') THEN
        ALTER TABLE tasks ADD COLUMN priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
        RAISE NOTICE 'Added priority column to tasks table';
    ELSE
        RAISE NOTICE 'Priority column already exists in tasks table';
    END IF;
END $$;

-- Step 2: Update existing tasks to have medium priority as default
UPDATE tasks SET priority = 'medium' WHERE priority IS NULL;

-- Step 3: Make priority column NOT NULL
ALTER TABLE tasks ALTER COLUMN priority SET NOT NULL;

-- Step 4: Verify the updated table structure
SELECT 'Updated tasks table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;

-- Step 5: Check the priority constraint
SELECT 'Priority constraint:' as info;
SELECT conname, pg_get_constraintdef(c.oid) 
FROM pg_constraint c 
JOIN pg_class t ON c.conrelid = t.oid 
WHERE t.relname = 'tasks' AND c.conname LIKE '%priority%'; 