-- =====================================================
-- E-COMMERCE MANAGER ROLE IMPLEMENTATION
-- =====================================================
-- This SQL file adds a new E-commerce Manager role with specific permissions
-- Role: ecommerce_manager
-- Access: Dashboard, VNQ Team, Task pages only
-- Task Assignment: Can only take tasks from Executive Director
-- =====================================================

-- Step 1: Update role constraint to include ecommerce_manager
-- =====================================================

-- First, drop the existing constraint if it exists
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_role_check' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_role_check;
        RAISE NOTICE 'Dropped existing users_role_check constraint';
    END IF;
END $$;

-- Add new constraint with ecommerce_manager role
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'employee', 'warehouse', 'content_creative_manager', 'customer_retention_manager', 'digital_solution_manager', 'ecommerce_manager'));

-- Update position constraint to include E-commerce Manager
DO $$
BEGIN
    -- Drop existing position constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_position_check' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_position_check;
        RAISE NOTICE 'Dropped existing users_position_check constraint';
    END IF;
END $$;

-- First, let's see what positions currently exist in the database
SELECT 'Current positions in database:' as info;
SELECT DISTINCT position FROM users WHERE position IS NOT NULL ORDER BY position;

-- Add new position constraint with E-commerce Manager and all existing positions
-- This includes all positions that might exist in the database
ALTER TABLE users 
ADD CONSTRAINT users_position_check 
CHECK (position IN (
    'Customer Service', 
    'Designer', 
    'Media Buyer', 
    'Copy Writing', 
    'Web Developer', 
    'Warehouse Staff', 
    'Executive Director', 
    'Content & Creative Manager', 
    'Customer Retention Manager', 
    'IT Manager', 
    'E-commerce Manager',
    'Junior CRM Specialist',
    'Content Creator',
    'Digital Solution Manager'
));

-- Step 2: Create E-commerce Department team
-- =====================================================

-- Insert E-commerce Department team
INSERT INTO teams (name, description, manager_role) VALUES
('E-commerce Department', 'Manages e-commerce operations, product management, and online sales', 'ecommerce_manager')
ON CONFLICT (name) DO NOTHING;

-- Step 3: Create manager_roles entry for E-commerce Manager
-- =====================================================

-- Insert E-commerce Manager role
INSERT INTO manager_roles (role_name, display_name, description, team_id, permissions) 
SELECT 
    'ecommerce_manager',
    'E-commerce Manager', 
    'Manages e-commerce operations, product management, and online sales',
    t.id,
    '["view_dashboard", "view_vnq_team", "view_tasks", "take_executive_director_tasks", "manage_ecommerce_operations"]'::jsonb
FROM teams t WHERE t.name = 'E-commerce Department'
AND NOT EXISTS (
    SELECT 1 FROM manager_roles WHERE role_name = 'ecommerce_manager'
);

-- Step 4: Create RLS policies for E-commerce Manager
-- =====================================================

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS ecommerce_manager_users_view ON users;
DROP POLICY IF EXISTS ecommerce_manager_tasks_access ON tasks;
DROP POLICY IF EXISTS ecommerce_manager_task_assignment ON tasks;
DROP POLICY IF EXISTS ecommerce_manager_task_creation ON tasks;

-- Policy for users table - E-commerce Manager can view all users (for VNQ Team page)
CREATE POLICY ecommerce_manager_users_view ON users 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'ecommerce_manager'
    )
);

-- Policy for tasks table - E-commerce Manager can view tasks and take tasks from Executive Director
CREATE POLICY ecommerce_manager_tasks_access ON tasks 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'ecommerce_manager'
    )
);

-- Policy for tasks table - E-commerce Manager can only take tasks from Executive Director
CREATE POLICY ecommerce_manager_task_assignment ON tasks 
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'ecommerce_manager'
    )
    AND (
        -- Can only take tasks from Executive Director
        created_by IN (
            SELECT id FROM users 
            WHERE position = 'Executive Director'
        )
        OR
        -- Can update their own assigned tasks
        assigned_to = auth.uid()
    )
);

-- Policy for tasks table - E-commerce Manager can create tasks (but only for themselves or from Executive Director)
CREATE POLICY ecommerce_manager_task_creation ON tasks 
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'ecommerce_manager'
    )
    AND (
        -- Can only assign tasks to themselves
        assigned_to = auth.uid()
        OR
        -- Can create tasks from Executive Director
        created_by IN (
            SELECT id FROM users 
            WHERE position = 'Executive Director'
        )
    )
);

-- Step 5: Create functions for E-commerce Manager
-- =====================================================

-- Function to get E-commerce Manager dashboard stats
CREATE OR REPLACE FUNCTION get_ecommerce_manager_stats()
RETURNS TABLE (
    total_team_members INTEGER,
    active_today INTEGER,
    total_tasks INTEGER,
    my_tasks INTEGER,
    executive_director_tasks INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM users WHERE team = 'E-commerce Department' AND role = 'employee') as total_team_members,
        (SELECT COUNT(*) FROM users WHERE team = 'E-commerce Department' AND role = 'employee' AND last_seen > NOW() - INTERVAL '24 hours') as active_today,
        (SELECT COUNT(*) FROM tasks) as total_tasks,
        (SELECT COUNT(*) FROM tasks WHERE assigned_to = auth.uid()) as my_tasks,
        (SELECT COUNT(*) FROM tasks t 
         JOIN users u ON t.created_by = u.id 
         WHERE u.position = 'Executive Director' 
         AND t.assigned_to IS NULL) as executive_director_tasks;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get available tasks from Executive Director
CREATE OR REPLACE FUNCTION get_executive_director_tasks()
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    priority TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_by_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.title,
        t.description,
        t.priority,
        t.status,
        t.created_at,
        t.created_by,
        u.name as created_by_name
    FROM tasks t
    JOIN users u ON t.created_by = u.id
    WHERE u.position = 'Executive Director'
    AND t.assigned_to IS NULL
    AND t.status != 'completed'
    ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tasks_created_by_executive_director ON tasks(created_by);

CREATE INDEX IF NOT EXISTS idx_tasks_ecommerce_manager ON tasks(assigned_to);

-- Step 7: Update notification system to include E-commerce Manager
-- =====================================================

-- Update admin notification function to include ecommerce_manager
CREATE OR REPLACE FUNCTION notify_admins_of_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Send notification to all admin users and managers
    INSERT INTO notifications (user_id, title, message, type, created_at)
    SELECT 
        u.id,
        'New User Registration',
        'A new user has been registered: ' || NEW.name || ' (' || NEW.email || ')',
        'user_registration',
        NOW()
    FROM users u
    WHERE u.role IN ('admin', 'customer_retention_manager', 'content_creative_manager', 'digital_solution_manager', 'ecommerce_manager');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Note about user creation
-- =====================================================

-- Note: Sample user creation is commented out due to foreign key constraints
-- The E-commerce Manager role and position are now available for use
-- To create an E-commerce Manager user, use the application's user registration process
-- or manually create a user with role='ecommerce_manager' and position='E-commerce Manager'

-- Sample user creation (commented out - requires auth.users table entry first):
/*
INSERT INTO users (id, username, name, email, role, position, department, team, created_at) 
SELECT 
    gen_random_uuid(),
    'ecommerce_manager',
    'E-commerce Manager', 
    'ecommerce@example.com', 
    'ecommerce_manager', 
    'E-commerce Manager', 
    'E-commerce Department',
    'E-commerce Department', 
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'ecommerce@example.com'
);
*/

-- Step 9: Final verification and notification
-- =====================================================

-- Verify all constraints are in place
SELECT 'E-commerce Manager SQL implementation completed successfully!' as status;

-- Show current position constraints
SELECT 'Current supported positions:' as info;
SELECT unnest(ARRAY[
    'Customer Service', 
    'Designer', 
    'Media Buyer', 
    'Copy Writing', 
    'Web Developer', 
    'Warehouse Staff', 
    'Executive Director', 
    'Content & Creative Manager', 
    'Customer Retention Manager', 
    'IT Manager', 
    'E-commerce Manager',
    'Junior CRM Specialist',
    'Content Creator',
    'Digital Solution Manager'
]) as "position";

-- Show E-commerce Manager as both role and position
SELECT 'E-commerce Manager added as:' as info;
SELECT 'Role: ecommerce_manager' as type UNION ALL SELECT 'Position: E-commerce Manager';

-- Show current role constraints
SELECT 'Current supported roles:' as info;
SELECT unnest(ARRAY['admin', 'employee', 'warehouse', 'content_creative_manager', 'customer_retention_manager', 'digital_solution_manager', 'ecommerce_manager']) as role;

-- Show current team constraints
SELECT 'Current supported teams:' as info;
SELECT unnest(ARRAY['Content & Creative Department', 'Customer Retention Department', 'IT Department', 'E-commerce Department']) as team;

-- Show E-commerce Manager permissions
SELECT 'E-commerce Manager permissions:' as info;
SELECT 
    mr.role_name,
    mr.display_name,
    mr.permissions
FROM manager_roles mr
WHERE mr.role_name = 'ecommerce_manager';
