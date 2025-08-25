-- Fix Foreign Key Constraint for User Deletion
-- This script fixes the issue where users cannot be deleted due to foreign key constraints

-- =====================================================
-- DYNAMICALLY FIX ALL FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Create a function to fix all foreign key constraints that reference users table
CREATE OR REPLACE FUNCTION fix_all_user_foreign_keys()
RETURNS void AS $$
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
END;
$$ LANGUAGE plpgsql;

-- Execute the function to fix all constraints
SELECT fix_all_user_foreign_keys();

-- Drop the function after use
DROP FUNCTION fix_all_user_foreign_keys();

-- =====================================================
-- VERIFICATION
-- =====================================================

-- List all foreign key constraints that reference the users table
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
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

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT '✅ All foreign key constraints have been fixed! Users can now be deleted.' as status;
