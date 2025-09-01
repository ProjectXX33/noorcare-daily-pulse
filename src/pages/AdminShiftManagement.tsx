import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { User, Shift, Position } from '@/types';
import { format, addDays, startOfWeek, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { 
  Calendar,
  Clock, 
  TrendingUp, 
  Users, 
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Coffee,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ShiftAssignment {
  id: string;
  employeeId: string;
  workDate: Date;
  assignedShiftId: string | null;
  isDayOff: boolean;
  assignedBy: string;
  employeeName?: string;
  shiftName?: string;
}

const AdminShiftManagement = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => {
    const today = new Date();
    return startOfWeek(today, { weekStartsOn: 1 }); // Monday
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language] = useState('en');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  
  // Custom shift creation state
  const [isCustomShiftDialogOpen, setIsCustomShiftDialogOpen] = useState(false);
  const [customShiftData, setCustomShiftData] = useState({
    name: '',
    startTime: '',
    endTime: '',
    position: 'Junior CRM Specialist' as Position,
    allTimeOvertime: false
  });

  // Add shift editing state
  const [isEditShiftDialogOpen, setIsEditShiftDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editShiftData, setEditShiftData] = useState({
    name: '',
    startTime: '',
    endTime: '',
    position: 'Junior CRM Specialist' as Position,
    allTimeOvertime: false
  });

  // Bulk assignment state
  const [isBulkAssignmentDialogOpen, setIsBulkAssignmentDialogOpen] = useState(false);
  const [bulkAssignmentData, setBulkAssignmentData] = useState({
    selectedEmployeeId: '',
    selectedShiftId: '',
    selectedMonth: new Date().getMonth(),
    selectedYear: new Date().getFullYear(),
    fridayAsDayOff: true
  });
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);

  const translations = {
    en: {
      shiftManagement: "Shift Management",
      assignShifts: "Assign Shifts",
      weekOf: "Week of",
      employee: "Employee",
      allEmployees: "All Employees",
      monday: "Mon", tuesday: "Tue", wednesday: "Wed", 
      thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun",
      dayShift: "Day Shift", nightShift: "Night Shift", dayOff: "Day Off",
      save: "Save", loading: "Loading...",
      assignmentsUpdated: "Shift assignments updated successfully!",
      performanceScore: "Performance Score",
      delayHours: "Delay Hours",
      overtimeHours: "Overtime Hours",
      punctuality: "Punctuality",
      workingDays: "Working Days",
      excellent: "Excellent", good: "Good", needsImprovement: "Needs Improvement", poor: "Poor",
      bestPerformers: "🏆 Best Performers",
      mostDelays: "⏰ Most Delays",
      mostOvertime: "💪 Most Overtime",
      customerServiceDesigners: "(Junior CRM Specialist & Designers)",
      assignShiftsTrackPerformance: "Assign shifts and manage employee work schedules",
      weeklyShiftAssignments: "Weekly Shift Assignments",
      previousWeek: "Previous",
      nextWeek: "Next",
      notAssigned: "Not Assigned",
      viewEmployee: "View Employee",
      createCustomShift: "Create Custom Shift",
      customShift: "Custom",
      shiftName: "Shift Name",
      startTime: "Start Time",
      endTime: "End Time",
      position: "Position",
      createShift: "Create Shift",
      cancel: "Cancel",
      editShift: "Edit Shift",
      updateShift: "Update Shift",
      deleteShift: "Delete Shift",
      currentShifts: "Current Shifts",
      createNewShift: "Create New Shift"
    }
  };

  const t = translations[language as keyof typeof translations];

  useEffect(() => {
    console.log('AdminShiftManagement: Component mounted', { user });
    if (user?.role === 'admin' || user?.role === 'content_creative_manager' || user?.role === 'customer_retention_manager' || user?.role === 'ecommerce_manager') {
      loadData();
    }
  }, [user, selectedWeekStart]);

  // Add real-time subscription for shift assignments
  useEffect(() => {
    if (!user?.id || (user.role !== 'admin' && user.role !== 'content_creative_manager' && user.role !== 'customer_retention_manager' && user.role !== 'ecommerce_manager')) return;

    // Create unique channel name to avoid conflicts
    const channelName = `shift-assignments-${user.id}`;

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shift_assignments'
        },
        (payload) => {
          console.log('Real-time shift assignment change:', payload);
          // Reload assignments when changes occur from other sources
          loadAssignments();
        }
      )
      .subscribe();

    return () => {
      if (subscription) {
      subscription.unsubscribe();
      }
    };
  }, [user?.id]); // Only depend on user.id to avoid unnecessary re-subscriptions

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    console.log('🔍 AdminShiftManagement: Loading data for user:', user?.role);
    
    try {
      await Promise.all([
        loadEmployees(),
        loadShifts(),
        loadAssignments()
      ]);
      console.log('AdminShiftManagement: Data loaded successfully');
    } catch (error) {
      console.error('AdminShiftManagement: Error loading data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
      toast.error('Failed to load data. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      console.log('🔍 Loading employees for user role:', user?.role);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'employee')
        .order('name');

      if (error) {
        console.error('❌ Error loading employees:', error);
        throw error;
      }
      
      console.log('🔍 Raw employee data from database:', data);
      
      // Filter employees for Content & Creative Manager and Customer Retention Manager
      let filteredEmployees = data || [];
      if (user?.role === 'content_creative_manager') {
        filteredEmployees = (data || []).filter(emp => 
          emp.team === 'Content & Creative Department' && 
          ['Content Creator', 'Designer', 'Media Buyer'].includes(emp.position)
        );
      } else if (user?.role === 'customer_retention_manager') {
        // More flexible filtering for Customer Retention Manager
        filteredEmployees = (data || []).filter(emp => 
          (emp.team === 'Customer Retention Department' || emp.team === null) && 
          ['Junior CRM Specialist', 'Senior CRM Pharmacist', 'Customer Retention Specialist'].includes(emp.position)
        );
        console.log('🔍 Customer Retention Manager - All employees:', data);
        console.log('🔍 Customer Retention Manager - Filtered employees:', filteredEmployees);
        
        // If no team-specific employees found, show all CRM positions
        if (filteredEmployees.length === 0) {
          filteredEmployees = (data || []).filter(emp => 
            ['Junior CRM Specialist', 'Senior CRM Pharmacist', 'Customer Retention Specialist'].includes(emp.position)
          );
          console.log('🔍 Customer Retention Manager - Fallback to all CRM positions:', filteredEmployees);
        }
      }
      
      console.log('Employees loaded:', filteredEmployees?.length || 0);
      setEmployees(filteredEmployees);
    } catch (error) {
      console.error('Error loading employees:', error);
      throw error;
    }
  };

  const loadShifts = async () => {
    try {
      console.log('🔍 Loading shifts...');
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('is_active', true)
        .order('start_time');

      if (error) {
        console.error('❌ Error loading shifts:', error);
        throw error;
      }
      console.log('🔍 Shifts loaded:', data?.length || 0);
      console.log('🔍 Shifts data:', data);
      
      // Map database fields to Shift type
      const mappedShifts = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        startTime: item.start_time,
        endTime: item.end_time,
        position: item.position,
        allTimeOvertime: item.all_time_overtime || false,
        isActive: item.is_active,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at)
      }));
      
      setShifts(mappedShifts);
    } catch (error) {
      console.error('Error loading shifts:', error);
      throw error;
    }
  };

  const loadAssignments = async () => {
          try {
        console.log('Loading assignments...');
        const weekEnd = addDays(selectedWeekStart, 6);
      
      const { data, error } = await supabase
        .from('shift_assignments')
        .select(`
          *,
          users:employee_id(name),
          shifts:assigned_shift_id(name)
        `)
        .gte('work_date', format(selectedWeekStart, 'yyyy-MM-dd'))
        .lte('work_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('work_date');

      if (error) throw error;

      const formattedAssignments: ShiftAssignment[] = (data || []).map(item => ({
        id: item.id,
        employeeId: item.employee_id,
        workDate: new Date(item.work_date),
        assignedShiftId: item.assigned_shift_id,
        isDayOff: item.is_day_off,
        assignedBy: item.assigned_by,
        employeeName: item.users?.name,
        shiftName: item.shifts?.name
      }));

      // Filter assignments for Content & Creative Manager and Customer Retention Manager
      let filteredAssignments = formattedAssignments;
      if (user?.role === 'content_creative_manager') {
        const teamEmployeeIds = employees.map(emp => emp.id);
        filteredAssignments = formattedAssignments.filter(assignment => 
          teamEmployeeIds.includes(assignment.employeeId)
        );
        console.log('🎯 Content & Creative Shift Assignments:', filteredAssignments.length);
      } else if (user?.role === 'customer_retention_manager') {
        const teamEmployeeIds = employees.map(emp => emp.id);
        filteredAssignments = formattedAssignments.filter(assignment => 
          teamEmployeeIds.includes(assignment.employeeId)
        );
        console.log('🎯 Customer Retention Shift Assignments:', filteredAssignments.length);
        console.log('🎯 Customer Retention Employee IDs:', teamEmployeeIds);
      }
      
      console.log('Assignments loaded:', filteredAssignments.length);
      setAssignments(filteredAssignments);
    } catch (error) {
      console.error('Error loading assignments:', error);
      throw error;
    }
  };

  // Helper function to calculate shift duration in hours
  const calculateShiftDuration = (startTime: string, endTime: string): number => {
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    return durationMinutes / 60; // Convert to hours
  };

  // Helper function to recalculate hours based on new shift
  const recalculateHoursForShift = (
    currentRegularHours: number,
    currentOvertimeHours: number,
    newShiftDuration: number,
    workedHours: number
  ): { regularHours: number; overtimeHours: number } => {
    const totalWorkedHours = currentRegularHours + currentOvertimeHours;
    
    // If no work was done, reset to 0
    if (workedHours <= 0) {
      return { regularHours: 0, overtimeHours: 0 };
    }

    // Calculate new regular hours (up to shift duration)
    const newRegularHours = Math.min(workedHours, newShiftDuration);
    
    // Calculate new overtime hours (anything beyond shift duration)
    const newOvertimeHours = Math.max(0, workedHours - newShiftDuration);

    return { regularHours: newRegularHours, overtimeHours: newOvertimeHours };
  };

  const updateAssignment = async (employeeId: string, date: Date, shiftId: string | null, isDayOff: boolean) => {
    try {
      const workDate = format(date, 'yyyy-MM-dd');
      
      console.log('🔄 Updating assignment:', {
        employeeId,
        workDate,
        shiftId,
        isDayOff,
        adminId: user?.id
      });

      // Get current shift data to recalculate hours
      const selectedShift = shiftId ? shifts.find(s => s.id === shiftId) : null;
      const shiftName = selectedShift ? selectedShift.name : undefined;
      const employee = employees.find(e => e.id === employeeId);

      // Get current monthly shift data for recalculation
      const { data: currentMonthlyShift, error: fetchError } = await supabase
        .from('monthly_shifts')
        .select('*')
        .eq('user_id', employeeId)
        .eq('work_date', workDate)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Error fetching current monthly shift:', fetchError);
      }

      let newRegularHours = 0;
      let newOvertimeHours = 0;

      // Recalculate hours if we have a new shift and existing work data
      if (!isDayOff && selectedShift && currentMonthlyShift) {
        const workedHours = (currentMonthlyShift.regular_hours || 0) + (currentMonthlyShift.overtime_hours || 0);
        const newShiftDuration = calculateShiftDuration(selectedShift.startTime, selectedShift.endTime);
        
        const recalculated = recalculateHoursForShift(
          currentMonthlyShift.regular_hours || 0,
          currentMonthlyShift.overtime_hours || 0,
          newShiftDuration,
          workedHours
        );
        
        newRegularHours = recalculated.regularHours;
        newOvertimeHours = recalculated.overtimeHours;
        
        console.log('🔄 Shift Change Recalculation:', {
          employeeId,
          workDate,
          oldShift: currentMonthlyShift.shift_id,
          newShift: selectedShift.name,
          oldRegularHours: currentMonthlyShift.regular_hours,
          oldOvertimeHours: currentMonthlyShift.overtime_hours,
          newShiftDuration,
          workedHours,
          newRegularHours,
          newOvertimeHours
        });
      }

      // Immediately update UI state for responsive feedback
      setAssignments(prev => {
        const updated = [...prev];
        const index = updated.findIndex(a => 
          a.employeeId === employeeId && isSameDay(a.workDate, date)
        );
        
        if (index >= 0) {
          updated[index] = {
            ...updated[index],
            assignedShiftId: isDayOff ? null : shiftId,
            isDayOff,
            shiftName: isDayOff ? undefined : shiftName
          };
        } else {
          updated.push({
            id: `temp-${Date.now()}`,
            employeeId,
            workDate: date,
            assignedShiftId: isDayOff ? null : shiftId,
            isDayOff,
            assignedBy: user?.id || '',
            employeeName: employee?.name,
            shiftName: isDayOff ? undefined : shiftName
          });
        }
        
        return updated;
      });
      
      const assignmentData = {
        employee_id: employeeId,
        work_date: workDate,
        assigned_shift_id: isDayOff ? null : shiftId,
        is_day_off: isDayOff,
        assigned_by: user?.id,
        updated_at: new Date().toISOString()
      };

      console.log('💾 Updating shift_assignments table:', assignmentData);

      const { data, error } = await supabase
        .from('shift_assignments')
        .upsert(assignmentData, {
          onConflict: 'employee_id,work_date'
        });

      if (error) throw error;

      console.log('✅ shift_assignments updated successfully');

      // Update monthly_shifts table with recalculated hours
      const monthlyShiftData = {
        user_id: employeeId,
        work_date: workDate,
        shift_id: isDayOff ? null : shiftId,
        is_day_off: isDayOff,
        regular_hours: newRegularHours,
        overtime_hours: newOvertimeHours,
        delay_minutes: currentMonthlyShift?.delay_minutes || 0,
        check_in_time: currentMonthlyShift?.check_in_time || null,
        check_out_time: currentMonthlyShift?.check_out_time || null,
        updated_at: new Date().toISOString()
      };

      console.log('💾 Updating monthly_shifts table:', monthlyShiftData);

      const { error: monthlyError } = await supabase
        .from('monthly_shifts')
        .upsert(monthlyShiftData, {
          onConflict: 'user_id,work_date'
        });

      if (monthlyError) {
        console.error('❌ monthly_shifts update error:', monthlyError);
        throw monthlyError;
      }

      console.log('✅ monthly_shifts updated successfully');
      
      // Show success feedback
      const shiftDisplayName = isDayOff ? 'Day Off' : (selectedShift?.name || 'Unknown Shift');
      toast.success(`Shift updated: ${shiftDisplayName} - ${format(date, 'MMM dd, yyyy')}`);
      
    } catch (error) {
      console.error('❌ Error updating assignment:', error);
      toast.error('Failed to update assignment');
    }
  };

  const saveAllAssignments = async () => {
    toast.success(t.assignmentsUpdated);
  };

  const getAssignmentForEmployeeAndDate = (employeeId: string, date: Date) => {
    return assignments.find(a => 
      a.employeeId === employeeId && 
      isSameDay(a.workDate, date)
    );
  };

  const getWeekDays = () => {
          const days = [];
      for (let i = 0; i < 7; i++) {
        days.push(addDays(selectedWeekStart, i));
      }
    return days;
  };

  const getShiftBadgeStyle = (shiftName: string | undefined, isDayOff: boolean) => {
    if (isDayOff) return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:border-green-800';
    switch (shiftName) {
      case 'Day Shift': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
      case 'Night Shift': return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
    }
  };

  // Custom shift creation function
  const createCustomShift = async () => {
    if (!customShiftData.name || !customShiftData.startTime || !customShiftData.endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('shifts')
        .insert({
          name: customShiftData.name,
          start_time: customShiftData.startTime,
          end_time: customShiftData.endTime,
          position: customShiftData.position,
          all_time_overtime: customShiftData.allTimeOvertime,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      setShifts(prev => [...prev, {
        id: data.id,
        name: data.name,
        startTime: data.start_time,
        endTime: data.end_time,
        position: data.position,
        allTimeOvertime: data.all_time_overtime,
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      }]);

      toast.success(`Custom shift "${customShiftData.name}" created successfully!`);
      
      // Reset form and close dialog
      setCustomShiftData({
        name: '',
        startTime: '',
        endTime: '',
        position: 'Junior CRM Specialist',
        allTimeOvertime: false
      });
      setIsCustomShiftDialogOpen(false);

    } catch (error) {
      console.error('Error creating custom shift:', error);
      toast.error('Failed to create custom shift');
    }
  };

  // Edit shift function
  const editShift = async () => {
    if (!editShiftData.name || !editShiftData.startTime || !editShiftData.endTime || !editingShift) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('shifts')
        .update({
          name: editShiftData.name,
          start_time: editShiftData.startTime,
          end_time: editShiftData.endTime,
          position: editShiftData.position,
          all_time_overtime: editShiftData.allTimeOvertime,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingShift.id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setShifts(prev => prev.map(shift => 
        shift.id === editingShift.id 
          ? {
              ...shift,
              name: data.name,
              startTime: data.start_time,
              endTime: data.end_time,
              position: data.position,
              allTimeOvertime: data.all_time_overtime,
              updatedAt: new Date(data.updated_at)
            }
          : shift
      ));

      toast.success(`Shift "${editShiftData.name}" updated successfully!`);
      
      // Reset form and close dialog
      setEditingShift(null);
      setEditShiftData({
        name: '',
        startTime: '',
        endTime: '',
        position: 'Junior CRM Specialist',
        allTimeOvertime: false
      });
      setIsEditShiftDialogOpen(false);

    } catch (error) {
      console.error('Error updating shift:', error);
      toast.error('Failed to update shift');
    }
  };

  // Delete shift function
  const deleteShift = async (shiftId: string, shiftName: string) => {
    if (!confirm(`Are you sure you want to delete "${shiftName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('shifts')
        .update({ is_active: false })
        .eq('id', shiftId);

      if (error) throw error;

      // Remove from local state
      setShifts(prev => prev.filter(shift => shift.id !== shiftId));

      toast.success(`Shift "${shiftName}" deleted successfully!`);

    } catch (error) {
      console.error('Error deleting shift:', error);
      toast.error('Failed to delete shift');
    }
  };

  // Open edit dialog
  const openEditDialog = (shift: Shift) => {
    setEditingShift(shift);
    setEditShiftData({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      position: shift.position as Position,
      allTimeOvertime: shift.allTimeOvertime || false
    });
    setIsEditShiftDialogOpen(true);
  };

  // Bulk assignment function
  const handleBulkAssignment = async () => {
    if (!bulkAssignmentData.selectedEmployeeId || !bulkAssignmentData.selectedShiftId) {
      toast.error('Please select both employee and shift');
      return;
    }

    try {
      setIsBulkAssigning(true);
      toast.info('Assigning shifts for the entire month...');

      console.log('🔄 Starting bulk assignment:', bulkAssignmentData);

      const selectedShift = shifts.find(s => s.id === bulkAssignmentData.selectedShiftId);
      const selectedEmployee = employees.find(e => e.id === bulkAssignmentData.selectedEmployeeId);

      if (!selectedShift || !selectedEmployee) {
        toast.error('Selected shift or employee not found');
        return;
      }

      // Get all days in the selected month
      const startDate = new Date(bulkAssignmentData.selectedYear, bulkAssignmentData.selectedMonth, 1);
      const endDate = new Date(bulkAssignmentData.selectedYear, bulkAssignmentData.selectedMonth + 1, 0);
      
      const daysInMonth = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        daysInMonth.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log(`📅 Assigning shifts for ${daysInMonth.length} days in ${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);

      let assignedCount = 0;
      let dayOffCount = 0;
      let errorCount = 0;

      // Process each day
      for (const date of daysInMonth) {
        try {
          const isFriday = date.getDay() === 5; // Friday = 5
          const isDayOff = bulkAssignmentData.fridayAsDayOff && isFriday;
          
          const workDate = format(date, 'yyyy-MM-dd');
          
          console.log(`📅 Processing ${workDate}: ${isDayOff ? 'Day Off (Friday)' : selectedShift.name}`);

          // Update shift_assignments table
          const assignmentData = {
            employee_id: bulkAssignmentData.selectedEmployeeId,
            work_date: workDate,
            assigned_shift_id: isDayOff ? null : bulkAssignmentData.selectedShiftId,
            is_day_off: isDayOff,
            assigned_by: user?.id,
            updated_at: new Date().toISOString()
          };

          const { error: assignmentError } = await supabase
            .from('shift_assignments')
            .upsert(assignmentData, {
              onConflict: 'employee_id,work_date'
            });

          if (assignmentError) {
            console.error(`❌ Error updating shift_assignments for ${workDate}:`, assignmentError);
            errorCount++;
            continue;
          }

          // Update monthly_shifts table with recalculated hours
          let newRegularHours = 0;
          let newOvertimeHours = 0;

          if (!isDayOff) {
            // Get current monthly shift data for recalculation
            const { data: currentMonthlyShift } = await supabase
              .from('monthly_shifts')
              .select('*')
              .eq('user_id', bulkAssignmentData.selectedEmployeeId)
              .eq('work_date', workDate)
              .single();

            if (currentMonthlyShift) {
              const workedHours = (currentMonthlyShift.regular_hours || 0) + (currentMonthlyShift.overtime_hours || 0);
              const newShiftDuration = calculateShiftDuration(selectedShift.startTime, selectedShift.endTime);
              
              const recalculated = recalculateHoursForShift(
                currentMonthlyShift.regular_hours || 0,
                currentMonthlyShift.overtime_hours || 0,
                newShiftDuration,
                workedHours
              );
              
              newRegularHours = recalculated.regularHours;
              newOvertimeHours = recalculated.overtimeHours;
            }
          }

          const monthlyShiftData = {
            user_id: bulkAssignmentData.selectedEmployeeId,
            work_date: workDate,
            shift_id: isDayOff ? null : bulkAssignmentData.selectedShiftId,
            is_day_off: isDayOff,
            regular_hours: newRegularHours,
            overtime_hours: newOvertimeHours,
            updated_at: new Date().toISOString()
          };

          const { error: monthlyError } = await supabase
            .from('monthly_shifts')
            .upsert(monthlyShiftData, {
              onConflict: 'user_id,work_date'
            });

          if (monthlyError) {
            console.error(`❌ Error updating monthly_shifts for ${workDate}:`, monthlyError);
            errorCount++;
            continue;
          }

          if (isDayOff) {
            dayOffCount++;
          } else {
            assignedCount++;
          }

        } catch (dayError) {
          console.error(`❌ Error processing day ${format(date, 'yyyy-MM-dd')}:`, dayError);
          errorCount++;
        }
      }

      console.log(`✅ Bulk assignment completed: ${assignedCount} shifts, ${dayOffCount} days off, ${errorCount} errors`);

      // Show success message
      const monthName = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const employeeName = selectedEmployee.name;
      const shiftName = selectedShift.name;
      
      if (errorCount === 0) {
        toast.success(`✅ Assigned ${shiftName} to ${employeeName} for ${monthName} (${assignedCount} days + ${dayOffCount} Fridays off)`);
      } else {
        toast.warning(`⚠️ Assigned ${shiftName} to ${employeeName} for ${monthName} (${assignedCount} days + ${dayOffCount} Fridays off, ${errorCount} errors)`);
      }

      // Reset form and close dialog
      setBulkAssignmentData({
        selectedEmployeeId: '',
        selectedShiftId: '',
        selectedMonth: new Date().getMonth(),
        selectedYear: new Date().getFullYear(),
        fridayAsDayOff: true
      });
      setIsBulkAssignmentDialogOpen(false);

      // Refresh data
      await loadAssignments();

    } catch (error) {
      console.error('❌ Bulk assignment error:', error);
      toast.error('Failed to assign shifts for the month');
    } finally {
      setIsBulkAssigning(false);
    }
  };

  const filteredEmployees = selectedEmployee === 'all' 
    ? employees 
    : employees.filter(emp => emp.id === selectedEmployee);

  // Digital Solution Manager and General Manager have access to everything
  if (user?.position === 'Digital Solution Manager' || user?.position === 'General Manager') {
    // Continue to render the page
  } else if (!user || (user.role !== 'admin' && user.role !== 'content_creative_manager' && user.role !== 'customer_retention_manager' && user.role !== 'ecommerce_manager')) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-4 sm:p-6 text-center">
            <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-yellow-500 mx-auto mb-3 sm:mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">Access Denied</h2>
            <p className="text-sm sm:text-base text-gray-500">This page is only available for administrators.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">{t.loading}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-4 sm:p-6 text-center">
            <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-red-500 mx-auto mb-3 sm:mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">Error Loading Page</h2>
            <p className="text-sm sm:text-base text-gray-500 mb-4">{error}</p>
            <Button onClick={() => loadData()} className="min-h-[44px]">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const weekDays = getWeekDays();
  const dayNames = [t.monday, t.tuesday, t.wednesday, t.thursday, t.friday, t.saturday, t.sunday];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 w-full max-w-full overflow-x-hidden">
      {/* Enhanced mobile-optimized header - Non-sticky, responsive layout */}
      <div className="border-b border-border/50 bg-background/98 w-full">
        <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6 w-full max-w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
            <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">{t.shiftManagement}</h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                {t.assignShiftsTrackPerformance} {t.customerServiceDesigners}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 space-y-6 sm:space-y-8 md:space-y-10 w-full max-w-full overflow-x-hidden">
        {/* Current Shifts Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Shifts</span>
              <Dialog open={isCustomShiftDialogOpen} onOpenChange={setIsCustomShiftDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create New Shift
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create Custom Shift</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="shift-name">Shift Name *</Label>
                      <Input
                        id="shift-name"
                        placeholder="e.g., Evening Shift, Custom Day Shift"
                        value={customShiftData.name}
                        onChange={(e) => setCustomShiftData(prev => ({...prev, name: e.target.value}))}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="start-time">Start Time *</Label>
                        <Input
                          id="start-time"
                          type="time"
                          value={customShiftData.startTime}
                          onChange={(e) => setCustomShiftData(prev => ({...prev, startTime: e.target.value}))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end-time">End Time *</Label>
                        <Input
                          id="end-time"
                          type="time"
                          value={customShiftData.endTime}
                          onChange={(e) => setCustomShiftData(prev => ({...prev, endTime: e.target.value}))}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Position</Label>
                      <Select
                        value={customShiftData.position}
                        onValueChange={(value: Position) => 
                          setCustomShiftData(prev => ({...prev, position: value}))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Junior CRM Specialist">Junior CRM Specialist</SelectItem>
                          <SelectItem value="Senior CRM Pharmacist">Senior CRM Pharmacist</SelectItem>
                          <SelectItem value="Digital Solution Manager">Digital Solution Manager</SelectItem>
                          <SelectItem value="General Manager">General Manager</SelectItem>
                          <SelectItem value="Designer">Designer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="all-time-overtime"
                        checked={customShiftData.allTimeOvertime}
                        onCheckedChange={(checked) => 
                          setCustomShiftData(prev => ({...prev, allTimeOvertime: Boolean(checked)}))
                        }
                      />
                      <Label htmlFor="all-time-overtime" className="text-sm font-normal">
                        All time is overtime
                      </Label>
                    </div>
                    <div className="text-xs text-muted-foreground ml-6">
                      When enabled, all hours worked in this shift will be counted as overtime instead of regular time.
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                      <Button 
                        onClick={createCustomShift}
                        className="flex-1 gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Create Shift
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsCustomShiftDialogOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {shifts.map((shift) => (
                <div key={shift.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{shift.name}</span>
                      {shift.allTimeOvertime && (
                        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 border-orange-200">
                          All Overtime
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {shift.startTime} - {shift.endTime} • {shift.position}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(shift)}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteShift(shift.id, shift.name)}
                      className="gap-2 text-red-600 hover:text-red-700"
                    >
                      <XCircle className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Edit Shift Dialog */}
        <Dialog open={isEditShiftDialogOpen} onOpenChange={setIsEditShiftDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Shift</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-shift-name">Shift Name *</Label>
                <Input
                  id="edit-shift-name"
                  placeholder="e.g., Evening Shift, Custom Day Shift"
                  value={editShiftData.name}
                  onChange={(e) => setEditShiftData(prev => ({...prev, name: e.target.value}))}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-start-time">Start Time *</Label>
                  <Input
                    id="edit-start-time"
                    type="time"
                    value={editShiftData.startTime}
                    onChange={(e) => setEditShiftData(prev => ({...prev, startTime: e.target.value}))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-end-time">End Time *</Label>
                  <Input
                    id="edit-end-time"
                    type="time"
                    value={editShiftData.endTime}
                    onChange={(e) => setEditShiftData(prev => ({...prev, endTime: e.target.value}))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Position</Label>
                <Select
                  value={editShiftData.position}
                  onValueChange={(value: Position) => 
                    setEditShiftData(prev => ({...prev, position: value}))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Junior CRM Specialist">Junior CRM Specialist</SelectItem>
                    <SelectItem value="Senior CRM Pharmacist">Senior CRM Pharmacist</SelectItem>
                    <SelectItem value="Digital Solution Manager">Digital Solution Manager</SelectItem>
                    <SelectItem value="General Manager">General Manager</SelectItem>
                    <SelectItem value="Designer">Designer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-all-time-overtime"
                  checked={editShiftData.allTimeOvertime}
                  onCheckedChange={(checked) => 
                    setEditShiftData(prev => ({...prev, allTimeOvertime: Boolean(checked)}))
                  }
                />
                <Label htmlFor="edit-all-time-overtime" className="text-sm font-normal">
                  All time is overtime
                </Label>
              </div>
              <div className="text-xs text-muted-foreground ml-6">
                When enabled, all hours worked in this shift will be counted as overtime instead of regular time.
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={editShift}
                  className="flex-1 gap-2"
                >
                  <Save className="h-4 w-4" />
                  Update Shift
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditShiftDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Shift assignments content */}
        <div className="space-y-4 mt-4 md:mt-6">
            {/* Mobile employee filter */}
            <div className="block sm:hidden">
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <label className="text-sm font-medium">{t.employee}</label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={t.allEmployees} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.allEmployees}</SelectItem>
                        {employees.map(employee => (
                          <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-base sm:text-lg">{t.weeklyShiftAssignments}</span>
                    <Dialog open={isBulkAssignmentDialogOpen} onOpenChange={setIsBulkAssignmentDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Users className="h-4 w-4" />
                          Bulk Assign Month
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Bulk Assign Shifts for Month</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="bulk-employee">Select Employee *</Label>
                            <Select 
                              value={bulkAssignmentData.selectedEmployeeId} 
                              onValueChange={(value) => setBulkAssignmentData(prev => ({...prev, selectedEmployeeId: value}))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose employee" />
                              </SelectTrigger>
                              <SelectContent>
                                {employees.map(employee => (
                                  <SelectItem key={employee.id} value={employee.id}>
                                    {employee.name} ({employee.position})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="bulk-shift">Select Shift *</Label>
                            <Select 
                              value={bulkAssignmentData.selectedShiftId} 
                              onValueChange={(value) => setBulkAssignmentData(prev => ({...prev, selectedShiftId: value}))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose shift" />
                              </SelectTrigger>
                              <SelectContent>
                                {shifts.map(shift => (
                                  <SelectItem key={shift.id} value={shift.id}>
                                    {shift.name} ({shift.startTime} - {shift.endTime})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="bulk-month">Select Month</Label>
                            <Select 
                              value={bulkAssignmentData.selectedMonth.toString()} 
                              onValueChange={(value) => setBulkAssignmentData(prev => ({...prev, selectedMonth: parseInt(value)}))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({length: 12}, (_, i) => (
                                  <SelectItem key={i} value={i.toString()}>
                                    {new Date(2024, i).toLocaleDateString('en-US', { month: 'long' })}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="bulk-year">Select Year</Label>
                            <Select 
                              value={bulkAssignmentData.selectedYear.toString()} 
                              onValueChange={(value) => setBulkAssignmentData(prev => ({...prev, selectedYear: parseInt(value)}))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({length: 5}, (_, i) => {
                                  const year = new Date().getFullYear() + i;
                                  return (
                                    <SelectItem key={year} value={year.toString()}>
                                      {year}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="friday-dayoff" 
                              checked={bulkAssignmentData.fridayAsDayOff}
                              onCheckedChange={(checked) => setBulkAssignmentData(prev => ({...prev, fridayAsDayOff: checked as boolean}))}
                            />
                            <Label htmlFor="friday-dayoff" className="text-sm">
                              Set Fridays as Day Off
                            </Label>
                          </div>
                          
                          <div className="flex justify-end space-x-2 pt-4">
                            <Button 
                              variant="outline" 
                              onClick={() => setIsBulkAssignmentDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleBulkAssignment}
                              disabled={isBulkAssigning || !bulkAssignmentData.selectedEmployeeId || !bulkAssignmentData.selectedShiftId}
                            >
                              {isBulkAssigning ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Assigning...
                                </>
                              ) : (
                                'Assign Shifts'
                              )}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {/* Week navigation */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                                              onClick={() => setSelectedWeekStart(addDays(selectedWeekStart, -7))}
                      className="min-h-[44px] sm:min-h-auto px-2 sm:px-3"
                    >
                      <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline ml-1">{t.previousWeek}</span>
                    </Button>
                    <div className="text-xs sm:text-sm font-medium text-center min-w-[120px]">
                      {t.weekOf}<br className="sm:hidden" />
                      <span className="font-bold">{format(selectedWeekStart, 'MMM dd, yyyy')}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                                              onClick={() => setSelectedWeekStart(addDays(selectedWeekStart, 7))}
                      className="min-h-[44px] sm:min-h-auto px-2 sm:px-3"
                    >
                      <span className="hidden sm:inline mr-1">{t.nextWeek}</span>
                      <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </CardTitle>
                
                {/* Desktop employee filter */}
                <div className="hidden sm:block">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium">{t.employee}:</label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger className="w-[200px] h-9">
                        <SelectValue placeholder={t.allEmployees} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.allEmployees}</SelectItem>
                        {employees.map(employee => (
                          <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Mobile cards view - Fixed mobile viewing */}
                <div className="block lg:hidden">
                  <div className="max-h-none overflow-y-auto">
                    <div className="space-y-3 p-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                      {filteredEmployees.map((employee) => (
                        <Card key={employee.id} className="border">
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm">{employee.name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {employee.position}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2">
                                {weekDays.slice(0, 4).map((day, index) => {
                                  const assignment = getAssignmentForEmployeeAndDate(employee.id, day);
                                  return (
                                    <div key={day.toISOString()} className="space-y-1">
                                      <div className="text-xs font-medium text-muted-foreground">
                                        {dayNames[index]} {format(day, 'dd')}
                                      </div>
                                      <Select
                                        value={
                                          assignment?.isDayOff ? 'day_off' : 
                                          assignment?.assignedShiftId || 'unassigned'
                                        }
                                        onValueChange={(value) => {
                                          if (value === 'day_off') {
                                            updateAssignment(employee.id, day, null, true);
                                          } else if (value === 'unassigned') {
                                            updateAssignment(employee.id, day, null, false);
                                          } else {
                                            updateAssignment(employee.id, day, value, false);
                                          }
                                        }}
                                      >
                                        <SelectTrigger className="h-9 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="unassigned">{t.notAssigned}</SelectItem>
                                          {shifts.map((shift) => (
                                            <SelectItem key={shift.id} value={shift.id}>
                                              {shift.name}
                                            </SelectItem>
                                          ))}
                                          <SelectItem value="day_off">
                                            <div className="flex items-center gap-1">
                                              <Coffee className="w-3 h-3" />
                                              {t.dayOff}
                                            </div>
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  );
                                })}
                              </div>
                              
                              <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                                {weekDays.slice(4).map((day, index) => {
                                  const assignment = getAssignmentForEmployeeAndDate(employee.id, day);
                                  return (
                                    <div key={day.toISOString()} className="space-y-1">
                                      <div className="text-xs font-medium text-muted-foreground">
                                        {dayNames[index + 4]} {format(day, 'dd')}
                                      </div>
                                      <Select
                                        value={
                                          assignment?.isDayOff ? 'day_off' : 
                                          assignment?.assignedShiftId || 'unassigned'
                                        }
                                        onValueChange={(value) => {
                                          if (value === 'day_off') {
                                            updateAssignment(employee.id, day, null, true);
                                          } else if (value === 'unassigned') {
                                            updateAssignment(employee.id, day, null, false);
                                          } else {
                                            updateAssignment(employee.id, day, value, false);
                                          }
                                        }}
                                      >
                                        <SelectTrigger className="h-9 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="unassigned">{t.notAssigned}</SelectItem>
                                          {shifts.map((shift) => (
                                            <SelectItem key={shift.id} value={shift.id}>
                                              {shift.name}
                                            </SelectItem>
                                          ))}
                                          <SelectItem value="day_off">
                                            <div className="flex items-center gap-1">
                                              <Coffee className="w-3 h-3" />
                                              {t.dayOff}
                                            </div>
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Desktop table view */}
                <div className="hidden lg:block p-4">
                  <div className="mobile-table-scroll">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-background z-10 w-40">{t.employee}</TableHead>
                          {weekDays.map((day, index) => (
                            <TableHead key={day.toISOString()} className="text-center min-w-32">
                              <div className="flex flex-col">
                                <span className="font-medium">{dayNames[index]}</span>
                                <span className="text-xs text-gray-500">{format(day, 'MMM dd')}</span>
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEmployees.map((employee) => (
                          <TableRow key={employee.id}>
                            <TableCell className="sticky left-0 bg-background z-10 font-medium">{employee.name}</TableCell>
                            {weekDays.map((day) => {
                              const assignment = getAssignmentForEmployeeAndDate(employee.id, day);
                              return (
                                <TableCell key={day.toISOString()} className="text-center">
                                  <Select
                                    value={
                                      assignment?.isDayOff ? 'day_off' : 
                                      assignment?.assignedShiftId || 'unassigned'
                                    }
                                    onValueChange={(value) => {
                                      if (value === 'day_off') {
                                        updateAssignment(employee.id, day, null, true);
                                      } else if (value === 'unassigned') {
                                        updateAssignment(employee.id, day, null, false);
                                      } else {
                                        updateAssignment(employee.id, day, value, false);
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unassigned">{t.notAssigned}</SelectItem>
                                      {shifts.map((shift) => (
                                        <SelectItem key={shift.id} value={shift.id}>
                                          {shift.name}
                                        </SelectItem>
                                      ))}
                                      <SelectItem value="day_off">
                                        <div className="flex items-center gap-1">
                                          <Coffee className="w-3 h-3" />
                                          {t.dayOff}
                                        </div>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {assignment && (
                                    <div className="mt-1">
                                      <Badge 
                                        className={`text-xs ${getShiftBadgeStyle(assignment.shiftName, assignment.isDayOff)}`}
                                      >
                                        {assignment.isDayOff ? '🏖️ Day Off' : assignment.shiftName}
                                      </Badge>
                                    </div>
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                            </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminShiftManagement; 