-- Admin Notification System (Fixed Version)
-- =====================================================

-- Admin Notifications Table
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'check_in', 'check_out', 'break_start', 'break_end', 
        'task_completed', 'task_assigned', 'overtime_started', 
        'shift_delayed', 'performance_rating', 'new_employee'
    )),
    event_data JSONB DEFAULT '{}',
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Admin Notification Settings Table
CREATE TABLE IF NOT EXISTS admin_notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    check_in_notifications BOOLEAN DEFAULT TRUE,
    check_out_notifications BOOLEAN DEFAULT TRUE,
    break_notifications BOOLEAN DEFAULT FALSE,
    task_notifications BOOLEAN DEFAULT TRUE,
    overtime_notifications BOOLEAN DEFAULT TRUE,
    delay_notifications BOOLEAN DEFAULT TRUE,
    performance_notifications BOOLEAN DEFAULT TRUE,
    new_employee_notifications BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance (IF NOT EXISTS)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_admin_notifications_admin_id') THEN
        CREATE INDEX idx_admin_notifications_admin_id ON admin_notifications(admin_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_admin_notifications_employee_id') THEN
        CREATE INDEX idx_admin_notifications_employee_id ON admin_notifications(employee_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_admin_notifications_event_type') THEN
        CREATE INDEX idx_admin_notifications_event_type ON admin_notifications(event_type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_admin_notifications_is_read') THEN
        CREATE INDEX idx_admin_notifications_is_read ON admin_notifications(is_read);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_admin_notifications_created_at') THEN
        CREATE INDEX idx_admin_notifications_created_at ON admin_notifications(created_at);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_admin_notifications_priority') THEN
        CREATE INDEX idx_admin_notifications_priority ON admin_notifications(priority);
    END IF;
END $$;

-- Function to automatically create notification settings for new managers
CREATE OR REPLACE FUNCTION create_manager_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IN ('admin', 'customer_retention_manager', 'content_creative_manager', 'it_manager', 'executive_director') THEN
        INSERT INTO admin_notification_settings (admin_id)
        VALUES (NEW.id)
        ON CONFLICT (admin_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_create_manager_notification_settings ON users;
CREATE TRIGGER trigger_create_manager_notification_settings
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_manager_notification_settings();

-- Function to get team members for a specific manager
CREATE OR REPLACE FUNCTION get_manager_team_members(manager_id UUID)
RETURNS TABLE(employee_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id
    FROM users u
    WHERE 
        -- Admin sees all employees except other admins
        (manager_id IN (SELECT id FROM users WHERE role = 'admin') AND u.role != 'admin')
        OR
        -- Customer Retention Manager sees Customer Retention team and Warehouse Staff
        (manager_id IN (SELECT id FROM users WHERE role = 'customer_retention_manager') AND u.role IN ('customer_retention', 'warehouse'))
        OR
        -- Content Creative Manager sees Content Creative team
        (manager_id IN (SELECT id FROM users WHERE role = 'content_creative_manager') AND u.role = 'content_creative')
        OR
        -- IT Manager sees IT team
        (manager_id IN (SELECT id FROM users WHERE role = 'it_manager') AND u.role = 'it')
        OR
        -- Executive Director sees all employees except other executive directors
        (manager_id IN (SELECT id FROM users WHERE role = 'executive_director') AND u.role != 'executive_director');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify managers about their team events only
CREATE OR REPLACE FUNCTION notify_managers_about_team_event(
    employee_id UUID,
    event_type TEXT,
    event_data JSONB DEFAULT '{}',
    priority TEXT DEFAULT 'medium'
)
RETURNS VOID AS $$
DECLARE
    manager_record RECORD;
    employee_name TEXT;
    is_team_member BOOLEAN;
BEGIN
    -- Get employee name
    SELECT name INTO employee_name FROM users WHERE id = employee_id;
    
    -- Notify only managers who have this employee in their team
    FOR manager_record IN 
        SELECT id FROM users WHERE role IN ('admin', 'customer_retention_manager', 'content_creative_manager', 'it_manager', 'executive_director')
    LOOP
        -- Check if employee is in this manager's team
        SELECT EXISTS(
            SELECT 1 FROM get_manager_team_members(manager_record.id) 
            WHERE employee_id = notify_managers_about_team_event.employee_id
        ) INTO is_team_member;
        
        -- Only notify if employee is in manager's team
        IF is_team_member THEN
            -- Check if manager has notifications enabled for this event type
            IF EXISTS (
                SELECT 1 FROM admin_notification_settings 
                WHERE admin_id = manager_record.id 
                AND (
                    (event_type = 'check_in' AND check_in_notifications = TRUE) OR
                    (event_type = 'check_out' AND check_out_notifications = TRUE) OR
                    (event_type IN ('break_start', 'break_end') AND break_notifications = TRUE) OR
                    (event_type IN ('task_completed', 'task_assigned') AND task_notifications = TRUE) OR
                    (event_type = 'overtime_started' AND overtime_notifications = TRUE) OR
                    (event_type = 'shift_delayed' AND delay_notifications = TRUE) OR
                    (event_type = 'performance_rating' AND performance_notifications = TRUE) OR
                    (event_type = 'new_employee' AND new_employee_notifications = TRUE)
                )
            ) THEN
                -- Create notification message
                INSERT INTO admin_notifications (
                    admin_id, 
                    employee_id, 
                    employee_name, 
                    event_type, 
                    event_data, 
                    message, 
                    priority
                ) VALUES (
                    manager_record.id,
                    employee_id,
                    COALESCE(employee_name, 'Unknown Employee'),
                    event_type,
                    event_data,
                    CASE event_type
                        WHEN 'check_in' THEN COALESCE(employee_name, 'Unknown Employee') || ' has checked in'
                        WHEN 'check_out' THEN COALESCE(employee_name, 'Unknown Employee') || ' has checked out'
                        WHEN 'break_start' THEN COALESCE(employee_name, 'Unknown Employee') || ' has started their break'
                        WHEN 'break_end' THEN COALESCE(employee_name, 'Unknown Employee') || ' has ended their break'
                        WHEN 'task_completed' THEN COALESCE(employee_name, 'Unknown Employee') || ' has completed a task'
                        WHEN 'task_assigned' THEN 'New task assigned to ' || COALESCE(employee_name, 'Unknown Employee')
                        WHEN 'overtime_started' THEN COALESCE(employee_name, 'Unknown Employee') || ' has started overtime'
                        WHEN 'shift_delayed' THEN COALESCE(employee_name, 'Unknown Employee') || ' is delayed for their shift'
                        WHEN 'performance_rating' THEN 'New performance rating for ' || COALESCE(employee_name, 'Unknown Employee')
                        WHEN 'new_employee' THEN 'New employee ' || COALESCE(employee_name, 'Unknown Employee') || ' has joined the team'
                        ELSE COALESCE(employee_name, 'Unknown Employee') || ' - ' || event_type
                    END,
                    priority
                );
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get admin notifications with pagination
CREATE OR REPLACE FUNCTION get_admin_notifications(
    admin_id UUID,
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0,
    unread_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    id UUID,
    employee_id UUID,
    employee_name TEXT,
    event_type TEXT,
    event_data JSONB,
    message TEXT,
    is_read BOOLEAN,
    priority TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        an.id,
        an.employee_id,
        an.employee_name,
        an.event_type,
        an.event_data,
        an.message,
        an.is_read,
        an.priority,
        an.created_at
    FROM admin_notifications an
    WHERE an.admin_id = get_admin_notifications.admin_id
    AND (NOT unread_only OR an.is_read = FALSE)
    ORDER BY an.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count for admin
CREATE OR REPLACE FUNCTION get_admin_unread_count(admin_id UUID)
RETURNS INTEGER AS $$
DECLARE
    count_result INTEGER;
BEGIN
    SELECT COUNT(*) INTO count_result
    FROM admin_notifications
    WHERE admin_id = get_admin_unread_count.admin_id
    AND is_read = FALSE;
    
    RETURN count_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on tables
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notification_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    -- Drop admin_notifications policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_notifications' AND policyname = 'Admins can view their own notifications') THEN
        DROP POLICY "Admins can view their own notifications" ON admin_notifications;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_notifications' AND policyname = 'Admins can update their own notifications') THEN
        DROP POLICY "Admins can update their own notifications" ON admin_notifications;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_notifications' AND policyname = 'System can insert notifications') THEN
        DROP POLICY "System can insert notifications" ON admin_notifications;
    END IF;
    
    -- Drop admin_notification_settings policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_notification_settings' AND policyname = 'Admins can view their own notification settings') THEN
        DROP POLICY "Admins can view their own notification settings" ON admin_notification_settings;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_notification_settings' AND policyname = 'Admins can update their own notification settings') THEN
        DROP POLICY "Admins can update their own notification settings" ON admin_notification_settings;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_notification_settings' AND policyname = 'System can manage notification settings') THEN
        DROP POLICY "System can manage notification settings" ON admin_notification_settings;
    END IF;
END $$;

-- Create RLS Policies for admin_notifications
CREATE POLICY "Admins can view their own notifications" ON admin_notifications
    FOR SELECT USING (auth.uid() = admin_id);

CREATE POLICY "Admins can update their own notifications" ON admin_notifications
    FOR UPDATE USING (auth.uid() = admin_id);

CREATE POLICY "System can insert notifications" ON admin_notifications
    FOR INSERT WITH CHECK (true);

-- Create RLS Policies for admin_notification_settings
CREATE POLICY "Admins can view their own notification settings" ON admin_notification_settings
    FOR SELECT USING (auth.uid() = admin_id);

CREATE POLICY "Admins can update their own notification settings" ON admin_notification_settings
    FOR UPDATE USING (auth.uid() = admin_id);

CREATE POLICY "System can manage notification settings" ON admin_notification_settings
    FOR ALL USING (true);

-- Cleanup function to remove old notifications
CREATE OR REPLACE FUNCTION cleanup_old_admin_notifications()
RETURNS VOID AS $$
BEGIN
    DELETE FROM admin_notifications 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON admin_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON admin_notification_settings TO authenticated;
GRANT EXECUTE ON FUNCTION notify_managers_about_team_event(UUID, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_manager_team_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_notifications(UUID, INTEGER, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_unread_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_admin_notifications() TO authenticated;

-- Insert default notification settings for existing managers
INSERT INTO admin_notification_settings (admin_id)
SELECT id FROM users WHERE role IN ('admin', 'customer_retention_manager', 'content_creative_manager', 'it_manager', 'executive_director')
ON CONFLICT (admin_id) DO NOTHING;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check if tables were created successfully
SELECT 'Admin notification system tables created successfully!' as status;

-- Show existing managers
SELECT 'Existing managers:' as info;
SELECT id, name, email, role FROM users WHERE role IN ('admin', 'customer_retention_manager', 'content_creative_manager', 'it_manager', 'executive_director');

-- Show notification settings for managers
SELECT 'Notification settings for managers:' as info;
SELECT 
    ans.admin_id,
    u.name as admin_name,
    ans.check_in_notifications,
    ans.check_out_notifications,
    ans.task_notifications,
    ans.overtime_notifications
FROM admin_notification_settings ans
JOIN users u ON ans.admin_id = u.id;

-- Test team member function for each manager type
SELECT 'Testing team member function:' as info;
SELECT 
    u.name as manager_name,
    u.role as manager_role,
    COUNT(tm.employee_id) as team_size
FROM users u
LEFT JOIN get_manager_team_members(u.id) tm ON true
WHERE u.role IN ('admin', 'customer_retention_manager', 'content_creative_manager', 'it_manager', 'executive_director')
GROUP BY u.id, u.name, u.role
ORDER BY u.role;
