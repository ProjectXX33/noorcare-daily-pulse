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
  
  // Calculate total delay time (initial delay + break time)
  const totalDelayMinutes = delayMinutes + breakMinutes;
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
  const [language] = useState<string>('en');
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Load team employees (Content & Creative Department)
  const loadTeamEmployees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or('team.eq.Content & Creative Department,position.in.(Copy Writing,Designer,Media Buyer)')
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

      setTeamEmployees(employees);
    } catch (error) {
      console.error('Error loading team employees:', error);
      toast.error('Failed to load team employees');
    }
  }, []);

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

      const formattedShifts: MonthlyShift[] = data.map(item => ({
        id: item.id,
        userId: item.user_id,
        workDate: new Date(item.work_date),
        shiftId: item.shift_id,
        checkInTime: item.check_in_time ? new Date(item.check_in_time) : null,
        checkOutTime: item.check_out_time ? new Date(item.check_out_time) : null,
        delayMinutes: item.delay_minutes || 0,
        breakTimeMinutes: item.break_time_minutes || 0,
        regularHours: item.regular_hours || 0,
        overtimeHours: item.overtime_hours || 0,
        isDayOff: item.is_day_off || false,
        assignedBy: item.assigned_by,
        employeeName: item.users?.name || 'Unknown',
        shiftName: item.shifts?.name || 'No Shift',
        shiftStartTime: item.shifts?.start_time,
        shiftEndTime: item.shifts?.end_time,
        allTimeOvertime: item.shifts?.all_time_overtime || false
      }));

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
    if (user?.role === 'content_creative_manager') {
      loadShifts();
      loadTeamEmployees();
    }
  }, [user, loadShifts, loadTeamEmployees]);

  // Load monthly shifts when dependencies change
  useEffect(() => {
    if (teamEmployees.length > 0) {
      loadMonthlyShifts();
    }
  }, [selectedDate, selectedEmployee, teamEmployees, loadMonthlyShifts]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadShifts(),
        loadTeamEmployees(),
        loadMonthlyShifts(false)
      ]);
      toast.success('Team shifts refreshed successfully');
    } catch (error) {
      console.error('Error refreshing team shifts:', error);
      toast.error('Failed to refresh team shifts');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportCSV = () => {
    try {
      // Prepare CSV data with summary
      const csvData = [];
      
      // Add summary section
      csvData.push(['TEAM SHIFTS SUMMARY REPORT']);
      csvData.push([`Month: ${format(selectedDate, 'MMMM yyyy')}`]);
      csvData.push([`Generated: ${new Date().toLocaleString()}`]);
      csvData.push([]);
      
      // Summary statistics
      csvData.push(['SUMMARY STATISTICS']);
      csvData.push(['Total Regular Hours', formatHoursAndMinutes(summaryStats.totalRegularHours)]);
      csvData.push(['Total Overtime Hours', formatHoursAndMinutes(summaryStats.totalOvertimeHours)]);
      csvData.push(['Total Delay Time', formatDelayHoursAndMinutes(summaryStats.totalDelayMinutes)]);
      csvData.push(['Total Break Time', formatBreakTime(summaryStats.totalBreakMinutes)]);
      csvData.push(['Total Working Days', summaryStats.totalWorkingDays.toString()]);
      csvData.push(['Average Hours Per Day', formatHoursAndMinutes(summaryStats.averageHoursPerDay)]);
      csvData.push(['Smart Offsetting Net Result', formatHoursAndMinutes(summaryStats.smartOffsetting.netResult)]);
      csvData.push([]);
      
      // Add detailed shifts data
      csvData.push(['DETAILED SHIFTS DATA']);
      csvData.push([
        'Employee Name',
        'Position', 
        'Date',
        'Shift Name',
        'Regular Hours',
        'Overtime Hours',
        'Delay Time',
        'Break Time',
        'Status',
        'Net Hours'
      ]);
      
      // Add shift data
      filteredShifts.forEach(shift => {
        const employee = teamEmployees.find(emp => emp.id === shift.userId);
        const netHours = calculateNetHours(shift.regularHours + shift.overtimeHours, shift.delayMinutes);
        
        csvData.push([
          employee?.name || 'Unknown',
          employee?.position || 'Unknown',
          format(new Date(shift.workDate), 'yyyy-MM-dd'),
          shift.shiftName || 'No Shift',
          formatHoursAndMinutes(shift.regularHours * 60),
          formatHoursAndMinutes(shift.overtimeHours * 60),
          formatDelayHoursAndMinutes(shift.delayMinutes),
          formatBreakTime(shift.breakTimeMinutes),
          shift.status || 'Unknown',
          formatHoursAndMinutes(netHours * 60)
        ]);
      });
      
      // Convert to CSV string
      const csvContent = csvData.map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');
      
      // Add BOM for Arabic support
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvContent;
      
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
      
      toast.success('Team shifts exported successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    }
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const workedShifts = monthlyShifts.filter(shift => 
      shift.regularHours > 0 || shift.overtimeHours > 0
    );

    const totalRegularHours = workedShifts.reduce((sum, shift) => sum + shift.regularHours, 0);
    const totalOvertimeHours = workedShifts.reduce((sum, shift) => sum + shift.overtimeHours, 0);
    const totalDelayMinutes = workedShifts.reduce((sum, shift) => sum + shift.delayMinutes, 0);
    const totalBreakMinutes = workedShifts.reduce((sum, shift) => sum + shift.breakTimeMinutes, 0);
    const totalWorkingDays = workedShifts.length;
    const averageHoursPerDay = totalWorkingDays > 0 ? (totalRegularHours + totalOvertimeHours) / totalWorkingDays : 0;

    // Calculate smart offsetting
    const smartOffsetting = calculateSmartOffsetting(monthlyShifts);

    return {
      totalRegularHours,
      totalOvertimeHours,
      totalDelayMinutes,
      totalBreakMinutes,
      totalWorkingDays,
      averageHoursPerDay,
      smartOffsetting
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

  if (!user || user.role !== 'content_creative_manager') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 mt-2">This page is only accessible to Content & Creative Managers.</p>
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
                Content & Creative Department Shift Management
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleExportCSV} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
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
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
           <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">{t.totalRegularHours}</CardTitle>
               <Clock className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">{formatHoursAndMinutes(summaryStats.totalRegularHours)}</div>
               <p className="text-xs text-muted-foreground">
                 Regular working hours
               </p>
             </CardContent>
           </Card>

           <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">{t.totalOvertimeHours}</CardTitle>
               <div className="flex items-center gap-1">
                 <TrendingUp className="h-4 w-4 text-muted-foreground" />
                 <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">SMART</Badge>
               </div>
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold text-orange-600">{formatHoursAndMinutes(summaryStats.smartOffsetting.netResult)}</div>
               <p className="text-xs text-green-600">
                 After covering delay
               </p>
             </CardContent>
           </Card>

           <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">{t.delayToFinish}</CardTitle>
               <div className="flex items-center gap-1">
                 <Clock className="h-4 w-4 text-muted-foreground" />
                 <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">SMART</Badge>
               </div>
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold text-green-600">All Clear</div>
               <p className="text-xs text-muted-foreground">
                 Smart offsetting applied
               </p>
             </CardContent>
           </Card>

           <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">{t.totalWorkingDays}</CardTitle>
               <Users className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">{summaryStats.totalWorkingDays}</div>
               <p className="text-xs text-muted-foreground">
                 days
               </p>
             </CardContent>
           </Card>

           <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">{t.averageHoursPerDay}</CardTitle>
               <TrendingUp className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold text-purple-600">{formatHoursAndMinutes(summaryStats.averageHoursPerDay)}</div>
               <p className="text-xs text-muted-foreground">
                 Average per day
               </p>
             </CardContent>
           </Card>
         </div>

         {/* Smart Offsetting Summary */}
         <Card className="mb-6 border-green-200 bg-green-50/50">
           <CardHeader>
             <CardTitle className="flex items-center gap-2 text-green-800">
               <TrendingUp className="h-5 w-5" />
               Smart Offsetting Summary
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="grid grid-cols-3 gap-4">
               <div className="text-center">
                 <div className="text-lg font-semibold text-orange-600">
                   {formatHoursAndMinutes(summaryStats.smartOffsetting.rawOvertime)}
                 </div>
                 <div className="text-sm text-muted-foreground">Raw Overtime</div>
               </div>
               <div className="text-center">
                 <div className="text-lg font-semibold text-orange-600">
                   {formatHoursAndMinutes(summaryStats.smartOffsetting.rawDelay)}
                 </div>
                 <div className="text-sm text-muted-foreground">Raw Delay</div>
               </div>
               <div className="text-center">
                 <div className="text-lg font-semibold text-green-600">
                   +{formatHoursAndMinutes(summaryStats.smartOffsetting.netResult)} OT
                 </div>
                 <div className="text-sm text-muted-foreground">Net Result</div>
               </div>
             </div>
             <div className="mt-4 p-3 bg-white rounded-lg border">
               <div className="text-sm text-muted-foreground">
                 <strong>Smart Logic:</strong> {formatHoursAndMinutes(summaryStats.smartOffsetting.rawOvertime)} Overtime - {formatHoursAndMinutes(summaryStats.smartOffsetting.rawDelay)} Delay = {formatHoursAndMinutes(summaryStats.smartOffsetting.netResult)} Net Overtime
               </div>
             </div>
             <div className="mt-3 flex items-center gap-2 text-blue-600 text-sm">
               <div className="w-4 h-4">ℹ️</div>
               <span>This shows combined totals. Select individual employees to see their smart offsetting calculations.</span>
             </div>
           </CardContent>
         </Card>

        {/* Shifts Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t.monthlyShifts}</CardTitle>
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
                            <div className="font-medium">{shift.employeeName}</div>
                            <div className="text-sm text-muted-foreground">
                              {teamEmployees.find(emp => emp.id === shift.userId)?.position}
                            </div>
                          </div>
                        </TableCell>
                                                 <TableCell>
                           <Badge variant={shift.isDayOff ? "secondary" : "default"}>
                             {shift.isDayOff ? 'Day Off' : shift.shiftName}
                           </Badge>
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
                          {formatBreakTime(shift.breakTimeMinutes)}
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
                                shift.breakTimeMinutes,
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
                              shift.breakTimeMinutes,
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
