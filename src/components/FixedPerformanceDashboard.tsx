import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { 
  Edit3, 
  Save, 
  X, 
  Plus,
  Trash2,
  Award,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Loader2,
  Zap,
  RotateCcw,
  Edit,
  TrendingDown,
  Minus,
  Clock,
  CheckCircle,
  AlertCircle,
  Target,
  Calendar,
  User,
  FileText,
  Filter,
  Crown,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckIn } from '@/contexts/CheckInContext';

interface PerformanceData {
  id: string;
  name: string;
  department: string;
  position: string;
  days: number;
  delay: number;
  overtime: number;
  workTime: number;
  tasks: {
    total: number;
    completed: number;
    successRate: number;
  };
  logins: {
    count: number;
    avgPerDay: number;
  };
  appUsage: {
    totalMinutes: number;
    avgPerDay: number;
  };
  performance: number;
  status: 'Excellent' | 'Good' | 'Average' | 'Poor';
  delayToFinish: number;
  workReports: {
    submitted: number;
    total: number;
    completionRate: number;
  };
}

interface FixedPerformanceDashboardProps {
  currentMonth?: string;
}

// Performance calculation functions
function calculatePerformanceScore(delayMinutes: number): number {
  if (delayMinutes <= 0) return 100.0;
  if (delayMinutes >= 500) return 0.0;
  return Math.max(0, 100.0 - (delayMinutes / 5.0));
}

function calculatePunctuality(delayMinutes: number): number {
  if (delayMinutes <= 0) return 100.0;
  if (delayMinutes >= 60) return 0.0;
  if (delayMinutes > 30) return Math.max(0, 50 - (delayMinutes * 2));
  return Math.max(0, 90 - (delayMinutes * 3));
}

function calculateStatus(score: number, punctuality: number): string {
  if (score >= 95 && punctuality >= 95) return 'Excellent';
  if (score >= 85 && punctuality >= 80) return 'Good';
  if (score >= 70 && punctuality >= 60) return 'Needs Improvement';
  return 'Poor';
}

const FixedPerformanceDashboard: React.FC<FixedPerformanceDashboardProps> = ({ 
  currentMonth = '2025-06' 
}) => {
  const { user } = useAuth();
  const { workReports } = useCheckIn();
  const [employees, setEmployees] = useState<PerformanceData[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<PerformanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isRerecording, setIsRerecording] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    department: '',
    position: '',
    status: '',
    searchName: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchEmployeeData();
    }
  }, [user, currentMonth]);

  // Apply filters whenever employees or filters change
  useEffect(() => {
    let filtered = [...employees];

    // Apply department filter
    if (filters.department) {
      filtered = filtered.filter(emp => emp.department === filters.department);
    }

    // Apply position filter
    if (filters.position) {
      filtered = filtered.filter(emp => emp.position === filters.position);
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(emp => emp.status === filters.status);
    }

    // Apply name search
    if (filters.searchName) {
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(filters.searchName.toLowerCase())
      );
    }

    setFilteredEmployees(filtered);
  }, [employees, filters]);

  const fetchEmployeeData = async () => {
    try {
      setIsLoading(true);

      const startDate = new Date(currentMonth);
      startDate.setDate(1);
      const endDate = new Date(currentMonth);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);

      console.log('📅 Fetching data for date range:', {
        currentMonth: currentMonth,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      // Fetch ALL employees (not just Customer Service and Designers)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, department, position, role')
        .eq('role', 'employee'); // Include ALL employee positions

      if (usersError) throw usersError;

      console.log('👥 All employees found:', usersData.length);

      // Fetch monthly shifts for ALL employees
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('monthly_shifts')
        .select(`
          *,
          shifts:shift_id(name, start_time, end_time)
        `)
        .gte('work_date', startDate.toISOString())
        .lte('work_date', endDate.toISOString());

      if (shiftsError) throw shiftsError;

      // Fetch task data for ALL employees with proper completion tracking
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (tasksError) throw tasksError;

      console.log('📝 Tasks data found:', tasksData.length);

      // Fetch work reports from context
      const monthlyWorkReports = workReports.filter(report => {
        const reportDate = new Date(report.createdAt);
        return reportDate >= startDate && reportDate <= endDate;
      });

      console.log('📋 Monthly work reports found:', monthlyWorkReports.length);

      const processedEmployees: PerformanceData[] = [];

      for (const employee of usersData) {
        console.log(`\n👤 Processing employee: ${employee.name} (${employee.position})`);

        // Get employee's shifts
        const employeeShifts = shiftsData.filter(shift => shift.user_id === employee.id);
        console.log(`📊 ${employee.name} shifts found:`, employeeShifts.length);

        // Get employee's tasks with proper completion tracking
        const employeeTasks = tasksData.filter(task => {
          // Check both user_id and assigned_to fields for task assignment
          return task.user_id === employee.id || task.assigned_to === employee.id;
        });
        console.log(`📝 ${employee.name} tasks found:`, employeeTasks.length);

        // Get employee's work reports
        const employeeReports = monthlyWorkReports.filter(report => report.userId === employee.id);
        console.log(`📋 ${employee.name} work reports found:`, employeeReports.length);

        // Calculate days worked
        const daysWorked = employeeShifts.length;

        // Calculate total delay and overtime from shifts
        const totalDelayMinutes = employeeShifts.reduce((sum, shift) => sum + (shift.delay_minutes || 0), 0);
        const totalDelayHours = totalDelayMinutes / 60;
        const totalOvertime = employeeShifts.reduce((sum, shift) => sum + (shift.overtime_hours || 0), 0);

        // Calculate work time based on shift type (Day: 7h, Night: 8h)
        let totalWorkTime = 0;
        employeeShifts.forEach(shift => {
          if (shift.shifts?.name?.toLowerCase().includes('day')) {
            totalWorkTime += 7; // Day shift: 7 hours
          } else if (shift.shifts?.name?.toLowerCase().includes('night')) {
            totalWorkTime += 8; // Night shift: 8 hours
          } else {
            totalWorkTime += 8; // Default: 8 hours
          }
        });

        // Task performance calculation with proper completion tracking
        const completedTasks = employeeTasks.filter(task => {
          // More comprehensive completion check
          return task.status === 'Complete' || task.status === 'Completed' || task.status === 'complete';
        }).length;
        
        const tasksWithImages = employeeTasks.filter(task => 
          task.visual_feeding || task.image_url || task.visual_content
        ).length;
        
        const taskSuccessRate = employeeTasks.length > 0 ? (completedTasks / employeeTasks.length) * 100 : 0;

        console.log(`📝 ${employee.name} task details:`, {
          total: employeeTasks.length,
          completed: completedTasks,
          withImages: tasksWithImages,
          successRate: taskSuccessRate.toFixed(1) + '%'
        });

        // Login tracking (simplified - you may want to add actual login tracking)
        const loginCount = daysWorked; // Assuming one login per work day
        const avgLoginsPerDay = daysWorked > 0 ? loginCount / daysWorked : 0;

        // Work reports tracking
        const expectedReports = daysWorked; // One report per work day
        const reportCompletionRate = expectedReports > 0 ? (employeeReports.length / expectedReports) * 100 : 0;

        // Enhanced performance calculation
        let performanceScore = 0;

        if (daysWorked > 0) {
          // Traditional calculation for employees with check-ins
          const delayScore = totalDelayMinutes <= 0 ? 100 : Math.max(0, 100 - (totalDelayMinutes / 5));
          const overtimeBonus = Math.min(20, totalOvertime * 2);
          const taskBonus = tasksWithImages * 5; // 5 points per task with images
          const reportBonus = reportCompletionRate > 80 ? 10 : 0; // 10 points for consistent reporting
          
          performanceScore = Math.min(100, delayScore + overtimeBonus + taskBonus + reportBonus);
        } else {
          // Task-based calculation for employees without check-ins
          const taskPerformance = taskSuccessRate;
          const imageBonus = employeeTasks.length > 0 ? (tasksWithImages / employeeTasks.length) * 20 : 0;
          const reportBonus = reportCompletionRate > 50 ? 15 : 0;
          
          performanceScore = Math.min(100, taskPerformance + imageBonus + reportBonus);
        }

        // FIXED: Calculate "Delay to Finish" = Delay Hours - Overtime (as requested)
        const delayToFinish = Math.max(0, totalDelayHours - totalOvertime);

        // Determine status
        let status: 'Excellent' | 'Good' | 'Average' | 'Poor';
        if (performanceScore >= 90) status = 'Excellent';
        else if (performanceScore >= 75) status = 'Good';
        else if (performanceScore >= 60) status = 'Average';
        else status = 'Poor';

        processedEmployees.push({
          id: employee.id,
          name: employee.name,
          department: employee.department || 'General',
          position: employee.position || 'Employee',
          days: daysWorked,
          delay: totalDelayHours,
          overtime: totalOvertime,
          workTime: totalWorkTime,
          tasks: {
            total: employeeTasks.length,
            completed: completedTasks,
            successRate: taskSuccessRate
          },
          logins: {
            count: loginCount,
            avgPerDay: avgLoginsPerDay
          },
          appUsage: {
            totalMinutes: daysWorked * 480, // Estimate: 8 hours per day
            avgPerDay: 480
          },
          performance: performanceScore,
          status,
          delayToFinish,
          workReports: {
            submitted: employeeReports.length,
            total: expectedReports,
            completionRate: reportCompletionRate
          }
        });

        console.log(`✅ ${employee.name} processed:`, {
          days: daysWorked,
          delay: totalDelayHours.toFixed(2),
          overtime: totalOvertime.toFixed(2),
          workTime: totalWorkTime,
          delayToFinish: delayToFinish.toFixed(2),
          performance: performanceScore.toFixed(1),
          reports: `${employeeReports.length}/${expectedReports}`,
          taskCompletion: `${completedTasks}/${employeeTasks.length}`
        });
      }

      // Sort by performance score
      processedEmployees.sort((a, b) => b.performance - a.performance);
      
      setEmployees(processedEmployees);
      console.log('📊 Final processed employees:', processedEmployees.length);

    } catch (error) {
      console.error('Error fetching employee data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (record: PerformanceData) => {
    setEditingId(record.id);
    setEditForm({
      ...record,
      total_delay_hours: record.delay / 60
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
    setIsAddingNew(false);
  };

  const saveRecord = async () => {
    try {
      const delayMinutes = editForm.delay || 0;
      const delayHours = delayMinutes / 60;
      const workingDays = editForm.days || 1;
      
      const newPerformanceScore = calculatePerformanceScore(delayMinutes);
      const newPunctuality = calculatePunctuality(delayMinutes);
      const newStatus = calculateStatus(newPerformanceScore, newPunctuality);
      
      const recordData = {
        employee_id: editForm.id,
        employee_name: editForm.name,
        month_year: currentMonth,
        total_working_days: workingDays,
        total_delay_minutes: delayMinutes,
        total_delay_hours: Math.round(delayHours * 100) / 100,
        total_overtime_hours: editForm.overtime || 0,
        average_performance_score: Math.round(newPerformanceScore * 100) / 100,
        punctuality_percentage: Math.round(newPunctuality * 100) / 100,
        performance_status: newStatus,
        updated_at: new Date().toISOString()
      };

      let result;
      if (isAddingNew) {
        result = await supabase
          .from('admin_performance_dashboard')
          .insert(recordData)
          .select();
      } else {
        result = await supabase
          .from('admin_performance_dashboard')
          .update(recordData)
          .eq('id', editingId)
          .select();
      }

      if (result.error) throw result.error;

      toast.success(isAddingNew ? 'Record created successfully!' : 'Record updated successfully!');
      cancelEditing();
      await fetchEmployeeData();
    } catch (error) {
      console.error('Error saving record:', error);
      toast.error(`Failed to save record: ${error.message}`);
    }
  };

  const deleteRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      const { error } = await supabase
        .from('admin_performance_dashboard')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Record deleted successfully!');
      await fetchEmployeeData();
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error(`Failed to delete record: ${error.message}`);
    }
  };

  const startAddingNew = () => {
    setIsAddingNew(true);
    setEditForm({
      employee_id: '',
      employee_name: '',
      month_year: currentMonth,
      total_working_days: 0,
      total_delay_minutes: 0,
      total_overtime_hours: 0
    });
  };

  // Recalculate all performance metrics with new rules
  const recalculateAllMetrics = async () => {
    if (!confirm('This will recalculate ALL performance metrics using the latest rules. Continue?')) return;

    setIsRecalculating(true);
    toast.info('🔄 Recalculating all performance metrics...');

    try {
      // Import the recalculate function from our utility
      const { recalculateOvertimeHours } = await import('@/utils/recalculateOvertime');
      
      // Run the recalculation for the current month
      const result = await recalculateOvertimeHours({
        targetMonth: currentMonth,
        dryRun: false,
        verbose: true
      });

      if (result.success) {
        toast.success(`✅ Recalculated ${result.updatedCount} records successfully!`);
        await fetchEmployeeData(); // Refresh the data
      } else {
        throw new Error(result.error || 'Recalculation failed');
      }
    } catch (error) {
      console.error('Error recalculating metrics:', error);
      toast.error(`Failed to recalculate: ${error.message}`);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Re-record all records from scratch with current month data
  const rerecordAllRecords = async () => {
    if (!confirm(`This will refresh and re-calculate ALL performance data for ${currentMonth}. Continue?`)) return;

    setIsRerecording(true);
    toast.info('🔄 Re-recording all performance data from scratch...');

    try {
      // Force refresh employee data with new calculations
      await fetchEmployeeData();

      toast.success(`✅ Re-recorded performance data for ${employees.length} employees successfully!`);
    } catch (error) {
      console.error('Error re-recording data:', error);
      toast.error(`Failed to re-record: ${error.message}`);
    } finally {
      setIsRerecording(false);
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 85) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get unique values for filter dropdowns
  const uniqueDepartments = [...new Set(employees.map(emp => emp.department))];
  const uniquePositions = [...new Set(employees.map(emp => emp.position))];
  const uniqueStatuses = [...new Set(employees.map(emp => emp.status))];

  // Get best employee
  const bestEmployee = employees.length > 0 ? employees.reduce((best, current) => 
    current.performance > best.performance ? current : best
  ) : null;

  const clearFilters = () => {
    setFilters({
      department: '',
      position: '',
      status: '',
      searchName: ''
    });
  };

  const summaryStats = {
    bestPerformers: employees.filter(p => p.performance >= 95).length,
    totalDelayHours: employees.reduce((sum, p) => sum + p.delay, 0),
    totalOvertimeHours: employees.reduce((sum, p) => sum + p.overtime, 0),
  };

  const formatTime = (hours: number): string => {
    if (hours === 0) return '0min';
    
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    
    if (wholeHours === 0) {
      return `${minutes}min`;
    } else if (minutes === 0) {
      return `${wholeHours}h`;
    } else {
      return `${wholeHours}h ${minutes}min`;
    }
  };

  const formatHoursAndMinutes = (hours: number): string => {
    if (hours === 0) return '0min';
    
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    
    if (wholeHours === 0) {
      return `${minutes}min`;
    } else if (minutes === 0) {
      return `${wholeHours}h`;
          } else {
      return `${wholeHours}h ${minutes}min`;
    }
  };

  const formatDelayToFinish = (delayToFinish: number): string => {
    if (delayToFinish === 0) return 'No Extra Time';
    return `+${formatTime(delayToFinish)}`;
  };

  const getDelayToFinishColor = (delayToFinish: number): string => {
    return delayToFinish > 0 ? 'text-green-600' : 'text-gray-500';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Excellent': return 'bg-green-100 text-green-800';
      case 'Good': return 'bg-blue-100 text-blue-800';
      case 'Average': return 'bg-yellow-100 text-yellow-800';
      case 'Poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Digital Solution Manager has access to everything
  if (user?.position === 'Digital Solution Manager') {
    // Continue to render the component
  } else if (!user || user.role !== 'admin') {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Employee Performance Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Best Employee Highlight - Enhanced Gold Design */}
      {bestEmployee && (
        <Card className="mb-6 border-2 border-yellow-300 bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Crown className="h-12 w-12 text-yellow-600 drop-shadow-md" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                    <Star className="h-2 w-2 text-yellow-800" />
                  </div>
                </div>
                <div className="text-center sm:text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">🏆</span>
                    <h3 className="text-sm font-medium text-yellow-700 uppercase tracking-wide">Top Performer</h3>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-yellow-800 mb-1">{bestEmployee.name}</h2>
                  <p className="text-sm text-yellow-600 mb-2">{bestEmployee.position} • {bestEmployee.department}</p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="bg-white/70 px-2 py-1 rounded-full text-yellow-700">
                      Performance: {bestEmployee.performance.toFixed(1)}%
                    </span>
                    <span className="bg-white/70 px-2 py-1 rounded-full text-yellow-700">
                      Tasks: {bestEmployee.tasks.completed}/{bestEmployee.tasks.total}
                    </span>
                    <span className="bg-white/70 px-2 py-1 rounded-full text-yellow-700">
                      Delay: {formatHoursAndMinutes(bestEmployee.delay)}
                    </span>
                    <span className="bg-white/70 px-2 py-1 rounded-full text-yellow-700">
                      Overtime: {formatHoursAndMinutes(bestEmployee.overtime)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 text-lg px-4 py-2 font-bold shadow-md">
                  <Crown className="h-5 w-5 mr-2" />
                  Champion
                </Badge>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-800">{bestEmployee.performance.toFixed(0)}%</div>
                  <div className="text-xs text-yellow-600 uppercase tracking-wide">Excellence</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Best Performers</p>
                <p className="text-lg sm:text-2xl font-bold">{summaryStats.bestPerformers}</p>
              </div>
              <Award className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Delays</p>
                <p className="text-lg sm:text-2xl font-bold text-red-600">{summaryStats.totalDelayHours.toFixed(1)}h</p>
              </div>
              <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Overtime</p>
                <p className="text-lg sm:text-2xl font-bold text-blue-600">{summaryStats.totalOvertimeHours.toFixed(1)}h</p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-base sm:text-lg">Fixed Performance Dashboard - {currentMonth}</span>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => setShowFilters(!showFilters)} 
                variant="outline" 
                size="sm"
                className={showFilters ? "bg-blue-50" : ""}
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>

              <Button 
                onClick={fetchEmployeeData} 
                variant="outline" 
                size="sm"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh
              </Button>

              <Button 
                onClick={recalculateAllMetrics} 
                variant="outline" 
                size="sm"
                disabled={isRecalculating}
                className="bg-blue-50 hover:bg-blue-100"
              >
                {isRecalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Recalculate All
              </Button>

              <Button 
                onClick={rerecordAllRecords} 
                variant="outline" 
                size="sm"
                disabled={isRerecording}
                className="bg-orange-50 hover:bg-orange-100"
              >
                {isRerecording ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Re-record All
              </Button>

              <Button 
                onClick={startAddingNew} 
                variant="default" 
                size="sm"
                disabled={isAddingNew}
              >
                <Plus className="h-4 w-4" />
                Add Record
              </Button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-3 sm:p-6">
          {/* Mobile-Optimized Filter Section */}
          {showFilters && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <h3 className="text-sm font-semibold mb-4 text-blue-900 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter Employees
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-medium text-blue-700 mb-2 block">Search Name</label>
                  <Input
                    placeholder="Employee name..."
                    value={filters.searchName}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchName: e.target.value }))}
                    className="border-blue-200 focus:border-blue-400 h-10"
                  />
                </div>
                
                <div>
                  <label className="text-xs font-medium text-blue-700 mb-2 block">Department</label>
                  <select
                    value={filters.department}
                    onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-blue-200 rounded-md focus:border-blue-400 h-10"
                  >
                    <option value="">All Departments</option>
                    {uniqueDepartments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-blue-700 mb-2 block">Position</label>
                  <select
                    value={filters.position}
                    onChange={(e) => setFilters(prev => ({ ...prev, position: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-blue-200 rounded-md focus:border-blue-400 h-10"
                  >
                    <option value="">All Positions</option>
                    {uniquePositions.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-blue-700 mb-2 block">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-blue-200 rounded-md focus:border-blue-400 h-10"
                  >
                    <option value="">All Statuses</option>
                    {uniqueStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 gap-3">
                <p className="text-sm text-blue-700 font-medium">
                  Showing {filteredEmployees.length} of {employees.length} employees
                </p>
                <Button onClick={clearFilters} variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-50">
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              </div>
            </div>
          )}

          {/* Mobile Card View */}
          <div className="block lg:hidden space-y-4">
            {filteredEmployees.map((employee) => (
              <Card key={employee.id} className="border border-gray-200 hover:border-blue-300 transition-colors">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{employee.name}</h3>
                      <p className="text-sm text-gray-600">{employee.position} • {employee.department}</p>
                    </div>
                    <Badge className={getStatusColor(employee.status)}>
                      {employee.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-xl font-bold text-blue-600">{employee.days}</div>
                      <div className="text-xs text-blue-500">Working Days</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className={`text-xl font-bold ${getPerformanceColor(employee.performance)}`}>
                        {employee.performance.toFixed(1)}%
                      </div>
                      <div className="text-xs text-green-500">Performance</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="text-center p-2 bg-orange-50 rounded">
                      <div className="text-sm font-medium text-orange-600">
                        {formatTime(employee.delay)}
                      </div>
                      <div className="text-xs text-orange-500">Delay</div>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded">
                      <div className="text-sm font-medium text-purple-600">
                        {formatTime(employee.overtime)}
                      </div>
                      <div className="text-xs text-purple-500">Overtime</div>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="font-medium text-gray-700">{employee.tasks.completed}/{employee.tasks.total}</div>
                        <div className="text-gray-500">Tasks</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-700">{formatTime(employee.workTime)}</div>
                        <div className="text-gray-500">Work Time</div>
                      </div>
                      <div className="text-center">
                        <div className={`font-medium ${getDelayToFinishColor(employee.delayToFinish)}`}>
                          {formatDelayToFinish(employee.delayToFinish)}
                        </div>
                        <div className="text-gray-500">Delay to Finish</div>
                      </div>
                    </div>
                  </div>

                  {user?.role === 'admin' && (
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button 
                        onClick={() => startEditing(employee)} 
                        size="sm" 
                        variant="outline"
                        className="flex-1"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        onClick={() => deleteRecord(employee.id)} 
                        size="sm" 
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {filteredEmployees.length === 0 && !isAddingNew && (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <User className="h-12 w-12 mx-auto" />
                </div>
                <p className="text-gray-500">No employees found with current filters</p>
                <Button onClick={clearFilters} variant="outline" size="sm" className="mt-2">
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading performance data...</p>
            </div>
          ) : (
            /* Desktop Table View */
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-gray-50">
                    <TableHead className="font-semibold">Employee</TableHead>
                    <TableHead className="font-semibold text-center">Working Days</TableHead>
                    <TableHead className="font-semibold text-center">Work Time</TableHead>
                    <TableHead className="font-semibold text-center">Delay</TableHead>
                    <TableHead className="font-semibold text-center">Overtime</TableHead>
                    <TableHead className="font-semibold text-center">Delay to Finish</TableHead>
                    <TableHead className="font-semibold text-center">Tasks</TableHead>
                    <TableHead className="font-semibold text-center">Reports</TableHead>
                    <TableHead className="font-semibold text-center">Performance</TableHead>
                    <TableHead className="font-semibold text-center">Status</TableHead>
                    {user?.role === 'admin' && <TableHead className="font-semibold text-center">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isAddingNew && (
                    <TableRow>
                      <TableCell>
                        <Input
                          placeholder="Employee Name"
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={editForm.days || ''}
                          onChange={(e) => setEditForm({...editForm, days: Number(e.target.value)})}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <span className="text-blue-600 font-medium">
                            {formatTime(editForm.workTime || 0)}
                        </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          placeholder="Minutes"
                          value={editForm.delay || ''}
                          onChange={(e) => setEditForm({...editForm, delay: Number(e.target.value)})}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={editForm.overtime || ''}
                          onChange={(e) => setEditForm({...editForm, overtime: Number(e.target.value)})}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <span className={getDelayToFinishColor(Math.max(0, (editForm.delay || 0) - (editForm.overtime || 0)))}>
                            {formatDelayToFinish(Math.max(0, (editForm.delay || 0) - (editForm.overtime || 0)))}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-green-600 font-medium">0/0</span>
                          </div>
                          <span className="text-xs text-muted-foreground">0% success</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4 text-blue-500" />
                            <span className="text-blue-600 font-medium">0/0</span>
                          </div>
                          <span className="text-xs text-muted-foreground">0% rate</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`font-bold ${getPerformanceColor(calculatePerformanceScore(editForm.delay || 0))}`}>
                          {calculatePerformanceScore(editForm.delay || 0).toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-gray-100 text-gray-800">
                          {calculateStatus(
                            calculatePerformanceScore(editForm.delay || 0),
                            calculatePunctuality(editForm.delay || 0)
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button onClick={saveRecord} size="sm" variant="outline">
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button onClick={cancelEditing} size="sm" variant="outline">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {filteredEmployees.map((employee) => {
                    const realTimeScore = calculatePerformanceScore(employee.delay);
                    const realTimePunctuality = calculatePunctuality(employee.delay);
                    const realTimeStatus = calculateStatus(realTimeScore, realTimePunctuality);

                    const isCurrentUserEmployee = user?.role === 'employee' && user?.id === employee.id;
                    const canEdit = user?.role === 'admin' || isCurrentUserEmployee;

                    return (
                      <TableRow key={employee.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {employee.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{employee.name}</p>
                              <p className="text-xs text-gray-500">{employee.position} • {employee.department}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {editingId === employee.id ? (
                            <Input
                              type="number"
                              value={editForm.days || ''}
                              onChange={(e) => setEditForm({...editForm, days: Number(e.target.value)})}
                              className="w-20 text-center"
                            />
                          ) : (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-full">
                              <Calendar className="h-3 w-3 text-blue-500" />
                              <span className="font-semibold text-blue-700">{employee.days}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 rounded-full">
                            <Clock className="h-3 w-3 text-indigo-500" />
                            <span className="font-semibold text-indigo-700">
                              {formatTime(employee.workTime)}
                          </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {editingId === employee.id ? (
                            <Input
                              type="number"
                              placeholder="Hours"
                              value={editForm.delay || ''}
                              onChange={(e) => setEditForm({...editForm, delay: Number(e.target.value)})}
                              className="w-24 text-center"
                            />
                          ) : (
                            <span className={`font-semibold px-2 py-1 rounded-full ${
                              employee.delay > 0 
                                ? 'bg-red-50 text-red-700' 
                                : 'bg-green-50 text-green-700'
                            }`}>
                              {formatTime(employee.delay)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {editingId === employee.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editForm.overtime || ''}
                              onChange={(e) => setEditForm({...editForm, overtime: Number(e.target.value)})}
                              className="w-20 text-center"
                            />
                          ) : (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 rounded-full">
                              <TrendingUp className="h-3 w-3 text-green-500" />
                              <span className="font-semibold text-green-700">
                                {formatTime(employee.overtime)}
                            </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 rounded-full">
                            <Target className="h-3 w-3 text-orange-500" />
                            <span className={`font-semibold ${
                              employee.delayToFinish > 0 ? 'text-orange-700' : 'text-green-700'
                            }`}>
                              {formatDelayToFinish(employee.delayToFinish)}
                          </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-full">
                              <CheckCircle className="h-3 w-3 text-emerald-500" />
                              <span className="font-semibold text-emerald-700">
                                {employee.tasks.completed}/{employee.tasks.total}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 font-medium">
                              {employee.tasks.successRate.toFixed(0)}% success
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-full">
                              <FileText className="h-3 w-3 text-blue-500" />
                              <span className="font-semibold text-blue-700">
                                {employee.workReports.submitted}/{employee.workReports.total}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 font-medium">
                              {employee.workReports.completionRate.toFixed(0)}% rate
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="inline-flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-full border border-purple-200">
                            <span className={`font-bold text-lg ${getPerformanceColor(employee.performance)}`}>
                              {employee.performance.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`${getStatusColor(employee.status)} font-semibold px-3 py-1`}>
                            {employee.status}
                          </Badge>
                        </TableCell>
                        {user?.role === 'admin' && (
                          <TableCell className="text-center">
                            {editingId === employee.id ? (
                              <div className="flex gap-1 justify-center">
                                <Button onClick={saveRecord} size="sm" variant="outline" className="hover:bg-green-50 hover:border-green-300">
                                  <Save className="h-3 w-3" />
                              </Button>
                                <Button onClick={cancelEditing} size="sm" variant="outline" className="hover:bg-gray-50">
                                  <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                              <div className="flex gap-1 justify-center">
                                <Button 
                                  onClick={() => startEditing(employee)} 
                                  size="sm" 
                                  variant="outline"
                                  className="hover:bg-blue-50 hover:border-blue-300"
                                >
                                  <Edit className="h-3 w-3" />
                              </Button>
                              <Button 
                                  onClick={() => deleteRecord(employee.id)} 
                                size="sm" 
                                variant="outline"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300"
                              >
                                  <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {filteredEmployees.length === 0 && !isAddingNew && (
                <div className="text-center py-8 text-gray-500">
                  No performance data available for {currentMonth}. Click "Re-record All" to generate from check-in data.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FixedPerformanceDashboard; 