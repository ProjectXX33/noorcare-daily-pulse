
import React, { useState, useEffect } from 'react';
import SidebarNavigation from '@/components/SidebarNavigation';
import DashboardCard from '@/components/DashboardCard';
import CheckInHistory from '@/components/CheckInHistory';
import ReportHistory from '@/components/ReportHistory';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckIn } from '@/contexts/CheckInContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { CheckIn, WorkReport } from '@/types';
import { Loader2, Clock, CalendarDays, ClipboardList, CheckSquare } from 'lucide-react';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const { 
    getUserCheckIns, 
    getUserWorkReports, 
    hasCheckedInToday,
    isLoading
  } = useCheckIn();
  const navigate = useNavigate();
  const [language, setLanguage] = useState('en');

  // Translation object for multilingual support
  const translations = {
    en: {
      welcome: "Welcome",
      yourOverview: "Your Overview",
      checkInToday: "You haven't checked in today",
      checkInDesc: "Please check in to record your attendance for today.",
      checkInNow: "Check In Now",
      loading: "Loading your dashboard...",
      recentCheckins: "Your Recent Check-ins",
      recentReports: "Your Recent Reports",
      tasks: "Tasks",
      viewTasks: "View Tasks",
      todayCheckIns: "Today's Check-in",
      todayReports: "Today's Report",
      totalReports: "Total Reports"
    },
    ar: {
      welcome: "مرحبا",
      yourOverview: "نظرة عامة",
      checkInToday: "لم تقم بتسجيل الدخول اليوم",
      checkInDesc: "الرجاء تسجيل الدخول لتسجيل حضورك لهذا اليوم.",
      checkInNow: "سجل الدخول الآن",
      loading: "جاري تحميل لوحة التحكم الخاصة بك...",
      recentCheckins: "تسجيلات الدخول الأخيرة",
      recentReports: "التقارير الأخيرة",
      tasks: "المهام",
      viewTasks: "عرض المهام",
      todayCheckIns: "تسجيل الدخول اليوم",
      todayReports: "تقرير اليوم",
      totalReports: "مجموع التقارير"
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

  const userCheckIns = getUserCheckIns(user.id) as unknown as CheckIn[];
  const userReports = getUserWorkReports(user.id) as unknown as WorkReport[];
  const checkedInToday = hasCheckedInToday(user.id);
  
  // Get today's reports
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayReports = userReports.filter(report => {
    const reportDate = new Date(report.date);
    reportDate.setHours(0, 0, 0, 0);
    return reportDate.getTime() === today.getTime();
  });

  if (isLoading) {
    return (
      <SidebarNavigation>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-gray-600">{t.loading}</p>
          </div>
        </div>
      </SidebarNavigation>
    );
  }

  return (
    <SidebarNavigation>
      <div className="space-y-6">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold mb-2">
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

        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <DashboardCard 
            title={t.todayCheckIns}
            value={checkedInToday ? "Completed" : "Not checked in"}
            description={checkedInToday ? "You've checked in today" : "You haven't checked in yet"}
            icon={<Clock className="h-4 w-4" />}
            variant={checkedInToday ? "success" : "warning"}
          />
          
          <DashboardCard 
            title={t.todayReports}
            value={todayReports.length > 0 ? "Submitted" : "Not submitted"}
            description={todayReports.length > 0 ? "You've submitted today's report" : "You haven't submitted today's report"}
            icon={<ClipboardList className="h-4 w-4" />}
            variant={todayReports.length > 0 ? "success" : "warning"}
          />
          
          <DashboardCard 
            title={t.totalReports}
            value={userReports.length.toString()}
            description="Your total submitted reports"
            icon={<CalendarDays className="h-4 w-4" />}
            variant="default"
          />
        </div>

        {!checkedInToday && (
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

        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-card rounded-lg p-4 border shadow-sm">
            <CheckInHistory 
              checkIns={userCheckIns.slice(0, 5)} 
              title={t.recentCheckins} 
            />
          </div>
          
          <div className="bg-card rounded-lg p-4 border shadow-sm">
            <ReportHistory 
              reports={userReports.slice(0, 3) as any}
              title={t.recentReports} 
            />
          </div>
        </div>
          
        <div className="flex">
          <Button 
            className="bg-primary hover:bg-primary/90 px-6" 
            onClick={() => navigate('/employee-tasks')}
          >
            <CheckSquare className="mr-2 h-4 w-4" />
            {t.viewTasks}
          </Button>
        </div>
      </div>
    </SidebarNavigation>
  );
};

export default EmployeeDashboard;
