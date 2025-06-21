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

// Enhanced function to create a notification with automatic limit enforcement
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