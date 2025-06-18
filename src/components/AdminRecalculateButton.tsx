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
  const [lastRecalculation, setLastRecalculation] = useState<Date | null>(null);
  const [recalculationStats, setRecalculationStats] = useState<{
    totalRecords: number;
    updatedRecords: number;
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
      console.log('🔄 Starting delay and overtime recalculation...');
      
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

          // Calculate work hours and overtime (only if checked out)
          let regularHours = record.regular_hours || 0;
          let overtimeHours = record.overtime_hours || 0;
          let delayMinutes = 0;
          let earlyCheckoutPenalty = 0;

          if (checkOutTime) {
            const totalHours = differenceInMinutes(checkOutTime, checkInTime) / 60;
            
            // Determine standard work hours based on shift type
            let standardWorkHours = 8; // Default to night shift
            if (shift.name.toLowerCase().includes('day')) {
              standardWorkHours = 7; // Day shift is 7 hours
            }

            // Calculate regular and overtime hours
            regularHours = Math.min(totalHours, standardWorkHours);
            overtimeHours = Math.max(0, totalHours - standardWorkHours);
            
            // NEW LOGIC: Smart Delay Calculation Based on Work Completion
            // If worked less than expected: Delay = Expected Hours - Worked Hours
            // If worked full/overtime: Delay = Raw Delay - Overtime Hours
            
            const [startHour, startMin] = shift.start_time.split(':').map(Number);
            const scheduledStart = new Date(checkInTime);
            scheduledStart.setHours(startHour, startMin, 0, 0);
            const rawDelayMs = checkInTime.getTime() - scheduledStart.getTime();
            const rawDelayHours = Math.max(0, rawDelayMs / (1000 * 60 * 60));
            
            // Convert to minutes and get total worked hours
            const rawDelayMinutes = rawDelayHours * 60;
            const totalWorkedHours = regularHours + overtimeHours;
            
            if (totalWorkedHours < standardWorkHours) {
              // Early checkout: Show missing hours as delay
              const hoursShort = standardWorkHours - totalWorkedHours;
              delayMinutes = hoursShort * 60; // Convert to minutes
              
              console.log(`⚠️ ${shift.name} - Early Checkout (Hours Short as Delay):`, {
                expectedHours: standardWorkHours,
                workedHours: totalWorkedHours.toFixed(2),
                hoursShort: hoursShort.toFixed(2),
                delayMinutes: delayMinutes.toFixed(1)
              });
            } else if (totalWorkedHours >= standardWorkHours) {
              // Completed expected hours or more: No delay penalty
              delayMinutes = 0;
              
              console.log(`✅ ${shift.name} - Full Shift Completed (No Delay Penalty):`, {
                expectedHours: standardWorkHours,
                workedHours: totalWorkedHours.toFixed(2),
                rawDelayMinutes: rawDelayMinutes.toFixed(1),
                finalDelay: 0
              });
            } else {
              // Overtime work: Apply offset formula
              const overtimeOffset = overtimeHours * 60; // Convert to minutes
              delayMinutes = Math.max(0, rawDelayMinutes - overtimeOffset);
              
              console.log(`✅ ${shift.name} - Overtime Work (Delay with Overtime Offset):`, {
                rawDelayMinutes: rawDelayMinutes.toFixed(1),
                overtimeOffset: overtimeOffset.toFixed(1),
                finalDelay: delayMinutes.toFixed(1)
              });
            }
            
            // Track early checkout penalty
            if (totalHours < standardWorkHours) {
              earlyCheckoutPenalty = standardWorkHours - totalHours;
            } else {
              earlyCheckoutPenalty = 0;
            }
            
            console.log(`✅ ${shift.name} - Smart Delay Calculation Complete:`, {
              finalDelayMinutes: delayMinutes.toFixed(1),
              regularHours: regularHours.toFixed(2),
              overtimeHours: overtimeHours.toFixed(2),
              delayToFinishHours: (delayMinutes / 60).toFixed(2) + 'h'
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
    try {
      console.log('🔄 Starting performance data recalculation...');
      
      // Get current month
      const currentMonth = format(new Date(), 'yyyy-MM');
      
      // Get all users with Customer Service or Designer positions
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, position')
        .in('position', ['Customer Service', 'Designer']);

      if (usersError) {
        console.error('❌ Error fetching users:', usersError);
        return;
      }

      console.log(`📊 Found ${users.length} users to recalculate performance for`);
      
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
              const expectedHours = shift.shifts.name?.toLowerCase().includes('day') ? 7 : 8;
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

          const averagePerformanceScore = validShifts > 0 ? totalPerformanceScore / validShifts : 75;
          
          // Calculate punctuality percentage
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
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'employee_id,month_year'
            });

          if (upsertError) {
            console.error(`❌ Error updating performance for ${user.name}:`, upsertError);
          } else {
            console.log(`✅ Updated performance for ${user.name}: ${performanceStatus} (${averagePerformanceScore.toFixed(1)}%)`);
          }

        } catch (userError) {
          console.error(`❌ Error processing ${user.name}:`, userError);
        }
      }
      
             console.log('✅ Performance data recalculation completed');
       
     } catch (error) {
       console.error('❌ Performance recalculation failed:', error);
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
            <span>Use this to fix incorrect delay hours and overtime calculations</span>
          </div>
          
          <Button
            onClick={recalculateDelayAndOvertime}
            disabled={isRecalculating}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isRecalculating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Recalculating...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4 mr-2" />
                Fix Delay & Overtime
              </>
            )}
          </Button>

          {recalculationStats && (
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
          )}

          {lastRecalculation && (
            <div className="text-xs text-orange-600 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Last recalculation: {format(lastRecalculation, 'MMM dd, HH:mm')}</span>
            </div>
          )}
        </div>

        <div className="text-xs text-orange-600 bg-orange-100 p-2 rounded border">
          <div className="font-semibold mb-1">What this recalculates:</div>
          <ul className="space-y-1 text-orange-700">
            <li>• <strong>Delay Minutes:</strong> How late employees were for their shifts</li>
            <li>• <strong>Regular Hours:</strong> Normal work hours within shift limits</li>
            <li>• <strong>Overtime Hours:</strong> Extra work using flexible rules (Day: before 9AM/after 4PM, Night: after 8h)</li>
            <li>• <strong>✨ Delay to Finish:</strong> Smart calculation - 0 if worked full hours (7h day/8h night)</li>
            <li>• <strong>📊 Performance Data:</strong> Updates admin dashboard with new automatic logic</li>
          </ul>
          <div className="mt-2 p-1 bg-blue-50 rounded text-blue-700 text-xs">
            <strong>💡 Smart Logic:</strong> Employees who work their full expected hours get 0 delay automatically, regardless of arrival time
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminRecalculateButton; 