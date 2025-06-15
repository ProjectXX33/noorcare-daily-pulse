import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    if (user?.position === 'Customer Service' || user?.position === 'Designer') {
      loadSchedule();
    }
  }, [user]);

  const loadSchedule = async () => {
    setIsLoading(true);
    try {
      // Get assignments for the next 7 days
      const startDate = new Date();
      const endDate = addDays(startDate, 6); // Next 7 days (0-6)
      
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
    if (assignment.isDayOff) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
    switch (assignment.shiftName) {
      case 'Day Shift': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      case 'Night Shift': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getShiftIcon = (assignment: ShiftAssignment) => {
    if (assignment.isDayOff) return <Coffee className="w-4 h-4 shrink-0" />;
    if (assignment.shiftName === 'Day Shift') return <Sun className="w-4 h-4 shrink-0" />;
    if (assignment.shiftName === 'Night Shift') return <Moon className="w-4 h-4 shrink-0" />;
    return <Clock className="w-4 h-4 shrink-0" />;
  };

  const getStatusIcon = (assignment: ShiftAssignment) => {
    if (assignment.isDayOff) return <XCircle className="w-4 h-4 shrink-0 text-green-600" />;
    return <CheckCircle className="w-4 h-4 shrink-0 text-blue-600" />;
  };

  if (!user || (user.position !== 'Customer Service' && user.position !== 'Designer')) {
    return null;
  }

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="space-y-3 sm:space-y-4">
        {/* Mobile-optimized Today's Shift Card - No horizontal overflow */}
        <Card className="w-full border border-border/50 shadow-sm">
          <CardHeader className="pb-2 px-3 sm:px-4">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base truncate">
              <Calendar className="w-4 h-4 shrink-0" />
              <span className="truncate">Today - {format(new Date(), 'EEE, MMM dd')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3">
            {todayAssignment ? (
              <div className="w-full">
                <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                  <div className="p-1.5 rounded-full bg-background shadow-sm shrink-0">
                    {getShiftIcon(todayAssignment)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="font-semibold text-xs sm:text-sm leading-tight truncate">
                      {todayAssignment.isDayOff ? '🏖️ Day Off' : todayAssignment.shiftName || 'No Shift Assigned'}
                    </h3>
                    {!todayAssignment.isDayOff && todayAssignment.shiftStartTime && (
                      <p className="text-xs text-muted-foreground truncate">
                        {todayAssignment.shiftStartTime} - {todayAssignment.shiftEndTime}
                      </p>
                    )}
                    <Badge className={`${getShiftBadgeStyle(todayAssignment)} text-xs px-2 py-0.5 font-medium w-fit`}>
                      {todayAssignment.isDayOff ? 'Day Off' : 'Working'}
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 shrink-0">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200 text-xs sm:text-sm">No Assignment Today</h3>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 leading-tight">Contact admin for schedule</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mobile-optimized Schedule - Cards only, no tables on mobile */}
        <Card className="w-full border border-border/50 shadow-sm">
          <CardHeader className="pb-2 px-3 sm:px-4">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base truncate">
              <Clock className="w-4 h-4 shrink-0" />
              <span className="truncate">Next 7 Days</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-8 px-3">
                <div className="flex items-center justify-center mb-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                </div>
                <span className="text-xs font-medium text-muted-foreground">Loading...</span>
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-8 px-3">
                <div className="bg-muted/50 rounded-lg p-4 max-w-xs mx-auto">
                  <Calendar className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <h3 className="font-semibold text-muted-foreground text-sm mb-1">No Schedule</h3>
                  <p className="text-xs text-muted-foreground">Contact your admin</p>
                </div>
              </div>
            ) : (
              <>
                {/* Mobile Cards View - Optimized for small screens */}
                <div className="block xl:hidden">
                  <div className="max-h-none overflow-y-auto">
                    <div className="space-y-2 p-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                      {assignments.map((assignment) => (
                        <div 
                          key={assignment.id} 
                          className={`w-full border rounded-lg p-3 ${
                            isToday(assignment.workDate) 
                              ? 'border-primary/50 bg-primary/5' 
                              : 'border-border/50 bg-background'
                          }`}
                        >
                          {/* Date and status row */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <h4 className="font-semibold text-xs leading-tight truncate">
                                {format(assignment.workDate, 'EEE, MMM dd')}
                              </h4>
                              {isToday(assignment.workDate) && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0.5 shrink-0">Today</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {getStatusIcon(assignment)}
                              <span className={`text-xs font-medium ${assignment.isDayOff ? 'text-green-600' : 'text-blue-600'}`}>
                                {assignment.isDayOff ? 'Off' : 'Work'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Shift info row */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {getShiftIcon(assignment)}
                              <span className="text-xs font-medium text-muted-foreground truncate">
                                {assignment.isDayOff ? 'Day Off' : assignment.shiftName || 'Not Assigned'}
                              </span>
                            </div>
                            <div className="text-xs font-medium shrink-0">
                              {assignment.isDayOff ? (
                                <span className="text-green-600">😊</span>
                              ) : assignment.shiftStartTime ? (
                                <span className="text-foreground">
                                  {assignment.shiftStartTime.slice(0, 5)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">TBD</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Desktop Table View - Only for very large screens */}
                <div className="hidden xl:block">
                  <div className="w-full">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border/50">
                          <TableHead className="font-semibold text-xs">Date</TableHead>
                          <TableHead className="font-semibold text-xs">Day</TableHead>
                          <TableHead className="font-semibold text-xs">Status</TableHead>
                          <TableHead className="font-semibold text-xs">Shift</TableHead>
                          <TableHead className="font-semibold text-xs">Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignments.map((assignment) => (
                          <TableRow 
                            key={assignment.id}
                            className={`hover:bg-muted/50 transition-colors ${
                              isToday(assignment.workDate) ? 'bg-primary/5 border-primary/20' : ''
                            }`}
                          >
                            <TableCell className="font-medium text-xs">
                              <div className="flex items-center gap-2">
                                {format(assignment.workDate, 'MMM dd')}
                                {isToday(assignment.workDate) && (
                                  <Badge variant="secondary" className="text-xs">Today</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">{format(assignment.workDate, 'EEE')}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(assignment)}
                                <span className={`text-xs ${assignment.isDayOff ? 'text-green-600' : 'text-blue-600'}`}>
                                  {assignment.isDayOff ? 'Day Off' : 'Working'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getShiftIcon(assignment)}
                                <Badge className={`text-xs ${getShiftBadgeStyle(assignment)}`}>
                                  {assignment.isDayOff ? 'Day Off' : assignment.shiftName || 'Not Assigned'}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              {assignment.isDayOff ? (
                                <span className="text-green-600 font-medium">Enjoy! 😊</span>
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

        {/* Mobile-optimized Summary Cards - 2x2 grid for mobile */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Card className="w-full border border-border/50 shadow-sm">
            <CardContent className="p-2 sm:p-3">
              <div className="text-center space-y-1">
                <div className="flex justify-center">
                  <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <p className="text-xs font-medium text-muted-foreground leading-tight">Work Days</p>
                <div className="text-sm sm:text-lg font-bold text-blue-600">
                  {assignments.filter(a => !a.isDayOff).length}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="w-full border border-border/50 shadow-sm">
            <CardContent className="p-2 sm:p-3">
              <div className="text-center space-y-1">
                <div className="flex justify-center">
                  <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-900/30">
                    <Coffee className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <p className="text-xs font-medium text-muted-foreground leading-tight">Days Off</p>
                <div className="text-sm sm:text-lg font-bold text-green-600">
                  {assignments.filter(a => a.isDayOff).length}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="w-full border border-border/50 shadow-sm">
            <CardContent className="p-2 sm:p-3">
              <div className="text-center space-y-1">
                <div className="flex justify-center">
                  <div className="p-1.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                    <Sun className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
                <p className="text-xs font-medium text-muted-foreground leading-tight">Day Shifts</p>
                <div className="text-sm sm:text-lg font-bold text-yellow-600">
                  {assignments.filter(a => a.shiftName === 'Day Shift').length}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="w-full border border-border/50 shadow-sm">
            <CardContent className="p-2 sm:p-3">
              <div className="text-center space-y-1">
                <div className="flex justify-center">
                  <div className="p-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <Moon className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <p className="text-xs font-medium text-muted-foreground leading-tight">Night Shifts</p>
                <div className="text-sm sm:text-lg font-bold text-purple-600">
                  {assignments.filter(a => a.shiftName === 'Night Shift').length}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CustomerServiceSchedule; 