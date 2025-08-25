-- Specific Fix for Compensation Foreign Key Constraints
-- This script targets all compensation-related tables that prevent user deletion

-- =====================================================
-- 1. IDENTIFY ALL COMPENSATION-RELATED TABLES
-- =====================================================

-- Show all tables that contain 'compensation' in their name
SELECT 'Tables containing compensation:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%compensation%' 
AND table_schema = 'public'
ORDER BY table_name;

-- =====================================================
-- 2. FIX SPECIFIC COMPENSATION TABLE CONSTRAINTS
-- =====================================================

-- Fix compensation_... table constraints
DO $$
DECLARE
    constraint_record RECORD;
    table_name TEXT;
    constraint_name TEXT;
    column_name TEXT;
BEGIN
    -- Loop through all foreign key constraints in compensation-related tables
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
            AND tc.table_name LIKE '%compensation%'
            AND rc.delete_rule != 'CASCADE'
    LOOP
        table_name := constraint_record.table_name;
        constraint_name := constraint_record.constraint_name;
        column_name := constraint_record.column_name;
        
        RAISE NOTICE 'Fixing compensation constraint % on table % (column: %)', constraint_name, table_name, column_name;
        
        -- Drop the existing constraint
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', table_name, constraint_name);
        
        -- Add new constraint with CASCADE DELETE
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES users(id) ON DELETE CASCADE', 
                      table_name, constraint_name, column_name);
        
        RAISE NOTICE '✅ Fixed compensation constraint % on table %', constraint_name, table_name;
    END LOOP;
    
    RAISE NOTICE '✅ All compensation foreign key constraints have been updated with CASCADE DELETE';
END $$;

-- =====================================================
-- 3. FIX EMPLOYEE-RELATED TABLE CONSTRAINTS
-- =====================================================

-- Fix employee_... table constraints
DO $$
DECLARE
    constraint_record RECORD;
    table_name TEXT;
    constraint_name TEXT;
    column_name TEXT;
BEGIN
    -- Loop through all foreign key constraints in employee-related tables
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
            AND tc.table_name LIKE '%employee%'
            AND rc.delete_rule != 'CASCADE'
    LOOP
        table_name := constraint_record.table_name;
        constraint_name := constraint_record.constraint_name;
        column_name := constraint_record.column_name;
        
        RAISE NOTICE 'Fixing employee constraint % on table % (column: %)', constraint_name, table_name, column_name;
        
        -- Drop the existing constraint
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', table_name, constraint_name);
        
        -- Add new constraint with CASCADE DELETE
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES users(id) ON DELETE CASCADE', 
                      table_name, constraint_name, column_name);
        
        RAISE NOTICE '✅ Fixed employee constraint % on table %', constraint_name, table_name;
    END LOOP;
    
    RAISE NOTICE '✅ All employee foreign key constraints have been updated with CASCADE DELETE';
END $$;

-- =====================================================
-- 4. FIX ALL REMAINING FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Fix ALL remaining foreign key constraints that prevent user deletion
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
-- 5. VERIFICATION - SHOW ALL CONSTRAINTS
-- =====================================================

-- Show all foreign key constraints that reference users
SELECT 'All foreign key constraints referencing users:' as info;
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

-- =====================================================
-- 6. TEST USER DELETION
-- =====================================================

-- Show a sample user that can be deleted for testing
SELECT 'Sample users for deletion test:' as info;
SELECT 
    id,
    name,
    email,
    "position",
    role
FROM users 
WHERE role = 'employee' 
AND name NOT LIKE '[DEACTIVATED]%'
LIMIT 3;

-- =====================================================
-- 7. SUCCESS MESSAGE
-- =====================================================

SELECT '✅ All compensation and employee constraints fixed! You should now be able to delete users.' as status;
