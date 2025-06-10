import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  Calendar,
  Users,
  Clock,
  TrendingUp,
  Download,
  FileText,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  RefreshCw
} from 'lucide-react';
import { CheckIn, WorkReport, User } from '@/types';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import ExportManager from './ExportManager';

interface AnalyticsDashboardProps {
  checkIns: CheckIn[];
  workReports: WorkReport[];
  users: User[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ 
  checkIns, 
  workReports, 
  users 
}) => {
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter'>('month');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [analyticsData, setAnalyticsData] = useState<any>({});
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    calculateAnalytics();
  }, [checkIns, workReports, users, dateRange, selectedDepartment]);

  // Realtime updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      calculateAnalytics();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [checkIns, workReports, users, dateRange, selectedDepartment]);

  const calculateAnalytics = () => {
    const now = new Date();
    setLastUpdated(now); // Update the last updated timestamp
    let startDate: Date;
    let endDate: Date = now;

    switch (dateRange) {
      case 'week':
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'quarter':
        startDate = subDays(now, 90);
        break;
      default:
        startDate = startOfMonth(now);
    }

    // Filter data by date range and department - EXCLUDE ADMIN USERS
    const nonAdminUsers = users.filter(user => user.role !== 'admin');
    const filteredUsers = selectedDepartment === 'all' 
      ? nonAdminUsers 
      : nonAdminUsers.filter(user => user.department === selectedDepartment);

    const filteredCheckIns = checkIns.filter(checkIn => {
      const checkInDate = new Date(checkIn.timestamp);
      const userInDept = selectedDepartment === 'all' || 
        filteredUsers.some(user => user.id === checkIn.userId);
      const isNonAdminUser = filteredUsers.some(user => user.id === checkIn.userId);
      return checkInDate >= startDate && checkInDate <= endDate && userInDept && isNonAdminUser;
    });

    const filteredReports = workReports.filter(report => {
      const reportDate = new Date(report.date);
      const userInDept = selectedDepartment === 'all' || 
        filteredUsers.some(user => user.id === report.userId);
      const isNonAdminUser = filteredUsers.some(user => user.id === report.userId);
      return reportDate >= startDate && reportDate <= endDate && userInDept && isNonAdminUser;
    });

    // Daily attendance data
    const dailyAttendance = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayCheckIns = filteredCheckIns.filter(checkIn => 
        new Date(checkIn.timestamp).toDateString() === d.toDateString()
      );
      dailyAttendance.push({
        date: format(d, 'MMM dd'),
        checkIns: dayCheckIns.length,
        uniqueUsers: new Set(dayCheckIns.map(c => c.userId)).size
      });
    }

    // Department distribution - EXCLUDE ADMIN USERS
    const departmentStats = nonAdminUsers.reduce((acc, user) => {
      acc[user.department] = (acc[user.department] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const departmentData = Object.entries(departmentStats).map(([dept, count]) => ({
      name: dept,
      value: count,
      percentage: ((count / nonAdminUsers.length) * 100).toFixed(1)
    }));

    // Position distribution - EXCLUDE ADMIN USERS
    const positionStats = nonAdminUsers.reduce((acc, user) => {
      acc[user.position] = (acc[user.position] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const positionData = Object.entries(positionStats).map(([position, count]) => ({
      name: position,
      value: count
    }));

    // Weekly performance trends
    const weeklyData = [];
    for (let week = 0; week < 4; week++) {
      const weekStart = subDays(endDate, (3 - week) * 7);
      const weekEnd = subDays(endDate, (2 - week) * 7);
      
      const weekCheckIns = filteredCheckIns.filter(checkIn => {
        const date = new Date(checkIn.timestamp);
        return date >= weekStart && date <= weekEnd;
      });
      
      const weekReports = filteredReports.filter(report => {
        const date = new Date(report.date);
        return date >= weekStart && date <= weekEnd;
      });

      weeklyData.push({
        week: `Week ${week + 1}`,
        checkIns: weekCheckIns.length,
        reports: weekReports.length,
        activeUsers: new Set([
          ...weekCheckIns.map(c => c.userId),
          ...weekReports.map(r => r.userId)
        ]).size
      });
    }

    // Calculate work hours and overtime - Group by date and aggregate
    const workHoursMap = new Map<string, { regularHours: number; overtimeHours: number; totalHours: number; sessions: number }>();
    
    filteredCheckIns
      .filter(checkIn => checkIn.checkOutTime)
      .forEach(checkIn => {
        const checkInTime = new Date(checkIn.timestamp);
        const checkOutTime = new Date(checkIn.checkOutTime!);
        const dateKey = format(checkInTime, 'MMM dd');
        const hoursWorked = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
        
        // Ensure we have positive hours
        if (hoursWorked > 0) {
          const regularHours = Math.min(hoursWorked, 8);
          const overtimeHours = Math.max(hoursWorked - 8, 0);
          
          const existing = workHoursMap.get(dateKey) || { regularHours: 0, overtimeHours: 0, totalHours: 0, sessions: 0 };
          workHoursMap.set(dateKey, {
            regularHours: existing.regularHours + regularHours,
            overtimeHours: existing.overtimeHours + overtimeHours,
            totalHours: existing.totalHours + hoursWorked,
            sessions: existing.sessions + 1
          });
        }
      });
    
    const workHoursData = Array.from(workHoursMap.entries())
      .map(([date, hours]) => ({
        date,
        regularHours: Number(hours.regularHours.toFixed(1)),
        overtimeHours: Number(hours.overtimeHours.toFixed(1)),
        totalHours: Number(hours.totalHours.toFixed(1)),
        sessions: hours.sessions
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate comprehensive performance score
    const attendanceRate = filteredUsers.length > 0 
      ? (new Set(filteredCheckIns.map(c => c.userId)).size / filteredUsers.length) * 100 
      : 0;
    
    const reportSubmissionRate = filteredUsers.length > 0 
      ? (filteredReports.length / filteredUsers.length) * 100 
      : 0;
    
    // Combined performance score (40% attendance, 60% reports)
    const overallPerformanceScore = (attendanceRate * 0.4) + (reportSubmissionRate * 0.6);

    setAnalyticsData({
      dailyAttendance,
      departmentData,
      positionData,
      weeklyData,
      workHoursData,
      totalUsers: filteredUsers.length,
      totalCheckIns: filteredCheckIns.length,
      totalReports: filteredReports.length,
      averageCheckInsPerDay: (filteredCheckIns.length / Math.max(dailyAttendance.length, 1)).toFixed(1),
      reportSubmissionRate: reportSubmissionRate.toFixed(1),
      attendanceRate: attendanceRate.toFixed(1),
      overallPerformanceScore: overallPerformanceScore.toFixed(1),
      uniqueCheckInUsers: new Set(filteredCheckIns.map(c => c.userId)).size
    });
  };

  const getDepartments = () => {
    const nonAdminUsers = users.filter(user => user.role !== 'admin');
    const departments = [...new Set(nonAdminUsers.map(user => user.department))];
    return departments;
  };

  return (
    <div className="analytics-dashboard min-h-screen bg-white">
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 pb-8 sm:pb-12">
        {/* Header with filters and export */}
        <div className="flex flex-col gap-4 bg-white/80 backdrop-blur-sm rounded-lg p-4 sm:p-6 shadow-sm border">
        <div className="text-center sm:text-left">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center justify-center sm:justify-start gap-2">
            Analytics Dashboard
            <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 animate-spin" />
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Comprehensive insights into your organization's performance
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()} • Auto-refreshing every 30s
          </p>
        </div>
        
        {/* Mobile-optimized filters */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {getDepartments().map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="w-full">
              <ExportManager 
                data={{
                  checkIns,
                  workReports,
                  users,
                  analytics: analyticsData
                }}
                dateRange={dateRange}
                department={selectedDepartment}
              />
            </div>
          </div>
        </div>
        </div>

        {/* Key Metrics Cards - Mobile Optimized */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{analyticsData.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Active employees
            </p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check-ins</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{analyticsData.totalCheckIns}</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.uniqueCheckInUsers}/{analyticsData.totalUsers} employees checked in
            </p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-xl sm:text-2xl font-bold ${
              analyticsData.attendanceRate >= 80 ? 'text-green-600' :
              analyticsData.attendanceRate >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {analyticsData.attendanceRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Employee attendance rate
            </p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{analyticsData.totalReports}</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.reportSubmissionRate}% submission rate
            </p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-xl sm:text-2xl font-bold ${
              analyticsData.overallPerformanceScore >= 80 ? 'text-green-600' :
              analyticsData.overallPerformanceScore >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {analyticsData.overallPerformanceScore >= 80 ? 'Excellent' : 
               analyticsData.overallPerformanceScore >= 60 ? 'Good' : 
               analyticsData.overallPerformanceScore >= 40 ? 'Needs Improvement' : 'Poor'}
            </div>
            <p className="text-xs text-muted-foreground break-words">
              {analyticsData.attendanceRate}% attendance, {analyticsData.reportSubmissionRate}% reports
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Tabs - Mobile Optimized */}
      <Tabs defaultValue="attendance" className="tabs-container space-y-4">
        <TabsList className="tabs-list grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="attendance" className="text-xs sm:text-sm px-2 py-2">
            <span className="hidden sm:inline">Attendance</span>
            <span className="sm:hidden">Attend.</span>
          </TabsTrigger>
          <TabsTrigger value="distribution" className="text-xs sm:text-sm px-2 py-2">
            <span className="hidden sm:inline">Distribution</span>
            <span className="sm:hidden">Distrib.</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="text-xs sm:text-sm px-2 py-2">
            <span className="hidden sm:inline">Performance</span>
            <span className="sm:hidden">Perform.</span>
          </TabsTrigger>
          <TabsTrigger value="hours" className="text-xs sm:text-sm px-2 py-2">
            <span className="hidden sm:inline">Work Hours</span>
            <span className="sm:hidden">Hours</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="attendance" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Daily Attendance Trend</CardTitle>
                <CardDescription className="text-sm">Check-ins and unique users per day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={analyticsData.dailyAttendance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="uniqueUsers" 
                      stackId="1"
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      name="Unique Users"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="checkIns" 
                      stackId="1"
                      stroke="#82ca9d" 
                      fill="#82ca9d" 
                      name="Total Check-ins"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Weekly Performance</CardTitle>
                <CardDescription className="text-sm">Check-ins vs Reports over weeks</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={analyticsData.weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="checkIns" 
                      stroke="#8884d8" 
                      name="Check-ins"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="reports" 
                      stroke="#82ca9d" 
                      name="Reports"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="activeUsers" 
                      stroke="#ffc658" 
                      name="Active Users"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="distribution" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Department Distribution</CardTitle>
                <CardDescription className="text-sm">Employee distribution across departments</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={analyticsData.departmentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({name, percentage}) => `${name}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analyticsData.departmentData?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Position Breakdown</CardTitle>
                <CardDescription className="text-sm">Employee count by position</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analyticsData.positionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Performance Metrics</CardTitle>
              <CardDescription className="text-sm">Key performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {analyticsData.averageCheckInsPerDay}
                  </div>
                  <p className="text-sm text-muted-foreground">Avg Check-ins/Day</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analyticsData.reportSubmissionRate}%
                  </div>
                  <p className="text-sm text-muted-foreground">Report Submission Rate</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {analyticsData.totalUsers}
                  </div>
                  <p className="text-sm text-muted-foreground">Active Employees</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="hours" className="space-y-4">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3 mb-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Regular Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-green-600">
                  {analyticsData.workHoursData?.reduce((sum: number, day: any) => sum + day.regularHours, 0)?.toFixed(1) || '0'}h
                </div>
                <p className="text-xs text-muted-foreground">
                  Standard working hours
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Overtime</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-orange-600">
                  {analyticsData.workHoursData?.reduce((sum: number, day: any) => sum + day.overtimeHours, 0)?.toFixed(1) || '0'}h
                </div>
                <p className="text-xs text-muted-foreground">
                  Extra hours worked
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Work Sessions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-blue-600">
                  {analyticsData.workHoursData?.reduce((sum: number, day: any) => sum + (day.sessions || 0), 0) || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Completed check-in sessions
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Daily Work Hours Breakdown</CardTitle>
              <CardDescription className="text-sm">Regular hours vs overtime tracking with session count</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.workHoursData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-2 sm:p-3 border rounded-lg shadow-lg text-xs sm:text-sm">
                            <p className="font-medium text-sm sm:text-base">{label}</p>
                            <p className="text-green-600">Regular: {data.regularHours}h</p>
                            <p className="text-orange-600">Overtime: {data.overtimeHours}h</p>
                            <p className="text-blue-600">Total: {data.totalHours}h</p>
                            <p className="text-gray-600">Sessions: {data.sessions}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="regularHours" stackId="a" fill="#22c55e" name="Regular Hours" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="overtimeHours" stackId="a" fill="#f97316" name="Overtime Hours" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          {analyticsData.workHoursData?.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
                <Clock className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-muted-foreground mb-2">No Work Hours Data</h3>
                <p className="text-xs sm:text-sm text-muted-foreground text-center max-w-md px-4">
                  No completed check-in/check-out sessions found for the selected period. 
                  Work hours will appear here once employees complete their shifts.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
};

export default AnalyticsDashboard; 