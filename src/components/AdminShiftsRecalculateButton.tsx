import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Calculator, Clock, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format, differenceInMinutes } from 'date-fns';

interface AdminShiftsRecalculateButtonProps {
  onRecalculationComplete?: () => void;
  autoCalculationFunction?: (silent?: boolean) => Promise<any>;
}

const AdminShiftsRecalculateButton: React.FC<AdminShiftsRecalculateButtonProps> = ({ onRecalculationComplete, autoCalculationFunction }) => {
  const { user } = useAuth();
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [lastRecalculation, setLastRecalculation] = useState<Date | null>(null);
  const [recalculationStats, setRecalculationStats] = useState<{
    totalRecords: number;
    updatedRecords: number;
    errors: number;
  } | null>(null);

  // Only show for admins or Digital Solution Manager
  if (user?.position === 'Digital Solution Manager') {
    // Continue to render the button
  } else if (user?.role !== 'admin') {
    return null;
  }

  const recalculateShifts = async () => {
    setIsRecalculating(true);
    setRecalculationStats(null);
    
    try {
      console.log('🔄 Starting automatic shifts recalculation...');
      toast.info('Starting automatic shifts recalculation...');
      
      // Fetch all monthly shift records with their shift info
      const { data: monthlyShifts, error: fetchError } = await supabase
        .from('monthly_shifts')
        .select(`
          *,
          shifts:shift_id(*),
          users:user_id(name)
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
          const breakTimeMinutes = breakData.totalBreakMinutes || 0;

          // Calculate work hours and overtime (only if checked out)
          let regularHours = record.regular_hours || 0;
          let overtimeHours = record.overtime_hours || 0;
          let delayMinutes = 0;
          let earlyCheckoutPenalty = 0;

          if (checkOutTime) {
            // Calculate actual work time (subtract break time)
            const totalMinutes = differenceInMinutes(checkOutTime, checkInTime);
            const actualWorkMinutes = totalMinutes - breakTimeMinutes;
            const actualWorkHours = actualWorkMinutes / 60;
            
            // Determine standard work hours based on shift type
            let standardWorkHours = 8;
            const shiftNameLower = shift.name.toLowerCase();
            if (shiftNameLower === 'day shift' || shiftNameLower === 'day') {
              standardWorkHours = 7; // Day shift is 7 hours
            } else if (shiftNameLower !== 'night shift' && shiftNameLower !== 'night') {
              // For custom shifts, calculate duration from start/end times
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
            
            // Smart delay calculation
            const [startHour, startMin] = shift.start_time.split(':').map(Number);
            const scheduledStart = new Date(checkInTime);
            scheduledStart.setHours(startHour, startMin, 0, 0);
            const rawDelayMs = checkInTime.getTime() - scheduledStart.getTime();
            const checkInDelayMinutes = Math.max(0, rawDelayMs / (1000 * 60));
            
            // Special logic for all-time overtime shifts
            if (shift.all_time_overtime) {
              // For all-time overtime shifts, NO delay calculation needed
              // All time worked is overtime, so any time worked is "completed work"
              delayMinutes = 0; // Always "All Clear" for all-time overtime shifts
              console.log(`🔥 All-time overtime shift - No delay calculation needed`);
            } else {
              // Normal shift delay calculation: Only calculate missing work time
              if (actualWorkHours < standardWorkHours) {
                // Early checkout: Only show missing hours as delay
                const hoursShort = standardWorkHours - actualWorkHours;
                delayMinutes = hoursShort * 60;
              } else {
                // Full/overtime work: No delay if completed required hours
                delayMinutes = 0;
              }
            }
            
            // Track early checkout penalty
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
            
            console.log(`✅ ${shift.name} - Shift Calculation Complete:`, {
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
            delay_minutes: Math.round(delayMinutes * 100) / 100,
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

      console.log(`✅ Shifts recalculation complete: ${updated} updated, ${errors} errors`);
      setRecalculationStats({
        totalRecords: monthlyShifts.length,
        updatedRecords: updated,
        errors
      });
      setLastRecalculation(new Date());
      
      if (errors === 0) {
        toast.success(`🎯 Shifts recalculation completed! Updated ${updated} records`, {
          duration: 5000,
        });
      } else {
        toast.warning(`⚠️ Shifts recalculation finished with ${errors} errors. Updated ${updated} records`, {
          duration: 7000,
        });
      }

      // Trigger callback if provided
      if (onRecalculationComplete) {
        onRecalculationComplete();
      }
      
    } catch (error) {
      console.error('❌ Shifts recalculation failed:', error);
      toast.error(`Failed to recalculate shifts: ${error.message}`, {
        duration: 8000,
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <Card className="border border-blue-200 bg-blue-50/50 dark:bg-[#23232b] dark:border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-blue-800 dark:text-blue-200 flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-700 dark:text-blue-300" />
          Auto Shifts Calculator (Running)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-200">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="dark:text-blue-100">✅ Auto-calculating shifts every 5 minutes in background - No manual action needed!</span>
          </div>
          
          <Button
            onClick={recalculateShifts}
            disabled={isRecalculating}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white w-full font-semibold shadow-lg dark:from-blue-800 dark:to-purple-800 dark:hover:from-blue-900 dark:hover:to-purple-900"
          >
            {isRecalculating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Applying All-Time Overtime Logic...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                🔥 Apply All-Time Overtime Logic
              </>
            )}
          </Button>

          {recalculationStats && (
            <div className="space-y-2">
              <div className="text-xs text-blue-600 dark:text-blue-200 font-medium">Shifts Calculation Results:</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <Badge variant="outline" className="flex items-center justify-center gap-1 py-1 dark:bg-gray-800 dark:text-blue-100">
                  <span>Total: {recalculationStats.totalRecords}</span>
                </Badge>
                <Badge variant="outline" className="flex items-center justify-center gap-1 py-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-700">
                  <CheckCircle className="h-3 w-3" />
                  <span>Updated: {recalculationStats.updatedRecords}</span>
                </Badge>
                {recalculationStats.errors > 0 && (
                  <Badge variant="outline" className="flex items-center justify-center gap-1 py-1 bg-red-50 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-700">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Errors: {recalculationStats.errors}</span>
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1">
            {lastRecalculation && (
              <div className="text-xs text-blue-600 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Last calculation: {format(lastRecalculation, 'MMM dd, HH:mm')}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded border dark:bg-[#23232b] dark:text-blue-100 dark:border-gray-700">
            <div className="font-semibold mb-1 dark:text-blue-200">⚡ Automatic Shifts Calculation:</div>
            <ul className="space-y-1 text-blue-700 dark:text-blue-100">
              <li>• <strong>🕐 Work Hours:</strong> Total time MINUS break time (work freezes during breaks)</li>
              <li>• <strong>⏰ Regular Hours:</strong> Calculated from actual work time (excluding breaks)</li>
              <li>• <strong>🔥 Overtime Hours:</strong> Based on actual work time beyond standard hours (or ALL TIME for all-overtime shifts)</li>
              <li>• <strong>📝 Smart Delay:</strong> Only missing work hours (ignores check-in delay if full hours worked)</li>
              <li>• <strong>🎯 Day Shift:</strong> 7 hours standard, Night Shift: 8 hours standard</li>
              <li>• <strong>🤖 Background Mode:</strong> Auto-calculates every 5 minutes silently</li>
            </ul>
            <div className="mt-2 p-1 bg-emerald-50 rounded text-emerald-700 text-xs dark:bg-green-900 dark:text-green-200">
              <strong>✨ Smart Logic:</strong> If you work your full hours (or more), no delay is shown - only actual missing work time counts!
            </div>
            <div className="mt-2 p-1 bg-orange-50 rounded text-orange-700 text-xs dark:bg-orange-900 dark:text-orange-200">
              <strong>🚀 Fully Automatic:</strong> No buttons needed! System calculates shifts automatically every 5 minutes - only emergency override available.
            </div>
            <div className="mt-2 p-1 bg-purple-50 rounded text-purple-700 text-xs dark:bg-purple-900 dark:text-purple-200">
              <strong>🔥 All-Time Overtime:</strong> Shifts marked as "All Overtime" will count every hour worked as overtime (0 regular hours).
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminShiftsRecalculateButton; 