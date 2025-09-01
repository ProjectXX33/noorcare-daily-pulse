import { supabase } from '@/integrations/supabase/client';

export interface AdminNotification {
  id: string;
  admin_id: string;
  employee_id: string;
  employee_name: string;
  event_type: 'check_in' | 'check_out' | 'break_start' | 'break_end' | 'task_completed' | 'task_assigned' | 'overtime_started' | 'shift_delayed' | 'performance_rating' | 'new_employee';
  event_data: any;
  message: string;
  is_read: boolean;
  created_at: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface NotificationSettings {
  admin_id: string;
  check_in_notifications: boolean;
  check_out_notifications: boolean;
  break_notifications: boolean;
  task_notifications: boolean;
  overtime_notifications: boolean;
  delay_notifications: boolean;
  performance_notifications: boolean;
  new_employee_notifications: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
}

// Create manager notification for specific team member
export const createManagerNotification = async (
  managerId: string,
  employeeId: string,
  eventType: AdminNotification['event_type'],
  eventData: any,
  priority: AdminNotification['priority'] = 'medium'
): Promise<void> => {
  try {
    // Get employee name
    const { data: employee } = await supabase
      .from('users')
      .select('name')
      .eq('id', employeeId)
      .single();

    const employeeName = employee?.name || 'Unknown Employee';

    // Create notification message based on event type
    const messages = {
      check_in: `${employeeName} has checked in`,
      check_out: `${employeeName} has checked out`,
      break_start: `${employeeName} has started their break`,
      break_end: `${employeeName} has ended their break`,
      task_completed: `${employeeName} has completed a task`,
      task_assigned: `New task assigned to ${employeeName}`,
      overtime_started: `${employeeName} has started overtime`,
      shift_delayed: `${employeeName} is delayed for their shift`,
      performance_rating: `New performance rating for ${employeeName}`,
      new_employee: `New employee ${employeeName} has joined the team`
    };

    const message = messages[eventType] || `${employeeName} - ${eventType}`;

    // Insert notification
    const { error } = await supabase
      .from('admin_notifications')
      .insert({
        admin_id: managerId,
        employee_id: employeeId,
        employee_name: employeeName,
        event_type: eventType,
        event_data: eventData,
        message,
        is_read: false,
        priority
      });

    if (error) {
      console.error('❌ Error creating manager notification:', error);
    } else {
      console.log('✅ Manager notification created:', { managerId, employeeName, eventType });
    }
  } catch (error) {
    console.error('❌ Error in createManagerNotification:', error);
  }
};

// Get manager notifications
export const getManagerNotifications = async (
  managerId: string,
  limit: number = 50,
  unreadOnly: boolean = false
): Promise<AdminNotification[]> => {
  try {
    let query = supabase
      .from('admin_notifications')
      .select('*')
      .eq('admin_id', managerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching manager notifications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error in getManagerNotifications:', error);
    return [];
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  } catch (error) {
    console.error('❌ Error in markNotificationAsRead:', error);
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (managerId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('admin_id', managerId)
      .eq('is_read', false);

    if (error) {
      console.error('❌ Error marking all notifications as read:', error);
    }
  } catch (error) {
    console.error('❌ Error in markAllNotificationsAsRead:', error);
  }
};

// Get unread notification count
export const getUnreadNotificationCount = async (managerId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('admin_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('admin_id', managerId)
      .eq('is_read', false);

    if (error) {
      console.error('❌ Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('❌ Error in getUnreadNotificationCount:', error);
    return 0;
  }
};

// Delete old notifications (keep last 100)
export const cleanupOldNotifications = async (managerId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('admin_notifications')
      .delete()
      .eq('admin_id', managerId)
      .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Delete notifications older than 30 days

    if (error) {
      console.error('❌ Error cleaning up old notifications:', error);
    }
  } catch (error) {
    console.error('❌ Error in cleanupOldNotifications:', error);
  }
};

// Get notification settings for manager
export const getNotificationSettings = async (managerId: string): Promise<NotificationSettings | null> => {
  try {
    const { data, error } = await supabase
      .from('admin_notification_settings')
      .select('*')
      .eq('admin_id', managerId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error fetching notification settings:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Error in getNotificationSettings:', error);
    return null;
  }
};

// Update notification settings
export const updateNotificationSettings = async (
  managerId: string,
  settings: Partial<NotificationSettings>
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('admin_notification_settings')
      .upsert({
        admin_id: managerId,
        ...settings
      });

    if (error) {
      console.error('❌ Error updating notification settings:', error);
    }
  } catch (error) {
    console.error('❌ Error in updateNotificationSettings:', error);
  }
};

// Create default notification settings
export const createDefaultNotificationSettings = async (managerId: string): Promise<void> => {
  try {
    const defaultSettings: NotificationSettings = {
      admin_id: managerId,
      check_in_notifications: true,
      check_out_notifications: true,
      break_notifications: false,
      task_notifications: true,
      overtime_notifications: true,
      delay_notifications: true,
      performance_notifications: true,
      new_employee_notifications: true,
      email_notifications: true,
      push_notifications: true
    };

    await updateNotificationSettings(managerId, defaultSettings);
  } catch (error) {
    console.error('❌ Error in createDefaultNotificationSettings:', error);
  }
};

// Get team members for a specific manager
const getManagerTeamMembers = async (managerId: string): Promise<string[]> => {
  try {
    // Get the manager's role and department
    const { data: manager } = await supabase
      .from('users')
      .select('role, position')
      .eq('id', managerId)
      .single();

    if (!manager) return [];

    let teamQuery = supabase.from('users').select('id');

    // Filter team members based on manager role
    switch (manager.role) {
      case 'admin':
        // Admin sees all employees
        teamQuery = teamQuery.neq('role', 'admin');
        break;
      
      case 'customer_retention_manager':
        // Customer Retention Manager sees Customer Retention team and Warehouse Staff
        teamQuery = teamQuery.or('role.eq.customer_retention,role.eq.warehouse');
        break;
      
      case 'content_creative_manager':
        // Content Creative Manager sees Content Creative team
        teamQuery = teamQuery.eq('role', 'content_creative');
        break;
      
      case 'it_manager':
        // IT Manager sees IT team
        teamQuery = teamQuery.eq('role', 'it');
        break;
      
      case 'executive_director':
        // Executive Director sees all employees
        teamQuery = teamQuery.neq('role', 'executive_director');
        break;
      
      case 'general_manager':
        // General Manager sees all employees
        teamQuery = teamQuery.neq('role', 'general_manager');
        break;
      
      default:
        return [];
    }

    const { data: teamMembers, error } = await teamQuery;

    if (error) {
      console.error('❌ Error fetching team members:', error);
      return [];
    }

    return teamMembers?.map(member => member.id) || [];
  } catch (error) {
    console.error('❌ Error in getManagerTeamMembers:', error);
    return [];
  }
};

// Notify managers about their team events only
export const notifyManagersAboutTeamEvent = async (
  employeeId: string,
  eventType: AdminNotification['event_type'],
  eventData: any = {},
  priority: AdminNotification['priority'] = 'medium'
): Promise<void> => {
  try {
    // Get all managers
    const { data: managers, error } = await supabase
      .from('users')
      .select('id, role')
      .in('role', ['admin', 'customer_retention_manager', 'content_creative_manager', 'it_manager', 'executive_director']);

    if (error) {
      console.error('❌ Error fetching managers:', error);
      return;
    }

    if (!managers || managers.length === 0) {
      console.log('⚠️ No managers found to notify');
      return;
    }

    // For each manager, check if the employee is in their team
    const notificationPromises = managers.map(async (manager) => {
      const teamMembers = await getManagerTeamMembers(manager.id);
      
      // Only notify if the employee is in this manager's team
      if (teamMembers.includes(employeeId)) {
        return createManagerNotification(manager.id, employeeId, eventType, eventData, priority);
      }
      
      return Promise.resolve();
    });

    await Promise.all(notificationPromises);
    console.log(`✅ Notified relevant managers about ${eventType} event for employee ${employeeId}`);
  } catch (error) {
    console.error('❌ Error notifying managers:', error);
  }
};

// Legacy function name for backward compatibility
export const notifyAllManagersAboutTeamEvent = notifyManagersAboutTeamEvent;
