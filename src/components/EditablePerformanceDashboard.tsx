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
  Sparkles,
  Wrench,
  Database,
  Smartphone,
  Calculator,
  Medal,
  Gem,
  Flame,
  Zap as Lightning,
  Sparkle
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
  delayToFinish: number; // NEW: Smart delay/overtime calculation
  delayToFinishType: 'delay' | 'overtime'; // NEW: Type for color coding
  workReports: {
    submitted: number;
    total: number;
    completionRate: number;
  };
}

interface EditablePerformanceDashboardProps {
  currentMonth?: string;
}

// BALANCED PERFORMANCE SCORING SYSTEM - Fair for everyone
function calcBalancedPerformanceScore(
  daysWorked: number,
  workTimeHours: number,
  delayMinutes: number,
  overtimeHours: number,
  tasksCompleted: number,
  tasksTotal: number,
  reportsSubmitted: number,
  loginCount: number = 0
): number {
  let totalScore = 0;
  let maxPossibleScore = 0;

  // 1. DAYS WORKED POINTS (20 points max)
  // Reward consistency - 1 point per day worked, up to 20 days
  const daysPoints = Math.min(20, daysWorked * 1);
  totalScore += daysPoints;
  maxPossibleScore += 20;
  
  // 2. WORK TIME POINTS (20 points max)
  // Reward productive work time - 0.5 points per hour, up to 40 hours
  const workTimePoints = Math.min(20, workTimeHours * 0.5);
  totalScore += workTimePoints;
  maxPossibleScore += 20;

  // 3. DELAY/PUNCTUALITY POINTS (20 points max)
  // Start with 20 points, deduct for delays
  let punctualityPoints = 20;
  if (delayMinutes > 0) {
    // Deduct 0.2 points per minute of delay
    const delayPenalty = Math.min(20, delayMinutes * 0.2);
    punctualityPoints = Math.max(0, punctualityPoints - delayPenalty);
  }
  totalScore += punctualityPoints;
  maxPossibleScore += 20;

  // 4. OVERTIME BONUS POINTS (10 points max)
  // Reward dedication - 1 point per hour of overtime
  const overtimePoints = Math.min(10, overtimeHours * 1);
  totalScore += overtimePoints;
  maxPossibleScore += 10;

  // 5. TASK COMPLETION POINTS (20 points max)
  // Reward task completion rate
  let taskPoints = 0;
  if (tasksTotal > 0) {
    const taskCompletionRate = tasksCompleted / tasksTotal;
    taskPoints = taskCompletionRate * 20; // 20 points for 100% completion
  } else if (tasksCompleted > 0) {
    // If no total but has completed tasks, give partial credit
    taskPoints = Math.min(15, tasksCompleted * 2);
  }
  totalScore += taskPoints;
  maxPossibleScore += 20;

  // 6. REPORTS POINTS (10 points max)
  // Reward report submission - 2 points per report
  const reportPoints = Math.min(10, reportsSubmitted * 2);
  totalScore += reportPoints;
  maxPossibleScore += 10;

  // Convert to percentage (0-100)
  const finalScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 75;
  
  console.log(`📊 BALANCED SCORE BREAKDOWN:
    Days: ${daysPoints}/20 (${daysWorked} days)
    Work Time: ${workTimePoints.toFixed(1)}/20 (${workTimeHours}h)
    Punctuality: ${punctualityPoints.toFixed(1)}/20 (${delayMinutes}min delay)
    Overtime: ${overtimePoints}/10 (${overtimeHours}h)
    Tasks: ${taskPoints.toFixed(1)}/20 (${tasksCompleted}/${tasksTotal})
    Reports: ${reportPoints}/10 (${reportsSubmitted})
    TOTAL: ${totalScore.toFixed(1)}/${maxPossibleScore} = ${finalScore.toFixed(1)}%`);

  return Math.max(0, Math.min(100, Math.round(finalScore * 100) / 100));
}

// Legacy function for backward compatibility
function calcPerformanceScore(delayMinutes: number, overtimeHours: number = 0): number {
  // Use balanced scoring with default values
  return calcBalancedPerformanceScore(1, 8, delayMinutes, overtimeHours, 0, 0, 0, 0);
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
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<PerformanceData | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  const [editForm, setEditForm] = useState({
    name: '',
    department: '',
    position: '',
    performance: 0,
    status: 'Good' as 'Excellent' | 'Good' | 'Average' | 'Poor',
    days: 0,
    delay: 0,
    overtime: 0,
    workTime: 0,
    delayToFinish: 0,
    tasks: { total: 0, completed: 0 },
    workReports: { submitted: 0, total: 0 }
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

      // Fetch existing admin overrides for this month
      const { data: adminOverrides, error: adminError } = await supabase
        .from('admin_performance_dashboard')
        .select('*')
        .eq('month_year', currentMonth);

      if (adminError) {
        console.error('Error fetching admin overrides:', adminError);
      }

      // Create a map for quick lookup of admin overrides
      const overrideMap = new Map();
      if (adminOverrides) {
        adminOverrides.forEach(override => {
          overrideMap.set(override.employee_id, override);
        });
      }

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

        // **BALANCED PERFORMANCE CALCULATION** - Fair for everyone!
        const performanceScore = calcBalancedPerformanceScore(
          isRemoteRole ? 0 : daysWorked, // Days worked (0 for remote = no tracking)
          isRemoteRole ? 0 : totalWorkTime, // Work time hours
          isRemoteRole ? 0 : totalDelay * 60, // Convert delay hours to minutes
          isRemoteRole ? 0 : totalOvertime, // Overtime hours
          completedTasks, // Tasks completed
          employeeTasks.length, // Total tasks
          employeeReports.length, // Reports submitted
          loginCount // Login count
        );

        // **FIXED**: Calculate "Delay to Finish" with proper logic and colors
        let delayToFinish = 0;
        let delayToFinishType: 'delay' | 'overtime' = 'delay';
        
        if (totalDelay > totalOvertime) {
          // More delay than overtime = BAD (show in RED)
          delayToFinish = totalDelay - totalOvertime;
          delayToFinishType = 'delay';
        } else {
          // More overtime than delay = GOOD (show in GREEN) 
          delayToFinish = totalOvertime - totalDelay;
          delayToFinishType = 'overtime';
        }

        // Determine status
        let status: 'Excellent' | 'Good' | 'Average' | 'Poor';
        if (performanceScore >= 90) status = 'Excellent';
        else if (performanceScore >= 75) status = 'Good';
        else if (performanceScore >= 60) status = 'Average';
        else status = 'Poor';

        // Check for admin overrides and use them if available
        const adminOverride = overrideMap.get(employee.id);
        let finalPerformanceScore = performanceScore;
        let finalStatus = status;
        
        if (adminOverride) {
          console.log(`🔧 Using admin override for ${employee.name}:`, {
            originalPerformance: performanceScore,
            overridePerformance: adminOverride.average_performance_score,
            originalStatus: status,
            overrideStatus: adminOverride.performance_status
          });
          
          // Use admin override values instead of calculated ones
          finalPerformanceScore = adminOverride.average_performance_score || performanceScore;
          finalStatus = adminOverride.performance_status || status;
        }

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
          performance: finalPerformanceScore,
          status: finalStatus,
          delayToFinish: isRemoteRole ? -1 : delayToFinish, // -1 indicates "No Track"
          delayToFinishType: delayToFinishType, // NEW: Type for color coding
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
          performance: finalPerformanceScore.toFixed(1),
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
      status: employee.status,
      days: employee.days === -1 ? 0 : employee.days,
      delay: employee.delay === -1 ? 0 : employee.delay,
      overtime: employee.overtime === -1 ? 0 : employee.overtime,
      workTime: employee.workTime === -1 ? 0 : employee.workTime,
      delayToFinish: employee.delayToFinish === -1 ? 0 : employee.delayToFinish,
      tasks: { total: employee.tasks.total, completed: employee.tasks.completed },
      workReports: { submitted: employee.workReports.submitted, total: employee.workReports.total }
    });
    setIsEditSheetOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingEmployee) return;

    try {
      // First try to update existing record
      const { data: existingRecord, error: fetchError } = await supabase
        .from('admin_performance_dashboard')
        .select('id')
        .eq('employee_id', editingEmployee.id)
        .eq('month_year', currentMonth)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      let updateError;
      if (existingRecord) {
        // Update existing record
      const { error } = await supabase
          .from('admin_performance_dashboard')
        .update({
            average_performance_score: editForm.performance,
            performance_status: editForm.status,
            updated_at: new Date().toISOString()
          })
          .eq('employee_id', editingEmployee.id)
          .eq('month_year', currentMonth);
        
        updateError = error;
      } else {
        // Insert new record (only if none exists)
        const { error } = await supabase
          .from('admin_performance_dashboard')
          .insert({
            employee_id: editingEmployee.id,
            employee_name: editingEmployee.name,
            month_year: currentMonth,
            total_working_days: editingEmployee.days === -1 ? 0 : editingEmployee.days,
            total_delay_minutes: editingEmployee.delay === -1 ? 0 : editingEmployee.delay * 60,
            total_delay_hours: editingEmployee.delay === -1 ? 0 : editingEmployee.delay,
            total_overtime_hours: editingEmployee.overtime === -1 ? 0 : editingEmployee.overtime,
            average_performance_score: editForm.performance,
            performance_status: editForm.status,
            tasks_completed: editingEmployee.tasks.completed,
            tasks_total: editingEmployee.tasks.total,
            reports_submitted: editingEmployee.workReports.submitted,
            reports_total: editingEmployee.workReports.total,
            updated_at: new Date().toISOString()
          });
        
        updateError = error;
      }

      if (updateError) throw updateError;
      
      toast.success('Performance updated successfully');
      setIsEditSheetOpen(false);
      setEditingEmployee(null);
      
      // Refresh the data
      await fetchEmployeeData();
      
    } catch (error) {
      console.error('Error updating performance:', error);
      toast.error(`Failed to update performance: ${error.message}`);
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

  const recalculateForAll = async () => {
    if (!user || user.role !== 'admin') {
      toast.error('Only administrators can recalculate performance');
      return;
    }

    setIsRecalculating(true);
    
    try {
      console.log('🔧 Starting complete performance recalculation for ALL employees...');
      toast.info('📊 Recalculating performance for all employees...');
      
      // Get all employees
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'employee');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        toast.error('Failed to fetch users');
        return;
      }

      if (!users || users.length === 0) {
        toast.info('No users found');
        return;
      }

      console.log(`👥 Found ${users.length} employees to recalculate`);

      let processedCount = 0;
      let updatedCount = 0;
      const monthYear = format(new Date(), 'yyyy-MM');

      // Process each user with enhanced performance calculation
      for (const userRecord of users) {
        try {
          processedCount++;
          console.log(`\n🔄 [${processedCount}/${users.length}] Processing: ${userRecord.name} (${userRecord.position})`);

          // Use the enhanced calculateUserPerformanceFromTasksAndReports function
          const performanceData = await calculateUserPerformanceFromTasksAndReports(userRecord, monthYear);
          
          if (performanceData) {
            // FORCE UPDATE: Delete any existing record and create a new one
            // This ensures manual edits are completely overridden
            await supabase
              .from('admin_performance_dashboard')
              .delete()
              .eq('employee_id', userRecord.id)
              .eq('month_year', monthYear);

            // Create new record with calculated data
            const { error: insertError } = await supabase
              .from('admin_performance_dashboard')
              .insert({
                employee_id: userRecord.id,
                employee_name: userRecord.name,
                month_year: monthYear,
                ...performanceData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (!insertError) {
              console.log(`✅ Recalculated ${userRecord.name}: ${performanceData.average_performance_score}% (${performanceData.performance_status})`);
              updatedCount++;
          } else {
              console.error(`❌ Failed to create ${userRecord.name}:`, insertError);
            }
          }
        } catch (userError) {
          console.error(`❌ Error processing ${userRecord.name}:`, userError);
        }
      }

      if (updatedCount > 0) {
        toast.success(`✅ Successfully recalculated performance for ${updatedCount}/${processedCount} employees`);
        // Refresh the dashboard
      await fetchEmployeeData();
        console.log('🎯 Complete! All employee performance recalculated and manual edits overridden!');
      } else {
        toast.error('❌ No employees were successfully recalculated');
      }
      
    } catch (error) {
      console.error('Error in recalculateForAll:', error);
      toast.error('Failed to complete performance recalculation');
    } finally {
      setIsRecalculating(false);
    }
  };



  // Helper function to calculate user performance from tasks and reports
  const calculateUserPerformanceFromTasksAndReports = async (userRecord: any, monthYear: string) => {
    try {
      const currentDate = new Date(monthYear + '-01');
      const startDate = startOfMonth(currentDate);
      const endDate = endOfMonth(currentDate);

      // Get user's tasks for current month (check both assigned_to and created_by)
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .or(`assigned_to.eq.${userRecord.id},created_by.eq.${userRecord.id}`)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (tasksError) {
        console.error(`Error fetching tasks for ${userRecord.name}:`, tasksError);
        return null;
      }

      // Get user's reports for current month
      const { data: reports, error: reportsError } = await supabase
        .from('work_reports')
        .select('*')
        .eq('user_id', userRecord.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (reportsError) {
        console.error(`Error fetching reports for ${userRecord.name}:`, reportsError);
        return null;
      }

      // Calculate performance metrics
      const totalTasks = tasks?.length || 0;
      const completedTasks = tasks?.filter(task => 
        task.status === 'completed' || 
        task.status === 'Complete' || 
        task.progress_percentage === 100 ||
        task.visual_feeding || 
        task.attachment_file
      ).length || 0;
      const totalReports = reports?.length || 0;

      // Calculate task completion rate
      const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Calculate overall performance score based on tasks and reports for users without tracking
      const baseScore = 75; // Higher base score for users without check-in tracking
      const taskBonus = Math.min(20, taskCompletionRate * 0.2); // Up to 20 points for task completion
      const reportBonus = Math.min(5, totalReports * 1); // Up to 5 points for reports (5 reports = max)
      
      const performanceScore = Math.min(100, Math.max(30, baseScore + taskBonus + reportBonus)); // Min 30% for active users

      console.log(`📊 Performance for ${userRecord.name}: ${totalTasks} tasks, ${completedTasks} completed, ${totalReports} reports, ${performanceScore.toFixed(1)}% score`);

      // Return data in admin_performance_dashboard format
      return {
        total_working_days: 0, // No tracking for remote workers
        total_delay_minutes: 0,
        total_delay_hours: 0,
        total_overtime_hours: 0,
        average_performance_score: Math.round(performanceScore),
        punctuality_percentage: 100, // No delay tracking for remote workers
        performance_status: performanceScore >= 90 ? 'Excellent' : 
                           performanceScore >= 80 ? 'Good' : 
                           performanceScore >= 70 ? 'Needs Improvement' : 'Poor'
      };

    } catch (error) {
      console.error(`Error calculating performance for ${userRecord.name}:`, error);
      return null;
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

  // NEW: Format delay to finish with proper labeling and color coding
  const formatDelayToFinish = (delayToFinish: number, type: 'delay' | 'overtime'): string => {
    if (delayToFinish === 0) return 'Balanced';
    const formattedTime = formatTime(delayToFinish);
    return type === 'delay' ? `${formattedTime} Delay` : `${formattedTime} Overtime`;
  };

  // NEW: Get delay to finish color based on type
  const getDelayToFinishColor = (type: 'delay' | 'overtime'): string => {
    return type === 'delay' ? 'text-red-600 dark:text-red-300' : 'text-green-600 dark:text-green-300';
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

  // Get the top 3 performers automatically based on performance ranking
  const topPerformers = employees.slice(0, 3);
  const bestEmployee = employees.length > 0 ? employees[0] : null;

  return (
    <TooltipProvider>
      <style>
        {`
          @keyframes animation-delay-150 {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 0.3; }
          }
          @keyframes animation-delay-200 {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(0); opacity: 0; }
          }
          @keyframes animation-delay-300 {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(0); opacity: 0; }
          }
          @keyframes animation-delay-500 {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes animation-delay-700 {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(0); opacity: 0; }
          }
          .animation-delay-150 { animation: animation-delay-150 2s ease-in-out infinite; }
          .animation-delay-200 { animation: animation-delay-200 1.5s ease-in-out infinite 0.2s; }
          .animation-delay-300 { animation: animation-delay-300 1.5s ease-in-out infinite 0.3s; }
          .animation-delay-500 { animation: animation-delay-500 3s linear infinite 0.5s; }
          .animation-delay-700 { animation: animation-delay-700 1.5s ease-in-out infinite 0.7s; }
        `}
      </style>
      <div className="space-y-4 sm:space-y-6">
        {/* Top 3 Performers Podium */}
        {topPerformers.length > 0 && (
        <Card className="mb-8 border-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-800 dark:via-indigo-900 dark:to-purple-900 shadow-2xl overflow-hidden relative">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-100/10 via-transparent to-orange-100/10"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500"></div>
          
          <CardContent className="p-6 sm:p-8 relative z-10">
            {/* Podium Title */}
            <div className="text-center mb-8">
              <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
                🏆 Performance Champions 🏆
              </h2>
              <p className="text-gray-600 dark:text-gray-300 font-medium">Top performers of {format(new Date(currentMonth), 'MMMM yyyy')}</p>
            </div>

            {/* Desktop: ENHANCED CHAMPIONS LIST - COMPACT */}
            <div className="hidden lg:block">
              <div className="space-y-4 w-full">
                {topPerformers.slice(0, 3).map((employee, index) => {
                  const titles = ['GOLDEN CHAMPION', 'SILVER MEDAL', 'BRONZE MEDAL'];
                  const colors = [
                    'from-yellow-400 via-orange-500 to-red-600',
                    'from-slate-400 via-gray-500 to-slate-600',
                    'from-amber-600 via-orange-700 to-amber-800'
                  ];
                  const bgColors = [
                    'from-yellow-50 via-orange-50 to-red-50',
                    'from-slate-100 via-gray-100 to-slate-200',
                    'from-amber-100 via-orange-100 to-amber-200'
                  ];
                  const borderColors = [
                    'border-yellow-400',
                    'border-slate-400',
                    'border-amber-600'
                  ];
                  const textColors = [
                    'text-yellow-800',
                    'text-slate-700',
                    'text-amber-800'
                  ];
                  const glowColors = [
                    'shadow-yellow-500/50',
                    'shadow-slate-500/30',
                    'shadow-amber-500/40'
                  ];
                  
                  return (
                    <div key={employee.id} className={`relative group`}>
                      {/* Outer Glow Ring */}
                      <div className={`absolute -inset-1 bg-gradient-to-r ${colors[index]} rounded-xl blur-sm opacity-15 group-hover:opacity-30 transition-all duration-300`}></div>
                      
                      {/* Main Card */}
                      <div className={`relative flex items-center gap-5 p-5 rounded-xl bg-gradient-to-r ${bgColors[index]} border-3 ${borderColors[index]} shadow-xl ${glowColors[index]} group-hover:shadow-2xl transition-all duration-300 group-hover:scale-102 transform`}>
                        
                        {/* Sparkle Effect for Winner */}
                        {index === 0 && (
                          <>
                            <div className="absolute top-2 right-3 text-yellow-400 animate-bounce delay-100 text-sm">✨</div>
                            <div className="absolute bottom-2 right-8 text-orange-400 animate-bounce delay-300 text-sm">⭐</div>
                          </>
                        )}
                        
                        {/* Enhanced Avatar */}
                        <div className="relative flex-shrink-0">
                          {/* Pulsing Background */}
                          {index === 0 && (
                            <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full opacity-15 animate-pulse"></div>
                          )}
                          
                          {/* Performance Ring - Lower Z-Index */}
                          <div className="absolute -inset-1 z-0">
                            <svg className="w-18 h-18 transform -rotate-90" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="6" fill="none" className="text-white/40"/>
                              <circle 
                                cx="50" 
                                cy="50" 
                                r="45" 
                                stroke="currentColor" 
                                strokeWidth="6" 
                                fill="none" 
                                strokeDasharray={`${employee.performance * 2.83} 283`}
                                className={index === 0 ? 'text-yellow-500' : index === 1 ? 'text-slate-500' : 'text-amber-500'}
                                strokeLinecap="round"
                              />
                            </svg>
                          </div>
                          
                          {/* Main Avatar - Higher Z-Index */}
                          <div className={`relative z-10 w-16 h-16 rounded-full bg-gradient-to-br ${colors[index]} flex items-center justify-center font-black text-xl text-white shadow-xl border-3 border-white ring-4 ring-white/30 transform group-hover:rotate-6 transition-all duration-300`}>
                            {employee.name.charAt(0).toUpperCase()}
                          </div>
                          
                          {/* Enhanced Icons - Highest Z-Index */}
                          <div className={`absolute -top-1.5 -right-1.5 z-20 p-1.5 rounded-full bg-white shadow-xl ${index === 0 ? 'animate-bounce' : 'group-hover:scale-110'} transition-all duration-300`}>
                            {index === 0 && <Crown className="h-5 w-5 text-yellow-600" />}
                            {index === 1 && <Medal className="h-5 w-5 text-slate-600" />}
                            {index === 2 && <Award className="h-5 w-5 text-amber-700" />}
                          </div>
                        </div>
                        
                        {/* Enhanced Content */}
                        <div className="flex-1 space-y-2 min-w-0">
                          {/* Name and Title */}
                          <div className="flex items-center gap-3 mb-2">
                            {index === 0 && <Flame className="h-4 w-4 text-orange-500 animate-pulse flex-shrink-0" />}
                            {index === 1 && <Star className="h-4 w-4 text-slate-600 flex-shrink-0" />}
                            {index === 2 && <Trophy className="h-4 w-4 text-amber-700 flex-shrink-0" />}
                            
                            <h4 className={`font-black text-xl ${textColors[index]} group-hover:scale-105 transition-transform duration-300 truncate`}>
                              {employee.name}
                            </h4>
                            
                            <Badge className={`bg-gradient-to-r ${colors[index]} text-white text-sm font-black px-3 py-1.5 shadow-lg transform group-hover:scale-105 transition-all duration-300 flex-shrink-0`}>
                              {titles[index]}
                            </Badge>
                          </div>
                          
                          {/* Position and Performance */}
                          <div className="flex items-center gap-4 flex-wrap">
                            <p className={`text-base ${textColors[index]} font-bold`}>
                              {employee.position}
                            </p>
                            <div className="flex items-center gap-1">
                              <TrendingUp className={`h-4 w-4 ${textColors[index]}`} />
                              <span className={`text-lg font-black ${textColors[index]}`}>
                                {employee.performance.toFixed(1)}%
                    </span>
              </div>
            </div>
                          
                          {/* Enhanced Badges */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className={`text-xs px-2 py-1 rounded-full bg-white/90 ${textColors[index]} font-bold shadow border-2 ${borderColors[index]}`}>
                              #{index + 1} Place
                    </div>
                            
                            {index === 0 && (
                              <>
                                <div className="text-xs px-2 py-1 rounded-full bg-yellow-200 text-yellow-800 font-bold shadow border border-yellow-400">
                                  🏅 Elite
                  </div>
                                <div className="text-xs px-2 py-1 rounded-full bg-orange-200 text-orange-800 font-bold shadow border border-orange-400">
                                  🔥 Star
                                </div>
                              </>
                            )}
                            {index === 1 && (
                              <div className="text-xs px-2 py-1 rounded-full bg-slate-200 text-slate-800 font-bold shadow border border-slate-400">
                                🏆 Runner-up
                              </div>
                            )}
                            {index === 2 && (
                              <div className="text-xs px-2 py-1 rounded-full bg-amber-200 text-amber-800 font-bold shadow border border-amber-500">
                                🥉 Third
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Performance Percentage Badge */}
                        <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br ${colors[index]} text-white shadow-xl transform group-hover:scale-110 transition-all duration-300 flex-shrink-0`}>
                          <span className="text-sm font-black">{Math.round(employee.performance)}%</span>
                          <span className="text-xs font-semibold">SCORE</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
                  
            {/* Mobile: ENHANCED CHAMPIONS LIST - COMPACT */}
            <div className="lg:hidden space-y-3">
              {topPerformers.slice(0, 3).map((employee, index) => {
                const titles = ['CHAMPION', 'SILVER', 'BRONZE'];
                const colors = [
                  'from-yellow-400 via-orange-500 to-red-600',
                  'from-slate-400 via-gray-500 to-slate-600',
                  'from-amber-600 via-orange-700 to-amber-800'
                ];
                const bgColors = [
                  'from-yellow-50 via-orange-50 to-red-50',
                  'from-slate-100 via-gray-100 to-slate-200',
                  'from-amber-100 via-orange-100 to-amber-200'
                ];
                const borderColors = [
                  'border-yellow-400',
                  'border-slate-400',
                  'border-amber-600'
                ];
                const textColors = [
                  'text-yellow-800',
                  'text-slate-700',
                  'text-amber-800'
                ];
                const glowColors = [
                  'shadow-yellow-500/50',
                  'shadow-slate-500/30',
                  'shadow-amber-500/40'
                ];
                
                return (
                  <div key={employee.id} className={`relative group`}>
                    {/* Outer Glow Ring */}
                    <div className={`absolute -inset-0.5 bg-gradient-to-r ${colors[index]} rounded-lg blur-sm opacity-10 group-active:opacity-25 transition-all duration-300`}></div>
                    
                    {/* Main Card */}
                    <div className={`relative flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r ${bgColors[index]} border-2 ${borderColors[index]} shadow-lg ${glowColors[index]} group-active:shadow-xl transition-all duration-300 group-active:scale-101 transform`}>
                      
                      {/* Sparkle Effect for Winner */}
                      {index === 0 && (
                        <>
                          <div className="absolute top-1 right-2 text-yellow-400 animate-bounce delay-100 text-xs">✨</div>
                          <div className="absolute bottom-1 right-6 text-orange-400 animate-bounce delay-300 text-xs">⭐</div>
                        </>
                      )}
                      
                      {/* Enhanced Avatar */}
                      <div className="relative flex-shrink-0">
                        {/* Pulsing Background */}
                        {index === 0 && (
                          <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full opacity-10 animate-pulse"></div>
                        )}
                        
                        {/* Performance Mini Ring - Lower Z-Index */}
                        <div className="absolute -inset-0.5 z-0">
                          <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="8" fill="none" className="text-white/40"/>
                            <circle 
                              cx="50" 
                              cy="50" 
                              r="45" 
                              stroke="currentColor" 
                              strokeWidth="8" 
                              fill="none" 
                              strokeDasharray={`${employee.performance * 2.83} 283`}
                              className={index === 0 ? 'text-yellow-500' : index === 1 ? 'text-slate-500' : 'text-amber-500'}
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                        
                        {/* Main Avatar - Higher Z-Index */}
                        <div className={`relative z-10 w-12 h-12 rounded-full bg-gradient-to-br ${colors[index]} flex items-center justify-center font-black text-base text-white shadow-lg border-2 border-white ring-2 ring-white/30 transform group-active:rotate-3 transition-all duration-300`}>
                          {employee.name.charAt(0).toUpperCase()}
                        </div>
                        
                        {/* Enhanced Icons - Highest Z-Index */}
                        <div className={`absolute -top-1 -right-1 z-20 p-1 rounded-full bg-white shadow-md ${index === 0 ? 'animate-bounce' : 'group-active:scale-110'} transition-all duration-300`}>
                          {index === 0 && <Crown className="h-3 w-3 text-yellow-600" />}
                          {index === 1 && <Medal className="h-3 w-3 text-slate-600" />}
                          {index === 2 && <Award className="h-3 w-3 text-amber-700" />}
                        </div>
                      </div>
                      
                      {/* Enhanced Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        {/* Name and Icon */}
                        <div className="flex items-center gap-2">
                          {index === 0 && <Flame className="h-3 w-3 text-orange-500 animate-pulse flex-shrink-0" />}
                          {index === 1 && <Star className="h-3 w-3 text-slate-600 flex-shrink-0" />}
                          {index === 2 && <Trophy className="h-3 w-3 text-amber-700 flex-shrink-0" />}
                          
                          <h4 className={`font-black text-base ${textColors[index]} truncate`}>
                            {employee.name}
                          </h4>
                        </div>
                        
                        {/* Title Badge */}
                        <Badge className={`bg-gradient-to-r ${colors[index]} text-white text-xs font-black px-1.5 py-0.5 shadow-md w-fit`}>
                          {titles[index]}
                      </Badge>
                        
                        {/* Position and Performance */}
                        <div className="space-y-0.5">
                          <p className={`text-xs ${textColors[index]} font-bold truncate`}>
                            {employee.position}
                          </p>
                          <div className="flex items-center gap-1">
                            <TrendingUp className={`h-3 w-3 ${textColors[index]} flex-shrink-0`} />
                            <span className={`text-sm font-black ${textColors[index]}`}>
                              {employee.performance.toFixed(1)}%
                            </span>
                    </div>
                  </div>
                        
                        {/* Enhanced Badges */}
                        <div className="flex flex-wrap items-center gap-1">
                          <div className={`text-xs px-1.5 py-0.5 rounded-full bg-white/90 ${textColors[index]} font-bold shadow border ${borderColors[index]}`}>
                            #{index + 1}
                </div>
                
                          {index === 0 && (
                            <>
                              <div className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-200 text-yellow-800 font-bold shadow border border-yellow-400">
                                🏅 Elite
              </div>
                              <div className="text-xs px-1.5 py-0.5 rounded-full bg-orange-200 text-orange-800 font-bold shadow border border-orange-400">
                                🔥 Star
            </div>
                            </>
                          )}
                          {index === 1 && (
                            <div className="text-xs px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold shadow border border-slate-400">
                              🏆 2nd
                    </div>
                          )}
                          {index === 2 && (
                            <div className="text-xs px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-800 font-bold shadow border border-amber-500">
                              🥉 3rd
                            </div>
                          )}
                    </div>
                  </div>
                  
                      {/* Performance Score */}
                      <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br ${colors[index]} text-white shadow-lg transform group-active:scale-110 transition-all duration-300 flex-shrink-0`}>
                        <span className="text-xs font-black">{Math.round(employee.performance)}%</span>
                        <span className="text-xs font-semibold">SCORE</span>
              </div>
                  </div>
                </div>
                );
              })}
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
                      onClick={recalculateForAll}
                      disabled={isRecalculating}
                      variant="secondary"
                size="sm"
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs sm:text-sm"
                    >
                      {isRecalculating ? (
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 animate-spin" />
                      ) : (
                        <Calculator className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      )}
                      📊 Recalculate for All
              </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>📊 Complete performance recalculation for ALL employees - combines check-in data with tasks and reports</p>
                  </TooltipContent>
                </Tooltip>
            </div>
            </CardTitle>
        </CardHeader>
                    <CardContent className="p-3 sm:p-6">
            {/* Mobile Card View */}
            <div className="block lg:hidden space-y-4">
              {employees.map((employee, index) => {
                // Enhanced medal styling for top 3 with special effects
                const getMedalStyling = (rank: number) => {
                  switch(rank) {
                    case 0: return {
                      border: 'border-4 border-yellow-400 shadow-2xl shadow-yellow-500/50',
                      bg: 'bg-gradient-to-br from-yellow-100 via-orange-100 to-red-100 dark:from-yellow-950/40 dark:via-orange-950/40 dark:to-red-950/40 relative overflow-hidden',
                      avatar: 'bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 shadow-xl border-4 border-yellow-300',
                      icon: <Crown className="h-6 w-6 text-yellow-100 animate-bounce" />,
                      iconBg: 'bg-gradient-to-br from-yellow-600 to-orange-600',
                      specialEffect: '',
                      nameIcon: <Flame className="h-5 w-5 text-orange-500" />,
                      badge: 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white font-bold shadow-lg',
                      nameStyle: 'text-orange-700 dark:text-orange-300 font-bold text-lg',
                      positionStyle: 'text-orange-600 dark:text-orange-400 font-semibold',
                      cardHover: 'hover:shadow-2xl hover:shadow-yellow-500/60'
                    };
                    case 1: return {
                      border: 'border-4 border-slate-400 shadow-xl shadow-slate-500/30',
                      bg: 'bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200 dark:from-slate-950/40 dark:via-gray-950/40 dark:to-slate-950/40',
                      avatar: 'bg-gradient-to-br from-slate-500 via-gray-600 to-slate-700 shadow-lg border-4 border-slate-300',
                      icon: <Medal className="h-6 w-6 text-slate-100" />,
                      iconBg: 'bg-gradient-to-br from-slate-600 to-gray-700',
                      specialEffect: '',
                      nameIcon: <Star className="h-5 w-5 text-slate-600" />,
                      badge: 'bg-gradient-to-r from-slate-500 via-gray-600 to-slate-700 text-white font-bold shadow-lg',
                      nameStyle: 'text-slate-700 dark:text-slate-300 font-bold text-lg',
                      positionStyle: 'text-slate-600 dark:text-slate-400 font-semibold',
                      cardHover: 'hover:shadow-xl hover:shadow-slate-500/40'
                    };
                    case 2: return {
                      border: 'border-4 border-amber-600 shadow-xl shadow-amber-500/40',
                      bg: 'bg-gradient-to-br from-amber-200 via-orange-200 to-amber-300 dark:from-amber-900/50 dark:via-orange-900/50 dark:to-amber-900/50',
                      avatar: 'bg-gradient-to-br from-amber-700 via-amber-800 to-orange-900 shadow-lg border-4 border-amber-600',
                      icon: <Award className="h-6 w-6 text-amber-100" />,
                      iconBg: 'bg-gradient-to-br from-amber-700 to-orange-900',
                      specialEffect: '',
                      nameIcon: <Trophy className="h-5 w-5 text-amber-700" />,
                      badge: 'bg-gradient-to-r from-amber-700 via-amber-800 to-orange-900 text-white font-bold shadow-lg',
                      nameStyle: 'text-amber-700 dark:text-amber-300 font-bold text-lg',
                      positionStyle: 'text-amber-600 dark:text-amber-400 font-semibold',
                      cardHover: 'hover:shadow-xl hover:shadow-amber-500/50'
                    };
                    default: return {
                      border: 'border-2 border-gray-200 dark:border-gray-700',
                      bg: 'bg-white dark:bg-gray-800',
                      avatar: 'bg-gradient-to-br from-blue-500 to-purple-500',
                      icon: null,
                      iconBg: '',
                      specialEffect: '',
                      nameIcon: null,
                      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
                      nameStyle: 'text-gray-900 dark:text-gray-100 font-semibold',
                      positionStyle: 'text-gray-600 dark:text-gray-400',
                      cardHover: 'hover:shadow-lg'
                    };
                  }
                };
                
                const styling = getMedalStyling(index);
                
                return (
                <Card key={employee.id} className={`
                  border transition-all duration-300 hover:scale-105 transform
                  ${styling.border} ${styling.bg} ${styling.specialEffect} ${styling.cardHover}
                `}>
                  <CardContent className="p-4">
                    {/* Employee Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-white shadow-xl text-xl ${styling.avatar}`}>
                          {employee.name.charAt(0).toUpperCase()}
                        </div>
                        {styling.icon && (
                          <div className={`absolute -top-2 -right-2 rounded-full p-1.5 shadow-lg ${styling.iconBg}`}>
                            {styling.icon}
                      </div>
                        )}
                        </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {styling.nameIcon && styling.nameIcon}
                          <h3 className={styling.nameStyle || "font-semibold text-gray-900 dark:text-gray-100"}>{employee.name}</h3>
                          {index <= 2 && (
                            <Badge className={`${styling.badge} text-xs px-2 py-1 font-bold`}>
                              #{index + 1}
                            </Badge>
                          )}
                          </div>
                        <p className={`text-sm ${styling.positionStyle || "text-gray-600 dark:text-gray-400"}`}>{employee.position}</p>
                        <Badge variant="outline" className="text-xs mt-1">{employee.department}</Badge>
                          </div>
                        </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className={`text-center p-3 rounded-lg border ${
                        index === 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 shadow-lg' :
                        index === 1 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 shadow-md' :
                        index === 2 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 shadow-md' :
                        'bg-blue-50 dark:bg-blue-900/20 border-blue-200'
                      }`}>
                        <Calendar className={`h-5 w-5 text-blue-600 mx-auto mb-1`} />
                        <div className={`text-lg font-bold text-blue-700 dark:text-blue-300`}>
                          {employee.days === -1 ? 'No Track' : employee.days}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">Working Days</div>
                            </div>
                      <div className={`text-center p-3 rounded-lg ${
                        index === 0 ? 'bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 dark:from-yellow-900/20 dark:via-orange-900/20 dark:to-red-900/20 border-2 border-yellow-400 shadow-lg' :
                        index === 1 ? 'bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 dark:from-slate-900/20 dark:via-gray-900/20 dark:to-slate-900/20 border-2 border-slate-400 shadow-md' :
                        index === 2 ? 'bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-amber-900/20 border-2 border-amber-500 shadow-md' :
                        'bg-purple-50 dark:bg-purple-900/20'
                      }`}>
                        <TrendingUp className={`h-4 w-4 mx-auto mb-1 ${
                          index === 0 ? 'text-orange-600' :
                          index === 1 ? 'text-slate-600' :
                          index === 2 ? 'text-amber-600' :
                          'text-purple-600'
                        }`} />
                        <div className={`text-lg font-bold ${
                          index === 0 ? 'text-orange-700 dark:text-orange-300' :
                          index === 1 ? 'text-slate-700 dark:text-slate-300' :
                          index === 2 ? 'text-amber-700 dark:text-amber-300' :
                          'text-purple-700 dark:text-purple-300'
                        }`}>
                          {employee.performance.toFixed(1)}%
                          </div>
                        <div className={`text-xs ${
                          index === 0 ? 'text-orange-600 dark:text-orange-400' :
                          index === 1 ? 'text-slate-600 dark:text-slate-400' :
                          index === 2 ? 'text-amber-600 dark:text-amber-400' :
                          'text-purple-600 dark:text-purple-400'
                        }`}>
                          Performance
                            </div>
                          </div>
                        </div>

                    {/* Secondary Metrics */}
                    <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                      <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                        index === 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 shadow-md' :
                        index === 1 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 shadow-sm' :
                        index === 2 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 shadow-sm' :
                        'bg-red-50 dark:bg-red-900/20 border-red-200'
                      }`}>
                        <Clock className={`h-4 w-4 text-red-600`} />
                        <span className="text-red-700 dark:text-red-300 font-medium">
                          {employee.delay === -1 ? 'No Track' : `${formatTime(employee.delay)} Delay`}
                        </span>
                        </div>
                      <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                        index === 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 shadow-md' :
                        index === 1 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 shadow-sm' :
                        index === 2 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 shadow-sm' :
                        'bg-green-50 dark:bg-green-900/20 border-green-200'
                      }`}>
                        <TrendingUp className={`h-4 w-4 text-green-600`} />
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
                        <span className={`font-medium ${employee.delayToFinish === -1 ? 'text-gray-500' : getDelayToFinishColor(employee.delayToFinishType)}`}>
                          {employee.delayToFinish === -1 ? 'No Track' : formatDelayToFinish(employee.delayToFinish, employee.delayToFinishType)}
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
                );
              })}
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
                {employees.map((employee, index) => {
                  // Medal styling for desktop table
                  const getTableStyling = (rank: number) => {
                    switch(rank) {
                      case 0: return {
                        row: 'bg-gradient-to-r from-yellow-100 via-orange-100 to-red-100 dark:from-yellow-950/40 dark:via-orange-950/40 dark:to-red-950/40 border-4 border-yellow-400 shadow-2xl shadow-yellow-500/50',
                        avatar: 'bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 border-4 border-yellow-300 shadow-xl',
                        icon: <Crown className="h-4 w-4 text-yellow-100 animate-bounce" />,
                        iconBg: 'bg-gradient-to-br from-yellow-600 to-orange-600',
                        nameIcon: <Flame className="h-3 w-3 text-orange-500" />,
                        performance: 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white shadow-xl font-bold',
                        badge: 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white font-bold'
                      };
                      case 1: return {
                        row: 'bg-gradient-to-r from-slate-100 via-gray-100 to-slate-200 dark:from-slate-950/40 dark:via-gray-950/40 dark:to-slate-950/40 border-4 border-slate-400 shadow-xl shadow-slate-500/30',
                        avatar: 'bg-gradient-to-br from-slate-500 via-gray-600 to-slate-700 border-4 border-slate-300 shadow-lg',
                        icon: <Medal className="h-4 w-4 text-slate-100" />,
                        iconBg: 'bg-gradient-to-br from-slate-600 to-gray-700',
                        nameIcon: <Star className="h-3 w-3 text-slate-600" />,
                        performance: 'bg-gradient-to-r from-slate-500 via-gray-600 to-slate-700 text-white shadow-lg font-bold',
                        badge: 'bg-gradient-to-r from-slate-500 via-gray-600 to-slate-700 text-white font-bold'
                      };
                                              case 2: return {
                          row: 'bg-gradient-to-r from-amber-200 via-orange-200 to-amber-300 dark:from-amber-900/50 dark:via-orange-900/50 dark:to-amber-900/50 border-4 border-amber-600 shadow-xl shadow-amber-500/40',
                          avatar: 'bg-gradient-to-br from-amber-700 via-amber-800 to-orange-900 border-4 border-amber-600 shadow-lg',
                          icon: <Award className="h-4 w-4 text-amber-100" />,
                          iconBg: 'bg-gradient-to-br from-amber-700 to-orange-900',
                          nameIcon: <Trophy className="h-3 w-3 text-amber-700" />,
                          performance: 'bg-gradient-to-r from-amber-700 via-amber-800 to-orange-900 text-white shadow-lg font-bold',
                          badge: 'bg-gradient-to-r from-amber-700 via-amber-800 to-orange-900 text-white font-bold'
                        };
                      default: return {
                        row: 'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                        avatar: 'bg-gradient-to-br from-blue-500 to-purple-500',
                        icon: null,
                        iconBg: '',
                        nameIcon: null,
                        performance: 'bg-gradient-to-r from-purple-500 to-blue-500 text-white',
                        badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      };
                    }
                  };
                  
                  const tableStyling = getTableStyling(index);
                  
                  return (
                  <tr key={employee.id} className={`
                    border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors
                    ${tableStyling.row}
                  `}>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-lg text-sm ${tableStyling.avatar}`}>
                              {employee.name.charAt(0).toUpperCase()}
                                </div>
                            {tableStyling.icon && (
                              <div className={`absolute -top-1 -right-1 rounded-full p-1 shadow-md ${tableStyling.iconBg}`}>
                                {tableStyling.icon}
                                </div>
                            )}
                              </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {tableStyling.nameIcon && tableStyling.nameIcon}
                              <span className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate">{employee.name}</span>
                              {index <= 2 && (
                                <Badge className={`${tableStyling.badge} text-xs px-2 py-0.5 flex-shrink-0 font-bold`}>
                                  #{index + 1}
                                </Badge>
                              )}
                              </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 truncate font-medium">{employee.position}</div>
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
                              <Target className={`h-3 w-3 ${employee.delayToFinishType === 'delay' ? 'text-red-600' : 'text-green-600'}`} />
                              <span className={`font-semibold text-sm ${getDelayToFinishColor(employee.delayToFinishType)}`}>
                                {formatDelayToFinish(employee.delayToFinish, employee.delayToFinishType)}
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
                        <div className={`px-2 py-1 rounded-full text-center ${tableStyling.performance}`}>
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
                  );
                })}
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
            Quick Edit Performance
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
          
          {/* Quick Edit - Status & Performance Only */}
          <div className="border-t pt-4 space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Quick Performance Edit
            </h4>
            
            <div className="space-y-4">
          <div className="space-y-2">
                <label className="text-sm font-medium">Performance Score (%)</label>
                        <Input
                          type="number"
              min="0"
              max="100"
              step="0.1"
              value={editForm.performance}
              onChange={(e) => setEditForm({ ...editForm, performance: parseFloat(e.target.value) || 0 })}
              placeholder="Performance percentage"
                  className="text-lg font-semibold"
                />
                <p className="text-xs text-gray-500">Adjust the employee's performance score</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select 
                  value={editForm.status} 
                  onValueChange={(value) => setEditForm({ ...editForm, status: value as any })}
                >
                  <SelectTrigger className="text-base">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Excellent">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        Excellent
                      </div>
                    </SelectItem>
                    <SelectItem value="Good">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        Good
                      </div>
                    </SelectItem>
                    <SelectItem value="Average">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        Average
                      </div>
                    </SelectItem>
                    <SelectItem value="Poor">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        Poor
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Set the employee's overall performance status</p>
              </div>
            </div>

            {/* Read-only info */}
            <div className="bg-gray-50 p-3 rounded-lg border">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Current Metrics (Read-only)</h5>
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                <div>Days: {editingEmployee?.days === -1 ? 'No Track' : editingEmployee?.days || 0}</div>
                <div>Delay: {editingEmployee?.delay === -1 ? 'No Track' : formatHoursAndMinutes(editingEmployee?.delay || 0)}</div>
                <div>Overtime: {editingEmployee?.overtime === -1 ? 'No Track' : formatHoursAndMinutes(editingEmployee?.overtime || 0)}</div>
                <div>Tasks: {editingEmployee?.tasks.completed || 0}/{editingEmployee?.tasks.total || 0}</div>
              </div>
            </div>
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