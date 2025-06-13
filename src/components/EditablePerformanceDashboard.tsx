import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { 
  Edit3, 
  Save, 
  X, 
  Plus,
  Trash2,
  Award,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Loader2,
  Zap,
  RotateCcw
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

interface PerformanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_position?: string;
  month_year: string;
  total_working_days: number;
  total_delay_minutes: number;
  total_delay_hours: number;
  total_overtime_hours: number;
  average_performance_score: number;
  punctuality_percentage: number;
  performance_status: string;
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
  const [performanceData, setPerformanceData] = useState<PerformanceRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PerformanceRecord>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [employees, setEmployees] = useState<Array<{id: string, name: string, position?: string}>>([]);


  useEffect(() => {
    loadData();
    loadEmployees();
  }, [currentMonth]);

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, position')
        .in('position', ['Customer Service', 'Designer'])
        .eq('role', 'employee')
        .order('name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      console.log('Loading performance data for month:', currentMonth);
      
      // First, auto-calculate performance from monthly shifts
      await autoCalculatePerformanceFromShifts();
      
      // Then load the updated performance data
      const { data, error } = await supabase
        .from('admin_performance_dashboard')
        .select(`
          *,
          users:employee_id(position)
        `)
        .eq('month_year', currentMonth)
        .order('average_performance_score', { ascending: false });

      if (error) throw error;
      
      console.log('Performance data loaded:', data?.length || 0);
      const formattedData = (data || []).map(item => ({
        ...item,
        employee_position: item.users?.position
      }));
      setPerformanceData(formattedData);
    } catch (error) {
      console.error('Error loading performance data:', error);
      toast.error('Failed to load performance data');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-calculate performance metrics from monthly_shifts data
  const autoCalculatePerformanceFromShifts = async () => {
    try {
      console.log('🔄 Auto-calculating performance from monthly shifts...');
      
      // Get all monthly shifts for the current month
      const monthStart = `${currentMonth}-01`;
      const nextMonth = currentMonth.split('-');
      const nextMonthDate = new Date(parseInt(nextMonth[0]), parseInt(nextMonth[1]), 1);
      const monthEnd = nextMonthDate.toISOString().split('T')[0];

      const { data: monthlyShifts, error: shiftsError } = await supabase
        .from('monthly_shifts')
        .select(`
          *,
          users:user_id(name, position)
        `)
        .gte('work_date', monthStart)
        .lt('work_date', monthEnd)
        .in('users.position', ['Customer Service', 'Designer']);

      if (shiftsError) throw shiftsError;

      console.log(`📊 Found ${monthlyShifts.length} monthly shift records to process`);

      // Group by employee
      const employeeData: Record<string, {
        name: string;
        position: string;
        workingDays: Set<string>;
        totalDelayMinutes: number;
        totalOvertimeHours: number;
      }> = {};

      for (const shift of monthlyShifts) {
        const userId = shift.user_id;
        const userName = shift.users?.name || 'Unknown';
        const userPosition = shift.users?.position;

        if (!employeeData[userId]) {
          employeeData[userId] = {
            name: userName,
            position: userPosition,
            workingDays: new Set(),
            totalDelayMinutes: 0,
            totalOvertimeHours: 0,
          };
        }

        // Add working day
        employeeData[userId].workingDays.add(shift.work_date);
        
        // Add delay minutes
        employeeData[userId].totalDelayMinutes += shift.delay_minutes || 0;
        
        // Add overtime hours
        employeeData[userId].totalOvertimeHours += shift.overtime_hours || 0;
      }

      // Process each employee's data
      const records = [];
      for (const [userId, data] of Object.entries(employeeData)) {
        const delayMinutes = data.totalDelayMinutes;
        const workingDays = data.workingDays.size;
        const overtimeHours = data.totalOvertimeHours;

        const performanceScore = calcPerformanceScore(delayMinutes, overtimeHours);
        const punctuality = calcPunctuality(delayMinutes);
        const status = calcStatus(performanceScore, punctuality);

        const record = {
          employee_id: userId,
          employee_name: data.name,
          month_year: currentMonth,
          total_working_days: workingDays,
          total_delay_minutes: Math.round(delayMinutes),
          total_delay_hours: Math.round((delayMinutes / 60) * 100) / 100,
          total_overtime_hours: Math.round(overtimeHours * 100) / 100,
          average_performance_score: Math.round(performanceScore * 100) / 100,
          punctuality_percentage: Math.round(punctuality * 100) / 100,
          performance_status: status,
        };

        records.push(record);
        console.log(`✅ Calculated for ${data.name}: ${workingDays} days, ${delayMinutes.toFixed(0)} delay min, ${overtimeHours.toFixed(2)}h overtime`);
      }

      // Upsert records into admin_performance_dashboard
      if (records.length > 0) {
        const { error: upsertError } = await supabase
          .from('admin_performance_dashboard')
          .upsert(records, { 
            onConflict: 'employee_id,month_year',
            ignoreDuplicates: false 
          });

        if (upsertError) {
          console.error('Error upserting performance records:', upsertError);
        } else {
          console.log(`✅ Successfully auto-calculated and updated ${records.length} performance records`);
        }
      }

    } catch (error) {
      console.error('❌ Error auto-calculating performance:', error);
      // Don't throw error here, just log it - we still want to load existing data
    }
  };

  const startEditing = (record: PerformanceRecord) => {
    setEditingId(record.id);
    setEditForm(record);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
    setIsAddingNew(false);
  };

  const saveRecord = async () => {
    try {
      if (!editForm.employee_name || !editForm.employee_id) {
        toast.error('Employee name and ID are required');
        return;
      }

      // Ensure all required numeric fields have valid values
      const delayMinutes = Number(editForm.total_delay_minutes) || 0;
      const workingDays = Math.max(1, Number(editForm.total_working_days) || 1);
      const overtimeHours = Number(editForm.total_overtime_hours) || 0;

      const dataToSave = {
        employee_id: editForm.employee_id,
        employee_name: editForm.employee_name,
        month_year: currentMonth,
        total_working_days: workingDays,
        total_delay_minutes: delayMinutes,
        total_delay_hours: Math.round((delayMinutes / 60) * 100) / 100, // Convert minutes to hours
        total_overtime_hours: overtimeHours,
        average_performance_score: calcPerformanceScore(delayMinutes, overtimeHours),
        punctuality_percentage: calcPunctuality(delayMinutes),
        performance_status: calcStatus(
          calcPerformanceScore(delayMinutes, overtimeHours),
          calcPunctuality(delayMinutes)
        ),
      };

      console.log('💾 Saving record with data:', dataToSave);
      console.log('🔧 Is adding new:', isAddingNew);
      console.log('📝 Edit ID:', editingId);

      let result;
      
      if (isAddingNew) {
        // Insert new record - don't include id
        console.log('➕ Inserting new record...');
        result = await supabase
          .from('admin_performance_dashboard')
          .insert([dataToSave])
          .select()
          .single();
      } else {
        // Update existing record
        console.log('✏️ Updating existing record...');
        result = await supabase
          .from('admin_performance_dashboard')
          .update(dataToSave)
          .eq('id', editingId)
          .select()
          .single();
      }

      console.log('📊 Supabase result:', result);

      if (result.error) {
        console.error('❌ Database error details:', {
          message: result.error.message,
          details: result.error.details,
          hint: result.error.hint,
          code: result.error.code
        });
        
        // Show more specific error messages
        if (result.error.code === 'PGRST301') {
          toast.error('Permission denied. Make sure you are logged in as an admin.');
        } else if (result.error.code === '23505') {
          toast.error('Record already exists for this employee and month.');
        } else if (result.error.message.includes('RLS')) {
          toast.error('Access denied by database security policies. Admin access required.');
        } else {
          toast.error(`Database error: ${result.error.message}`);
        }
        return;
      }

      console.log('✅ Record saved successfully:', result.data);
      toast.success(isAddingNew ? 'Record added successfully!' : 'Record updated successfully!');
      
      // Reload data
      await loadData();
      cancelEditing();
    } catch (error) {
      console.error('❌ Error saving record:', error);
      
      // Better error message handling
      let errorMessage = 'Unknown error';
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      }
      
      console.error('📋 Full error object:', JSON.stringify(error, null, 2));
      toast.error(`Failed to save record: ${errorMessage}`);
    }
  };

  const deleteRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      const { error } = await supabase
        .from('admin_performance_dashboard')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Record deleted successfully!');
      await loadData();
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Failed to delete record');
    }
  };

  const startAddingNew = () => {
    setIsAddingNew(true);
    setEditForm({
      employee_id: '',
      employee_name: '',
      month_year: currentMonth,
      total_working_days: 0,
      total_delay_minutes: 0,
      total_delay_hours: 0,
      total_overtime_hours: 0
    });
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 85) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const summaryStats = {
    bestPerformers: performanceData.filter(p => p.average_performance_score >= 95).length,
    totalDelayMinutes: performanceData.reduce((sum, p) => sum + p.total_delay_minutes, 0),
    totalOvertimeHours: performanceData.reduce((sum, p) => sum + p.total_overtime_hours, 0),
  };

  // When editing/adding, always calculate these fields
  const delayMinutes = editForm.total_delay_minutes || 0;
  const overtimeHours = editForm.total_overtime_hours || 0;
  const workingDays = editForm.total_working_days || 1;
  const calculatedScore = calcPerformanceScore(delayMinutes, overtimeHours);
  const calculatedPunctuality = calcPunctuality(delayMinutes);
  const calculatedStatus = calcStatus(calculatedScore, calculatedPunctuality);



  // New function to recalculate performance metrics
  const recalculatePerformanceMetrics = async () => {
    try {
      // Get all performance records for recalculation
      const { data: performanceRecords, error: fetchError } = await supabase
        .from('admin_performance_dashboard')
        .select('*')
        .eq('month_year', currentMonth);

      if (fetchError) throw fetchError;

      let recordsUpdated = 0;
      const updates = [];

      for (const record of performanceRecords) {
        // Recalculate metrics
        const delayMinutes = record.total_delay_minutes || 0;
        const workingDays = record.total_working_days || 1;
        
        // Recalculate performance score using new logic
        const overtimeHours = record.total_overtime_hours || 0;
        const newPerformanceScore = calcPerformanceScore(delayMinutes, overtimeHours);
        
        // Recalculate punctuality percentage
        let newPunctuality = 100.0;
        if (record.total_delay_hours >= 1) {
          newPunctuality = 0.0;
        } else if (delayMinutes > 30) {
          newPunctuality = Math.max(0, 50 - (delayMinutes * 2));
        } else if (delayMinutes > 0) {
          newPunctuality = Math.max(0, 90 - (delayMinutes * 3));
        }
        
        // Recalculate status
        let newStatus = 'Good';
        if (newPerformanceScore >= 95 && newPunctuality >= 95) {
          newStatus = 'Excellent';
        } else if (newPerformanceScore >= 85 && newPunctuality >= 80) {
          newStatus = 'Good';
        } else if (newPerformanceScore >= 70 && newPunctuality >= 60) {
          newStatus = 'Needs Improvement';
        } else {
          newStatus = 'Poor';
        }
        
        // Check if update is needed
        const scoreChanged = Math.abs(newPerformanceScore - record.average_performance_score) > 0.1;
        const punctualityChanged = Math.abs(newPunctuality - record.punctuality_percentage) > 0.1;
        const statusChanged = newStatus !== record.performance_status;
        
        if (scoreChanged || punctualityChanged || statusChanged) {
          updates.push({
            id: record.id,
            average_performance_score: Math.round(newPerformanceScore * 100) / 100,
            punctuality_percentage: Math.round(newPunctuality * 100) / 100,
            performance_status: newStatus,
            updated_at: new Date().toISOString()
          });
          recordsUpdated++;
        }
      }

      if (updates.length > 0) {
        // Batch update records
        const updatePromises = updates.map(update => 
          supabase
            .from('admin_performance_dashboard')
            .update(update)
            .eq('id', update.id)
        );

        const results = await Promise.all(updatePromises);
        const errors = results.filter(result => result.error);
        
        if (errors.length > 0) {
          throw new Error(`${errors.length} updates failed`);
        }
      }

      return { success: true, recordsUpdated, message: `Updated ${recordsUpdated} performance records` };
    } catch (error) {
      console.error('Error recalculating performance metrics:', error);
      return { success: false, error: error.message };
    }
  };

  // Re-record all records from scratch with current month data
  const rerecordAllRecords = async () => {
    if (!confirm(`This will clear and re-record ALL performance data for ${currentMonth} from check-in/out records. This cannot be undone! Continue?`)) return;


    toast.info('🔄 Re-recording all performance data from scratch...');

    try {
      // Step 1: Clear existing records for this month
      const { error: deleteError } = await supabase
        .from('admin_performance_dashboard')
        .delete()
        .eq('month_year', currentMonth);

      if (deleteError) throw deleteError;

      // Step 2: Get all check-ins for the current month
      const monthStart = `${currentMonth}-01`;
      const nextMonth = currentMonth.split('-');
      const nextMonthDate = new Date(parseInt(nextMonth[0]), parseInt(nextMonth[1]), 1);
      const monthEnd = nextMonthDate.toISOString().split('T')[0];

      const { data: checkIns, error: checkInError } = await supabase
        .from('check_ins')
        .select(`
          *,
          users:user_id(name, position)
        `)
        .gte('timestamp', monthStart)
        .lt('timestamp', monthEnd)
        .not('checkout_time', 'is', null);

      if (checkInError) throw checkInError;

      // Step 3: Get shift assignments for the month
      const { data: shiftAssignments, error: shiftError } = await supabase
        .from('shift_assignments')
        .select(`
          *,
          shifts:assigned_shift_id(name, start_time, end_time)
        `)
        .gte('work_date', monthStart)
        .lt('work_date', monthEnd);

      if (shiftError) throw shiftError;

      // Step 4: Process data by employee
      const employeeData: Record<string, {
        name: string;
        position: string;
        workingDays: Set<string>;
        totalDelayMinutes: number;
        totalOvertimeHours: number;
        sessions: any[];
      }> = {};
      
      for (const checkIn of checkIns) {
        const userId = checkIn.user_id;
        const userName = checkIn.users?.name || 'Unknown';
        const userPosition = checkIn.users?.position;
        
        // Only process Customer Service and Designer
        if (!['Customer Service', 'Designer'].includes(userPosition)) continue;

        if (!employeeData[userId]) {
          employeeData[userId] = {
            name: userName,
            position: userPosition,
            workingDays: new Set(),
            totalDelayMinutes: 0,
            totalOvertimeHours: 0,
            sessions: []
          };
        }

        const workDate = checkIn.timestamp.split('T')[0];
        employeeData[userId].workingDays.add(workDate);

        // Find shift assignment for this date
        const shiftAssignment = shiftAssignments.find(sa => 
          sa.employee_id === userId && sa.work_date === workDate
        );

        if (shiftAssignment && !shiftAssignment.is_day_off) {
          const shift = shiftAssignment.shifts;
          const checkInTime = new Date(checkIn.timestamp);
          const checkOutTime = new Date(checkIn.checkout_time);
          
          // Calculate delay
          const scheduledStartTime = shift.start_time;
          const [schedHour, schedMin] = scheduledStartTime.split(':').map(Number);
          const scheduledStart = new Date(checkInTime);
          scheduledStart.setHours(schedHour, schedMin, 0, 0);
          
          const delayMs = checkInTime.getTime() - scheduledStart.getTime();
          const delayMinutes = Math.max(0, delayMs / (1000 * 60));
          employeeData[userId].totalDelayMinutes += delayMinutes;
          
          // Calculate overtime using new flexible rules
          const totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
          const checkInHour = checkInTime.getHours();
          
          let standardHours = 8;
          if (shift.name.toLowerCase().includes('day')) {
            standardHours = 7;
          }
          
          let overtimeHours = 0;
          if (shift.name.toLowerCase().includes('day')) {
            // Day shift: Before 9AM or after 4PM = overtime
            if (checkInHour < 9) {
              const earlyStart = new Date(checkInTime);
              earlyStart.setHours(9, 0, 0, 0);
              if (checkInTime < earlyStart) {
                overtimeHours += (earlyStart.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
              }
            }
            if (checkOutTime.getHours() >= 16) {
              const regularEnd = new Date(checkOutTime);
              regularEnd.setHours(16, 0, 0, 0);
              if (checkOutTime > regularEnd) {
                overtimeHours += (checkOutTime.getTime() - regularEnd.getTime()) / (1000 * 60 * 60);
              }
            }
          } else {
            // Night shift: Standard calculation with midnight overtime
            const regularHours = Math.min(totalHours, standardHours);
            overtimeHours = Math.max(0, totalHours - standardHours);
          }
          
          employeeData[userId].totalOvertimeHours += overtimeHours;
        }
      }

      // Step 5: Create new performance records
      let created = 0;
      for (const [userId, data] of Object.entries(employeeData)) {
        const delayMinutes = data.totalDelayMinutes;
        const workingDays = data.workingDays.size;
        
        const performanceScore = delayMinutes <= 0 ? 100.0 : 
          delayMinutes >= 500 ? 0.0 : 
          Math.max(0, 100.0 - (delayMinutes / 5.0));
          
        let punctuality = 100.0;
        if (delayMinutes >= 60) {
          punctuality = 0.0;
        } else if (delayMinutes > 30) {
          punctuality = Math.max(0, 50 - (delayMinutes * 2));
        } else if (delayMinutes > 0) {
          punctuality = Math.max(0, 90 - (delayMinutes * 3));
        }
        
        let status = 'Good';
        if (performanceScore >= 95 && punctuality >= 95) {
          status = 'Excellent';
        } else if (performanceScore >= 85 && punctuality >= 80) {
          status = 'Good';
        } else if (performanceScore >= 70 && punctuality >= 60) {
          status = 'Needs Improvement';
        } else {
          status = 'Poor';
        }

        const recordData = {
          employee_id: userId,
          employee_name: data.name,
          month_year: currentMonth,
          total_working_days: workingDays,
          total_delay_minutes: Math.round(delayMinutes),
          total_delay_hours: Math.round((delayMinutes / 60) * 100) / 100,
          total_overtime_hours: Math.round(data.totalOvertimeHours * 100) / 100,
          average_performance_score: Math.round(performanceScore * 100) / 100,
          punctuality_percentage: Math.round(punctuality * 100) / 100,
          performance_status: status,
          worked_dates: Array.from(data.workingDays),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase
          .from('admin_performance_dashboard')
          .insert(recordData);

        if (!insertError) created++;
      }

      toast.success(`✅ Re-recorded ${created} performance records for ${currentMonth}!`);
      await loadData();
      
      return { success: true, recordsCreated: created };
    } catch (error) {
      console.error('Error re-recording data:', error);
      toast.error(`Failed to re-record: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      // Clean up
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile-optimized Summary Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Best Performers</p>
                <p className="text-lg sm:text-2xl font-bold">{summaryStats.bestPerformers}</p>
              </div>
              <Award className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Delays</p>
                <p className="text-lg sm:text-2xl font-bold text-red-600">{formatDelayHoursAndMinutes(summaryStats.totalDelayMinutes)}</p>
              </div>
              <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Overtime</p>
                <p className="text-lg sm:text-2xl font-bold text-blue-600">{formatHoursAndMinutes(summaryStats.totalOvertimeHours)}</p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Editable Performance Table */}
      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-base sm:text-lg">Editable Performance Dashboard - {currentMonth}</span>
            
            {/* Mobile action buttons */}
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={loadData} 
                variant="outline" 
                size="sm"
                disabled={isLoading}
                className="min-h-[44px] sm:min-h-auto flex-1 sm:flex-none"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '🔄'} 
                <span className="ml-1 hidden sm:inline">Refresh</span>
              </Button>

              <Button 
                onClick={rerecordAllRecords} 
                variant="outline" 
                size="sm"
                disabled={isLoading}
                className="min-h-[44px] sm:min-h-auto flex-1 sm:flex-none bg-orange-50 hover:bg-orange-100"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                <span className="ml-1 hidden sm:inline">Re-record All</span>
              </Button>

              <Button 
                onClick={startAddingNew} 
                variant="default" 
                size="sm"
                disabled={isAddingNew}
                className="min-h-[44px] sm:min-h-auto flex-1 sm:flex-none"
              >
                <Plus className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">Add Record</span>
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile cards view - Fixed mobile viewing */}
          <div className="block lg:hidden">
            <div className="max-h-none overflow-y-auto">
              <div className="space-y-3 p-4 max-h-[calc(100vh-350px)] overflow-y-auto">
                {/* Add New Record Card */}
                {isAddingNew && (
                  <Card className="border-2 border-blue-200 bg-blue-50/50">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Add New Record</h4>
                        <div className="flex gap-2">
                          <Button onClick={saveRecord} size="sm" variant="outline" className="min-h-[44px] sm:min-h-auto">
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button onClick={cancelEditing} size="sm" variant="outline" className="min-h-[44px] sm:min-h-auto">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Employee</label>
                          <Select
                            value={editForm.employee_id}
                            onValueChange={(value) => {
                              const employee = employees.find(e => e.id === value);
                              setEditForm({
                                ...editForm,
                                employee_id: value,
                                employee_name: employee?.name || '',
                                employee_position: employee?.position || ''
                              });
                            }}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent>
                              {employees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {emp.name} ({emp.position})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Working Days</label>
                            <Input
                              type="number"
                              value={editForm.total_working_days || ''}
                              onChange={(e) => setEditForm({...editForm, total_working_days: Number(e.target.value)})}
                              className="h-11"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Delay Minutes</label>
                            <Input
                              type="number"
                              value={editForm.total_delay_minutes || ''}
                              onChange={(e) => setEditForm({...editForm, total_delay_minutes: Number(e.target.value)})}
                              className="h-11"
                              placeholder="Minutes"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Overtime Hours</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={editForm.total_overtime_hours || ''}
                            onChange={(e) => setEditForm({...editForm, total_overtime_hours: Number(e.target.value)})}
                            className="h-11"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                          <div>
                            <span className="text-xs text-muted-foreground">Performance Score</span>
                            <div className={`text-sm font-bold ${getPerformanceColor(calculatedScore)}`}>
                              {calculatedScore.toFixed(1)}%
                            </div>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Punctuality</span>
                            <div className={`text-sm font-bold ${getPerformanceColor(calculatedPunctuality)}`}>
                              {calculatedPunctuality.toFixed(1)}%
                            </div>
                          </div>
                        </div>

                        <div>
                          <Badge className={
                            calculatedStatus === 'Excellent' ? 'bg-green-100 text-green-800' :
                            calculatedStatus === 'Good' ? 'bg-blue-100 text-blue-800' :
                            calculatedStatus === 'Needs Improvement' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {calculatedStatus}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Loading state */}
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="flex items-center justify-center mb-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    </div>
                    <span className="text-sm text-muted-foreground">Loading...</span>
                  </div>
                ) : performanceData.length === 0 && !isAddingNew ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No performance data available.</p>
                    <p className="text-xs text-muted-foreground mt-1">Click "Add Record" to create new entries.</p>
                  </div>
                ) : (
                  performanceData.map((record) => {
                    const realTimeScore = calcPerformanceScore(record.total_delay_minutes, record.total_overtime_hours);
                    const realTimePunctuality = calcPunctuality(record.total_delay_minutes);
                    const realTimeStatus = calcStatus(realTimeScore, realTimePunctuality);
                    const isEditing = editingId === record.id;

                    return (
                      <Card key={record.id} className={`border ${isEditing ? 'border-blue-200 bg-blue-50/50' : ''}`}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {isEditing ? (
                                <div className="space-y-2">
                                  <label className="text-xs font-medium text-muted-foreground">Employee</label>
                                  <Select
                                    value={editForm.employee_id}
                                    onValueChange={(value) => {
                                      const employee = employees.find(e => e.id === value);
                                      setEditForm({
                                        ...editForm,
                                        employee_id: value,
                                        employee_name: employee?.name || '',
                                        employee_position: employee?.position || ''
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="h-10">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {employees.map((emp) => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                          {emp.name} ({emp.position})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : (
                                <div>
                                  <h4 className="font-medium text-sm">{record.employee_name}</h4>
                                  <Badge variant={record.employee_position === 'Designer' ? 'secondary' : 'default'} className="text-xs mt-1">
                                    {record.employee_position || 'Unknown'}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex gap-2 ml-2">
                              {isEditing ? (
                                <>
                                  <Button onClick={saveRecord} size="sm" variant="outline" className="min-h-[44px] sm:min-h-auto">
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button onClick={cancelEditing} size="sm" variant="outline" className="min-h-[44px] sm:min-h-auto">
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button onClick={() => startEditing(record)} size="sm" variant="outline" className="min-h-[44px] sm:min-h-auto">
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    onClick={() => deleteRecord(record.id)} 
                                    size="sm" 
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700 min-h-[44px] sm:min-h-auto"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Working Days</label>
                                  <Input
                                    type="number"
                                    value={editForm.total_working_days || ''}
                                    onChange={(e) => setEditForm({...editForm, total_working_days: Number(e.target.value)})}
                                    className="h-10"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Delay Minutes</label>
                                  <Input
                                    type="number"
                                    value={editForm.total_delay_minutes || ''}
                                    onChange={(e) => setEditForm({...editForm, total_delay_minutes: Number(e.target.value)})}
                                    className="h-10"
                                    placeholder="Minutes"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Overtime Hours</label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editForm.total_overtime_hours || ''}
                                  onChange={(e) => setEditForm({...editForm, total_overtime_hours: Number(e.target.value)})}
                                  className="h-10"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                                <div>
                                  <span className="text-xs text-muted-foreground">Performance Score</span>
                                  <div className={`text-sm font-bold ${getPerformanceColor(calculatedScore)}`}>
                                    {calculatedScore.toFixed(1)}%
                                  </div>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground">Punctuality</span>
                                  <div className={`text-sm font-bold ${getPerformanceColor(calculatedPunctuality)}`}>
                                    {calculatedPunctuality.toFixed(1)}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <span className="text-xs text-muted-foreground">Working Days</span>
                                  <div className="text-sm font-medium">{record.total_working_days}</div>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground">Performance Score</span>
                                  <div className={`text-sm font-bold ${getPerformanceColor(realTimeScore)}`}>
                                    {realTimeScore.toFixed(1)}%
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <span className="text-xs text-muted-foreground">Delay</span>
                                  <div className={`text-sm font-medium ${record.total_delay_minutes > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                    {formatDelayHoursAndMinutes(record.total_delay_minutes)}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground">Overtime Hours</span>
                                  <div className={`text-sm font-medium ${record.total_overtime_hours > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                                    {formatHoursAndMinutes(record.total_overtime_hours)}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t">
                                <div>
                                  <span className="text-xs text-muted-foreground">Punctuality</span>
                                  <div className={`text-sm font-bold ${getPerformanceColor(realTimePunctuality)}`}>
                                    {realTimePunctuality.toFixed(1)}%
                                  </div>
                                </div>
                                <div>
                                  <Badge className={
                                    realTimeStatus === 'Excellent' ? 'bg-green-100 text-green-800' :
                                    realTimeStatus === 'Good' ? 'bg-blue-100 text-blue-800' :
                                    realTimeStatus === 'Needs Improvement' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }>
                                    {realTimeStatus}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Desktop table view */}
          <div className="hidden lg:block">
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
              <div className="mobile-table-scroll p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10">Employee</TableHead>
                      <TableHead>Position</TableHead>
                    <TableHead>Working Days</TableHead>
                    <TableHead>Performance Score</TableHead>
                    <TableHead>Delay</TableHead>
                    <TableHead>Overtime Hours</TableHead>
                    <TableHead>Punctuality %</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Add New Row */}
                  {isAddingNew && (
                    <TableRow className="bg-blue-50">
                      <TableCell>
                        <Select
                          value={editForm.employee_id}
                          onValueChange={(value) => {
                            const employee = employees.find(e => e.id === value);
                            setEditForm({
                              ...editForm,
                              employee_id: value,
                                employee_name: employee?.name || '',
                                employee_position: employee?.position || ''
                            });
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                  {emp.name} ({emp.position})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {editForm.employee_position || 'Select employee first'}
                          </span>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={editForm.total_working_days || ''}
                          onChange={(e) => setEditForm({...editForm, total_working_days: Number(e.target.value)})}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <span className={`font-bold ${getPerformanceColor(calculatedScore)}`}>{calculatedScore.toFixed(1)}%</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-red-600 font-medium">
                          {formatDelayHoursAndMinutes(editForm.total_delay_minutes || 0)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={editForm.total_overtime_hours || ''}
                          onChange={(e) => setEditForm({...editForm, total_overtime_hours: Number(e.target.value)})}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={editForm.total_delay_minutes || ''}
                          onChange={(e) => setEditForm({...editForm, total_delay_minutes: Number(e.target.value)})}
                          className="w-20"
                          placeholder="Minutes"
                        />
                      </TableCell>
                      <TableCell>
                        <span className={getPerformanceColor(calculatedPunctuality)}>{calculatedPunctuality.toFixed(1)}%</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          calculatedStatus === 'Excellent' ? 'bg-green-100 text-green-800' :
                          calculatedStatus === 'Good' ? 'bg-blue-100 text-blue-800' :
                          calculatedStatus === 'Needs Improvement' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {calculatedStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button onClick={saveRecord} size="sm" variant="outline">
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button onClick={cancelEditing} size="sm" variant="outline">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Existing Records */}
                  {performanceData.map((record) => {
                    const realTimeScore = calcPerformanceScore(record.total_delay_minutes, record.total_overtime_hours);
                    const realTimePunctuality = calcPunctuality(record.total_delay_minutes);
                    const realTimeStatus = calcStatus(realTimeScore, realTimePunctuality);
                    
                    return (
                    <TableRow key={record.id}>
                          <TableCell className="sticky left-0 bg-background z-10 font-medium">
                        {editingId === record.id ? (
                          <Select
                            value={editForm.employee_id}
                            onValueChange={(value) => {
                              const employee = employees.find(e => e.id === value);
                              setEditForm({
                                ...editForm,
                                employee_id: value,
                                    employee_name: employee?.name || '',
                                    employee_position: employee?.position || ''
                              });
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {employees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                      {emp.name} ({emp.position})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          record.employee_name
                        )}
                      </TableCell>
                          <TableCell>
                            {editingId === record.id ? (
                              <span className="text-sm text-gray-600">
                                {editForm.employee_position || record.employee_position}
                              </span>
                            ) : (
                              <Badge variant={record.employee_position === 'Designer' ? 'secondary' : 'default'} className="text-xs">
                                {record.employee_position || 'Unknown'}
                              </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === record.id ? (
                          <Input
                            type="number"
                            value={editForm.total_working_days || ''}
                            onChange={(e) => setEditForm({...editForm, total_working_days: Number(e.target.value)})}
                            className="w-20"
                          />
                        ) : (
                          record.total_working_days
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === record.id ? (
                          <span className={`font-bold ${getPerformanceColor(calculatedScore)}`}>
                            {calculatedScore.toFixed(1)}%
                          </span>
                        ) : (
                          <span className={`font-bold ${getPerformanceColor(realTimeScore)}`}>
                            {realTimeScore.toFixed(1)}%
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === record.id ? (
                          <span className="text-red-600 font-medium">
                            {formatDelayHoursAndMinutes(editForm.total_delay_minutes || 0)}
                          </span>
                        ) : (
                          <span className={record.total_delay_minutes > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                            {formatDelayHoursAndMinutes(record.total_delay_minutes)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === record.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editForm.total_overtime_hours || ''}
                            onChange={(e) => setEditForm({...editForm, total_overtime_hours: Number(e.target.value)})}
                            className="w-20"
                          />
                        ) : (
                          <span className={record.total_overtime_hours > 0 ? 'text-blue-600 font-medium' : 'text-gray-500'}>
                            {formatHoursAndMinutes(record.total_overtime_hours)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === record.id ? (
                          <Input
                            type="number"
                            value={editForm.total_delay_minutes || ''}
                            onChange={(e) => setEditForm({...editForm, total_delay_minutes: Number(e.target.value)})}
                            className="w-20"
                            placeholder="Minutes"
                          />
                        ) : (
                          <span className={getPerformanceColor(realTimePunctuality)}>
                            {realTimePunctuality.toFixed(1)}%
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === record.id ? (
                          <Badge className={
                            calculatedStatus === 'Excellent' ? 'bg-green-100 text-green-800' :
                            calculatedStatus === 'Good' ? 'bg-blue-100 text-blue-800' :
                            calculatedStatus === 'Needs Improvement' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {calculatedStatus}
                          </Badge>
                        ) : (
                          <Badge className={
                            realTimeStatus === 'Excellent' ? 'bg-green-100 text-green-800' :
                            realTimeStatus === 'Good' ? 'bg-blue-100 text-blue-800' :
                            realTimeStatus === 'Needs Improvement' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {realTimeStatus}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === record.id ? (
                          <div className="flex gap-1">
                            <Button onClick={saveRecord} size="sm" variant="outline">
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button onClick={cancelEditing} size="sm" variant="outline">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <Button onClick={() => startEditing(record)} size="sm" variant="outline">
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button 
                              onClick={() => deleteRecord(record.id)} 
                              size="sm" 
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {performanceData.length === 0 && !isAddingNew && (
                <div className="text-center py-8 text-gray-500">
                  No performance data available. Click "Add Record" to create new entries.
                </div>
              )}
            </div>
          )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditablePerformanceDashboard; 