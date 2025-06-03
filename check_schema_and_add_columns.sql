-- Check Database Schema and Add Missing Columns
-- Run these commands in your Supabase SQL Editor

-- Step 1: Check current schema of users table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Step 2: Check if department column exists in users table
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'department'
) AS department_column_exists;

-- Step 3: Add department column to users table if it doesn't exist
-- (Run this only if the above query returns false)
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT;

-- Step 4: Add position column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS position TEXT;

-- Step 5: Set default values for existing users (adjust as needed)
-- Set all existing users to 'General' department initially
UPDATE users SET department = 'General' WHERE department IS NULL;
UPDATE users SET position = 'Customer Service' WHERE position IS NULL;

-- Step 6: Add CHECK constraints for the new columns
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_department_check;
ALTER TABLE users ADD CONSTRAINT users_department_check 
  CHECK (department IN ('Engineering', 'Medical', 'General', 'Management'));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_position_check;
ALTER TABLE users ADD CONSTRAINT users_position_check 
  CHECK (position IN ('Customer Service', 'Designer', 'Media Buyer', 'Copy Writing', 'Web Developer'));

-- Step 7: Check other tables that might need department column
-- Check work_reports table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'work_reports' 
ORDER BY ordinal_position;

-- Add department and position to work_reports if needed
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS position TEXT;

-- Add constraints to work_reports
ALTER TABLE work_reports DROP CONSTRAINT IF EXISTS work_reports_department_check;
ALTER TABLE work_reports ADD CONSTRAINT work_reports_department_check 
  CHECK (department IN ('Engineering', 'Medical', 'General', 'Management'));

ALTER TABLE work_reports DROP CONSTRAINT IF EXISTS work_reports_position_check;
ALTER TABLE work_reports ADD CONSTRAINT work_reports_position_check 
  CHECK (position IN ('Customer Service', 'Designer', 'Media Buyer', 'Copy Writing', 'Web Developer'));

-- Step 8: Check check_ins table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'check_ins' 
ORDER BY ordinal_position;

-- Step 9: Verify the final schema
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Step 10: Check current data
SELECT id, name, username, department, position FROM users LIMIT 10; 