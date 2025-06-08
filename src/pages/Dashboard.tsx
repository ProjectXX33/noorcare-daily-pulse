import React, { useState, useEffect } from 'react';
import DashboardCard from '@/components/DashboardCard';
import CheckInHistory from '@/components/CheckInHistory';
import ReportHistory from '@/components/ReportHistory';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckIn } from '@/contexts/CheckInContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckIn, WorkReport } from '@/types';
import DashboardStats from '@/components/DashboardStats';
import AnimatedLoader from '@/components/AnimatedLoader';
import { 
  UsersIcon, 
  ClipboardCheckIcon, 
  Clock,
  CalendarDays,
  CheckSquare,
  BarChart3
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const { checkIns, workReports, getUserCheckIns, getUserWorkReports, hasCheckedInToday, isLoading } = useCheckIn();
  const navigate = useNavigate();
  const [language, setLanguage] = useState('en');
  
  // Filter states
  const [filters, setFilters] = useState({
    employeeName: 'all-employees',
    month: '',
    checkInStatus: 'all' // 'all', 'checked-in', 'checked-out', 'not-checked-in'
  });

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
      reports: "View All Reports",
      filters: "Filters",
      employeeName: "Employee Name",
      selectMonth: "Select Month",
      checkInStatus: "Check-in Status",
      allEmployees: "All Employees",
      allMonths: "All Months",
      selectEmployee: "Select Employee",
      checkedIn: "Checked In",
      checkedOut: "Checked Out",
      notCheckedIn: "Not Checked In",
      clearFilters: "Clear Filters"
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
      reports: "عرض جميع التقارير",
      filters: "المرشحات",
      employeeName: "اسم الموظف",
      selectMonth: "اختر الشهر",
      checkInStatus: "حالة تسجيل الدخول",
      allEmployees: "جميع الموظفين",
      allMonths: "جميع الأشهر",
      selectEmployee: "اختر الموظف",
      checkedIn: "سجل الدخول",
      checkedOut: "سجل الخروج",
      notCheckedIn: "لم يسجل الدخول",
      clearFilters: "مسح المرشحات"
    }
  };

  useEffect(() => {
    const storedLang = localStorage.getItem('preferredLanguage');
    if (storedLang && (storedLang === 'en' || storedLang === 'ar')) {
      setLanguage(storedLang);
    }
  }, []);

  const t = translations[language as keyof typeof translations];

  // Debug log
  console.log('Dashboard rendering, user:', user, 'isLoading:', isLoading);

  if (!user) return null;

  const userCheckIns = user.role === 'admin' 
    ? (checkIns as unknown as CheckIn[]) || []
    : (getUserCheckIns(user.id) as unknown as CheckIn[]) || [];
    
  const userReports = user.role === 'admin' 
    ? (workReports as unknown as WorkReport[]) || []
    : (getUserWorkReports(user.id) as unknown as WorkReport[]) || [];

  const checkedInToday = hasCheckedInToday(user.id);

  // Generate month options for the last 12 months
  const generateMonthOptions = () => {
    try {
      const months = [];
      const now = new Date();
      for (let i = 0; i < 12; i++) {
        const year = now.getFullYear();
        const month = now.getMonth() - i;
        const date = new Date(year, month, 1);
        
        // Use a more reliable way to get YYYY-MM format
        const actualYear = date.getFullYear();
        const actualMonth = date.getMonth() + 1; // getMonth() returns 0-11
        const value = `${actualYear}-${actualMonth.toString().padStart(2, '0')}`;
        
        const label = date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { 
          year: 'numeric', 
          month: 'long' 
        });
        months.push({
          value: value, // YYYY-MM format
          label: label
        });
      }
      return months;
    } catch (error) {
      console.error('Error generating month options:', error);
      return [];
    }
  };

  // Get unique employee names
  const getUniqueEmployees = () => {
    const allNames = new Set<string>();
    userCheckIns.forEach(checkIn => {
      if (checkIn.userName) allNames.add(checkIn.userName);
    });
    userReports.forEach(report => {
      if (report.userName) allNames.add(report.userName);
    });
    return Array.from(allNames).sort();
  };

  // Filter check-ins based on current filters
  const filteredCheckIns = (userCheckIns || []).filter(checkIn => {
    if (!checkIn) return false;
    
    try {
      // Employee name filter
      if (filters.employeeName && filters.employeeName !== 'all-employees' && checkIn.userName !== filters.employeeName) {
        return false;
      }

      // Month filter
      if (filters.month && checkIn.timestamp) {
        const checkInDate = new Date(checkIn.timestamp);
        const checkInMonth = checkInDate.toISOString().slice(0, 7);
        if (checkInMonth !== filters.month) {
          return false;
        }
      }

      // Check-in status filter
      if (filters.checkInStatus !== 'all' && checkIn.timestamp) {
        const hasCheckOut = checkIn.checkOutTime;
        const today = new Date().toDateString();
        const checkInToday = new Date(checkIn.timestamp).toDateString() === today;
        
        switch (filters.checkInStatus) {
          case 'checked-in':
            if (!checkInToday || hasCheckOut) return false;
            break;
          case 'checked-out':
            if (!hasCheckOut) return false;
            break;
          case 'not-checked-in':
            if (checkInToday) return false;
            break;
        }
      }

      return true;
    } catch (error) {
      console.error('Error filtering check-ins:', error);
      return true; // Show item if there's an error
    }
  });

  // Filter reports based on current filters
  const filteredReports = (userReports || []).filter(report => {
    if (!report) return false;
    
    try {
      // Employee name filter
      if (filters.employeeName && filters.employeeName !== 'all-employees' && report.userName !== filters.employeeName) {
        return false;
      }

      // Month filter
      if (filters.month && report.date) {
        const reportDate = new Date(report.date);
        const reportMonth = reportDate.toISOString().slice(0, 7);
        if (reportMonth !== filters.month) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error filtering reports:', error);
      return true; // Show item if there's an error
    }
  });

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      employeeName: 'all-employees',
      month: '',
      checkInStatus: 'all'
    });
  };

  if (isLoading) {
    return <AnimatedLoader text="Loading dashboard..." />;
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

        {/* Mobile-optimized check-in reminder - Only for employees */}
        {!checkedInToday && user.role === 'employee' && (
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

        {/* Filters Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t.filters}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {/* Employee Name Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.employeeName}</label>
                <Select value={filters.employeeName} onValueChange={(value) => handleFilterChange('employeeName', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t.selectEmployee} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-employees">{t.allEmployees}</SelectItem>
                    {getUniqueEmployees().map(employeeName => (
                      <SelectItem key={employeeName} value={employeeName}>
                        {employeeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Month Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.selectMonth}</label>
                <Select value={filters.month || 'all-months'} onValueChange={(value) => handleFilterChange('month', value === 'all-months' ? '' : value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t.selectMonth} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-months">{t.allMonths}</SelectItem>
                    {generateMonthOptions().map(month => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Check-in Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.checkInStatus}</label>
                <Select value={filters.checkInStatus} onValueChange={(value) => handleFilterChange('checkInStatus', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t.checkInStatus} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allEmployees}</SelectItem>
                    <SelectItem value="checked-in">{t.checkedIn}</SelectItem>
                    <SelectItem value="checked-out">{t.checkedOut}</SelectItem>
                    <SelectItem value="not-checked-in">{t.notCheckedIn}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters Button */}
              <div className="space-y-2 flex items-end">
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="w-full"
                >
                  {t.clearFilters}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent activity section */}
        <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
          <div className="bg-card rounded-lg p-3 sm:p-4 border shadow-sm">
            <CheckInHistory 
              checkIns={filteredCheckIns.slice(0, 10)} 
              title={t.checkInsHistory}
            />
          </div>
          <div className="bg-card rounded-lg p-3 sm:p-4 border shadow-sm">
            <ReportHistory 
              reports={filteredReports.slice(0, 10) as any} 
              title={t.reportsHistory}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
