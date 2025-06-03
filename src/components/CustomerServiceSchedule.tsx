import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format, addDays, startOfWeek, isSameDay, isToday } from 'date-fns';
import { 
  Calendar,
  Clock, 
  Coffee,
  Sun,
  Moon,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface ShiftAssignment {
  id: string;
  workDate: Date;
  assignedShiftId: string | null;
  isDayOff: boolean;
  shiftName?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
}

const CustomerServiceSchedule = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [todayAssignment, setTodayAssignment] = useState<ShiftAssignment | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.position === 'Customer Service') {
      loadSchedule();
    }
  }, [user]);

  const loadSchedule = async () => {
    setIsLoading(true);
    try {
      // Get assignments for the next 14 days
      const startDate = new Date();
      const endDate = addDays(startDate, 13);
      
      const { data, error } = await supabase
        .from('shift_assignments')
        .select(`
          *,
          shifts:assigned_shift_id(name, start_time, end_time)
        `)
        .eq('employee_id', user?.id)
        .gte('work_date', format(startDate, 'yyyy-MM-dd'))
        .lte('work_date', format(endDate, 'yyyy-MM-dd'))
        .order('work_date');

      if (error) throw error;

      const formattedAssignments: ShiftAssignment[] = (data || []).map(item => ({
        id: item.id,
        workDate: new Date(item.work_date),
        assignedShiftId: item.assigned_shift_id,
        isDayOff: item.is_day_off,
        shiftName: item.shifts?.name,
        shiftStartTime: item.shifts?.start_time,
        shiftEndTime: item.shifts?.end_time
      }));

      setAssignments(formattedAssignments);

      // Find today's assignment
      const today = formattedAssignments.find(a => isToday(a.workDate));
      setTodayAssignment(today || null);

    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getShiftBadgeStyle = (assignment: ShiftAssignment) => {
    if (assignment.isDayOff) return 'bg-green-100 text-green-800 border-green-200';
    switch (assignment.shiftName) {
      case 'Day Shift': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Night Shift': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getShiftIcon = (assignment: ShiftAssignment) => {
    if (assignment.isDayOff) return <Coffee className="w-4 h-4" />;
    if (assignment.shiftName === 'Day Shift') return <Sun className="w-4 h-4" />;
    if (assignment.shiftName === 'Night Shift') return <Moon className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const getStatusIcon = (assignment: ShiftAssignment) => {
    if (assignment.isDayOff) return <XCircle className="w-4 h-4 text-green-600" />;
    return <CheckCircle className="w-4 h-4 text-blue-600" />;
  };

  if (!user || user.position !== 'Customer Service') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Today's Shift Card */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Today's Schedule - {format(new Date(), 'EEEE, MMMM dd, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayAssignment ? (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {getShiftIcon(todayAssignment)}
                <div>
                  <h3 className="font-semibold text-lg">
                    {todayAssignment.isDayOff ? '🏖️ Day Off' : todayAssignment.shiftName || 'No Shift Assigned'}
                  </h3>
                  {!todayAssignment.isDayOff && todayAssignment.shiftStartTime && (
                    <p className="text-sm text-gray-600">
                      {todayAssignment.shiftStartTime} - {todayAssignment.shiftEndTime}
                    </p>
                  )}
                </div>
              </div>
              <Badge className={`${getShiftBadgeStyle(todayAssignment)} text-sm px-3 py-1`}>
                {todayAssignment.isDayOff ? 'Day Off' : 'Working Day'}
              </Badge>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-800">No Assignment Today</h3>
                <p className="text-sm text-yellow-600">Please check with your admin for today's schedule</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Your Schedule (Next 14 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading your schedule...</div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No schedule assigned yet. Please contact your admin.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow 
                      key={assignment.id}
                      className={isToday(assignment.workDate) ? 'bg-blue-50 border-blue-200' : ''}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {format(assignment.workDate, 'MMM dd, yyyy')}
                          {isToday(assignment.workDate) && (
                            <Badge variant="secondary" className="text-xs">Today</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{format(assignment.workDate, 'EEEE')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(assignment)}
                          <span className={assignment.isDayOff ? 'text-green-600' : 'text-blue-600'}>
                            {assignment.isDayOff ? 'Day Off' : 'Working'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getShiftIcon(assignment)}
                          <Badge className={`text-xs ${getShiftBadgeStyle(assignment)}`}>
                            {assignment.isDayOff ? '🏖️ Day Off' : assignment.shiftName || 'Not Assigned'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {assignment.isDayOff ? (
                          <span className="text-green-600 font-medium">Enjoy your day! 😊</span>
                        ) : assignment.shiftStartTime ? (
                          <span className="text-gray-700">
                            {assignment.shiftStartTime} - {assignment.shiftEndTime}
                          </span>
                        ) : (
                          <span className="text-gray-400">Time TBD</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Working Days</p>
                <p className="text-2xl font-bold text-blue-600">
                  {assignments.filter(a => !a.isDayOff).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Days Off</p>
                <p className="text-2xl font-bold text-green-600">
                  {assignments.filter(a => a.isDayOff).length}
                </p>
              </div>
              <Coffee className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Day Shifts</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {assignments.filter(a => a.shiftName === 'Day Shift').length}
                </p>
              </div>
              <Sun className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Night Shifts</p>
                <p className="text-2xl font-bold text-purple-600">
                  {assignments.filter(a => a.shiftName === 'Night Shift').length}
                </p>
              </div>
              <Moon className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerServiceSchedule; 