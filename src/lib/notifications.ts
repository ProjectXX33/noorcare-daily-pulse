import { supabase } from './supabase';

// Function to play notification sound
export const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification-sound.mp3');
    audio.volume = 0.5; // Set volume to 50%
    audio.play().catch(error => {
      // Handle error or silence it (browser might block autoplay)
      console.log('Could not play notification sound:', error);
    });
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

// Enhanced function to maintain notification limit (10 notifications max per user)
export const maintainNotificationLimit = async (userId: string, maxNotifications: number = 10) => {
  try {
    console.log(`🔄 Checking notification limit for user ${userId} (max: ${maxNotifications})`);
    
    // Get all notifications for the user, ordered by creation date (oldest first)
    const { data: notifications, error: fetchError } = await supabase
      .from('notifications')
      .select('id, created_at, title')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;

    console.log(`📊 User has ${notifications?.length || 0} notifications`);

    // If we have reached or exceeded the limit, delete the oldest ones
    if (notifications && notifications.length >= maxNotifications) {
      // Calculate how many to delete (keep only the newest (maxNotifications - 1))
      const notificationsToDelete = notifications.slice(0, notifications.length - (maxNotifications - 1));
      const idsToDelete = notificationsToDelete.map(n => n.id);

      console.log(`🗑️ Deleting ${notificationsToDelete.length} oldest notifications:`, 
        notificationsToDelete.map(n => ({ id: n.id, title: n.title, date: n.created_at }))
      );

      // Delete the old notifications
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) throw deleteError;

      console.log(`✅ Successfully deleted ${notificationsToDelete.length} old notifications`);
    } else {
      console.log(`✅ Notification count within limit (${notifications?.length || 0}/${maxNotifications})`);
    }
  } catch (error) {
    console.error('❌ Error maintaining notification limit:', error);
    throw error; // Re-throw to handle in calling function
  }
};

// Function to send email notification
const sendEmailNotification = async (userEmail: string, title: string, message: string) => {
  try {
    // Check if we have Supabase Edge Function for email sending
    const { data, error } = await supabase.functions.invoke('send-email-notification', {
      body: {
        to: userEmail,
        subject: title,
        message: message,
        from: 'notifications@noorcare.com'
      }
    });

    if (error) {
      console.warn('Email notification failed, but system notification will still be created:', error);
      return false;
    }

    console.log('✅ Email notification sent successfully to:', userEmail);
    return true;
  } catch (error) {
    console.warn('Email notification failed, but system notification will still be created:', error);
    return false;
  }
};

// Enhanced function to create a notification with automatic limit enforcement and email support
export const createNotification = async (notification: {
  user_id: string;
  title: string;
  message: string;
  related_to?: string;
  related_id?: string;
  created_by?: string;
}) => {
  try {
    console.log('📝 Creating notification for user:', notification.user_id, '| Title:', notification.title);
    
    // FIRST: Maintain the notification limit (delete old ones if needed)
    await maintainNotificationLimit(notification.user_id, 10);

    // Get user preferences and email for email notifications
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, preferences')
      .eq('id', notification.user_id)
      .single();

    if (userError) {
      console.warn('Could not fetch user preferences for email notifications:', userError);
    }

    // Get current user as fallback for created_by
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    // Prepare notification data
    const notificationData = {
      user_id: notification.user_id,
      title: notification.title,
      message: notification.message,
      related_to: notification.related_to || null,
      related_id: notification.related_id || null,
      created_by: notification.created_by || currentUser?.id || null,
      is_read: false,
      created_at: new Date().toISOString()
    };

    console.log('📤 Inserting notification data:', {
      ...notificationData,
      message: notificationData.message.substring(0, 50) + '...' // Truncate for logging
    });

    // Create the new notification
    const { data, error } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error creating notification:', error);
      throw error;
    }

    console.log('✅ Notification created successfully:', {
      id: data.id,
      title: data.title,
      user_id: data.user_id
    });

    // Send email notification if user has email notifications enabled
    if (userData?.email && userData?.preferences?.notifications?.enabled && userData?.preferences?.notifications?.email) {
      console.log('📧 Sending email notification to:', userData.email);
      await sendEmailNotification(userData.email, notification.title, notification.message);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
};

// Helper function to create notifications for multiple users (e.g., all admins)
export const createNotificationForMultipleUsers = async (
  userIds: string[],
  notification: {
    title: string;
    message: string;
    related_to?: string;
    related_id?: string;
    created_by?: string;
  }
) => {
  try {
    console.log(`📢 Creating notifications for ${userIds.length} users:`, notification.title);
    
    const results = [];
    for (const userId of userIds) {
      try {
        const result = await createNotification({
          user_id: userId,
          ...notification
        });
        results.push(result);
      } catch (error) {
        console.error(`❌ Failed to create notification for user ${userId}:`, error);
      }
    }
    
    console.log(`✅ Successfully created ${results.length}/${userIds.length} notifications`);
    return results;
  } catch (error) {
    console.error('❌ Error creating notifications for multiple users:', error);
    throw error;
  }
};

// Function to clean up old notifications for all users (admin utility)
export const cleanupOldNotificationsForAllUsers = async () => {
  try {
    console.log('🧹 Starting cleanup of old notifications for all users...');
    
    // Get all unique user IDs from notifications
    const { data: userIds, error: userError } = await supabase
      .from('notifications')
      .select('user_id')
      .not('user_id', 'is', null);

    if (userError) throw userError;

    // Get unique user IDs
    const uniqueUserIds = [...new Set(userIds?.map(row => row.user_id) || [])];
    
    console.log(`🔍 Found ${uniqueUserIds.length} users with notifications`);
    
    let totalCleaned = 0;
    
    // Clean up notifications for each user
    for (const userId of uniqueUserIds) {
      try {
        const beforeCount = await getNotificationCount(userId);
        await maintainNotificationLimit(userId, 10);
        const afterCount = await getNotificationCount(userId);
        const cleaned = beforeCount - afterCount;
        totalCleaned += cleaned;
        
        if (cleaned > 0) {
          console.log(`🗑️ Cleaned ${cleaned} notifications for user ${userId}`);
        }
      } catch (error) {
        console.error(`❌ Error cleaning notifications for user ${userId}:`, error);
      }
    }
    
    console.log(`✅ Cleanup completed! Removed ${totalCleaned} old notifications across all users`);
    return { success: true, totalCleaned, usersProcessed: uniqueUserIds.length };
    
  } catch (error) {
    console.error('❌ Error during notification cleanup:', error);
    return { success: false, error: error.message };
  }
};

// Helper function to get notification count for a user
const getNotificationCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
    
  if (error) throw error;
  return count || 0;
}; 