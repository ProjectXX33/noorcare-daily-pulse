import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Coffee, Timer, Users, Clock, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface BreakSession {
  id: string;
  user_id: string;
  userName: string;
  department: string;
  position: string;
  timestamp: string;
  total_break_minutes: number;
  break_sessions: Array<{
    start_time: string;
    end_time: string;
    duration_minutes: number;
    reason: string;
  }>;
  is_on_break: boolean;
  current_break_reason?: string;
  break_start_time?: string;
}

const AdminBreakTimePage = () => {
  const { user } = useAuth();
  const [breakData, setBreakData] = useState<BreakSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState({
    totalEmployeesOnBreak: 0,
    totalBreakTimeToday: 0,
    averageBreakDuration: 0,
    mostCommonReason: 'N/A'
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      loadBreakData();
    }
  }, [user, dateFilter]);

  const loadBreakData = async () => {
    setIsLoading(true);
    try {
      // Get work day boundaries for the selected date
      const selectedDate = new Date(dateFilter);
      const workDayStart = new Date(selectedDate);
      workDayStart.setHours(4, 0, 0, 0);
      
      const workDayEnd = new Date(workDayStart);
      workDayEnd.setDate(workDayEnd.getDate() + 1);

      const { data, error } = await supabase
        .from('check_ins')
        .select(`
          id,
          user_id,
          timestamp,
          total_break_minutes,
          break_sessions,
          is_on_break,
          current_break_reason,
          break_start_time,
          users:user_id(name, department, position)
        `)
        .gte('timestamp', workDayStart.toISOString())
        .lt('timestamp', workDayEnd.toISOString())
        .or('total_break_minutes.gt.0,is_on_break.eq.true')
        .order('timestamp', { ascending: false });

      if (error) throw error;

      const formattedData: BreakSession[] = data.map(item => ({
        id: item.id,
        user_id: item.user_id,
        userName: (item.users as any)?.name || 'Unknown User',
        department: (item.users as any)?.department || 'Unknown',
        position: (item.users as any)?.position || 'Unknown',
        timestamp: item.timestamp,
        total_break_minutes: item.total_break_minutes || 0,
        break_sessions: item.break_sessions || [],
        is_on_break: item.is_on_break || false,
        current_break_reason: item.current_break_reason,
        break_start_time: item.break_start_time
      }));

      setBreakData(formattedData);
      calculateStats(formattedData);
    } catch (error) {
      console.error('Error loading break data:', error);
      toast.error('Failed to load break data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (data: BreakSession[]) => {
    const currentlyOnBreak = data.filter(item => item.is_on_break).length;
    const totalBreakTime = data.reduce((sum, item) => sum + item.total_break_minutes, 0);
    
    // Get all break sessions to find average duration and most common reason
    const allSessions = data.flatMap(item => item.break_sessions);
    const averageDuration = allSessions.length > 0 
      ? Math.round(allSessions.reduce((sum, session) => sum + session.duration_minutes, 0) / allSessions.length)
      : 0;

    // Find most common reason
    const reasonCounts = allSessions.reduce((acc, session) => {
      acc[session.reason] = (acc[session.reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommonReason = Object.keys(reasonCounts).length > 0 
      ? Object.keys(reasonCounts).reduce((a, b) => reasonCounts[a] > reasonCounts[b] ? a : b)
      : 'N/A';

    setStats({
      totalEmployeesOnBreak: currentlyOnBreak,
      totalBreakTimeToday: totalBreakTime,
      averageBreakDuration: averageDuration,
      mostCommonReason
    });
  };

  // Digital Solution Manager has access to everything
  if (user?.position === 'Digital Solution Manager') {
    // Continue to render the page
  } else if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-red-500 text-lg">Access Denied</div>
            <div className="text-gray-500">Only administrators can view break time data</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Break Time Management</h1>
            <p className="text-gray-600">Monitor employee break activities and patterns</p>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <Button onClick={loadBreakData} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Users className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.totalEmployeesOnBreak}</div>
                  <div className="text-sm text-gray-500">Currently on Break</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.totalBreakTimeToday}</div>
                  <div className="text-sm text-gray-500">Total Break Minutes</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.averageBreakDuration}</div>
                  <div className="text-sm text-gray-500">Avg Duration (mins)</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Coffee className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900 truncate">{stats.mostCommonReason}</div>
                  <div className="text-sm text-gray-500">Most Common Reason</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Break Sessions List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coffee className="h-5 w-5" />
              Employee Break Sessions
            </CardTitle>
            <CardDescription>
              Break activities for {format(new Date(dateFilter), 'EEEE, MMMM d, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading break data...</div>
            ) : breakData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No break activities found for this date
              </div>
            ) : (
              <div className="space-y-4">
                {breakData.map((session) => (
                  <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{session.userName}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Badge variant="outline">{session.department}</Badge>
                          <Badge variant="outline">{session.position}</Badge>
                          <span>Check-in: {format(new Date(session.timestamp), 'h:mm a')}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        {session.is_on_break && (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                            <Timer className="h-3 w-3 mr-1 animate-pulse" />
                            Currently on Break
                          </Badge>
                        )}
                        <div className="text-sm text-gray-600 mt-1">
                          Total Break Time: <span className="font-medium">{session.total_break_minutes} minutes</span>
                        </div>
                      </div>
                    </div>

                    {/* Current Break */}
                    {session.is_on_break && (
                      <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="flex items-center gap-2 mb-1">
                          <Timer className="h-4 w-4 text-yellow-600" />
                          <span className="font-medium text-yellow-700">Current Break</span>
                        </div>
                        <div className="text-sm text-yellow-600">
                          Started: {session.break_start_time ? format(new Date(session.break_start_time), 'h:mm a') : 'Unknown'}
                        </div>
                        {session.current_break_reason && (
                          <div className="text-sm text-yellow-600 mt-1">
                            Reason: {session.current_break_reason}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Break Sessions History */}
                    {session.break_sessions.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Break Sessions:</h4>
                        <div className="grid gap-2">
                          {session.break_sessions.map((breakSession, index) => (
                            <div key={index} className="bg-orange-50 border border-orange-200 rounded p-3 text-sm">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-medium text-orange-700">
                                  {format(new Date(breakSession.start_time), 'h:mm a')} - {format(new Date(breakSession.end_time), 'h:mm a')}
                                </span>
                                <Badge className="bg-orange-200 text-orange-800">
                                  {breakSession.duration_minutes}m
                                </Badge>
                              </div>
                              <div className="text-orange-600">
                                <strong>Reason:</strong> {breakSession.reason}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminBreakTimePage; 