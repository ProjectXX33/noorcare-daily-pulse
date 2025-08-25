-- Admin Notification System
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

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin_id ON admin_notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_employee_id ON admin_notifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_event_type ON admin_notifications(event_type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_priority ON admin_notifications(priority);

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

-- Trigger to create notification settings for new managers
DROP TRIGGER IF EXISTS trigger_create_manager_notification_settings ON users;
CREATE TRIGGER trigger_create_manager_notification_settings
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_manager_notification_settings();

-- Function to notify all managers about team events
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
BEGIN
    -- Get employee name
    SELECT name INTO employee_name FROM users WHERE id = employee_id;
    
    -- Notify all managers
    FOR manager_record IN 
        SELECT id FROM users WHERE role IN ('admin', 'customer_retention_manager', 'content_creative_manager', 'it_manager', 'executive_director')
    LOOP
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

-- RLS Policies for admin_notifications
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Admins can see their own notifications
CREATE POLICY "Admins can view their own notifications" ON admin_notifications
    FOR SELECT USING (auth.uid() = admin_id);

-- Admins can update their own notifications (mark as read)
CREATE POLICY "Admins can update their own notifications" ON admin_notifications
    FOR UPDATE USING (auth.uid() = admin_id);

-- System can insert notifications for admins
CREATE POLICY "System can insert notifications" ON admin_notifications
    FOR INSERT WITH CHECK (true);

-- RLS Policies for admin_notification_settings
ALTER TABLE admin_notification_settings ENABLE ROW LEVEL SECURITY;

-- Admins can view their own settings
CREATE POLICY "Admins can view their own notification settings" ON admin_notification_settings
    FOR SELECT USING (auth.uid() = admin_id);

-- Admins can update their own settings
CREATE POLICY "Admins can update their own notification settings" ON admin_notification_settings
    FOR UPDATE USING (auth.uid() = admin_id);

-- System can insert/update settings
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

-- Create a scheduled job to cleanup old notifications (if using pg_cron)
-- SELECT cron.schedule('cleanup-admin-notifications', '0 2 * * *', 'SELECT cleanup_old_admin_notifications();');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON admin_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON admin_notification_settings TO authenticated;
GRANT EXECUTE ON FUNCTION notify_managers_about_team_event(UUID, TEXT, JSONB, TEXT) TO authenticated;
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
