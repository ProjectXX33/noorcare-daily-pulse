import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { AnimatedNotificationBell } from '@/components/NotificationBell';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { playNotificationSound } from '@/lib/notifications';
import NotificationManager from '@/utils/notificationManager';
import { triggerPushNotification } from '@/utils/pushNotificationHelper';

type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_to?: string;
  related_id?: string;
};

const NotificationsMenu = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const { user } = useAuth();
  const [language, setLanguage] = useState('en');
  const navigate = useNavigate();
  const [notificationManager] = useState(() => NotificationManager.getInstance());

  // Translation object for multilingual support
  const translations = {
    en: {
      notifications: "Notifications",
      noNotifications: "No new notifications",
      markAllAsRead: "Mark all as read",
      loading: "Loading...",
      viewAll: "View all",
      mentioned: "mentioned you in",
      task: "a task",
      moment: "just now",
      minutes: "minutes ago",
      hours: "hours ago",
      days: "days ago"
    },
    ar: {
      notifications: "الإشعارات",
      noNotifications: "لا توجد إشعارات جديدة",
      markAllAsRead: "تعليم الكل كمقروء",
      loading: "جاري التحميل...",
      viewAll: "عرض الكل",
      mentioned: "ذكرك في",
      task: "مهمة",
      moment: "الآن",
      minutes: "دقائق مضت",
      hours: "ساعات مضت",
      days: "أيام مضت"
    }
  };

  useEffect(() => {
    const storedLang = localStorage.getItem('preferredLanguage');
    if (storedLang && (storedLang === 'en' || storedLang === 'ar')) {
      setLanguage(storedLang);
    }
  }, []);

  const t = translations[language as keyof typeof translations];

  const initializeNotifications = async () => {
    await notificationManager.initialize();
  };

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      const unsubscribe = subscribeToNotifications();
      initializeNotifications();
      
      // Return cleanup function
      return unsubscribe;
    }
  }, [user?.id]); // Only depend on user.id to avoid unnecessary re-subscriptions

  const subscribeToNotifications = () => {
    if (!user?.id) return () => {};

    // Create unique channel name to avoid conflicts
    const channelName = `notifications-menu-${user.id}`;

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, 
        payload => {
          console.log('New notification received (menu):', payload);
          const newNotification = payload.new as Notification;
          
          // Add the new notification to the state
          setNotifications(prev => [newNotification, ...prev]);
          // Trigger the bell animation
          setHasNewNotifications(true);
          // Play notification sound
          playNotificationSound();
          
          // Trigger push notification for EVERY bell notification
          triggerPushNotification(
            newNotification.title,
            newNotification.message,
            {
              type: newNotification.related_to || 'general',
              related_id: newNotification.related_id,
              notification_id: newNotification.id
            }
          );
        }
      )
      .subscribe();
    
    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  };

  const fetchNotifications = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      setNotifications(data || []);
      
      // Check if there are any unread notifications
      const hasUnread = data ? data.some(notif => !notif.is_read) : false;
      setHasNewNotifications(hasUnread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      
      // Update the local state
      setNotifications(notifications.map(notif => 
        notif.id === notificationId ? { ...notif, is_read: true } : notif
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user?.id)
        .eq('is_read', false);

      if (error) throw error;
      
      // Update the local state
      setNotifications(notifications.map(notif => ({ ...notif, is_read: true })));
      setHasNewNotifications(false);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return t.moment;
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} ${t.minutes}`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} ${t.hours}`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} ${t.days}`;
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark the notification as read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    // Navigate based on notification type
    if (notification.related_to === 'task' && notification.related_id) {
      // Determine which task page to go to based on user role and position
      let taskPath = '/employee-tasks'; // Default for regular employees
      
      if (user?.role === 'admin') {
        taskPath = '/tasks'; // Admin goes to admin tasks page
      } else if (user?.position === 'Media Buyer') {
        taskPath = '/media-buyer-tasks'; // Media Buyer goes to their dedicated page
      }
      
      navigate(taskPath, { state: { taskId: notification.related_id } });
      toast.info(`Navigating to task: ${notification.related_id}`);
    } else if (notification.related_to === 'report' && notification.related_id) {
      // Navigate to reports
      const reportPath = user?.role === 'admin' ? '/reports' : '/report';
      navigate(reportPath, { state: { reportId: notification.related_id } });
    } else if (notification.related_to === 'check_in' && notification.related_id) {
      // Navigate to check in
      navigate('/check-in');
    } else if (notification.related_to === 'event' && notification.related_id) {
      // Navigate to events page
      navigate('/events', { state: { eventId: notification.related_id } });
      toast.info(`Navigating to event: ${notification.related_id}`);
    }
  };

  const unreadCount = notifications.filter(notif => !notif.is_read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <AnimatedNotificationBell 
            className="h-5 w-5 transition-all" 
            hasNotifications={unreadCount > 0} 
          />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className={`
                absolute -top-0.5 -right-0.5
                px-1.5 min-w-[20px] h-[20px] 
                flex items-center justify-center 
                text-xs font-bold
                bg-gradient-to-br from-red-500 to-red-600
                border-2 border-white
                shadow-lg shadow-red-500/25
                animate-pulse
                transform hover:scale-110 transition-transform duration-200
                ${unreadCount > 99 ? 'px-1 text-[10px]' : ''}
              `}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-[95vw] w-full sm:w-80 p-2 sm:p-4" align="end">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-base sm:text-lg">{t.notifications}</h4>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
                {t.markAllAsRead}
              </Button>
            )}
          </div>
          <Separator className="my-2" />
          {isLoading ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {t.loading}
            </div>
          ) : notifications.length > 0 ? (
            <div className="max-h-[60vh] overflow-auto">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 cursor-pointer hover:bg-muted rounded-lg transition-colors duration-150 ${!notification.is_read ? 'bg-muted/50' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm sm:text-base">{notification.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(notification.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {t.noNotifications}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsMenu;
