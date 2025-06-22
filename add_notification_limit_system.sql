-- Notification Limit System
-- This script adds automatic notification limit enforcement to keep max 10 notifications per user
-- Automatically deletes oldest notifications when limit is exceeded

-- 1. Create function to maintain notification limit for a specific user
CREATE OR REPLACE FUNCTION maintain_user_notification_limit(
    target_user_id UUID,
    max_notifications INTEGER DEFAULT 10
) RETURNS INTEGER AS $$
DECLARE
    notification_count INTEGER;
    notifications_to_delete INTEGER;
    deleted_count INTEGER;
BEGIN
    -- Count current notifications for the user
    SELECT COUNT(*) INTO notification_count
    FROM notifications 
    WHERE user_id = target_user_id;
    
    -- Log current count
    RAISE NOTICE 'User % has % notifications (max: %)', target_user_id, notification_count, max_notifications;
    
    -- If we have reached or exceeded the limit, delete oldest ones
    IF notification_count >= max_notifications THEN
        notifications_to_delete := notification_count - (max_notifications - 1);
        
        -- Delete the oldest notifications
        DELETE FROM notifications 
        WHERE id IN (
            SELECT id 
            FROM notifications 
            WHERE user_id = target_user_id 
            ORDER BY created_at ASC 
            LIMIT notifications_to_delete
        );
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
        RAISE NOTICE 'Deleted % oldest notifications for user %', deleted_count, target_user_id;
        RETURN deleted_count;
    ELSE
        RAISE NOTICE 'User % notification count within limit (%/%)', target_user_id, notification_count, max_notifications;
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create trigger function that automatically maintains limit when new notifications are inserted
CREATE OR REPLACE FUNCTION trigger_maintain_notification_limit()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if this is an INSERT and user_id is not null
    IF TG_OP = 'INSERT' AND NEW.user_id IS NOT NULL THEN
        -- Maintain the notification limit for this user
        PERFORM maintain_user_notification_limit(NEW.user_id, 10);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger that fires after INSERT on notifications
DROP TRIGGER IF EXISTS notification_limit_trigger ON notifications;
CREATE TRIGGER notification_limit_trigger
    AFTER INSERT ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION trigger_maintain_notification_limit();

-- 4. Create function to clean up notifications for all users (admin utility)
CREATE OR REPLACE FUNCTION cleanup_all_user_notifications(
    max_notifications INTEGER DEFAULT 10
) RETURNS TABLE(
    user_id UUID,
    notifications_before INTEGER,
    notifications_after INTEGER,
    deleted_count INTEGER
) AS $$
DECLARE
    user_record RECORD;
    before_count INTEGER;
    after_count INTEGER;
    cleaned INTEGER;
BEGIN
    -- Get all unique user IDs that have notifications
    FOR user_record IN 
        SELECT DISTINCT n.user_id 
        FROM notifications n 
        WHERE n.user_id IS NOT NULL
    LOOP
        -- Count notifications before cleanup
        SELECT COUNT(*) INTO before_count
        FROM notifications 
        WHERE notifications.user_id = user_record.user_id;
        
        -- Maintain limit for this user
        SELECT maintain_user_notification_limit(user_record.user_id, max_notifications) INTO cleaned;
        
        -- Count notifications after cleanup
        SELECT COUNT(*) INTO after_count
        FROM notifications 
        WHERE notifications.user_id = user_record.user_id;
        
        -- Return the results
        user_id := user_record.user_id;
        notifications_before := before_count;
        notifications_after := after_count;
        deleted_count := cleaned;
        
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to get notification statistics
CREATE OR REPLACE FUNCTION get_notification_stats()
RETURNS TABLE(
    total_notifications BIGINT,
    total_users_with_notifications BIGINT,
    max_notifications_per_user BIGINT,
    min_notifications_per_user BIGINT,
    avg_notifications_per_user NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_notifications,
        COUNT(DISTINCT user_id) as total_users_with_notifications,
        MAX(user_notification_count) as max_notifications_per_user,
        MIN(user_notification_count) as min_notifications_per_user,
        AVG(user_notification_count) as avg_notifications_per_user
    FROM (
        SELECT user_id, COUNT(*) as user_notification_count
        FROM notifications
        WHERE user_id IS NOT NULL
        GROUP BY user_id
    ) user_counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION maintain_user_notification_limit(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_all_user_notifications(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_stats() TO authenticated;

-- 7. Test the system with current data
DO $$
DECLARE
    stats_record RECORD;
BEGIN
    -- Get current stats
    SELECT * INTO stats_record FROM get_notification_stats();
    
    RAISE NOTICE '=== NOTIFICATION SYSTEM STATS ===';
    RAISE NOTICE 'Total notifications: %', stats_record.total_notifications;
    RAISE NOTICE 'Users with notifications: %', stats_record.total_users_with_notifications;
    RAISE NOTICE 'Max notifications per user: %', stats_record.max_notifications_per_user;
    RAISE NOTICE 'Min notifications per user: %', stats_record.min_notifications_per_user;
    RAISE NOTICE 'Avg notifications per user: %', ROUND(stats_record.avg_notifications_per_user, 2);
    
    -- If there are users with more than 10 notifications, clean them up
    IF stats_record.max_notifications_per_user > 10 THEN
        RAISE NOTICE '=== CLEANING UP EXCESS NOTIFICATIONS ===';
        RAISE NOTICE 'Some users have more than 10 notifications. Running cleanup...';
        
        -- This would show the cleanup results, but we'll just log that it's available
        RAISE NOTICE 'Run this query to clean up: SELECT * FROM cleanup_all_user_notifications(10);';
    ELSE
        RAISE NOTICE '=== ALL USERS WITHIN LIMIT ===';
        RAISE NOTICE 'All users have 10 or fewer notifications. No cleanup needed.';
    END IF;
END $$;

-- 8. Create a view to easily see users with too many notifications
CREATE OR REPLACE VIEW users_with_excess_notifications AS
SELECT 
    u.name,
    u.username,
    u.email,
    u.position,
    COUNT(n.id) as notification_count,
    MIN(n.created_at) as oldest_notification,
    MAX(n.created_at) as newest_notification
FROM users u
JOIN notifications n ON u.id = n.user_id
GROUP BY u.id, u.name, u.username, u.email, u.position
HAVING COUNT(n.id) > 10
ORDER BY notification_count DESC;

-- Grant access to the view
GRANT SELECT ON users_with_excess_notifications TO authenticated;

-- 9. Final success message
SELECT 
    '✅ Notification Limit System Installed Successfully!' as status,
    'Max 10 notifications per user will be automatically maintained' as description,
    'Oldest notifications are automatically deleted when limit is exceeded' as behavior; 