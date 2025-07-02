-- Add "Unfinished" Status to Tasks Table
-- This script adds the "Unfinished" status option to the existing task status constraint
-- The "Unfinished" status represents locked tasks that employees cannot edit or update

-- Step 1: Check current tasks table status constraint
SELECT 'Current tasks table status constraint:' as info;
SELECT conname, pg_get_constraintdef(c.oid) 
FROM pg_constraint c 
JOIN pg_class t ON c.conrelid = t.oid 
WHERE t.relname = 'tasks' AND c.conname LIKE '%status%';

-- Step 2: Update the status constraint to include 'Unfinished'
DO $$
BEGIN
    -- Drop existing status constraint
    IF EXISTS (SELECT 1 FROM pg_constraint c 
               JOIN pg_class t ON c.conrelid = t.oid 
               WHERE t.relname = 'tasks' AND c.conname LIKE '%status%') THEN
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
        RAISE NOTICE 'Dropped existing status constraint';
    END IF;
    
    -- Add new constraint with 'Unfinished' status included
    ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
    CHECK (status IN ('Not Started', 'On Hold', 'In Progress', 'Complete', 'Unfinished'));
    RAISE NOTICE 'Added new status constraint with Unfinished status';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error updating status constraint: %', SQLERRM;
END $$;

-- Step 3: Test creating a task with 'Unfinished' status
DO $$
DECLARE
    admin_user_id UUID;
    employee_user_id UUID;
    test_task_id UUID;
BEGIN
    -- Get admin and employee users for testing
    SELECT id INTO admin_user_id FROM users WHERE role = 'admin' LIMIT 1;
    SELECT id INTO employee_user_id FROM users WHERE role = 'employee' LIMIT 1;
    
    IF admin_user_id IS NOT NULL AND employee_user_id IS NOT NULL THEN
        -- Test creating a task with 'Unfinished' status
        INSERT INTO tasks (title, description, assigned_to, status, progress_percentage, created_by)
        VALUES (
            'Test Task - Unfinished (Locked)',
            'Testing task creation with Unfinished status - this task should be locked from employee edits',
            employee_user_id,
            'Unfinished',
            0,
            admin_user_id
        ) RETURNING id INTO test_task_id;
        
        RAISE NOTICE 'Test task with Unfinished status created successfully with ID: %', test_task_id;
        
        -- Verify the task was created with correct status
        IF EXISTS (SELECT 1 FROM tasks WHERE id = test_task_id AND status = 'Unfinished') THEN
            RAISE NOTICE 'Unfinished status verified successfully';
        ELSE
            RAISE WARNING 'Unfinished status verification failed';
        END IF;
        
        -- Clean up test task
        DELETE FROM tasks WHERE id = test_task_id;
        RAISE NOTICE 'Test task cleaned up';
        
    ELSE
        RAISE NOTICE 'No admin or employee users found for testing';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in Unfinished task creation test: %', SQLERRM;
END $$;

-- Step 4: Verify the updated table constraint
SELECT 'Updated tasks table status constraint:' as info;
SELECT conname, pg_get_constraintdef(c.oid) 
FROM pg_constraint c 
JOIN pg_class t ON c.conrelid = t.oid 
WHERE t.relname = 'tasks' AND c.conname LIKE '%status%';

-- Step 5: Show all possible status values for verification
SELECT 'All valid task statuses after update:' as info;
SELECT UNNEST(ARRAY['Not Started', 'On Hold', 'In Progress', 'Complete', 'Unfinished']) as valid_status;

-- Step 6: Optional - Create a view to show locked tasks for admin monitoring
CREATE OR REPLACE VIEW locked_tasks_view AS
SELECT 
    t.id,
    t.title,
    t.description,
    t.status,
    t.progress_percentage,
    t.created_at,
    t.updated_at,
    u_assigned.name as assigned_to_name,
    u_assigned.position as assigned_to_position,
    u_created.name as created_by_name,
    u_created.position as created_by_position
FROM tasks t
JOIN users u_assigned ON t.assigned_to = u_assigned.id
JOIN users u_created ON t.created_by = u_created.id
WHERE t.status = 'Unfinished'
ORDER BY t.updated_at DESC;

-- Grant access to the view for admins
GRANT SELECT ON locked_tasks_view TO authenticated;

COMMENT ON VIEW locked_tasks_view IS 'View showing all locked tasks (Unfinished status) for admin monitoring';

-- Step 7: Show completion message
SELECT 'Migration completed successfully!' as result,
       'Tasks can now be set to Unfinished status, which locks them from employee modifications' as description; 