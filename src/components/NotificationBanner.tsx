import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotificationManager from '@/utils/notificationManager';

const NotificationBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationManager] = useState(() => NotificationManager.getInstance());

  useEffect(() => {
    const checkPermission = () => {
      if ('Notification' in window) {
        const permission = Notification.permission;
        console.log('Notification banner - permission status:', permission);
        
        // Show banner if permission is default (not asked yet)
        if (permission === 'default') {
          setShowBanner(true);
        }
      }
    };

    // Check immediately
    checkPermission();
    
    // Check again after a short delay to ensure page is loaded
    setTimeout(checkPermission, 1000);
  }, []);

  const requestPermission = async () => {
    setIsLoading(true);
    
    try {
      console.log('Banner requesting permission...');
      const permission = await notificationManager.requestPermission();
      console.log('Banner permission result:', permission);
      
      if (permission === 'granted') {
        setShowBanner(false);
        // Show test notification
        await notificationManager.showGeneralNotification(
          'Notifications Enabled!',
          'You will now receive push notifications from NoorHub'
        );
      } else if (permission === 'denied') {
        // Hide banner if user denied
        setShowBanner(false);
      }
    } catch (error) {
      console.error('Banner permission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white p-3 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5" />
          <div>
            <p className="font-medium">Enable Push Notifications</p>
            <p className="text-sm text-blue-100">
              Get notified about new tasks, messages, and updates
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={requestPermission}
            disabled={isLoading}
            variant="secondary"
            size="sm"
            className="bg-white text-blue-600 hover:bg-gray-100"
          >
            {isLoading ? 'Enabling...' : 'Enable'}
          </Button>
          
          <Button
            onClick={() => setShowBanner(false)}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-blue-700 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotificationBanner; 