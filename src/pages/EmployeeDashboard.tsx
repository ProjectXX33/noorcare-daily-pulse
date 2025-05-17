import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import DashboardStats from '@/components/DashboardStats';
import CheckInHistory from '@/components/CheckInHistory';
import ReportHistory from '@/components/ReportHistory';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckIn } from '@/contexts/CheckInContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { CheckIn, WorkReport } from '@/types';

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
      viewTasks: "View Tasks"
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
      viewTasks: "عرض المهام"
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

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-gray-600">{t.loading}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex flex-col" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="sticky top-16 z-10 bg-background pt-2 pb-4">
          <h1 className="text-2xl font-bold mb-6">
            {t.welcome}, {user.name}
          </h1>
        </div>

        <DashboardStats 
          title={t.yourOverview} 
          checkIns={userCheckIns} 
          workReports={userReports}
          isAdmin={false}
        />

        {!checkedInToday && (
          <div className="my-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-medium text-amber-800">{t.checkInToday}</h3>
                <p className="text-sm text-amber-700">{t.checkInDesc}</p>
              </div>
              <Button onClick={() => navigate('/check-in')} className="bg-primary hover:bg-primary/90">
                {t.checkInNow}
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-6">
          <CheckInHistory 
            checkIns={userCheckIns.slice(0, 5)} 
            title={t.recentCheckins} 
          />
          
          <ReportHistory 
            reports={userReports.slice(0, 3) as unknown as WorkReport[]} 
            title={t.recentReports} 
          />
          
          <div className="flex space-x-4 mt-4">
            <Button 
              className="bg-primary hover:bg-primary/90" 
              onClick={() => navigate('/employee-tasks')}
            >
              {t.viewTasks}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default EmployeeDashboard;
