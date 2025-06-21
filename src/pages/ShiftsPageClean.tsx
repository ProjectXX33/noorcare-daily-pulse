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
const calculateDelayToFinish = (breakMinutes: number, delayMinutes: number, regularHours: number, overtimeHours: number, shiftName?: string): string => {
  // NEW SMART LOGIC: Different calculation based on work completion
  
  // Get expected hours based on shift type (Day = 7h, Night = 8h)
  const getExpectedHours = (shiftName?: string): number => {
    if (!shiftName) return 7; // Default to Day Shift
    if (shiftName.toLowerCase().includes('day')) return 7;
    if (shiftName.toLowerCase().includes('night')) return 8;
    return 7; // Default fallback
  };
  
  const expectedHours = getExpectedHours(shiftName);
  const workedHours = regularHours; // Total hours actually worked
  
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
      shiftUpdated: "Shift updated successfully",
      shiftUpdateFailed: "Failed to update shift"
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
      shiftUpdated: "تم تحديث الوردية بنجاح",
      shiftUpdateFailed: "فشل في تحديث الوردية"
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

      // Fetch break time data separately for the same date range and users
      const userIds = selectedEmployee !== 'all' ? [selectedEmployee] : 
                     user?.role !== 'admin' ? [user.id] : 
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

      const formattedShifts: MonthlyShift[] = data.map(item => {
        const dateKey = format(new Date(item.work_date), 'yyyy-MM-dd');
        const breakKey = `${item.user_id}-${dateKey}`;
        const breakData = breakTimeMap.get(breakKey) || { totalBreakMinutes: 0, breakSessions: [] };

        return {
          id: item.id,
          userId: item.user_id,
          shiftId: item.shift_id,
          workDate: new Date(item.work_date),
          checkInTime: item.check_in_time ? new Date(item.check_in_time) : undefined,
          checkOutTime: item.check_out_time ? new Date(item.check_out_time) : undefined,
          regularHours: item.regular_hours,
          overtimeHours: item.overtime_hours,
          delayMinutes: item.delay_minutes || 0,
          createdAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at),
          userName: item.users?.name,
          shiftName: item.shifts?.name,
          shiftStartTime: item.shifts?.start_time,
          shiftEndTime: item.shifts?.end_time,
          // Break time data
          totalBreakMinutes: breakData.totalBreakMinutes,
          breakSessions: breakData.breakSessions
        };
      });

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
  }, [user, loadShifts, loadCustomerServiceEmployees]);

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
    const totalRegular = monthlyShifts.reduce((sum, shift) => sum + shift.regularHours, 0);
    const actualOvertimeHours = monthlyShifts.reduce((sum, shift) => sum + shift.overtimeHours, 0);
    const workingDays = monthlyShifts.filter(shift => shift.checkInTime).length;
    const averagePerDay = workingDays > 0 ? (totalRegular + actualOvertimeHours) / workingDays : 0;
    
    // Calculate totals using simple formula: Break Time + Delay Minutes
    const totalDelayMinutes = monthlyShifts.reduce((sum, shift) => sum + shift.delayMinutes, 0);
    const totalBreakMinutes = monthlyShifts.reduce((sum, shift) => sum + (shift.totalBreakMinutes || 0), 0);
    
    // Step 1: Calculate raw totals
    const totalDelayAndBreakMinutes = totalBreakMinutes + totalDelayMinutes;
    const rawDelayToFinishHours = totalDelayAndBreakMinutes / 60; // Convert to hours
    
    // Step 2: Apply smart offsetting logic for ALL USERS (Admin + Employee): Total Overtime Hours - Delay to Finish
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
    const hasSmartOffsetting = actualOvertimeHours > 0 && rawDelayToFinishHours > 0;
    const offsettingType = actualOvertimeHours > rawDelayToFinishHours ? 'overtime_covers_delay' : 'delay_covers_overtime';
    
    console.log('📊 Summary with Universal Smart Offsetting Logic (All Users):', {
      userRole: user?.role,
      selectedEmployee,
      totalDelayMinutes,
      totalBreakMinutes,
      totalDelayAndBreakMinutes,
      rawDelayToFinishHours: rawDelayToFinishHours.toFixed(2),
      actualOvertimeHours: actualOvertimeHours.toFixed(2),
      finalOvertimeHours: finalOvertimeHours.toFixed(2),
      finalDelayToFinishHours: finalDelayToFinishHours.toFixed(2),
      hasSmartOffsetting,
      offsettingType,
      smartOffsetingApplied: true,
      logic: actualOvertimeHours > rawDelayToFinishHours 
        ? 'UNIVERSAL: Overtime covers delay' 
        : 'UNIVERSAL: Delay remains after overtime offset',
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
  }, [monthlyShifts, selectedEmployee, user]);

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

  // Handle shift change for admin
  const handleShiftChange = useCallback(async (userId: string, workDate: Date, newShiftId: string) => {
    if (user?.role !== 'admin') return;

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

      // Update monthly shift record if it exists
      const { error: monthlyError } = await supabase
        .from('monthly_shifts')
        .update({
          shift_id: shiftId,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('work_date', workDateStr);

      // Don't throw error if monthly shift doesn't exist yet
      if (monthlyError && monthlyError.code !== 'PGRST116') {
        console.warn('Monthly shift update error:', monthlyError);
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
        <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-2 lg:grid-cols-5 w-full">
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

          <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 w-full">
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="text-center space-y-2 sm:space-y-3">
                <div className="flex justify-center">
                  <div className={`p-2 sm:p-3 rounded-full ${summary.totalOvertime > 0 ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-gray-100 dark:bg-gray-900/30'}`}>
                    <TrendingUp className={`h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 ${summary.totalOvertime > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`} />
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-xs sm:text-sm md:text-base font-medium text-muted-foreground leading-tight">{t.totalOvertimeHours}</p>
                  {summary.hasSmartOffsetting && (
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">✨ SMART</span>
                  )}
                </div>
                <div className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold ${summary.totalOvertime > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                  {summary.totalOvertime > 0 ? formatHoursAndMinutes(summary.totalOvertime) : '0h 0min'}
                </div>
                {summary.hasSmartOffsetting && summary.offsettingType === 'overtime_covers_delay' && (
                  <p className="text-xs text-green-600 font-medium">After covering delay</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 w-full">
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="text-center space-y-2 sm:space-y-3">
                <div className="flex justify-center">
                  <div className={`p-2 sm:p-3 rounded-full ${summary.delayToFinish > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                    <Clock className={`h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 ${summary.delayToFinish > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-xs sm:text-sm md:text-base font-medium text-muted-foreground leading-tight">{t.delayToFinish}</p>
                  {summary.hasSmartOffsetting && (
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">✨ SMART</span>
                  )}
                </div>
                <div className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold ${summary.delayToFinish > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {summary.delayToFinish > 0 ? formatHoursAndMinutes(summary.delayToFinish) : 'All Clear'}
                </div>
                {summary.hasSmartOffsetting && summary.offsettingType === 'delay_covers_overtime' && (
                  <p className="text-xs text-red-600 font-medium">After overtime offset</p>
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

        {/* Smart Offsetting Summary - For All Users (Admin + Employees) */}
        {summary.hasSmartOffsetting && (
          <Card className="border-2 border-green-200 bg-green-50 dark:bg-green-900/20 shadow-sm w-full">
            <CardContent className="p-4">
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold text-green-700 dark:text-green-300">
                    Smart Offsetting Summary
                    {user?.role === 'admin' && selectedEmployee !== 'all' && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        - {customerServiceEmployees.find(emp => emp.id === selectedEmployee)?.name || 'Selected Employee'}
                      </span>
                    )}
                  </h3>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div className="text-center">
                      <p className="text-muted-foreground font-medium">Raw Overtime</p>
                      <p className="font-bold text-orange-600">{formatHoursAndMinutes(summary.actualOvertimeHours)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground font-medium">Raw Delay</p>
                      <p className="font-bold text-red-600">{formatHoursAndMinutes(summary.rawDelayHours)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground font-medium">Net Result</p>
                      <p className="font-bold text-green-600">
                        {summary.offsettingType === 'overtime_covers_delay' 
                          ? `+${formatHoursAndMinutes(summary.totalOvertime)} OT` 
                          : `${formatHoursAndMinutes(summary.delayToFinish)} Delay`
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-center text-muted-foreground">
                      <span className="font-medium">Smart Logic:</span> {formatHoursAndMinutes(summary.actualOvertimeHours)} Overtime - {formatHoursAndMinutes(summary.rawDelayHours)} Delay = 
                      <span className="font-bold text-green-600 ml-1">
                        {summary.offsettingType === 'overtime_covers_delay' 
                          ? `${formatHoursAndMinutes(summary.totalOvertime)} Net Overtime` 
                          : `${formatHoursAndMinutes(summary.delayToFinish)} Net Delay`
                        }
                      </span>
                    </p>
                    {user?.role === 'admin' && selectedEmployee === 'all' && (
                      <p className="text-xs text-center text-blue-600 font-medium mt-2">
                        ℹ️ Admin Note: This shows combined totals. Select individual employees to see their smart offsetting calculations.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin Recalculation Tools */}
        {user?.role === 'admin' && <AdminRecalculateButton onRecalculationComplete={() => loadMonthlyShifts(false)} />}

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
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg font-bold truncate">{t.monthlyShifts}</CardTitle>
              {user?.role === 'admin' && (
                <Badge variant="secondary" className="text-xs">
                  Admin: Click shifts to edit
                </Badge>
              )}
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
                                          <Badge className={`${getShiftBadgeColor(shift.shiftName)} text-xs px-1 py-0.5 rounded-full font-semibold whitespace-nowrap`}>
                                            {shift.shiftName || t.notWorked}
                                          </Badge>
                                        </div>
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">
                                        <span className="text-gray-500 text-xs">{t.noShift}</span>
                                      </SelectItem>
                                      {shifts.map((shiftOption) => (
                                        <SelectItem key={shiftOption.id} value={shiftOption.id}>
                                          <div className="flex flex-col gap-1">
                                            <Badge className={getShiftBadgeColor(shiftOption.name)}>
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
                            <Badge className={`${getShiftBadgeColor(shift.shiftName)} text-xs px-2 py-1 rounded-full font-semibold whitespace-nowrap shrink-0`}>
                              {shift.shiftName || t.notWorked}
                            </Badge>
                          )}
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
                        
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-medium block">{t.delay}</span>
                            <div className={`text-xs font-bold rounded-lg p-2 text-center ${
                              shift.delayMinutes > 0 
                                ? 'text-red-600 bg-red-50 dark:bg-red-900/20' 
                                : 'text-green-600 bg-green-50 dark:bg-green-900/20'
                            }`}>
                              {formatDelayHoursAndMinutes(shift.delayMinutes)}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-medium block">{t.breakTime}</span>
                            <div className="text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 text-center">
                              {formatBreakTime(shift.totalBreakMinutes || 0)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-medium block">{t.regularHours}</span>
                            <div className="text-xs font-bold text-foreground bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center">
                              {formatHoursAndMinutes(shift.regularHours)}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-medium block">{t.overtimeHours}</span>
                            <div className="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
                              {formatHoursAndMinutes(shift.overtimeHours)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t border-border/50">
                          <div className={`flex justify-between items-center rounded-lg p-2 ${
                            calculateDelayToFinish(shift.totalBreakMinutes || 0, shift.delayMinutes, shift.regularHours, shift.overtimeHours, shift.shiftName) === 'All Clear' 
                              ? 'bg-gradient-to-r from-green-100/50 to-green-50/30 dark:from-green-900/20 dark:to-green-800/10' 
                              : 'bg-gradient-to-r from-red-100/50 to-red-50/30 dark:from-red-900/20 dark:to-red-800/10'
                          }`}>
                            <span className="text-xs text-muted-foreground font-semibold">{t.delayTime}</span>
                            <span className={`font-bold text-sm ${
                              calculateDelayToFinish(shift.totalBreakMinutes || 0, shift.delayMinutes, shift.regularHours, shift.overtimeHours, shift.shiftName) === 'All Clear' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {calculateDelayToFinish(shift.totalBreakMinutes || 0, shift.delayMinutes, shift.regularHours, shift.overtimeHours, shift.shiftName)}
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
                                            <Badge className={getShiftBadgeColor(shift.shiftName)}>
                                              {shift.shiftName || t.notWorked}
                                            </Badge>
                                          </div>
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">
                                          <span className="text-gray-500">{t.noShift}</span>
                                        </SelectItem>
                                        {shifts.map((shiftOption) => (
                                          <SelectItem key={shiftOption.id} value={shiftOption.id}>
                                            <div className="flex items-center gap-2">
                                              <Badge className={getShiftBadgeColor(shiftOption.name)}>
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
                              <Badge className={getShiftBadgeColor(shift.shiftName)}>
                                {shift.shiftName || t.notWorked}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{formatTime(shift.checkInTime)}</TableCell>
                          <TableCell className="font-mono text-xs">{formatTime(shift.checkOutTime)}</TableCell>
                          <TableCell className={`font-semibold text-xs ${
                            shift.delayMinutes > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {formatDelayHoursAndMinutes(shift.delayMinutes)}
                          </TableCell>
                          <TableCell className="text-purple-600 font-semibold text-xs">
                            {formatBreakTime(shift.totalBreakMinutes || 0)}
                          </TableCell>
                          <TableCell className="font-semibold text-xs">{formatHoursAndMinutes(shift.regularHours)}</TableCell>
                          <TableCell className="text-green-600 font-semibold text-xs">
                            {formatHoursAndMinutes(shift.overtimeHours)}
                          </TableCell>
                          <TableCell className={`font-bold text-xs ${
                            calculateDelayToFinish(shift.totalBreakMinutes || 0, shift.delayMinutes, shift.regularHours, shift.overtimeHours, shift.shiftName) === 'All Clear' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {calculateDelayToFinish(shift.totalBreakMinutes || 0, shift.delayMinutes, shift.regularHours, shift.overtimeHours, shift.shiftName)}
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