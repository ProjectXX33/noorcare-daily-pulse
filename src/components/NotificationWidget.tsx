import React, { useState, useEffect } from 'react';
import { Bell, X, Settings, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotificationManager from '@/utils/notificationManager';

interface NotificationWidgetProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  autoShow?: boolean;
}

const NotificationWidget: React.FC<NotificationWidgetProps> = ({
  position = 'bottom-right',
  autoShow = true
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [notificationManager] = useState(() => NotificationManager.getInstance());

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = () => {
    if ('Notification' in window) {
      const status = Notification.permission;
      setPermissionStatus(status);
      
      if (status === 'default' && autoShow) {
        setIsVisible(true);
      }
    }
  };

  const requestPermission = async () => {
    setIsLoading(true);
    
    try {
      const permission = await notificationManager.requestPermission();
      setPermissionStatus(permission);
      
      if (permission === 'granted') {
        await notificationManager.showGeneralNotification(
          'Notifications Enabled!',
          'You will now receive notifications from VNQ system'
        );
        
        // Auto-hide after success
        setTimeout(() => {
          setIsVisible(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to request permission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      default:
        return 'bottom-4 right-4';
    }
  };

  if (!isVisible || permissionStatus === 'granted') {
    return null;
  }

  return (
    <div className={`fixed ${getPositionClasses()} z-40 transition-all duration-300`}>
      {/* Compact floating widget */}
      {!isExpanded ? (
        <Button
          onClick={() => setIsExpanded(true)}
          className="relative h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 border-2 border-white/20"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent animate-pulse"></div>
          
          <Bell className="h-6 w-6 text-white relative z-10" />
          
          {/* Notification indicator */}
          <div className="absolute -top-1 -right-1 h-5 w-5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-white animate-bounce" />
          </div>
          
          {/* Pulsing ring */}
          <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-60"></div>
        </Button>
      ) : (
        /* Expanded notification card */
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-72 animate-in slide-in-from-bottom fade-in duration-300">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bell className="h-4 w-4 text-white" />
                </div>
                <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-amber-500 animate-bounce" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">Enable Notifications</h3>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-7 w-7 p-0 rounded-full hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Content */}
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            Stay updated with real-time notifications about tasks, messages, and important updates.
          </p>
          
          {/* Features */}
          <div className="flex items-center gap-4 mb-4 p-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
            <div className="flex flex-col items-center text-center flex-1">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mb-1">
                <Bell className="h-3 w-3 text-blue-600" />
              </div>
              <span className="text-xs text-gray-600 font-medium">Instant</span>
            </div>
            <div className="flex flex-col items-center text-center flex-1">
              <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center mb-1">
                <Settings className="h-3 w-3 text-purple-600" />
              </div>
              <span className="text-xs text-gray-600 font-medium">Smart</span>
            </div>
            <div className="flex flex-col items-center text-center flex-1">
              <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center mb-1">
                <Sparkles className="h-3 w-3 text-emerald-600" />
              </div>
              <span className="text-xs text-gray-600 font-medium">Secure</span>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={requestPermission}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              size="sm"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Enabling...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Bell className="h-3 w-3" />
                  Enable Now
                  <ChevronRight className="h-3 w-3" />
                </div>
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="px-3 hover:bg-gray-100"
            >
              Later
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationWidget; 