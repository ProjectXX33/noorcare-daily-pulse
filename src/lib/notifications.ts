import { supabase } from './supabase';
import { notificationErrorHandler } from './notificationErrorHandler';

// Function to play notification sound
export const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification-sound.mp3');
    audio.volume = 0.5; // Set volume to 50%
    audio.play().catch(error => {
      // Handle error or silence it (browser might block autoplay)
      console.log('Could not play notification sound (likely blocked by browser):', error);
    });
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

// Function to maintain notification limit
export const maintainNotificationLimit = async (userId: string) => {
  try {
    // Get all notifications for the user, ordered by creation date
    const { data: notifications, error: fetchError } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (fetchError) {
      notificationErrorHandler.handleApiError(fetchError, `maintainNotificationLimit for user ${userId}`);
      throw fetchError;
    }

    // If we have more than 9 notifications, delete the oldest ones
    if (notifications && notifications.length >= 10) {
      // Get IDs of notifications to delete (all except the 9 newest ones)
      const notificationsToDelete = notifications.slice(0, notifications.length - 9);
      const idsToDelete = notificationsToDelete.map(n => n.id);

      // Delete the old notifications
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        notificationErrorHandler.handleApiError(deleteError, `delete old notifications for user ${userId}`);
        throw deleteError;
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      notificationErrorHandler.handleApiError(error, `maintainNotificationLimit for user ${userId}`);
    }
    console.error('Error maintaining notification limit:', error);
  }
};

// Function to create a notification with improved error handling
export const createNotification = async (notification: {
  user_id: string;
  title: string;
  message: string;
  related_to?: string;
  related_id?: string;
  created_by?: string;
}) => {
  try {
    console.log('Creating notification:', notification);
    
    // Validate required fields
    if (!notification.user_id || !notification.title || !notification.message) {
      throw new Error('Missing required notification fields: user_id, title, or message');
    }

    // First maintain the notification limit
    await maintainNotificationLimit(notification.user_id);

    // Get current user as fallback for created_by
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.warn('Could not get current user for notification created_by:', authError);
    }
    
    // Prepare notification data
    const notificationData = {
      user_id: notification.user_id,
      title: notification.title.substring(0, 255), // Limit title length
      message: notification.message.substring(0, 1000), // Limit message length
      related_to: notification.related_to || null,
      related_id: notification.related_id || null,
      created_by: notification.created_by || currentUser?.id || null,
      is_read: false,
      created_at: new Date().toISOString()
    };

    console.log('Inserting notification data:', notificationData);

    // Then create the new notification
    const { data, error } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating notification:', error);
      notificationErrorHandler.handleApiError(error, `createNotification for user ${notification.user_id}`);
      throw error;
    }

    console.log('Notification created successfully:', data);
    
    // Try to send browser notification if permission is granted
    try {
      await notificationErrorHandler.safeNotificationSend(
        notification.title,
        notification.message,
        {
          tag: `notification-${data.id}`,
          data: {
            notification_id: data.id,
            related_to: notification.related_to,
            related_id: notification.related_id
          }
        }
      );
    } catch (browserNotificationError) {
      // Don't fail the database notification if browser notification fails
      console.warn('Browser notification failed but database notification succeeded:', browserNotificationError);
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      notificationErrorHandler.handleGenericError(error, `createNotification for user ${notification.user_id}`);
    }
    console.error('Error creating notification:', error);
    throw error;
  }
}; 