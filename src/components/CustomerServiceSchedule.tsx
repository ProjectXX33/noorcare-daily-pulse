
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
  XCircle,
  Loader2
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

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
    if (user?.position === 'Customer Service' || user?.position === 'Designer') {
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
    if (assignment.isDayOff) return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400';
    switch (assignment.shiftName) {
      case 'Day Shift': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400';
      case 'Night Shift': return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600';
    }
  };

  const getShiftIcon = (assignment: ShiftAssignment) => {
    if (assignment.isDayOff) return <Coffee className="w-3 h-3 sm:w-4 sm:h-4" />;
    if (assignment.shiftName === 'Day Shift') return <Sun className="w-3 h-3 sm:w-4 sm:h-4" />;
    if (assignment.shiftName === 'Night Shift') return <Moon className="w-3 h-3 sm:w-4 sm:h-4" />;
    return <Clock className="w-3 h-3 sm:w-4 sm:h-4" />;
  };

  const getStatusIcon = (assignment: ShiftAssignment) => {
    if (assignment.isDayOff) return <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />;
    return <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />;
  };

  if (!user || (user.position !== 'Customer Service' && user.position !== 'Designer')) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="h-8 w-8 sm:h-12 sm:w-12 animate-spin text-primary" />
          <p className="text-sm sm:text-base text-muted-foreground">Loading your schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Today's Shift Card - Mobile Optimized */}
      <Card className="border-2 border-primary/20 shadow-sm">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span>Today's Schedule</span>
              <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                {format(new Date(), 'EEEE, MMM dd')}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayAssignment ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 sm:gap-3">
                {getShiftIcon(todayAssignment)}
                <div className="flex-1">
                  <h3 className="font-semibold text-sm sm:text-lg">
                    {todayAssignment.isDayOff ? '🏖️ Day Off' : todayAssignment.shiftName || 'No Shift Assigned'}
                  </h3>
                  {!todayAssignment.isDayOff && todayAssignment.shiftStartTime && (
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {todayAssignment.shiftStartTime} - {todayAssignment.shiftEndTime}
                    </p>
                  )}
                </div>
              </div>
              <Badge className={`${getShiftBadgeStyle(todayAssignment)} text-xs sm:text-sm px-2 sm:px-3 py-1 shrink-0`}>
                {todayAssignment.isDayOff ? 'Day Off' : 'Working Day'}
              </Badge>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-400 text-sm sm:text-base">No Assignment Today</h3>
                <p className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-500">Please check with your admin for today's schedule</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Schedule - Mobile Optimized */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Your Schedule (Next 14 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {assignments.length === 0 ? (
            <div className="text-center py-6 sm:py-8 px-4 text-muted-foreground">
              <Calendar className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-4 opacity-50" />
              <p className="text-sm sm:text-base">No schedule assigned yet.</p>
              <p className="text-xs sm:text-sm mt-1">Please contact your admin.</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards View */}
              <div className="block lg:hidden">
                <ScrollArea className="h-[50vh] sm:h-[60vh]">
                  <div className="space-y-2 p-4">
                    {assignments.map((assignment) => (
                      <div 
                        key={assignment.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          isToday(assignment.workDate) 
                            ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' 
                            : 'bg-card hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {format(assignment.workDate, 'MMM dd')}
                            </span>
                            {isToday(assignment.workDate) && (
                              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">Today</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(assignment.workDate, 'EEE')}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getShiftIcon(assignment)}
                            <div className="flex flex-col">
                              <Badge className={`text-xs w-fit ${getShiftBadgeStyle(assignment)}`}>
                                {assignment.isDayOff ? '🏖️ Day Off' : assignment.shiftName || 'Not Assigned'}
                              </Badge>
                              {!assignment.isDayOff && assignment.shiftStartTime && (
                                <span className="text-xs text-muted-foreground mt-1">
                                  {assignment.shiftStartTime} - {assignment.shiftEndTime}
                                </span>
                              )}
                            </div>
                          </div>
                          {getStatusIcon(assignment)}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block">
                <div className="mobile-table-scroll max-h-[60vh]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-32">Date</TableHead>
                        <TableHead className="w-24">Day</TableHead>
                        <TableHead className="w-28">Status</TableHead>
                        <TableHead className="w-40">Shift</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map((assignment) => (
                        <TableRow 
                          key={assignment.id}
                          className={isToday(assignment.workDate) ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : ''}
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
                              <span className={assignment.isDayOff ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}>
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
                              <span className="text-green-600 dark:text-green-400 font-medium">Enjoy your day! 😊</span>
                            ) : assignment.shiftStartTime ? (
                              <span className="text-foreground">
                                {assignment.shiftStartTime} - {assignment.shiftEndTime}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Time TBD</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Schedule Summary - Mobile Optimized Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Working Days</p>
                <p className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {assignments.filter(a => !a.isDayOff).length}
                </p>
              </div>
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Days Off</p>
                <p className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">
                  {assignments.filter(a => a.isDayOff).length}
                </p>
              </div>
              <Coffee className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Day Shifts</p>
                <p className="text-lg sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {assignments.filter(a => a.shiftName === 'Day Shift').length}
                </p>
              </div>
              <Sun className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Night Shifts</p>
                <p className="text-lg sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {assignments.filter(a => a.shiftName === 'Night Shift').length}
                </p>
              </div>
              <Moon className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerServiceSchedule;
