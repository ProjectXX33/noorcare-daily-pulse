-- Supabase SQL Commands to Update Department Values
-- Run these commands in your Supabase SQL Editor

-- Step 1: Update CHECK constraints for department field
-- Drop existing constraint if it exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_department_check;

-- Add new constraint with updated department values
ALTER TABLE users ADD CONSTRAINT users_department_check 
  CHECK (department IN ('Engineering', 'Medical', 'General', 'Management'));

-- Step 2: Update existing data to match new department values
-- Map old values to new ones:

-- Update 'Engineer' to 'Engineering'
UPDATE users SET department = 'Engineering' WHERE department = 'Engineer';

-- Update 'Doctor' to 'Medical'
UPDATE users SET department = 'Medical' WHERE department = 'Doctor';

-- Update 'Manager' to 'Management'
UPDATE users SET department = 'Management' WHERE department = 'Manager';

-- Update 'IT' to 'General'
UPDATE users SET department = 'General' WHERE department = 'IT';

-- 'General' stays the same (no update needed)
-- 'Engineering' stays the same if already exists

-- Step 3: Update other tables that might have department columns
-- For work_reports table:
ALTER TABLE work_reports DROP CONSTRAINT IF EXISTS work_reports_department_check;
ALTER TABLE work_reports ADD CONSTRAINT work_reports_department_check 
  CHECK (department IN ('Engineering', 'Medical', 'General', 'Management'));

-- Update work_reports data
UPDATE work_reports SET department = 'Engineering' WHERE department = 'Engineer';
UPDATE work_reports SET department = 'Medical' WHERE department = 'Doctor';
UPDATE work_reports SET department = 'Management' WHERE department = 'Manager';
UPDATE work_reports SET department = 'General' WHERE department = 'IT';

-- For check_ins table (if it has department column):
-- First check if the column exists and has constraints
-- ALTER TABLE check_ins DROP CONSTRAINT IF EXISTS check_ins_department_check;
-- ALTER TABLE check_ins ADD CONSTRAINT check_ins_department_check 
--   CHECK (department IN ('Engineering', 'Medical', 'General', 'Management'));

-- Update check_ins data if needed
-- UPDATE check_ins SET department = 'Engineering' WHERE department = 'Engineer';
-- UPDATE check_ins SET department = 'Medical' WHERE department = 'Doctor';
-- UPDATE check_ins SET department = 'Management' WHERE department = 'Manager';
-- UPDATE check_ins SET department = 'General' WHERE department = 'IT';

-- Step 4: Verify the changes
SELECT DISTINCT department FROM users ORDER BY department;
SELECT DISTINCT department FROM work_reports ORDER BY department;

-- Step 5: Optional - View updated user data
SELECT id, name, department, position FROM users ORDER BY department, name;

UPDATE users SET department = 'Engineering' WHERE name = 'John Doe';
UPDATE users SET department = 'Medical' WHERE name = 'Dr. Smith';
UPDATE users SET department = 'Management' WHERE name = 'Manager Name'; 