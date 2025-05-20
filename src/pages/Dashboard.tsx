
import React, { useState, useEffect } from 'react';
import DashboardCard from '@/components/DashboardCard';
import CheckInHistory from '@/components/CheckInHistory';
import ReportHistory from '@/components/ReportHistory';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckIn } from '@/contexts/CheckInContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckIn, WorkReport } from '@/types';
import DashboardStats from '@/components/DashboardStats';
import { 
  UsersIcon, 
  ClipboardCheckIcon, 
  Clock,
  CalendarDays,
  CheckSquare
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const { checkIns, workReports, getUserCheckIns, getUserWorkReports, hasCheckedInToday, isLoading } = useCheckIn();
  const navigate = useNavigate();
  const [language, setLanguage] = useState('en');

  // Translation object for multilingual support
  const translations = {
    en: {
      welcome: "Welcome",
      dashboard: "Dashboard Overview",
      checkInToday: "You haven't checked in today",
      checkInDesc: "Please check in to record your attendance for today.",
      checkInNow: "Check In Now",
      checkInsHistory: "Recent Check-ins",
      reportsHistory: "Recent Reports",
      tasks: "Tasks Management",
      employees: "View All Employees",
      today: "Today's Activity",
      history: "History",
      management: "Management",
      reports: "View All Reports"
    },
    ar: {
      welcome: "مرحبا",
      dashboard: "نظرة عامة على لوحة التحكم",
      checkInToday: "لم تقم بتسجيل الدخول اليوم",
      checkInDesc: "الرجاء تسجيل الدخول لتسجيل حضورك لهذا اليوم.",
      checkInNow: "سجل الدخول الآن",
      checkInsHistory: "تسجيلات الدخول الأخيرة",
      reportsHistory: "التقارير الأخيرة",
      tasks: "إدارة المهام",
      employees: "عرض جميع الموظفين",
      today: "نشاط اليوم",
      history: "التاريخ",
      management: "الإدارة",
      reports: "عرض جميع التقارير"
    }
  };

  useEffect(() => {
    const storedLang = localStorage.getItem('preferredLanguage');
    if (storedLang && (storedLang === 'en' || storedLang === 'ar')) {
      setLanguage(storedLang);
    }
  }, []);

  const t = translations[language as keyof typeof translations];

  if (!user) return null;

  const userCheckIns = user.role === 'admin' 
    ? checkIns as unknown as CheckIn[] 
    : getUserCheckIns(user.id) as unknown as CheckIn[];
    
  const userReports = user.role === 'admin' 
    ? workReports as unknown as WorkReport[] 
    : getUserWorkReports(user.id) as unknown as WorkReport[];

  const checkedInToday = hasCheckedInToday(user.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold mb-2 text-balance">
          {t.welcome}, {user.name}
        </h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Replace the grid of DashboardCard with DashboardStats component */}
      <DashboardStats 
        title={t.dashboard} 
        checkIns={checkIns as unknown as CheckIn[]}
        workReports={workReports as unknown as WorkReport[]}
        isAdmin={user.role === 'admin'}
      />

      {!checkedInToday && user.role !== 'admin' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-md dark:bg-amber-900/20 dark:border-amber-900/30">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-amber-800 dark:text-amber-200">{t.checkInToday}</h3>
              <p className="text-sm text-amber-700 dark:text-amber-300">{t.checkInDesc}</p>
            </div>
            <Button onClick={() => navigate('/check-in')} className="bg-primary hover:bg-primary/90">
              {t.checkInNow}
            </Button>
          </div>
        </div>
      )}

      <Tabs defaultValue="history" className="mt-6">
        <TabsList className="mb-4 w-full flex overflow-auto md:w-auto">
          <TabsTrigger value="history" className="flex-1 md:flex-none">{t.history}</TabsTrigger>
          {user.role === 'admin' && (
            <TabsTrigger value="management" className="flex-1 md:flex-none">{t.management}</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="history">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-card rounded-lg p-4 border shadow-sm">
              <CheckInHistory checkIns={userCheckIns.slice(0, 5)} title={t.checkInsHistory} />
            </div>
            <div className="bg-card rounded-lg p-4 border shadow-sm">
              <ReportHistory 
                reports={userReports.slice(0, 5) as any} 
                title={t.reportsHistory} 
              />
            </div>
          </div>
        </TabsContent>
        
        {user.role === 'admin' && (
          <TabsContent value="management">
            <div className="grid gap-6">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                <Button 
                  onClick={() => navigate('/employees')} 
                  className="p-8 h-auto flex flex-col gap-2 bg-card hover:bg-card/80 text-foreground shadow-sm border"
                >
                  <UsersIcon className="h-8 w-8 mb-2" />
                  <span className="text-lg font-medium">{t.employees}</span>
                </Button>
                <Button 
                  onClick={() => navigate('/tasks')} 
                  className="p-8 h-auto flex flex-col gap-2 bg-card hover:bg-card/80 text-foreground shadow-sm border"
                >
                  <CheckSquare className="h-8 w-8 mb-2" />
                  <span className="text-lg font-medium">{t.tasks}</span>
                </Button>
                <Button 
                  onClick={() => navigate('/reports')} 
                  className="p-8 h-auto flex flex-col gap-2 bg-card hover:bg-card/80 text-foreground shadow-sm border"
                >
                  <ClipboardCheckIcon className="h-8 w-8 mb-2" />
                  <span className="text-lg font-medium">{t.reports}</span>
                </Button>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Dashboard;
