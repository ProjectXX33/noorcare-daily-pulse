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
      
      // Get all monthly shift records with check-in data
      const { data: monthlyShifts, error: shiftsError } = await supabase
        .from('monthly_shifts')
        .select(`
          *,
          shifts:shift_id(name, start_time, end_time)
        `)
        .not('check_in_time', 'is', null);

      if (shiftsError) {
        throw shiftsError;
      }

      console.log(`📊 Found ${monthlyShifts.length} monthly shift records to process`);
      
      let totalRecords = monthlyShifts.length;
      let updatedRecords = 0;
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

          // Calculate delay minutes
          const [startHour, startMin] = shift.start_time.split(':').map(Number);
          const scheduledStart = new Date(checkInTime);
          scheduledStart.setHours(startHour, startMin, 0, 0);
          
          const delayMs = checkInTime.getTime() - scheduledStart.getTime();
          const delayMinutes = Math.max(0, delayMs / (1000 * 60));

          // Calculate overtime (only if checked out)
          let regularHours = record.regular_hours || 0;
          let overtimeHours = record.overtime_hours || 0;

          if (checkOutTime) {
            const totalHours = differenceInMinutes(checkOutTime, checkInTime) / 60;
            
            // Determine standard work hours based on shift type
            let standardWorkHours = 8; // Default to night shift
            if (shift.name.toLowerCase().includes('day')) {
              standardWorkHours = 7; // Day shift is 7 hours
            }

            // Recalculate using flexible overtime rules
            if (shift.name.toLowerCase().includes('day')) {
              // Day shift: Up to 7 hours regular, rest is overtime
              // But be flexible about when those hours are worked
              regularHours = Math.min(totalHours, standardWorkHours);
              overtimeHours = Math.max(0, totalHours - standardWorkHours);
              
              console.log(`Day shift calculation: Total=${totalHours.toFixed(2)}h, Regular=${regularHours.toFixed(2)}h, Overtime=${overtimeHours.toFixed(2)}h`);
            } else {
              // Night shift or other: standard calculation
              regularHours = Math.min(totalHours, standardWorkHours);
              overtimeHours = Math.max(0, totalHours - standardWorkHours);
            }

            // Ensure non-negative values
            regularHours = Math.max(0, regularHours);
            overtimeHours = Math.max(0, overtimeHours);
          }

          // Update the record
          const { error: updateError } = await supabase
            .from('monthly_shifts')
            .update({
              delay_minutes: Math.round(delayMinutes * 100) / 100, // Round to 2 decimal places
              regular_hours: Math.round(regularHours * 100) / 100,
              overtime_hours: Math.round(overtimeHours * 100) / 100,
              updated_at: new Date().toISOString()
            })
            .eq('id', record.id);

          if (updateError) {
            console.error(`❌ Error updating record ${record.id}:`, updateError);
            errors++;
          } else {
            updatedRecords++;
            console.log(`✅ Updated record ${record.id}: delay=${delayMinutes.toFixed(2)}min, regular=${regularHours.toFixed(2)}h, overtime=${overtimeHours.toFixed(2)}h`);
          }

        } catch (recordError) {
          console.error(`❌ Error processing record ${record.id}:`, recordError);
          errors++;
        }
      }

      setRecalculationStats({
        totalRecords,
        updatedRecords,
        errors
      });

      setLastRecalculation(new Date());
      
      if (errors === 0) {
        toast.success(`✅ Successfully recalculated ${updatedRecords} records!`, {
          duration: 5000,
        });
      } else {
        toast.warning(`⚠️ Recalculated ${updatedRecords} records with ${errors} errors. Check console for details.`, {
          duration: 6000,
        });
      }

      console.log('🎉 Recalculation completed:', {
        totalRecords,
        updatedRecords,
        errors
      });

      // Call the callback to refresh parent data
      if (onRecalculationComplete) {
        onRecalculationComplete();
      }

    } catch (error) {
      console.error('❌ Fatal error during recalculation:', error);
      toast.error('Failed to recalculate delay and overtime data');
      setRecalculationStats({
        totalRecords: 0,
        updatedRecords: 0,
        errors: 1
      });
    } finally {
      setIsRecalculating(false);
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
                Recalculate Delay & Overtime
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
            <li>• <strong>✨ Delay to Finish:</strong> Automatically updated based on new calculations (Delay - Overtime)</li>
          </ul>
          <div className="mt-2 p-1 bg-blue-50 rounded text-blue-700 text-xs">
            <strong>💡 Note:</strong> After recalculation, the Summary cards will automatically show updated "Delay to Finish" values
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminRecalculateButton; 