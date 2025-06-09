import React, { useState, useEffect } from 'react';
import { Bell, X, Sparkles, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotificationManager from '@/utils/notificationManager';

const NotificationBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
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
        setIsSuccess(true);
        // Show test notification
        await notificationManager.showGeneralNotification(
          'Notifications Enabled!',
          'You will now receive push notifications from NoorHub'
        );
        
        // Hide banner after success animation
        setTimeout(() => {
          setShowBanner(false);
        }, 2000);
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
    <div className="fixed top-14 left-0 right-0 z-40 animate-in slide-in-from-top duration-500">
      <div className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white shadow-2xl border-b border-emerald-400/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left section with icon and content */}
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
                <Bell className={`h-6 w-6 relative z-10 ${isSuccess ? 'text-yellow-300' : ''} transition-colors duration-300`} />
                {!isSuccess && (
                  <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-300 animate-bounce" />
                )}
              </div>
              
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-lg leading-tight">
                  {isSuccess ? 'Notifications Enabled!' : 'Stay Connected with NoorHub'}
                </h3>
                <p className="text-sm text-emerald-50 leading-snug mt-1">
                  {isSuccess 
                    ? 'You\'ll now receive real-time updates and notifications' 
                    : 'Get instant notifications for tasks, messages, and important updates'
                  }
                </p>
              </div>
            </div>
            
            {/* Right section with action buttons */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {!isSuccess ? (
                <>
                  <Button
                    onClick={requestPermission}
                    disabled={isLoading}
                    size="sm"
                    className="bg-white text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 px-6"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                        Enabling...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Enable Now
                      </div>
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => setShowBanner(false)}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 hover:text-white h-9 w-9 p-0 rounded-full transition-all duration-200"
                    aria-label="Dismiss notification banner"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                  <CheckCircle className="h-5 w-5 text-yellow-300" />
                  <span className="text-sm font-medium">Success!</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Subtle bottom border gradient */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
      </div>
    </div>
  );
};

export default NotificationBanner; 