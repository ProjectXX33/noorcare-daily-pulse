-- Check current employee and shift data
-- This script helps debug why employees and shifts aren't showing up

-- 1. Check all employees
SELECT 
  id, 
  name, 
  email, 
  role, 
  position, 
  team,
  created_at
FROM users 
WHERE role = 'employee'
ORDER BY name;

-- 2. Check all shifts
SELECT 
  id, 
  name, 
  start_time, 
  end_time, 
  position, 
  is_active,
  created_at
FROM shifts 
WHERE is_active = true
ORDER BY start_time;

-- 3. Check shift assignments for current week
SELECT 
  sa.id,
  sa.employee_id,
  sa.work_date,
  sa.assigned_shift_id,
  sa.is_day_off,
  u.name as employee_name,
  s.name as shift_name
FROM shift_assignments sa
LEFT JOIN users u ON sa.employee_id = u.id
LEFT JOIN shifts s ON sa.assigned_shift_id = s.id
WHERE sa.work_date >= CURRENT_DATE - INTERVAL '7 days'
  AND sa.work_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY sa.work_date, u.name;

-- 4. Check if there are any Junior CRM Specialists
SELECT 
  id, 
  name, 
  email, 
  role, 
  position, 
  team
FROM users 
WHERE position = 'Junior CRM Specialist'
ORDER BY name;

-- 5. Check teams table
SELECT * FROM teams ORDER BY name;
