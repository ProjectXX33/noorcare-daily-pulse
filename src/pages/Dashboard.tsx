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
import { CheckIn, WorkReport, User } from '@/types';
import DashboardStats from '@/components/DashboardStats';
import AnimatedLoader from '@/components/AnimatedLoader';
import { fetchEmployees } from '@/lib/employeesApi';
import { 
  UsersIcon, 
  ClipboardCheckIcon, 
  Clock,
  CalendarDays,
  CheckSquare,
  BarChart3,
  RefreshCw
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const { checkIns, workReports, getUserCheckIns, getUserWorkReports, hasCheckedInToday, isLoading, refreshCheckIns, refreshWorkReports } = useCheckIn();
  const navigate = useNavigate();
  const [language, setLanguage] = useState('en');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [allEmployees, setAllEmployees] = useState<User[]>([]);
  
  // Filter states
  const [filters, setFilters] = useState({
    employeeName: 'all-employees',
    date: '',
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

  // Auto refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await refreshCheckIns();
        await refreshWorkReports();
        if (user?.role === 'admin') {
          await loadAllEmployees(); // Also refresh employee list for admins
        }
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Error refreshing dashboard data:', error);
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [refreshCheckIns, refreshWorkReports, user]);

  // Update last updated time when data changes
  useEffect(() => {
    setLastUpdated(new Date());
  }, [checkIns, workReports]);

  // Load all employees for the "not checked in" filter
  useEffect(() => {
    if (user?.role === 'admin') {
      loadAllEmployees();
    }
  }, [user]);

  const loadAllEmployees = async () => {
    try {
      const employees = await fetchEmployees();
      setAllEmployees(employees);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const t = translations[language as keyof typeof translations];

  // Debug log
  console.log('Dashboard rendering, user:', user, 'isLoading:', isLoading);

  if (!user) return null;

  // Use the filter date for admin check-ins/reports
  const selectedDate = filters.date
    ? (() => { const d = new Date(filters.date); d.setHours(0,0,0,0); return d; })()
    : null;

  const userCheckIns = user.role === 'admin'
    ? ((checkIns as unknown as CheckIn[]) || []).filter(ci => {
        if (!selectedDate) return true;
        const checkInDate = new Date(ci.timestamp);
        checkInDate.setHours(0, 0, 0, 0);
        return checkInDate.getTime() === selectedDate.getTime();
      })
    : (getUserCheckIns(user.id) as unknown as CheckIn[]) || [];

  const userReports = user.role === 'admin'
    ? ((workReports as unknown as WorkReport[]) || []).filter(r => {
        if (!selectedDate) return true;
        const reportDate = new Date(r.date);
        reportDate.setHours(0, 0, 0, 0);
        return reportDate.getTime() === selectedDate.getTime();
      })
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

  // Get employees who haven't checked in today
  const getEmployeesNotCheckedInToday = () => {
    if (!allEmployees.length) return [];
    
    const today = new Date().toDateString();
    const checkedInUserIds = new Set(
      userCheckIns
        .filter(checkIn => new Date(checkIn.timestamp).toDateString() === today)
        .map(checkIn => checkIn.userId)
    );

    return allEmployees.filter(employee => 
      employee.role === 'employee' && // Only include employees, not admins
      !checkedInUserIds.has(employee.id)
    );
  };

  // Filter check-ins based on current filters
  const filteredCheckIns = (userCheckIns || []).filter(checkIn => {
    if (!checkIn) return false;
    try {
      // Employee name filter
      if (filters.employeeName && filters.employeeName !== 'all-employees' && checkIn.userName !== filters.employeeName) {
        return false;
      }

      // Date filter (replaces month filter)
      if (filters.date && checkIn.timestamp) {
        // Compare only the date part (no timezone offset)
        const checkInDate = new Date(checkIn.timestamp);
        const selected = new Date(filters.date);
        checkInDate.setHours(0, 0, 0, 0);
        selected.setHours(0, 0, 0, 0);
        if (checkInDate.getTime() !== selected.getTime()) {
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
            if (!checkInToday || !hasCheckOut) return false;
            break;
          case 'not-checked-in':
            return false;
        }
      }
      return true;
    } catch (error) {
      return false;
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

      // Date filter (replaces month filter)
      if (filters.date && report.date) {
        // Compare only the date part (no timezone offset)
        const reportDate = new Date(report.date);
        const selected = new Date(filters.date);
        reportDate.setHours(0, 0, 0, 0);
        selected.setHours(0, 0, 0, 0);
        if (reportDate.getTime() !== selected.getTime()) {
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
      date: '',
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 animate-spin" />
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>Auto-refreshing every 30s</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await refreshCheckIns();
                    await refreshWorkReports();
                    if (user?.role === 'admin') {
                      await loadAllEmployees();
                    }
                    setLastUpdated(new Date());
                  } catch (error) {
                    console.error('Error manually refreshing:', error);
                  }
                }}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
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
          <div className="p-3 sm:p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
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

              {/* Date Filter (replaces Month Filter) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Date:</label>
                <Input
                  type="date"
                  value={filters.date || ''}
                  onChange={e => {
                    // Always use the selected date as-is (no timezone offset)
                    handleFilterChange('date', e.target.value);
                  }}
                  className="w-full"
                />
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
            {filters.checkInStatus === 'not-checked-in' ? (
              <Card>
                <CardHeader>
                  <CardTitle>Employees Not Checked In Today</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const notCheckedInEmployees = getEmployeesNotCheckedInToday();
                    
                    if (notCheckedInEmployees.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <div className="text-4xl mb-2">✅</div>
                          <p className="text-muted-foreground font-medium">
                            All employees have checked in today!
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Great attendance record for today.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm text-muted-foreground">
                            {notCheckedInEmployees.length} employee{notCheckedInEmployees.length !== 1 ? 's' : ''} haven't checked in today
                          </p>
                          <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded">
                            {new Date().toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="grid gap-2">
                          {notCheckedInEmployees.map(employee => (
                            <div key={employee.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm text-foreground">{employee.name}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {employee.department} • {employee.position}
                                </p>
                              </div>
                              <div className="flex items-center text-orange-600 dark:text-orange-400">
                                <Clock className="h-4 w-4 mr-1" />
                                <span className="text-xs font-medium">Not checked in</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            ) : (
              <CheckInHistory 
                checkIns={filteredCheckIns.slice(0, 10)} 
                title={t.checkInsHistory}
              />
            )}
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
