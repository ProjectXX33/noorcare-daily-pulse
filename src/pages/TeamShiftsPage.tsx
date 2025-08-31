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
import { toast } from 'sonner';
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
  
  // If no shift assigned, return Not Worked
  if (!shiftName || shiftName === 'No Shift' || shiftName === 'بدون وردية') {
    return 'Not Worked';
  }
  
  // Calculate total working hours
  const totalHours = regularHours + overtimeHours;
  
  // If no hours worked, return Not Worked
  if (totalHours <= 0) {
    return 'Not Worked';
  }
  
  // Calculate total delay time (break time excluded because work hours freeze during breaks)
  const totalDelayMinutes = delayMinutes;
  const totalDelayHours = totalDelayMinutes / 60;
  
  // If delay is less than 15 minutes, return All Clear
  if (totalDelayMinutes <= 15) {
    return 'All Clear';
  }
  
  // Format the delay time
  return formatDelayHoursAndMinutes(totalDelayMinutes);
};

// Helper function to calculate Smart Offsetting Summary
const calculateSmartOffsetting = (shifts: MonthlyShift[]) => {
  const workedShifts = shifts.filter(shift => 
    shift.regularHours > 0 || shift.overtimeHours > 0
  );

  const rawOvertime = workedShifts.reduce((sum, shift) => sum + shift.overtimeHours, 0);
  const rawDelay = workedShifts.reduce((sum, shift) => sum + shift.delayMinutes, 0) / 60; // Convert to hours
  const netResult = rawOvertime - rawDelay;

  return {
    rawOvertime,
    rawDelay,
    netResult: Math.max(0, netResult) // Don't show negative net overtime
  };
};

// Helper function to calculate shift duration in hours
const calculateShiftDuration = (startTime: string, endTime: string): number => {
  const start = new Date(`2000-01-01 ${startTime}`);
  const end = new Date(`2000-01-01 ${endTime}`);
  const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
  return durationMinutes / 60; // Convert to hours
};

const TeamShiftsPage = () => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [teamEmployees, setTeamEmployees] = useState<User[]>([]);
  const [monthlyShifts, setMonthlyShifts] = useState<MonthlyShift[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const now = new Date();
    return now;
  });
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isDataInitialized, setIsDataInitialized] = useState(false);
  const [language] = useState<string>('en');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [updatingShifts, setUpdatingShifts] = useState<Set<string>>(new Set());

  const translations = {
    en: {
      teamShifts: "Team Shifts",
      monthlyShifts: "Monthly Shifts",
      manageShifts: "View team shifts and track hours",
      employee: "Employee",
      allEmployees: "All Team Members",
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
    }
  };

  const t = useMemo(() => translations[language as keyof typeof translations], [language]);

  // Load shifts
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

  // Load team employees (Content & Creative Department or Customer Retention Department)
  const loadTeamEmployees = useCallback(async () => {
    try {
      let query = supabase
        .from('users')
        .select('*')
        .eq('role', 'employee')
        .order('name');

      // Filter by team based on user role
      if (user?.role === 'content_creative_manager') {
        query = query.or('team.eq.Content & Creative Department,position.in.(Copy Writing,Designer,Media Buyer)');
      } else if (user?.role === 'customer_retention_manager') {
        query = query.or('team.eq.Customer Retention Department,position.in.(Junior CRM Specialist,Customer Retention Specialist)');
      }

      const { data, error } = await query;

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

      setTeamEmployees(employees);
    } catch (error) {
      console.error('Error loading team employees:', error);
      toast.error('Failed to load team employees');
    }
  }, [user?.role]);

  // Load monthly shifts for team
  const loadMonthlyShifts = useCallback(async (showLoadingState = true) => {
    if (showLoadingState) {
      setIsLoading(true);
    }
    
    try {
      const startDate = startOfMonth(selectedDate);
      const endDate = endOfMonth(selectedDate);

      console.log('Loading team monthly shifts for:', {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        selectedEmployee,
        userRole: user?.role
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

      // Filter by team members
      query = query.in('user_id', teamEmployees.map(emp => emp.id));

      if (selectedEmployee !== 'all') {
        query = query.eq('user_id', selectedEmployee);
      }

      const { data, error } = await query;

      if (error) throw error;

      console.log('Team monthly shifts data received:', data);

      // Fetch break time data separately for the same date range and users (matching ShiftsPageClean)
      const userIds = teamEmployees.map(emp => emp.id);
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

        console.log('Team break time data received:', breakTimeData);
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
          workDate: new Date(item.work_date),
          shiftId: item.shift_id,
          checkInTime: item.check_in_time ? new Date(item.check_in_time) : null,
          checkOutTime: item.check_out_time ? new Date(item.check_out_time) : null,
          delayMinutes: item.delay_minutes || 0,
          totalBreakMinutes: breakData.totalBreakMinutes,
          breakSessions: breakData.breakSessions,
          regularHours: item.regular_hours || 0,
          overtimeHours: item.overtime_hours || 0,
          isDayOff: item.is_day_off && !item.shift_id && !item.shifts?.name,
          createdAt: new Date(item.created_at || new Date()),
          updatedAt: new Date(item.updated_at || new Date()),
          userName: item.users?.name || 'Unknown',
          shiftName: item.shifts?.name || (item.is_day_off && !item.shift_id && !item.shifts?.name ? 'Day Off' : 'No Shift'),
          shiftStartTime: item.shifts?.start_time,
          shiftEndTime: item.shifts?.end_time,
          allTimeOvertime: item.shifts?.all_time_overtime || false
        };
      });

      setMonthlyShifts(formattedShifts);
      console.log('Team monthly shifts loaded:', formattedShifts.length);
    } catch (error) {
      console.error('Error loading team monthly shifts:', error);
      toast.error('Failed to load team shifts');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedEmployee, teamEmployees, user?.role]);

  // Load data on component mount
  useEffect(() => {
    if (user?.role === 'content_creative_manager' || user?.role === 'customer_retention_manager') {
      const initializeData = async () => {
        try {
          setIsLoading(true);
          setIsDataInitialized(false);
          await Promise.all([
            loadShifts(),
            loadTeamEmployees()
          ]);
          setIsDataInitialized(true);
        } catch (error) {
          console.error('Error initializing data:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      initializeData();
    }
  }, [user, loadShifts, loadTeamEmployees]);

  // Load monthly shifts when dependencies change
  useEffect(() => {
    if (teamEmployees.length > 0 && isDataInitialized) {
      loadMonthlyShifts(false); // Don't show loading state since we're already loading
    }
  }, [selectedDate, selectedEmployee, teamEmployees, loadMonthlyShifts, isDataInitialized]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadShifts(),
        loadTeamEmployees(),
        loadMonthlyShifts(false)
      ]);
      setIsDataInitialized(true);
      toast.success('Team shifts refreshed successfully');
    } catch (error) {
      console.error('Error refreshing team shifts:', error);
      toast.error('Failed to refresh team shifts');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Force load monthly shifts if they haven't loaded yet
  useEffect(() => {
    if (isDataInitialized && teamEmployees.length > 0 && monthlyShifts.length === 0) {
      console.log('🔄 Force loading monthly shifts - no data found');
      loadMonthlyShifts(false);
    }
  }, [isDataInitialized, teamEmployees.length, monthlyShifts.length, loadMonthlyShifts]);

  // Fix Calculator - Recalculate all shifts based on assigned shift durations
  const fixCalculator = useCallback(async () => {
    if (user?.role !== 'admin' && user?.role !== 'customer_retention_manager' && user?.role !== 'content_creative_manager') {
      toast.error('Only admins and managers can fix calculations');
      return;
    }

    try {
      setIsLoading(true);
      toast.info('Fixing calculations based on assigned shift durations...');

      console.log('🔧 Starting Fix Calculator...');

      // Get all monthly shifts for the current month
      const startDate = startOfMonth(selectedDate);
      const endDate = endOfMonth(selectedDate);
      
      const { data: monthlyShiftsData, error: fetchError } = await supabase
        .from('monthly_shifts')
        .select(`
          *,
          shifts:shift_id(name, start_time, end_time, all_time_overtime)
        `)
        .gte('work_date', format(startDate, 'yyyy-MM-dd'))
        .lte('work_date', format(endDate, 'yyyy-MM-dd'))
        .in('user_id', teamEmployees.map(emp => emp.id));

      if (fetchError) throw fetchError;

      console.log(`📊 Found ${monthlyShiftsData?.length || 0} shifts to recalculate`);

      let updatedCount = 0;
      let errorCount = 0;

      // Process each shift
      for (const shift of monthlyShiftsData || []) {
        try {
          // Skip day offs
          if (shift.is_day_off) {
            console.log(`⏭️ Skipping day off: ${shift.work_date}`);
            continue;
          }

          // Skip if no shift assigned
          if (!shift.shift_id || !shift.shifts) {
            console.log(`⏭️ Skipping no shift: ${shift.work_date}`);
            continue;
          }

          const shiftData = shift.shifts;
          const workedHours = (shift.regular_hours || 0) + (shift.overtime_hours || 0);
          
          // Calculate expected hours from assigned shift
          const expectedHours = calculateShiftDuration(shiftData.start_time, shiftData.end_time);
          
          // Recalculate regular and overtime hours
          let newRegularHours = 0;
          let newOvertimeHours = 0;

          if (workedHours > 0) {
            newRegularHours = Math.min(workedHours, expectedHours);
            newOvertimeHours = Math.max(0, workedHours - expectedHours);
          }

          // Calculate new delay minutes based on missing work
          let newDelayMinutes = 0;
          if (workedHours < expectedHours) {
            const missingHours = expectedHours - workedHours;
            newDelayMinutes = missingHours * 60;
          }

          console.log(`🔄 Recalculating ${shift.work_date}:`, {
            shiftName: shiftData.name,
            startTime: shiftData.start_time,
            endTime: shiftData.end_time,
            expectedHours,
            oldRegular: shift.regular_hours,
            oldOvertime: shift.overtime_hours,
            newRegular: newRegularHours,
            newOvertime: newOvertimeHours,
            oldDelay: shift.delay_minutes,
            newDelay: newDelayMinutes
          });

          // Update the shift record
          const { error: updateError } = await supabase
            .from('monthly_shifts')
            .update({
              regular_hours: newRegularHours,
              overtime_hours: newOvertimeHours,
              delay_minutes: newDelayMinutes,
              updated_at: new Date().toISOString()
            })
            .eq('id', shift.id);

          if (updateError) {
            console.error(`❌ Error updating shift ${shift.id}:`, updateError);
            errorCount++;
          } else {
            updatedCount++;
          }

        } catch (shiftError) {
          console.error(`❌ Error processing shift ${shift.id}:`, shiftError);
          errorCount++;
        }
      }

      console.log(`✅ Fix Calculator completed: ${updatedCount} updated, ${errorCount} errors`);

      // Refresh the data
      await loadMonthlyShifts(false);

      if (errorCount === 0) {
        toast.success(`✅ Fixed calculations for ${updatedCount} shifts!`);
      } else {
        toast.warning(`⚠️ Fixed ${updatedCount} shifts, ${errorCount} errors occurred`);
      }

    } catch (error) {
      console.error('❌ Fix Calculator error:', error);
      toast.error('Failed to fix calculations');
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedDate, teamEmployees, loadMonthlyShifts]);

  // Helper function to recalculate hours based on new shift
  const recalculateHoursForShift = (
    currentRegularHours: number,
    currentOvertimeHours: number,
    newShiftDuration: number,
    workedHours: number
  ): { regularHours: number; overtimeHours: number } => {
    const totalWorkedHours = currentRegularHours + currentOvertimeHours;
    
    // If no work was done, reset to 0
    if (workedHours <= 0) {
      return { regularHours: 0, overtimeHours: 0 };
    }

    // Calculate new regular hours (up to shift duration)
    const newRegularHours = Math.min(workedHours, newShiftDuration);
    
    // Calculate new overtime hours (anything beyond shift duration)
    const newOvertimeHours = Math.max(0, workedHours - newShiftDuration);

    return { regularHours: newRegularHours, overtimeHours: newOvertimeHours };
  };

  // Handle shift change for admin
  const handleShiftChange = useCallback(async (userId: string, workDate: Date, newShiftId: string) => {
    console.log('🔄 handleShiftChange called:', { userId, workDate, newShiftId, userRole: user?.role });
    
    if (user?.role !== 'admin' && user?.role !== 'customer_retention_manager' && user?.role !== 'content_creative_manager') {
      console.log('❌ Permission denied - user role:', user?.role);
      return;
    }

    const updateKey = `${userId}-${format(workDate, 'yyyy-MM-dd')}`;
    
    try {
      // Add to updating set
      setUpdatingShifts(prev => new Set(prev).add(updateKey));
      
      const workDateStr = format(workDate, 'yyyy-MM-dd');
      const isDayOff = newShiftId === 'none' || newShiftId === 'dayoff';
      const shiftId = isDayOff ? null : newShiftId;

      // Get current shift data to recalculate hours
      const currentShift = monthlyShifts.find(s => s.userId === userId && isSameDay(s.workDate, workDate));
      const newShift = shifts.find(s => s.id === newShiftId);
      
      console.log('📊 Shift Change Data:', {
        currentShift: currentShift ? {
          id: currentShift.id,
          shiftName: currentShift.shiftName,
          regularHours: currentShift.regularHours,
          overtimeHours: currentShift.overtimeHours
        } : null,
        newShift: newShift ? {
          id: newShift.id,
          name: newShift.name,
          startTime: newShift.startTime,
          endTime: newShift.endTime
        } : null,
        monthlyShiftsLength: monthlyShifts.length,
        shiftsLength: shifts.length
      });
      
      let newRegularHours = 0;
      let newOvertimeHours = 0;

      if (!isDayOff && currentShift && newShift) {
        // Calculate worked hours (total time worked)
        const workedHours = currentShift.regularHours + currentShift.overtimeHours;
        
        // Calculate new shift duration
        const newShiftDuration = calculateShiftDuration(newShift.startTime, newShift.endTime);
        
        // Recalculate hours based on new shift
        const recalculated = recalculateHoursForShift(
          currentShift.regularHours,
          currentShift.overtimeHours,
          newShiftDuration,
          workedHours
        );
        
        newRegularHours = recalculated.regularHours;
        newOvertimeHours = recalculated.overtimeHours;
        
        console.log('🔄 Shift Change Recalculation:', {
          userId,
          workDate: workDateStr,
          oldShift: currentShift.shiftName,
          newShift: newShift.name,
          oldRegularHours: currentShift.regularHours,
          oldOvertimeHours: currentShift.overtimeHours,
          newShiftDuration,
          workedHours,
          newRegularHours,
          newOvertimeHours
        });
      }

      console.log('💾 Updating shift_assignments table:', {
        employee_id: userId,
        work_date: workDateStr,
        assigned_shift_id: shiftId,
        is_day_off: isDayOff
      });

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

      if (assignmentError) {
        console.error('❌ shift_assignments update error:', assignmentError);
        throw assignmentError;
      }
      
      console.log('✅ shift_assignments updated successfully');

      console.log('💾 Updating monthly_shifts table:', {
        user_id: userId,
        work_date: workDateStr,
        shift_id: shiftId,
        is_day_off: isDayOff,
        regular_hours: newRegularHours,
        overtime_hours: newOvertimeHours
      });

      // Update monthly shift record with recalculated hours
      const { error: monthlyError } = await supabase
        .from('monthly_shifts')
        .upsert({
          user_id: userId,
          work_date: workDateStr,
          shift_id: shiftId,
          is_day_off: isDayOff,
          regular_hours: newRegularHours,
          overtime_hours: newOvertimeHours,
          delay_minutes: currentShift?.delayMinutes || 0,
          check_in_time: currentShift?.checkInTime || null,
          check_out_time: currentShift?.checkOutTime || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,work_date'
        });

      if (monthlyError) {
        console.error('❌ monthly_shifts update error:', monthlyError);
        throw monthlyError;
      }
      
      console.log('✅ monthly_shifts updated successfully');

      // Find the shift name for the toast message
      const selectedShift = shifts.find(s => s.id === newShiftId);
      const shiftName = isDayOff ? 'Day Off' : selectedShift?.name || 'Unknown Shift';
      
      toast.success(`Shift updated: ${shiftName} - ${format(workDate, 'MMM dd, yyyy')}`);
      
      // Refresh the data to show the changes
      await loadMonthlyShifts();
      
    } catch (error) {
      console.error('Error updating shift:', error);
      toast.error('Failed to update shift');
    } finally {
      // Remove from updating set
      setUpdatingShifts(prev => {
        const newSet = new Set(prev);
        newSet.delete(updateKey);
        return newSet;
      });
    }
  }, [user, shifts, monthlyShifts, loadMonthlyShifts]);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      console.log('Starting CSV export...');
      console.log('Filtered shifts:', filteredShifts);
      console.log('Team employees:', teamEmployees);
      console.log('Summary stats:', summaryStats);
      
      // Check if we have data to export
      if (filteredShifts.length === 0) {
        toast.error('No data available to export');
        return;
      }

      // Prepare CSV data with summary
      const csvData = [];
      

      
      // Add detailed shifts data
      csvData.push(['DETAILED SHIFTS DATA']);
      csvData.push([
        'Employee Name',
        'Position', 
        'Date',
        'Shift Name',
        'Check In',
        'Check Out',
        'Delay',
        'Break Time',
        'Regular Hours',
        'Overtime Hours',
        'Delay to Finish'
      ]);
      
      // Add shift data - matching ShiftsPageClean format exactly
      filteredShifts.forEach((shift, index) => {
        try {
          const employee = teamEmployees.find(emp => emp.id === shift.userId);
          
          // Use the same format as ShiftsPageClean
          const row = [
            employee?.name || 'Unknown',
            employee?.position || 'Unknown',
            format(new Date(shift.workDate), 'dd/MM/yyyy'),
            shift.isDayOff ? 'Day Off' : (shift.shiftName || 'No Shift'),
            shift.isDayOff ? '-' : (shift.checkInTime ? format(shift.checkInTime, 'HH:mm') : '-'),
            shift.isDayOff ? '-' : (shift.checkOutTime ? format(shift.checkOutTime, 'HH:mm') : '-'),
            shift.isDayOff ? '0' : formatDelayHoursAndMinutes(shift.delayMinutes || 0),
            shift.isDayOff ? '0' : formatBreakTime(shift.totalBreakMinutes || 0),
            shift.isDayOff ? '0' : formatHoursAndMinutes(shift.regularHours || 0),
            shift.isDayOff ? '0' : formatHoursAndMinutes(shift.overtimeHours || 0),
            shift.isDayOff ? 'All Clear' : calculateDelayToFinish(
              shift.totalBreakMinutes || 0,
              shift.delayMinutes || 0,
              shift.regularHours || 0,
              shift.overtimeHours || 0,
              shift.shiftName,
              shift.shiftStartTime,
              shift.shiftEndTime,
              shift.allTimeOvertime,
              shift.isDayOff
            )
          ];
          
          csvData.push(row);
        } catch (rowError) {
          console.error(`Error processing row ${index}:`, rowError, shift);
          // Add a placeholder row with error info
          csvData.push([
            'ERROR',
            'ERROR',
            'ERROR',
            'ERROR',
            'ERROR',
            'ERROR',
            'ERROR',
            'ERROR',
            'ERROR',
            'ERROR',
            'ERROR'
          ]);
        }
      });
      
      // Add summary section - matching ShiftsPageClean format
      csvData.push(['']); // Empty line for separation
      csvData.push(['Summary', '', '', '', '', '', '', '', '', '', '']);
      csvData.push([t.totalRegularHours, formatHoursAndMinutes(summaryStats.totalRegularHours), '', '', '', '', '', '', '', '', '']);
      csvData.push([t.totalOvertimeHours, formatHoursAndMinutes(summaryStats.totalOvertimeHours) + ' (After covering delay)', '', '', '', '', '', '', '', '', '']);
      csvData.push([t.delayToFinish, formatDelayHoursAndMinutes(summaryStats.totalDelayMinutes), '', '', '', '', '', '', '', '', '']);
      csvData.push([t.totalWorkingDays, summaryStats.totalWorkingDays + ' days', '', '', '', '', '', '', '', '', '']);
      csvData.push([t.averageHoursPerDay, formatHoursAndMinutes(summaryStats.averageHoursPerDay), '', '', '', '', '', '', '', '', '']);
      
      // Add Smart Offsetting Summary
      csvData.push(['']);
      csvData.push(['Smart Offsetting Summary', '', '', '', '', '', '', '', '', '', '']);
      csvData.push(['Raw Overtime', formatHoursAndMinutes(summaryStats.smartOffsetting.rawOvertime), '', '', '', '', '', '', '', '', '']);
      csvData.push(['Raw Delay', formatHoursAndMinutes(summaryStats.smartOffsetting.rawDelay), '', '', '', '', '', '', '', '', '']);
      csvData.push(['Net Result', summaryStats.totalOvertimeHours > 0 
        ? `+${formatHoursAndMinutes(summaryStats.totalOvertimeHours)} OT`
        : `${formatHoursAndMinutes(summaryStats.delayToFinish)} Delay`, '', '', '', '', '', '', '', '', '']);
      csvData.push(['Smart Logic', `${formatHoursAndMinutes(summaryStats.smartOffsetting.rawOvertime)} Overtime - ${formatHoursAndMinutes(summaryStats.smartOffsetting.rawDelay)} Delay = ${
        summaryStats.totalOvertimeHours > 0 
          ? `+${formatHoursAndMinutes(summaryStats.totalOvertimeHours)} Net OT`
          : `${formatHoursAndMinutes(summaryStats.delayToFinish)} Net Delay`
      }`, '', '', '', '', '', '', '', '', '']);
      
      // Convert to CSV string
      const csvContent = csvData.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      
      // Add BOM for Arabic support
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvContent;
      
      console.log('CSV content length:', csvWithBOM.length);
      
      // Create and download file
      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `team_shifts_${format(selectedDate, 'yyyy-MM')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      URL.revokeObjectURL(url);
      
      toast.success('Team shifts exported successfully!');
      console.log('CSV export completed successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate summary statistics - matching ShiftsPageClean logic
  const summaryStats = useMemo(() => {
    // Exclude day-off records from calculations (matching ShiftsPageClean)
    const workingShifts = monthlyShifts.filter(shift => !shift.isDayOff);
    const totalRegularHours = workingShifts.reduce((sum, shift) => sum + shift.regularHours, 0);
    const actualOvertimeHours = workingShifts.reduce((sum, shift) => sum + shift.overtimeHours, 0);
    const totalDelayMinutes = workingShifts.reduce((sum, shift) => sum + shift.delayMinutes, 0);
    const totalBreakMinutes = workingShifts.reduce((sum, shift) => sum + (shift.totalBreakMinutes || 0), 0);
    const totalWorkingDays = workingShifts.filter(shift => shift.checkInTime).length;
    const averageHoursPerDay = totalWorkingDays > 0 ? (totalRegularHours + actualOvertimeHours) / totalWorkingDays : 0;

    // Calculate smart offsetting using the same logic as ShiftsPageClean
    const rawDelayToFinishHours = totalDelayMinutes / 60; // Convert to hours
    
    // Apply smart offsetting logic: Total Overtime Hours - Delay to Finish
    let finalOvertimeHours = 0;
    let finalDelayToFinishHours = 0;
    
    if (actualOvertimeHours > rawDelayToFinishHours) {
      // If Overtime > Delay: Show remaining overtime, delay becomes "All Clear"
      finalOvertimeHours = actualOvertimeHours - rawDelayToFinishHours;
      finalDelayToFinishHours = 0; // All Clear
    } else {
      // If Delay >= Overtime: Show remaining delay, overtime becomes 0
      finalDelayToFinishHours = rawDelayToFinishHours - actualOvertimeHours;
      finalOvertimeHours = 0;
    }

    // Smart offsetting metadata
    const hasSmartOffsetting = actualOvertimeHours > 0 && rawDelayToFinishHours > 0;
    const offsettingType = actualOvertimeHours > rawDelayToFinishHours ? 'overtime_covers_delay' : 'delay_covers_overtime';

    console.log('📊 Team Summary with Smart Offsetting Logic:', {
      totalDelayMinutes,
      rawDelayToFinishHours: rawDelayToFinishHours.toFixed(2),
      actualOvertimeHours: actualOvertimeHours.toFixed(2),
      finalOvertimeHours: finalOvertimeHours.toFixed(2),
      finalDelayToFinishHours: finalDelayToFinishHours.toFixed(2),
      hasSmartOffsetting,
      offsettingType
    });

    return {
      totalRegularHours,
      totalOvertimeHours: finalOvertimeHours, // Smart overtime after offsetting delay
      actualOvertimeHours, // Keep the actual overtime for internal calculations
      totalDelayMinutes,
      totalBreakMinutes,
      totalWorkingDays,
      averageHoursPerDay,
      delayToFinish: finalDelayToFinishHours, // Smart delay after offsetting overtime
      // Smart offsetting metadata
      rawDelayHours: rawDelayToFinishHours,
      hasSmartOffsetting,
      offsettingType,
      smartOffsetting: {
        rawOvertime: actualOvertimeHours,
        rawDelay: rawDelayToFinishHours,
        netResult: finalOvertimeHours
      }
    };
  }, [monthlyShifts]);

  // Get all days in the selected month
  const monthDays = useMemo(() => {
    const startDate = startOfMonth(selectedDate);
    const endDate = endOfMonth(selectedDate);
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [selectedDate]);

  // Filter shifts by selected employee
  const filteredShifts = useMemo(() => {
    if (selectedEmployee === 'all') {
      return monthlyShifts;
    }
    return monthlyShifts.filter(shift => shift.userId === selectedEmployee);
  }, [monthlyShifts, selectedEmployee]);

      if (!user || (user.role !== 'content_creative_manager' && user.role !== 'customer_retention_manager')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 mt-2">This page is only accessible to Content & Creative Managers and Customer Retention Managers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <div className="border-b border-border/50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 text-white rounded-lg">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                  {t.teamShifts}
                </h1>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                {user?.role === 'customer_retention_manager' 
                  ? 'Customer Retention Department Shift Management'
                  : 'Content & Creative Department Shift Management'
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleExportCSV} variant="outline" disabled={isExporting}>
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </>
                )}
              </Button>
              <Button onClick={handleRefresh} disabled={isRefreshing}>
                {isRefreshing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                {isRefreshing ? t.refreshing : t.refresh}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label>{t.month}:</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-48 justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(selectedDate, 'MMMM yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="flex items-center gap-2">
                  <Label>{t.employee}:</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder={t.employee} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.allEmployees}</SelectItem>
                      {teamEmployees.map(employee => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name} ({employee.position})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

                 {/* Summary Cards */}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 mb-6">
           <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 w-full">
             <CardContent className="p-3 sm:p-4 md:p-5">
               <div className="text-center space-y-2 sm:space-y-3">
                 <div className="flex justify-center">
                   <div className="p-2 sm:p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                     <Clock className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-blue-600 dark:text-blue-400" />
                   </div>
                 </div>
                 <p className="text-xs sm:text-sm md:text-base font-medium text-muted-foreground leading-tight">{t.totalRegularHours}</p>
                 <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground">{formatHoursAndMinutes(summaryStats.totalRegularHours)}</div>
               </div>
             </CardContent>
           </Card>

           <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 w-full">
             <CardContent className="p-3 sm:p-4 md:p-5">
               <div className="text-center space-y-2 sm:space-y-3">
                 <div className="flex justify-center">
                   <div className="p-2 sm:p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                     <Clock className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-yellow-600 dark:text-yellow-400" />
                   </div>
                 </div>
                 <p className="text-xs sm:text-sm md:text-base font-medium text-muted-foreground leading-tight">{t.breakTime}</p>
                 <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground">{formatBreakTime(summaryStats.totalBreakMinutes)}</div>
               </div>
             </CardContent>
           </Card>

           <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 w-full">
             <CardContent className="p-3 sm:p-4 md:p-5">
               <div className="text-center space-y-2 sm:space-y-3">
                 <div className="flex justify-center">
                   <div className={`p-2 sm:p-3 rounded-full ${summaryStats.totalOvertimeHours > 0 ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-gray-100 dark:bg-gray-900/30'}`}>
                     <TrendingUp className={`h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 ${summaryStats.totalOvertimeHours > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`} />
                   </div>
                 </div>
                 <div className="flex items-center justify-center gap-2">
                   <p className="text-xs sm:text-sm md:text-base font-medium text-muted-foreground leading-tight">{t.totalOvertimeHours}</p>
                   <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">✨ SMART</span>
                 </div>
                 <div className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold ${summaryStats.totalOvertimeHours > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                   {summaryStats.totalOvertimeHours > 0 ? formatHoursAndMinutes(summaryStats.totalOvertimeHours) : '0h 0min'}
                 </div>
                 {summaryStats.hasSmartOffsetting && summaryStats.offsettingType === 'overtime_covers_delay' && (
                   <p className="text-xs text-green-600 font-medium">After covering delay</p>
                 )}
               </div>
             </CardContent>
           </Card>

           <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 w-full">
             <CardContent className="p-3 sm:p-4 md:p-5">
               <div className="text-center space-y-2 sm:space-y-3">
                 <div className="flex justify-center">
                   <div className={`p-2 sm:p-3 rounded-full ${summaryStats.totalDelayMinutes > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                     <Clock className={`h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 ${summaryStats.totalDelayMinutes > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
                   </div>
                 </div>
                 <div className="flex items-center justify-center gap-2">
                   <p className="text-xs sm:text-sm md:text-base font-medium text-muted-foreground leading-tight">{t.delayToFinish}</p>
                   <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">✨ SMART</span>
                 </div>
                 <div className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold ${summaryStats.delayToFinish > 0 ? 'text-red-600' : 'text-green-600'}`}>
                   {summaryStats.delayToFinish > 0 ? formatHoursAndMinutes(summaryStats.delayToFinish) : 'All Clear'}
                 </div>
                 {summaryStats.hasSmartOffsetting && summaryStats.offsettingType === 'delay_covers_overtime' && (
                   <p className="text-xs text-red-600 font-medium">After overtime offset</p>
                 )}
               </div>
             </CardContent>
           </Card>

         </div>

         {/* Team Statistics */}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
           <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 w-full">
             <CardContent className="p-3 sm:p-4 md:p-5">
               <div className="text-center space-y-2 sm:space-y-3">
                 <div className="flex justify-center">
                   <div className="p-2 sm:p-3 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                     <Users className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-indigo-600 dark:text-indigo-400" />
                   </div>
                 </div>
                 <p className="text-xs sm:text-sm md:text-base font-medium text-muted-foreground leading-tight">Team Members</p>
                 <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-indigo-600">{teamEmployees.length}</div>
                 <p className="text-xs sm:text-sm text-muted-foreground">active employees</p>
               </div>
             </CardContent>
           </Card>

           <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 w-full">
             <CardContent className="p-3 sm:p-4 md:p-5">
               <div className="text-center space-y-2 sm:space-y-3">
                 <div className="flex justify-center">
                   <div className="p-2 sm:p-3 rounded-full bg-cyan-100 dark:bg-cyan-900/30">
                     <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-cyan-600 dark:text-cyan-400" />
                   </div>
                 </div>
                 <p className="text-xs sm:text-sm md:text-base font-medium text-muted-foreground leading-tight">Total Shifts</p>
                 <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-cyan-600">{filteredShifts.length}</div>
                 <p className="text-xs sm:text-sm text-muted-foreground">this month</p>
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
                 <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-green-600">{summaryStats.totalWorkingDays}</div>
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
                 <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-purple-600">{formatHoursAndMinutes(summaryStats.averageHoursPerDay)}</div>
               </div>
             </CardContent>
           </Card>
         </div>

                 {/* Fix Calculator Button */}
        {user?.role && ['admin', 'customer_retention_manager', 'content_creative_manager'].includes(user.role) && (
          <Card className="border-2 border-blue-200 bg-blue-50 dark:bg-blue-900/20 shadow-sm w-full mb-6">
            <CardContent className="p-4">
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    Fix Calculator
                  </h3>
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Recalculate all shifts based on their assigned shift durations from the database
                </p>
                <Button 
                  onClick={fixCalculator} 
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Fixing Calculations...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Fix Calculator
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Smart Offsetting Summary */}
        <Card className="border-2 border-green-200 bg-green-50 dark:bg-green-900/20 shadow-sm w-full mb-6">
           <CardContent className="p-4">
             <div className="text-center space-y-3">
               <div className="flex items-center justify-center gap-2">
                 <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                   <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                 </div>
                 <h3 className="text-lg font-bold text-green-700 dark:text-green-300">
                   Smart Offsetting Summary
                   {selectedEmployee !== 'all' && (
                     <span className="text-sm font-normal text-muted-foreground ml-2">
                       - {teamEmployees.find(emp => emp.id === selectedEmployee)?.name || 'Selected Employee'}
                     </span>
                   )}
                 </h3>
               </div>
               
               <div className="bg-white dark:bg-gray-800 rounded-lg p-3 space-y-2">
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                   <div className="text-center">
                     <p className="text-muted-foreground font-medium">Raw Overtime</p>
                     <p className="font-bold text-orange-600">{formatHoursAndMinutes(summaryStats.smartOffsetting.rawOvertime)}</p>
                   </div>
                   <div className="text-center">
                     <p className="text-muted-foreground font-medium">Raw Delay</p>
                     <p className="font-bold text-red-600">{formatHoursAndMinutes(summaryStats.smartOffsetting.rawDelay)}</p>
                   </div>
                   <div className="text-center">
                     <p className="text-muted-foreground font-medium">Net Result</p>
                     <p className={`font-bold ${summaryStats.totalOvertimeHours > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                       {summaryStats.totalOvertimeHours > 0 
                         ? `+${formatHoursAndMinutes(summaryStats.totalOvertimeHours)} OT`
                         : `${formatHoursAndMinutes(summaryStats.delayToFinish)} Delay`
                       }
                     </p>
                   </div>
                 </div>
                 
                 <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                   <span className="font-medium">Smart Logic:</span> {formatHoursAndMinutes(summaryStats.smartOffsetting.rawOvertime)} Overtime - {formatHoursAndMinutes(summaryStats.smartOffsetting.rawDelay)} Delay = {
                     summaryStats.totalOvertimeHours > 0 
                       ? `+${formatHoursAndMinutes(summaryStats.totalOvertimeHours)} Net OT`
                       : `${formatHoursAndMinutes(summaryStats.delayToFinish)} Net Delay`
                   }
                 </div>
               </div>
               
               {selectedEmployee === 'all' && (
                 <div className="flex items-center gap-2 text-blue-600 text-sm">
                   <div className="w-4 h-4">ℹ️</div>
                   <span>This shows combined totals. Select individual employees to see their smart offsetting calculations.</span>
                 </div>
               )}
             </div>
           </CardContent>
         </Card>

        {/* Shifts Table */}
        <Card>
                      <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t.monthlyShifts}</CardTitle>
                {user?.role && ['admin', 'customer_retention_manager', 'content_creative_manager'].includes(user.role) && (
                  <div className="text-sm text-muted-foreground">
                    💡 Click on shift dropdowns to change assignments and auto-recalculate hours
                  </div>
                )}
              </div>
            </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Clock className="w-6 h-6 animate-spin mr-2" />
                <span>{t.loading}</span>
              </div>
            ) : filteredShifts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t.noData}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.date}</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>{t.shift}</TableHead>
                      <TableHead>{t.checkIn}</TableHead>
                      <TableHead>{t.checkOut}</TableHead>
                      <TableHead>{t.delay}</TableHead>
                      <TableHead>{t.breakTime}</TableHead>
                      <TableHead>{t.regularHours}</TableHead>
                      <TableHead>{t.overtimeHours}</TableHead>
                      <TableHead>{t.delayTime}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShifts.map((shift) => (
                      <TableRow key={shift.id}>
                        <TableCell className="font-medium">
                          {format(shift.workDate, 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{shift.userName}</div>
                            <div className="text-sm text-muted-foreground">
                              {teamEmployees.find(emp => emp.id === shift.userId)?.position}
                            </div>
                          </div>
                        </TableCell>
                                                                           <TableCell>
                            <div className="flex items-center gap-2">
                              <Select 
                                value={shift.isDayOff ? 'dayoff' : (shift.shiftId || 'none')} 
                                onValueChange={(value) => {
                                  console.log('🎯 Dropdown changed:', { 
                                    userId: shift.userId, 
                                    workDate: shift.workDate, 
                                    oldValue: shift.shiftId || 'none', 
                                    newValue: value 
                                  });
                                  handleShiftChange(shift.userId, shift.workDate, value);
                                }} 
                                disabled={updatingShifts.has(`${shift.userId}-${format(shift.workDate, 'yyyy-MM-dd')}`)}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Select Shift" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No Shift</SelectItem>
                                  <SelectItem value="dayoff">Day Off</SelectItem>
                                  {shifts.map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                      {s.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {updatingShifts.has(`${shift.userId}-${format(shift.workDate, 'yyyy-MM-dd')}`) && (
                                <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                              )}
                            </div>
                          </TableCell>
                        <TableCell>
                          {shift.checkInTime ? format(shift.checkInTime, 'HH:mm') : '-'}
                        </TableCell>
                        <TableCell>
                          {shift.checkOutTime ? format(shift.checkOutTime, 'HH:mm') : '-'}
                        </TableCell>
                        <TableCell>
                          {formatDelayHoursAndMinutes(shift.delayMinutes)}
                        </TableCell>
                        <TableCell>
                          {formatBreakTime(shift.totalBreakMinutes || 0)}
                        </TableCell>
                        <TableCell>
                          {formatHoursAndMinutes(shift.regularHours)}
                        </TableCell>
                        <TableCell>
                          {formatHoursAndMinutes(shift.overtimeHours)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              calculateDelayToFinish(
                                shift.totalBreakMinutes || 0,
                                shift.delayMinutes,
                                shift.regularHours,
                                shift.overtimeHours,
                                shift.shiftName,
                                shift.shiftStartTime,
                                shift.shiftEndTime,
                                shift.allTimeOvertime,
                                shift.isDayOff
                              ) === 'All Clear' ? 'default' : 'destructive'
                            }
                          >
                            {calculateDelayToFinish(
                              shift.totalBreakMinutes || 0,
                              shift.delayMinutes,
                              shift.regularHours,
                              shift.overtimeHours,
                              shift.shiftName,
                              shift.shiftStartTime,
                              shift.shiftEndTime,
                              shift.allTimeOvertime,
                              shift.isDayOff
                            )}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamShiftsPage;
