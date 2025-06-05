import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorkspaceMessages } from '@/contexts/WorkspaceMessageContext';
import { 
  Home, 
  Users, 
  ClipboardList, 
  CheckSquare, 
  User, 
  LogOut,
  Settings,
  Menu,
  Calendar,
  Clock,
  LayoutDashboard,
  LogIn,
  ListTodo,
  FileText,
  PenTool,
  MessageSquare,
  Star,
  Bug
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
import { Badge } from '@/components/ui/badge';
import NotificationsMenu from '@/components/NotificationsMenu';
import ReportBugModal from '@/components/ReportBugModal';
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
  const { unreadCount } = useWorkspaceMessages();
  const isMobile = useIsMobile();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isReportBugOpen, setIsReportBugOpen] = useState(false);

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

  if (!user) return null;

  const navItems = [
    { name: t('dashboard') as string, path: user?.role === 'admin' ? '/dashboard' : '/employee-dashboard', icon: Home },
    { name: t('employees') as string, path: '/employees', icon: Users, adminOnly: true },
    { name: t('reports') as string, path: '/reports', icon: ClipboardList, adminOnly: true },
    { name: 'Bug Reports', path: '/admin-bug-reports', icon: Bug, adminOnly: true },
    { name: 'Employee Ratings', path: '/admin-ratings', icon: Star, adminOnly: true },
    { name: 'Shift Management', path: '/admin-shift-management', icon: Calendar, adminOnly: true },
    { name: t('tasks') as string, path: user?.role === 'admin' ? '/tasks' : '/employee-tasks', icon: CheckSquare },
    { name: 'Media Buyer Tasks', path: '/media-buyer-tasks', icon: CheckSquare, mediaBuyerOnly: true },
    { name: 'My Ratings', path: '/my-ratings', icon: Star, employeeOnly: true },
    { name: t('checkIn') as string, path: '/check-in', icon: User, customerServiceAndDesignerOnly: true },
    { name: 'Shifts', path: '/shifts', icon: Clock, shiftsAccess: true },
    { name: t('dailyReport') as string, path: '/report', icon: ClipboardList, employeeOnly: true },
    { name: t('events') as string, path: '/events', icon: Calendar, excludeMediaBuyer: true },
    { name: 'Workspace', path: '/workspace', icon: MessageSquare, hasCounter: true }, // Available to all users
  ].filter(item => {
    if (item.adminOnly && user?.role !== 'admin') return false;
    if (item.employeeOnly && user?.role === 'admin') return false;
    if (item.customerServiceAndDesignerOnly && user?.position !== 'Customer Service' && user?.position !== 'Designer') return false;
    if (item.shiftsAccess && !(user?.role === 'admin' || user?.position === 'Customer Service' || user?.position === 'Designer')) return false;
    if (item.mediaBuyerOnly && user?.position !== 'Media Buyer') return false;
    if (item.excludeMediaBuyer && user?.position === 'Media Buyer') return false;
    return true;
  });

  return (
    <SidebarProvider open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <div className="flex min-h-screen w-full" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <Sidebar
          className={`sidebar-glass sticky top-0 h-screen transition-all duration-300 ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0 z-40`}
          side={language === 'ar' ? 'right' : 'left'}
        >
          <SidebarHeader className="flex h-16 items-center border-b px-4 md:px-6">
            <img src="/NQ-ICON.png" alt="Logo" className="h-8 w-8 md:h-10 md:w-10 rounded-full shadow" />
          </SidebarHeader>
          <SidebarContent className="flex-1 overflow-y-auto py-2 md:py-4">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    tooltip={item.name}
                    isActive={window.location.pathname === item.path}
                    className={`w-full px-2 md:px-3 py-2 rounded-lg transition-colors ${
                      window.location.pathname === item.path ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-accent'
                    } ${language === 'ar' ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}
                  >
                    <item.icon className="h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3" />
                    <span className="w-full text-sm md:text-base">{item.name}</span>
                    {item.hasCounter && unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="text-xs animate-pulse ml-auto flex-shrink-0"
                      >
                        {unreadCount}
                      </Badge>
                    )}
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
          <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6 shadow-sm">
            <div className={`flex items-center ${language === 'ar' ? 'order-2' : 'order-1'}`}>
              <SidebarTrigger className="md:hidden">
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
            </div>
            <div className={`flex items-center gap-2 md:gap-4 ${language === 'ar' ? 'order-1' : 'order-2'}`}>
              <NotificationsMenu />
              
              {/* Report Bug Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReportBugOpen(true)}
                className="h-8 w-8 md:h-9 md:w-9 p-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                title="Report Bug"
              >
                <Bug className="h-4 w-4" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 md:h-9 w-auto flex items-center gap-2 rounded-full p-0">
                    <span className="hidden md:inline-block text-sm">{user?.name}</span>
                    <Avatar className="h-7 w-7 md:h-8 md:w-8">
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
          <main className="flex-1 overflow-auto p-2 sm:p-4 md:p-6">{children}</main>
        </div>
      </div>
      
      {/* Report Bug Modal */}
      <ReportBugModal 
        isOpen={isReportBugOpen} 
        onClose={() => setIsReportBugOpen(false)} 
      />
    </SidebarProvider>
  );
};

export default SidebarNavigation;
