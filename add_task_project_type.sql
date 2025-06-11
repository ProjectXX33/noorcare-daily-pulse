-- Add Project Type Column to Tasks Table
-- This script adds a project_type column to the tasks table for design projects

-- Step 1: Add project_type column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'project_type') THEN
        ALTER TABLE tasks ADD COLUMN project_type VARCHAR(20) DEFAULT 'other' CHECK (project_type IN ('social-media', 'web-design', 'branding', 'print', 'ui-ux', 'other'));
        RAISE NOTICE 'Added project_type column to tasks table';
    ELSE
        RAISE NOTICE 'Project_type column already exists in tasks table';
    END IF;
END $$;

-- Step 2: Update existing tasks to have 'other' project type as default
UPDATE tasks SET project_type = 'other' WHERE project_type IS NULL;

-- Step 3: Make project_type column NOT NULL
ALTER TABLE tasks ALTER COLUMN project_type SET NOT NULL;

-- Step 4: Verify the updated table structure
SELECT 'Updated tasks table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;

-- Step 5: Check the project_type constraint
SELECT 'Project Type constraint:' as info;
SELECT conname, pg_get_constraintdef(c.oid) 
FROM pg_constraint c 
JOIN pg_class t ON c.conrelid = t.oid 
WHERE t.relname = 'tasks' AND c.conname LIKE '%project_type%'; 