import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { 
  Clock, 
  TrendingUp, 
  Calendar, 
  Target, 
  Trophy,
  Timer,
  AlertTriangle,
  CheckCircle,
  Award,
  Star,
  FileText,
  Users,
  TrendingDown,
  User,
  BarChart3,
  CheckSquare,
  MessageSquare,
  Zap,
  Crown,
  Medal,
  TimerOff,
  Coffee,
  Gem
} from 'lucide-react';

interface PerformanceSummary {
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalDelayHours: number;
  delayToFinish: number;
  totalWorkingDays: number;
  averageHoursPerDay: number;
  performanceScore: number;
  punctualityPercentage: number;
  status: string;
  totalRawDelayMinutes: number;
  totalBreakMinutes: number;
  // Enhanced data
  tasks: {
    total: number;
    completed: number;
    successRate: number;
  };
  ratings: {
    averageRating: number;
    totalRatings: number;
    latestRating: number;
  };
  workReports: {
    submitted: number;
    total: number;
    completionRate: number;
  };
  ranking: {
    position: number;
    totalEmployees: number;
    isTopPerformer: boolean;
  };
  diamondRank?: boolean;
}

const EmployeePerformanceSummary: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const currentMonth = format(new Date(), 'yyyy-MM');

  useEffect(() => {
    if (user) {
      loadPerformanceSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentMonth]);

  const loadPerformanceSummary = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Get current month's performance data from admin dashboard
      const { data: performanceData, error } = await supabase
        .from('admin_performance_dashboard')
        .select('*')
        .eq('employee_id', user.id)
        .eq('month_year', currentMonth)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading performance data:', error);
      }

      // Get monthly shifts data to calculate detailed hours
      const startDate = new Date(currentMonth + '-01');
      const endDate = new Date(currentMonth);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);

      const { data: shiftsData, error: shiftsError } = await supabase
        .from('monthly_shifts')
        .select(`
          *,
          shifts:shift_id(name, start_time, end_time)
        `)
        .eq('user_id', user.id)
        .gte('work_date', startDate.toISOString().split('T')[0])
        .lte('work_date', endDate.toISOString().split('T')[0]);

      if (shiftsError) {
        console.error('Error loading shifts data:', shiftsError);
      }

      console.log('📒 PerformanceSummary fetched shifts:', {
        rows: shiftsData?.length,
        month: currentMonth,
        userId: user.id
      });

      // Get tasks data
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (tasksError) {
        console.error('Error loading tasks data:', tasksError);
      }

      // Get ratings data
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('employee_ratings')
        .select('*')
        .eq('employee_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (ratingsError) {
        console.error('Error loading ratings data:', ratingsError);
      }

      // Get work reports data
      const { data: reportsData, error: reportsError } = await supabase
        .from('work_reports')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (reportsError) {
        console.error('Error loading reports data:', reportsError);
      }

      // Get user's diamond rank status
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('diamond_rank, diamond_rank_assigned_by, diamond_rank_assigned_at')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error loading user data:', userError);
      }
      
      // Fetch all users to filter for ranking
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('id, position');

      if (allUsersError) {
        console.error('Error fetching all users for ranking:', allUsersError);
      }

      // Get ranking data
      const { data: allPerformanceData, error: rankingError } = await supabase
        .from('admin_performance_dashboard')
        .select('employee_id, average_performance_score')
        .eq('month_year', currentMonth)
        .order('average_performance_score', { ascending: false });

      if (rankingError) {
        console.error('Error loading ranking data:', rankingError);
      }

      // Calculate summary from shifts data
      let totalRegularHours = 0;
      let totalOvertimeHours = 0;
      let totalDelayMinutes = 0;
      let totalBreakMinutes = 0;
      const workingDays = shiftsData?.length || 0;

      if (shiftsData && shiftsData.length > 0) {
        shiftsData.forEach(shift => {
          // Calculate regular hours based on shift type
          if (shift.shifts?.name?.toLowerCase().includes('day')) {
            totalRegularHours += Math.min(shift.regular_hours || 0, 7); // Day shift max 7h
          } else if (shift.shifts?.name?.toLowerCase().includes('night')) {
            totalRegularHours += Math.min(shift.regular_hours || 0, 8); // Night shift max 8h
          } else {
            totalRegularHours += Math.min(shift.regular_hours || 0, 8); // Default 8h
          }
          
          totalOvertimeHours += shift.overtime_hours || 0;
          totalDelayMinutes += shift.delay_minutes || 0;
          totalBreakMinutes += shift.total_break_minutes || 0;
        });
      }

      const averageHoursPerDay = workingDays > 0 ? (totalRegularHours + totalOvertimeHours) / workingDays : 0;

      // Universal Smart Offsetting Logic: Include break time + delay minutes
      const totalDelayAndBreakMinutes = totalDelayMinutes + totalBreakMinutes;
      const rawDelayToFinishHours = totalDelayAndBreakMinutes / 60; // Convert to hours
      
      // Apply smart offsetting logic: Total Overtime Hours - (Delay + Break Time)
      let finalOvertimeHours = 0;
      let finalDelayToFinishHours = 0;
      
      if (totalOvertimeHours > rawDelayToFinishHours) {
        // If Overtime > Total Delay: Show remaining overtime, delay becomes "All Clear"
        finalOvertimeHours = totalOvertimeHours - rawDelayToFinishHours;
        finalDelayToFinishHours = 0; // All Clear
      } else {
        // If Total Delay >= Overtime: Show remaining delay, overtime becomes 0
        finalDelayToFinishHours = rawDelayToFinishHours - totalOvertimeHours;
        finalOvertimeHours = 0;
      }

      // Calculate tasks data
      const totalTasks = tasksData?.length || 0;
      const completedTasks = tasksData?.filter(task => 
        task.status === 'Complete' || 
        task.status === 'Completed' || 
        task.status === 'complete' ||
        task.progress_percentage === 100 ||
        task.visual_feeding || 
        task.attachment_file
      ).length || 0;
      const taskSuccessRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Calculate ratings data
      const totalRatings = ratingsData?.length || 0;
      const averageRating = totalRatings > 0 
        ? ratingsData.reduce((sum, rating) => sum + rating.rating, 0) / totalRatings 
        : 0;
      const latestRating = ratingsData?.[0]?.rating || 0;

      // Calculate work reports data
      const submittedReports = reportsData?.length || 0;
      const expectedReports = workingDays; // One report per working day
      const reportCompletionRate = expectedReports > 0 ? (submittedReports / expectedReports) * 100 : 0;

      // Calculate ranking
      let ranking = { position: 0, totalEmployees: 0, isTopPerformer: false };
      if (allPerformanceData && allPerformanceData.length > 0 && allUsers) {
        // Filter performance data to only include check-in enabled positions
        const checkInPositions = ['Customer Service', 'Designer', 'Copy Writing', 'Media Buyer', 'Web Developer'];
        const checkInUserIds = allUsers
          .filter(u => checkInPositions.includes(u.position))
          .map(u => u.id);
        
        const filteredPerformanceData = allPerformanceData.filter(p => checkInUserIds.includes(p.employee_id));

        const userRank = filteredPerformanceData.findIndex(p => p.employee_id === user.id) + 1;
        ranking = {
          position: userRank,
          totalEmployees: filteredPerformanceData.length,
          isTopPerformer: userRank === 1 && userRank > 0
        };
      }

      console.log('🎯 EmployeePerformanceSummary - Enhanced Data:', {
        userId: user.id,
        totalTasks,
        completedTasks,
        taskSuccessRate: taskSuccessRate.toFixed(1) + '%',
        totalRatings,
        averageRating: averageRating.toFixed(1),
        submittedReports,
        expectedReports,
        reportCompletionRate: reportCompletionRate.toFixed(1) + '%',
        ranking: `${ranking.position}/${ranking.totalEmployees}`,
        diamondRank: userData?.diamond_rank || false
      });

      const summaryData: PerformanceSummary = {
        totalRegularHours,
        totalOvertimeHours: finalOvertimeHours, // Smart overtime after offsetting
        totalDelayHours: rawDelayToFinishHours, // Raw delay for reference
        delayToFinish: finalDelayToFinishHours, // Smart delay after offsetting
        totalWorkingDays: workingDays,
        averageHoursPerDay,
        performanceScore: performanceData?.average_performance_score || 0,
        punctualityPercentage: performanceData?.punctuality_percentage || 100,
        status: performanceData?.performance_status || 'Good',
        totalRawDelayMinutes: totalDelayMinutes,
        totalBreakMinutes: totalBreakMinutes,
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          successRate: taskSuccessRate
        },
        ratings: {
          averageRating,
          totalRatings,
          latestRating
        },
        workReports: {
          submitted: submittedReports,
          total: expectedReports,
          completionRate: reportCompletionRate
        },
        ranking,
        diamondRank: userData?.diamond_rank || false
      };

      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading performance summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (hours: number): string => {
    if (hours === 0) return '0min';
    
    const wholeHours = Math.floor(Math.abs(hours));
    const minutes = Math.round((Math.abs(hours) - wholeHours) * 60);
    
    if (wholeHours === 0) {
      return `${minutes}min`;
    } else if (minutes === 0) {
      return `${wholeHours}h`;
    } else {
      return `${wholeHours}h ${minutes}min`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Excellent': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'Good': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'Average': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'Poor': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getDelayToFinishDisplay = (delayToFinish: number, overtimeHours: number) => {
    if (delayToFinish <= 0.01) {
      // No delay remaining - either all clear or overtime covers it
      if (overtimeHours > 0) {
        return {
          text: `All Clear + ${formatTime(overtimeHours)} Extra`,
          color: 'text-green-600 dark:text-green-300',
          icon: <Trophy className="h-4 w-4" />
        };
      } else {
        return {
          text: 'All Clear',
          color: 'text-green-600 dark:text-green-300',
          icon: <CheckCircle className="h-4 w-4" />
        };
      }
    } else {
      // Delay remaining after overtime offset
      return {
        text: `${formatTime(delayToFinish)} Delay`,
        color: 'text-red-600 dark:text-red-300',
        icon: <AlertTriangle className="h-4 w-4" />
      };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            My Performance Summary
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

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            My Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No performance data available for this month
          </div>
        </CardContent>
      </Card>
    );
  }

  const delayDisplay = getDelayToFinishDisplay(summary.delayToFinish, summary.totalOvertimeHours);

  // Determine rank tier (gold, silver, bronze) if not diamond
  let rankTier: 'gold' | 'silver' | 'bronze' | null = null;
  if (!summary.diamondRank) {
    if (summary.ranking.position === 1) rankTier = 'gold';
    else if (summary.ranking.position === 2) rankTier = 'silver';
    else if (summary.ranking.position === 3) rankTier = 'bronze';
  }

  const renderRankBanner = () => {
    if (summary.diamondRank) {
      return (
        <Card className="border-2 border-cyan-400 bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 dark:from-cyan-900/30 dark:via-cyan-800/30 dark:to-teal-900/30 dark:border-cyan-600 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-3">
              <Gem className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
              <div className="text-center">
                <h3 className="text-lg font-bold text-cyan-800 dark:text-cyan-300">Diamond Rank Employee</h3>
                <p className="text-sm text-cyan-700 dark:text-cyan-400">Exceptional performance recognized by management</p>
              </div>
              <Gem className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
            </div>
          </CardContent>
        </Card>
      );
    }
    if (!rankTier) return null;

    const tierStyles: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
      gold: {
        bg: 'from-yellow-100 via-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:via-amber-800/30 dark:to-yellow-900/30',
        text: 'text-yellow-800 dark:text-yellow-300',
        border: 'border-yellow-500 dark:border-yellow-600',
        icon: <Crown className="h-8 w-8 text-yellow-700 dark:text-yellow-400" />
      },
      silver: {
        bg: 'from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800/50 dark:via-gray-700/50 dark:to-gray-800/50',
        text: 'text-gray-800 dark:text-gray-300',
        border: 'border-gray-400 dark:border-gray-600',
        icon: <Trophy className="h-8 w-8 text-gray-700 dark:text-gray-400" />
      },
      bronze: {
        bg: 'from-amber-200 via-amber-100 to-amber-200 dark:from-amber-900/40 dark:via-amber-800/40 dark:to-amber-900/40',
        text: 'text-amber-800 dark:text-amber-300',
        border: 'border-amber-500 dark:border-amber-600',
        icon: <Medal className="h-8 w-8 text-amber-700 dark:text-amber-400" />
      }
    };
    const style = tierStyles[rankTier];

    const tierLabel = rankTier.charAt(0).toUpperCase() + rankTier.slice(1);

    return (
      <Card className={`border-2 ${style.border} bg-gradient-to-r ${style.bg} shadow-sm`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-3">
            {style.icon}
            <div className="text-center">
              <h3 className={`text-lg font-bold ${style.text}`}>{tierLabel} Rank Employee</h3>
              <p className={`text-sm ${style.text} opacity-90`}>Outstanding performance this month</p>
            </div>
            {style.icon}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Rank Banner (Diamond / Gold / Silver / Bronze) */}
      {renderRankBanner()}

      {/* Main Performance Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                My Performance Summary
              </CardTitle>
              <CardDescription>
                Your work summary for {format(new Date(currentMonth), 'MMMM yyyy')}
              </CardDescription>
            </div>
            {summary.ranking.isTopPerformer && (
              <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 px-3 py-1">
                <Crown className="h-4 w-4 mr-1" />
                Top Performer
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Performance Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {/* Total Regular Hours */}
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600 dark:text-blue-300 mx-auto mb-2" />
              <div className="text-sm text-blue-600 dark:text-blue-300 mb-1">Total Regular Hours</div>
              <div className="text-xl font-bold text-blue-900">
                {formatTime(summary.totalRegularHours)}
              </div>
            </div>

            {/* Total Overtime Hours */}
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-300 mx-auto mb-2" />
              <div className="text-sm text-purple-600 dark:text-purple-300 mb-1">Total Overtime Hours</div>
              <div className="text-xl font-bold text-purple-900">
                {formatTime(summary.totalOvertimeHours)}
              </div>
            </div>

            {/* Delay to Finish */}
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
              {delayDisplay.icon}
              <div className={`mx-auto mb-2 ${delayDisplay.color}`}></div>
              <div className={`text-sm mb-1 ${delayDisplay.color}`}>Delay to Finish</div>
              <div className={`text-xl font-bold ${delayDisplay.color}`}>
                {delayDisplay.text}
              </div>
            </div>

            {/* Total Working Days */}
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600 dark:text-green-300 mx-auto mb-2" />
              <div className="text-sm text-green-600 dark:text-green-300 mb-1">Total Working Days</div>
              <div className="text-xl font-bold text-green-900">
                {summary.totalWorkingDays}
                <div className="text-xs text-green-600 dark:text-green-300 mt-1">days</div>
              </div>
            </div>

            {/* Average Hours/Day */}
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <Target className="h-6 w-6 text-orange-600 dark:text-orange-300 mx-auto mb-2" />
              <div className="text-sm text-orange-600 dark:text-orange-300 mb-1">Average Hours/Day</div>
              <div className="text-xl font-bold text-orange-900">
                {formatTime(summary.averageHoursPerDay)}
              </div>
            </div>
          </div>

          {/* Performance Score and Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <Award className="h-6 w-6 text-yellow-600 dark:text-yellow-200 mx-auto mb-2" />
              <div className="text-sm text-yellow-700 dark:text-yellow-200 mb-1">Performance Score</div>
              <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-100">
                {summary.performanceScore.toFixed(1)}%
              </div>
            </div>

            <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Timer className="h-6 w-6 text-blue-600 dark:text-blue-200 mx-auto mb-2" />
              <div className="text-sm text-blue-700 dark:text-blue-200 mb-1">Punctuality</div>
              <div className="text-2xl font-bold text-blue-800 dark:text-blue-100">
                {summary.punctualityPercentage.toFixed(1)}%
              </div>
            </div>

            <div className={`text-center p-4 rounded-lg border ${getStatusColor(summary.status)}`}>
              <CheckCircle className="h-6 w-6 mx-auto mb-2" />
              <div className="text-sm mb-1">Status</div>
              <div className="text-2xl font-bold">
                {summary.status}
              </div>
            </div>
          </div>

          {/* Enhanced Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Tasks */}
            <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <CheckSquare className="h-6 w-6 text-indigo-600 dark:text-indigo-300 mx-auto mb-2" />
              <div className="text-sm text-indigo-600 dark:text-indigo-300 mb-1">Tasks Completed</div>
              <div className="text-xl font-bold text-indigo-900">
                {summary.tasks.completed}/{summary.tasks.total}
              </div>
              <div className="text-xs text-indigo-600 dark:text-indigo-300 mt-1">
                {summary.tasks.successRate.toFixed(1)}% success rate
              </div>
            </div>

            {/* Ratings */}
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <Star className="h-6 w-6 text-yellow-600 dark:text-yellow-300 mx-auto mb-2" />
              <div className="text-sm text-yellow-600 dark:text-yellow-300 mb-1">Average Rating</div>
              <div className="text-xl font-bold text-yellow-900">
                {summary.ratings.averageRating.toFixed(1)}/5
              </div>
              <div className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">
                {summary.ratings.totalRatings} ratings received
              </div>
            </div>

            {/* Work Reports */}
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <FileText className="h-6 w-6 text-green-600 dark:text-green-300 mx-auto mb-2" />
              <div className="text-sm text-green-600 dark:text-green-300 mb-1">Work Reports</div>
              <div className="text-xl font-bold text-green-900">
                {summary.workReports.submitted}/{summary.workReports.total}
              </div>
              <div className="text-xs text-green-600 dark:text-green-300 mt-1">
                {summary.workReports.completionRate.toFixed(1)}% completion
              </div>
            </div>

            {/* Ranking */}
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-300 mx-auto mb-2" />
              <div className="text-sm text-purple-600 dark:text-purple-300 mb-1">Performance Rank</div>
              <div className="text-xl font-bold text-purple-900">
                #{summary.ranking.position}
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-300 mt-1">
                of {summary.ranking.totalEmployees} employees
              </div>
            </div>
          </div>

          {/* Shift Details */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-800">Shift Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <TimerOff className="h-6 w-6 text-red-600 dark:text-red-300 mx-auto mb-2" />
                <div className="text-sm text-red-600 dark:text-red-300 mb-1">Total Delay</div>
                <div className="text-xl font-bold text-red-900">
                  {formatTime(summary.totalRawDelayMinutes / 60)}
                </div>
                <div className="text-xs text-red-600 dark:text-red-300 mt-1">
                  Before overtime offset
                </div>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <Coffee className="h-6 w-6 text-orange-600 dark:text-orange-300 mx-auto mb-2" />
                <div className="text-sm text-orange-600 dark:text-orange-300 mb-1">Total Break Time</div>
                <div className="text-xl font-bold text-orange-900">
                  {formatTime(summary.totalBreakMinutes / 60)}
                </div>
                <div className="text-xs text-orange-600 dark:text-orange-300 mt-1">
                  Tracked during shifts
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeePerformanceSummary; 