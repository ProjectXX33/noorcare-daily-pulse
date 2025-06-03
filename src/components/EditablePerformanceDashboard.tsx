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
  RefreshCw
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
}

interface EditablePerformanceDashboardProps {
  currentMonth?: string;
}

// Helper functions for calculation (copied from performanceApi.ts)
function calcPerformanceScore(delayMinutes: number): number {
  if (delayMinutes <= 0) return 100.0;
  if (delayMinutes >= 500) return 0.0;
  return Math.max(0, 100.0 - (delayMinutes / 5.0));
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
  const [employees, setEmployees] = useState<Array<{id: string, name: string}>>([]);

  useEffect(() => {
    loadData();
    loadEmployees();
  }, [currentMonth]);

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name')
        .eq('position', 'Customer Service')
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
      
      const { data, error } = await supabase
        .from('admin_performance_dashboard')
        .select('*')
        .eq('month_year', currentMonth)
        .order('average_performance_score', { ascending: false });

      if (error) throw error;
      
      console.log('Performance data loaded:', data?.length || 0);
      setPerformanceData(data || []);
    } catch (error) {
      console.error('Error loading performance data:', error);
      toast.error('Failed to load performance data');
    } finally {
      setIsLoading(false);
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

      const dataToSave = {
        ...editForm,
        month_year: currentMonth,
        total_delay_minutes: Number(editForm.total_delay_minutes) || 0,
        total_working_days: Number(editForm.total_working_days) || 1,
        average_performance_score: calcPerformanceScore(Number(editForm.total_delay_minutes) || 0),
        punctuality_percentage: calcPunctuality(Number(editForm.total_delay_minutes) || 0),
        performance_status: calcStatus(
          calcPerformanceScore(Number(editForm.total_delay_minutes) || 0),
          calcPunctuality(Number(editForm.total_delay_minutes) || 0)
        ),
      };

      let result;
      
      if (isAddingNew) {
        // Insert new record
        delete dataToSave.id;
        result = await supabase
          .from('admin_performance_dashboard')
          .insert([dataToSave])
          .select()
          .single();
      } else {
        // Update existing record
        result = await supabase
          .from('admin_performance_dashboard')
          .update(dataToSave)
          .eq('id', editingId)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      toast.success(isAddingNew ? 'Record added successfully!' : 'Record updated successfully!');
      
      // Reload data
      await loadData();
      cancelEditing();
    } catch (error) {
      console.error('Error saving record:', error);
      toast.error('Failed to save record');
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
    totalDelayHours: performanceData.reduce((sum, p) => sum + p.total_delay_hours, 0),
    totalOvertimeHours: performanceData.reduce((sum, p) => sum + p.total_overtime_hours, 0),
  };

  // When editing/adding, always calculate these fields
  const delayMinutes = editForm.total_delay_minutes || 0;
  const workingDays = editForm.total_working_days || 1;
  const calculatedScore = calcPerformanceScore(delayMinutes);
  const calculatedPunctuality = calcPunctuality(delayMinutes);
  const calculatedStatus = calcStatus(calculatedScore, calculatedPunctuality);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Best Performers</p>
                <p className="text-lg font-bold">{summaryStats.bestPerformers}</p>
              </div>
              <Award className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Delays</p>
                <p className="text-lg font-bold text-red-600">{summaryStats.totalDelayHours.toFixed(1)}h</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Overtime</p>
                <p className="text-lg font-bold text-blue-600">{summaryStats.totalOvertimeHours.toFixed(1)}h</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Editable Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Editable Performance Dashboard - {currentMonth}</span>
            <div className="flex gap-2">
              <Button onClick={loadData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={startAddingNew} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Record
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
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
                              employee_name: employee?.name || ''
                            });
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          {(editForm.total_delay_minutes ? (editForm.total_delay_minutes / 60).toFixed(2) : '0.00') + 'h'}
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
                    // Always calculate real-time values based on delay minutes
                    const realTimeScore = calcPerformanceScore(record.total_delay_minutes);
                    const realTimePunctuality = calcPunctuality(record.total_delay_minutes);
                    const realTimeStatus = calcStatus(realTimeScore, realTimePunctuality);
                    
                    return (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {editingId === record.id ? (
                          <Select
                            value={editForm.employee_id}
                            onValueChange={(value) => {
                              const employee = employees.find(e => e.id === value);
                              setEditForm({
                                ...editForm,
                                employee_id: value,
                                employee_name: employee?.name || ''
                              });
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {employees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {emp.name}
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
                            {(editForm.total_delay_minutes ? (editForm.total_delay_minutes / 60).toFixed(2) : '0.00') + 'h'}
                          </span>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default EditablePerformanceDashboard; 