
import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import DashboardStats from '@/components/DashboardStats';
import CheckInHistory from '@/components/CheckInHistory';
import ReportHistory from '@/components/ReportHistory';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckIn } from '@/contexts/CheckInContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
      calendar: "Calendar View",
      tasks: "Tasks Management",
      employees: "View All Employees",
      upcomingTasks: "Upcoming Tasks",
      overdueTasks: "Overdue Tasks"
    },
    ar: {
      welcome: "مرحبا",
      dashboard: "نظرة عامة على لوحة التحكم",
      checkInToday: "لم تقم بتسجيل الدخول اليوم",
      checkInDesc: "الرجاء تسجيل الدخول لتسجيل حضورك لهذا اليوم.",
      checkInNow: "سجل الدخول الآن",
      checkInsHistory: "تسجيلات الدخول الأخيرة",
      reportsHistory: "التقارير الأخيرة",
      calendar: "عرض التقويم",
      tasks: "إدارة المهام",
      employees: "عرض جميع الموظفين",
      upcomingTasks: "المهام القادمة",
      overdueTasks: "المهام المتأخرة"
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

  const userCheckIns = user.role === 'admin' ? checkIns : getUserCheckIns(user.id);
  const userReports = user.role === 'admin' ? workReports : getUserWorkReports(user.id);
  const checkedInToday = hasCheckedInToday(user.id);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
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
          title={t.dashboard} 
          checkIns={userCheckIns} 
          workReports={userReports}
          isAdmin={user.role === 'admin'}
        />

        {!checkedInToday && user.role !== 'admin' && (
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

        <Tabs defaultValue="history" className="mt-6">
          <TabsList className="mb-4">
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="calendar">
              <Calendar className="h-4 w-4 mr-2" />
              {t.calendar}
            </TabsTrigger>
            <TabsTrigger value="tasks">{t.tasks}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="history">
            <div className="grid gap-6">
              <CheckInHistory checkIns={userCheckIns} title={t.checkInsHistory} />
              <ReportHistory reports={userReports} title={t.reportsHistory} />
              
              {user.role === 'admin' && (
                <div className="flex justify-end mt-4">
                  <Button variant="outline" onClick={() => navigate('/employees')}>{t.employees}</Button>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <CardTitle>{t.calendar}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[500px] flex items-center justify-center text-muted-foreground">
                  Calendar view coming soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="tasks">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">{t.upcomingTasks}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No upcoming tasks
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">{t.overdueTasks}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No overdue tasks
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
