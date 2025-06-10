// Notification Error Handler - Centralized error handling for all notification issues

interface NotificationError {
  type: 'permission' | 'service_worker' | 'api' | 'browser_support' | 'network';
  error: Error;
  context?: string;
}

export class NotificationErrorHandler {
  private static instance: NotificationErrorHandler;
  private errorLog: NotificationError[] = [];

  static getInstance(): NotificationErrorHandler {
    if (!NotificationErrorHandler.instance) {
      NotificationErrorHandler.instance = new NotificationErrorHandler();
    }
    return NotificationErrorHandler.instance;
  }

  // Handle permission-related errors
  handlePermissionError(error: Error, context?: string): void {
    console.error('[Notification] Permission error:', error, context);
    this.logError({ type: 'permission', error, context });
    
    // Show user-friendly message
    this.showFallbackMessage(
      'Notification Permission Required',
      'Please enable notifications in your browser settings to receive updates.'
    );
  }

  // Handle service worker errors
  handleServiceWorkerError(error: Error, context?: string): void {
    console.error('[Notification] Service Worker error:', error, context);
    this.logError({ type: 'service_worker', error, context });
    
    // Try to recover by re-registering service worker
    this.attemptServiceWorkerRecovery();
  }

  // Handle API errors (database, network)
  handleApiError(error: Error, context?: string): void {
    console.error('[Notification] API error:', error, context);
    this.logError({ type: 'api', error, context });
    
    // Show user-friendly message for network issues
    if (error.message.includes('network') || error.message.includes('fetch')) {
      this.showFallbackMessage(
        'Connection Error',
        'Unable to send notification due to network issues. Please check your connection.'
      );
    }
  }

  // Handle browser support errors
  handleBrowserSupportError(error: Error, context?: string): void {
    console.error('[Notification] Browser support error:', error, context);
    this.logError({ type: 'browser_support', error, context });
    
    this.showFallbackMessage(
      'Browser Not Supported',
      'Your browser does not support notifications. Please use a modern browser for the best experience.'
    );
  }

  // Generic error handler
  handleGenericError(error: Error, context?: string): void {
    console.error('[Notification] Generic error:', error, context);
    
    // Determine error type based on error message
    if (error.message.includes('permission')) {
      this.handlePermissionError(error, context);
    } else if (error.message.includes('ServiceWorker') || error.message.includes('registration')) {
      this.handleServiceWorkerError(error, context);
    } else if (error.message.includes('fetch') || error.message.includes('network')) {
      this.handleApiError(error, context);
    } else if (error.message.includes('not supported')) {
      this.handleBrowserSupportError(error, context);
    } else {
      this.logError({ type: 'network', error, context });
      console.warn('[Notification] Unknown error type, logging as network error');
    }
  }

  // Safe notification sender with error handling
  async safeNotificationSend(
    title: string,
    message: string,
    options?: {
      icon?: string;
      badge?: string;
      tag?: string;
      data?: any;
    }
  ): Promise<boolean> {
    try {
      // Check browser support
      if (!('Notification' in window)) {
        throw new Error('Notifications not supported in this browser');
      }

      // Check permission
      if (Notification.permission === 'denied') {
        this.handlePermissionError(new Error('Notification permission denied'));
        return false;
      }

      // Request permission if needed
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          this.handlePermissionError(new Error('User denied notification permission'));
          return false;
        }
      }

      // Create notification with safe options
      const safeOptions: any = {
        body: message,
        icon: options?.icon || '/icons/applogo.png?v=1.4.2',
        badge: options?.badge || '/icons/applogo.png?v=1.4.2',
        tag: options?.tag || 'noorhub-safe',
        data: options?.data || {}
      };

      // Try service worker notification first
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(title, safeOptions);
          console.log('[Notification] Sent via service worker successfully');
          return true;
        } catch (swError) {
          console.warn('[Notification] Service worker failed, trying browser API:', swError);
        }
      }

      // Fallback to browser notification
      new Notification(title, safeOptions);
      console.log('[Notification] Sent via browser API successfully');
      return true;

    } catch (error) {
      this.handleGenericError(error as Error, `safeNotificationSend: ${title}`);
      return false;
    }
  }

  // Attempt to recover service worker
  private async attemptServiceWorkerRecovery(): Promise<void> {
    try {
      if ('serviceWorker' in navigator) {
        console.log('[Notification] Attempting service worker recovery...');
        
        // Unregister all service workers
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => registration.unregister()));
        
        // Re-register service worker
        await navigator.serviceWorker.register('/sw.js');
        console.log('[Notification] Service worker recovery successful');
      }
    } catch (error) {
      console.error('[Notification] Service worker recovery failed:', error);
    }
  }

  // Show fallback message (console + optional toast)
  private showFallbackMessage(title: string, message: string): void {
    console.info(`[Notification Fallback] ${title}: ${message}`);
    
    // Try to show a toast if available (import toast dynamically to avoid circular deps)
    try {
      import('sonner').then(({ toast }) => {
        toast.warning(title, { description: message, duration: 5000 });
      }).catch(() => {
        // If toast is not available, show an alert as last resort
        if (typeof window !== 'undefined') {
          setTimeout(() => alert(`${title}\n\n${message}`), 100);
        }
      });
    } catch (error) {
      console.warn('[Notification] Could not show fallback toast:', error);
    }
  }

  // Log error for debugging
  private logError(notificationError: NotificationError): void {
    this.errorLog.push(notificationError);
    
    // Keep only last 10 errors to prevent memory leaks
    if (this.errorLog.length > 10) {
      this.errorLog.shift();
    }
  }

  // Get error statistics
  getErrorStats(): { [key: string]: number } {
    const stats: { [key: string]: number } = {};
    this.errorLog.forEach(error => {
      stats[error.type] = (stats[error.type] || 0) + 1;
    });
    return stats;
  }

  // Clear error log
  clearErrorLog(): void {
    this.errorLog = [];
  }
}

// Export singleton instance
export const notificationErrorHandler = NotificationErrorHandler.getInstance(); 