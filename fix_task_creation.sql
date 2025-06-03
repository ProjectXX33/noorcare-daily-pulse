-- Fix Task Creation Issues
-- This addresses the specific problems with task creation

-- Step 1: Check current tasks table structure
SELECT 'Current tasks table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;

-- Step 2: Check current CHECK constraints on status
SELECT 'Current status constraints:' as info;
SELECT conname, pg_get_constraintdef(c.oid) 
FROM pg_constraint c 
JOIN pg_class t ON c.conrelid = t.oid 
WHERE t.relname = 'tasks' AND contype = 'c';

-- Step 3: Update the status constraint to include 'Not Started'
-- First drop the existing constraint
DO $$
BEGIN
    -- Drop existing status constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint c 
               JOIN pg_class t ON c.conrelid = t.oid 
               WHERE t.relname = 'tasks' AND c.conname LIKE '%status%') THEN
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
        RAISE NOTICE 'Dropped existing status constraint';
    END IF;
    
    -- Add new constraint with all status values
    ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
    CHECK (status IN ('Not Started', 'On Hold', 'In Progress', 'Complete'));
    RAISE NOTICE 'Added new status constraint with Not Started';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error updating status constraint: %', SQLERRM;
END $$;

-- Step 4: Check if comments column exists, add if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'comments') THEN
        ALTER TABLE tasks ADD COLUMN comments JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added comments column to tasks table';
    END IF;
END $$;

-- Step 5: Test task creation with all status values
DO $$
DECLARE
    admin_user_id UUID;
    employee_user_id UUID;
    test_task_id UUID;
BEGIN
    -- Get admin and employee users
    SELECT id INTO admin_user_id FROM users WHERE role = 'admin' LIMIT 1;
    SELECT id INTO employee_user_id FROM users WHERE role = 'employee' LIMIT 1;
    
    IF admin_user_id IS NOT NULL AND employee_user_id IS NOT NULL THEN
        -- Test creating a task with 'Not Started' status
        INSERT INTO tasks (title, description, assigned_to, status, progress_percentage, created_by)
        VALUES (
            'Test Task - Not Started',
            'Testing task creation with Not Started status',
            employee_user_id,
            'Not Started',
            0,
            admin_user_id
        ) RETURNING id INTO test_task_id;
        
        RAISE NOTICE 'Test task created successfully with ID: %', test_task_id;
        
        -- Test updating the task status
        UPDATE tasks SET status = 'In Progress', progress_percentage = 50 
        WHERE id = test_task_id;
        
        RAISE NOTICE 'Test task updated successfully';
        
        -- Clean up test task
        DELETE FROM tasks WHERE id = test_task_id;
        RAISE NOTICE 'Test task cleaned up';
        
    ELSE
        RAISE NOTICE 'No admin or employee users found for testing';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in task creation test: %', SQLERRM;
END $$;

-- Step 6: Verify the fixed table structure
SELECT 'Updated tasks table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;

-- Step 7: Check updated constraints
SELECT 'Updated status constraints:' as info;
SELECT conname, pg_get_constraintdef(c.oid) 
FROM pg_constraint c 
JOIN pg_class t ON c.conrelid = t.oid 
WHERE t.relname = 'tasks' AND contype = 'c'; 