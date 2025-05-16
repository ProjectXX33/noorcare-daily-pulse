
import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
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
  const { user } = useAuth();
  const [language, setLanguage] = useState('en');

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

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // This would be replaced with an actual Supabase query
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // In a real app, handle this error appropriately
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

  const unreadCount = notifications.filter(notif => !notif.is_read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 px-1 min-w-[18px] h-[18px] flex items-center justify-center text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">{t.notifications}</h4>
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
            <div className="max-h-[300px] overflow-auto">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                  className={`p-3 cursor-pointer hover:bg-muted ${!notification.is_read ? 'bg-muted/50' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium">{notification.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(notification.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
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
