import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/lib/supabase';
import { format, startOfMonth, endOfMonth, isToday } from 'date-fns';
import { 
  Edit3, 
  Save, 
  X, 
  Plus,
  Trash2,
  Award,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Loader2,
  Zap,
  RotateCcw,
  User,
  Calendar,
  Clock,
  CheckCircle,
  Target,
  FileText,
  Crown,
  Star,
  Trophy,
  Wrench,
  Database,
  Smartphone
} from 'lucide-react';
import { toast } from 'sonner';
import { recalculateOvertimeHours } from '@/utils/recalculateOvertime';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from '@/contexts/AuthContext';

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

interface PerformanceData {
  id: string;
  name: string;
  department: string;
  position: string;
  days: number;
  delay: number;
  overtime: number;
  workTime: number; // NEW: Work time hours based on shift
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
  delayToFinish: number; // NEW: Overtime - Delay calculation
  workReports: {
    submitted: number;
    total: number;
    completionRate: number;
  };
}

interface EditablePerformanceDashboardProps {
  currentMonth?: string;
}

// Helper functions for calculation (copied from performanceApi.ts)
function calcPerformanceScore(delayMinutes: number, overtimeHours: number = 0): number {
  // Base score starts at 100
  let score = 100.0;
  
  // Penalty for delays (negative impact)
  if (delayMinutes > 0) {
    // Each minute of delay reduces score by 0.2 points (was 0.2, making it fairer)
    const delayPenalty = Math.min(50, delayMinutes * 0.2); // Max penalty of 50 points for delays
    score -= delayPenalty;
  }
  
  // Bonus for overtime (positive impact to balance delays)
  if (overtimeHours > 0) {
    // Each hour of overtime adds 2 points (reward dedication)
    const overtimeBonus = Math.min(25, overtimeHours * 2); // Max bonus of 25 points for overtime
    score += overtimeBonus;
  }
  
  // Ensure score stays within 0-100 range
  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}
function calcPunctuality(delayMinutes: number): number {
  if (delayMinutes >= 60) return 0.0;
  if (delayMinutes > 30) return Math.max(0, 50 - (delayMinutes * 2));
  if (delayMinutes > 0) return Math.max(0, 90 - (delayMinutes * 3));
  return 100.0;
}
function calcStatus(score: number, punctuality: number): string {
  if (punctuality < 50 || score < 50) return 'Poor';
  if (punctuality < 70 || score < 70) return 'Needs Improvement';
  if (punctuality < 85 || score < 85) return 'Good';
  return 'Excellent';
}

const EditablePerformanceDashboard: React.FC<EditablePerformanceDashboardProps> = ({ 
  currentMonth = format(new Date(), 'yyyy-MM') 
}) => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<PerformanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFixingRecords, setIsFixingRecords] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<PerformanceData | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    department: '',
    position: '',
    performance: 0,
    status: 'Good' as 'Excellent' | 'Good' | 'Average' | 'Poor'
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchEmployeeData();
    }
  }, [user, currentMonth]);

  const fetchEmployeeData = async () => {
    try {
    setIsLoading(true);

      const startDate = startOfMonth(new Date(currentMonth));
      const endDate = endOfMonth(new Date(currentMonth));

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
        .gte('work_date', format(startDate, 'yyyy-MM-dd'))
        .lte('work_date', format(endDate, 'yyyy-MM-dd'));

      if (shiftsError) throw shiftsError;

      // Fetch task data for ALL employees with enhanced completion detection
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (tasksError) throw tasksError;

      // Fetch work reports from database for the selected month
      const { data: workReportsData, error: reportsError } = await supabase
        .from('work_reports')
        .select('*')
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'));

      if (reportsError) {
        console.error('Work reports error:', reportsError);
      }

      const monthlyWorkReports = workReportsData || [];

      // Process each employee's data
      const processedEmployees: PerformanceData[] = [];

      for (const employee of usersData) {
        console.log(`\n👤 Processing employee: ${employee.name} (${employee.position})`);

        // Get employee's shifts
        const employeeShifts = shiftsData.filter(shift => shift.user_id === employee.id);
        console.log(`📊 ${employee.name} shifts found:`, employeeShifts.length);

        // Enhanced task detection - check multiple assignment fields
        const employeeTasks = tasksData.filter(task => {
          return task.user_id === employee.id || 
                 task.assigned_to === employee.id || 
                 task.task_assignee === employee.id;
        });
        console.log(`📝 ${employee.name} tasks found:`, employeeTasks.length);

        // Get employee's work reports - check multiple possible user ID fields
        const employeeReports = monthlyWorkReports.filter(report => {
          return report.userId === employee.id || 
                 report.user_id === employee.id || 
                 report.employee_id === employee.id;
        });
        console.log(`📋 ${employee.name} work reports found:`, employeeReports.length);

        // Calculate days worked
        const daysWorked = employeeShifts.length;

        // Calculate total delay and overtime
        const totalDelay = employeeShifts.reduce((sum, shift) => sum + (shift.delay_minutes || 0), 0) / 60; // Convert to hours
        const totalOvertime = employeeShifts.reduce((sum, shift) => sum + (shift.overtime_hours || 0), 0);

        // Calculate work time based on role
        let totalWorkTime = 0;
        const isRemoteRole = ['Media Buyer', 'Copywriter', 'Copy Writer', 'Copy Writing', 'Content Creator', 'Social Media Manager'].includes(employee.position);
        
        if (isRemoteRole) {
          // For remote roles, estimate work time based on tasks and reports
          totalWorkTime = (employeeTasks.length * 2) + (employeeReports.length * 1); // 2h per task, 1h per report
        } else {
          // For office roles, use shift-based calculation
          employeeShifts.forEach(shift => {
            if (shift.shifts?.name?.toLowerCase().includes('day')) {
              totalWorkTime += 7; // Day shift: 7 hours
            } else if (shift.shifts?.name?.toLowerCase().includes('night')) {
              totalWorkTime += 8; // Night shift: 8 hours
            } else {
              totalWorkTime += 8; // Default: 8 hours
            }
          });
        }

        // Enhanced task completion detection
        const completedTasks = employeeTasks.filter(task => {
          // Check multiple completion indicators
          const statusComplete = ['Complete', 'Completed', 'complete', 'COMPLETE', 'COMPLETED'].includes(task.status);
          const hasCompletionDate = task.completed_at || task.completion_date || task.finished_at;
          const hasVisualContent = task.visual_feeding || task.image_url || task.visual_content || task.completion_image;
          
          return statusComplete || hasCompletionDate || hasVisualContent;
        }).length;
        
        const tasksWithImages = employeeTasks.filter(task => {
          return task.visual_feeding || task.image_url || task.visual_content || task.completion_image;
        }).length;
        
        const taskSuccessRate = employeeTasks.length > 0 ? (completedTasks / employeeTasks.length) * 100 : 0;

        // Login tracking (simplified - you may want to add actual login tracking)
        const loginCount = daysWorked; // Assuming one login per work day
        const avgLoginsPerDay = daysWorked > 0 ? loginCount / daysWorked : 0;

        // Work reports tracking - adjusted for different roles
        let expectedReports = 0;
        if (isRemoteRole) {
          // Remote roles: expect reports based on actual task activity, not calendar days
          // Use tasks + 5 as baseline (task-based workers should report when they have work)
          expectedReports = Math.max(employeeTasks.length, employeeReports.length);
          if (expectedReports === 0) expectedReports = 5; // Minimum baseline
        } else {
          // Office roles: one report per check-in day
          expectedReports = daysWorked;
        }
        
        const reportCompletionRate = expectedReports > 0 ? (employeeReports.length / expectedReports) * 100 : 0;

        // Enhanced performance calculation
        let performanceScore = 0;

        if (isRemoteRole) {
          // Task and report-based calculation for remote employees
          const baseScore = 50; // Start with 50%
          
          // Task completion component (40% weight)
          const taskComponent = taskSuccessRate * 0.4;
          
          // Visual content bonus (20% weight)
          const visualComponent = employeeTasks.length > 0 ? (tasksWithImages / employeeTasks.length) * 20 : 0;
          
          // Report completion component (40% weight) 
          const reportComponent = Math.min(40, reportCompletionRate * 0.4);
          
          // Daily consistency bonus
          const consistencyBonus = (employeeReports.length >= 20) ? 10 : (employeeReports.length >= 15) ? 5 : 0;
          
          performanceScore = Math.min(100, baseScore + taskComponent + visualComponent + reportComponent + consistencyBonus);
          
        } else if (daysWorked > 0) {
          // Traditional calculation for employees with check-ins
          const delayScore = totalDelay <= 0 ? 100 : Math.max(0, 100 - (totalDelay * 10));
          const overtimeBonus = Math.min(20, totalOvertime * 2);
          const taskBonus = tasksWithImages * 5; // 5 points per task with images
          const reportBonus = reportCompletionRate > 80 ? 10 : 0; // 10 points for consistent reporting
          
          performanceScore = Math.min(100, delayScore + overtimeBonus + taskBonus + reportBonus);
        } else {
          // Fallback for employees with no check-ins and no remote role designation
          const taskPerformance = taskSuccessRate;
          const imageBonus = employeeTasks.length > 0 ? (tasksWithImages / employeeTasks.length) * 20 : 0;
          const reportBonus = reportCompletionRate > 50 ? 15 : 0;
          
          performanceScore = Math.min(100, taskPerformance + imageBonus + reportBonus);
        }

        // NEW: Calculate "Delay to Finish" = Overtime - Delay (reversed formula)
        const delayToFinish = Math.max(0, totalOvertime - totalDelay);

        // Determine status
        let status: 'Excellent' | 'Good' | 'Average' | 'Poor';
        if (performanceScore >= 90) status = 'Excellent';
        else if (performanceScore >= 75) status = 'Good';
        else if (performanceScore >= 60) status = 'Average';
        else status = 'Poor';

        processedEmployees.push({
          id: employee.id,
          name: employee.name,
          department: employee.department,
          position: employee.position,
          days: isRemoteRole ? -1 : daysWorked, // -1 indicates "No Track"
          delay: isRemoteRole ? -1 : totalDelay, // -1 indicates "No Track"
          overtime: isRemoteRole ? -1 : totalOvertime, // -1 indicates "No Track"
          workTime: isRemoteRole ? -1 : totalWorkTime, // -1 indicates "No Track"
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
          delayToFinish: isRemoteRole ? -1 : delayToFinish, // -1 indicates "No Track"
          workReports: {
            submitted: employeeReports.length,
            total: expectedReports,
            completionRate: reportCompletionRate
          }
        });

        console.log(`✅ ${employee.name} processed:`, {
          days: daysWorked,
          delay: totalDelay.toFixed(2),
          overtime: totalOvertime.toFixed(2),
          workTime: totalWorkTime,
          delayToFinish: delayToFinish.toFixed(2),
          performance: performanceScore.toFixed(1),
          reports: `${employeeReports.length}/${expectedReports}`
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

  const handleEditEmployee = (employee: PerformanceData) => {
    setEditingEmployee(employee);
    setEditForm({
      name: employee.name,
      department: employee.department,
      position: employee.position,
      performance: employee.performance,
      status: employee.status
    });
    setIsEditSheetOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingEmployee) return;

    try {
      // Update employee data in the database
      const { error } = await supabase
        .from('users')
        .update({
          name: editForm.name,
          department: editForm.department,
          position: editForm.position
        })
        .eq('id', editingEmployee.id);

      if (error) throw error;

      toast.success('Employee updated successfully');
      setIsEditSheetOpen(false);
      setEditingEmployee(null);
      
      // Refresh the data
      await fetchEmployeeData();
      
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error('Failed to update employee');
    }
  };

  const handleDeleteEmployee = async (employeeId: string, employeeName: string) => {
    if (!confirm(`Are you sure you want to delete ${employeeName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', employeeId);

      if (error) throw error;

      toast.success('Employee deleted successfully');
      
      // Refresh the data
      await fetchEmployeeData();
      
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Failed to delete employee');
    }
  };

  const fixRecords = async () => {
    if (!user || user.role !== 'admin') {
      toast.error('Only administrators can fix records');
      return;
    }

    setIsFixingRecords(true);
    
    try {
      const startDate = startOfMonth(new Date(currentMonth));
      const endDate = endOfMonth(new Date(currentMonth));

      console.log('🔧 Starting to fix task completion records...');

      // Get all tasks for the current month
      const { data: allTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (tasksError) throw tasksError;

      let fixedCount = 0;

      // Process each task to fix completion status
      for (const task of allTasks) {
        const shouldBeComplete = !!(
          task.visual_feeding || 
          task.image_url || 
          task.visual_content || 
          task.completion_image ||
          task.completed_at ||
          task.completion_date ||
          task.finished_at
        );

        // If task has completion indicators but status isn't marked complete
        if (shouldBeComplete && !['Complete', 'Completed', 'complete', 'COMPLETE', 'COMPLETED'].includes(task.status)) {
          console.log(`🔧 Fixing task ${task.id}: ${task.task_name} - marking as Complete`);
          
          const { error: updateError } = await supabase
            .from('tasks')
            .update({ 
              status: 'Complete',
              completed_at: task.completed_at || task.completion_date || new Date().toISOString()
            })
            .eq('id', task.id);

          if (!updateError) {
            fixedCount++;
          } else {
            console.error(`Failed to fix task ${task.id}:`, updateError);
          }
        }
      }

      toast.success(`Fixed ${fixedCount} task completion records`);
      
      // Refresh the data
      await fetchEmployeeData();
      
    } catch (error) {
      console.error('Error fixing records:', error);
      toast.error('Failed to fix records');
    } finally {
      setIsFixingRecords(false);
    }
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

  // NEW: Format delay to finish with sign
  const formatDelayToFinish = (delayToFinish: number): string => {
    if (delayToFinish === 0) return 'No Extra Time';
    return `+${formatTime(delayToFinish)}`; // Always positive since we use Math.max(0, ...)
  };

  // NEW: Get delay to finish color
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

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (isLoading) {
  return (
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Employee Performance Dashboard (Editable)
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

  // Get the best performing employee
  const bestEmployee = employees.length > 0 ? employees[0] : null;

  return (
    <TooltipProvider>
      <div className="space-y-4 sm:space-y-6">
        {/* Best Employee Champion Card - Responsive */}
        {bestEmployee && (
          <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-100 dark:from-yellow-950/30 dark:via-orange-950/30 dark:to-yellow-950/30 shadow-lg">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-lg sm:text-xl">
                        {bestEmployee.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-yellow-400 rounded-full p-0.5 sm:p-1 shadow-md">
                      <Crown className="h-3 w-3 sm:h-5 sm:w-5 text-yellow-800" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 bg-yellow-300 rounded-full p-0.5 sm:p-1">
                      <Star className="h-2 w-2 sm:h-3 sm:w-3 text-yellow-700" />
                    </div>
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 mb-1">
                      <h3 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-100">{bestEmployee.name}</h3>
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm">
                        🏆 Champion
                      </Badge>
                    </div>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 font-medium">{bestEmployee.position} • {bestEmployee.department}</p>
                  </div>
                </div>
                
                {/* Mobile: Stack metrics vertically, Desktop: Horizontal */}
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto">
                  <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-4 w-full sm:w-auto">
                    <div className="flex items-center gap-1 bg-white/60 dark:bg-gray-800/60 rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm">
                      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                      <span className="font-semibold text-green-700 dark:text-green-400">{bestEmployee.performance.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-1 bg-white/60 dark:bg-gray-800/60 rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm">
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                      <span className="font-semibold text-blue-700 dark:text-blue-400">{bestEmployee.tasks.completed} Tasks</span>
                    </div>
                    <div className="flex items-center gap-1 bg-white/60 dark:bg-gray-800/60 rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                      <span className="font-semibold text-purple-700 dark:text-purple-400">{formatTime(bestEmployee.delay)} Delay</span>
                    </div>
                    <div className="flex items-center gap-1 bg-white/60 dark:bg-gray-800/60 rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm">
                      <Target className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                      <span className="font-semibold text-orange-700 dark:text-orange-400">{formatTime(bestEmployee.overtime)} Overtime</span>
                    </div>
                  </div>
                  
                  {/* Ranking - hidden on small mobile, shown on larger screens */}
                  <div className="hidden sm:block text-right">
                    <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                      #1
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">Top Performer</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Dashboard */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-lg sm:text-xl">
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold">Employee Performance Dashboard</div>
                  <div className="text-blue-100 text-xs sm:text-sm font-medium">{format(new Date(currentMonth), 'MMMM yyyy')}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  <Smartphone className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  {employees.length} Employees
                </Badge>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={fixRecords}
                      disabled={isFixingRecords}
                      variant="secondary"
                      size="sm"
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs sm:text-sm"
                    >
                      {isFixingRecords ? (
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 animate-spin" />
                      ) : (
                        <Wrench className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      )}
                      Fix Records
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Automatically fix task completion records based on visual content and completion dates</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardTitle>
          </CardHeader>
                    <CardContent className="p-3 sm:p-6">
            {/* Mobile Card View */}
            <div className="block lg:hidden space-y-4">
              {employees.map((employee, index) => (
                <Card key={employee.id} className={`
                  border transition-all duration-200 hover:shadow-md
                  ${index === 0 ? 'border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20' : 'border-gray-200 dark:border-gray-700'}
                `}>
                  <CardContent className="p-4">
                    {/* Employee Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative">
                        <div className={`
                          w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white shadow-md
                          ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-purple-500'}
                        `}>
                          {employee.name.charAt(0).toUpperCase()}
                        </div>
                        {index === 0 && (
                          <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5">
                            <Crown className="h-3 w-3 text-yellow-800" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{employee.name}</h3>
                          {index === 0 && (
                            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-2 py-0.5">
                              👑 #1
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{employee.position}</p>
                        <Badge variant="outline" className="text-xs mt-1">{employee.department}</Badge>
                      </div>
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Calendar className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                        <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                          {employee.days === -1 ? 'No Track' : employee.days}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">Working Days</div>
                      </div>
                      <div className={`text-center p-3 rounded-lg ${
                        index === 0 ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20' : 'bg-purple-50 dark:bg-purple-900/20'
                      }`}>
                        <TrendingUp className={`h-4 w-4 mx-auto mb-1 ${
                          index === 0 ? 'text-orange-600' : 'text-purple-600'
                        }`} />
                        <div className={`text-lg font-bold ${
                          index === 0 ? 'text-orange-700 dark:text-orange-300' : 'text-purple-700 dark:text-purple-300'
                        }`}>
                          {employee.performance.toFixed(1)}%
                        </div>
                        <div className={`text-xs ${
                          index === 0 ? 'text-orange-600 dark:text-orange-400' : 'text-purple-600 dark:text-purple-400'
                        }`}>
                          Performance
                        </div>
                      </div>
                    </div>

                    {/* Secondary Metrics */}
                    <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                      <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                        <Clock className="h-3 w-3 text-red-600" />
                        <span className="text-red-700 dark:text-red-300 font-medium">
                          {employee.delay === -1 ? 'No Track' : `${formatTime(employee.delay)} Delay`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                        <TrendingUp className="h-3 w-3 text-green-600" />
                        <span className="text-green-700 dark:text-green-300 font-medium">
                          {employee.overtime === -1 ? 'No Track' : `${formatTime(employee.overtime)} Overtime`}
                        </span>
                      </div>
                    </div>

                    {/* Expandable Details */}
                    <div className="space-y-2 text-sm border-t pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Work Time:</span>
                        <span className="font-medium">
                          {employee.workTime === -1 ? 'No Track' : formatTime(employee.workTime)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Tasks:</span>
                        <span className="font-medium">{employee.tasks.completed}/{employee.tasks.total}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Delay to Finish:</span>
                        <span className={`font-medium ${employee.delayToFinish === -1 ? 'text-gray-500' : getDelayToFinishColor(employee.delayToFinish)}`}>
                          {employee.delayToFinish === -1 ? 'No Track' : formatDelayToFinish(employee.delayToFinish)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    {user?.role === 'admin' && (
                      <div className="flex gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleEditEmployee(employee)}
                        >
                          <Edit3 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

                        {/* Desktop Table View */}
            <div className="hidden lg:block">
              <div className="w-full overflow-hidden rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse bg-white dark:bg-gray-800">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600">
                        <th className="text-left p-2 font-semibold text-gray-700 dark:text-gray-200 w-[180px]">Employee</th>
                        <th className="text-center p-2 font-semibold text-gray-700 dark:text-gray-200 w-[60px]">Days</th>
                        <th className="text-center p-2 font-semibold text-gray-700 dark:text-gray-200 w-[80px]">Work Time</th>
                        <th className="text-center p-2 font-semibold text-gray-700 dark:text-gray-200 w-[60px]">Delay</th>
                        <th className="text-center p-2 font-semibold text-gray-700 dark:text-gray-200 w-[80px]">Overtime</th>
                        <th className="text-center p-2 font-semibold text-gray-700 dark:text-gray-200 w-[90px]">Delay to Finish</th>
                        <th className="text-center p-2 font-semibold text-gray-700 dark:text-gray-200 w-[70px]">Tasks</th>
                        <th className="text-center p-2 font-semibold text-gray-700 dark:text-gray-200 w-[70px]">Reports</th>
                        <th className="text-center p-2 font-semibold text-gray-700 dark:text-gray-200 w-[90px]">Performance</th>
                        <th className="text-center p-2 font-semibold text-gray-700 dark:text-gray-200 w-[70px]">Status</th>
                        <th className="text-center p-2 font-semibold text-gray-700 dark:text-gray-200 w-[80px]">Actions</th>
                      </tr>
                    </thead>
              <tbody>
                {employees.map((employee, index) => (
                  <tr key={employee.id} className={`
                    border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors
                    ${index === 0 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200' : ''}
                  `}>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <div className="relative">
                            <div className={`
                              w-6 h-6 rounded-full flex items-center justify-center font-semibold text-white shadow-md text-xs
                              ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-purple-500'}
                            `}>
                              {employee.name.charAt(0).toUpperCase()}
                            </div>
                            {index === 0 && (
                              <div className="absolute -top-0.5 -right-0.5 bg-yellow-400 rounded-full p-0.5">
                                <Crown className="h-1.5 w-1.5 text-yellow-800" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-gray-900 dark:text-gray-100 text-xs truncate">{employee.name}</span>
                              {index === 0 && (
                                <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-1 py-0.5 flex-shrink-0">
                                  👑
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{employee.position}</div>
                          </div>
                        </div>
                      </td>

                      <td className="text-center p-2">
                        <div className="flex items-center justify-center gap-1">
                          {employee.days === -1 ? (
                            <span className="font-semibold text-gray-500 dark:text-gray-400 text-sm">No Track</span>
                          ) : (
                            <>
                              <Calendar className="h-3 w-3 text-blue-600" />
                              <span className="font-semibold text-blue-700 dark:text-blue-300 text-sm">{employee.days}</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="text-center p-2">
                        <div className="flex items-center justify-center gap-1">
                          {employee.workTime === -1 ? (
                            <span className="font-semibold text-gray-500 dark:text-gray-400 text-sm">No Track</span>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 text-indigo-600" />
                              <span className="font-semibold text-indigo-700 dark:text-indigo-300 text-sm">
                                {formatTime(employee.workTime)}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="text-center p-2">
                        <div className="flex items-center justify-center gap-1">
                          {employee.delay === -1 ? (
                            <span className="font-semibold text-gray-500 dark:text-gray-400 text-sm">No Track</span>
                          ) : (
                            <>
                              <Clock className={`h-3 w-3 ${employee.delay > 0 ? 'text-red-600' : 'text-green-600'}`} />
                              <span className={`font-semibold text-sm ${employee.delay > 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                                {formatTime(employee.delay)}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="text-center p-2">
                        <div className="flex items-center justify-center gap-1">
                          {employee.overtime === -1 ? (
                            <span className="font-semibold text-gray-500 dark:text-gray-400 text-sm">No Track</span>
                          ) : (
                            <>
                              <TrendingUp className="h-3 w-3 text-green-600" />
                              <span className="font-semibold text-green-700 dark:text-green-300 text-sm">
                                {formatTime(employee.overtime)}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="text-center p-2">
                        <div className="flex items-center justify-center gap-1">
                          {employee.delayToFinish === -1 ? (
                            <span className="font-semibold text-gray-500 dark:text-gray-400 text-sm">No Track</span>
                          ) : (
                            <>
                              <Target className={`h-3 w-3 ${employee.delayToFinish > 0 ? 'text-orange-600' : 'text-green-600'}`} />
                              <span className={`font-semibold text-sm ${getDelayToFinishColor(employee.delayToFinish)}`}>
                                {formatDelayToFinish(employee.delayToFinish)}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="text-center p-2">
                        <div className="text-center">
                          <div className="font-semibold text-emerald-700 dark:text-emerald-300 text-xs">
                            {employee.tasks.completed}/{employee.tasks.total}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {employee.tasks.successRate.toFixed(0)}%
                          </div>
                        </div>
                      </td>

                      <td className="text-center p-2">
                        <div className="text-center">
                          <div className="font-semibold text-purple-700 dark:text-purple-300 text-xs">
                            {employee.workReports.submitted}/{employee.workReports.total}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {employee.workReports.completionRate.toFixed(0)}%
                          </div>
                        </div>
                      </td>

                      <td className="text-center p-2">
                        <div className={`
                          px-2 py-1 rounded-full text-center
                          ${index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'}
                        `}>
                          <div className="font-bold text-xs">
                            {employee.performance.toFixed(1)}%
                          </div>
                        </div>
                      </td>

                      <td className="text-center p-2">
                        <Badge className={`${getStatusColor(employee.status)} px-1 py-0.5 text-xs`}>
                          {employee.status}
                        </Badge>
                      </td>

                      <td className="text-center p-2">
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="hover:bg-blue-50 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-700 px-1 py-1 h-6 w-6"
                            onClick={() => handleEditEmployee(employee)}
                          >
                            <Edit3 className="h-3 w-3 text-blue-600" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="hover:bg-red-50 dark:hover:bg-red-900/30 border-red-200 dark:border-red-700 px-1 py-1 h-6 w-6"
                            onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                          >
                            <Trash2 className="h-3 w-3 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {employees.length === 0 && (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No Performance Data</h3>
                  <p className="text-gray-600 dark:text-gray-400">No employee data found for the selected period. Check back after employees have logged work hours.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Edit Employee Sheet */}
    <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Edit Employee
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="Employee name"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Department</label>
            <Select 
              value={editForm.department} 
              onValueChange={(value) => setEditForm({ ...editForm, department: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Customer Service">Customer Service</SelectItem>
                <SelectItem value="Design">Design</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="Content">Content</SelectItem>
                <SelectItem value="Development">Development</SelectItem>
                <SelectItem value="Management">Management</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Position</label>
            <Select 
              value={editForm.position} 
              onValueChange={(value) => setEditForm({ ...editForm, position: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Customer Service">Customer Service</SelectItem>
                <SelectItem value="Designer">Designer</SelectItem>
                <SelectItem value="Media Buyer">Media Buyer</SelectItem>
                <SelectItem value="Copy Writing">Copy Writing</SelectItem>
                <SelectItem value="Content Creator">Content Creator</SelectItem>
                <SelectItem value="Social Media Manager">Social Media Manager</SelectItem>
                <SelectItem value="Developer">Developer</SelectItem>
                <SelectItem value="Manager">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Performance Override (%)</label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={editForm.performance}
              onChange={(e) => setEditForm({ ...editForm, performance: parseFloat(e.target.value) || 0 })}
              placeholder="Performance percentage"
            />
            <p className="text-xs text-gray-500">Leave as calculated value or override manually</p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Status Override</label>
            <Select 
              value={editForm.status} 
              onValueChange={(value) => setEditForm({ ...editForm, status: value as any })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Excellent">Excellent</SelectItem>
                <SelectItem value="Good">Good</SelectItem>
                <SelectItem value="Average">Average</SelectItem>
                <SelectItem value="Poor">Poor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSaveEdit} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsEditSheetOpen(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  </div>
</TooltipProvider>
);
};

export default EditablePerformanceDashboard; 