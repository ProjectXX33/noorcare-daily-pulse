// Universal push notification helper
export const triggerPushNotification = async (title: string, message: string, data?: any) => {
  // Only proceed if notifications are enabled
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    console.log('Push notifications not enabled, skipping');
    return;
  }

  try {
    // Use service worker for proper push notifications if available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const registration = await navigator.serviceWorker.ready;
      
      const notificationOptions: any = {
        body: message,
        icon: '/icons/applogo.png?v=1.4.2',
        badge: '/icons/applogo.png?v=1.4.2',
        tag: 'noorhub-notification',
        requireInteraction: false,
        data: {
          type: 'general',
          timestamp: Date.now(),
          url: '/',
          ...data
        }
      };

      // Add vibrate pattern if supported
      if ('vibrate' in navigator) {
        notificationOptions.vibrate = [200, 100, 200];
      }
      
      await registration.showNotification(title, notificationOptions);
      console.log('Push notification sent via service worker:', title);
    } else {
      // Fallback to direct browser notification
      const notificationOptions: any = {
        body: message,
        icon: '/icons/applogo.png?v=1.4.2',
        tag: 'noorhub-notification',
        data: data
      };

      const notification = new Notification(title, notificationOptions);
      
      console.log('Push notification sent via browser API:', title);
      
      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};

// Enhanced notification function with better error handling
export const showNotificationWithFallback = async (
  title: string, 
  message: string, 
  options?: {
    tag?: string;
    icon?: string;
    badge?: string;
    requireInteraction?: boolean;
    data?: any;
  }
) => {
  try {
    // Check notification permission first
    if (!('Notification' in window)) {
      console.warn('Notifications not supported in this browser');
      return false;
    }

    if (Notification.permission === 'denied') {
      console.warn('Notification permission denied');
      return false;
    }

    if (Notification.permission === 'default') {
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission not granted');
        return false;
      }
    }

    // Create notification options
    const notificationOptions: any = {
      body: message,
      icon: options?.icon || '/icons/applogo.png?v=1.4.2',
      badge: options?.badge || '/icons/applogo.png?v=1.4.2',
      tag: options?.tag || 'noorhub-general',
      requireInteraction: options?.requireInteraction || false,
      data: options?.data || {}
    };

    // Add vibrate if supported
    if ('vibrate' in navigator) {
      notificationOptions.vibrate = [200, 100, 200];
    }

    // Try service worker first, then fallback to browser API
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, notificationOptions);
        console.log('Notification sent via service worker');
        return true;
      } catch (swError) {
        console.warn('Service worker notification failed, using fallback:', swError);
      }
    }

    // Fallback to browser notification
    new Notification(title, notificationOptions);
    console.log('Notification sent via browser API');
    return true;

  } catch (error) {
    console.error('Failed to show notification:', error);
    return false;
  }
}; 