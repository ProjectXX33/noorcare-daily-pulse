
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, User, Home, CalendarDays, CheckSquare, ClipboardList, Users, LogOut, Bell } from 'lucide-react';
import NotificationsMenu from '@/components/NotificationsMenu';
import { useIsMobile } from '@/hooks/use-mobile';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [language, setLanguage] = useState('en');
  const isMobile = useIsMobile();

  // Translation object for multilingual support
  const translations = {
    en: {
      dashboard: "Dashboard",
      employeeDashboard: "My Dashboard",
      checkIn: "Check In",
      dailyReport: "Daily Report",
      employees: "Employees",
      reports: "Reports",
      tasks: "Tasks",
      profile: "Profile",
      signOut: "Sign Out",
      welcome: "Welcome"
    },
    ar: {
      dashboard: "لوحة التحكم",
      employeeDashboard: "لوحة التحكم الخاصة بي",
      checkIn: "تسجيل الدخول",
      dailyReport: "التقرير اليومي",
      employees: "الموظفين",
      reports: "التقارير",
      tasks: "المهام",
      profile: "الملف الشخصي",
      signOut: "تسجيل الخروج",
      welcome: "مرحبا"
    }
  };

  useEffect(() => {
    const storedLang = localStorage.getItem('preferredLanguage');
    if (storedLang && (storedLang === 'en' || storedLang === 'ar')) {
      setLanguage(storedLang);
      document.documentElement.dir = storedLang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = storedLang;
    }
  }, []);

  const t = translations[language as keyof typeof translations];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    ...(user?.role === 'admin' ? [
      { name: t.dashboard, icon: Home, path: '/dashboard' },
      { name: t.employees, icon: Users, path: '/employees' },
      { name: t.reports, icon: ClipboardList, path: '/reports' },
      { name: t.tasks, icon: CheckSquare, path: '/tasks' },
    ] : [
      { name: t.employeeDashboard, icon: Home, path: '/employee-dashboard' },
      { name: t.checkIn, icon: CheckSquare, path: '/check-in' },
      { name: t.dailyReport, icon: CalendarDays, path: '/report' },
      { name: t.tasks, icon: CheckSquare, path: '/employee-tasks' },
    ])
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b shadow-sm sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <img
                  src="/lovable-uploads/da15fff1-1f54-460e-ab4d-bec7311e7ed0.png"
                  alt="NoorCare Logo"
                  className="h-8 w-8 mr-2"
                />
                <span className="text-lg font-bold text-primary-600 transition-colors">NoorCare</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-4">
              {navItems.map((item) => (
                <Button
                  key={item.name}
                  variant="ghost"
                  className="flex items-center space-x-1 transition-colors hover:bg-primary-50 hover:text-primary-600"
                  onClick={() => navigate(item.path)}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Button>
              ))}
            </nav>

            {/* User menu and mobile menu button */}
            <div className="flex items-center">
              {/* Notifications */}
              <div className="mr-2">
                <NotificationsMenu />
              </div>

              {/* User menu */}
              <div className="ml-3 relative flex items-center">
                <Button variant="ghost" className="flex items-center space-x-1 rounded-full p-2 hover:bg-primary-50" onClick={() => {}}>
                  <User className="h-5 w-5 text-primary-600" />
                  <span className="hidden sm:block ml-1">{user?.name}</span>
                </Button>

                <Button variant="ghost" onClick={handleLogout} className="ml-2 hover:bg-red-50 hover:text-red-600 transition-colors">
                  <LogOut className="h-5 w-5" />
                  <span className="sr-only">{t.signOut}</span>
                </Button>
              </div>

              {/* Mobile menu button */}
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" className="md:hidden ml-2">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side={language === 'ar' ? 'right' : 'left'} className="w-[250px] sm:w-[300px] border-r border-border">
                  <div className="flex flex-col h-full">
                    <div className="px-4 py-6 border-b">
                      <div className="flex items-center">
                        <img
                          src="/lovable-uploads/da15fff1-1f54-460e-ab4d-bec7311e7ed0.png"
                          alt="NoorCare Logo"
                          className="h-8 w-8 mr-2"
                        />
                        <span className="text-lg font-bold text-primary-600">NoorCare</span>
                      </div>
                      <div className="mt-6">
                        <p className="text-sm text-muted-foreground">
                          {t.welcome}, <span className="font-semibold">{user?.name}</span>
                        </p>
                      </div>
                    </div>
                    <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto scrollbar-hide">
                      {navItems.map((item) => (
                        <Button
                          key={item.name}
                          variant="ghost"
                          className="w-full justify-start hover:bg-primary-50 hover:text-primary-600 transition-colors mb-1"
                          onClick={() => {
                            navigate(item.path);
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          <item.icon className="h-5 w-5 mr-3" />
                          {item.name}
                        </Button>
                      ))}
                      <div className="pt-4 mt-4 border-t border-border">
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                          onClick={handleLogout}
                        >
                          <LogOut className="h-5 w-5 mr-3" />
                          {t.signOut}
                        </Button>
                      </div>
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
