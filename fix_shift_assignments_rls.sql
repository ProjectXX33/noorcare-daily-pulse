-- Fix shift_assignments RLS policies to prevent 406 errors during checkout

-- Drop existing problematic policies
DROP POLICY IF EXISTS "shift_assignments_admin_all" ON shift_assignments;
DROP POLICY IF EXISTS "shift_assignments_employee_view" ON shift_assignments;
DROP POLICY IF EXISTS "shift_assignments_select" ON shift_assignments;
DROP POLICY IF EXISTS "shift_assignments_insert" ON shift_assignments;
DROP POLICY IF EXISTS "shift_assignments_update" ON shift_assignments;
DROP POLICY IF EXISTS "shift_assignments_delete" ON shift_assignments;

-- Create more permissive policies that work for system operations

-- 1. Allow admins to do everything
CREATE POLICY "shift_assignments_admin_full_access" ON shift_assignments
FOR ALL 
TO authenticated
USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- 2. Allow employees to view their own shift assignments
CREATE POLICY "shift_assignments_employee_view_own" ON shift_assignments
FOR SELECT 
TO authenticated
USING (
    employee_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- 3. Allow system to read shift assignments for checkout operations
CREATE POLICY "shift_assignments_system_read" ON shift_assignments
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND position IN ('Customer Service', 'Designer')
    )
);

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'shift_assignments'
ORDER BY policyname; 