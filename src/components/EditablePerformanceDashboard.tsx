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
  Sparkle,
  MoreVertical
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
import { assignDiamondRank, removeDiamondRank } from '@/lib/employeesApi';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Diamond Icon Component
const DiamondIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 3h12l4 6-10 13L2 9Z"></path>
    <path d="M11 3 8 9l4 13 4-13-3-6"></path>
    <path d="M2 9h20"></path>
  </svg>
);

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
  // Diamond rank fields
  diamondRank?: boolean;
  diamondRankAssignedBy?: string;
  diamondRankAssignedAt?: string;
}

interface EditablePerformanceDashboardProps {
  currentMonth?: string;
}

// ENHANCED PERFORMANCE SCORING SYSTEM - Based on User Requirements
function calcImprovedPerformanceScore(
  daysWorked: number,
  workTimeHours: number,
  delayMinutes: number,
  overtimeHours: number,
  tasksCompleted: number,
  tasksTotal: number,
  reportsSubmitted: number,
  expectedReports: number,
  averageStarRating: number = 0,
  totalRatingsCount: number = 0,
  tasksDelayed: number = 0,
  tasksUnfinished: number = 0,
  isRemoteWorker: boolean = false
): number {
  let totalScore = 0;

  console.log(`🎯 ENHANCED PERFORMANCE CALCULATION FOR:
    Days Worked: ${daysWorked} ${isRemoteWorker ? '(Remote - No tracking)' : ''}
    Work Hours: ${workTimeHours}
    Delay Minutes: ${delayMinutes}
    Overtime Hours: ${overtimeHours}
    Tasks: ${tasksCompleted}/${tasksTotal} (Delayed: ${tasksDelayed}, Unfinished: ${tasksUnfinished})
    Reports: ${reportsSubmitted}/${expectedReports}
    Star Rating: ${averageStarRating}⭐ (${totalRatingsCount} ratings)
    Remote Worker: ${isRemoteWorker}`);

  if (isRemoteWorker) {
    // **REMOTE WORKER CALCULATION** - Based on Tasks + Reports + Ratings ONLY
    console.log('📱 Remote Worker - Using Tasks + Reports + Ratings calculation');
    
    // 1. TASK PERFORMANCE (50 points max) - Main scoring for remote workers
    let taskPoints = 0;
    if (tasksTotal > 0) {
      const taskCompletionRate = tasksCompleted / tasksTotal;
      
      // Base points for completion rate
      taskPoints = taskCompletionRate * 40; // Up to 40 points for 100% completion
      
      // BONUS: Extra points for completed tasks (+2 per completed task, max 10 bonus)
      const completionBonus = Math.min(10, tasksCompleted * 2);
      taskPoints += completionBonus;
      
      // PENALTY: Heavy penalty for delayed tasks (-5 per delayed task)
      const delayedPenalty = tasksDelayed * 5;
      taskPoints -= delayedPenalty;
      
      // PENALTY: Severe penalty for unfinished tasks (-7 per unfinished task)
      const unfinishedPenalty = tasksUnfinished * 7;
      taskPoints -= unfinishedPenalty;
      
      console.log(`📋 Task Analysis: Base ${(taskCompletionRate * 40).toFixed(1)} + Bonus ${completionBonus} - Delayed ${delayedPenalty} - Unfinished ${unfinishedPenalty} = ${taskPoints.toFixed(1)}`);
    } else if (tasksCompleted > 0) {
      // If no total but has completed tasks, give credit
      taskPoints = Math.min(30, tasksCompleted * 3);
    }
    totalScore += Math.max(0, taskPoints); // Don't go below 0
    
    // 2. DAILY REPORTS (30 points max) - Important for remote workers
    let reportPoints = 0;
    if (expectedReports > 0) {
      const reportCompletionRate = reportsSubmitted / expectedReports;
      reportPoints = reportCompletionRate * 30; // Up to 30 points for 100% completion
      
      // PENALTY: Missing reports are critical for remote workers (-4 per missing report)
      const missedReports = Math.max(0, expectedReports - reportsSubmitted);
      const forgottenReportsPenalty = missedReports * 4;
      reportPoints -= forgottenReportsPenalty;
    } else if (reportsSubmitted > 0) {
      // If no expected reports but has submitted some, give credit
      reportPoints = Math.min(25, reportsSubmitted * 3);
    }
    totalScore += Math.max(0, reportPoints);
    
    // 3. STAR RATINGS (20 points max) - Quality indicator for remote workers
    let starRatingBonus = 0;
    if (totalRatingsCount > 0 && averageStarRating > 0) {
      if (averageStarRating >= 5.0) {
        starRatingBonus = 20; // Excellent: +20 points (higher for remote)
      } else if (averageStarRating >= 4.5) {
        starRatingBonus = 15; // Very Good: +15 points
      } else if (averageStarRating >= 4.0) {
        starRatingBonus = 10; // Good: +10 points
      } else if (averageStarRating >= 3.5) {
        starRatingBonus = 5;  // Average: +5 points
      } else if (averageStarRating >= 3.0) {
        starRatingBonus = 0;  // Neutral: no change
      } else if (averageStarRating >= 2.0) {
        starRatingBonus = -8; // Poor: -8 points
      } else {
        starRatingBonus = -15; // Very Poor: -15 points
      }
    }
    totalScore += starRatingBonus;
    
    console.log(`📊 REMOTE WORKER SCORE BREAKDOWN:
      Task Performance: +${Math.max(0, taskPoints).toFixed(1)} points (${tasksCompleted}/${tasksTotal})
      Daily Reports: +${Math.max(0, reportPoints).toFixed(1)} points (${reportsSubmitted}/${expectedReports})
      Star Rating: ${starRatingBonus > 0 ? '+' : ''}${starRatingBonus} points (${averageStarRating}⭐)
      FINAL SCORE: ${Math.max(0, Math.min(100, totalScore)).toFixed(1)}%`);
    
  } else {
    // **OFFICE WORKER CALCULATION** - Include check-in/out + Tasks + Reports + Ratings
    console.log('🏢 Office Worker - Using full calculation with check-in/out');
    
    // 1. TOTAL DAYS WORK (20 points max) - Increases score
    const daysPoints = Math.min(20, daysWorked * 1.0); // 1.0 points per day worked
    totalScore += daysPoints;
    
    // 2. TOTAL REGULAR HOURS (20 points max) - Increases score
    const regularHoursPoints = Math.min(20, workTimeHours * 0.6); // 0.6 points per hour
    totalScore += regularHoursPoints;

    // 3. DELAY TIME PENALTY (up to -25 points) - Decreases score
    let delayPenalty = 0;
    if (delayMinutes > 0) {
      // Heavy penalty for delays: -0.4 points per minute
      delayPenalty = Math.min(25, delayMinutes * 0.4);
      totalScore -= delayPenalty;
    }

    // 4. OVERTIME (NO BONUS) - User specified overtime should NOT increase score
    // Overtime is neutral - doesn't add or subtract points

    // 5. ENHANCED TASK PERFORMANCE (25 points max) - Critical scoring
    let taskPoints = 0;
    if (tasksTotal > 0) {
      const taskCompletionRate = tasksCompleted / tasksTotal;
      
      // Base points for completion rate
      taskPoints = taskCompletionRate * 20; // Up to 20 points for 100% completion
      
      // BONUS: Extra points for completed tasks (+1 per completed task, max 5 bonus)
      const completionBonus = Math.min(5, tasksCompleted * 1);
      taskPoints += completionBonus;
      
      // PENALTY: Heavy penalty for delayed tasks (-3 per delayed task)
      const delayedPenalty = tasksDelayed * 3;
      taskPoints -= delayedPenalty;
      
      // PENALTY: Severe penalty for unfinished tasks (-5 per unfinished task)
      const unfinishedPenalty = tasksUnfinished * 5;
      taskPoints -= unfinishedPenalty;
      
    } else if (tasksCompleted > 0) {
      // If no total but has completed tasks, give partial credit
      taskPoints = Math.min(15, tasksCompleted * 2);
    }
    totalScore += Math.max(0, taskPoints); // Don't go below 0

    // 6. REPORTS COMPLETION (20 points max) - Increases score
    let reportPoints = 0;
    if (expectedReports > 0) {
      const reportCompletionRate = reportsSubmitted / expectedReports;
      reportPoints = reportCompletionRate * 20; // Up to 20 points for 100% completion
      
      // FORGOTTEN REPORTS PENALTY - Additional penalty for missing reports
      const missedReports = Math.max(0, expectedReports - reportsSubmitted);
      const forgottenReportsPenalty = missedReports * 3; // -3 points per missed report
      reportPoints -= forgottenReportsPenalty;
    } else if (reportsSubmitted > 0) {
      // If no expected reports but has submitted some, give partial credit
      reportPoints = Math.min(15, reportsSubmitted * 2);
    }
    totalScore += Math.max(0, reportPoints);

    // 7. STAR RATINGS BONUS (up to +15 points or -10 penalty) - Increases/decreases score
    let starRatingBonus = 0;
    if (totalRatingsCount > 0 && averageStarRating > 0) {
      if (averageStarRating >= 5.0) {
        starRatingBonus = 15; // Excellent: +15 points
      } else if (averageStarRating >= 4.5) {
        starRatingBonus = 12; // Very Good: +12 points
      } else if (averageStarRating >= 4.0) {
        starRatingBonus = 8;  // Good: +8 points
      } else if (averageStarRating >= 3.5) {
        starRatingBonus = 4;  // Average: +4 points
      } else if (averageStarRating >= 3.0) {
        starRatingBonus = 0;  // Neutral: no change
      } else if (averageStarRating >= 2.0) {
        starRatingBonus = -5; // Poor: -5 points
      } else {
        starRatingBonus = -10; // Very Poor: -10 points
      }
    }
    totalScore += starRatingBonus;

    console.log(`📊 OFFICE WORKER SCORE BREAKDOWN:
      Days Worked: +${daysPoints.toFixed(1)} points (${daysWorked} days)
      Regular Hours: +${regularHoursPoints.toFixed(1)} points (${workTimeHours}h)
      Delay Penalty: -${delayPenalty.toFixed(1)} points (${delayMinutes}min delay)
      Overtime: 0 points (${overtimeHours}h - neutral)
      Task Performance: +${Math.max(0, taskPoints).toFixed(1)} points (${tasksCompleted}/${tasksTotal}, Delayed: ${tasksDelayed}, Unfinished: ${tasksUnfinished})
      Reports: +${Math.max(0, reportPoints).toFixed(1)} points (${reportsSubmitted}/${expectedReports})
      Star Rating: ${starRatingBonus > 0 ? '+' : ''}${starRatingBonus} points (${averageStarRating}⭐)
      FINAL SCORE: ${Math.max(0, Math.min(100, totalScore)).toFixed(1)}%`);
  }

  // Convert to percentage (0-100)
  const finalScore = Math.max(0, Math.min(100, totalScore));
  
  return Math.round(finalScore * 100) / 100;
}

// Legacy function for backward compatibility
function calcPerformanceScore(delayMinutes: number, overtimeHours: number = 0): number {
  // Use improved scoring with default values
  return calcImprovedPerformanceScore(1, 8, delayMinutes, overtimeHours, 0, 0, 0, 1, 0, 0, 0, 0, false);
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

  // 🤖 Automatic performance calculation DISABLED
  // useEffect(() => {
  //   const autoCalculate = async () => {
  //     // Wait for data to load, then auto-calculate
  //     if (!isRecalculating && !isLoading && employees.length > 0 && user?.role === 'admin') {
  //       console.log('🤖 Auto-calculating performance for all employees...');
  //       setTimeout(async () => {
  //         await recalculateForAll();
  //       }, 1500); // 1.5 second delay to ensure data is fully loaded
  //     }
  //   };

  //   autoCalculate();
  // }, [employees.length, isLoading]); // Trigger when employees data changes and loading completes

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
        .select('id, name, department, position, role, diamond_rank, diamond_rank_assigned_by, diamond_rank_assigned_at')
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

      // Fetch rating data for ALL employees
      const { data: employeeRatingsData, error: employeeRatingsError } = await supabase
        .from('employee_ratings')
        .select('*')
        .gte('rated_at', startDate.toISOString())
        .lte('rated_at', endDate.toISOString());

      if (employeeRatingsError) {
        console.error('Employee ratings error:', employeeRatingsError);
      }

      const { data: taskRatingsData, error: taskRatingsError } = await supabase
        .from('task_ratings')
        .select('task_id, rating, rated_at, tasks!inner(assigned_to)')
        .gte('rated_at', startDate.toISOString())
        .lte('rated_at', endDate.toISOString());

      if (taskRatingsError) {
        console.error('Task ratings error:', taskRatingsError);
      }

      const monthlyEmployeeRatings = employeeRatingsData || [];
      const monthlyTaskRatings = taskRatingsData || [];

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

        // ENHANCED TASK ANALYSIS - Detect Completed, Delayed, and Unfinished tasks
        const completedTasks = employeeTasks.filter(task => {
          // Check multiple completion indicators
          const statusComplete = ['Complete', 'Completed', 'complete', 'COMPLETE', 'COMPLETED'].includes(task.status);
          const hasCompletionDate = task.completed_at || task.completion_date || task.finished_at;
          const hasVisualContent = task.visual_feeding || task.image_url || task.visual_content || task.completion_image;
          
          return statusComplete || hasCompletionDate || hasVisualContent;
        }).length;

        // DELAYED TASKS - Tasks past due date but not marked as complete
        const delayedTasks = employeeTasks.filter(task => {
          const isCompleted = ['Complete', 'Completed', 'complete', 'COMPLETE', 'COMPLETED'].includes(task.status) ||
                             task.completed_at || task.completion_date || task.finished_at;
          
          if (isCompleted) return false; // Don't count completed tasks as delayed
          
          // Check if task is past due
          if (task.due_date) {
            const dueDate = new Date(task.due_date);
            const now = new Date();
            return dueDate < now; // Past due date
          }
          
          // Also check for "delayed" status indicators
          const isDelayedStatus = ['Delayed', 'delayed', 'DELAYED', 'Overdue', 'overdue', 'OVERDUE'].includes(task.status);
          return isDelayedStatus;
        }).length;

        // UNFINISHED TASKS - Tasks marked as unfinished or abandoned
        const unfinishedTasks = employeeTasks.filter(task => {
          const isUnfinished = ['Unfinished', 'unfinished', 'UNFINISHED', 'Cancelled', 'cancelled', 'CANCELLED', 'Abandoned', 'abandoned', 'ABANDONED'].includes(task.status);
          return isUnfinished;
        }).length;
        
        const tasksWithImages = employeeTasks.filter(task => {
          return task.visual_feeding || task.image_url || task.visual_content || task.completion_image;
        }).length;
        
        const taskSuccessRate = employeeTasks.length > 0 ? (completedTasks / employeeTasks.length) * 100 : 0;

        console.log(`📊 ${employee.name} Task Analysis:
          Total: ${employeeTasks.length} | Completed: ${completedTasks} | Delayed: ${delayedTasks} | Unfinished: ${unfinishedTasks}
          Success Rate: ${taskSuccessRate.toFixed(1)}%`);

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

        // Calculate star ratings for this employee
        const employeeRatings = monthlyEmployeeRatings.filter(rating => rating.employee_id === employee.id);
        const employeeAverageRating = employeeRatings.length > 0 
          ? employeeRatings.reduce((sum, rating) => sum + rating.rating, 0) / employeeRatings.length 
          : 0;

        // Calculate task ratings for this employee's tasks
        const employeeTaskRatings = monthlyTaskRatings.filter((rating: any) => 
          rating.tasks && rating.tasks.assigned_to === employee.id
        );
        const taskAverageRating = employeeTaskRatings.length > 0 
          ? employeeTaskRatings.reduce((sum, rating) => sum + rating.rating, 0) / employeeTaskRatings.length 
          : 0;

        // Overall average rating (combine employee and task ratings)
        const totalRatingsCount = employeeRatings.length + employeeTaskRatings.length;
        const overallAverageRating = totalRatingsCount > 0 
          ? ((employeeAverageRating * employeeRatings.length) + (taskAverageRating * employeeTaskRatings.length)) / totalRatingsCount
          : 0;

        // **ENHANCED PERFORMANCE CALCULATION** - Based on User Requirements!
        const performanceScore = calcImprovedPerformanceScore(
          isRemoteRole ? 0 : daysWorked, // Days worked (0 for remote = no tracking)
          isRemoteRole ? 0 : totalWorkTime, // Work time hours
          isRemoteRole ? 0 : totalDelay * 60, // Convert delay hours to minutes
          isRemoteRole ? 0 : totalOvertime, // Overtime hours
          completedTasks, // Tasks completed
          employeeTasks.length, // Total tasks
          employeeReports.length, // Reports submitted
          expectedReports, // Expected reports
          overallAverageRating, // Average star rating
          totalRatingsCount, // Total ratings count
          delayedTasks, // Tasks delayed
          unfinishedTasks, // Tasks unfinished  
          isRemoteRole // Is remote worker flag
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
          },
          // Diamond rank fields
          diamondRank: employee.diamond_rank || false,
          diamondRankAssignedBy: employee.diamond_rank_assigned_by,
          diamondRankAssignedAt: employee.diamond_rank_assigned_at
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

      // Separate Diamond and regular employees, then sort each group by performance
      const diamondEmployees = processedEmployees.filter(emp => emp.diamondRank).sort((a, b) => b.performance - a.performance);
      const regularEmployees = processedEmployees.filter(emp => !emp.diamondRank).sort((a, b) => b.performance - a.performance);
      
      // Combine: Diamond employees first, then regular employees
      const sortedEmployees = [...diamondEmployees, ...regularEmployees];
      
      setEmployees(sortedEmployees);
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

  const handleAssignDiamondRank = async (employeeId: string, employeeName: string) => {
    if (!user?.id) {
      toast.error('Admin authentication required');
      return;
    }

    try {
      await assignDiamondRank(employeeId, user.id);
      toast.success(`💎 Diamond rank assigned to ${employeeName}!`);
      await fetchEmployeeData(); // Refresh data
    } catch (error) {
      console.error('Error assigning Diamond rank:', error);
      toast.error(`Failed to assign Diamond rank: ${error.message}`);
    }
  };

  const handleRemoveDiamondRank = async (employeeId: string, employeeName: string) => {
    if (!user?.id) {
      toast.error('Admin authentication required');
      return;
    }

    if (!confirm(`Remove Diamond rank from ${employeeName}?`)) {
      return;
    }

    try {
      await removeDiamondRank(employeeId, user.id);
      toast.success(`Diamond rank removed from ${employeeName}`);
      await fetchEmployeeData(); // Refresh data
    } catch (error) {
      console.error('Error removing Diamond rank:', error);
      toast.error(`Failed to remove Diamond rank: ${error.message}`);
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
      
      // Check if admin_performance_dashboard table exists and is accessible
      console.log('🔍 Checking admin_performance_dashboard table...');
      const { data: tableCheck, error: tableError } = await supabase
        .from('admin_performance_dashboard')
        .select('*')
        .limit(1);
      
      if (tableError) {
        console.error('❌ admin_performance_dashboard table error:', tableError);
        toast.error('Database table not accessible. Please check permissions.');
        return;
      }
      
      console.log('✅ admin_performance_dashboard table is accessible');
      
      // Get all employees - try broader query first
      console.log('🔍 Fetching employees...');
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'employee');

      console.log('📋 Users query result:', { users, usersError });

      if (usersError) {
        console.error('Error fetching users:', usersError);
        toast.error('Failed to fetch users');
        return;
      }

      if (!users || users.length === 0) {
        // Try without role filter to see if there are any users at all
        const { data: allUsers, error: allUsersError } = await supabase
          .from('users')
          .select('id, name, role, position');
        
        console.log('📋 All users in database:', { allUsers, allUsersError });
        toast.info(`No employees found. Total users in database: ${allUsers?.length || 0}`);
        return;
      }

      console.log(`👥 Found ${users.length} employees to recalculate:`, users.map(u => ({ name: u.name, position: u.position })));

      let processedCount = 0;
      let updatedCount = 0;
      let skippedEmployees = [];
      const monthYear = format(new Date(), 'yyyy-MM');

      // Process each user with enhanced performance calculation including rating bonuses
      for (const userRecord of users) {
        try {
          processedCount++;
          console.log(`\n🔄 [${processedCount}/${users.length}] Processing: ${userRecord.name} (${userRecord.position})`);

          // Get user's monthly shifts for this month using proper date filtering
          const startOfMonth = `${monthYear}-01`;
          // Calculate the actual last day of the month (handles 28/29/30/31 days correctly)
          const year = parseInt(monthYear.split('-')[0]);
          const month = parseInt(monthYear.split('-')[1]);
          const lastDayOfMonth = new Date(year, month, 0).getDate(); // new Date(year, month, 0) gives last day of previous month
          const endOfMonth = `${monthYear}-${lastDayOfMonth.toString().padStart(2, '0')}`;
          
          console.log(`📅 Date range for ${userRecord.name}: ${startOfMonth} to ${endOfMonth}`);
          
          const { data: monthlyShifts, error: shiftsError } = await supabase
            .from('monthly_shifts')
            .select(`
              *,
              shifts:shift_id(name, start_time, end_time)
            `)
            .eq('user_id', userRecord.id)
            .gte('work_date', startOfMonth)
            .lte('work_date', endOfMonth);

          if (shiftsError) {
            console.error(`❌ Error fetching shifts for ${userRecord.name}:`, shiftsError);
            continue;
          }

          console.log(`📊 Found ${monthlyShifts?.length || 0} shifts for ${userRecord.name}`);

          // Handle employees with no shifts (remote workers, etc.)
          if (!monthlyShifts || monthlyShifts.length === 0) {
            console.log(`⚠️ No shifts found for ${userRecord.name} - treating as remote worker`);
            
            // Calculate performance for remote workers based on tasks and reports
          const performanceData = await calculateUserPerformanceFromTasksAndReports(userRecord, monthYear);
          
          if (performanceData) {
              // Prepare record data for remote workers
              const recordData: any = {
                employee_id: userRecord.id,
                employee_name: userRecord.name,
                month_year: monthYear,
                total_working_days: performanceData.total_working_days,
                total_delay_minutes: performanceData.total_delay_minutes,
                total_delay_hours: performanceData.total_delay_hours,
                total_overtime_hours: performanceData.total_overtime_hours,
                average_performance_score: performanceData.average_performance_score,
                punctuality_percentage: performanceData.punctuality_percentage,
                performance_status: performanceData.performance_status,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };

              // Delete existing record and insert new one
            await supabase
              .from('admin_performance_dashboard')
              .delete()
              .eq('employee_id', userRecord.id)
              .eq('month_year', monthYear);

            const { error: insertError } = await supabase
              .from('admin_performance_dashboard')
                .insert(recordData);

              if (!insertError) {
                console.log(`✅ Processed remote worker ${userRecord.name}`);
                updatedCount++;
              } else {
                console.error(`❌ Failed to process remote worker ${userRecord.name}:`, insertError);
                skippedEmployees.push({
                  name: userRecord.name,
                  position: userRecord.position,
                  reason: `Remote worker processing failed: ${insertError.message}`,
                  error: insertError
                });
              }
            }
            continue;
          }

          // Calculate performance metrics with JUSTICE & FAIRNESS
          const totalWorkingDays = monthlyShifts.length;
          const totalDelayMinutes = Math.round(monthlyShifts.reduce((sum, shift) => sum + (shift.delay_minutes || 0), 0));
          const totalDelayHours = totalDelayMinutes / 60;
          const totalOvertimeHours = Math.round(monthlyShifts.reduce((sum, shift) => sum + (shift.overtime_hours || 0), 0) * 100) / 100;
          const totalRegularHours = Math.round(monthlyShifts.reduce((sum, shift) => sum + (shift.regular_hours || 0), 0) * 100) / 100;
          const totalBreakMinutes = Math.round(monthlyShifts.reduce((sum, shift) => sum + (shift.total_break_minutes || 0), 0));

          // 🌟 GET RATING DATA FOR BONUS/PENALTY CALCULATION
          // Calculate proper date range for the month
          const monthDate = new Date(monthYear + '-01');
          const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
          const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0); // Last day of month
          
          const [employeeRatings, taskRatingsData] = await Promise.all([
            // Get employee ratings for this month
            supabase
              .from('employee_ratings')
              .select('rating, rated_at')
              .eq('employee_id', userRecord.id)
              .gte('rated_at', monthStart.toISOString().split('T')[0])
              .lte('rated_at', monthEnd.toISOString().split('T')[0]),
            
            // Get user's tasks and their ratings for this month
            supabase
              .from('tasks')
              .select(`
                id,
                task_ratings(rating, rated_at)
              `)
              .eq('assigned_to', userRecord.id)
              .gte('created_at', monthStart.toISOString().split('T')[0])
              .lte('created_at', monthEnd.toISOString().split('T')[0])
          ]);

          // Calculate Rating Bonus/Penalty
          let ratingBonus = 0;
          let employeeRatingAvg = 0;
          let taskRatingAvg = 0;
          let totalRatingsCount = 0;

          // Process Employee Ratings
          if (employeeRatings.data && employeeRatings.data.length > 0) {
            const ratings = employeeRatings.data.map(r => r.rating);
            employeeRatingAvg = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
            totalRatingsCount += ratings.length;
          }

          // Process Task Ratings
          if (taskRatingsData.data && taskRatingsData.data.length > 0) {
            const taskRatings = taskRatingsData.data
              .flatMap(task => task.task_ratings || [])
              .map(tr => tr.rating);
            
            if (taskRatings.length > 0) {
              taskRatingAvg = taskRatings.reduce((sum, rating) => sum + rating, 0) / taskRatings.length;
              totalRatingsCount += taskRatings.length;
            }
          }

          // 🎯 RATING BONUS SYSTEM
          if (totalRatingsCount > 0) {
            // Calculate overall rating average correctly
            let overallRatingAvg = 0;
            let ratingCount = 0;
            
            if (employeeRatingAvg > 0) {
              overallRatingAvg += employeeRatingAvg;
              ratingCount++;
            }
            
            if (taskRatingAvg > 0) {
              overallRatingAvg += taskRatingAvg;
              ratingCount++;
            }
            
            if (ratingCount > 0) {
              overallRatingAvg = overallRatingAvg / ratingCount;
            }

            if (overallRatingAvg >= 5.0) {
              ratingBonus = 15; // 🌟 5-star bonus: +15 points
            } else if (overallRatingAvg >= 4.5) {
              ratingBonus = 10; // ⭐ 4.5+ bonus: +10 points
            } else if (overallRatingAvg >= 4.0) {
              ratingBonus = 5;  // 👍 4+ bonus: +5 points
            } else if (overallRatingAvg >= 3.0) {
              ratingBonus = 0;  // 😐 3+ neutral: no change
            } else if (overallRatingAvg >= 2.0) {
              ratingBonus = -5; // 😕 2+ penalty: -5 points
            } else {
              ratingBonus = -10; // 😞 <2 penalty: -10 points
            }

            console.log(`⭐ Rating analysis for ${userRecord.name}:`, {
              employeeRatingAvg: employeeRatingAvg.toFixed(1),
              taskRatingAvg: taskRatingAvg.toFixed(1),
              overallRatingAvg: overallRatingAvg.toFixed(1),
              ratingBonus,
              totalRatingsCount
            });
          }

          // Get tasks and reports for improved calculation
          const { data: userTasks } = await supabase
            .from('tasks')
            .select('*')
            .eq('assigned_to', userRecord.id)
            .gte('created_at', monthStart.toISOString())
            .lte('created_at', monthEnd.toISOString());

          const { data: userReports } = await supabase
            .from('work_reports')
            .select('*')
            .eq('user_id', userRecord.id)
            .gte('date', startOfMonth)
            .lte('date', endOfMonth);

          // ENHANCED TASK ANALYSIS - Count completed, delayed, and unfinished tasks
          const userTasksList = userTasks || [];
          
          const completedTasks = userTasksList.filter(task => {
            const statusComplete = ['Complete', 'Completed', 'complete', 'COMPLETE', 'COMPLETED'].includes(task.status);
            const hasCompletionDate = task.completed_at || task.completion_date || task.finished_at;
            const hasVisualContent = task.visual_feeding || task.image_url || task.visual_content || task.completion_image;
            return statusComplete || hasCompletionDate || hasVisualContent;
          }).length;

          // DELAYED TASKS - Tasks past due date but not marked as complete
          const delayedTasks = userTasksList.filter(task => {
            const isCompleted = ['Complete', 'Completed', 'complete', 'COMPLETE', 'COMPLETED'].includes(task.status) ||
                               task.completed_at || task.completion_date || task.finished_at;
            
            if (isCompleted) return false; // Don't count completed tasks as delayed
            
            // Check if task is past due
            if (task.due_date) {
              const dueDate = new Date(task.due_date);
              const now = new Date();
              return dueDate < now; // Past due date
            }
            
            // Also check for "delayed" status indicators
            const isDelayedStatus = ['Delayed', 'delayed', 'DELAYED', 'Overdue', 'overdue', 'OVERDUE'].includes(task.status);
            return isDelayedStatus;
          }).length;

          // UNFINISHED TASKS - Tasks marked as unfinished or abandoned
          const unfinishedTasks = userTasksList.filter(task => {
            const isUnfinished = ['Unfinished', 'unfinished', 'UNFINISHED', 'Cancelled', 'cancelled', 'CANCELLED', 'Abandoned', 'abandoned', 'ABANDONED'].includes(task.status);
            return isUnfinished;
          }).length;

          // Calculate expected reports
          const expectedReports = totalWorkingDays; // One report per working day for office workers

          console.log(`📊 ${userRecord.name} Task Analysis (Recalculate):
            Total: ${userTasksList.length} | Completed: ${completedTasks} | Delayed: ${delayedTasks} | Unfinished: ${unfinishedTasks}`);

          // Calculate overall average rating
          let overallRatingAvg = 0;
          if (totalRatingsCount > 0) {
            let ratingSum = 0;
            let ratingCount = 0;
            
            if (employeeRatingAvg > 0) {
              ratingSum += employeeRatingAvg;
              ratingCount++;
            }
            
            if (taskRatingAvg > 0) {
              ratingSum += taskRatingAvg;
              ratingCount++;
            }
            
            overallRatingAvg = ratingCount > 0 ? ratingSum / ratingCount : 0;
          }

          // Check if this is a remote worker
          const isRemoteRole = ['Media Buyer', 'Copywriter', 'Copy Writer', 'Copy Writing', 'Content Creator', 'Social Media Manager'].includes(userRecord.position);

          // **NEW ENHANCED PERFORMANCE CALCULATION** - Based on User Requirements!
          const averagePerformanceScore = calcImprovedPerformanceScore(
            isRemoteRole ? 0 : totalWorkingDays, // Days worked (0 for remote = no tracking)
            isRemoteRole ? 0 : totalRegularHours, // Regular work hours (NOT including overtime)
            isRemoteRole ? 0 : totalDelayMinutes, // Delay in minutes
            isRemoteRole ? 0 : totalOvertimeHours, // Overtime hours (neutral - no bonus)
            completedTasks, // Tasks completed
            (userTasks || []).length, // Total tasks
            (userReports || []).length, // Reports submitted
            expectedReports, // Expected reports
            overallRatingAvg, // Average star rating
            totalRatingsCount, // Total ratings count
            delayedTasks, // Tasks delayed
            unfinishedTasks, // Tasks unfinished
            isRemoteRole // Is remote worker flag
          );
          const punctualityPercentage = totalDelayHours >= 1 ? 0 : 
                                      totalDelayMinutes > 30 ? Math.max(0, 50 - (totalDelayMinutes * 2)) :
                                      totalDelayMinutes > 0 ? Math.max(0, 90 - (totalDelayMinutes * 3)) : 100;

          // Determine performance status
          let performanceStatus = 'Poor';
          if (averagePerformanceScore >= 85 && punctualityPercentage >= 85) {
            performanceStatus = 'Excellent';
          } else if (averagePerformanceScore >= 70 && punctualityPercentage >= 70) {
            performanceStatus = 'Good';
          } else if (averagePerformanceScore >= 50 || punctualityPercentage >= 50) {
            performanceStatus = 'Needs Improvement';
          }

          console.log(`📊 Final metrics for ${userRecord.name}:`, {
            totalWorkingDays,
            totalDelayMinutes,
            totalDelayHours,
            totalOvertimeHours,
            totalRegularHours,
            averagePerformanceScore: averagePerformanceScore.toFixed(1),
            punctualityPercentage: punctualityPercentage.toFixed(1),
            performanceStatus,
            ratingBonus
          });

          // FORCE UPDATE: Delete any existing record and create a new one
          // This ensures manual edits are completely overridden
          const { error: deleteError } = await supabase
            .from('admin_performance_dashboard')
            .delete()
            .eq('employee_id', userRecord.id)
            .eq('month_year', monthYear);

          if (deleteError) {
            console.warn(`⚠️ Could not delete existing record for ${userRecord.name}:`, deleteError);
          }

          // Prepare record data (only include columns that exist in the database)
          const recordData: any = {
                employee_id: userRecord.id,
                employee_name: userRecord.name,
                month_year: monthYear,
            total_working_days: totalWorkingDays,
            total_delay_minutes: totalDelayMinutes,
            total_delay_hours: Math.round(totalDelayHours * 100) / 100,
            total_overtime_hours: Math.round(totalOvertimeHours * 100) / 100,
            average_performance_score: Math.round(averagePerformanceScore * 100) / 100,
            punctuality_percentage: Math.round(punctualityPercentage * 100) / 100,
            performance_status: performanceStatus,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
          };

          // Add rating columns only if they exist in the database
          try {
            if (employeeRatingAvg > 0) recordData.employee_rating_avg = Math.round(employeeRatingAvg * 100) / 100;
            if (taskRatingAvg > 0) recordData.task_rating_avg = Math.round(taskRatingAvg * 100) / 100;
            if (ratingBonus !== 0) recordData.rating_bonus_points = ratingBonus;
            if (totalRatingsCount > 0) recordData.total_ratings_count = totalRatingsCount;
          } catch (e) {
            console.warn(`⚠️ Rating columns may not exist in database for ${userRecord.name}, proceeding without them`);
          }

          console.log(`💾 Inserting record for ${userRecord.name}:`, recordData);

          // Create new record with calculated data including rating bonuses
          console.log(`💾 Attempting to insert record for ${userRecord.name}:`, recordData);
          
          const { error: insertError } = await supabase
            .from('admin_performance_dashboard')
            .insert(recordData);

            if (!insertError) {
            console.log(`✅ Recalculated ${userRecord.name}: ${performanceStatus} (${averagePerformanceScore.toFixed(1)}%)`, {
              ratingBonus: ratingBonus > 0 ? `+${ratingBonus}` : ratingBonus < 0 ? ratingBonus : 'No rating bonus',
              employeeRating: employeeRatingAvg > 0 ? `${employeeRatingAvg.toFixed(1)}⭐` : 'No employee ratings',
              taskRating: taskRatingAvg > 0 ? `${taskRatingAvg.toFixed(1)}⭐` : 'No task ratings'
            });
              updatedCount++;
          } else {
              console.error(`❌ Failed to create ${userRecord.name}:`, insertError);
            console.error('Record data that failed:', recordData);
            console.error('Full error details:', JSON.stringify(insertError, null, 2));
            skippedEmployees.push({
              name: userRecord.name,
              position: userRecord.position,
              reason: `Database insertion failed: ${insertError.message}`,
              error: insertError
            });
          }
        } catch (userError) {
          console.error(`❌ Error processing ${userRecord.name}:`, userError);
          skippedEmployees.push({
            name: userRecord.name,
            position: userRecord.position,
            reason: `Processing error: ${userError.message}`,
            error: userError
          });
        }
      }

      // Enhanced reporting with skip details
      const skippedCount = processedCount - updatedCount;

      if (updatedCount > 0) {
        toast.success(`✅ Successfully recalculated performance for ${updatedCount}/${processedCount} employees`);
        console.log('🎯 Complete! All employee performance recalculated and manual edits overridden!');
        
        // Refresh the employee data to show updated performance
        await fetchEmployeeData();
        
        if (skippedCount > 0) {
          console.warn(`⚠️ ${skippedCount} employees were skipped:`);
          skippedEmployees.forEach((emp, index) => {
            console.warn(`${index + 1}. ${emp.name} (${emp.position}): ${emp.reason}`);
          });
          toast.warning(`⚠️ ${skippedCount} employees were skipped - check console for details`);
        }
      } else {
        toast.error('❌ No employees were successfully recalculated');
        console.log('❌ Debug: No employees processed successfully. Check database permissions and schema.');
        
        if (skippedEmployees.length > 0) {
          console.error('❌ All employees were skipped for these reasons:');
          skippedEmployees.forEach((emp, index) => {
            console.error(`${index + 1}. ${emp.name} (${emp.position}): ${emp.reason}`);
          });
        }
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
  
  // Get Diamond employees first, then fill remaining slots with top performers
  const diamondEmployees = employees.filter(emp => emp.diamondRank);
  const nonDiamondEmployees = employees.filter(emp => !emp.diamondRank);
  const remainingSlots = Math.max(0, 4 - diamondEmployees.length);
  const nonDiamondTopPerformers = nonDiamondEmployees.slice(0, remainingSlots);
  const championsToShow = [...diamondEmployees, ...nonDiamondTopPerformers];

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
        {/* Top 4 Performance Champions */}
        {championsToShow.length > 0 && (
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

            {/* Desktop: ENHANCED CHAMPIONS LIST - COMPACT with Diamond Support */}
            <div className="hidden lg:block">
              <div className="space-y-4 w-full">
                {championsToShow.map((employee, index) => {
                    // Determine titles and styling based on Diamond rank or position
                    const isDiamond = employee.diamondRank;
                    let title: string, colors: string, bgColor: string, borderColor: string, textColor: string, glowColor: string, displayPosition: string, icon: JSX.Element;
                    
                    if (isDiamond) {
                      // Diamond rank styling (Position 0)
                      title = 'DIAMOND CHAMPION';
                      colors = 'from-cyan-400 via-blue-500 to-purple-600';
                      bgColor = 'from-cyan-50 via-blue-50 to-purple-50';
                      borderColor = 'border-cyan-400';
                      textColor = 'text-cyan-800';
                      glowColor = 'shadow-cyan-500/60';
                      displayPosition = 'Diamond';
                      icon = <DiamondIcon className="h-5 w-5 text-cyan-600" />;
                    } else {
                      // Regular performance-based styling - find position among non-diamond employees
                      const nonDiamondIndex = nonDiamondEmployees.findIndex(emp => emp.id === employee.id);
                      const titles = ['GOLDEN CHAMPION', 'SILVER MEDAL', 'BRONZE MEDAL'];
                      const colorsArray = [
                        'from-yellow-400 via-orange-500 to-red-600',
                        'from-slate-400 via-gray-500 to-slate-600',
                        'from-amber-600 via-orange-700 to-amber-800'
                      ];
                      const bgArray = [
                        'from-yellow-50 via-orange-50 to-red-50',
                        'from-slate-100 via-gray-100 to-slate-200',
                        'from-amber-100 via-orange-100 to-amber-200'
                      ];
                      const borderArray = ['border-yellow-400', 'border-slate-400', 'border-amber-600'];
                      const textArray = ['text-yellow-800', 'text-slate-700', 'text-amber-800'];
                      const glowArray = ['shadow-yellow-500/50', 'shadow-slate-500/30', 'shadow-amber-500/40'];
                      const iconsArray = [
                        <Crown className="h-5 w-5 text-yellow-600" />,
                        <Medal className="h-5 w-5 text-slate-600" />,
                        <Award className="h-5 w-5 text-amber-700" />
                      ];
                      
                      title = titles[nonDiamondIndex] || 'TOP PERFORMER';
                      colors = colorsArray[nonDiamondIndex] || 'from-purple-400 via-blue-500 to-indigo-600';
                      bgColor = bgArray[nonDiamondIndex] || 'from-purple-50 via-blue-50 to-indigo-50';
                      borderColor = borderArray[nonDiamondIndex] || 'border-purple-400';
                      textColor = textArray[nonDiamondIndex] || 'text-purple-800';
                      glowColor = glowArray[nonDiamondIndex] || 'shadow-purple-500/40';
                      displayPosition = `#${nonDiamondIndex + 1} Place`;
                      icon = iconsArray[nonDiamondIndex] || <Star className="h-5 w-5 text-purple-600" />;
                    }
                  
                    return (
                      <div key={employee.id} className="relative group">
                        {/* Outer Glow Ring */}
                        <div className={`absolute -inset-1 bg-gradient-to-r ${colors} rounded-xl blur-sm opacity-15 group-hover:opacity-30 transition-all duration-300`}></div>
                        
                        {/* Main Card */}
                        <div className={`relative flex items-center gap-5 p-5 rounded-xl bg-gradient-to-r ${bgColor} border-3 ${borderColor} shadow-xl ${glowColor} group-hover:shadow-2xl transition-all duration-300 group-hover:scale-102 transform`}>
                          
                          {/* Sparkle Effects - Reduced animation */}
                          {isDiamond && (
                            <>
                              <div className="absolute top-2 right-3 text-cyan-400">
                                <DiamondIcon className="h-4 w-4" />
                              </div>
                              <div className="absolute bottom-2 right-8 text-blue-400 text-sm">✨</div>
                            </>
                          )}
                          {!isDiamond && nonDiamondEmployees.findIndex(emp => emp.id === employee.id) === 0 && (
                            <>
                              <div className="absolute top-2 right-3 text-yellow-400 text-sm">✨</div>
                              <div className="absolute bottom-2 right-8 text-orange-400 text-sm">⭐</div>
                            </>
                          )}
                          
                          {/* Enhanced Avatar */}
                          <div className="relative flex-shrink-0">
                            {/* Main Avatar */}
                            <div className={`relative z-10 w-16 h-16 rounded-full bg-gradient-to-br ${colors} flex items-center justify-center font-black text-xl text-white shadow-xl border-3 border-white ring-4 ring-white/30 transform group-hover:rotate-6 transition-all duration-300`}>
                              {employee.name.charAt(0).toUpperCase()}
                            </div>
                            
                            {/* Enhanced Icons */}
                            <div className={`absolute -top-1.5 -right-1.5 z-20 p-1.5 rounded-full bg-white shadow-xl group-hover:scale-110 transition-all duration-300`}>
                              {icon}
                            </div>
                          </div>
                          
                          {/* Enhanced Content */}
                          <div className="flex-1 space-y-2 min-w-0">
                            {/* Name and Title */}
                            <div className="flex items-center gap-3 mb-2">
                              {isDiamond && <DiamondIcon className="h-5 w-5 text-cyan-500 flex-shrink-0" />}
                              {!isDiamond && nonDiamondEmployees.findIndex(emp => emp.id === employee.id) === 0 && <Flame className="h-4 w-4 text-orange-500 flex-shrink-0" />}
                              {!isDiamond && nonDiamondEmployees.findIndex(emp => emp.id === employee.id) === 1 && <Star className="h-4 w-4 text-slate-600 flex-shrink-0" />}
                              {!isDiamond && nonDiamondEmployees.findIndex(emp => emp.id === employee.id) === 2 && <Trophy className="h-4 w-4 text-amber-700 flex-shrink-0" />}
                              
                              <h4 className={`font-black text-xl ${textColor} group-hover:scale-105 transition-transform duration-300 truncate`}>
                                {employee.name}
                              </h4>
                              
                              <Badge className={`bg-gradient-to-r ${colors} text-white text-sm font-black px-3 py-1.5 shadow-lg transform group-hover:scale-105 transition-all duration-300 flex-shrink-0`}>
                                {title}
                              </Badge>
                            </div>
                            
                            {/* Position and Performance */}
                            <div className="flex items-center gap-4 flex-wrap">
                              <p className={`text-base ${textColor} font-bold`}>
                                {employee.position}
                              </p>
                              <div className="flex items-center gap-1">
                                <TrendingUp className={`h-4 w-4 ${textColor}`} />
                                <span className={`text-lg font-black ${textColor}`}>
                                  {employee.performance.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                            
                            {/* Enhanced Badges */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className={`text-xs px-2 py-1 rounded-full bg-white/90 ${textColor} font-bold shadow border-2 ${borderColor}`}>
                                {displayPosition}
                              </div>
                              
                              {isDiamond && (
                                <>
                                  <div className="text-xs px-2 py-1 rounded-full bg-cyan-200 text-cyan-800 font-bold shadow border border-cyan-400 flex items-center gap-1">
                                    <DiamondIcon className="h-3 w-3" />
                                    Exclusive
                                  </div>
                                  <div className="text-xs px-2 py-1 rounded-full bg-blue-200 text-blue-800 font-bold shadow border border-blue-400">
                                    ⭐ Premium
                                  </div>
                                </>
                              )}
                              {!isDiamond && nonDiamondEmployees.findIndex(emp => emp.id === employee.id) === 0 && (
                                <>
                                  <div className="text-xs px-2 py-1 rounded-full bg-yellow-200 text-yellow-800 font-bold shadow border border-yellow-400">
                                    🏅 Elite
                                  </div>
                                  <div className="text-xs px-2 py-1 rounded-full bg-orange-200 text-orange-800 font-bold shadow border border-orange-400">
                                    🔥 Star
                                  </div>
                                </>
                              )}
                              {!isDiamond && nonDiamondEmployees.findIndex(emp => emp.id === employee.id) === 1 && (
                                <div className="text-xs px-2 py-1 rounded-full bg-slate-200 text-slate-800 font-bold shadow border border-slate-400">
                                  🏆 Runner-up
                                </div>
                              )}
                              {!isDiamond && nonDiamondEmployees.findIndex(emp => emp.id === employee.id) === 2 && (
                                <div className="text-xs px-2 py-1 rounded-full bg-amber-200 text-amber-800 font-bold shadow border border-amber-500">
                                  🥉 Third
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Performance Percentage Badge */}
                          <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br ${colors} text-white shadow-xl transform group-hover:scale-110 transition-all duration-300 flex-shrink-0`}>
                            <span className="text-sm font-black">{Math.round(employee.performance)}%</span>
                            <span className="text-xs font-semibold">SCORE</span>
                          </div>
                        </div>
                      </div>
                                          );
                })}
              </div>
            </div>
                  
            {/* Mobile: ENHANCED CHAMPIONS LIST - COMPACT with Diamond Support */}
            <div className="lg:hidden space-y-3">
              {championsToShow.map((employee, index) => {
                // Mobile responsive styling for Diamond + Top 3
                const isDiamond = employee.diamondRank;
                let title: string, colors: string, bgColor: string, borderColor: string, textColor: string, glowColor: string, displayPosition: string, icon: JSX.Element;
                
                if (isDiamond) {
                  // Diamond rank styling for mobile
                  title = 'DIAMOND';
                  colors = 'from-cyan-400 via-blue-500 to-purple-600';
                  bgColor = 'from-cyan-50 via-blue-50 to-purple-50';
                  borderColor = 'border-cyan-400';
                  textColor = 'text-cyan-800';
                  glowColor = 'shadow-cyan-500/50';
                  displayPosition = 'Diamond';
                  icon = <DiamondIcon className="h-3 w-3 text-cyan-600" />;
                } else {
                  // Regular performance-based styling for mobile
                  const nonDiamondIndex = nonDiamondTopPerformers.findIndex(emp => emp.id === employee.id);
                  const titles = ['CHAMPION', 'SILVER', 'BRONZE'];
                  const colorsArray = [
                    'from-yellow-400 via-orange-500 to-red-600',
                    'from-slate-400 via-gray-500 to-slate-600',
                    'from-amber-600 via-orange-700 to-amber-800'
                  ];
                  const bgArray = [
                    'from-yellow-50 via-orange-50 to-red-50',
                    'from-slate-100 via-gray-100 to-slate-200',
                    'from-amber-100 via-orange-100 to-amber-200'
                  ];
                  const borderArray = ['border-yellow-400', 'border-slate-400', 'border-amber-600'];
                  const textArray = ['text-yellow-800', 'text-slate-700', 'text-amber-800'];
                  const glowArray = ['shadow-yellow-500/50', 'shadow-slate-500/30', 'shadow-amber-500/40'];
                  const iconsArray = [
                    <Crown className="h-3 w-3 text-yellow-600" />,
                    <Medal className="h-3 w-3 text-slate-600" />,
                    <Award className="h-3 w-3 text-amber-700" />
                  ];
                  
                  title = titles[nonDiamondIndex] || 'TOP';
                  colors = colorsArray[nonDiamondIndex] || 'from-purple-400 via-blue-500 to-indigo-600';
                  bgColor = bgArray[nonDiamondIndex] || 'from-purple-50 via-blue-50 to-indigo-50';
                  borderColor = borderArray[nonDiamondIndex] || 'border-purple-400';
                  textColor = textArray[nonDiamondIndex] || 'text-purple-800';
                  glowColor = glowArray[nonDiamondIndex] || 'shadow-purple-500/40';
                  displayPosition = `#${nonDiamondIndex + 1}`;
                  icon = iconsArray[nonDiamondIndex] || <Star className="h-3 w-3 text-purple-600" />;
                }
                
                return (
                  <div key={employee.id} className="relative group">
                    {/* Outer Glow Ring */}
                    <div className={`absolute -inset-0.5 bg-gradient-to-r ${colors} rounded-lg blur-sm opacity-10 group-active:opacity-25 transition-all duration-300`}></div>
                    
                    {/* Main Card */}
                    <div className={`relative flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r ${bgColor} border-2 ${borderColor} shadow-lg ${glowColor} group-active:shadow-xl transition-all duration-300 group-active:scale-101 transform`}>
                      
                      {/* Sparkle Effects - Reduced animation */}
                      {isDiamond && (
                        <>
                          <div className="absolute top-1 right-2 text-cyan-400">
                            <DiamondIcon className="h-3 w-3" />
                          </div>
                          <div className="absolute bottom-1 right-6 text-blue-400 text-xs">✨</div>
                        </>
                      )}
                      {!isDiamond && nonDiamondEmployees.findIndex(emp => emp.id === employee.id) === 0 && (
                        <>
                          <div className="absolute top-1 right-2 text-yellow-400 text-xs">✨</div>
                          <div className="absolute bottom-1 right-6 text-orange-400 text-xs">⭐</div>
                        </>
                      )}
                      
                      {/* Enhanced Avatar */}
                      <div className="relative flex-shrink-0">
                        {/* Main Avatar */}
                        <div className={`relative z-10 w-12 h-12 rounded-full bg-gradient-to-br ${colors} flex items-center justify-center font-black text-base text-white shadow-lg border-2 border-white ring-2 ring-white/30 transform group-active:rotate-3 transition-all duration-300`}>
                          {employee.name.charAt(0).toUpperCase()}
                        </div>
                        
                        {/* Enhanced Icons */}
                        <div className={`absolute -top-1 -right-1 z-20 p-1 rounded-full bg-white shadow-md group-active:scale-110 transition-all duration-300`}>
                          {icon}
                        </div>
                      </div>
                      
                      {/* Enhanced Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        {/* Name and Icon */}
                        <div className="flex items-center gap-2">
                          {isDiamond && <DiamondIcon className="h-4 w-4 text-cyan-500 flex-shrink-0" />}
                          {!isDiamond && nonDiamondEmployees.findIndex(emp => emp.id === employee.id) === 0 && <Flame className="h-3 w-3 text-orange-500 flex-shrink-0" />}
                          {!isDiamond && nonDiamondEmployees.findIndex(emp => emp.id === employee.id) === 1 && <Star className="h-3 w-3 text-slate-600 flex-shrink-0" />}
                          {!isDiamond && nonDiamondEmployees.findIndex(emp => emp.id === employee.id) === 2 && <Trophy className="h-3 w-3 text-amber-700 flex-shrink-0" />}
                          
                          <h4 className={`font-black text-base ${textColor} truncate`}>
                            {employee.name}
                          </h4>
                        </div>
                        
                        {/* Title Badge */}
                        <Badge className={`bg-gradient-to-r ${colors} text-white text-xs font-black px-1.5 py-0.5 shadow-md w-fit`}>
                          {title}
                        </Badge>
                        
                        {/* Position and Performance */}
                        <div className="space-y-0.5">
                          <p className={`text-xs ${textColor} font-bold truncate`}>
                            {employee.position}
                          </p>
                          <div className="flex items-center gap-1">
                            <TrendingUp className={`h-3 w-3 ${textColor} flex-shrink-0`} />
                            <span className={`text-sm font-black ${textColor}`}>
                              {employee.performance.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        
                        {/* Enhanced Badges */}
                        <div className="flex flex-wrap items-center gap-1">
                          <div className={`text-xs px-1.5 py-0.5 rounded-full bg-white/90 ${textColor} font-bold shadow border ${borderColor}`}>
                            {displayPosition}
                          </div>
                          
                          {isDiamond && (
                            <>
                              <div className="text-xs px-1.5 py-0.5 rounded-full bg-cyan-200 text-cyan-800 font-bold shadow border border-cyan-400 flex items-center gap-1">
                                <DiamondIcon className="h-2 w-2" />
                                VIP
                              </div>
                              <div className="text-xs px-1.5 py-0.5 rounded-full bg-blue-200 text-blue-800 font-bold shadow border border-blue-400">
                                ⭐ Premium
                              </div>
                            </>
                          )}
                          {!isDiamond && nonDiamondEmployees.findIndex(emp => emp.id === employee.id) === 0 && (
                            <>
                              <div className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-200 text-yellow-800 font-bold shadow border border-yellow-400">
                                🏅 Elite
                              </div>
                              <div className="text-xs px-1.5 py-0.5 rounded-full bg-orange-200 text-orange-800 font-bold shadow border border-orange-400">
                                🔥 Star
                              </div>
                            </>
                          )}
                          {!isDiamond && nonDiamondEmployees.findIndex(emp => emp.id === employee.id) === 1 && (
                            <div className="text-xs px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold shadow border border-slate-400">
                              🏆 2nd
                            </div>
                          )}
                          {!isDiamond && nonDiamondEmployees.findIndex(emp => emp.id === employee.id) === 2 && (
                            <div className="text-xs px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-800 font-bold shadow border border-amber-500">
                              🥉 3rd
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Performance Score */}
                      <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br ${colors} text-white shadow-lg transform group-active:scale-110 transition-all duration-300 flex-shrink-0`}>
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
                      Recalculate for All
              </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Complete performance recalculation for ALL employees with rating system:<br/>
                    • 5-star ratings: +15 bonus points<br/>
                    • 4+ star ratings: +5-10 bonus points<br/>
                    • Under 3 stars: -5 to -10 penalty points<br/>
                    • Based on: Work completion (40%) + Punctuality (30%) + Break efficiency (20%) + Rating bonus (10%)</p>
                  </TooltipContent>
                </Tooltip>
            </div>
            </CardTitle>
        </CardHeader>
                    <CardContent className="p-3 sm:p-6">
            {/* Mobile Card View */}
            <div className="block lg:hidden space-y-4">
              {employees.map((employee, index) => {
                // Calculate positions correctly - Diamond employees don't count in regular ranking
                const diamondCount = employees.filter(emp => emp.diamondRank).length;
                const regularPosition = employee.diamondRank ? 0 : index - diamondCount; // Diamond gets 0, regular employees get their actual position
                
                // Use regular position for both badge and medal effects
                // For Diamond employees, use special position that doesn't affect medals
                const medalPosition = employee.diamondRank ? -1 : regularPosition;
                
                // Enhanced medal styling for top 3 OVERALL positions + Diamond rank
                const getMedalStyling = (overallPos: number, isDiamond: boolean = false) => {
                  // Diamond rank overrides all other rankings
                  if (isDiamond) {
                    return {
                      border: 'border-4 border-cyan-400 shadow-2xl shadow-cyan-500/60',
                      bg: 'bg-gradient-to-br from-cyan-100 via-blue-100 to-purple-100 dark:from-cyan-950/50 dark:via-blue-950/50 dark:to-purple-950/50 relative overflow-hidden',
                      avatar: 'bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 shadow-xl border-4 border-cyan-300',
                      icon: <DiamondIcon className="h-6 w-6 text-cyan-100" />,
                      iconBg: 'bg-gradient-to-br from-cyan-600 to-purple-600',
                      specialEffect: 'before:absolute before:inset-0 before:bg-gradient-to-r before:from-cyan-400/20 before:via-blue-400/20 before:to-purple-400/20',
                      nameIcon: <DiamondIcon className="h-5 w-5 text-cyan-600" />,
                      badge: 'bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white font-bold shadow-lg',
                      nameStyle: 'text-cyan-700 dark:text-cyan-300 font-bold text-lg',
                      positionStyle: 'text-cyan-600 dark:text-cyan-400 font-semibold',
                      cardHover: 'hover:shadow-2xl hover:shadow-cyan-500/70'
                    };
                  }
                  
                  // FIX: Medal assignment based on OVERALL position
                  // overallPos 0 = 1st overall, overallPos 1 = 2nd overall, etc.
                  switch(overallPos) {
                    case 0: return { // 1st overall = Gold 🥇
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
                    case 1: return { // 2nd overall = Silver 🥈
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
                    case 2: return { // 3rd overall = Bronze 🥉
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
                    default: return { // 4th+ overall = No medal 📊
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
                
                const styling = getMedalStyling(medalPosition, employee.diamondRank);
                
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
                          {employee.diamondRank ? (
                            <Badge className={`${styling.badge} text-xs px-2 py-1 font-bold flex items-center gap-1`}>
                              <span>#0</span>
                              <span role="img" aria-label="diamond">💎</span> Diamond
                            </Badge>
                          ) : (
                            <Badge className={`${styling.badge} text-xs px-2 py-1 font-bold`}>
                              #{regularPosition + 1}
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
                        medalPosition === 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 shadow-lg' :
                        medalPosition === 1 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 shadow-md' :
                        medalPosition === 2 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 shadow-md' :
                        'bg-blue-50 dark:bg-blue-900/20 border-blue-200'
                      }`}>
                        <Calendar className={`h-5 w-5 text-blue-600 mx-auto mb-1`} />
                        <div className={`text-lg font-bold text-blue-700 dark:text-blue-300`}>
                          {employee.days === -1 ? 'No Track' : employee.days}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">Working Days</div>
                            </div>
                      <div className={`text-center p-3 rounded-lg ${
                        medalPosition === 0 ? 'bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 dark:from-yellow-900/20 dark:via-orange-900/20 dark:to-red-900/20 border-2 border-yellow-400 shadow-lg' :
                        medalPosition === 1 ? 'bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 dark:from-slate-900/20 dark:via-gray-900/20 dark:to-slate-900/20 border-2 border-slate-400 shadow-md' :
                        medalPosition === 2 ? 'bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-amber-900/20 border-2 border-amber-500 shadow-md' :
                        'bg-purple-50 dark:bg-purple-900/20'
                      }`}>
                        <TrendingUp className={`h-4 w-4 mx-auto mb-1 ${
                          medalPosition === 0 ? 'text-orange-600' :
                          medalPosition === 1 ? 'text-slate-600' :
                          medalPosition === 2 ? 'text-amber-600' :
                          'text-purple-600'
                        }`} />
                        <div className={`text-lg font-bold ${
                          medalPosition === 0 ? 'text-orange-700 dark:text-orange-300' :
                          medalPosition === 1 ? 'text-slate-700 dark:text-slate-300' :
                          medalPosition === 2 ? 'text-amber-700 dark:text-amber-300' :
                          'text-purple-700 dark:text-purple-300'
                        }`}>
                          {employee.performance.toFixed(1)}%
                          </div>
                        <div className={`text-xs ${
                          medalPosition === 0 ? 'text-orange-600 dark:text-orange-400' :
                          medalPosition === 1 ? 'text-slate-600 dark:text-slate-400' :
                          medalPosition === 2 ? 'text-amber-600 dark:text-amber-400' :
                          'text-purple-600 dark:text-purple-400'
                        }`}>
                          Performance
                            </div>
                          </div>
                        </div>

                    {/* Secondary Metrics */}
                    <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                      <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                        medalPosition === 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 shadow-md' :
                        medalPosition === 1 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 shadow-sm' :
                        medalPosition === 2 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 shadow-sm' :
                        'bg-red-50 dark:bg-red-900/20 border-red-200'
                      }`}>
                        <Clock className={`h-4 w-4 text-red-600`} />
                        <span className="text-red-700 dark:text-red-300 font-medium">
                          {employee.delay === -1 ? 'No Track' : `${formatTime(employee.delay)} Delay`}
                        </span>
                        </div>
                      <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                        medalPosition === 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 shadow-md' :
                        medalPosition === 1 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 shadow-sm' :
                        medalPosition === 2 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 shadow-sm' :
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
                        {employee.diamondRank ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-cyan-600 border-cyan-200 hover:bg-cyan-50"
                            onClick={() => handleRemoveDiamondRank(employee.id, employee.name)}
                          >
                            <Gem className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-cyan-600 border-cyan-200 hover:bg-cyan-50"
                            onClick={() => handleAssignDiamondRank(employee.id, employee.name)}
                          >
                            💎
                          </Button>
                        )}
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
                  // Calculate positions correctly - Diamond employees don't count in regular ranking
                  const diamondCount = employees.filter(emp => emp.diamondRank).length;
                  const regularPosition = employee.diamondRank ? 0 : index - diamondCount; // Diamond gets 0, regular employees get their actual position
                  
                  // Use regular position for both badge and medal effects
                  // For Diamond employees, use special position that doesn't affect medals
                  const medalPosition = employee.diamondRank ? -1 : regularPosition;
                  
                  // Enhanced medal styling for top 3 OVERALL positions + Diamond rank
                  const getMedalStyling = (overallPos: number, isDiamond: boolean = false) => {
                    // Diamond rank overrides all other rankings
                    if (isDiamond) {
                      return {
                        border: 'border-4 border-cyan-400 shadow-2xl shadow-cyan-500/60',
                        bg: 'bg-gradient-to-br from-cyan-100 via-blue-100 to-purple-100 dark:from-cyan-950/50 dark:via-blue-950/50 dark:to-purple-950/50 relative overflow-hidden',
                        avatar: 'bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 shadow-xl border-4 border-cyan-300',
                        icon: <DiamondIcon className="h-6 w-6 text-cyan-100" />,
                        iconBg: 'bg-gradient-to-br from-cyan-600 to-purple-600',
                        specialEffect: 'before:absolute before:inset-0 before:bg-gradient-to-r before:from-cyan-400/20 before:via-blue-400/20 before:to-purple-400/20',
                        nameIcon: <DiamondIcon className="h-5 w-5 text-cyan-600" />,
                        badge: 'bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white font-bold shadow-lg',
                        nameStyle: 'text-cyan-700 dark:text-cyan-300 font-bold text-lg',
                        positionStyle: 'text-cyan-600 dark:text-cyan-400 font-semibold',
                        cardHover: 'hover:shadow-2xl hover:shadow-cyan-500/70'
                      };
                    }
                    
                    // FIX: Medal assignment based on OVERALL position
                    // overallPos 0 = 1st overall, overallPos 1 = 2nd overall, etc.
                    switch(overallPos) {
                      case 0: return { // 1st overall = Gold 🥇
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
                      case 1: return { // 2nd overall = Silver 🥈
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
                      case 2: return { // 3rd overall = Bronze 🥉
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
                      default: return { // 4th+ overall = No medal 📊
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
                  
                   // Medal styling for desktop table + Diamond rank
                   const getTableStyling = (overallPos: number, isDiamond: boolean = false) => {
                    if (isDiamond) {
                      return {
                        row: 'bg-gradient-to-r from-cyan-100 via-blue-100 to-purple-100 dark:from-cyan-950/50 dark:via-blue-950/50 dark:to-purple-950/50 border-4 border-cyan-400 shadow-2xl shadow-cyan-500/60',
                        avatar: 'bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 border-4 border-cyan-300 shadow-xl',
                        icon: <DiamondIcon className="h-4 w-4 text-cyan-100" />,
                        iconBg: 'bg-gradient-to-br from-cyan-600 to-purple-600',
                        nameIcon: <DiamondIcon className="h-3 w-3 text-cyan-600" />,
                        performance: 'bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white shadow-xl font-bold',
                        badge: 'bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white font-bold'
                      };
                    }
                    
                     switch(overallPos) {
                       case 0: return { // 1st overall = Gold 🥇
                        row: 'bg-gradient-to-r from-yellow-100 via-orange-100 to-red-100 dark:from-yellow-950/40 dark:via-orange-950/40 dark:to-red-950/40 border-4 border-yellow-400 shadow-2xl shadow-yellow-500/50',
                        avatar: 'bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 border-4 border-yellow-300 shadow-xl',
                        icon: <Crown className="h-4 w-4 text-yellow-100" />,
                        iconBg: 'bg-gradient-to-br from-yellow-600 to-orange-600',
                        nameIcon: <Flame className="h-3 w-3 text-orange-500" />,
                        performance: 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white shadow-xl font-bold',
                        badge: 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white font-bold'
                      };
                       case 1: return { // 2nd overall = Silver 🥈
                        row: 'bg-gradient-to-r from-slate-100 via-gray-100 to-slate-200 dark:from-slate-950/40 dark:via-gray-950/40 dark:to-slate-950/40 border-4 border-slate-400 shadow-xl shadow-slate-500/30',
                         avatar: 'bg-gradient-to-br from-slate-500 via-gray-600 to-slate-700 shadow-lg border-4 border-slate-300',
                        icon: <Medal className="h-4 w-4 text-slate-100" />,
                        iconBg: 'bg-gradient-to-br from-slate-600 to-gray-700',
                        nameIcon: <Star className="h-3 w-3 text-slate-600" />,
                        performance: 'bg-gradient-to-r from-slate-500 via-gray-600 to-slate-700 text-white shadow-lg font-bold',
                        badge: 'bg-gradient-to-r from-slate-500 via-gray-600 to-slate-700 text-white font-bold'
                      };
                       case 2: return { // 3rd overall = Bronze 🥉
                          row: 'bg-gradient-to-r from-amber-200 via-orange-200 to-amber-300 dark:from-amber-900/50 dark:via-orange-900/50 dark:to-amber-900/50 border-4 border-amber-600 shadow-xl shadow-amber-500/40',
                         avatar: 'bg-gradient-to-br from-amber-700 via-amber-800 to-orange-900 shadow-lg border-4 border-amber-600',
                          icon: <Award className="h-4 w-4 text-amber-100" />,
                          iconBg: 'bg-gradient-to-br from-amber-700 to-orange-900',
                          nameIcon: <Trophy className="h-3 w-3 text-amber-700" />,
                          performance: 'bg-gradient-to-r from-amber-700 via-amber-800 to-orange-900 text-white shadow-lg font-bold',
                          badge: 'bg-gradient-to-r from-amber-700 via-amber-800 to-orange-900 text-white font-bold'
                        };
                       default: return { // 4th+ overall = No medal 📊
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
                  
                   const tableStyling = getTableStyling(medalPosition, employee.diamondRank);
                  
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
                              {employee.diamondRank ? (
                                <Badge className={`${tableStyling.badge} text-xs px-2 py-0.5 flex-shrink-0 font-bold flex items-center gap-1`}>
                                  #0
                                  <DiamondIcon className="h-3 w-3" />
                                  Diamond
                                </Badge>
                              ) : (
                                <Badge className={`${tableStyling.badge} text-xs px-2 py-0.5 flex-shrink-0 font-bold`}>
                                  #{regularPosition + 1}
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

                      {/* Responsive Actions: Buttons visible on larger screens, menu on smaller */}
                      <td className="text-center p-2">
                        <div className="hidden md:flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleEditEmployee(employee)}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit Performance</TooltipContent>
                          </Tooltip>
                          
                          {employee.diamondRank ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="destructive" 
                                  size="icon" 
                                  className="h-8 w-8 bg-red-100 text-red-600 hover:bg-red-200"
                                  onClick={() => handleRemoveDiamondRank(employee.id, employee.name)}
                                >
                                  <Gem className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Remove Diamond Rank</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="h-8 w-8 border-cyan-400 text-cyan-500 hover:bg-cyan-50"
                                  onClick={() => handleAssignDiamondRank(employee.id, employee.name)}
                                >
                                  <Gem className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Assign Diamond Rank</TooltipContent>
                            </Tooltip>
                          )}
                        </div>

                        {/* Dropdown Menu for Mobile */}
                        <div className="md:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditEmployee(employee)}>
                                <Edit3 className="mr-2 h-4 w-4" />
                                <span>Edit Performance</span>
                              </DropdownMenuItem>
                              {employee.diamondRank ? (
                                <DropdownMenuItem 
                                  className="text-red-600 focus:bg-red-50 focus:text-red-700"
                                  onClick={() => handleRemoveDiamondRank(employee.id, employee.name)}
                                >
                                  <Gem className="mr-2 h-4 w-4" />
                                  <span>Remove Diamond</span>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  className="text-cyan-600 focus:bg-cyan-50 focus:text-cyan-700"
                                  onClick={() => handleAssignDiamondRank(employee.id, employee.name)}
                                >
                                  <Gem className="mr-2 h-4 w-4" />
                                  <span>Assign Diamond</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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

    {/* Edit Employee Sheet - Simplified Performance Only */}
    <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
      <SheetContent className="w-[400px] sm:w-[450px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Edit Performance Score
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Employee Info - Read Only */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Employee Details</h4>
            <div className="space-y-1 text-sm text-blue-800">
              <div><strong>Name:</strong> {editingEmployee?.name}</div>
              <div><strong>Position:</strong> {editingEmployee?.position}</div>
              <div><strong>Current Score:</strong> {editingEmployee?.performance.toFixed(1)}%</div>
            </div>
          </div>
          
          {/* Performance Score Edit */}
          <div className="space-y-4">
            <div className="space-y-3">
              <label className="text-lg font-semibold text-gray-900">Performance Score (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={editForm.performance}
                onChange={(e) => setEditForm({ ...editForm, performance: parseFloat(e.target.value) || 0 })}
                placeholder="Enter performance percentage"
                className="text-2xl font-bold text-center h-16 text-blue-600"
              />
              <p className="text-sm text-gray-600 text-center">Enter a value between 0 and 100</p>
            </div>

            {/* Performance Preview */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h5 className="text-sm font-medium text-gray-700 mb-3">Performance Preview</h5>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">New Score:</span>
                <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                  editForm.performance >= 90 ? 'bg-green-100 text-green-800' :
                  editForm.performance >= 75 ? 'bg-blue-100 text-blue-800' :
                  editForm.performance >= 60 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {editForm.performance.toFixed(1)}%
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-600">Status:</span>
                <span className={`text-sm font-medium ${
                  editForm.performance >= 90 ? 'text-green-600' :
                  editForm.performance >= 75 ? 'text-blue-600' :
                  editForm.performance >= 60 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {editForm.performance >= 90 ? 'Excellent' :
                   editForm.performance >= 75 ? 'Good' :
                   editForm.performance >= 60 ? 'Average' : 'Poor'}
                </span>
              </div>
            </div>

            {/* Current Metrics - Compact */}
            <div className="bg-gray-50 p-3 rounded-lg border">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Current Metrics</h5>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>Days: {editingEmployee?.days === -1 ? 'No Track' : editingEmployee?.days || 0}</div>
                <div>Tasks: {editingEmployee?.tasks.completed || 0}/{editingEmployee?.tasks.total || 0}</div>
                <div>Delay: {editingEmployee?.delay === -1 ? 'No Track' : formatHoursAndMinutes(editingEmployee?.delay || 0)}</div>
                <div>Overtime: {editingEmployee?.overtime === -1 ? 'No Track' : formatHoursAndMinutes(editingEmployee?.overtime || 0)}</div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSaveEdit} className="flex-1 h-12 text-lg font-semibold">
              <Save className="h-5 w-5 mr-2" />
              Save Performance
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsEditSheetOpen(false)}
              className="h-12 px-6"
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