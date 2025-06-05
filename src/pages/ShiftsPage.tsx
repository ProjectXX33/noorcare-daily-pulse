import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MonthlyShift, Shift, User } from '@/types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek } from 'date-fns';
import { CalendarIcon, Clock, TrendingUp, Users, Filter, ChevronDown, Eye } from 'lucide-react';
import { toast } from 'sonner';
import CustomerServiceSchedule from '@/components/CustomerServiceSchedule';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

const ShiftsPage = () => {
  const { user } = useAuth();
  const [monthlyShifts, setMonthlyShifts] = useState<MonthlyShift[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [customerServiceEmployees, setCustomerServiceEmployees] = useState<User[]>([]);
  const [weeklyAssignments, setWeeklyAssignments] = useState<{[key: string]: {[key: string]: string}}>({});
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const now = new Date();
    console.log('Current date initialized:', now.toISOString());
    return now;
  });
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [showWeeklyAssignment, setShowWeeklyAssignment] = useState(false);

  const translations = {
    en: {
      shifts: "My Shifts",
      monthlyShifts: "Monthly Shifts",
      manageShifts: "View your shifts and track hours",
      employee: "Employee",
      allEmployees: "All Employees",
      month: "Month",
      date: "Date",
      shift: "Shift",
      checkIn: "Check In",
      checkOut: "Check Out",
      regularHours: "Regular Hours",
      overtimeHours: "Overtime Hours",
      totalHours: "Total Hours",
      dayShift: "Day Shift",
      nightShift: "Night Shift",
      notWorked: "Not Worked",
      summary: "Summary",
      totalRegularHours: "Total Regular Hours",
      totalOvertimeHours: "Total Overtime Hours",
      totalWorkingDays: "Total Working Days",
      averageHoursPerDay: "Average Hours/Day",
      noData: "No shift data for selected period",
      loading: "Loading...",
      hours: "hours",
      filters: "Filters",
      viewDetails: "View Details",
      todaysSchedule: "Today's Schedule"
    },
    ar: {
      shifts: "مناوباتي",
      monthlyShifts: "المناوبات الشهرية",
      manageShifts: "اعرض مناوباتك وتتبع الساعات",
      employee: "الموظف",
      allEmployees: "جميع الموظفين",
      month: "الشهر",
      date: "التاريخ",
      shift: "المناوبة",
      checkIn: "تسجيل الدخول",
      checkOut: "تسجيل الخروج",
      regularHours: "الساعات العادية",
      overtimeHours: "ساعات العمل الإضافي",
      totalHours: "إجمالي الساعات",
      dayShift: "مناوبة النهار",
      nightShift: "مناوبة الليل",
      notWorked: "لم يعمل",
      summary: "الملخص",
      totalRegularHours: "إجمالي الساعات العادية",
      totalOvertimeHours: "إجمالي ساعات العمل الإضافي",
      totalWorkingDays: "إجمالي أيام العمل",
      averageHoursPerDay: "متوسط الساعات/اليوم",
      noData: "لا توجد بيانات مناوبات للفترة المحددة",
      loading: "جاري التحميل...",
      hours: "ساعات",
      filters: "المرشحات",
      viewDetails: "عرض التفاصيل",
      todaysSchedule: "جدول اليوم"
    }
  };

  const hasAccess = user?.position === 'Customer Service' || user?.position === 'Designer' || user?.role === 'admin';

  const loadShifts = async () => {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('is_active', true)
        .order('start_time');

      if (error) throw error;

      const formattedShifts: Shift[] = data.map(item => ({
        id: item.id,
        name: item.name,
        startTime: item.start_time,
        endTime: item.end_time,
        position: item.position as 'Customer Service' | 'Designer',
        isActive: item.is_active,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at)
      }));

      setShifts(formattedShifts);
    } catch (error) {
      console.error('Error loading shifts:', error);
    }
  };

  const loadCustomerServiceEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('position', ['Customer Service', 'Designer'])
        .eq('role', 'employee')
        .order('name');

      if (error) throw error;

      const employees: User[] = data.map(item => ({
        id: item.id,
        username: item.username,
        name: item.name,
        email: item.email,
        role: item.role,
        department: item.department,
        position: item.position,
        lastCheckin: item.last_checkin ? new Date(item.last_checkin) : undefined
      }));

      setCustomerServiceEmployees(employees);
    } catch (error) {
      console.error('Error loading Customer Service and Designer employees:', error);
    }
  };

  const loadLanguage = () => {
    const storedLang = localStorage.getItem('preferredLanguage');
    if (storedLang && (storedLang === 'en' || storedLang === 'ar')) {
      setLanguage(storedLang);
    }
  };

  useEffect(() => {
    if (!hasAccess) return;
    
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          loadShifts(),
          loadCustomerServiceEmployees()
        ]);
        
        await loadMonthlyShifts();
      } catch (error) {
        console.error('Error loading shifts data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    loadLanguage();
  }, [user, hasAccess]);

  useEffect(() => {
    if (hasAccess) {
      loadMonthlyShifts();
    }
  }, [selectedDate, selectedEmployee]);

  const t = translations[language as keyof typeof translations];

  const loadMonthlyShifts = async () => {
    setIsLoading(true);
    try {
      const startDate = startOfMonth(selectedDate);
      const endDate = endOfMonth(selectedDate);

      console.log('Loading monthly shifts for:', {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        selectedEmployee,
        userRole: user?.role,
        userPosition: user?.position
      });

      let query = supabase
        .from('monthly_shifts')
        .select(`
          *,
          users:user_id(name),
          shifts:shift_id(name, start_time, end_time)
        `)
        .gte('work_date', format(startDate, 'yyyy-MM-dd'))
        .lte('work_date', format(endDate, 'yyyy-MM-dd'))
        .order('work_date', { ascending: false });

      if (selectedEmployee !== 'all') {
        query = query.eq('user_id', selectedEmployee);
      } else if (user?.role !== 'admin') {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Monthly shifts query error:', error);
        throw error;
      }

      console.log('Monthly shifts data received:', data);

      const formattedShifts: MonthlyShift[] = data.map(item => ({
        id: item.id,
        userId: item.user_id,
        shiftId: item.shift_id,
        workDate: new Date(item.work_date),
        checkInTime: item.check_in_time ? new Date(item.check_in_time) : undefined,
        checkOutTime: item.check_out_time ? new Date(item.check_out_time) : undefined,
        regularHours: item.regular_hours,
        overtimeHours: item.overtime_hours,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
        userName: item.users?.name,
        shiftName: item.shifts?.name,
        shiftStartTime: item.shifts?.start_time,
        shiftEndTime: item.shifts?.end_time
      }));

      console.log('Formatted monthly shifts:', formattedShifts);
      setMonthlyShifts(formattedShifts);
    } catch (error) {
      console.error('Error loading monthly shifts:', error);
      toast.error('Failed to load monthly shifts');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSummary = () => {
    const totalRegular = monthlyShifts.reduce((sum, shift) => sum + shift.regularHours, 0);
    const totalOvertime = monthlyShifts.reduce((sum, shift) => sum + shift.overtimeHours, 0);
    const workingDays = monthlyShifts.filter(shift => shift.checkInTime).length;
    const averagePerDay = workingDays > 0 ? (totalRegular + totalOvertime) / workingDays : 0;

    return {
      totalRegular,
      totalOvertime,
      workingDays,
      averagePerDay
    };
  };

  const formatTime = (date: Date | undefined) => {
    if (!date) return '-';
    return format(date, 'HH:mm');
  };

  const getShiftBadgeColor = (shiftName: string | undefined) => {
    switch (shiftName) {
      case 'Day Shift':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      case 'Night Shift':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const summary = calculateSummary();

  const saveWeeklyAssignment = async (employeeId: string, weekStart: string, shiftType: 'day' | 'night') => {
    try {
      const { error } = await supabase
        .from('weekly_shift_assignments')
        .upsert({
          employee_id: employeeId,
          week_start: weekStart,
          shift_type: shiftType,
          assigned_by: user?.id,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setWeeklyAssignments(prev => ({
        ...prev,
        [weekStart]: {
          ...prev[weekStart],
          [employeeId]: shiftType
        }
      }));

      toast.success(`Assigned ${shiftType} shift successfully`);
    } catch (error) {
      console.error('Error saving weekly assignment:', error);
      toast.error('Failed to save assignment');
    }
  };

  const getCurrentWeekAssignments = async () => {
    try {
      const startOfWeekDate = startOfWeek(new Date());
      const { data, error } = await supabase
        .from('weekly_shift_assignments')
        .select('*')
        .eq('week_start', startOfWeekDate.toISOString().split('T')[0]);

      if (error) throw error;

      const assignments: {[key: string]: string} = {};
      data?.forEach(assignment => {
        assignments[assignment.employee_id] = assignment.shift_type;
      });

      setWeeklyAssignments(prev => ({
        ...prev,
        [startOfWeekDate.toISOString().split('T')[0]]: assignments
      }));
    } catch (error) {
      console.error('Error fetching weekly assignments:', error);
    }
  };

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-4 sm:p-6 text-center">
            <Clock className="h-10 w-10 sm:h-12 sm:w-12 text-yellow-500 mx-auto mb-3 sm:mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">Access Restricted</h2>
            <p className="text-sm sm:text-base text-gray-500">
              Shift management is available for Customer Service, Designer employees, and administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 pb-4 sm:pb-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Mobile-optimized sticky header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-2 pb-3 sm:pb-4 border-b shadow-sm">
        <div className="px-3 sm:px-4 md:px-6">
          <div className="flex flex-col gap-1 sm:gap-2">
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground">{t.shifts}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-tight">{t.manageShifts}</p>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 md:px-6 space-y-3 sm:space-y-4 md:space-y-6">
        {/* Mobile-responsive summary cards */}
        <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="border border-border/50 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="text-center space-y-1">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-blue-500 mx-auto" />
                <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">{t.totalRegularHours}</p>
                <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-foreground">{summary.totalRegular.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">{t.hours}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/50 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="text-center space-y-1">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-orange-500 mx-auto" />
                <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">{t.totalOvertimeHours}</p>
                <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-orange-600">{summary.totalOvertime.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">{t.hours}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/50 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="text-center space-y-1">
                <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-green-500 mx-auto" />
                <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">{t.totalWorkingDays}</p>
                <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-green-600">{summary.workingDays}</div>
                <p className="text-xs text-muted-foreground">days</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/50 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="text-center space-y-1">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-purple-500 mx-auto" />
                <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">{t.averageHoursPerDay}</p>
                <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-purple-600">{summary.averagePerDay.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">{t.hours}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mobile filters sheet */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center sm:justify-between">
          <div className="block sm:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full min-h-[48px] h-12 text-sm">
                  <Filter className="h-4 w-4 mr-2" />
                  {t.filters}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[70vh]">
                <SheetHeader className="pb-4">
                  <SheetTitle className="text-lg">{t.filters}</SheetTitle>
                </SheetHeader>
                <div className="grid gap-6 py-2">
                  <div className="space-y-3">
                    <label className="text-sm font-medium block">{t.employee}</label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger className="h-12 text-sm">
                        <SelectValue placeholder={t.allEmployees} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.allEmployees}</SelectItem>
                        {customerServiceEmployees.map(employee => (
                          <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-sm font-medium block">{t.month}</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-12 w-full justify-start text-left font-normal text-sm">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(selectedDate, "MMMM yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => date && setSelectedDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {user?.role === 'admin' && (
                    <div className="space-y-3">
                      <Button 
                        onClick={() => setShowWeeklyAssignment(!showWeeklyAssignment)}
                        variant={showWeeklyAssignment ? "default" : "outline"}
                        className="h-12 w-full text-sm"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Weekly Assignment
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop filters */}
          <Card className="hidden sm:block">
            <CardContent className="p-4">
              <div className="grid gap-3 grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">{t.employee}</label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t.allEmployees} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.allEmployees}</SelectItem>
                      {customerServiceEmployees.map(employee => (
                        <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">{t.month}</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9 w-full justify-start text-left font-normal text-xs">
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {format(selectedDate, "MMM yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {user?.role === 'admin' && (
                  <div className="flex items-end">
                    <Button 
                      onClick={() => setShowWeeklyAssignment(!showWeeklyAssignment)}
                      variant={showWeeklyAssignment ? "default" : "outline"}
                      size="sm"
                      className="h-9 w-full text-xs"
                    >
                      <Users className="mr-1 h-3 w-3" />
                      Weekly Assignment
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer Service and Designer Schedule */}
        {(user.position === 'Customer Service' || user.position === 'Designer') && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <h2 className="text-base sm:text-lg font-semibold">{t.todaysSchedule}</h2>
            </div>
            <CustomerServiceSchedule />
          </div>
        )}

        {/* Monthly Shifts */}
        <Card className="border border-border/50 shadow-sm">
          <CardHeader className="pb-3 px-4 sm:px-6">
            <CardTitle className="text-base sm:text-lg">{t.monthlyShifts}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile cards view */}
            <div className="block lg:hidden">
              <ScrollArea className="h-[55vh] sm:h-[60vh]">
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="text-center py-16">
                      <div className="flex items-center justify-center mb-6">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
                      </div>
                      <span className="text-base text-muted-foreground">{t.loading}</span>
                    </div>
                  ) : monthlyShifts.length === 0 ? (
                    <div className="text-center py-16 space-y-6">
                      {startOfMonth(selectedDate).getTime() === startOfMonth(new Date()).getTime() ? (
                        <div className="bg-blue-50 dark:bg-blue-950/50 p-6 rounded-2xl border border-blue-200 dark:border-blue-800">
                          <p className="text-base text-blue-700 dark:text-blue-300 font-semibold mb-2">💡 No shift data for this month yet</p>
                          <p className="text-sm text-blue-600 dark:text-blue-400">Data will appear after Customer Service employees check in/out.</p>
                        </div>
                      ) : startOfMonth(selectedDate) > startOfMonth(new Date()) ? (
                        <div className="bg-amber-50 dark:bg-amber-950/50 p-6 rounded-2xl border border-amber-200 dark:border-amber-800">
                          <p className="text-base text-amber-700 dark:text-amber-300 font-semibold mb-2">⚠️ Future month selected</p>
                          <p className="text-sm text-amber-600 dark:text-amber-400">Shift data is only available for months when employees have checked in/out.</p>
                        </div>
                      ) : (
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
                          <p className="text-base text-gray-600 dark:text-gray-400">No shift data found for the selected period.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    monthlyShifts.map((shift) => (
                      <Card key={shift.id} className="border border-border/50 shadow-md rounded-2xl bg-white dark:bg-background/80 w-full">
                        <CardContent className="p-5 space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-base leading-tight text-foreground">{format(shift.workDate, 'EEEE, dd/MM/yyyy')}</h4>
                              {user.role === 'admin' && (
                                <p className="text-xs text-muted-foreground mt-1">{shift.userName}</p>
                              )}
                            </div>
                            <Badge className={`${getShiftBadgeColor(shift.shiftName)} text-xs px-3 py-1 rounded-full font-semibold`}>{shift.shiftName || t.notWorked}</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-xs text-muted-foreground font-medium">{t.checkIn}</span>
                              <div className="text-base font-semibold text-foreground mt-1">{formatTime(shift.checkInTime)}</div>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground font-medium">{t.checkOut}</span>
                              <div className="text-base font-semibold text-foreground mt-1">{formatTime(shift.checkOutTime)}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-xs text-muted-foreground font-medium">{t.regularHours}</span>
                              <div className="text-base font-semibold text-foreground mt-1">{shift.regularHours.toFixed(1)} {t.hours}</div>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground font-medium">{t.overtimeHours}</span>
                              <div className="text-base font-semibold text-orange-600 mt-1">{shift.overtimeHours.toFixed(1)} {t.hours}</div>
                            </div>
                          </div>
                          <div className="pt-3 border-t border-border/50">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground font-medium">{t.totalHours}</span>
                              <span className="font-bold text-base text-foreground">{(shift.regularHours + shift.overtimeHours).toFixed(1)} {t.hours}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Desktop table view */}
            <div className="hidden lg:block">
              <div className="mobile-table-scroll p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10">{t.date}</TableHead>
                      {user.role === 'admin' && <TableHead>{t.employee}</TableHead>}
                      <TableHead>{t.shift}</TableHead>
                      <TableHead>{t.checkIn}</TableHead>
                      <TableHead>{t.checkOut}</TableHead>
                      <TableHead>{t.regularHours}</TableHead>
                      <TableHead>{t.overtimeHours}</TableHead>
                      <TableHead>{t.totalHours}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={user.role === 'admin' ? 8 : 7} className="text-center py-8">
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mr-2"></div>
                            {t.loading}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : monthlyShifts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={user.role === 'admin' ? 8 : 7} className="text-center py-8">
                          <div className="space-y-2">
                            {startOfMonth(selectedDate).getTime() === startOfMonth(new Date()).getTime() ? (
                              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                <p className="text-sm text-blue-700 font-medium">💡 No shift data for this month yet</p>
                                <p className="text-xs text-blue-600 mt-1">Data will appear after Customer Service employees check in/out.</p>
                              </div>
                            ) : startOfMonth(selectedDate) > startOfMonth(new Date()) ? (
                              <div className="bg-amber-50 p-3 rounded border border-amber-200">
                                <p className="text-sm text-amber-700 font-medium">⚠️ Future month selected</p>
                                <p className="text-xs text-amber-600 mt-1">Shift data is only available for months when employees have checked in/out.</p>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600">
                                No shift data found for the selected period.
                              </p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      monthlyShifts.map((shift) => (
                        <TableRow key={shift.id}>
                          <TableCell className="sticky left-0 bg-background z-10 font-medium">
                            {format(shift.workDate, 'dd/MM/yyyy')}
                          </TableCell>
                          {user.role === 'admin' && <TableCell>{shift.userName}</TableCell>}
                          <TableCell>
                            <Badge className={getShiftBadgeColor(shift.shiftName)}>
                              {shift.shiftName || t.notWorked}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatTime(shift.checkInTime)}</TableCell>
                          <TableCell>{formatTime(shift.checkOutTime)}</TableCell>
                          <TableCell>{shift.regularHours.toFixed(1)} {t.hours}</TableCell>
                          <TableCell className="text-orange-600 font-medium">
                            {shift.overtimeHours.toFixed(1)} {t.hours}
                          </TableCell>
                          <TableCell className="font-medium">
                            {(shift.regularHours + shift.overtimeHours).toFixed(1)} {t.hours}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShiftsPage; 