import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Calculator, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format, differenceInMinutes } from 'date-fns';

interface AdminRecalculateButtonProps {
  onRecalculationComplete?: () => void;
}

const AdminRecalculateButton: React.FC<AdminRecalculateButtonProps> = ({ onRecalculationComplete }) => {
  const { user } = useAuth();
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isRecalculatingPerformance, setIsRecalculatingPerformance] = useState(false);
  const [lastRecalculation, setLastRecalculation] = useState<Date | null>(null);
  const [lastPerformanceRecalculation, setLastPerformanceRecalculation] = useState<Date | null>(null);
  const [recalculationStats, setRecalculationStats] = useState<{
    totalRecords: number;
    updatedRecords: number;
    errors: number;
  } | null>(null);
  const [performanceStats, setPerformanceStats] = useState<{
    totalEmployees: number;
    updatedEmployees: number;
    errors: number;
  } | null>(null);

  // Only show for admins
  if (user?.role !== 'admin') {
    return null;
  }

  const recalculateDelayAndOvertime = async () => {
    setIsRecalculating(true);
    setRecalculationStats(null);
    
    try {
      console.log('🔄 Starting BREAK-TIME-AWARE delay and overtime recalculation...');
      
      // Fetch all monthly shift records with their shift info
      const { data: monthlyShifts, error: fetchError } = await supabase
        .from('monthly_shifts')
        .select(`
          *,
          shifts:shift_id(*)
        `)
        .not('check_in_time', 'is', null)
        .not('check_out_time', 'is', null)
        .order('work_date', { ascending: false });

      // Fetch break time data for all records
      const { data: breakTimeData, error: breakTimeError } = await supabase
        .from('check_ins')
        .select('user_id, timestamp, total_break_minutes, break_sessions')
        .gte('timestamp', '2024-01-01') // Get all recent data
        .order('timestamp', { ascending: false });

      if (breakTimeError) {
        console.warn('⚠️ Could not fetch break time data:', breakTimeError);
      }

      // Create a map of break time data by user and date
      const breakTimeMap = new Map();
      if (breakTimeData) {
        breakTimeData.forEach(item => {
          const dateKey = format(new Date(item.timestamp), 'yyyy-MM-dd');
          const key = `${item.user_id}-${dateKey}`;
          if (!breakTimeMap.has(key) || (breakTimeMap.get(key).totalBreakMinutes || 0) < (item.total_break_minutes || 0)) {
            breakTimeMap.set(key, {
              totalBreakMinutes: item.total_break_minutes || 0,
              breakSessions: item.break_sessions || []
            });
          }
        });
      }

      console.log(`📊 Found ${monthlyShifts.length} records to recalculate with break time data`);

      if (fetchError) {
        throw fetchError;
      }

      if (!monthlyShifts || monthlyShifts.length === 0) {
        toast.info('No shift records found to recalculate');
        return;
      }

      console.log(`📊 Found ${monthlyShifts.length} records to recalculate`);
      
      let updated = 0;
      let errors = 0;

      // Process each record
      for (const record of monthlyShifts) {
        try {
          const checkInTime = new Date(record.check_in_time);
          const checkOutTime = record.check_out_time ? new Date(record.check_out_time) : null;
          const shift = record.shifts;

          if (!shift) {
            console.warn(`⚠️ No shift data for record ${record.id}`);
            errors++;
            continue;
          }

          // Get break time data for this record
          const dateKey = format(new Date(record.work_date), 'yyyy-MM-dd');
          const breakKey = `${record.user_id}-${dateKey}`;
          const breakData = breakTimeMap.get(breakKey) || { totalBreakMinutes: 0, breakSessions: [] };
          // Re-enable break time calculation (auto-refresh issue fixed)
          // Break time is now properly included in UI after fixing CheckInContext refresh
          const breakTimeMinutes = breakData.totalBreakMinutes || 0;

          // Calculate work hours and overtime (only if checked out)
          let regularHours = record.regular_hours || 0;
          let overtimeHours = record.overtime_hours || 0;
          let delayMinutes = 0;
          let earlyCheckoutPenalty = 0;

          if (checkOutTime) {
            // CORRECTED: Must subtract break time here for accurate historical recalculation.
            // The live timer freezes, but this function works with raw check-in/out times.
            const totalMinutes = differenceInMinutes(checkOutTime, checkInTime);
            const actualWorkMinutes = totalMinutes - breakTimeMinutes;
            const actualWorkHours = actualWorkMinutes / 60;
            
            console.log(`🕐 CORRECTED Hours Calculation (With Break Subtraction):`, {
              totalMinutes: totalMinutes.toFixed(1),
              breakTimeMinutes: breakTimeMinutes,
              actualWorkMinutes: actualWorkMinutes.toFixed(1),
              actualWorkHours: actualWorkHours.toFixed(2),
              note: 'Subtracting break time from total duration for accurate recalculation.'
            });
            
            // Determine standard work hours based on shift type
            let standardWorkHours = 8; // Default for night shift
            const shiftNameLower = shift.name.toLowerCase();
            if (shiftNameLower === 'day shift' || shiftNameLower === 'day') {
              standardWorkHours = 7; // Day shift is 7 hours
            } else if (shiftNameLower !== 'night shift' && shiftNameLower !== 'night') {
              // For custom shifts like "Test", calculate duration from start/end times
              try {
                const [startHour, startMin] = shift.start_time.split(':').map(Number);
                const [endHour, endMin] = shift.end_time.split(':').map(Number);
                
                // Handle overnight shifts if end time is earlier than start time
                let durationMinutes;
                if (endHour < startHour || (endHour === startHour && endMin < startMin)) {
                  // Overnight shift (e.g., 22:00 to 06:00)
                  durationMinutes = (24 * 60 - (startHour * 60 + startMin)) + (endHour * 60 + endMin);
                } else {
                  // Same-day shift
                  durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
                }
                
                standardWorkHours = durationMinutes / 60;
                console.log(`🕒 Custom Shift "${shift.name}" detected. Calculated duration: ${standardWorkHours.toFixed(2)} hours`);
                
              } catch (e) {
                console.error(`Error calculating duration for custom shift "${shift.name}":`, e);
                // Fallback to default if times are invalid
                standardWorkHours = 8;
              }
            }

            // Check if this shift has "all time overtime" enabled
            if (shift.all_time_overtime) {
              // All time is overtime for this shift
              regularHours = 0;
              overtimeHours = actualWorkHours;
              console.log(`🔥 All-time overtime shift detected: "${shift.name}" - ${actualWorkHours.toFixed(2)}h all overtime`);
            } else {
              // Calculate regular and overtime hours using ACTUAL WORK TIME (excluding breaks)
              regularHours = Math.min(actualWorkHours, standardWorkHours);
              overtimeHours = Math.max(0, actualWorkHours - standardWorkHours);
            }
            
            // NEW SMART DELAY CALCULATION
            const [startHour, startMin] = shift.start_time.split(':').map(Number);
            const scheduledStart = new Date(checkInTime);
            scheduledStart.setHours(startHour, startMin, 0, 0);
            const rawDelayMs = checkInTime.getTime() - scheduledStart.getTime();
            const checkInDelayMinutes = Math.max(0, rawDelayMs / (1000 * 60));
            
            // SIMPLIFIED LOGIC: Only calculate missing work time (ignore late check-in)
            // Special logic for all-time overtime shifts
            if (shift.all_time_overtime) {
              // For all-time overtime shifts, NO delay calculation needed
              // All time worked is overtime, so any time worked is "completed work"
              delayMinutes = 0; // Always "All Clear" for all-time overtime shifts
              console.log(`🔥 All-time overtime shift - No delay calculation needed`);
            } else {
              // Normal shift delay calculation
              if (actualWorkHours < standardWorkHours) {
                // EARLY CHECKOUT: Only show missing hours as delay
                const hoursShort = standardWorkHours - actualWorkHours;
                const hoursShortMinutes = hoursShort * 60;
                
                // NEW: Only count missing work time, ignore check-in delay
                delayMinutes = hoursShortMinutes;
              } else {
                // FULL/OVERTIME WORK: No delay if completed required hours
                delayMinutes = 0; // All clear if worked required hours or more
              }
            }
            
            console.log(`🧮 ${shift.name} - NEW Smart Delay Formula:`, {
              actualWorkHours: actualWorkHours.toFixed(2),
              standardWorkHours,
              regularHours: regularHours.toFixed(2),
              overtimeHours: overtimeHours.toFixed(2),
              checkInDelayMinutes: checkInDelayMinutes.toFixed(1),
              breakTimeMinutes: breakTimeMinutes.toFixed(1),
              totalDelayMinutes: delayMinutes.toFixed(1),
              allTimeOvertime: shift.all_time_overtime || false,
              logic: shift.all_time_overtime ? 'ALL_TIME_OVERTIME' : (actualWorkHours < standardWorkHours ? 'MISSING_WORK_ONLY' : 'COMPLETED_WORK'),
              formula: shift.all_time_overtime 
                ? `All-Time Overtime: No delay calculation (all time = overtime)`
                : actualWorkHours < standardWorkHours 
                ? `Missing Work Only: ${((standardWorkHours - actualWorkHours) * 60).toFixed(1)}min short = ${delayMinutes.toFixed(1)}min (check-in delay ignored)`
                : `Completed Work: No delay (worked ${actualWorkHours.toFixed(2)}h >= ${standardWorkHours}h required)`
            });
            
            // Track early checkout penalty (based on actual work hours)
            if (shift.all_time_overtime) {
              // No penalty for all-time overtime shifts
              earlyCheckoutPenalty = 0;
            } else {
              // Normal penalty calculation
              if (actualWorkHours < standardWorkHours) {
                earlyCheckoutPenalty = standardWorkHours - actualWorkHours;
              } else {
                earlyCheckoutPenalty = 0;
              }
            }
            
            console.log(`✅ ${shift.name} - Break-Time-Aware Calculation Complete:`, {
              totalDelayMinutes: delayMinutes.toFixed(1),
              actualWorkHours: actualWorkHours.toFixed(2),
              regularHours: regularHours.toFixed(2),
              overtimeHours: overtimeHours.toFixed(2),
              earlyCheckoutPenalty: earlyCheckoutPenalty.toFixed(2),
              result: delayMinutes > 0 ? `${(delayMinutes / 60).toFixed(2)}h delay` : 'All Clear'
            });

            // Ensure non-negative values
            regularHours = Math.max(0, regularHours);
            overtimeHours = Math.max(0, overtimeHours);
            delayMinutes = Math.max(0, delayMinutes);
          }

          // Update the record with new calculations
          const updateData: any = {
            delay_minutes: Math.round(delayMinutes * 100) / 100, // Round to 2 decimal places
            regular_hours: Math.round(regularHours * 100) / 100,
            overtime_hours: Math.round(overtimeHours * 100) / 100,
            updated_at: new Date().toISOString()
          };

          // Add early checkout penalty field if needed
          if (earlyCheckoutPenalty > 0) {
            updateData.early_checkout_penalty = Math.round(earlyCheckoutPenalty * 100) / 100;
          }

          const { error: updateError } = await supabase
            .from('monthly_shifts')
            .update(updateData)
            .eq('id', record.id);

          if (updateError) {
            console.error(`❌ Failed to update record ${record.id}:`, updateError);
            errors++;
          } else {
            updated++;
          }

        } catch (recordError) {
          console.error(`❌ Error processing record ${record.id}:`, recordError);
          errors++;
        }
      }

      console.log(`✅ Recalculation complete: ${updated} updated, ${errors} errors`);
      
      if (errors === 0) {
        toast.success(`🎯 Recalculation completed! Updated ${updated} records`, {
          duration: 5000,
        });
      } else {
        toast.warning(`⚠️ Recalculation finished with ${errors} errors. Updated ${updated} records`, {
          duration: 7000,
        });
      }

      // Trigger callback if provided
      if (onRecalculationComplete) {
        onRecalculationComplete();
      }
      
      // Also trigger performance recalculation if needed
      await recalculatePerformanceData();
    } catch (error) {
      console.error('❌ Recalculation failed:', error);
      toast.error(`Failed to recalculate: ${error.message}`, {
        duration: 8000,
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  // Function to recalculate performance data using new automatic logic
  const recalculatePerformanceData = async () => {
    setIsRecalculatingPerformance(true);
    setPerformanceStats(null);
    
    try {
      console.log('🔄 Starting performance data recalculation with rating bonuses...');
      toast.info('Starting performance recalculation with rating bonuses...');
      
      // Get current month
      const currentMonth = format(new Date(), 'yyyy-MM');
      
      // Get all users with Customer Service or Designer positions
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, position')
        .in('position', ['Customer Service', 'Designer']);

      if (usersError) {
        console.error('❌ Error fetching users:', usersError);
        toast.error('Failed to fetch users for recalculation');
        return;
      }

      console.log(`📊 Found ${users.length} users to recalculate performance for`);
      
      let updatedEmployees = 0;
      let errors = 0;
      
      for (const user of users) {
        try {
          // Get user's monthly shifts for this month
          const { data: monthlyShifts, error: shiftsError } = await supabase
            .from('monthly_shifts')
            .select(`
              *,
              shifts:shift_id(name, start_time, end_time)
            `)
            .eq('user_id', user.id)
            .like('work_date', `${currentMonth}%`)
            .not('check_in_time', 'is', null)
            .not('check_out_time', 'is', null);

          if (shiftsError) {
            console.error(`❌ Error fetching shifts for ${user.name}:`, shiftsError);
            continue;
          }

          if (!monthlyShifts || monthlyShifts.length === 0) {
            console.log(`⚠️ No shifts found for ${user.name}`);
            continue;
          }

          // Calculate totals using the new automatic logic
          const totalWorkingDays = monthlyShifts.length;
          const totalDelayMinutes = monthlyShifts.reduce((sum, shift) => sum + (shift.delay_minutes || 0), 0);
          const totalDelayHours = totalDelayMinutes / 60;
          const totalOvertimeHours = monthlyShifts.reduce((sum, shift) => sum + (shift.overtime_hours || 0), 0);
          const totalRegularHours = monthlyShifts.reduce((sum, shift) => sum + (shift.regular_hours || 0), 0);

          // Calculate average performance score based on completion of expected hours
          let totalPerformanceScore = 0;
          let validShifts = 0;

          for (const shift of monthlyShifts) {
            if (shift.shifts) {
              const shiftName = shift.shifts.name?.toLowerCase() || '';
              const expectedHours = (shiftName === 'day shift' || shiftName === 'day') ? 7 : 8;
              const actualHours = (shift.regular_hours || 0) + (shift.overtime_hours || 0);
              
              // Performance score based on completion
              let performanceScore = 75; // Base score
              
              if (actualHours >= expectedHours) {
                // Completed full hours - high score
                performanceScore = 90 + Math.min(10, (shift.overtime_hours || 0) * 2); // Bonus for overtime
              } else {
                // Incomplete hours - lower score
                const completionRate = actualHours / expectedHours;
                performanceScore = Math.max(20, completionRate * 80);
              }
              
              totalPerformanceScore += performanceScore;
              validShifts++;
            }
          }

          let averagePerformanceScore = validShifts > 0 ? totalPerformanceScore / validShifts : 75;
          
          // Calculate punctuality percentage
          const punctualityPercentage = totalDelayHours >= 1 ? 0 : 
                                      totalDelayMinutes > 30 ? Math.max(0, 50 - (totalDelayMinutes * 2)) :
                                      totalDelayMinutes > 0 ? Math.max(0, 90 - (totalDelayMinutes * 3)) : 100;

          // 🌟 GET RATING DATA FOR BONUS/PENALTY (same as AutomaticPerformanceCalculator)
          const [employeeRatings, employeeTasks] = await Promise.all([
            supabase
              .from('employee_ratings')
              .select('rating, rated_at')
              .eq('employee_id', user.id)
              .gte('rated_at', `${currentMonth}-01`)
              .lt('rated_at', `${currentMonth}-31`),
            
            supabase
              .from('tasks')
              .select(`id, task_ratings(rating, rated_at)`)
              .eq('assigned_to', user.id)
              .gte('created_at', `${currentMonth}-01`)
              .lt('created_at', `${currentMonth}-31`)
          ]);

          // Calculate Rating Bonus
          let ratingBonus = 0;
          let employeeRatingAvg = 0;
          let taskRatingAvg = 0;
          let totalRatingsCount = 0;

          if (employeeRatings.data && employeeRatings.data.length > 0) {
            const ratings = employeeRatings.data.map(r => r.rating);
            employeeRatingAvg = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
            totalRatingsCount += ratings.length;
          }

          if (employeeTasks.data && employeeTasks.data.length > 0) {
            const taskRatings = employeeTasks.data
              .flatMap(task => task.task_ratings || [])
              .map(tr => tr.rating);
            
            if (taskRatings.length > 0) {
              taskRatingAvg = taskRatings.reduce((sum, rating) => sum + rating, 0) / taskRatings.length;
              totalRatingsCount += taskRatings.length;
            }
          }

          // Apply rating bonus to performance score
          if (totalRatingsCount > 0) {
            const overallRatingAvg = ((employeeRatingAvg + taskRatingAvg) / (employeeRatingAvg > 0 ? 1 : 0 + taskRatingAvg > 0 ? 1 : 0)) || 
                                   (employeeRatingAvg || taskRatingAvg);

            if (overallRatingAvg >= 5.0) {
              ratingBonus = 15;
            } else if (overallRatingAvg >= 4.5) {
              ratingBonus = 10;
            } else if (overallRatingAvg >= 4.0) {
              ratingBonus = 5;
            } else if (overallRatingAvg >= 3.0) {
              ratingBonus = 0;
            } else if (overallRatingAvg >= 2.0) {
              ratingBonus = -5;
            } else {
              ratingBonus = -10;
            }

            // Apply rating bonus to average performance score
            averagePerformanceScore = Math.min(100, Math.max(0, averagePerformanceScore + ratingBonus));
          }

          // Determine performance status
          let performanceStatus = 'Poor';
          if (averagePerformanceScore >= 85 && punctualityPercentage >= 85) {
            performanceStatus = 'Excellent';
          } else if (averagePerformanceScore >= 70 && punctualityPercentage >= 70) {
            performanceStatus = 'Good';
          } else if (averagePerformanceScore >= 50 || punctualityPercentage >= 50) {
            performanceStatus = 'Needs Improvement';
          }

          // Update or create performance record
          const { error: upsertError } = await supabase
            .from('admin_performance_dashboard')
            .upsert({
              employee_id: user.id,
              employee_name: user.name,
              month_year: currentMonth,
              total_working_days: totalWorkingDays,
              total_delay_minutes: totalDelayMinutes,
              total_delay_hours: totalDelayHours,
              total_overtime_hours: totalOvertimeHours,
              total_regular_hours: totalRegularHours,
              average_performance_score: Math.round(averagePerformanceScore * 100) / 100,
              punctuality_percentage: Math.round(punctualityPercentage * 100) / 100,
              performance_status: performanceStatus,
              // NEW: Add rating data to manual recalculation
              employee_rating_avg: employeeRatingAvg > 0 ? Math.round(employeeRatingAvg * 100) / 100 : null,
              task_rating_avg: taskRatingAvg > 0 ? Math.round(taskRatingAvg * 100) / 100 : null,
              rating_bonus_points: ratingBonus,
              total_ratings_count: totalRatingsCount,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'employee_id,month_year'
            });

          if (upsertError) {
            console.error(`❌ Error updating performance for ${user.name}:`, upsertError);
            errors++;
          } else {
            console.log(`✅ Updated performance for ${user.name}: ${performanceStatus} (${averagePerformanceScore.toFixed(1)}%)`, {
              ratingBonus: ratingBonus > 0 ? `+${ratingBonus}` : ratingBonus < 0 ? ratingBonus : 'No rating bonus',
              employeeRating: employeeRatingAvg > 0 ? `${employeeRatingAvg.toFixed(1)}⭐` : 'No employee ratings',
              taskRating: taskRatingAvg > 0 ? `${taskRatingAvg.toFixed(1)}⭐` : 'No task ratings'
            });
            updatedEmployees++;
          }

        } catch (userError) {
          console.error(`❌ Error processing ${user.name}:`, userError);
          errors++;
        }
      }
      
      // Update stats and notifications
      setPerformanceStats({
        totalEmployees: users.length,
        updatedEmployees,
        errors
      });
      
      setLastPerformanceRecalculation(new Date());
      
      console.log('✅ Performance data recalculation completed');
      toast.success(`Performance recalculation completed! Updated ${updatedEmployees}/${users.length} employees with rating bonuses`);
      
      if (onRecalculationComplete) {
        onRecalculationComplete();
      }
       
    } catch (error) {
      console.error('❌ Performance recalculation failed:', error);
      toast.error('Performance recalculation failed');
    } finally {
      setIsRecalculatingPerformance(false);
    }
  };

  return (
    <Card className="border border-orange-200 bg-orange-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-orange-800 flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Admin Recalculation Tools
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm text-orange-700">
            <AlertTriangle className="h-4 w-4" />
            <span>Use this to recalculate with BREAK-TIME-AWARE logic and ALL-TIME OVERTIME feature - Work hours exclude break time, Regular hours freeze during breaks</span>
          </div>
          
          <Button
            onClick={recalculateDelayAndOvertime}
            disabled={isRecalculating || isRecalculatingPerformance}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isRecalculating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Break-Time-Aware Recalculating...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4 mr-2" />
                🔥 Fix Delay & Overtime (All-Time Overtime Ready)
              </>
            )}
          </Button>



          {recalculationStats && (
            <div className="space-y-2">
              <div className="text-xs text-orange-600 font-medium">Delay & Overtime Recalculation:</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <Badge variant="outline" className="flex items-center justify-center gap-1 py-1">
                  <span>Total: {recalculationStats.totalRecords}</span>
                </Badge>
                <Badge variant="outline" className="flex items-center justify-center gap-1 py-1 bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="h-3 w-3" />
                  <span>Updated: {recalculationStats.updatedRecords}</span>
                </Badge>
                {recalculationStats.errors > 0 && (
                  <Badge variant="outline" className="flex items-center justify-center gap-1 py-1 bg-red-50 text-red-700 border-red-200">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Errors: {recalculationStats.errors}</span>
                  </Badge>
                )}
              </div>
            </div>
          )}



          <div className="space-y-1">
            {lastRecalculation && (
              <div className="text-xs text-orange-600 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Last delay/overtime recalculation: {format(lastRecalculation, 'MMM dd, HH:mm')}</span>
              </div>
            )}

          </div>
        </div>

        <div className="space-y-3">
          <div className="text-xs text-orange-600 bg-orange-100 p-2 rounded border">
            <div className="font-semibold mb-1">🔥 Delay & Overtime Recalculation:</div>
            <ul className="space-y-1 text-orange-700">
              <li>• <strong>🕐 Work Hours:</strong> Total time MINUS break time (work time freezes during breaks)</li>
              <li>• <strong>⏰ Regular Hours:</strong> Calculated from actual work time (excluding breaks)</li>
              <li>• <strong>🔥 Overtime Hours:</strong> Based on actual work time beyond standard hours</li>
              <li>• <strong>📝 Smart Delay to Finish:</strong> Early checkout = Missing hours + delays, Overtime = Delays - overtime hours</li>
            </ul>
            <div className="mt-2 p-1 bg-emerald-50 rounded text-emerald-700 text-xs">
              <strong>✨ Break Time Freezing:</strong> When employees take breaks, their regular work hours counter freezes - only actual working time counts!
            </div>
          </div>


        </div>
      </CardContent>
    </Card>
  );
};

export default AdminRecalculateButton; 