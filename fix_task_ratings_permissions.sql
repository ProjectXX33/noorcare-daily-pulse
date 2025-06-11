-- Fix Task Ratings Permissions
-- This script updates the RLS policies to allow task creators and assignees to rate tasks

-- Drop ALL existing policies for both tables to avoid conflicts
DROP POLICY IF EXISTS employee_ratings_select ON employee_ratings;
DROP POLICY IF EXISTS employee_ratings_insert ON employee_ratings;
DROP POLICY IF EXISTS employee_ratings_update ON employee_ratings;
DROP POLICY IF EXISTS employee_ratings_delete ON employee_ratings;

DROP POLICY IF EXISTS task_ratings_select ON task_ratings;
DROP POLICY IF EXISTS task_ratings_insert ON task_ratings;
DROP POLICY IF EXISTS task_ratings_update ON task_ratings;
DROP POLICY IF EXISTS task_ratings_delete ON task_ratings;

-- Recreate employee_ratings policies
CREATE POLICY employee_ratings_select ON employee_ratings FOR SELECT USING (
    employee_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY employee_ratings_insert ON employee_ratings FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY employee_ratings_update ON employee_ratings FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY employee_ratings_delete ON employee_ratings FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Recreate task_ratings policies (FIXED to allow task creators and assignees)
CREATE POLICY task_ratings_select ON task_ratings FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM tasks t 
        WHERE t.id = task_id AND (
            t.assigned_to = auth.uid() OR 
            t.created_by = auth.uid() OR
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
        )
    )
);

CREATE POLICY task_ratings_insert ON task_ratings FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM tasks t 
        WHERE t.id = task_id AND (
            t.assigned_to = auth.uid() OR 
            t.created_by = auth.uid() OR
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
        )
    )
);

CREATE POLICY task_ratings_update ON task_ratings FOR UPDATE USING (
    rated_by = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY task_ratings_delete ON task_ratings FOR DELETE USING (
    rated_by = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('task_ratings', 'employee_ratings')
ORDER BY tablename, policyname; 