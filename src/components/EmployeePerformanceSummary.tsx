import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Award
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
}

const EmployeePerformanceSummary: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    if (user) {
      loadPerformanceSummary();
    }
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
        return;
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
          shifts:shift_id(name, start_time, end_time, duration_hours)
        `)
        .eq('user_id', user.id)
        .gte('work_date', startDate.toISOString().split('T')[0])
        .lte('work_date', endDate.toISOString().split('T')[0]);

      if (shiftsError) {
        console.error('Error loading shifts data:', shiftsError);
        return;
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

      console.log('🎯 EmployeePerformanceSummary - Universal Smart Offsetting:', {
        userId: user.id,
        totalDelayMinutes,
        totalBreakMinutes,
        totalDelayAndBreakMinutes,
        rawDelayToFinishHours: rawDelayToFinishHours.toFixed(2),
        totalOvertimeHours: totalOvertimeHours.toFixed(2),
        finalOvertimeHours: finalOvertimeHours.toFixed(2),
        finalDelayToFinishHours: finalDelayToFinishHours.toFixed(2),
        smartOffsetingApplied: totalOvertimeHours > 0 && rawDelayToFinishHours > 0,
        logic: totalOvertimeHours > rawDelayToFinishHours 
          ? 'PERFORMANCE: Overtime covers delay' 
          : 'PERFORMANCE: Delay remains after overtime offset'
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
        status: performanceData?.performance_status || 'Good'
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
      case 'Excellent': return 'text-green-600 bg-green-50';
      case 'Good': return 'text-blue-600 bg-blue-50';
      case 'Average': return 'text-yellow-600 bg-yellow-50';
      case 'Poor': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getDelayToFinishDisplay = (delayToFinish: number, overtimeHours: number) => {
    if (delayToFinish <= 0.01) {
      // No delay remaining - either all clear or overtime covers it
      if (overtimeHours > 0) {
        return {
          text: `All Clear + ${formatTime(overtimeHours)} Extra`,
          color: 'text-green-600',
          icon: <Trophy className="h-4 w-4" />
        };
      } else {
        return {
          text: 'All Clear',
          color: 'text-green-600',
          icon: <CheckCircle className="h-4 w-4" />
        };
      }
    } else {
      // Delay remaining after overtime offset
      return {
        text: `${formatTime(delayToFinish)} Delay`,
        color: 'text-red-600',
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          My Performance Summary
        </CardTitle>
        <CardDescription>
          Your work summary for {format(new Date(currentMonth), 'MMMM yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Performance Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {/* Total Regular Hours */}
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <div className="text-sm text-blue-600 mb-1">Total Regular Hours</div>
            <div className="text-xl font-bold text-blue-900">
              {formatTime(summary.totalRegularHours)}
            </div>
          </div>

          {/* Total Overtime Hours */}
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <TrendingUp className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <div className="text-sm text-purple-600 mb-1">Total Overtime Hours</div>
            <div className="text-xl font-bold text-purple-900">
              {formatTime(summary.totalOvertimeHours)}
            </div>
          </div>

          {/* Delay to Finish */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            {delayDisplay.icon}
            <div className={`mx-auto mb-2 ${delayDisplay.color}`}></div>
            <div className={`text-sm mb-1 ${delayDisplay.color}`}>Delay to Finish</div>
            <div className={`text-xl font-bold ${delayDisplay.color}`}>
              {delayDisplay.text}
            </div>
          </div>

          {/* Total Working Days */}
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Calendar className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <div className="text-sm text-green-600 mb-1">Total Working Days</div>
            <div className="text-xl font-bold text-green-900">
              {summary.totalWorkingDays}
              <div className="text-xs text-green-600 mt-1">days</div>
            </div>
          </div>

          {/* Average Hours/Day */}
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <Target className="h-6 w-6 text-orange-600 mx-auto mb-2" />
            <div className="text-sm text-orange-600 mb-1">Average Hours/Day</div>
            <div className="text-xl font-bold text-orange-900">
              {formatTime(summary.averageHoursPerDay)}
            </div>
          </div>
        </div>

        {/* Performance Score and Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
            <Award className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
            <div className="text-sm text-yellow-700 mb-1">Performance Score</div>
            <div className="text-2xl font-bold text-yellow-800">
              {summary.performanceScore.toFixed(1)}%
            </div>
          </div>

          <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
            <Timer className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <div className="text-sm text-blue-700 mb-1">Punctuality</div>
            <div className="text-2xl font-bold text-blue-800">
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

        {/* Performance Explanation */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">📊 How "Delay to Finish" is calculated:</h4>
          <div className="text-sm text-gray-700 space-y-1">
            <div>• <strong>If Delay {'>'} Overtime:</strong> Shows remaining delay time (Red)</div>
            <div>• <strong>If Overtime {'>'} Delay:</strong> Shows extra overtime worked (Green)</div>
            <div>• <strong>If Equal:</strong> Shows "All Clear" (Perfect balance)</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeePerformanceSummary; 