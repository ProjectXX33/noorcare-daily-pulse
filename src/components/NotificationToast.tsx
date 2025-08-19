import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle2, AlertCircle, Info, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotificationManager from '@/utils/notificationManager';

type NotificationToastType = 'permission' | 'success' | 'info' | 'warning';

interface NotificationToastProps {
  type?: NotificationToastType;
  title?: string;
  message?: string;
  autoHide?: boolean;
  duration?: number;
  onClose?: () => void;
  onAction?: () => void;
  actionText?: string;
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  type = 'permission',
  title,
  message,
  autoHide = true,
  duration = 5000,
  onClose,
  onAction,
  actionText
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationManager] = useState(() => NotificationManager.getInstance());

  useEffect(() => {
    if (autoHide && duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoHide, duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const handleAction = async () => {
    if (type === 'permission') {
      setIsLoading(true);
      try {
        const permission = await notificationManager.requestPermission();
        if (permission === 'granted') {
          await notificationManager.showGeneralNotification(
            'Notifications Enabled!',
            'You will now receive push notifications from VNQ system'
          );
          handleClose();
        }
      } catch (error) {
        console.error('Failed to request permission:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      onAction?.();
    }
  };

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
          gradient: 'from-emerald-500/10 via-green-500/5 to-emerald-500/10',
          border: 'border-emerald-200',
          accent: 'bg-emerald-500',
          title: title || 'Success!',
          message: message || 'Notifications have been enabled successfully.',
        };
      case 'warning':
        return {
          icon: <AlertCircle className="h-5 w-5 text-amber-500" />,
          gradient: 'from-amber-500/10 via-yellow-500/5 to-amber-500/10',
          border: 'border-amber-200',
          accent: 'bg-amber-500',
          title: title || 'Attention Required',
          message: message || 'Please check your notification settings.',
        };
      case 'info':
        return {
          icon: <Info className="h-5 w-5 text-blue-500" />,
          gradient: 'from-blue-500/10 via-indigo-500/5 to-blue-500/10',
          border: 'border-blue-200',
          accent: 'bg-blue-500',
          title: title || 'Information',
          message: message || 'Stay updated with the latest notifications.',
        };
      default: // permission
        return {
          icon: <Bell className="h-5 w-5 text-blue-500" />,
          gradient: 'from-blue-500/10 via-indigo-500/5 to-purple-500/10',
          border: 'border-blue-200',
          accent: 'bg-gradient-to-r from-blue-500 to-purple-500',
          title: title || 'Enable Notifications',
          message: message || 'Get real-time updates about tasks, messages, and important events.',
        };
    }
  };

  if (!isVisible) {
    return null;
  }

  const config = getTypeConfig();

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom fade-in duration-500 max-w-sm">
      <div className={`relative overflow-hidden bg-gradient-to-br ${config.gradient} backdrop-blur-sm border ${config.border} rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300`}>
        {/* Accent line */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${config.accent}`}></div>
        
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/20 to-transparent rounded-full -translate-y-10 translate-x-10"></div>
        
        <div className="relative p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-white/30 rounded-full animate-pulse"></div>
                {config.icon}
                {type === 'permission' && (
                  <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-amber-400 animate-bounce" />
                )}
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                  {config.title}
                </h4>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-7 w-7 p-0 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          {/* Message */}
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            {config.message}
          </p>
          
          {/* Action */}
          {(type === 'permission' || actionText) && (
            <div className="flex gap-2">
              <Button
                onClick={handleAction}
                disabled={isLoading}
                size="sm"
                className="flex-1 bg-white text-gray-900 hover:bg-gray-50 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Enabling...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>{actionText || 'Enable Now'}</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationToast; 