import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Calendar,
  Clock,
  LayoutDashboard,
  LogIn,
  ListTodo,
  FileText,
  Brush,
  MessageSquare,
  Star,
  Bug,
  BarChart3,
  ShoppingCart,
  Wrench,
  Crown,
  TrendingUp,
  Edit3,
  Package,
  Globe
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
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent
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
import WorkShiftTimer from '@/components/WorkShiftTimer';
import VersionDisplay from '@/components/VersionDisplay';

interface SidebarNavigationProps {
  children?: React.ReactNode;
}

const SidebarNavigation = ({ children }: SidebarNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { language, t } = useLanguage();
  const { unreadCount } = useWorkspaceMessages();
  const isMobile = useIsMobile();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isReportBugOpen, setIsReportBugOpen] = useState(false);
  
  // Ref to track sidebar scroll position
  const sidebarContentRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Navigation with simple scroll preservation
  const handleNavigation = (path: string) => {
    // Save current scroll position immediately before navigation
    if (sidebarContentRef.current) {
      const scrollTop = sidebarContentRef.current.scrollTop;
      scrollPositionRef.current = scrollTop;
      sessionStorage.setItem('sidebar-scroll-position', scrollTop.toString());
    }
    navigate(path);
  };

  // Restore scroll position immediately after route change - no delays
  useEffect(() => {
    if (sidebarContentRef.current && scrollPositionRef.current > 0) {
      // Set scroll position directly without setTimeout to prevent jumping
      sidebarContentRef.current.scrollTop = scrollPositionRef.current;
    }
  }, [location.pathname]);

  // Track scroll position continuously
  const handleScroll = () => {
    if (sidebarContentRef.current) {
      const scrollTop = sidebarContentRef.current.scrollTop;
      scrollPositionRef.current = scrollTop;
      
      // Throttle sessionStorage updates
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        sessionStorage.setItem('sidebar-scroll-position', scrollTop.toString());
      }, 100);
    }
  };

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

  // Load initial scroll position on mount
  useEffect(() => {
    if (sidebarContentRef.current) {
      const savedPosition = sessionStorage.getItem('sidebar-scroll-position');
      if (savedPosition) {
        const scrollPosition = parseInt(savedPosition, 10);
        sidebarContentRef.current.scrollTop = scrollPosition;
        scrollPositionRef.current = scrollPosition;
      }
    }
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  // Define interface for nav items
  interface NavItem {
    name: string;
    path: string;
    icon: any;
    color?: string;
    adminOnly?: boolean;
    employeeOnly?: boolean;
    customerServiceAndDesignerOnly?: boolean;
    customerServiceOnly?: boolean;
    shiftsAccess?: boolean;
    mediaBuyerOnly?: boolean;
    designerOnly?: boolean;
    excludeMediaBuyer?: boolean;
    excludeDesigner?: boolean;
    excludeCopyWriting?: boolean;
    copyWritingOnly?: boolean;
    hasCounter?: boolean;
  }

  // Organize navigation items into groups with colors
  const navGroups = [
    {
      label: 'Overview',
      color: 'blue',
      items: [
        { name: t('dashboard') as string, path: user?.role === 'admin' ? '/dashboard' : '/employee-dashboard', icon: Home, color: 'blue', excludeCopyWriting: true },
        { name: 'Dashboard', path: '/copy-writing-dashboard', icon: Edit3, copyWritingOnly: true, color: 'blue' },
        { name: 'Analytics', path: '/analytics', icon: BarChart3, adminOnly: true, color: 'purple' },
      ] as NavItem[]
    },
    {
      label: 'Employee Management',
      color: 'green',
      items: [
        { name: t('employees') as string, path: '/employees', icon: Users, adminOnly: true, color: 'green' },
        { name: 'Employee Ratings', path: '/admin-ratings', icon: Star, adminOnly: true, color: 'yellow' },
        { name: 'Shift Management', path: '/admin-shift-management', icon: Calendar, adminOnly: true, color: 'teal' },
        { name: 'Performance', path: '/performance-dashboard', icon: TrendingUp, adminOnly: true, color: 'purple' },
      ] as NavItem[]
    },
    {
      label: 'Task Management',
      color: 'orange',
      items: [
        { name: t('tasks') as string, path: user?.role === 'admin' ? '/tasks' : '/employee-tasks', icon: CheckSquare, color: 'orange', excludeDesigner: true },
        { name: 'Media Buyer Dashboard', path: '/media-buyer-tasks', icon: TrendingUp, mediaBuyerOnly: true, color: 'amber' },
        { name: 'Design Studio', path: '/designer-dashboard', icon:  Brush, designerOnly: true, color: 'purple' },
        { name: 'My Ratings', path: '/my-ratings', icon: Star, employeeOnly: true, color: 'yellow' },
      ] as NavItem[]
    },
    {
      label: 'Reports & Data',
      color: 'indigo',
      items: [
        { name: t('reports') as string, path: '/reports', icon: ClipboardList, adminOnly: true, color: 'indigo' },
        { name: 'Bug Reports', path: '/admin-bug-reports', icon: Bug, adminOnly: true, color: 'red' },
        { name: t('dailyReport') as string, path: '/report', icon: ClipboardList, employeeOnly: true, color: 'blue' },
      ] as NavItem[]
    },
    {
      label: 'Time & Attendance',
      color: 'cyan',
      items: [
        { name: t('checkIn') as string, path: '/check-in', icon: User, customerServiceAndDesignerOnly: true, color: 'cyan' },
        { name: 'Shifts', path: '/shifts', icon: Clock, shiftsAccess: true, color: 'slate' },
      ] as NavItem[]
    },
    {
      label: 'Communication',
      color: 'pink',
      items: [
        { name: t('events') as string, path: '/events', icon: Calendar, color: 'pink' },
        { name: 'Workspace', path: '/workspace', icon: MessageSquare, hasCounter: true, color: 'violet' },
      ] as NavItem[]
    },
    {
      label: 'Customer Service Tools',
      color: 'emerald',
      items: [
        { name: 'CRM System', path: '/customer-service-crm', icon: Globe, customerServiceOnly: true, color: 'emerald' },
        { name: 'Create Order', path: '/create-order', icon: ShoppingCart, customerServiceOnly: true, color: 'emerald' },
        { name: 'Loyal Customers', path: '/loyal-customers', icon: Crown, customerServiceOnly: true, color: 'amber' },
      ] as NavItem[]
    },
    {
      label: 'Copy Writing Tools',
      color: 'blue',
      items: [
        { name: 'Products', path: '/copy-writing-products', icon: Package, copyWritingOnly: true, color: 'indigo' },
      ] as NavItem[]
    }
  ];

  // Color mapping function
  const getColorClasses = (color: string = 'gray', isActive: boolean = false) => {
    const colorMap: Record<string, { icon: string; text: string; activeIcon: string; activeText: string; activeBg: string }> = {
      blue: { 
        icon: 'text-blue-500', 
        text: 'text-blue-700', 
        activeIcon: 'text-blue-600', 
        activeText: 'text-blue-800', 
        activeBg: 'bg-blue-50 border-blue-200' 
      },
      purple: { 
        icon: 'text-purple-500', 
        text: 'text-purple-700', 
        activeIcon: 'text-purple-600', 
        activeText: 'text-purple-800', 
        activeBg: 'bg-purple-50 border-purple-200' 
      },
      green: { 
        icon: 'text-green-500', 
        text: 'text-green-700', 
        activeIcon: 'text-green-600', 
        activeText: 'text-green-800', 
        activeBg: 'bg-green-50 border-green-200' 
      },
      yellow: { 
        icon: 'text-yellow-500', 
        text: 'text-yellow-700', 
        activeIcon: 'text-yellow-600', 
        activeText: 'text-yellow-800', 
        activeBg: 'bg-yellow-50 border-yellow-200' 
      },
      orange: { 
        icon: 'text-orange-500', 
        text: 'text-orange-700', 
        activeIcon: 'text-orange-600', 
        activeText: 'text-orange-800', 
        activeBg: 'bg-orange-50 border-orange-200' 
      },
      red: { 
        icon: 'text-red-500', 
        text: 'text-red-700', 
        activeIcon: 'text-red-600', 
        activeText: 'text-red-800', 
        activeBg: 'bg-red-50 border-red-200' 
      },
      indigo: { 
        icon: 'text-indigo-500', 
        text: 'text-indigo-700', 
        activeIcon: 'text-indigo-600', 
        activeText: 'text-indigo-800', 
        activeBg: 'bg-indigo-50 border-indigo-200' 
      },
      cyan: { 
        icon: 'text-cyan-500', 
        text: 'text-cyan-700', 
        activeIcon: 'text-cyan-600', 
        activeText: 'text-cyan-800', 
        activeBg: 'bg-cyan-50 border-cyan-200' 
      },
      pink: { 
        icon: 'text-pink-500', 
        text: 'text-pink-700', 
        activeIcon: 'text-pink-600', 
        activeText: 'text-pink-800', 
        activeBg: 'bg-pink-50 border-pink-200' 
      },
      violet: { 
        icon: 'text-violet-500', 
        text: 'text-violet-700', 
        activeIcon: 'text-violet-600', 
        activeText: 'text-violet-800', 
        activeBg: 'bg-violet-50 border-violet-200' 
      },
      teal: { 
        icon: 'text-teal-500', 
        text: 'text-teal-700', 
        activeIcon: 'text-teal-600', 
        activeText: 'text-teal-800', 
        activeBg: 'bg-teal-50 border-teal-200' 
      },
      amber: { 
        icon: 'text-amber-500', 
        text: 'text-amber-700', 
        activeIcon: 'text-amber-600', 
        activeText: 'text-amber-800', 
        activeBg: 'bg-amber-50 border-amber-200' 
      },
      slate: { 
        icon: 'text-slate-500', 
        text: 'text-slate-700', 
        activeIcon: 'text-slate-600', 
        activeText: 'text-slate-800', 
        activeBg: 'bg-slate-50 border-slate-200' 
      },
      emerald: { 
        icon: 'text-emerald-500', 
        text: 'text-emerald-700', 
        activeIcon: 'text-emerald-600', 
        activeText: 'text-emerald-800', 
        activeBg: 'bg-emerald-50 border-emerald-200' 
      },
    };
    
    return colorMap[color] || colorMap.blue;
  };

  // Filter items based on user role and permissions
  const filteredNavGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (item.adminOnly && user?.role !== 'admin') return false;
      if (item.employeeOnly && user?.role === 'admin') return false;
      if (item.customerServiceAndDesignerOnly && user?.position !== 'Customer Service' && user?.position !== 'Designer') return false;
      if (item.customerServiceOnly && user?.position !== 'Customer Service') return false;
      if (item.shiftsAccess && !(user?.role === 'admin' || user?.position === 'Customer Service' || user?.position === 'Designer')) return false;
      if (item.mediaBuyerOnly && user?.position !== 'Media Buyer') return false;
      if (item.designerOnly && user?.position !== 'Designer') return false;
      if (item.copyWritingOnly && user?.position !== 'Copy Writing') return false;
      if (item.excludeMediaBuyer && user?.position === 'Media Buyer') return false;
      if (item.excludeDesigner && user?.position === 'Designer') return false;
      if (item.excludeCopyWriting && user?.position === 'Copy Writing') return false;
      return true;
    })
  })).filter(group => group.items.length > 0); // Only show groups that have items

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <Sidebar
          className="sidebar-glass"
          side={language === 'ar' ? 'right' : 'left'}
        >
          <SidebarHeader className="flex h-16 items-center border-b px-4 md:px-6">
            <div className="flex items-center gap-3">
              <img src="/NQ-ICON.png" alt="Logo" className="h-8 w-8 md:h-10 md:w-10 rounded-full shadow" />
              <VersionDisplay variant="sidebar" />
            </div>
          </SidebarHeader>
          <SidebarContent 
            ref={sidebarContentRef}
            className="flex-1 overflow-y-auto py-2 md:py-4 scrollbar-hide"
            onScroll={handleScroll}
          >
            {filteredNavGroups.map((group) => {
              const groupColorClasses = getColorClasses(group.color);
              
              return (
                <SidebarGroup key={group.label}>
                  <SidebarGroupLabel className={`text-xs font-semibold uppercase tracking-wider mb-2 px-2 ${groupColorClasses.text}`}>
                    {group.label}
                  </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const isActive = window.location.pathname === item.path;
                      const colorClasses = getColorClasses(item.color, isActive);
                      
                      return (
                        <SidebarMenuItem key={item.name}>
                          <SidebarMenuButton
                            onClick={() => {
                              handleNavigation(item.path);
                            }}
                            tooltip={item.name}
                            isActive={isActive}
                            className={`w-full px-2 md:px-3 py-2 rounded-lg transition-all duration-200 border border-transparent ${
                              isActive 
                                ? `${colorClasses.activeBg} ${colorClasses.activeText} font-semibold shadow-sm` 
                                : `hover:bg-gray-50 ${colorClasses.text} hover:border-gray-200`
                            } ${language === 'ar' ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}
                          >
                            <item.icon className={`h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3 ${
                              isActive ? colorClasses.activeIcon : colorClasses.icon
                            }`} />
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
                      );
                    })}
                  </SidebarMenu>
                                  </SidebarGroupContent>
                </SidebarGroup>
              );
            })}
            </SidebarContent>
          
          <SidebarFooter>
            <div className="flex flex-col gap-2 p-2 md:p-3">
              {user?.role === 'admin' && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className={`justify-start w-full text-sm ${language === 'ar' ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}
                  onClick={() => handleNavigation('/settings')}
                >
                  <Settings className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                  {t('settings')}
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                className={`justify-start w-full text-red-500 hover:bg-red-50 hover:text-red-600 text-sm ${language === 'ar' ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}
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
            <div className={`flex items-center gap-2 md:gap-4 ${language === 'ar' ? 'order-2' : 'order-1'}`}>
              <SidebarTrigger />
              <WorkShiftTimer />
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
{user?.role === 'admin' && (
                    <DropdownMenuItem onClick={() => navigate('/settings')} className={language === 'ar' ? 'flex-row-reverse text-right' : 'flex-row text-left'}>
                      <Settings className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                      {t('settings')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleLogout} className={`text-red-500 ${language === 'ar' ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}>
                    <LogOut className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                    {t('signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
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
