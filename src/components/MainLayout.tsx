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
const MainLayout = ({
  children
}: MainLayoutProps) => {
  const navigate = useNavigate();
  const {
    user,
    logout
  } = useAuth();
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
  const navItems = [...(user?.role === 'admin' ? [{
    name: t.dashboard,
    icon: Home,
    path: '/dashboard'
  }, {
    name: t.employees,
    icon: Users,
    path: '/employees'
  }, {
    name: t.reports,
    icon: ClipboardList,
    path: '/reports'
  }, {
    name: t.tasks,
    icon: CheckSquare,
    path: '/tasks'
  }] : [{
    name: t.employeeDashboard,
    icon: Home,
    path: '/employee-dashboard'
  }, {
    name: t.checkIn,
    icon: CheckSquare,
    path: '/check-in'
  }, {
    name: t.dailyReport,
    icon: CalendarDays,
    path: '/report'
  }, {
    name: t.tasks,
    icon: CheckSquare,
    path: '/employee-tasks'
  }])];
  return <div className="min-h-screen flex flex-col bg-background" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b shadow-sm sticky top-0 z-50 transition-all">
        
      </header>

      {/* Main content */}
      <main className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>
    </div>;
};
export default MainLayout;