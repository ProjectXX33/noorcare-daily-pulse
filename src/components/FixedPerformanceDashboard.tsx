import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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

interface PerformanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  month_year: string;
  total_working_days: number;
  total_delay_minutes: number;
  total_delay_hours: number;
  total_overtime_hours: number;
  average_performance_score: number;
  punctuality_percentage: number;
  performance_status: string;
  worked_dates?: string[];
}

interface FixedPerformanceDashboardProps {
  currentMonth?: string;
}

// Performance calculation functions
function calculatePerformanceScore(delayMinutes: number): number {
  if (delayMinutes <= 0) return 100.0;
  if (delayMinutes >= 500) return 0.0;
  return Math.max(0, 100.0 - (delayMinutes / 5.0));
}

function calculatePunctuality(delayMinutes: number): number {
  if (delayMinutes <= 0) return 100.0;
  if (delayMinutes >= 60) return 0.0;
  if (delayMinutes > 30) return Math.max(0, 50 - (delayMinutes * 2));
  return Math.max(0, 90 - (delayMinutes * 3));
}

function calculateStatus(score: number, punctuality: number): string {
  if (score >= 95 && punctuality >= 95) return 'Excellent';
  if (score >= 85 && punctuality >= 80) return 'Good';
  if (score >= 70 && punctuality >= 60) return 'Needs Improvement';
  return 'Poor';
}

const FixedPerformanceDashboard: React.FC<FixedPerformanceDashboardProps> = ({ 
  currentMonth = '2025-06' 
}) => {
  const [performanceData, setPerformanceData] = useState<PerformanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isRerecording, setIsRerecording] = useState(false);

  useEffect(() => {
    loadData();
    // Set up real-time subscription
    const subscription = supabase
      .channel('performance_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'admin_performance_dashboard' },
        () => {
          console.log('📡 Real-time update detected');
          loadData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentMonth]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      console.log('📊 Loading performance data for:', currentMonth);
      
      const { data, error } = await supabase
        .from('admin_performance_dashboard')
        .select(`
          *,
          users:employee_id(position)
        `)
        .eq('month_year', currentMonth)
        .order('average_performance_score', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      console.log('✅ Loaded records:', data?.length || 0);
      const formattedData = (data || []).map(item => ({
        ...item,
        employee_position: item.users?.position
      }));
      setPerformanceData(formattedData);
    } catch (error) {
      console.error('Error loading performance data:', error);
      toast.error(`Failed to load performance data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (record: PerformanceRecord) => {
    setEditingId(record.id);
    setEditForm({
      ...record,
      total_delay_hours: record.total_delay_minutes / 60
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
    setIsAddingNew(false);
  };

  const saveRecord = async () => {
    try {
      const delayMinutes = editForm.total_delay_minutes || 0;
      const delayHours = delayMinutes / 60;
      const workingDays = editForm.total_working_days || 1;
      
      const newPerformanceScore = calculatePerformanceScore(delayMinutes);
      const newPunctuality = calculatePunctuality(delayMinutes);
      const newStatus = calculateStatus(newPerformanceScore, newPunctuality);
      
      const recordData = {
        employee_id: editForm.employee_id,
        employee_name: editForm.employee_name,
        month_year: currentMonth,
        total_working_days: workingDays,
        total_delay_minutes: delayMinutes,
        total_delay_hours: Math.round(delayHours * 100) / 100,
        total_overtime_hours: editForm.total_overtime_hours || 0,
        average_performance_score: Math.round(newPerformanceScore * 100) / 100,
        punctuality_percentage: Math.round(newPunctuality * 100) / 100,
        performance_status: newStatus,
        updated_at: new Date().toISOString()
      };

      let result;
      if (isAddingNew) {
        result = await supabase
          .from('admin_performance_dashboard')
          .insert(recordData)
          .select();
      } else {
        result = await supabase
          .from('admin_performance_dashboard')
          .update(recordData)
          .eq('id', editingId)
          .select();
      }

      if (result.error) throw result.error;

      toast.success(isAddingNew ? 'Record created successfully!' : 'Record updated successfully!');
      cancelEditing();
      await loadData();
    } catch (error) {
      console.error('Error saving record:', error);
      toast.error(`Failed to save record: ${error.message}`);
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
      toast.error(`Failed to delete record: ${error.message}`);
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
      total_overtime_hours: 0
    });
  };

  // Recalculate all performance metrics with new rules
  const recalculateAllMetrics = async () => {
    if (!confirm('This will recalculate ALL performance metrics using the latest rules. Continue?')) return;

    setIsRecalculating(true);
    toast.info('🔄 Recalculating all performance metrics...');

    try {
      const { data: records, error: fetchError } = await supabase
        .from('admin_performance_dashboard')
        .select('*')
        .eq('month_year', currentMonth);

      if (fetchError) throw fetchError;

      let updated = 0;
      for (const record of records) {
        const delayMinutes = record.total_delay_minutes || 0;
        const newScore = calculatePerformanceScore(delayMinutes);
        const newPunctuality = calculatePunctuality(delayMinutes);
        const newStatus = calculateStatus(newScore, newPunctuality);

        const { error: updateError } = await supabase
          .from('admin_performance_dashboard')
          .update({
            average_performance_score: Math.round(newScore * 100) / 100,
            punctuality_percentage: Math.round(newPunctuality * 100) / 100,
            performance_status: newStatus,
            total_delay_hours: Math.round((delayMinutes / 60) * 100) / 100,
            updated_at: new Date().toISOString()
          })
          .eq('id', record.id);

        if (!updateError) updated++;
      }

      toast.success(`✅ Recalculated ${updated} records successfully!`);
      await loadData();
    } catch (error) {
      console.error('Error recalculating metrics:', error);
      toast.error(`Failed to recalculate: ${error.message}`);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Re-record all records from scratch with current month data
  const rerecordAllRecords = async () => {
    if (!confirm('This will clear and re-record ALL performance data for 2025-06 from check-in/out records. This cannot be undone! Continue?')) return;

    setIsRerecording(true);
    toast.info('🔄 Re-recording all performance data from scratch...');

    try {
      // Step 1: Clear existing records for this month
      await supabase
        .from('admin_performance_dashboard')
        .delete()
        .eq('month_year', currentMonth);

      // Step 2: Get all check-ins for June 2025
      const { data: checkIns, error: checkInError } = await supabase
        .from('check_ins')
        .select(`
          *,
          users:user_id(name, position)
        `)
        .gte('timestamp', '2025-06-01')
        .lt('timestamp', '2025-07-01')
        .not('checkout_time', 'is', null);

      if (checkInError) throw checkInError;

      // Step 3: Get shift assignments for June 2025
      const { data: shiftAssignments, error: shiftError } = await supabase
        .from('shift_assignments')
        .select(`
          *,
          shifts:assigned_shift_id(name, start_time, end_time)
        `)
        .gte('work_date', '2025-06-01')
        .lt('work_date', '2025-07-01');

      if (shiftError) throw shiftError;

      // Step 4: Process data by employee
      const employeeData = {};
      
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
        
        const performanceScore = calculatePerformanceScore(delayMinutes);
        const punctuality = calculatePunctuality(delayMinutes);
        const status = calculateStatus(performanceScore, punctuality);

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
    } catch (error) {
      console.error('Error re-recording data:', error);
      toast.error(`Failed to re-record: ${error.message}`);
    } finally {
      setIsRerecording(false);
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 85) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const summaryStats = {
    bestPerformers: performanceData.filter(p => p.average_performance_score >= 95).length,
    totalDelayHours: performanceData.reduce((sum, p) => sum + p.total_delay_hours, 0),
    totalOvertimeHours: performanceData.reduce((sum, p) => sum + p.total_overtime_hours, 0),
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Summary Cards */}
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
                <p className="text-lg sm:text-2xl font-bold text-red-600">{summaryStats.totalDelayHours.toFixed(1)}h</p>
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
                <p className="text-lg sm:text-2xl font-bold text-blue-600">{summaryStats.totalOvertimeHours.toFixed(1)}h</p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-base sm:text-lg">Fixed Performance Dashboard - {currentMonth}</span>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={loadData} 
                variant="outline" 
                size="sm"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh
              </Button>

              <Button 
                onClick={recalculateAllMetrics} 
                variant="outline" 
                size="sm"
                disabled={isRecalculating}
                className="bg-blue-50 hover:bg-blue-100"
              >
                {isRecalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Recalculate All
              </Button>

              <Button 
                onClick={rerecordAllRecords} 
                variant="outline" 
                size="sm"
                disabled={isRerecording}
                className="bg-orange-50 hover:bg-orange-100"
              >
                {isRerecording ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Re-record All
              </Button>

              <Button 
                onClick={startAddingNew} 
                variant="default" 
                size="sm"
                disabled={isAddingNew}
              >
                <Plus className="h-4 w-4" />
                Add Record
              </Button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading performance data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Working Days</TableHead>
                    <TableHead>Performance Score</TableHead>
                    <TableHead>Delay Hours</TableHead>
                    <TableHead>Overtime Hours</TableHead>
                    <TableHead>Punctuality %</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isAddingNew && (
                    <TableRow>
                      <TableCell>
                        <Input
                          placeholder="Employee Name"
                          value={editForm.employee_name || ''}
                          onChange={(e) => setEditForm({...editForm, employee_name: e.target.value})}
                        />
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
                        <span className={`font-bold ${getPerformanceColor(calculatePerformanceScore(editForm.total_delay_minutes || 0))}`}>
                          {calculatePerformanceScore(editForm.total_delay_minutes || 0).toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          placeholder="Minutes"
                          value={editForm.total_delay_minutes || ''}
                          onChange={(e) => setEditForm({...editForm, total_delay_minutes: Number(e.target.value)})}
                          className="w-24"
                        />
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
                        <span className={getPerformanceColor(calculatePunctuality(editForm.total_delay_minutes || 0))}>
                          {calculatePunctuality(editForm.total_delay_minutes || 0).toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-gray-100 text-gray-800">
                          {calculateStatus(
                            calculatePerformanceScore(editForm.total_delay_minutes || 0),
                            calculatePunctuality(editForm.total_delay_minutes || 0)
                          )}
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

                  {performanceData.map((record) => {
                    const realTimeScore = calculatePerformanceScore(record.total_delay_minutes);
                    const realTimePunctuality = calculatePunctuality(record.total_delay_minutes);
                    const realTimeStatus = calculateStatus(realTimeScore, realTimePunctuality);

                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.employee_name}</TableCell>
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
                          <span className={`font-bold ${getPerformanceColor(realTimeScore)}`}>
                            {realTimeScore.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {editingId === record.id ? (
                            <Input
                              type="number"
                              placeholder="Minutes"
                              value={editForm.total_delay_minutes || ''}
                              onChange={(e) => setEditForm({...editForm, total_delay_minutes: Number(e.target.value)})}
                              className="w-24"
                            />
                          ) : (
                            <span className={record.total_delay_hours > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                              {record.total_delay_hours.toFixed(2)}h
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
                              {record.total_overtime_hours}h
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={getPerformanceColor(realTimePunctuality)}>
                            {realTimePunctuality.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            realTimeStatus === 'Excellent' ? 'bg-green-100 text-green-800' :
                            realTimeStatus === 'Good' ? 'bg-blue-100 text-blue-800' :
                            realTimeStatus === 'Needs Improvement' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {realTimeStatus}
                          </Badge>
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
                  No performance data available for {currentMonth}. Click "Re-record All" to generate from check-in data.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FixedPerformanceDashboard; 