
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Home, 
  Users, 
  ClipboardList, 
  CheckSquare, 
  User, 
  LogOut,
  Settings
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

interface SidebarNavigationProps {
  children: React.ReactNode;
}

export const SidebarNavigation = ({ children }: SidebarNavigationProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [language, setLanguage] = useState(() => localStorage.getItem('preferredLanguage') || 'en');
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  const adminNavItems = [
    { name: 'Dashboard', icon: Home, path: '/dashboard' },
    { name: 'Employees', icon: Users, path: '/employees' },
    { name: 'Reports', icon: ClipboardList, path: '/reports' },
    { name: 'Tasks', icon: CheckSquare, path: '/tasks' }
  ];

  const employeeNavItems = [
    { name: 'Dashboard', icon: Home, path: '/employee-dashboard' },
    { name: 'Check In', icon: CheckSquare, path: '/check-in' },
    { name: 'Daily Report', icon: ClipboardList, path: '/report' },
    { name: 'Tasks', icon: CheckSquare, path: '/employee-tasks' }
  ];

  const navItems = user?.role === 'admin' ? adminNavItems : employeeNavItems;
  
  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex min-h-screen w-full" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <Sidebar variant="inset" className="sticky top-0 h-screen">
          <SidebarHeader className="flex h-14 items-center border-b px-4">
            <div className="flex items-center gap-2">
              <img
                src="/lovable-uploads/da15fff1-1f54-460e-ab4d-bec7311e7ed0.png"
                alt="NoorCare Logo"
                className="h-8 w-8"
              />
              <span className="text-lg font-bold text-primary">NoorCare</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    tooltip={item.name}
                    isActive={window.location.pathname === item.path}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="mt-auto">
            <div className="flex flex-col gap-2 p-2">
              <Button 
                variant="ghost" 
                className="justify-start" 
                onClick={() => navigate('/profile')}
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
              <Button 
                variant="ghost" 
                className="justify-start text-red-500 hover:bg-red-50 hover:text-red-600" 
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        
        <div className="flex flex-col flex-1">
          <header className="h-14 border-b flex items-center justify-between px-4 bg-background z-10">
            <div className="flex items-center">
              <SidebarTrigger />
            </div>
            <div className="flex items-center gap-2">
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
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col gap-1">
                      <p className="font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-red-500">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
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
