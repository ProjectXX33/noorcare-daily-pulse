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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 w-full max-w-full overflow-x-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Enhanced mobile-optimized header - Non-sticky, responsive layout */}
      <div className="border-b border-border/50 bg-background/98 w-full">
        <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6 w-full max-w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
            <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                {t.welcome}, {user.name}
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                {new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 space-y-6 sm:space-y-8 md:space-y-10 w-full max-w-full overflow-x-hidden">
        {/* Mobile-optimized dashboard stats */}
        <DashboardStats 
          title={t.dashboard} 
          checkIns={checkIns as unknown as CheckIn[]}
          workReports={workReports as unknown as WorkReport[]}
          isAdmin={user.role === 'admin'}
        />

        {/* Mobile-optimized check-in reminder */}
        {!checkedInToday && (
          <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-md dark:bg-amber-900/20 dark:border-amber-900/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex-1">
                <h3 className="font-medium text-amber-800 dark:text-amber-200 text-sm sm:text-base">{t.checkInToday}</h3>
                <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 mt-1">{t.checkInDesc}</p>
              </div>
              <Button 
                onClick={() => navigate('/check-in')} 
                className="bg-primary hover:bg-primary/90 w-full sm:w-auto min-h-[44px]"
                size="sm"
              >
                {t.checkInNow}
              </Button>
            </div>
          </div>
        )}

        {/* Mobile-optimized tabs */}
        <Tabs defaultValue="history" className="mt-4 md:mt-6">
          <TabsList className="mb-3 md:mb-4 w-full grid grid-cols-2 h-auto p-1">
            <TabsTrigger value="history" className="text-xs sm:text-sm py-2 px-3">
              {t.history}
            </TabsTrigger>
            {user.role === 'admin' && (
              <TabsTrigger value="management" className="text-xs sm:text-sm py-2 px-3">
                {t.management}
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="history" className="mt-0">
            <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
              <div className="bg-card rounded-lg p-3 sm:p-4 border shadow-sm">
                <CheckInHistory checkIns={userCheckIns.slice(0, 5)} title={t.checkInsHistory} />
              </div>
              <div className="bg-card rounded-lg p-3 sm:p-4 border shadow-sm">
                <ReportHistory 
                  reports={userReports.slice(0, 5) as any} 
                  title={t.reportsHistory} 
                />
              </div>
            </div>
          </TabsContent>
          
          {user.role === 'admin' && (
            <TabsContent value="management" className="mt-0">
              <div className="grid gap-3 sm:gap-4 md:gap-6">
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  <Button 
                    onClick={() => navigate('/employees')} 
                    className="p-4 sm:p-6 md:p-8 h-auto flex flex-col gap-2 bg-card hover:bg-card/80 text-foreground shadow-sm border min-h-[100px] sm:min-h-[120px]"
                  >
                    <UsersIcon className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 mb-1 md:mb-2" />
                    <span className="text-sm sm:text-base md:text-lg font-medium text-center">{t.employees}</span>
                  </Button>
                  <Button 
                    onClick={() => navigate('/tasks')} 
                    className="p-4 sm:p-6 md:p-8 h-auto flex flex-col gap-2 bg-card hover:bg-card/80 text-foreground shadow-sm border min-h-[100px] sm:min-h-[120px]"
                  >
                    <CheckSquare className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 mb-1 md:mb-2" />
                    <span className="text-sm sm:text-base md:text-lg font-medium text-center">{t.tasks}</span>
                  </Button>
                  <Button 
                    onClick={() => navigate('/reports')} 
                    className="p-4 sm:p-6 md:p-8 h-auto flex flex-col gap-2 bg-card hover:bg-card/80 text-foreground shadow-sm border min-h-[100px] sm:min-h-[120px] sm:col-span-2 lg:col-span-1"
                  >
                    <ClipboardCheckIcon className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 mb-1 md:mb-2" />
                    <span className="text-sm sm:text-base md:text-lg font-medium text-center">{t.reports}</span>
                  </Button>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
