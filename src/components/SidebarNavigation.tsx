import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Home, 
  Users, 
  ClipboardList, 
  CheckSquare, 
  User, 
  LogOut,
  Settings,
  Menu,
  Calendar
} from 'lucide-react';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarHeader, 
  SidebarContent, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import NotificationsMenu from '@/components/NotificationsMenu';
import { useIsMobile } from '@/hooks/use-mobile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/supabase';

interface SidebarNavigationProps {
  children?: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

export const SidebarNavigation = ({ children, isOpen, onClose }: SidebarNavigationProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { language, t } = useLanguage();
  const isMobile = useIsMobile();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    // Subscribe to notifications changes
    const notificationsSubscription = supabase
      .channel('notifications')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`
        }, 
        (payload) => {
          console.log('Realtime notification:', payload);
          // Handle the notification change
          if (payload.eventType === 'INSERT') {
            setNotifications(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
          }
        }
      )
      .subscribe();

    // Load initial notifications
    const loadNotifications = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      setNotifications(data || []);
    };

    loadNotifications();

    return () => {
      notificationsSubscription.unsubscribe();
    };
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  const adminNavItems = [
    { name: t('dashboard'), icon: Home, path: '/dashboard' },
    { name: t('employees'), icon: Users, path: '/employees' },
    { name: t('reports'), icon: ClipboardList, path: '/reports' },
    { name: t('tasks'), icon: CheckSquare, path: '/tasks' },
    { name: t('events'), icon: Calendar, path: '/events' },
  ];

  const employeeNavItems = [
    { name: t('dashboard'), icon: Home, path: '/employee-dashboard' },
    { name: t('checkIn'), icon: CheckSquare, path: '/check-in' },
    { name: t('dailyReport'), icon: ClipboardList, path: '/report' },
    { name: t('tasks'), icon: CheckSquare, path: '/employee-tasks' },
    { name: t('events'), icon: Calendar, path: '/events' },
  ];

  const navItems = user?.role === 'admin' ? adminNavItems : employeeNavItems;
  
  return (
    <SidebarProvider open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <div className="flex min-h-screen w-full" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <Sidebar
          className={`sidebar-glass sticky top-0 h-screen transition-all duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
          side={language === 'ar' ? 'right' : 'left'}
        >
          <SidebarHeader className="flex h-16 items-center border-b px-6">
            <img src="/NQ-ICON.png" alt="Logo" className="h-10 w-10 rounded-full shadow" />
          </SidebarHeader>
          <SidebarContent className="flex-1 overflow-y-auto py-4">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    tooltip={item.name}
                    isActive={window.location.pathname === item.path}
                    className={`w-full px-3 py-2 rounded-lg transition-colors ${
                      window.location.pathname === item.path ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-accent'
                    } ${language === 'ar' ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    <span className="w-full">{item.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          
          <SidebarFooter>
            <div className="flex flex-col gap-2 p-2">
              <Button 
                variant="ghost" 
                className={`justify-start w-full ${language === 'ar' ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}
                onClick={() => navigate('/settings')}
              >
                <Settings className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                {t('settings')}
              </Button>
              <Button 
                variant="ghost" 
                className={`justify-start w-full text-red-500 hover:bg-red-50 hover:text-red-600 ${language === 'ar' ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}
                onClick={handleLogout}
              >
                <LogOut className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                {t('signOut')}
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        
        <div className="flex flex-col flex-1">
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-4 md:px-6">
            <div className={`flex items-center ${language === 'ar' ? 'order-2' : 'order-1'}`}>
              <SidebarTrigger>
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
            </div>
            <div className={`flex items-center gap-4 ${language === 'ar' ? 'order-1' : 'order-2'}`}>
              <NotificationsMenu />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 w-auto flex items-center gap-2 rounded-full p-0">
                    <span className="hidden md:inline-block text-sm">{user?.name}</span>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" alt={user?.name} />
                      <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={language === 'ar' ? 'start' : 'end'} className={`w-56 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                  <DropdownMenuLabel>
                    <div className="flex flex-col gap-1">
                      <p className="font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/settings')} className={language === 'ar' ? 'flex-row-reverse text-right' : 'flex-row text-left'}>
                    <Settings className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                    {t('settings')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className={`text-red-500 ${language === 'ar' ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}>
                    <LogOut className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                    {t('signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default SidebarNavigation;
