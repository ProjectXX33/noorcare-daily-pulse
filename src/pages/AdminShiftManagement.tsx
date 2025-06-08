import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { User, Shift } from '@/types';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { 
  Calendar,
  Clock, 
  TrendingUp, 
  Users, 
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Coffee,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import EditablePerformanceDashboard from '@/components/EditablePerformanceDashboard';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ShiftAssignment {
  id: string;
  employeeId: string;
  workDate: Date;
  assignedShiftId: string | null;
  isDayOff: boolean;
  assignedBy: string;
  employeeName?: string;
  shiftName?: string;
}

const AdminShiftManagement = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => {
    const today = new Date();
    return startOfWeek(today, { weekStartsOn: 1 }); // Monday
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language] = useState('en');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');

  const translations = {
    en: {
      shiftManagement: "Shift Management & Performance",
      assignShifts: "Assign Shifts",
      performance: "Performance Dashboard",
      weekOf: "Week of",
      employee: "Employee",
      allEmployees: "All Employees",
      monday: "Mon", tuesday: "Tue", wednesday: "Wed", 
      thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun",
      dayShift: "Day Shift", nightShift: "Night Shift", dayOff: "Day Off",
      save: "Save", cancel: "Cancel", loading: "Loading...",
      assignmentsUpdated: "Shift assignments updated successfully!",
      performanceScore: "Performance Score",
      delayHours: "Delay Hours",
      overtimeHours: "Overtime Hours",
      punctuality: "Punctuality",
      workingDays: "Working Days",
      excellent: "Excellent", good: "Good", needsImprovement: "Needs Improvement", poor: "Poor",
      bestPerformers: "🏆 Best Performers",
      mostDelays: "⏰ Most Delays",
      mostOvertime: "💪 Most Overtime",
      customerServiceDesigners: "(Customer Service & Designers)",
      assignShiftsTrackPerformance: "Assign shifts, track performance, and manage days off",
      weeklyShiftAssignments: "Weekly Shift Assignments",
      previousWeek: "Previous",
      nextWeek: "Next",
      notAssigned: "Not Assigned",
      viewEmployee: "View Employee"
    }
  };

  const t = translations[language as keyof typeof translations];

  useEffect(() => {
    console.log('AdminShiftManagement: Component mounted', { user });
    if (user?.role === 'admin') {
      loadData();
    }
  }, [user, selectedWeekStart]);

  // Add real-time subscription for shift assignments
  useEffect(() => {
    if (user?.role !== 'admin') return;

    const subscription = supabase
      .channel('shift_assignments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shift_assignments'
        },
        (payload) => {
          console.log('Real-time shift assignment change:', payload);
          // Reload assignments when changes occur from other sources
          loadAssignments();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    console.log('AdminShiftManagement: Loading data...');
    
    try {
      await Promise.all([
        loadEmployees(),
        loadShifts(),
        loadAssignments()
      ]);
      console.log('AdminShiftManagement: Data loaded successfully');
    } catch (error) {
      console.error('AdminShiftManagement: Error loading data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
      toast.error('Failed to load data. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      console.log('Loading employees...');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('position', ['Customer Service', 'Designer'])
        .eq('role', 'employee')
        .order('name');

      if (error) throw error;
      console.log('Employees loaded:', data?.length || 0);
      setEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
      throw error;
    }
  };

  const loadShifts = async () => {
    try {
      console.log('Loading shifts...');
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('is_active', true)
        .order('start_time');

      if (error) throw error;
      console.log('Shifts loaded:', data?.length || 0);
      setShifts(data || []);
    } catch (error) {
      console.error('Error loading shifts:', error);
      throw error;
    }
  };

  const loadAssignments = async () => {
    try {
      console.log('Loading assignments...');
      const weekEnd = addDays(selectedWeekStart, 6);
      
      const { data, error } = await supabase
        .from('shift_assignments')
        .select(`
          *,
          users:employee_id(name),
          shifts:assigned_shift_id(name)
        `)
        .gte('work_date', format(selectedWeekStart, 'yyyy-MM-dd'))
        .lte('work_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('work_date');

      if (error) throw error;

      const formattedAssignments: ShiftAssignment[] = (data || []).map(item => ({
        id: item.id,
        employeeId: item.employee_id,
        workDate: new Date(item.work_date),
        assignedShiftId: item.assigned_shift_id,
        isDayOff: item.is_day_off,
        assignedBy: item.assigned_by,
        employeeName: item.users?.name,
        shiftName: item.shifts?.name
      }));

      console.log('Assignments loaded:', formattedAssignments.length);
      setAssignments(formattedAssignments);
    } catch (error) {
      console.error('Error loading assignments:', error);
      throw error;
    }
  };

  const updateAssignment = async (employeeId: string, date: Date, shiftId: string | null, isDayOff: boolean) => {
    try {
      const workDate = format(date, 'yyyy-MM-dd');
      
      console.log('Updating assignment:', {
        employeeId,
        workDate,
        shiftId,
        isDayOff,
        adminId: user?.id
      });

      // Immediately update UI state for responsive feedback
      const selectedShift = shiftId ? shifts.find(s => s.id === shiftId) : null;
      const shiftName = selectedShift ? selectedShift.name : undefined;
      const employee = employees.find(e => e.id === employeeId);

      setAssignments(prev => {
        const updated = [...prev];
        const index = updated.findIndex(a => 
          a.employeeId === employeeId && isSameDay(a.workDate, date)
        );
        
        if (index >= 0) {
          updated[index] = {
            ...updated[index],
            assignedShiftId: isDayOff ? null : shiftId,
            isDayOff,
            shiftName: isDayOff ? undefined : shiftName
          };
        } else {
          updated.push({
            id: `temp-${Date.now()}`,
            employeeId,
            workDate: date,
            assignedShiftId: isDayOff ? null : shiftId,
            isDayOff,
            assignedBy: user?.id || '',
            employeeName: employee?.name,
            shiftName: isDayOff ? undefined : shiftName
          });
        }
        
        return updated;
      });
      
      const assignmentData = {
        employee_id: employeeId,
        work_date: workDate,
        assigned_shift_id: isDayOff ? null : shiftId,
        is_day_off: isDayOff,
        assigned_by: user?.id,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('shift_assignments')
        .upsert(assignmentData, {
          onConflict: 'employee_id,work_date'
        });

      if (error) throw error;

      console.log('Assignment updated successfully');
      
      // Show success feedback
      toast.success('Shift assignment updated!');
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error('Failed to update assignment');
    }
  };

  const saveAllAssignments = async () => {
    toast.success(t.assignmentsUpdated);
  };

  const getAssignmentForEmployeeAndDate = (employeeId: string, date: Date) => {
    return assignments.find(a => 
      a.employeeId === employeeId && 
      isSameDay(a.workDate, date)
    );
  };

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(selectedWeekStart, i));
    }
    return days;
  };

  const getShiftBadgeStyle = (shiftName: string | undefined, isDayOff: boolean) => {
    if (isDayOff) return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:border-green-800';
    switch (shiftName) {
      case 'Day Shift': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
      case 'Night Shift': return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const filteredEmployees = selectedEmployee === 'all' 
    ? employees 
    : employees.filter(emp => emp.id === selectedEmployee);

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-4 sm:p-6 text-center">
            <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-yellow-500 mx-auto mb-3 sm:mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">Access Denied</h2>
            <p className="text-sm sm:text-base text-gray-500">This page is only available for administrators.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">{t.loading}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-4 sm:p-6 text-center">
            <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-red-500 mx-auto mb-3 sm:mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">Error Loading Page</h2>
            <p className="text-sm sm:text-base text-gray-500 mb-4">{error}</p>
            <Button onClick={() => loadData()} className="min-h-[44px]">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const weekDays = getWeekDays();
  const dayNames = [t.monday, t.tuesday, t.wednesday, t.thursday, t.friday, t.saturday, t.sunday];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 w-full max-w-full overflow-x-hidden">
      {/* Enhanced mobile-optimized header - Non-sticky, responsive layout */}
      <div className="border-b border-border/50 bg-background/98 w-full">
        <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6 w-full max-w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
            <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">{t.shiftManagement}</h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                {t.assignShiftsTrackPerformance} {t.customerServiceDesigners}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 space-y-6 sm:space-y-8 md:space-y-10 w-full max-w-full overflow-x-hidden">
        {/* Mobile-optimized tabs */}
        <Tabs defaultValue="assignments" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto p-1">
            <TabsTrigger value="assignments" className="text-xs sm:text-sm py-2 px-3 min-h-[44px] sm:min-h-auto">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {t.assignShifts}
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-xs sm:text-sm py-2 px-3 min-h-[44px] sm:min-h-auto">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {t.performance}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="space-y-4 mt-4 md:mt-6">
            {/* Mobile employee filter */}
            <div className="block sm:hidden">
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <label className="text-sm font-medium">{t.employee}</label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={t.allEmployees} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.allEmployees}</SelectItem>
                        {employees.map(employee => (
                          <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <span className="text-base sm:text-lg">{t.weeklyShiftAssignments}</span>
                  
                  {/* Week navigation */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedWeekStart(addDays(selectedWeekStart, -7))}
                      className="min-h-[44px] sm:min-h-auto px-2 sm:px-3"
                    >
                      <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline ml-1">{t.previousWeek}</span>
                    </Button>
                    <div className="text-xs sm:text-sm font-medium text-center min-w-[120px]">
                      {t.weekOf}<br className="sm:hidden" />
                      <span className="font-bold">{format(selectedWeekStart, 'MMM dd, yyyy')}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedWeekStart(addDays(selectedWeekStart, 7))}
                      className="min-h-[44px] sm:min-h-auto px-2 sm:px-3"
                    >
                      <span className="hidden sm:inline mr-1">{t.nextWeek}</span>
                      <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </CardTitle>
                
                {/* Desktop employee filter */}
                <div className="hidden sm:block">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium">{t.employee}:</label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger className="w-[200px] h-9">
                        <SelectValue placeholder={t.allEmployees} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.allEmployees}</SelectItem>
                        {employees.map(employee => (
                          <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Mobile cards view - Fixed mobile viewing */}
                <div className="block lg:hidden">
                  <div className="max-h-none overflow-y-auto">
                    <div className="space-y-3 p-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                      {filteredEmployees.map((employee) => (
                        <Card key={employee.id} className="border">
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm">{employee.name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {employee.position}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2">
                                {weekDays.slice(0, 4).map((day, index) => {
                                  const assignment = getAssignmentForEmployeeAndDate(employee.id, day);
                                  return (
                                    <div key={day.toISOString()} className="space-y-1">
                                      <div className="text-xs font-medium text-muted-foreground">
                                        {dayNames[index]} {format(day, 'dd')}
                                      </div>
                                      <Select
                                        value={
                                          assignment?.isDayOff ? 'day_off' : 
                                          assignment?.assignedShiftId || 'unassigned'
                                        }
                                        onValueChange={(value) => {
                                          if (value === 'day_off') {
                                            updateAssignment(employee.id, day, null, true);
                                          } else if (value === 'unassigned') {
                                            updateAssignment(employee.id, day, null, false);
                                          } else {
                                            updateAssignment(employee.id, day, value, false);
                                          }
                                        }}
                                      >
                                        <SelectTrigger className="h-9 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="unassigned">{t.notAssigned}</SelectItem>
                                          {shifts.map((shift) => (
                                            <SelectItem key={shift.id} value={shift.id}>
                                              {shift.name}
                                            </SelectItem>
                                          ))}
                                          <SelectItem value="day_off">
                                            <div className="flex items-center gap-1">
                                              <Coffee className="w-3 h-3" />
                                              {t.dayOff}
                                            </div>
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  );
                                })}
                              </div>
                              
                              <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                                {weekDays.slice(4).map((day, index) => {
                                  const assignment = getAssignmentForEmployeeAndDate(employee.id, day);
                                  return (
                                    <div key={day.toISOString()} className="space-y-1">
                                      <div className="text-xs font-medium text-muted-foreground">
                                        {dayNames[index + 4]} {format(day, 'dd')}
                                      </div>
                                      <Select
                                        value={
                                          assignment?.isDayOff ? 'day_off' : 
                                          assignment?.assignedShiftId || 'unassigned'
                                        }
                                        onValueChange={(value) => {
                                          if (value === 'day_off') {
                                            updateAssignment(employee.id, day, null, true);
                                          } else if (value === 'unassigned') {
                                            updateAssignment(employee.id, day, null, false);
                                          } else {
                                            updateAssignment(employee.id, day, value, false);
                                          }
                                        }}
                                      >
                                        <SelectTrigger className="h-9 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="unassigned">{t.notAssigned}</SelectItem>
                                          {shifts.map((shift) => (
                                            <SelectItem key={shift.id} value={shift.id}>
                                              {shift.name}
                                            </SelectItem>
                                          ))}
                                          <SelectItem value="day_off">
                                            <div className="flex items-center gap-1">
                                              <Coffee className="w-3 h-3" />
                                              {t.dayOff}
                                            </div>
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Desktop table view */}
                <div className="hidden lg:block p-4">
                  <div className="mobile-table-scroll">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-background z-10 w-40">{t.employee}</TableHead>
                          {weekDays.map((day, index) => (
                            <TableHead key={day.toISOString()} className="text-center min-w-32">
                              <div className="flex flex-col">
                                <span className="font-medium">{dayNames[index]}</span>
                                <span className="text-xs text-gray-500">{format(day, 'MMM dd')}</span>
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEmployees.map((employee) => (
                          <TableRow key={employee.id}>
                            <TableCell className="sticky left-0 bg-background z-10 font-medium">{employee.name}</TableCell>
                            {weekDays.map((day) => {
                              const assignment = getAssignmentForEmployeeAndDate(employee.id, day);
                              return (
                                <TableCell key={day.toISOString()} className="text-center">
                                  <Select
                                    value={
                                      assignment?.isDayOff ? 'day_off' : 
                                      assignment?.assignedShiftId || 'unassigned'
                                    }
                                    onValueChange={(value) => {
                                      if (value === 'day_off') {
                                        updateAssignment(employee.id, day, null, true);
                                      } else if (value === 'unassigned') {
                                        updateAssignment(employee.id, day, null, false);
                                      } else {
                                        updateAssignment(employee.id, day, value, false);
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unassigned">{t.notAssigned}</SelectItem>
                                      {shifts.map((shift) => (
                                        <SelectItem key={shift.id} value={shift.id}>
                                          {shift.name}
                                        </SelectItem>
                                      ))}
                                      <SelectItem value="day_off">
                                        <div className="flex items-center gap-1">
                                          <Coffee className="w-3 h-3" />
                                          {t.dayOff}
                                        </div>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {assignment && (
                                    <div className="mt-1">
                                      <Badge 
                                        className={`text-xs ${getShiftBadgeStyle(assignment.shiftName, assignment.isDayOff)}`}
                                      >
                                        {assignment.isDayOff ? '🏖️ Day Off' : assignment.shiftName}
                                      </Badge>
                                    </div>
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4 mt-4 md:mt-6">
            <EditablePerformanceDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminShiftManagement; 