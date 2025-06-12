import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { CalendarIcon, Clock, TrendingUp, Users, Filter, ChevronDown, Eye, RefreshCw } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from "@/components/ui/label";

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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // NEW: No layout shifts
  const [language, setLanguage] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const storedLang = localStorage.getItem('preferredLanguage');
      if (storedLang && (storedLang === 'en' || storedLang === 'ar')) {
        return storedLang; // Initialize correctly from start
      }
    }
    return 'en';
  });
  
  const [showWeeklyAssignment, setShowWeeklyAssignment] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      todaysSchedule: "Today's Schedule",
      refresh: "Refresh",
      refreshing: "Refreshing..."
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
      todaysSchedule: "جدول اليوم",
      refresh: "تحديث",
      refreshing: "جاري التحديث..."
    }
  };

  const hasAccess = user?.position === 'Customer Service' || user?.position === 'Designer' || user?.role === 'admin';

  // Memoized translations for performance
  const t = useMemo(() => translations[language as keyof typeof translations], [language]);

  // Optimized load functions with error handling
  const loadShifts = useCallback(async () => {
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
      toast.error('Failed to load shifts');
    }
  }, []);

  const loadCustomerServiceEmployees = useCallback(async () => {
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
      toast.error('Failed to load employees');
    }
  }, []);

  const loadMonthlyShifts = useCallback(async (showLoadingState = true) => {
    if (!hasAccess) return;
    
    // Only show loading state when explicitly requested
    if (showLoadingState) {
      setIsLoading(true);
    }
    
    try {
      const startDate = startOfMonth(selectedDate);
      const endDate = endOfMonth(selectedDate);

      console.log('Loading monthly shifts for:', {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        selectedEmployee,
        userRole: user?.role,
        userPosition: user?.position,
        showLoadingState
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
      if (showLoadingState) {
      setIsLoading(false);
    }
    }
  }, [selectedDate, selectedEmployee, user, hasAccess]);

  // Single useEffect for initial data loading (removed loadLanguage to prevent layout shifts)
  useEffect(() => {
    if (!hasAccess) return;
    
    let isMounted = true;
    
    const loadInitialData = async () => {
      setIsLoading(true);
      setIsInitialLoad(true);
      
      try {
        // Load basic data first
        await Promise.all([
          loadShifts(),
          loadCustomerServiceEmployees()
        ]);
        
        // Load monthly shifts with loading state
        if (isMounted) {
          await loadMonthlyShifts(true);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
        if (isMounted) {
          toast.error('Failed to load shift data');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsInitialLoad(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [user, hasAccess, loadShifts, loadCustomerServiceEmployees]);

  // Separate useEffect for filter changes (without loading state to prevent layout shift)
  useEffect(() => {
    // Skip if it's the initial load or if we don't have access
    if (isInitialLoad || !hasAccess) return;
    
    console.log('Filter changed, updating monthly shifts silently');
    // Load monthly shifts without showing loading state to prevent layout shift
    loadMonthlyShifts(false);
  }, [selectedDate, selectedEmployee, loadMonthlyShifts, isInitialLoad, hasAccess]);

  // Language change handler (for settings page or language switcher)
  const handleLanguageChange = useCallback((newLanguage: 'en' | 'ar') => {
    setLanguage(newLanguage);
    localStorage.setItem('preferredLanguage', newLanguage);
    console.log('Language changed to:', newLanguage);
  }, []);

  // Memoized calculations for performance
  const summary = useMemo(() => {
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
  }, [monthlyShifts]);

  const formatTime = useCallback((date: Date | undefined) => {
    if (!date) return '-';
    return format(date, 'HH:mm');
  }, []);

  const getShiftBadgeColor = useCallback((shiftName: string | undefined) => {
    switch (shiftName) {
      case 'Day Shift':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      case 'Night Shift':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  }, []);

  // Refresh functionality
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadShifts(),
        loadCustomerServiceEmployees(),
        loadMonthlyShifts(true) // Show loading state for manual refresh
      ]);
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  }, [loadShifts, loadCustomerServiceEmployees, loadMonthlyShifts]);

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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 w-full max-w-full overflow-x-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Enhanced mobile-optimized header - Non-sticky, responsive layout */}
      <div className="border-b border-border/50 bg-background/98 w-full">
        <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6 w-full max-w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
            <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">{t.shifts}</h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">{t.manageShifts}</p>
            </div>
            <div className="flex justify-end sm:justify-start shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleRefresh}
                    disabled={isRefreshing || isLoading}
                    variant="outline"
                    size="default"
                    className="min-h-[44px] sm:min-h-[40px] px-4 sm:px-6 font-medium hover:shadow-md transition-all duration-200"
                  >
                    <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span className="ml-2 text-sm sm:text-base">{isRefreshing ? t.refreshing : t.refresh}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">View your shifts and track hours - Refresh data</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 space-y-6 sm:space-y-8 md:space-y-10 w-full max-w-full overflow-x-hidden">
        {/* Enhanced mobile-responsive summary cards */}
        <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4 w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 w-full cursor-help">
                <CardContent className="p-3 sm:p-4 md:p-5">
                  <div className="text-center space-y-2 sm:space-y-3">
                    <div className="flex justify-center">
                      <div className="p-2 sm:p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <Clock className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm md:text-base font-medium text-muted-foreground leading-tight">{t.totalRegularHours}</p>
                    <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground">{summary.totalRegular.toFixed(1)}</div>
                    <p className="text-xs sm:text-sm text-muted-foreground">{t.hours}</p>
              </div>
            </CardContent>
          </Card>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-sm">Total regular working hours for the selected period</p>
            </TooltipContent>
          </Tooltip>

          <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 w-full">
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="text-center space-y-2 sm:space-y-3">
                <div className="flex justify-center">
                  <div className="p-2 sm:p-3 rounded-full bg-orange-100 dark:bg-orange-900/30">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
                <p className="text-xs sm:text-sm md:text-base font-medium text-muted-foreground leading-tight">{t.totalOvertimeHours}</p>
                <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-orange-600">{summary.totalOvertime.toFixed(1)}</div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t.hours}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 w-full">
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="text-center space-y-2 sm:space-y-3">
                <div className="flex justify-center">
                  <div className="p-2 sm:p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                    <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <p className="text-xs sm:text-sm md:text-base font-medium text-muted-foreground leading-tight">{t.totalWorkingDays}</p>
                <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-green-600">{summary.workingDays}</div>
                <p className="text-xs sm:text-sm text-muted-foreground">days</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 w-full">
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="text-center space-y-2 sm:space-y-3">
                <div className="flex justify-center">
                  <div className="p-2 sm:p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <p className="text-xs sm:text-sm md:text-base font-medium text-muted-foreground leading-tight">{t.averageHoursPerDay}</p>
                <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-purple-600">{summary.averagePerDay.toFixed(1)}</div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t.hours}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced mobile filters with better UX - Only show for admin */}
        {user?.role === 'admin' && (
          <div className="space-y-3 w-full">
            {/* Mobile filters sheet with improved design */}
            <div className="block lg:hidden w-full">
            <Sheet>
              <SheetTrigger asChild>
                  <Button variant="outline" className="w-full min-h-[44px] h-12 text-sm font-medium">
                    <Filter className="h-4 w-4 mr-2 shrink-0" />
                    <span className="truncate">{t.filters}</span>
                    <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                </Button>
              </SheetTrigger>
                <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-3xl border-t w-full max-w-full">
                <SheetHeader className="pb-4">
                    <SheetTitle className="text-lg font-bold">{t.filters}</SheetTitle>
                </SheetHeader>
                  <div className="flex-1 overflow-y-auto max-h-[calc(85vh-120px)]">
                    <div className="space-y-4 pb-6">
                      <div className="grid gap-4 sm:gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="mobile-employee-filter" className="text-sm font-medium">{t.employee}</Label>
                          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                            <SelectTrigger id="mobile-employee-filter" className="h-11 w-full">
                              <SelectValue placeholder={t.allEmployees} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t.allEmployees}</SelectItem>
                              {customerServiceEmployees.map(employee => (
                                <SelectItem key={employee.id} value={employee.id}>
                                  {employee.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-3">
                          <label className="text-sm font-semibold block">{t.month}</label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="h-12 w-full justify-start text-left font-normal text-sm">
                                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                <span className="truncate">{format(selectedDate, "MMMM yyyy")}</span>
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

                  <div className="space-y-3">
                          <Button 
                            onClick={() => setShowWeeklyAssignment(!showWeeklyAssignment)}
                            variant={showWeeklyAssignment ? "default" : "outline"}
                            className="h-12 w-full text-sm font-medium"
                          >
                            <Users className="mr-2 h-4 w-4 shrink-0" />
                            Weekly Assignment
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Enhanced desktop filters */}
            <Card className="hidden lg:block border border-border/50 shadow-sm w-full">
              <CardContent className="p-4">
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                  <div className="min-w-0">
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">{t.employee}</label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger className="h-9 w-full">
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
                  
                  <div className="min-w-0">
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">{t.month}</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="h-9 w-full justify-start text-left font-normal text-xs">
                          <CalendarIcon className="mr-2 h-3 w-3 shrink-0" />
                          <span className="truncate">{format(selectedDate, "MMM yyyy")}</span>
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

                  <div className="flex items-end">
                      <Button 
                        onClick={() => setShowWeeklyAssignment(!showWeeklyAssignment)}
                        variant={showWeeklyAssignment ? "default" : "outline"}
                      size="sm"
                      className="h-9 w-full text-xs"
                      >
                      <Users className="mr-1 h-3 w-3 shrink-0" />
                        Weekly Assignment
                      </Button>
                    </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Month filter for employees - simplified version */}
        {user?.role !== 'admin' && (
          <div className="w-full">
            <Card className="border border-border/50 shadow-sm w-full">
            <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <label className="text-sm font-medium text-muted-foreground shrink-0">{t.month}</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-10 w-full sm:w-auto justify-start text-left font-normal text-sm">
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                        <span className="truncate">{format(selectedDate, "MMMM yyyy")}</span>
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
              </CardContent>
            </Card>
                  </div>
                )}

        {/* Customer Service and Designer Schedule with enhanced mobile design */}
        {(user.position === 'Customer Service' || user.position === 'Designer') && (
          <Card className="border border-border/50 shadow-sm w-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 sm:p-2 rounded-full bg-primary/10">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-sm sm:text-base truncate">{t.todaysSchedule}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="w-full overflow-hidden">
              <CustomerServiceSchedule />
            </CardContent>
          </Card>
        )}

        {/* Enhanced Monthly Shifts with optimized mobile performance */}
        <Card className="border border-border/50 shadow-sm w-full">
          <CardHeader className="pb-3 px-3 sm:px-4">
            <CardTitle className="text-base sm:text-lg font-bold truncate">{t.monthlyShifts}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 w-full overflow-hidden">
            {/* Optimized mobile cards view */}
            <div className="block xl:hidden w-full">
              <div className="space-y-2 p-3 max-h-none">
                  {isLoading ? (
                    <div className="text-center py-16">
                    <div className="flex items-center justify-center mb-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                      </div>
                    <span className="text-sm text-muted-foreground font-medium">{t.loading}</span>
                    </div>
                  ) : monthlyShifts.length === 0 ? (
                  <div className="text-center py-16 space-y-4">
                      {startOfMonth(selectedDate).getTime() === startOfMonth(new Date()).getTime() ? (
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 p-6 rounded-2xl border border-blue-200 dark:border-blue-800 max-w-sm mx-auto">
                        <div className="text-3xl mb-3">💡</div>
                        <p className="text-sm text-blue-700 dark:text-blue-300 font-semibold mb-2">No shift data for this month yet</p>
                        </div>
                      ) : startOfMonth(selectedDate) > startOfMonth(new Date()) ? (
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30 p-6 rounded-2xl border border-amber-200 dark:border-amber-800 max-w-sm mx-auto">
                        <div className="text-3xl mb-3">⚠️</div>
                        <p className="text-sm text-amber-700 dark:text-amber-300 font-semibold mb-2">Future month selected</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">Shift data is only available for months when employees have checked in/out.</p>
                        </div>
                      ) : (
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/30 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 max-w-sm mx-auto">
                        <div className="text-3xl mb-3">📊</div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold">No shift data found for the selected period.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    monthlyShifts.map((shift) => (
                    <Card key={shift.id} className="border border-border/50 shadow-sm rounded-xl bg-card hover:shadow-md transition-all duration-200 w-full">
                      <CardContent className="p-3 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-xs leading-tight text-foreground truncate">{format(shift.workDate, 'EEE, dd/MM/yyyy')}</h4>
                              {user.role === 'admin' && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">{shift.userName}</p>
                              )}
                          </div>
                          <Badge className={`${getShiftBadgeColor(shift.shiftName)} text-xs px-2 py-1 rounded-full font-semibold whitespace-nowrap shrink-0`}>
                            {shift.shiftName || t.notWorked}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-medium block">{t.checkIn}</span>
                            <div className="text-xs font-bold text-foreground bg-muted/50 rounded-lg p-2 text-center">
                              {formatTime(shift.checkInTime)}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-medium block">{t.checkOut}</span>
                            <div className="text-xs font-bold text-foreground bg-muted/50 rounded-lg p-2 text-center">
                              {formatTime(shift.checkOutTime)}
                            </div>
                          </div>
                            </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-medium block">{t.regularHours}</span>
                            <div className="text-xs font-bold text-foreground bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center">
                              {shift.regularHours.toFixed(1)}h
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-medium block">{t.overtimeHours}</span>
                            <div className="text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2 text-center">
                              {shift.overtimeHours.toFixed(1)}h
                            </div>
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t border-border/50">
                          <div className="flex justify-between items-center bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-2">
                            <span className="text-xs text-muted-foreground font-semibold">{t.totalHours}</span>
                            <span className="font-bold text-sm text-primary">
                              {(shift.regularHours + shift.overtimeHours).toFixed(1)}h
                            </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
            </div>

            {/* Enhanced desktop table view */}
            <div className="hidden xl:block w-full">
              <div className="w-full overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/50">
                      <TableHead className="font-semibold text-xs">{t.date}</TableHead>
                      {user.role === 'admin' && <TableHead className="font-semibold text-xs">{t.employee}</TableHead>}
                      <TableHead className="font-semibold text-xs">{t.shift}</TableHead>
                      <TableHead className="font-semibold text-xs">{t.checkIn}</TableHead>
                      <TableHead className="font-semibold text-xs">{t.checkOut}</TableHead>
                      <TableHead className="font-semibold text-xs">{t.regularHours}</TableHead>
                      <TableHead className="font-semibold text-xs">{t.overtimeHours}</TableHead>
                      <TableHead className="font-semibold text-xs">{t.totalHours}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={user.role === 'admin' ? 8 : 7} className="text-center py-12">
                          <div className="flex items-center justify-center space-x-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                            <span className="text-sm font-medium">{t.loading}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : monthlyShifts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={user.role === 'admin' ? 8 : 7} className="text-center py-12">
                          <div className="space-y-4">
                            {startOfMonth(selectedDate).getTime() === startOfMonth(new Date()).getTime() ? (
                              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800 max-w-md mx-auto">
                                <div className="text-2xl mb-2">💡</div>
                                <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold mb-1">No shift data for this month yet</p>
                              </div>
                            ) : startOfMonth(selectedDate) > startOfMonth(new Date()) ? (
                              <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200 dark:border-amber-800 max-w-md mx-auto">
                                <div className="text-2xl mb-2">⚠️</div>
                                <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold mb-1">Future month selected</p>
                                <p className="text-xs text-amber-600 dark:text-amber-400">Shift data is only available for months when employees have checked in/out.</p>
                              </div>
                            ) : (
                              <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-xl border border-gray-200 dark:border-gray-800 max-w-md mx-auto">
                                <div className="text-2xl mb-2">📊</div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">No shift data found for the selected period.</p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      monthlyShifts.map((shift) => (
                        <TableRow key={shift.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium text-xs">
                            {format(shift.workDate, 'dd/MM/yyyy')}
                          </TableCell>
                          {user.role === 'admin' && <TableCell className="font-medium text-xs">{shift.userName}</TableCell>}
                          <TableCell>
                            <Badge className={getShiftBadgeColor(shift.shiftName)}>
                              {shift.shiftName || t.notWorked}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{formatTime(shift.checkInTime)}</TableCell>
                          <TableCell className="font-mono text-xs">{formatTime(shift.checkOutTime)}</TableCell>
                          <TableCell className="font-semibold text-xs">{shift.regularHours.toFixed(1)} {t.hours}</TableCell>
                          <TableCell className="text-orange-600 font-semibold text-xs">
                            {shift.overtimeHours.toFixed(1)} {t.hours}
                          </TableCell>
                          <TableCell className="font-bold text-primary text-xs">
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