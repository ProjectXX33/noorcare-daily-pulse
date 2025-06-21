-- Add Diamond Rank System
-- This adds a special "Diamond" rank that can only be assigned by admins
-- Diamond rank is the highest rank, above all performance-based rankings

-- 1. Add diamond_rank column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS diamond_rank BOOLEAN DEFAULT FALSE;

-- 2. Add diamond_rank_assigned_by column to track who assigned the rank
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS diamond_rank_assigned_by UUID REFERENCES users(id);

-- 3. Add diamond_rank_assigned_at column to track when it was assigned
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS diamond_rank_assigned_at TIMESTAMP WITH TIME ZONE;

-- 4. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_diamond_rank ON users(diamond_rank) WHERE diamond_rank = TRUE;

-- 5. Create a function to assign Diamond rank (admin only)
CREATE OR REPLACE FUNCTION assign_diamond_rank(
    target_employee_id UUID,
    admin_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    admin_role TEXT;
    employee_exists BOOLEAN;
BEGIN
    -- Check if the admin has admin role
    SELECT role INTO admin_role
    FROM users 
    WHERE id = admin_id;
    
    IF admin_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can assign Diamond rank';
    END IF;
    
    -- Check if target employee exists
    SELECT EXISTS(SELECT 1 FROM users WHERE id = target_employee_id) INTO employee_exists;
    
    IF NOT employee_exists THEN
        RAISE EXCEPTION 'Target employee does not exist';
    END IF;
    
    -- Assign Diamond rank
    UPDATE users 
    SET 
        diamond_rank = TRUE,
        diamond_rank_assigned_by = admin_id,
        diamond_rank_assigned_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = target_employee_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create a function to remove Diamond rank (admin only)
CREATE OR REPLACE FUNCTION remove_diamond_rank(
    target_employee_id UUID,
    admin_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    admin_role TEXT;
    employee_exists BOOLEAN;
BEGIN
    -- Check if the admin has admin role
    SELECT role INTO admin_role
    FROM users 
    WHERE id = admin_id;
    
    IF admin_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can remove Diamond rank';
    END IF;
    
    -- Check if target employee exists
    SELECT EXISTS(SELECT 1 FROM users WHERE id = target_employee_id) INTO employee_exists;
    
    IF NOT employee_exists THEN
        RAISE EXCEPTION 'Target employee does not exist';
    END IF;
    
    -- Remove Diamond rank
    UPDATE users 
    SET 
        diamond_rank = FALSE,
        diamond_rank_assigned_by = NULL,
        diamond_rank_assigned_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = target_employee_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create a view to get Diamond ranked employees with admin details
CREATE OR REPLACE VIEW diamond_employees AS
SELECT 
    u.id,
    u.name,
    u.username,
    u.email,
    u.position,
    u.department,
    u.diamond_rank_assigned_at,
    admin.name as assigned_by_name,
    admin.username as assigned_by_username
FROM users u
LEFT JOIN users admin ON u.diamond_rank_assigned_by = admin.id
WHERE u.diamond_rank = TRUE
ORDER BY u.diamond_rank_assigned_at DESC;

-- 8. Grant permissions to authenticated users to view the diamond_employees view
GRANT SELECT ON diamond_employees TO authenticated;

-- 9. Enable RLS for the new columns (they inherit from users table RLS)
-- No additional RLS needed as the diamond_rank column is part of users table

-- 10. Create notification function for Diamond rank assignment
CREATE OR REPLACE FUNCTION notify_diamond_rank_assignment(
    employee_id UUID,
    admin_id UUID,
    action TEXT -- 'assigned' or 'removed'
) RETURNS VOID AS $$
DECLARE
    employee_name TEXT;
    admin_name TEXT;
    notification_title TEXT;
    notification_message TEXT;
BEGIN
    -- Get employee and admin names
    SELECT name INTO employee_name FROM users WHERE id = employee_id;
    SELECT name INTO admin_name FROM users WHERE id = admin_id;
    
    IF action = 'assigned' THEN
        notification_title := '💎 Diamond Rank Assigned!';
        notification_message := E'🎉 Congratulations! You have been awarded the prestigious Diamond Rank!\n\n💎 This is the highest honor in our performance system\n🏆 You are now a Diamond-level performer\n👤 Assigned by: ' || admin_name || E'\n📅 Date: ' || TO_CHAR(CURRENT_TIMESTAMP, 'DD/MM/YYYY HH24:MI') || E'\n\n✨ Keep up the exceptional work!';
    ELSE
        notification_title := '💎 Diamond Rank Removed';
        notification_message := E'📢 Your Diamond Rank has been removed.\n\n👤 Removed by: ' || admin_name || E'\n📅 Date: ' || TO_CHAR(CURRENT_TIMESTAMP, 'DD/MM/YYYY HH24:MI') || E'\n\nYou can still earn it back through exceptional performance!';
    END IF;
    
    -- Insert notification
    INSERT INTO notifications (
        user_id,
        title,
        message,
        created_by,
        created_at
    ) VALUES (
        employee_id,
        notification_title,
        notification_message,
        admin_id,
        CURRENT_TIMESTAMP
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Test the functions (uncomment to test with actual admin/employee IDs)
-- SELECT assign_diamond_rank('employee-uuid-here', 'admin-uuid-here');
-- SELECT remove_diamond_rank('employee-uuid-here', 'admin-uuid-here');

-- 12. Check Diamond employees
SELECT 
    'Diamond Rank System installed successfully!' as status,
    COUNT(*) as current_diamond_employees
FROM users 
WHERE diamond_rank = TRUE;

COMMENT ON COLUMN users.diamond_rank IS 'Special Diamond rank that can only be assigned by admins - highest rank in the system';
COMMENT ON COLUMN users.diamond_rank_assigned_by IS 'Admin who assigned the Diamond rank';
COMMENT ON COLUMN users.diamond_rank_assigned_at IS 'Timestamp when Diamond rank was assigned';
COMMENT ON FUNCTION assign_diamond_rank IS 'Assigns Diamond rank to an employee (admin only)';
COMMENT ON FUNCTION remove_diamond_rank IS 'Removes Diamond rank from an employee (admin only)';
COMMENT ON VIEW diamond_employees IS 'View of all employees with Diamond rank and assignment details'; 