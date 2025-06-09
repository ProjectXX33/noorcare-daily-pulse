import React, { useState, useEffect } from 'react';
import { Bell, BellOff, X, Sparkles, Shield, Zap, CheckCircle2 } from 'lucide-react';
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
  const [showSuccess, setShowSuccess] = useState(false);
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
      
      console.log('Permission status:', status, 'AutoShow:', autoShow, 'Visible:', status === 'default' && autoShow);
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
        setShowSuccess(true);
        onPermissionGranted?.();
        
        // Show a test notification
        await notificationManager.showGeneralNotification(
          'Notifications Enabled!',
          'You will now receive notifications from NoorHub'
        );
        
        // Hide after success animation
        setTimeout(() => {
          setIsVisible(false);
        }, 3000);
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
          icon: <Bell className="h-6 w-6 text-emerald-500" />,
          title: 'Notifications Active',
          description: 'You\'re all set to receive real-time updates from NoorHub',
          buttonText: 'Send Test Notification',
          buttonVariant: 'outline' as const,
          gradient: 'from-emerald-50 to-green-50',
          borderColor: 'border-emerald-200',
          buttonAction: async () => {
            await notificationManager.showGeneralNotification(
              'Test Notification',
              'This is a test notification from NoorHub!'
            );
          }
        };
      case 'denied':
        return {
          icon: <BellOff className="h-6 w-6 text-red-500" />,
          title: 'Notifications Blocked',
          description: 'To receive important updates, please enable notifications in your browser settings',
          buttonText: 'How to Enable',
          buttonVariant: 'outline' as const,
          gradient: 'from-red-50 to-rose-50',
          borderColor: 'border-red-200',
          buttonAction: () => {
            alert('To enable notifications:\n1. Click the lock icon in your browser address bar\n2. Change notifications to "Allow"\n3. Refresh the page');
          }
        };
      default:
        return {
          icon: <Bell className="h-6 w-6 text-blue-500" />,
          title: 'Enable Smart Notifications',
          description: 'Stay in the loop with instant updates about tasks, messages, and important events',
          buttonText: 'Enable Notifications',
          buttonVariant: 'default' as const,
          gradient: 'from-blue-50 to-indigo-50',
          borderColor: 'border-blue-200',
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
      <div className={`flex items-center gap-3 p-4 bg-gradient-to-r ${statusInfo.gradient} rounded-xl border ${statusInfo.borderColor} shadow-sm animate-in fade-in slide-in-from-bottom duration-500`}>
        <div className="relative">
          <div className="absolute inset-0 bg-current/10 rounded-full animate-pulse"></div>
          {statusInfo.icon}
          {permissionStatus === 'default' && (
            <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-amber-500 animate-bounce" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-sm">
            {statusInfo.title}
          </h4>
          <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
            {statusInfo.description}
          </p>
        </div>
        
        <Button
          size="sm"
          variant={statusInfo.buttonVariant}
          onClick={statusInfo.buttonAction}
          disabled={isLoading}
          className="flex-shrink-0 shadow-sm hover:shadow-md transition-all duration-200"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs">Loading...</span>
            </div>
          ) : (
            <span className="text-xs font-medium">{statusInfo.buttonText}</span>
          )}
        </Button>
      </div>
    );
  }

  return (
    <Card className={`relative overflow-hidden bg-gradient-to-br ${statusInfo.gradient} border ${statusInfo.borderColor} shadow-lg hover:shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom`}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-white/10 to-transparent rounded-full translate-y-12 -translate-x-12"></div>
      
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-3 right-3 h-8 w-8 p-0 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-10"
        onClick={() => setIsVisible(false)}
      >
        <X className="h-4 w-4" />
      </Button>
      
      <CardHeader className="pb-4 relative z-10">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="relative">
            <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
            {showSuccess ? (
              <CheckCircle2 className="h-7 w-7 text-emerald-600 relative z-10" />
            ) : (
              statusInfo.icon
            )}
            {permissionStatus === 'default' && !showSuccess && (
              <>
                <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-amber-500 animate-bounce" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/20 to-purple-400/20 animate-ping"></div>
              </>
            )}
          </div>
          {showSuccess ? 'Success!' : statusInfo.title}
        </CardTitle>
        
        <CardDescription className="text-gray-700 leading-relaxed">
          {showSuccess 
            ? 'Perfect! You\'ll now receive real-time notifications and stay updated with everything happening in NoorHub.'
            : statusInfo.description
          }
        </CardDescription>
        
        {/* Feature highlights for default state */}
        {permissionStatus === 'default' && !showSuccess && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="flex flex-col items-center text-center">
              <Zap className="h-5 w-5 text-amber-500 mb-1" />
              <span className="text-xs text-gray-600 font-medium">Instant</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <Shield className="h-5 w-5 text-blue-500 mb-1" />
              <span className="text-xs text-gray-600 font-medium">Secure</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <Bell className="h-5 w-5 text-green-500 mb-1" />
              <span className="text-xs text-gray-600 font-medium">Smart</span>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="relative z-10">
        {!showSuccess ? (
          <Button
            onClick={statusInfo.buttonAction}
            disabled={isLoading}
            className="w-full font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
            variant={statusInfo.buttonVariant}
            size="lg"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                Enabling...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {permissionStatus === 'default' && <Bell className="h-4 w-4" />}
                {statusInfo.buttonText}
              </div>
            )}
          </Button>
        ) : (
          <div className="text-center py-2">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Notifications Enabled
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationPermission; 