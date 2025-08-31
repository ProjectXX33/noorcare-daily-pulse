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
import { MonthlyShift, Shift, User, Position } from '@/types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek } from 'date-fns';
import { CalendarIcon, Clock, TrendingUp, Users, Filter, ChevronDown, Eye, RefreshCw, Download } from 'lucide-react';
import AdminRecalculateButton from '@/components/AdminRecalculateButton';
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
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Label } from "@/components/ui/label";

// Helper function to format delay in hours and minutes
const formatDelayHoursAndMinutes = (totalMinutes: number): string => {
  if (totalMinutes <= 0) return '0min';
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  
  if (hours === 0) {
    return `${minutes}min`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}min`;
  }
};

// Helper function to format hours (decimal) to hours and minutes
const formatHoursAndMinutes = (decimalHours: number): string => {
  if (decimalHours <= 0) return '0min';
  
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  
  if (hours === 0) {
    return `${minutes}min`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}min`;
  }
};

// Calculate Net Hours: Total Hours - Delay Time (for justice calculation)
const calculateNetHours = (totalHours: number, delayMinutes: number): number => {
  const delayHours = delayMinutes / 60; // Convert delay minutes to hours
  const netHours = totalHours - delayHours;
  return Math.max(0, netHours); // Don't show negative net hours
};

// Helper function to format break time in hours and minutes
const formatBreakTime = (totalMinutes: number): string => {
  if (totalMinutes <= 0) return '0min';
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  
  if (hours === 0) {
    return `${minutes}min`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}min`;
  }
};

// Helper function to calculate "Delay to Finish" using Smart Logic
const calculateDelayToFinish = (
  breakMinutes: number,
  delayMinutes: number,
  regularHours: number,
  overtimeHours: number,
  shiftName?: string,
  shiftStartTime?: string,
  shiftEndTime?: string,
  allTimeOvertime?: boolean,
  isDayOff?: boolean
): string => {
  // Check if this is a day off - always return All Clear
  if (isDayOff || shiftName === 'Day Off' || shiftName === 'يوم إجازة') {
    return 'All Clear';
  }
  
  // NEW SMART LOGIC: Different calculation based on work completion
  
  // Check if this is an all-time overtime shift
  if (allTimeOvertime || (shiftName && shiftName.toLowerCase().includes('overtime'))) {
    // For all-time overtime shifts, no delay calculation needed
    console.log('🔥 All-time overtime shift detected - No delay calculation');
    return 'All Clear';
  }
  
  // Get expected hours based on shift type (Day = 7h, Night = 8h, Custom = duration)
  const getExpectedHours = (shiftName?: string): number => {
    // Default to 8 hours for custom shifts
    if (!shiftName) return 8;

    const nameLower = shiftName.toLowerCase();

    if (nameLower === 'day shift' || nameLower === 'day') return 7;
    if (nameLower === 'night shift' || nameLower === 'night') return 8;

    // For custom shifts (anything else), attempt to calculate duration from
    // provided start/end strings, e.g. "08:00" / "14:00". Fallback safely on error.
    if (shiftStartTime && shiftEndTime) {
      try {
        const [startH, startM] = shiftStartTime.split(':').map(Number);
        const [endH, endM] = shiftEndTime.split(':').map(Number);

        let durationMinutes: number;

        // Handle overnight custom shift where end time is on next day
        if (endH < startH || (endH === startH && endM < startM)) {
          durationMinutes = (24 * 60 - (startH * 60 + startM)) + (endH * 60 + endM);
        } else {
          durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
        }

        return durationMinutes / 60;
      } catch {
        // If parsing fails, fallback to 8 hours for custom shifts
        return 8;
      }
    }

    // If no start/end info, fallback to 8 hours for custom shifts
    return 8;
  };
  
  const expectedHours = getExpectedHours(shiftName);
  const workedHours = regularHours + overtimeHours; // Total hours actually worked (for all-time overtime, this is overtimeHours)
  
  let finalDelayMinutes = 0;
  let calculationLogic = '';
  
  if (workedHours < expectedHours) {
    // SIMPLIFIED LOGIC: Only show missing work hours (ignore check-in delay)
    const hoursShort = expectedHours - workedHours;
    const hoursShortMinutes = hoursShort * 60;
    
    // NEW: Only count missing work time
    finalDelayMinutes = hoursShortMinutes;
    calculationLogic = `Missing Work Only: ${hoursShort.toFixed(2)}h short = ${hoursShortMinutes.toFixed(0)}min (check-in delay ignored)`;
  } else {
    // COMPLETED WORK: No delay if worked required hours or more
    finalDelayMinutes = 0;
    calculationLogic = `Completed Work: No delay (worked ${workedHours.toFixed(2)}h >= ${expectedHours}h required)`;
  }
  
  console.log('🧮 Smart Delay to Finish Calculation:', {
    expectedHours,
    workedHours,
    regularHours,
    overtimeHours,
    breakMinutes,
    delayMinutes,
    finalDelayMinutes,
    calculationLogic,
    logic: workedHours < expectedHours ? 'EARLY_CHECKOUT' : 'FULL_OVERTIME_WORK'
  });
  
  if (finalDelayMinutes <= 0) return 'All Clear';
  
  const hours = Math.floor(finalDelayMinutes / 60);
  const minutes = Math.round(finalDelayMinutes % 60);
  
  if (hours === 0) {
    return `${minutes}min`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}min`;
  }
};

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
  const [updatingShifts, setUpdatingShifts] = useState<Set<string>>(new Set());

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
      delay: "Delay Minutes",
      breakTime: "Break Time",
      regularHours: "Regular Hours",
      overtimeHours: "Overtime Hours",
      delayTime: "Delay to Finish",
      dayShift: "Day Shift",
      nightShift: "Night Shift",
      notWorked: "Not Worked",
      summary: "Summary",
      totalRegularHours: "Total Regular Hours",
      totalOvertimeHours: "Total Overtime Hours",
      delayToFinish: "Delay to Finish",
      totalWorkingDays: "Total Working Days",
      averageHoursPerDay: "Average Hours/Day",
      noData: "No shift data for selected period",
      loading: "Loading...",
      hours: "hours",
      filters: "Filters",
      viewDetails: "View Details",
      todaysSchedule: "Today's Schedule",
      refresh: "Refresh",
      refreshing: "Refreshing...",
      changeShift: "Change Shift",
      noShift: "No Shift",
      dayOff: "Day Off",
      shiftUpdated: "Shift updated successfully",
      shiftUpdateFailed: "Failed to update shift",
      export: "Export Data"
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
      delay: "دقائق التأخير",
      breakTime: "وقت الراحة",
      regularHours: "الساعات العادية",
      overtimeHours: "ساعات العمل الإضافي",
      delayTime: "وقت التأخير للإنهاء",
      dayShift: "مناوبة النهار",
      nightShift: "مناوبة الليل",
      notWorked: "لم يعمل",
      summary: "الملخص",
      totalRegularHours: "إجمالي الساعات العادية",
      totalOvertimeHours: "إجمالي ساعات العمل الإضافي",
      delayToFinish: "التأخير للإنهاء",
      totalWorkingDays: "إجمالي أيام العمل",
      averageHoursPerDay: "متوسط الساعات/اليوم",
      noData: "لا توجد بيانات مناوبات للفترة المحددة",
      loading: "جاري التحميل...",
      hours: "ساعات",
      filters: "المرشحات",
      viewDetails: "عرض التفاصيل",
      todaysSchedule: "جدول اليوم",
      refresh: "تحديث",
      refreshing: "جاري التحديث...",
      changeShift: "تغيير الوردية",
      noShift: "بدون وردية",
      dayOff: "يوم إجازة",
      shiftUpdated: "تم تحديث الوردية بنجاح",
      shiftUpdateFailed: "فشل في تحديث الوردية",
      export: "تصدير البيانات"
    }
  };

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
        position: item.position as Position,
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

  const loadEmployees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
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

      // Filter employees for Customer Retention Manager
      let filteredEmployees = employees;
      if (user?.role === 'customer_retention_manager') {
        // Find team members by team name OR by specific positions
        const teamMembers = employees.filter(emp => 
          emp.team === 'Customer Retention Department' || 
          ['Junior CRM Specialist', 'Customer Retention Specialist'].includes(emp.position)
        );
        
        // RESTRICT: Customer Retention Manager can only see their team
        filteredEmployees = teamMembers;
        
        console.log('👥 Customer Retention Team Filter (Shifts):');
        console.log('  📋 Total Employees:', employees.length);
        console.log('  🎯 Team Members:', teamMembers.length);
        console.log('  📝 Available for Viewing:', filteredEmployees.map(e => `${e.name} (${e.position})`));
      }

      setCustomerServiceEmployees(filteredEmployees);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('Failed to load employees');
    }
  }, [user]);

  const loadMonthlyShifts = useCallback(async (showLoadingState = true) => {
    
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
          shifts:shift_id(name, start_time, end_time, all_time_overtime)
        `)
        .gte('work_date', format(startDate, 'yyyy-MM-dd'))
        .lte('work_date', format(endDate, 'yyyy-MM-dd'))
        .order('work_date', { ascending: false });

      if (selectedEmployee !== 'all') {
        console.log('🔍 Filtering by specific employee:', selectedEmployee);
        query = query.eq('user_id', selectedEmployee);
      } else if (user?.role !== 'admin' && user?.role !== 'customer_retention_manager') {
        console.log('🔍 Filtering by current user:', user.id);
        query = query.eq('user_id', user.id);
      } else {
        console.log('🔍 Loading all employees (admin view)');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Monthly shifts query error:', error);
        throw error;
      }

      console.log('Monthly shifts data received:', {
        dataLength: data?.length || 0,
        data: data?.map(item => ({ 
          id: item.id, 
          user_id: item.user_id, 
          work_date: item.work_date,
          user_name: item.users?.name 
        }))
      });

      // Fetch break time data separately for the same date range and users
      const userIds = selectedEmployee !== 'all' ? [selectedEmployee] : 
                     user?.role !== 'admin' && user?.role !== 'customer_retention_manager' ? [user.id] : 
                     data.map(item => item.user_id).filter((id, index, self) => self.indexOf(id) === index);

      let breakTimeData = null;
      let breakTimeError = null;
      
      // Only fetch break time data if we have user IDs
      if (userIds.length > 0) {
        const breakTimeResult = await supabase
          .from('check_ins')
          .select('user_id, timestamp, total_break_minutes, break_sessions')
          .in('user_id', userIds)
          .gte('timestamp', format(startDate, 'yyyy-MM-dd') + 'T00:00:00')
          .lte('timestamp', format(endDate, 'yyyy-MM-dd') + 'T23:59:59');
        
        breakTimeData = breakTimeResult.data;
        breakTimeError = breakTimeResult.error;

        if (breakTimeError) {
          console.warn('Error fetching break time data:', breakTimeError);
        }

        console.log('Break time data received:', breakTimeData);
      }

      // Create a map of break time data by user and date
      const breakTimeMap = new Map();
      if (breakTimeData) {
        breakTimeData.forEach(item => {
          const dateKey = format(new Date(item.timestamp), 'yyyy-MM-dd');
          const key = `${item.user_id}-${dateKey}`;
          if (!breakTimeMap.has(key) || (breakTimeMap.get(key).totalBreakMinutes || 0) < (item.total_break_minutes || 0)) {
            breakTimeMap.set(key, {
              totalBreakMinutes: item.total_break_minutes || 0,
              breakSessions: item.break_sessions || []
            });
          }
        });
      }

      console.log('🔍 Starting to format shifts data...');
      const formattedShifts: MonthlyShift[] = data.map(item => {
        const dateKey = format(new Date(item.work_date), 'yyyy-MM-dd');
        const breakKey = `${item.user_id}-${dateKey}`;
        const breakData = breakTimeMap.get(breakKey) || { totalBreakMinutes: 0, breakSessions: [] };

        // If this is an all-time overtime shift, treat all worked hours as overtime locally
        return (() => {
          const baseRegular = item.regular_hours || 0;
          const baseOvertime = item.overtime_hours || 0;
          const isAllOT = item.shifts?.all_time_overtime;
          const totalWorked = baseRegular + baseOvertime;
          return {
            id: item.id,
            userId: item.user_id,
            shiftId: item.shift_id,
            workDate: new Date(item.work_date),
            checkInTime: item.check_in_time ? new Date(item.check_in_time) : undefined,
            checkOutTime: item.check_out_time ? new Date(item.check_out_time) : undefined,
            regularHours: isAllOT ? 0 : baseRegular,
            overtimeHours: isAllOT ? totalWorked : baseOvertime,
            delayMinutes: isAllOT ? 0 : (item.delay_minutes || 0),
            // Additional fields filled below
            createdAt: new Date(item.created_at),
            updatedAt: new Date(item.updated_at),
            isDayOff: item.is_day_off && !item.shift_id && !item.shifts?.name,
            userName: item.users?.name,
            shiftName: item.shifts?.name || (item.is_day_off && !item.shift_id && !item.shifts?.name ? t.dayOff : undefined),
            shiftStartTime: item.shifts?.start_time,
            shiftEndTime: item.shifts?.end_time,
            totalBreakMinutes: breakData.totalBreakMinutes,
            breakSessions: breakData.breakSessions,
            allTimeOvertime: isAllOT || false
          };
        })();
      });

      console.log('Formatted monthly shifts:', {
        formattedShiftsLength: formattedShifts.length,
        selectedEmployee,
        formattedShifts: formattedShifts.map(s => ({ 
          id: s.id, 
          userId: s.userId, 
          workDate: s.workDate, 
          isDayOff: s.isDayOff,
          regularHours: s.regularHours,
          overtimeHours: s.overtimeHours,
          delayMinutes: s.delayMinutes
        }))
      });
      setMonthlyShifts(formattedShifts);
    } catch (error) {
      console.error('Error loading monthly shifts:', error);
      toast.error('Failed to load monthly shifts');
    } finally {
      if (showLoadingState) {
      setIsLoading(false);
    }
    }
  }, [selectedDate, selectedEmployee, user]);

  // Single useEffect for initial data loading (removed loadLanguage to prevent layout shifts)
  useEffect(() => {
    
    let isMounted = true;
    
    const loadInitialData = async () => {
      setIsLoading(true);
      setIsInitialLoad(true);
      
      try {
        // Load basic data first
        await Promise.all([
          loadShifts(),
          loadEmployees()
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
  }, [user, loadShifts, loadEmployees]);

  // Separate useEffect for filter changes (without loading state to prevent layout shift)
  useEffect(() => {
    // Skip if it's the initial load
    if (isInitialLoad) return;
    
    console.log('Filter changed, updating monthly shifts silently');
    // Load monthly shifts without showing loading state to prevent layout shift
    loadMonthlyShifts(false);
  }, [selectedDate, selectedEmployee, loadMonthlyShifts, isInitialLoad]);

  // Language change handler (for settings page or language switcher)
  const handleLanguageChange = useCallback((newLanguage: 'en' | 'ar') => {
    setLanguage(newLanguage);
    localStorage.setItem('preferredLanguage', newLanguage);
    console.log('Language changed to:', newLanguage);
  }, []);

  // Memoized calculations for performance
  const summary = useMemo(() => {
    console.log('🔍 Summary calculation triggered:', {
      monthlyShiftsLength: monthlyShifts.length,
      selectedEmployee,
      userRole: user?.role,
      monthlyShiftsData: monthlyShifts.map(s => ({ id: s.id, userId: s.userId, workDate: s.workDate, isDayOff: s.isDayOff }))
    });
    
    // Exclude day-off records from calculations
    const workingShifts = monthlyShifts.filter(shift => !shift.isDayOff);
    const totalRegular = workingShifts.reduce((sum, shift) => sum + shift.regularHours, 0);
    const actualOvertimeHours = workingShifts.reduce((sum, shift) => sum + shift.overtimeHours, 0);
    const workingDays = workingShifts.filter(shift => shift.checkInTime).length;
    const averagePerDay = workingDays > 0 ? (totalRegular + actualOvertimeHours) / workingDays : 0;
    
    const totalDelayMinutes = workingShifts.reduce((sum, shift) => sum + shift.delayMinutes, 0);
    // Break time should not affect "Delay to Finish" because work hours freeze during breaks.
    // Keep break minutes for other displays but exclude from delay calculation.

    const rawDelayToFinishHours = totalDelayMinutes / 60; // Only actual delay minutes
    
    // Step 2: Apply smart offsetting logic for ALL USERS: Total Overtime Hours - Delay to Finish
    let finalOvertimeHours = 0;
    let finalDelayToFinishHours = 0;
    
    // UNIVERSAL SMART OFFSETTING: Apply to both admin and employee views
    if (actualOvertimeHours > rawDelayToFinishHours) {
      // If Overtime > Delay: Show remaining overtime, delay becomes "All Clear"
      finalOvertimeHours = actualOvertimeHours - rawDelayToFinishHours;
      finalDelayToFinishHours = 0; // All Clear
    } else {
      // If Delay >= Overtime: Show remaining delay, overtime becomes 0
      finalDelayToFinishHours = rawDelayToFinishHours - actualOvertimeHours;
      finalOvertimeHours = 0;
    }

    // Smart offsetting metadata (for both admin and employees)
    const hasSmartOffsetting = actualOvertimeHours > 0; // Show whenever there's overtime, even if no delay
    const offsettingType = actualOvertimeHours > rawDelayToFinishHours ? 'overtime_covers_delay' : 'delay_covers_overtime';
    
    console.log('📊 Summary with Universal Smart Offsetting Logic (All Users):', {
      userRole: user?.role,
      totalDelayMinutes,
      totalBreakMinutes: 0,
      totalDelayAndBreakMinutes: 0,
      rawDelayToFinishHours: rawDelayToFinishHours.toFixed(2),
      actualOvertimeHours: actualOvertimeHours.toFixed(2),
      finalOvertimeHours: finalOvertimeHours.toFixed(2),
      finalDelayToFinishHours: finalDelayToFinishHours.toFixed(2),
      hasSmartOffsetting,
      offsettingType,
      smartOffsetingApplied: true, // Now applied to all users
      logic: actualOvertimeHours > rawDelayToFinishHours ? 'UNIVERSAL: Overtime covers delay' : 'UNIVERSAL: Delay remains after overtime offset',
      formula: `UNIVERSAL SMART: ${actualOvertimeHours.toFixed(2)}h OT - ${rawDelayToFinishHours.toFixed(2)}h Delay = OT:${finalOvertimeHours.toFixed(2)}h, Delay:${finalDelayToFinishHours.toFixed(2)}h`
    });

    return {
      totalRegular,
      totalOvertime: finalOvertimeHours, // Smart overtime after offsetting delay
      actualOvertimeHours, // Keep the actual overtime for internal calculations
      workingDays,
      averagePerDay,
      delayToFinish: finalDelayToFinishHours, // Smart delay after offsetting overtime
      // Smart offsetting metadata
      rawDelayHours: rawDelayToFinishHours,
      hasSmartOffsetting,
      offsettingType
    };
  }, [monthlyShifts, selectedEmployee]);

  const formatTime = useCallback((date: Date | undefined) => {
    if (!date) return '-';
    return format(date, 'HH:mm');
  }, []);

  const getShiftBadgeColor = useCallback((shiftName: string | undefined, isDayOff?: boolean) => {
    if (isDayOff || shiftName === 'Day Off' || shiftName === t.dayOff) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
    }
    
    switch (shiftName) {
      case 'Day Shift':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      case 'Night Shift':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  }, [t.dayOff]);

  // Refresh functionality
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadShifts(),
        loadEmployees(),
        loadMonthlyShifts(true) // Show loading state for manual refresh
      ]);
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  }, [loadShifts, loadEmployees, loadMonthlyShifts]);

  // Handle shift change for admin
  const handleShiftChange = useCallback(async (userId: string, workDate: Date, newShiftId: string) => {
    if (user?.role !== 'admin' && user?.role !== 'customer_retention_manager') return;

    const updateKey = `${userId}-${format(workDate, 'yyyy-MM-dd')}`;
    
    try {
      // Add to updating set
      setUpdatingShifts(prev => new Set(prev).add(updateKey));
      
      const workDateStr = format(workDate, 'yyyy-MM-dd');
      const isDayOff = newShiftId === 'none';
      const shiftId = isDayOff ? null : newShiftId;

      // Update shift assignment in shift_assignments table
      const { error: assignmentError } = await supabase
        .from('shift_assignments')
        .upsert({
          employee_id: userId,
          work_date: workDateStr,
          assigned_shift_id: shiftId,
          is_day_off: isDayOff,
          assigned_by: user.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'employee_id,work_date'
        });

      if (assignmentError) throw assignmentError;

      // Update or create monthly shift record
      if (isDayOff) {
        // Create/update day-off record
        const { error: monthlyError } = await supabase
          .from('monthly_shifts')
          .upsert({
            user_id: userId,
            work_date: workDateStr,
            shift_id: null,
            is_day_off: true,
            regular_hours: 0,
            overtime_hours: 0,
            delay_minutes: 0,
            check_in_time: null,
            check_out_time: null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,work_date'
          });
          
        if (monthlyError) {
          console.warn('Day-off monthly shift error:', monthlyError);
        }
      } else {
        // Update existing record to regular shift
        const { error: monthlyError } = await supabase
          .from('monthly_shifts')
          .update({
            shift_id: shiftId,
            is_day_off: false,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('work_date', workDateStr);
          
        if (monthlyError && monthlyError.code !== 'PGRST116') {
          console.warn('Monthly shift update error:', monthlyError);
        }
      }

      // Find the shift name for the toast message
      const selectedShift = shifts.find(s => s.id === newShiftId);
      const shiftName = isDayOff ? t.noShift : selectedShift?.name || 'Unknown Shift';
      
      toast.success(`${t.shiftUpdated}: ${shiftName} - ${format(workDate, 'MMM dd, yyyy')}`);
      
      // Refresh the data to show the changes
      await loadMonthlyShifts(false);
      
    } catch (error) {
      console.error('Error updating shift:', error);
      toast.error(t.shiftUpdateFailed);
    } finally {
      // Remove from updating set
      setUpdatingShifts(prev => {
        const newSet = new Set(prev);
        newSet.delete(updateKey);
        return newSet;
      });
    }
  }, [user, shifts, loadMonthlyShifts]);

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

  // Add the export function after translations but before component render
  const exportToCSV = (shifts: MonthlyShift[], isAdmin: boolean, currentDate: Date) => {
    // Create CSV headers
    const headers = [
      'Date',
      isAdmin ? 'Employee' : null,
      'Shift',
      'Check In',
      'Check Out',
      'Delay (mins)',
      'Break Time (mins)',
      'Regular Hours',
      'Overtime Hours',
      'Delay to Finish'
    ].filter(Boolean).join(',');

    // Create CSV rows
    const rows = shifts.map(shift => {
      const row = [
        format(shift.workDate, 'yyyy-MM-dd'),
        isAdmin ? shift.userName : null,
        shift.shiftName || 'No Shift',
        shift.isDayOff ? '-' : (shift.checkInTime ? format(shift.checkInTime, 'HH:mm:ss') : '-'),
        shift.isDayOff ? '-' : (shift.checkOutTime ? format(shift.checkOutTime, 'HH:mm:ss') : '-'),
        shift.isDayOff ? '0' : (shift.delayMinutes || '0'),
        shift.isDayOff ? '0' : (shift.totalBreakMinutes || '0'),
        shift.isDayOff ? '0' : (shift.regularHours || '0'),
        shift.isDayOff ? '0' : (shift.overtimeHours || '0'),
        shift.isDayOff ? '0' : (shift.delayMinutes || '0')
      ].filter(Boolean);
      return row.join(',');
    }).join('\n');

    // Combine headers and rows
    const csv = `${headers}\n${rows}`;

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `shifts_${format(currentDate, 'yyyy-MM')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Debug: Log smart offsetting status at render
  console.log('🔍 Render Debug - Smart Offsetting Status:', {
    hasSmartOffsetting: summary.hasSmartOffsetting,
    offsettingType: summary.offsettingType,
    totalOvertime: summary.totalOvertime,
    delayToFinish: summary.delayToFinish,
    actualOvertimeHours: summary.actualOvertimeHours,
    rawDelayHours: summary.rawDelayHours
  });

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 w-full max-w-full overflow-x-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Enhanced mobile-optimized header - Non-sticky, responsive layout */}
      <div className="border-b border-border/50 bg-background/98 w-full">
        <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6 w-full max-w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
            <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">{t.shifts}</h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">{t.manageShifts}</p>
            </div>
            <div className="flex justify-end sm:justify-start shrink-0 gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => {
                      // Generate CSV data
                      const headers = (user?.role === 'admin' || user?.role === 'customer_retention_manager')
                        ? ['Date', 'Employee', 'Shift', 'Check In', 'Check Out', 'Delay', 'Break Time', 'Regular Hours', 'Overtime Hours', 'Delay']
                        : ['Date', 'Shift', 'Check In', 'Check Out', 'Delay', 'Break Time', 'Regular Hours', 'Overtime Hours', 'Delay'];
                      
                      const csvData = monthlyShifts.map(shift => {
                        const row = (user?.role === 'admin' || user?.role === 'customer_retention_manager')
                          ? [
                              format(shift.workDate, 'dd/MM/yyyy'),
                              shift.userName,
                              shift.shiftName || t.notWorked,
                              formatTime(shift.checkInTime),
                              formatTime(shift.checkOutTime),
                              shift.delayMinutes || '0',
                              shift.totalBreakMinutes || '0',
                              shift.regularHours || '0',
                              shift.overtimeHours || '0',
                              shift.delayMinutes || '0'
                            ]
                          : [
                              format(shift.workDate, 'dd/MM/yyyy'),
                              shift.shiftName || t.notWorked,
                              formatTime(shift.checkInTime),
                              formatTime(shift.checkOutTime),
                              shift.delayMinutes || '0',
                              shift.totalBreakMinutes || '0',
                              shift.regularHours || '0',
                              shift.overtimeHours || '0',
                              shift.delayMinutes || '0'
                            ];
                        return row.join(',');
                      });
                      
                      // Create CSV content
                      const csvContent = [headers.join(','), ...csvData].join('\n');
                      
                      // Create and download file
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      const currentMonth = format(selectedDate, 'MMMM_yyyy');
                      link.href = URL.createObjectURL(blob);
                      link.download = `shifts_${currentMonth}.csv`;
                      link.click();
                    }}
                    variant="outline"
                    size="default"
                    className="min-h-[44px] sm:min-h-[40px] px-4 sm:px-6 font-medium hover:shadow-md transition-all duration-200"
                  >
                    <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="ml-2 text-sm sm:text-base">{t.export}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">Export shifts data as CSV</p>
                </TooltipContent>
              </Tooltip>
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
        {/* Enhanced mobile-responsive summary cards - ALWAYS VISIBLE */}
        <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-2 lg:grid-cols-5 w-full">
          {/* DEBUG: Show summary data */}
          {process.env.NODE_ENV === 'development' && (
            <div className="col-span-full p-2 bg-yellow-100 text-xs">
              DEBUG: monthlyShifts={monthlyShifts.length}, selectedEmployee={selectedEmployee}, summary={JSON.stringify(summary)}
            </div>
          )}
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
                    <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground">{formatHoursAndMinutes(summary.totalRegular)}</div>
              </div>
            </CardContent>
          </Card>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-sm">Total regular working hours for the selected period</p>
            </TooltipContent>
          </Tooltip>

          <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 w-full relative">
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="text-center space-y-2 sm:space-y-3">
                <div className="flex justify-center">
                  <div className={`p-2 sm:p-3 rounded-full ${summary.totalOvertime > 0 ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-gray-100 dark:bg-gray-900/30'}`}>
                    <TrendingUp className={`h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 ${summary.totalOvertime > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`} />
                  </div>
                </div>
                <p className="text-xs sm:text-sm md:text-base font-medium text-muted-foreground leading-tight">
                  {t.totalOvertimeHours}
                  {summary.hasSmartOffsetting && summary.offsettingType === 'overtime_covers_delay' && (
                    <span className="ml-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">✨ SMART</span>
                  )}
                </p>
                <div className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold ${summary.totalOvertime > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                  {summary.totalOvertime > 0 ? formatHoursAndMinutes(summary.totalOvertime) : '0h 0min'}

                </div>
                {summary.hasSmartOffsetting && summary.offsettingType === 'overtime_covers_delay' && (
                  <p className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                    ✨ Offset by {formatHoursAndMinutes(summary.rawDelayHours)} delay
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 w-full relative">
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="text-center space-y-2 sm:space-y-3">
                <div className="flex justify-center">
                  <div className={`p-2 sm:p-3 rounded-full ${summary.delayToFinish > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                    <Clock className={`h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 ${summary.delayToFinish > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
                  </div>
                </div>
                <p className="text-xs sm:text-sm md:text-base font-medium text-muted-foreground leading-tight">
                  {t.delayToFinish}
                  {summary.hasSmartOffsetting && summary.offsettingType === 'delay_covers_overtime' && (
                    <span className="ml-1 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-bold">✨ SMART</span>
                  )}
                </p>
                <div className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold ${summary.delayToFinish > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {summary.delayToFinish > 0 ? formatHoursAndMinutes(summary.delayToFinish) : 'All Clear'}
                </div>
                {summary.hasSmartOffsetting && summary.offsettingType === 'delay_covers_overtime' && (
                  <p className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                    ✨ After {formatHoursAndMinutes(summary.actualOvertimeHours)} overtime offset
                  </p>
                )}
                {summary.hasSmartOffsetting && summary.offsettingType === 'overtime_covers_delay' && summary.delayToFinish === 0 && (
                  <p className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                    ✨ Covered by overtime
                  </p>
                )}
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
                <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-purple-600">{formatHoursAndMinutes(summary.averagePerDay)}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Smart Offsetting Summary - For All Users */}
        {summary.hasSmartOffsetting && (
          <Card className="border-2 border-dashed border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10">
            <CardContent className="p-4">
              <div className="text-center space-y-3">
                <div className="flex justify-center items-center gap-2">
                  <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-200">✨ Smart Calculation Applied</h3>
                </div>
                <div className="text-sm text-emerald-700 dark:text-emerald-300 space-y-2">
                  <div className="bg-white/50 p-3 rounded-lg border border-emerald-200">
                    <p className="font-semibold mb-2">Formula: Total Overtime Hours - Delay to Finish</p>
                    <div className="text-xs space-y-1">
                      <p><strong>Total Overtime:</strong> {formatHoursAndMinutes(summary.actualOvertimeHours)}</p>
                      <p><strong>Total Delay:</strong> {formatHoursAndMinutes(summary.rawDelayHours)}</p>
                    </div>
                  </div>
                  {summary.rawDelayHours > 0 ? (
                    summary.offsettingType === 'overtime_covers_delay' ? (
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <p className="text-green-800 font-bold text-base">
                          🎉 Overtime Covers Delay!
                        </p>
                        <p className="text-green-700 text-sm mt-1">
                          Net Result: {formatHoursAndMinutes(summary.totalOvertime)} overtime remaining
                        </p>
                      </div>
                    ) : (
                      <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                        <p className="text-orange-800 font-bold text-base">
                          ⚠️ Delay Remains After Overtime Offset
                        </p>
                        <p className="text-orange-700 text-sm mt-1">
                          Net Result: {formatHoursAndMinutes(summary.delayToFinish)} delay remaining
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <p className="text-blue-800 font-bold text-base">
                        🎯 Pure Overtime - No Delays!
                      </p>
                      <p className="text-blue-700 text-sm mt-1">
                        Net Result: {formatHoursAndMinutes(summary.totalOvertime)} overtime earned
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin Recalculation Tools */}
        {(user?.role === 'admin' || user?.role === 'customer_retention_manager') && <AdminRecalculateButton onRecalculationComplete={() => loadMonthlyShifts(false)} />}

        {/* Enhanced mobile filters with better UX - Only show for admin */}
        {(user?.role === 'admin' || user?.role === 'customer_retention_manager') && (
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

                  <div className="flex items-end gap-2">
                    <Button 
                      onClick={() => setShowWeeklyAssignment(!showWeeklyAssignment)}
                      variant={showWeeklyAssignment ? "default" : "outline"}
                      size="sm"
                      className="h-9 w-full text-xs"
                    >
                      <Users className="mr-2 h-3 w-3 shrink-0" />
                      Weekly Assignment
                    </Button>
                    <Button
                      onClick={() => {
                        // Generate CSV data
                        const headers = (user?.role === 'admin' || user?.role === 'customer_retention_manager')
                          ? ['Date', 'Employee', 'Shift', 'Check In', 'Check Out', 'Delay', 'Break Time', 'Regular Hours', 'Overtime Hours', 'Delay']
                          : ['Date', 'Shift', 'Check In', 'Check Out', 'Delay', 'Break Time', 'Regular Hours', 'Overtime Hours', 'Delay'];
                        
                        const csvData = monthlyShifts.map(shift => {
                          const row = (user?.role === 'admin' || user?.role === 'customer_retention_manager')
                            ? [
                                format(shift.workDate, 'dd/MM/yyyy'),
                                shift.userName,
                                shift.shiftName || t.notWorked,
                                formatTime(shift.checkInTime),
                                formatTime(shift.checkOutTime),
                                shift.delayMinutes || '0',
                                shift.totalBreakMinutes || '0',
                                shift.regularHours || '0',
                                shift.overtimeHours || '0',
                                shift.delayMinutes || '0'
                              ]
                            : [
                                format(shift.workDate, 'dd/MM/yyyy'),
                                shift.shiftName || t.notWorked,
                                formatTime(shift.checkInTime),
                                formatTime(shift.checkOutTime),
                                shift.delayMinutes || '0',
                                shift.totalBreakMinutes || '0',
                                shift.regularHours || '0',
                                shift.overtimeHours || '0',
                                shift.delayMinutes || '0'
                              ];
                          return row.join(',');
                        });
                        
                        // Create CSV content
                        const csvContent = [headers.join(','), ...csvData].join('\n');
                        
                        // Create and download file
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement('a');
                        const currentMonth = format(selectedDate, 'MMMM_yyyy');
                        link.href = URL.createObjectURL(blob);
                        link.download = `shifts_${currentMonth}.csv`;
                        link.click();
                      }}
                      variant="outline"
                      size="sm"
                      className="h-9 text-xs"
                    >
                      <Download className="mr-2 h-3 w-3 shrink-0" />
                      {t.export}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Month filter for employees - simplified version */}
        {user?.role !== 'admin' && user?.role !== 'customer_retention_manager' && (
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
        {(user.position === 'Junior CRM Specialist' || user.position === 'Designer') && (
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg font-bold truncate">{t.monthlyShifts}</CardTitle>
              <div className="flex items-center gap-2">
                {(user?.role === 'admin' || user?.role === 'customer_retention_manager') && (
                  <Badge variant="secondary" className="text-xs">
                    Admin: Click shifts to edit
                  </Badge>
                )}
                <Button
                  onClick={() => {
                    // Generate CSV data
                    const headers = (user?.role === 'admin' || user?.role === 'customer_retention_manager')
                      ? ['Date', 'Employee', 'Shift', 'Check In', 'Check Out', 'Delay', 'Break Time', 'Regular Hours', 'Overtime Hours', 'Delay']
                      : ['Date', 'Shift', 'Check In', 'Check Out', 'Delay', 'Break Time', 'Regular Hours', 'Overtime Hours', 'Delay'];
                    
                    const csvData = monthlyShifts.map(shift => {
                      const row = (user?.role === 'admin' || user?.role === 'customer_retention_manager')
                        ? [
                            format(shift.workDate, 'dd/MM/yyyy'),
                            shift.userName,
                            shift.isDayOff ? t.dayOff : (shift.shiftName || t.notWorked),
                            shift.isDayOff ? '-' : formatTime(shift.checkInTime),
                            shift.isDayOff ? '-' : formatTime(shift.checkOutTime),
                            shift.isDayOff ? '0' : (shift.delayMinutes || '0'),
                            shift.isDayOff ? '0' : (shift.totalBreakMinutes || '0'),
                            shift.isDayOff ? '0' : (shift.regularHours || '0'),
                            shift.isDayOff ? '0' : (shift.overtimeHours || '0'),
                            shift.isDayOff ? 'All Clear' : (shift.delayMinutes || '0')
                          ]
                        : [
                            format(shift.workDate, 'dd/MM/yyyy'),
                            shift.isDayOff ? t.dayOff : (shift.shiftName || t.notWorked),
                            shift.isDayOff ? '-' : formatTime(shift.checkInTime),
                            shift.isDayOff ? '-' : formatTime(shift.checkOutTime),
                            shift.isDayOff ? '0' : (shift.delayMinutes || '0'),
                            shift.isDayOff ? '0' : (shift.totalBreakMinutes || '0'),
                            shift.isDayOff ? '0' : (shift.regularHours || '0'),
                            shift.isDayOff ? '0' : (shift.overtimeHours || '0'),
                            shift.isDayOff ? 'All Clear' : (shift.delayMinutes || '0')
                          ];
                      return row.join(',');
                    });
                    
                    // Create CSV content
                    const csvContent = [headers.join(','), ...csvData].join('\n');
                    
                    // Create and download file
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    const currentMonth = format(selectedDate, 'MMMM_yyyy');
                    link.href = URL.createObjectURL(blob);
                    link.download = `shifts_${currentMonth}.csv`;
                    link.click();
                  }}
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs font-medium hover:shadow-sm transition-all duration-200"
                >
                  <Download className="h-3 w-3 mr-1" />
                  {t.export}
                </Button>
              </div>
            </div>
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
                          {user.role === 'admin' ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="relative">
                                  <Select
                                    value={shift.shiftId || 'none'}
                                    onValueChange={(value) => handleShiftChange(shift.userId, shift.workDate, value)}
                                    disabled={updatingShifts.has(`${shift.userId}-${format(shift.workDate, 'yyyy-MM-dd')}`)}
                                  >
                                    <SelectTrigger className="w-24 h-6 text-xs">
                                      <SelectValue>
                                        <div className="flex items-center gap-1">
                                          {updatingShifts.has(`${shift.userId}-${format(shift.workDate, 'yyyy-MM-dd')}`) && (
                                            <div className="animate-spin rounded-full h-2 w-2 border border-gray-300 border-t-transparent"></div>
                                          )}
                                          <Badge className={`${getShiftBadgeColor(shift.shiftName, shift.isDayOff)} text-xs px-1 py-0.5 rounded-full font-semibold whitespace-nowrap`}>
                                            {shift.isDayOff ? t.dayOff : (shift.shiftName || t.notWorked)}
                                          </Badge>
                                        </div>
                                      </SelectValue>
                                    </SelectTrigger>
                                                                          <SelectContent>
                                        <SelectItem value="none">
                                          <div className="flex items-center gap-2">
                                            <span className="text-2xl">🏖️</span>
                                            <span className="text-green-700 font-medium text-xs">Day Off</span>
                                          </div>
                                        </SelectItem>
                                        {shifts.map((shiftOption) => (
                                          <SelectItem key={shiftOption.id} value={shiftOption.id}>
                                            <div className="flex flex-col gap-1">
                                              <Badge className={getShiftBadgeColor(shiftOption.name, false)}>
                                                {shiftOption.name}
                                              </Badge>
                                              <span className="text-xs text-gray-500">
                                                {shiftOption.startTime} - {shiftOption.endTime}
                                              </span>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                  </Select>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t.changeShift}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Badge className={`${getShiftBadgeColor(shift.shiftName, shift.isDayOff)} text-xs px-2 py-1 rounded-full font-semibold whitespace-nowrap shrink-0`}>
                              {shift.isDayOff ? t.dayOff : (shift.shiftName || t.notWorked)}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-medium block">{t.checkIn}</span>
                            <div className="text-xs font-bold text-foreground bg-muted/50 rounded-lg p-2 text-center">
                              {shift.isDayOff ? '-' : formatTime(shift.checkInTime)}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-medium block">{t.checkOut}</span>
                            <div className="text-xs font-bold text-foreground bg-muted/50 rounded-lg p-2 text-center">
                              {shift.isDayOff ? '-' : formatTime(shift.checkOutTime)}
                            </div>
                          </div>
                            </div>
                        
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-medium block">{t.delay}</span>
                            <div className={`text-xs font-bold rounded-lg p-2 text-center ${
                              shift.isDayOff || shift.delayMinutes === 0
                                ? 'text-green-600 bg-green-50 dark:bg-green-900/20' 
                                : 'text-red-600 bg-red-50 dark:bg-red-900/20'
                            }`}>
                              {shift.isDayOff ? '0min' : formatDelayHoursAndMinutes(shift.delayMinutes)}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-medium block">{t.breakTime}</span>
                            <div className="text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 text-center">
                              {shift.isDayOff ? '0min' : formatBreakTime(shift.totalBreakMinutes || 0)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-medium block">{t.regularHours}</span>
                            <div className="text-xs font-bold text-foreground bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center">
                              {shift.isDayOff ? '0h' : formatHoursAndMinutes(shift.regularHours)}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-medium block">{t.overtimeHours}</span>
                            <div className="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
                              {shift.isDayOff ? '0h' : formatHoursAndMinutes(shift.overtimeHours)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t border-border/50">
                          <div className={`flex justify-between items-center rounded-lg p-2 ${
                            shift.isDayOff 
                              ? 'bg-gradient-to-r from-green-100/50 to-green-50/30 dark:from-green-900/20 dark:to-green-800/10'
                              : 'bg-gradient-to-r from-red-100/50 to-red-50/30 dark:from-red-900/20 dark:to-red-800/10'
                          }`}>
                            <span className="text-xs text-muted-foreground font-semibold">{t.delayTime}</span>
                            <span className={`font-bold text-sm ${
                              calculateDelayToFinish(shift.totalBreakMinutes || 0, shift.delayMinutes, shift.regularHours, shift.overtimeHours, shift.shiftName, shift.shiftStartTime, shift.shiftEndTime, shift.allTimeOvertime, shift.isDayOff) === 'All Clear' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {calculateDelayToFinish(shift.totalBreakMinutes || 0, shift.delayMinutes, shift.regularHours, shift.overtimeHours, shift.shiftName, shift.shiftStartTime, shift.shiftEndTime, shift.allTimeOvertime, shift.isDayOff)}
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
                      <TableHead className="font-semibold text-xs">{t.delay}</TableHead>
                      <TableHead className="font-semibold text-xs">{t.breakTime}</TableHead>
                      <TableHead className="font-semibold text-xs">{t.regularHours}</TableHead>
                      <TableHead className="font-semibold text-xs">{t.overtimeHours}</TableHead>
                      <TableHead className="font-semibold text-xs">{t.delayTime}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={user.role === 'admin' ? 9 : 8} className="text-center py-12">
                          <div className="flex items-center justify-center space-x-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                            <span className="text-sm font-medium">{t.loading}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : monthlyShifts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={user.role === 'admin' ? 9 : 8} className="text-center py-12">
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
                            {user.role === 'admin' ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="relative">
                                    <Select
                                      value={shift.shiftId || 'none'}
                                      onValueChange={(value) => handleShiftChange(shift.userId, shift.workDate, value)}
                                      disabled={updatingShifts.has(`${shift.userId}-${format(shift.workDate, 'yyyy-MM-dd')}`)}
                                    >
                                      <SelectTrigger className="w-32 h-8 text-xs">
                                        <SelectValue>
                                          <div className="flex items-center gap-1">
                                            {updatingShifts.has(`${shift.userId}-${format(shift.workDate, 'yyyy-MM-dd')}`) && (
                                              <div className="animate-spin rounded-full h-3 w-3 border border-gray-300 border-t-transparent"></div>
                                            )}
                                            <Badge className={getShiftBadgeColor(shift.shiftName, shift.isDayOff)}>
                                              {shift.isDayOff ? t.dayOff : (shift.shiftName || t.notWorked)}
                                            </Badge>
                                          </div>
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">
                                          <div className="flex items-center gap-2">
                                            <span className="text-lg">🏖️</span>
                                            <span className="text-green-700 font-medium">Day Off</span>
                                          </div>
                                        </SelectItem>
                                        {shifts.map((shiftOption) => (
                                          <SelectItem key={shiftOption.id} value={shiftOption.id}>
                                            <div className="flex items-center gap-2">
                                              <Badge className={getShiftBadgeColor(shiftOption.name, false)}>
                                                {shiftOption.name}
                                              </Badge>
                                              <span className="text-xs text-gray-500">
                                                ({shiftOption.startTime} - {shiftOption.endTime})
                                              </span>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t.changeShift}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Badge className={getShiftBadgeColor(shift.shiftName, shift.isDayOff)}>
                                {shift.isDayOff ? t.dayOff : (shift.shiftName || t.notWorked)}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{shift.isDayOff ? '-' : formatTime(shift.checkInTime)}</TableCell>
                          <TableCell className="font-mono text-xs">{shift.isDayOff ? '-' : formatTime(shift.checkOutTime)}</TableCell>
                          <TableCell className={`font-semibold text-xs ${
                            shift.isDayOff || shift.delayMinutes === 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {shift.isDayOff ? '0min' : formatDelayHoursAndMinutes(shift.delayMinutes)}
                          </TableCell>
                          <TableCell className="text-purple-600 font-semibold text-xs">
                            {shift.isDayOff ? '0min' : formatBreakTime(shift.totalBreakMinutes || 0)}
                          </TableCell>
                          <TableCell className="font-semibold text-xs">{shift.isDayOff ? '0h' : formatHoursAndMinutes(shift.regularHours)}</TableCell>
                          <TableCell className="text-green-600 font-semibold text-xs">
                            {shift.isDayOff ? '0h' : formatHoursAndMinutes(shift.overtimeHours)}
                          </TableCell>
                          <TableCell className={`font-bold text-xs ${
                            calculateDelayToFinish(shift.totalBreakMinutes || 0, shift.delayMinutes, shift.regularHours, shift.overtimeHours, shift.shiftName, shift.shiftStartTime, shift.shiftEndTime, shift.allTimeOvertime, shift.isDayOff) === 'All Clear' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {calculateDelayToFinish(shift.totalBreakMinutes || 0, shift.delayMinutes, shift.regularHours, shift.overtimeHours, shift.shiftName, shift.shiftStartTime, shift.shiftEndTime, shift.allTimeOvertime, shift.isDayOff)}
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
    </TooltipProvider>
  );
};

export default ShiftsPage; 