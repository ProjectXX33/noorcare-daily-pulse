// Universal push notification helper
export const triggerPushNotification = async (title: string, message: string, data?: any) => {
  // Only proceed if notifications are enabled
  if (Notification.permission !== 'granted') {
    console.log('Push notifications not enabled, skipping');
    return;
  }

  try {
    // Use service worker for proper push notifications if available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const registration = await navigator.serviceWorker.ready;
      
      const notificationOptions: any = {
        body: message,
        icon: '/NQ-ICON.png',
        badge: '/NQ-ICON.png',
        tag: 'noorhub-notification',
        requireInteraction: false,
        vibrate: [200, 100, 200],
        data: {
          type: 'general',
          timestamp: Date.now(),
          url: '/',
          ...data
        }
      };
      
      await registration.showNotification(title, notificationOptions);
      console.log('Push notification sent via service worker:', title);
    } else {
      // Fallback to direct browser notification
      const notification = new Notification(title, {
        body: message,
        icon: '/NQ-ICON.png',
        tag: 'noorhub-notification',
        data: data
      });
      
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