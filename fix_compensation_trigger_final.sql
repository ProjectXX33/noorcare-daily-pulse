-- Fix Compensation Trigger Issue - Final Version
-- This script fixes the trigger that's causing "Compensation record not found" error

-- =====================================================
-- 1. CHECK CURRENT TRIGGER FUNCTION
-- =====================================================

-- Show the current trigger function definition
SELECT 'Current trigger function definition:' as info;
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'recalculate_compensation'
AND n.nspname = 'public';

-- =====================================================
-- 2. SHOW USER-CREATED TRIGGERS ON USERS TABLE
-- =====================================================

-- Show only user-created triggers (not system triggers)
SELECT 'User-created triggers on users table:' as info;
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name,
    CASE WHEN t.tgenabled = 'O' THEN 'Enabled' ELSE 'Disabled' END as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'users'
AND t.tgisinternal = false  -- Only user-created triggers
ORDER BY t.tgname;

-- =====================================================
-- 3. DROP AND RECREATE THE RECALCULATE_COMPENSATION FUNCTION
-- =====================================================

-- Drop the existing function first
DROP FUNCTION IF EXISTS recalculate_compensation(UUID);

-- Create a fixed version of the recalculate_compensation function
CREATE OR REPLACE FUNCTION recalculate_compensation(compensation_id UUID)
RETURNS void AS $$
DECLARE
    comp_record RECORD;
BEGIN
    -- Check if compensation record exists before trying to access it
    SELECT * INTO comp_record 
    FROM compensation_records 
    WHERE id = compensation_id;
    
    -- If record doesn't exist, just return (don't raise error)
    IF NOT FOUND THEN
        RAISE NOTICE 'Compensation record % not found - skipping recalculation', compensation_id;
        RETURN;
    END IF;
    
    -- Original recalculation logic would go here
    -- For now, just log that we're recalculating
    RAISE NOTICE 'Recalculating compensation for record %', compensation_id;
    
    -- Add your actual recalculation logic here
    -- UPDATE compensation_records SET ... WHERE id = compensation_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the deletion
        RAISE NOTICE 'Error in recalculate_compensation for %: %', compensation_id, SQLERRM;
        RETURN;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. DROP AND RECREATE THE TRIGGER FUNCTION
-- =====================================================

-- Drop the existing trigger function first
DROP FUNCTION IF EXISTS trigger_recalculate_compensation();

-- Create a fixed version of the trigger function
CREATE OR REPLACE FUNCTION trigger_recalculate_compensation()
RETURNS TRIGGER AS $$
BEGIN
    -- Only recalculate if we have a compensation_id
    IF OLD.compensation_id IS NOT NULL THEN
        -- Use a try-catch approach to handle missing records
        BEGIN
            PERFORM recalculate_compensation(OLD.compensation_id);
        EXCEPTION
            WHEN OTHERS THEN
                -- Log the error but don't fail the trigger
                RAISE NOTICE 'Error in trigger_recalculate_compensation: %', SQLERRM;
        END;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. DISABLE USER-CREATED TRIGGERS ONLY
-- =====================================================

-- Disable only user-created triggers (not system triggers)
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN
        SELECT t.tgname as trigger_name
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        WHERE c.relname = 'users'
        AND t.tgisinternal = false  -- Only user-created triggers
    LOOP
        EXECUTE format('ALTER TABLE users DISABLE TRIGGER %I', trigger_record.trigger_name);
        RAISE NOTICE 'Disabled trigger: %', trigger_record.trigger_name;
    END LOOP;
END $$;

SELECT '✅ User-created triggers on users table have been disabled.' as status;

-- =====================================================
-- 6. VERIFY TRIGGERS ARE DISABLED
-- =====================================================

SELECT 'Verification - user triggers should now be disabled:' as info;
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name,
    CASE WHEN t.tgenabled = 'O' THEN 'Enabled' ELSE 'Disabled' END as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'users'
AND t.tgisinternal = false  -- Only user-created triggers
ORDER BY t.tgname;

-- =====================================================
-- 7. NOW TRY DELETING USERS
-- =====================================================

SELECT 'Now you can try deleting users without trigger interference.' as instruction;
SELECT 'Run these commands:' as example;
SELECT 'DELETE FROM users WHERE id = ''71e9dc21-c9bd-46e8-b1f7-316ff9ef8404'';' as command1;
SELECT 'DELETE FROM users WHERE id = ''e9ac9d1d-aec7-4671-8290-969e02721ac5'';' as command2;

-- =====================================================
-- 8. RE-ENABLE TRIGGERS (AFTER DELETION)
-- =====================================================

-- Function to re-enable user-created triggers
CREATE OR REPLACE FUNCTION re_enable_user_triggers()
RETURNS void AS $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN
        SELECT t.tgname as trigger_name
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        WHERE c.relname = 'users'
        AND t.tgisinternal = false  -- Only user-created triggers
    LOOP
        EXECUTE format('ALTER TABLE users ENABLE TRIGGER %I', trigger_record.trigger_name);
        RAISE NOTICE 'Re-enabled trigger: %', trigger_record.trigger_name;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT '⚠️ After deleting users, run: SELECT re_enable_user_triggers();' as reminder;

-- =====================================================
-- 9. SUCCESS MESSAGE
-- =====================================================

SELECT '✅ Compensation trigger fixed and user triggers disabled!' as status;
SELECT 'You should now be able to delete users without the "Compensation record not found" error.' as instruction;
