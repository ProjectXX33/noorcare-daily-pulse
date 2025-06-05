-- Fix RLS Policies for admin_performance_dashboard table to allow employee self-recording
-- This allows employees to record their own performance data after checkout

-- First, check and drop existing problematic policies
DO $$ 
BEGIN
    -- Drop existing policies that might be blocking employee access
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_performance_dashboard' AND policyname = 'admin_performance_dashboard_admin_all') THEN
        DROP POLICY "admin_performance_dashboard_admin_all" ON public.admin_performance_dashboard;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_performance_dashboard' AND policyname = 'admin_performance_dashboard_employee_own') THEN
        DROP POLICY "admin_performance_dashboard_employee_own" ON public.admin_performance_dashboard;
    END IF;
    
    -- Note: We'll keep insert/update policies separate for clarity
END $$;

-- Enable RLS on the table
ALTER TABLE public.admin_performance_dashboard ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admins can do everything
CREATE POLICY "admin_performance_dashboard_admin_full_access"
ON public.admin_performance_dashboard
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    )
);

-- Policy 2: Employees can view their own performance data
CREATE POLICY "admin_performance_dashboard_employee_view_own"
ON public.admin_performance_dashboard
FOR SELECT
TO authenticated
USING (
    employee_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role = 'employee'
        AND users.position IN ('Customer Service', 'Designer')
    )
);

-- Policy 3: Employees can insert their own performance data (for checkout recording)
CREATE POLICY "admin_performance_dashboard_employee_insert_own"
ON public.admin_performance_dashboard
FOR INSERT
TO authenticated
WITH CHECK (
    employee_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role = 'employee'
        AND users.position IN ('Customer Service', 'Designer')
    )
);

-- Policy 4: Employees can update their own performance data (for checkout recording)
CREATE POLICY "admin_performance_dashboard_employee_update_own"
ON public.admin_performance_dashboard
FOR UPDATE
TO authenticated
USING (
    employee_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role = 'employee'
        AND users.position IN ('Customer Service', 'Designer')
    )
)
WITH CHECK (
    employee_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role = 'employee'
        AND users.position IN ('Customer Service', 'Designer')
    )
);

-- Verify policies are created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'admin_performance_dashboard'
ORDER BY policyname;

-- Test query to verify employee can insert (replace with actual employee ID for testing)
-- SELECT 
--     'Can employee insert performance data?' as test,
--     CASE 
--         WHEN EXISTS (
--             SELECT 1 FROM public.users 
--             WHERE users.id = auth.uid() 
--             AND users.role = 'employee'
--             AND users.position IN ('Customer Service', 'Designer')
--         ) THEN 'YES - Employee with correct position'
--         ELSE 'NO - Not authorized employee'
--     END as result; 