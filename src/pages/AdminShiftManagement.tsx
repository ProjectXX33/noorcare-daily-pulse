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
  Coffee
} from 'lucide-react';
import { toast } from 'sonner';
import EditablePerformanceDashboard from '@/components/EditablePerformanceDashboard';

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

  const translations = {
    en: {
      shiftManagement: "Shift Management & Performance",
      assignShifts: "Assign Shifts",
      performance: "Performance Dashboard",
      weekOf: "Week of",
      employee: "Employee",
      monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", 
      thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
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
      mostOvertime: "💪 Most Overtime"
    }
  };

  const t = translations[language as keyof typeof translations];

  useEffect(() => {
    console.log('AdminShiftManagement: Component mounted', { user });
    if (user?.role === 'admin') {
      loadData();
    }
  }, [user, selectedWeekStart]);

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
        .eq('position', 'Customer Service')
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
        .eq('position', 'Customer Service')
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
        })
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Assignment updated successfully:', data);
      
      // Show success message
      const shiftName = shifts.find(s => s.id === shiftId)?.name;
      if (isDayOff) {
        toast.success(`✅ Day off assigned for ${format(date, 'MMM dd')}`);
      } else if (shiftId) {
        toast.success(`✅ ${shiftName} assigned for ${format(date, 'MMM dd')}`);
      } else {
        toast.success(`✅ Assignment cleared for ${format(date, 'MMM dd')}`);
      }
      
      // Reload assignments
      await loadAssignments();
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error(`Failed to update assignment: ${error.message || 'Unknown error'}`);
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
    if (isDayOff) return 'bg-green-100 text-green-800 border-green-200';
    switch (shiftName) {
      case 'Day Shift': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Night Shift': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700">Access Denied</h2>
          <p className="text-gray-500 mt-2">This page is only available for administrators.</p>
        </div>
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
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <AlertTriangle className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Error Loading Page</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={() => loadData()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const weekDays = getWeekDays();
  const dayNames = [t.monday, t.tuesday, t.wednesday, t.thursday, t.friday, t.saturday, t.sunday];

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold mb-2">{t.shiftManagement}</h1>
        <p className="text-muted-foreground">Assign shifts, track performance, and manage days off</p>
      </div>

      <Tabs defaultValue="assignments" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assignments">{t.assignShifts}</TabsTrigger>
          <TabsTrigger value="performance">{t.performance}</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Weekly Shift Assignments</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedWeekStart(addDays(selectedWeekStart, -7))}
                  >
                    ← Previous Week
                  </Button>
                  <span className="text-sm font-medium">
                    {t.weekOf} {format(selectedWeekStart, 'MMM dd, yyyy')}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedWeekStart(addDays(selectedWeekStart, 7))}
                  >
                    Next Week →
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40">{t.employee}</TableHead>
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
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.name}</TableCell>
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
                                  <SelectItem value="unassigned">Not Assigned</SelectItem>
                                  {shifts.map((shift) => (
                                    <SelectItem key={shift.id} value={shift.id}>
                                      {shift.name}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="day_off">
                                    <div className="flex items-center gap-1">
                                      <Coffee className="w-3 h-3" />
                                      Day Off
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <EditablePerformanceDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminShiftManagement; 