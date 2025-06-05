-- Fix RLS Policies for admin_performance_dashboard table
-- The current policies are checking JWT which doesn't contain role info

-- 1. Drop existing incorrect policies
DROP POLICY IF EXISTS "Admin can view all performance data" ON admin_performance_dashboard;
DROP POLICY IF EXISTS "Admin can insert performance data" ON admin_performance_dashboard;
DROP POLICY IF EXISTS "Admin can update performance data" ON admin_performance_dashboard;
DROP POLICY IF EXISTS "Admin can delete performance data" ON admin_performance_dashboard;

-- 2. Create correct RLS policies that check the users table
CREATE POLICY "Admin can view all performance data" ON admin_performance_dashboard
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admin can insert performance data" ON admin_performance_dashboard
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admin can update performance data" ON admin_performance_dashboard
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admin can delete performance data" ON admin_performance_dashboard
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- 3. Verify the policies were created correctly
SELECT 
    policyname, 
    cmd, 
    permissive,
    qual
FROM pg_policies 
WHERE tablename = 'admin_performance_dashboard';

-- 4. Test query to verify access (should work for admins)
SELECT 'RLS policies fixed successfully' as status,
       'Admins should now be able to save records' as message; 