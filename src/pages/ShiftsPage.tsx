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
import { CalendarIcon, Clock, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';
import CustomerServiceSchedule from '@/components/CustomerServiceSchedule';

const ShiftsPage = () => {
  const { user } = useAuth();
  const [monthlyShifts, setMonthlyShifts] = useState<MonthlyShift[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [customerServiceEmployees, setCustomerServiceEmployees] = useState<User[]>([]);
  const [weeklyAssignments, setWeeklyAssignments] = useState<{[key: string]: {[key: string]: string}}>({});
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    // Always start with current date, not a future date
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
      shifts: "Shifts Management",
      monthlyShifts: "Monthly Shifts",
      manageShifts: "Manage employee shifts and track overtime",
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
      hours: "hours"
    },
    ar: {
      shifts: "إدارة المناوبات",
      monthlyShifts: "المناوبات الشهرية",
      manageShifts: "إدارة مناوبات الموظفين وتتبع العمل الإضافي",
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
      hours: "ساعات"
    }
  };

  const hasAccess = user?.position === 'Customer Service' || user?.role === 'admin';

  const loadShifts = async () => {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('position', 'Customer Service')
        .eq('is_active', true)
        .order('start_time');

      if (error) throw error;

      const formattedShifts: Shift[] = data.map(item => ({
        id: item.id,
        name: item.name,
        startTime: item.start_time,
        endTime: item.end_time,
        position: item.position as 'Customer Service',
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
        .eq('position', 'Customer Service')
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
      console.error('Error loading Customer Service employees:', error);
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

  // Add useEffect to reload data when selectedDate or selectedEmployee changes
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
        // If user is not admin, only show their own shifts
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
        return 'bg-blue-100 text-blue-800';
      case 'Night Shift':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  if (!user || (user.role !== 'admin' && user.position !== 'Customer Service')) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700">Access Denied</h2>
          <p className="text-gray-500 mt-2">This page is only available for Customer Service employees and administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold mb-2">{t.shifts}</h1>
        <p className="text-muted-foreground">{t.manageShifts}</p>
      </div>

      {/* Customer Service Schedule - Show their personal schedule first */}
      {user.position === 'Customer Service' && <CustomerServiceSchedule />}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t.monthlyShifts}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                console.log('Manual refresh triggered');
                loadMonthlyShifts();
              }}
              disabled={isLoading}
            >
              🔄 Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">{t.month}</label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, 'MMMM yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          console.log('Date selected:', date.toISOString());
                          setSelectedDate(date);
                        }
                      }}
                      disabled={(date) => {
                        // Disable future months beyond current month
                        const today = new Date();
                        const endOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                        return date > endOfCurrentMonth;
                      }}
                      defaultMonth={new Date()} // Always start with current month
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    console.log('Reset to current month:', now.toISOString());
                    setSelectedDate(now);
                  }}
                  title="Go to current month"
                  className={startOfMonth(selectedDate) > startOfMonth(new Date()) ? "bg-blue-50 border-blue-300 text-blue-700" : ""}
                >
                  📅 Current Month
                </Button>
              </div>
            </div>

            {user.role === 'admin' && (
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">{t.employee}</label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allEmployees}</SelectItem>
                    {customerServiceEmployees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.totalRegularHours}</p>
                    <p className="text-2xl font-bold">{summary.totalRegular.toFixed(1)}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.totalOvertimeHours}</p>
                    <p className="text-2xl font-bold text-orange-600">{summary.totalOvertime.toFixed(1)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.totalWorkingDays}</p>
                    <p className="text-2xl font-bold">{summary.workingDays}</p>
                  </div>
                  <Users className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.averageHoursPerDay}</p>
                    <p className="text-2xl font-bold">{summary.averagePerDay.toFixed(1)}</p>
                  </div>
                  <Clock className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Shifts Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.date}</TableHead>
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
                      {t.loading}
                    </TableCell>
                  </TableRow>
                ) : monthlyShifts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={user.role === 'admin' ? 8 : 7} className="text-center py-8">
                      <div className="space-y-2">
                        {/* Show clean message for current month with no data */}
                        {startOfMonth(selectedDate).getTime() === startOfMonth(new Date()).getTime() ? (
                          <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                            💡 No shift data for this month yet. Data will appear after Customer Service employees check in/out.
                          </p>
                        ) : startOfMonth(selectedDate) > startOfMonth(new Date()) ? (
                          /* Future month message */
                          <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                            ⚠️ You've selected a future month. Shift data is only available for months when employees have checked in/out.
                          </p>
                        ) : (
                          /* Past month with no data */
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
                      <TableCell>{format(shift.workDate, 'dd/MM/yyyy')}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default ShiftsPage; 