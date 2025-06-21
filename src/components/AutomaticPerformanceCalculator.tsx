import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface AutomaticPerformanceCalculatorProps {
  intervalMinutes?: number; // How often to recalculate (default: 30 minutes)
  enableAutoRecalculation?: boolean;
}

export const AutomaticPerformanceCalculator: React.FC<AutomaticPerformanceCalculatorProps> = ({
  intervalMinutes = 30,
  enableAutoRecalculation = true
}) => {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [lastCalculation, setLastCalculation] = useState<Date | null>(null);

  // Automatic Performance Calculation Function (Justice & Fair)
  const calculatePerformanceAutomatically = async () => {
    if (!user || user.role !== 'admin') return;
    
    try {
      setIsRunning(true);
      console.log('🔄 Starting automatic performance calculation...');
      
      const currentMonth = format(new Date(), 'yyyy-MM');
      
      // Get all employees
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'employee');

      if (usersError) throw usersError;

      let updatedCount = 0;
      
      for (const userRecord of users) {
        try {
          // Get monthly shifts for this employee
          const { data: monthlyShifts, error: shiftsError } = await supabase
            .from('monthly_shifts')
            .select(`
              *,
              shifts:shift_id(name, start_time, end_time)
            `)
            .eq('user_id', userRecord.id)
            .like('work_date', `${currentMonth}%`)
            .not('check_in_time', 'is', null)
            .not('check_out_time', 'is', null);

          if (shiftsError || !monthlyShifts || monthlyShifts.length === 0) {
            continue;
          }

          // Calculate performance metrics with JUSTICE & FAIRNESS
          const totalWorkingDays = monthlyShifts.length;
          const totalDelayMinutes = monthlyShifts.reduce((sum, shift) => sum + (shift.delay_minutes || 0), 0);
          const totalDelayHours = totalDelayMinutes / 60;
          const totalOvertimeHours = monthlyShifts.reduce((sum, shift) => sum + (shift.overtime_hours || 0), 0);
          const totalRegularHours = monthlyShifts.reduce((sum, shift) => sum + (shift.regular_hours || 0), 0);
          const totalBreakMinutes = monthlyShifts.reduce((sum, shift) => sum + (shift.total_break_minutes || 0), 0);

          // JUSTICE CALCULATION: Fair performance based on multiple factors
          let totalPerformanceScore = 0;
          let validShifts = 0;

          for (const shift of monthlyShifts) {
            if (shift.shifts) {
              // Determine expected hours based on shift type
              const isCustomShift = !shift.shifts.name?.toLowerCase().includes('day') && 
                                   !shift.shifts.name?.toLowerCase().includes('night');
              
              let expectedHours = 8; // Default
              
              if (shift.shifts.name?.toLowerCase().includes('day')) {
                expectedHours = 7; // Day shift = 7 hours
              } else if (shift.shifts.name?.toLowerCase().includes('night')) {
                expectedHours = 8; // Night shift = 8 hours
              } else if (isCustomShift && shift.shifts.start_time && shift.shifts.end_time) {
                // Custom shift: calculate duration
                try {
                  const [startH, startM] = shift.shifts.start_time.split(':').map(Number);
                  const [endH, endM] = shift.shifts.end_time.split(':').map(Number);
                  
                  let durationMinutes;
                  if (endH < startH || (endH === startH && endM < startM)) {
                    // Overnight shift
                    durationMinutes = (24 * 60 - (startH * 60 + startM)) + (endH * 60 + endM);
                  } else {
                    durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
                  }
                  expectedHours = durationMinutes / 60;
                } catch {
                  expectedHours = 8; // Fallback
                }
              }

              // BREAK-TIME-AWARE calculation
              const actualWorkTime = (shift.regular_hours || 0) + (shift.overtime_hours || 0);
              const shiftBreakMinutes = shift.total_break_minutes || 0;
              
              // Performance components (FAIR & BALANCED)
              let performanceScore = 0;
              
              // 1. Work Completion Score (40%)
              const completionRate = actualWorkTime / expectedHours;
              const workCompletionScore = Math.min(100, completionRate * 100);
              
              // 2. Punctuality Score (30%)
              const shiftDelayMinutes = shift.delay_minutes || 0;
              let punctualityScore = 100;
              if (shiftDelayMinutes > 0) {
                punctualityScore = Math.max(0, 100 - (shiftDelayMinutes / 5));
              }
              
              // 3. Break Time Management Score (20%)
              const expectedBreakMinutes = expectedHours <= 6 ? 15 : expectedHours <= 8 ? 30 : 45;
              const breakEfficiencyScore = shiftBreakMinutes <= expectedBreakMinutes ? 100 : 
                                          Math.max(0, 100 - ((shiftBreakMinutes - expectedBreakMinutes) / 5));
              
              // 4. Overtime Bonus (10%)
              const overtimeBonus = Math.min(10, (shift.overtime_hours || 0) * 2);
              
              // Calculate weighted final score
              performanceScore = (workCompletionScore * 0.4) + 
                               (punctualityScore * 0.3) + 
                               (breakEfficiencyScore * 0.2) + 
                               overtimeBonus;
              
              totalPerformanceScore += performanceScore;
              validShifts++;
            }
          }

          const averagePerformanceScore = validShifts > 0 ? totalPerformanceScore / validShifts : 75;
          
          // Fair punctuality calculation
          const punctualityPercentage = totalDelayHours >= 1 ? 0 : 
                                      totalDelayMinutes > 30 ? Math.max(0, 50 - (totalDelayMinutes * 2)) :
                                      totalDelayMinutes > 0 ? Math.max(0, 90 - (totalDelayMinutes * 3)) : 100;

          // Determine fair performance status
          let performanceStatus = 'Poor';
          if (averagePerformanceScore >= 90 && punctualityPercentage >= 85) {
            performanceStatus = 'Excellent';
          } else if (averagePerformanceScore >= 75 && punctualityPercentage >= 70) {
            performanceStatus = 'Good';
          } else if (averagePerformanceScore >= 60 || punctualityPercentage >= 50) {
            performanceStatus = 'Needs Improvement';
          }

          // Update performance record
          const { error: upsertError } = await supabase
            .from('admin_performance_dashboard')
            .upsert({
              employee_id: userRecord.id,
              employee_name: userRecord.name,
              month_year: currentMonth,
              total_working_days: totalWorkingDays,
              total_delay_minutes: totalDelayMinutes,
              total_delay_hours: totalDelayHours,
              total_overtime_hours: totalOvertimeHours,
              total_regular_hours: totalRegularHours,
              total_break_minutes: totalBreakMinutes,
              average_performance_score: Math.round(averagePerformanceScore * 100) / 100,
              punctuality_percentage: Math.round(punctualityPercentage * 100) / 100,
              performance_status: performanceStatus,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'employee_id,month_year'
            });

          if (!upsertError) {
            updatedCount++;
            console.log(`✅ Auto-updated performance for ${userRecord.name}: ${performanceStatus} (${averagePerformanceScore.toFixed(1)}%)`);
          }

        } catch (userError) {
          console.error(`❌ Error processing ${userRecord.name}:`, userError);
        }
      }
      
      setLastCalculation(new Date());
      console.log(`✅ Automatic performance calculation completed - Updated ${updatedCount} employees`);
      
    } catch (error) {
      console.error('❌ Automatic performance calculation failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  // Set up automatic calculation interval
  useEffect(() => {
    if (!enableAutoRecalculation || !user || user.role !== 'admin') return;

    // Run immediately on mount
    calculatePerformanceAutomatically();

    // Set up interval
    const interval = setInterval(() => {
      calculatePerformanceAutomatically();
    }, intervalMinutes * 60 * 1000); // Convert minutes to milliseconds

    return () => clearInterval(interval);
  }, [user, enableAutoRecalculation, intervalMinutes]);

  // Don't render anything visible - this is a background service
  return null;
};

export default AutomaticPerformanceCalculator; 