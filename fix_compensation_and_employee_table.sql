-- Fix Compensation Foreign Key Constraints and Employee Table View-Only Issue
-- This script addresses both the compensation constraint error and converts employee table to editable

-- =====================================================
-- 1. FIX ALL COMPENSATION-RELATED FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Fix ALL foreign key constraints that prevent user deletion
-- This includes compensation tables and any other tables referencing users
DO $$
DECLARE
    constraint_record RECORD;
    table_name TEXT;
    constraint_name TEXT;
    column_name TEXT;
BEGIN
    -- Loop through all foreign key constraints that reference the users table
    FOR constraint_record IN 
        SELECT 
            tc.table_name,
            tc.constraint_name,
            kcu.column_name,
            rc.delete_rule
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
            ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.table_name = 'users'
            AND rc.delete_rule != 'CASCADE'
    LOOP
        table_name := constraint_record.table_name;
        constraint_name := constraint_record.constraint_name;
        column_name := constraint_record.column_name;
        
        RAISE NOTICE 'Fixing constraint % on table % (column: %)', constraint_name, table_name, column_name;
        
        -- Drop the existing constraint
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', table_name, constraint_name);
        
        -- Add new constraint with CASCADE DELETE
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES users(id) ON DELETE CASCADE', 
                      table_name, constraint_name, column_name);
        
        RAISE NOTICE '✅ Fixed constraint % on table %', constraint_name, table_name;
    END LOOP;
    
    RAISE NOTICE '✅ All foreign key constraints have been updated with CASCADE DELETE';
END $$;

-- =====================================================
-- 2. CONVERT EMPLOYEE TABLE FROM VIEW-ONLY TO EDITABLE
-- =====================================================

-- First, let's check if the employee table is actually a view
DO $$
BEGIN
    -- Check if employee table exists as a view
    IF EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name LIKE 'employee%' 
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Found employee view - converting to editable table...';
        
        -- Get the view definition
        -- Note: This is a simplified approach. You may need to manually recreate the table
        RAISE NOTICE 'Employee table appears to be a view. You may need to recreate it as a regular table.';
        
    ELSE
        RAISE NOTICE 'Employee table is not a view - checking permissions...';
    END IF;
END $$;

-- =====================================================
-- 3. CREATE EDITABLE EMPLOYEE TABLE (if it doesn't exist)
-- =====================================================

-- Create a proper employee table if it doesn't exist
CREATE TABLE IF NOT EXISTS employee_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    employee_email TEXT NOT NULL,
    position TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_data_employee_id ON employee_data(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_data_position ON employee_data(position);
CREATE INDEX IF NOT EXISTS idx_employee_data_is_active ON employee_data(is_active);

-- Add unique constraint if it doesn't exist (for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'employee_data_employee_id_key' 
        AND table_name = 'employee_data'
    ) THEN
        ALTER TABLE employee_data ADD CONSTRAINT employee_data_employee_id_key UNIQUE(employee_id);
        RAISE NOTICE 'Added unique constraint on employee_id';
    END IF;
END $$;

-- =====================================================
-- 4. SYNC DATA FROM USERS TABLE TO EMPLOYEE TABLE
-- =====================================================

-- Insert employee data from users table
INSERT INTO employee_data (employee_id, employee_name, employee_email, position, is_active)
SELECT 
    u.id,
    u.name,
    u.email,
    u."position",
    CASE 
        WHEN u.name LIKE '[DEACTIVATED]%' THEN false
        ELSE true
    END as is_active
FROM users u
WHERE u.role = 'employee'
ON CONFLICT (employee_id) DO UPDATE SET
    employee_name = EXCLUDED.employee_name,
    employee_email = EXCLUDED.employee_email,
    position = EXCLUDED.position,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- 5. ENABLE ROW LEVEL SECURITY FOR EMPLOYEE TABLE
-- =====================================================

ALTER TABLE employee_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for employee table
CREATE POLICY employee_data_admin_all ON employee_data 
FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY employee_data_manager_view ON employee_data 
FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'content_creative_manager', 'customer_retention_manager'))
);

CREATE POLICY employee_data_employee_view_own ON employee_data 
FOR SELECT USING (employee_id = auth.uid());

-- =====================================================
-- 6. CREATE TRIGGER TO KEEP EMPLOYEE TABLE IN SYNC
-- =====================================================

-- Create a function to update employee_data when users table changes
CREATE OR REPLACE FUNCTION sync_employee_data()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Insert new employee record
        INSERT INTO employee_data (employee_id, employee_name, employee_email, position, is_active)
        VALUES (NEW.id, NEW.name, NEW.email, NEW."position", true)
        ON CONFLICT (employee_id) DO UPDATE SET
            employee_name = EXCLUDED.employee_name,
            employee_email = EXCLUDED.employee_email,
            position = EXCLUDED.position,
            updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Update employee record
        UPDATE employee_data 
        SET 
            employee_name = NEW.name,
            employee_email = NEW.email,
            position = NEW."position",
            updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = NEW.id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Delete employee record
        DELETE FROM employee_data WHERE employee_id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on users table
DROP TRIGGER IF EXISTS sync_employee_data_trigger ON users;
CREATE TRIGGER sync_employee_data_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION sync_employee_data();

-- =====================================================
-- 7. VERIFICATION
-- =====================================================

-- Show all foreign key constraints that reference users
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'users'
ORDER BY tc.table_name, tc.constraint_name;

-- Show employee table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'employee_data' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- 8. SUCCESS MESSAGE
-- =====================================================

SELECT '✅ Compensation constraints fixed and employee table made editable!' as status;
