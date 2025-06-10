interface CustomNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: {
    action: string;
    title: string;
    icon?: string;
  }[];
  data?: any;
  vibrate?: number[];
}

class NotificationManager {
  private static instance: NotificationManager;
  private registration: ServiceWorkerRegistration | null = null;

  private constructor() {}

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  async initialize(): Promise<boolean> {
    try {
      // Check if service worker is supported
      if (!('serviceWorker' in navigator)) {
        console.log('Service Worker not supported');
        return false;
      }

      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.log('Notifications not supported');
        return false;
      }

      // Get service worker registration
      this.registration = await navigator.serviceWorker.ready;
      return true;
    } catch (error) {
      console.error('Failed to initialize notification manager:', error);
      return false;
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    // Check current permission
    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    try {
      // Handle the requestPermission API properly
      if ('requestPermission' in Notification && typeof Notification.requestPermission === 'function') {
        return await Notification.requestPermission();
      }
      
      return 'denied';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  async showNotification(options: CustomNotificationOptions): Promise<boolean> {
    try {
      const permission = await this.requestPermission();
      
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return false;
      }

      // Create proper notification options compatible with the Notification API
      const notificationOptions: any = {
        body: options.body,
        icon: options.icon || '/icons/applogo.png?v=1.4.2',
        badge: options.badge || '/icons/applogo.png?v=1.4.2',
        tag: options.tag || 'noorhub-notification',
        requireInteraction: options.requireInteraction || false,
        data: options.data || {}
      };

      // Add vibrate pattern if supported
      if ('vibrate' in navigator) {
        notificationOptions.vibrate = [200, 100, 200];
      }

      // Add actions if provided and supported
      if (options.actions && options.actions.length > 0) {
        notificationOptions.actions = options.actions;
      }

      // Use service worker notification if available (for PWA)
      if (this.registration) {
        await this.registration.showNotification(options.title, notificationOptions);
      } else {
        // Fallback to regular notification
        new Notification(options.title, notificationOptions);
      }

      return true;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return false;
    }
  }

  async showMessageNotification(message: string, sender?: string): Promise<boolean> {
    const options: CustomNotificationOptions = {
      title: sender ? `New message from ${sender}` : 'New Message',
      body: message,
      tag: 'message-notification',
      requireInteraction: true,
      actions: [
        {
          action: 'reply',
          title: 'Reply',
          icon: '/icons/applogo.png?v=1.4.2'
        },
        {
          action: 'view',
          title: 'View',
          icon: '/icons/applogo.png?v=1.4.2'
        }
      ],
      data: {
        type: 'message',
        sender: sender,
        timestamp: Date.now()
      }
    };

    return this.showNotification(options);
  }

  async showTaskNotification(task: string, dueDate?: string): Promise<boolean> {
    const options: CustomNotificationOptions = {
      title: 'Task Reminder',
      body: dueDate ? `${task} - Due: ${dueDate}` : task,
      tag: 'task-notification',
      requireInteraction: false,
      data: {
        type: 'task',
        task: task,
        dueDate: dueDate,
        timestamp: Date.now()
      }
    };

    return this.showNotification(options);
  }

  async showGeneralNotification(title: string, message: string): Promise<boolean> {
    const options: CustomNotificationOptions = {
      title: title,
      body: message,
      tag: 'general-notification',
      requireInteraction: false,
      data: {
        type: 'general',
        timestamp: Date.now()
      }
    };

    return this.showNotification(options);
  }

  // Check if notifications are supported and permission is granted
  isNotificationAvailable(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  // Get current notification permission status
  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }
}

export default NotificationManager;
export { NotificationManager }; 