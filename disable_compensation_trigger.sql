-- Temporarily Disable Compensation Trigger
-- This script disables the trigger that's causing the deletion error

-- =====================================================
-- 1. SHOW CURRENT TRIGGERS ON USERS TABLE
-- =====================================================

SELECT 'Current triggers on users table:' as info;
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name,
    CASE WHEN t.tgenabled = 'O' THEN 'Enabled' ELSE 'Disabled' END as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'users'
AND NOT t.tgisinternal
ORDER BY t.tgname;

-- =====================================================
-- 2. DISABLE ALL TRIGGERS ON USERS TABLE
-- =====================================================

-- Disable all triggers on the users table temporarily
ALTER TABLE users DISABLE TRIGGER ALL;

SELECT '✅ All triggers on users table have been disabled.' as status;

-- =====================================================
-- 3. VERIFY TRIGGERS ARE DISABLED
-- =====================================================

SELECT 'Verification - triggers should now be disabled:' as info;
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name,
    CASE WHEN t.tgenabled = 'O' THEN 'Enabled' ELSE 'Disabled' END as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'users'
AND NOT t.tgisinternal
ORDER BY t.tgname;

-- =====================================================
-- 4. NOW TRY DELETING USERS
-- =====================================================

SELECT 'Now you can try deleting users without trigger interference.' as instruction;
SELECT 'Run: DELETE FROM users WHERE id = ''user-id-here'';' as example;

-- =====================================================
-- 5. RE-ENABLE TRIGGERS (AFTER DELETION)
-- =====================================================

-- Uncomment the following line after you've deleted the users:
-- ALTER TABLE users ENABLE TRIGGER ALL;

SELECT '⚠️ Remember to re-enable triggers after deletion by running:' as reminder;
SELECT 'ALTER TABLE users ENABLE TRIGGER ALL;' as command;
