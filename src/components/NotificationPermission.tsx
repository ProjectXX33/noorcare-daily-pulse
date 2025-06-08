import React, { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import NotificationManager from '@/utils/notificationManager';

interface NotificationPermissionProps {
  onPermissionGranted?: () => void;
  showAsCard?: boolean;
  autoShow?: boolean;
}

const NotificationPermission: React.FC<NotificationPermissionProps> = ({
  onPermissionGranted,
  showAsCard = true,
  autoShow = true
}) => {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationManager] = useState(() => NotificationManager.getInstance());

  useEffect(() => {
    checkPermissionStatus();
    initializeNotificationManager();
  }, []);

  const checkPermissionStatus = () => {
    if ('Notification' in window) {
      const status = Notification.permission;
      setPermissionStatus(status);
      
      // Show permission request if default and autoShow is enabled
      if (status === 'default' && autoShow) {
        setIsVisible(true);
      }
    }
  };

  const initializeNotificationManager = async () => {
    await notificationManager.initialize();
  };

  const requestPermission = async () => {
    setIsLoading(true);
    
    try {
      const permission = await notificationManager.requestPermission();
      setPermissionStatus(permission);
      
      if (permission === 'granted') {
        setIsVisible(false);
        onPermissionGranted?.();
        
        // Show a test notification
        await notificationManager.showGeneralNotification(
          'Notifications Enabled!',
          'You will now receive notifications from NoorHub'
        );
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusInfo = () => {
    switch (permissionStatus) {
      case 'granted':
        return {
          icon: <Bell className="h-5 w-5 text-green-500" />,
          title: 'Notifications Enabled',
          description: 'You will receive notifications from NoorHub',
          buttonText: 'Test Notification',
          buttonAction: async () => {
            await notificationManager.showGeneralNotification(
              'Test Notification',
              'This is a test notification from NoorHub!'
            );
          }
        };
      case 'denied':
        return {
          icon: <BellOff className="h-5 w-5 text-red-500" />,
          title: 'Notifications Blocked',
          description: 'Please enable notifications in your browser settings to receive updates',
          buttonText: 'How to Enable',
          buttonAction: () => {
            alert('To enable notifications:\n1. Click the lock icon in your browser address bar\n2. Change notifications to "Allow"\n3. Refresh the page');
          }
        };
      default:
        return {
          icon: <Bell className="h-5 w-5 text-blue-500" />,
          title: 'Enable Notifications',
          description: 'Stay updated with messages, tasks, and important updates from NoorHub',
          buttonText: 'Enable Notifications',
          buttonAction: requestPermission
        };
    }
  };

  if (!isVisible && permissionStatus !== 'default') {
    return null;
  }

  const statusInfo = getStatusInfo();

  if (!showAsCard) {
    return (
      <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        {statusInfo.icon}
        <span className="text-sm text-blue-700 dark:text-blue-300 flex-1">
          {statusInfo.title}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={statusInfo.buttonAction}
          disabled={isLoading}
          className="text-xs"
        >
          {isLoading ? 'Loading...' : statusInfo.buttonText}
        </Button>
      </div>
    );
  }

  return (
    <Card className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-6 w-6 p-0"
        onClick={() => setIsVisible(false)}
      >
        <X className="h-4 w-4" />
      </Button>
      
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {statusInfo.icon}
          {statusInfo.title}
        </CardTitle>
        <CardDescription>
          {statusInfo.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Button
          onClick={statusInfo.buttonAction}
          disabled={isLoading}
          className="w-full"
          variant={permissionStatus === 'granted' ? 'outline' : 'default'}
        >
          {isLoading ? 'Loading...' : statusInfo.buttonText}
        </Button>
      </CardContent>
    </Card>
  );
};

export default NotificationPermission; 