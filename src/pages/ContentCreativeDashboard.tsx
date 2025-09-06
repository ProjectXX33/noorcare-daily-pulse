import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { 
  Users, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  Target,
  ShoppingCart,
  Plus,
  Edit,
  Star,
  CalendarDays,
  Trash2
} from 'lucide-react';
import { toast } from "sonner";
import { User, Task } from '@/types';
import { getTeamMembers } from '@/lib/teamsApi';
import { fetchEmployees } from '@/lib/employeesApi';
import { supabase } from '@/integrations/supabase/client';
import { 
  getContentCreativeTeamMembers, 
  getContentCreativeStats, 
  getContentCreativeShifts, 
  getContentCreativeTasks,
  getContentCreativePerformance,
  ContentCreativeStats,
  TeamShiftData,
  TeamPerformanceData
} from '@/lib/contentCreativeApi';
import { getUserStatus } from '@/lib/chatUtils';

// Riyal SVG Icon Component
const RiyalIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 1124.14 1256.39" 
    width="14" 
    height="15.432" 
    style={{display: 'inline-block', verticalAlign: '-0.125em'}}
  >
    <path fill="currentColor" d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
    <path fill="currentColor" d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
  </svg>
);

interface TeamStats {
  totalMembers: number;
  activeToday: number;
  onBreak: number;
  completedTasks: number;
  pendingTasks: number;
  totalRevenue: number;
  totalOrders: number;
  completedOrders?: number;
  processingOrders?: number;
  pendingOrders?: number;
  orderStatusBreakdown?: {
    completed: number;
    processing: number;
    pending: number;
    total: number;
  };
}

interface ShiftData {
  id: string;
  userId: string;
  userName: string;
  position: string;
  checkInTime?: Date;
  checkOutTime?: Date;
  regularHours: number;
  overtimeHours: number;
  status: 'not_started' | 'in_progress' | 'on_break' | 'completed';
}

const ContentCreativeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [teamStats, setTeamStats] = useState<ContentCreativeStats>({
    totalMembers: 0,
    activeToday: 0,
    completedTasks: 0,
    pendingTasks: 0,
    totalRevenue: 0,
    totalOrders: 0
  });
  const [shifts, setShifts] = useState<TeamShiftData[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('current'); // 'current', 'previous', or specific month

  // Helper function to get date range for selected month
  const getDateRange = (monthFilter: string) => {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();

    if (monthFilter === 'previous') {
      month -= 1;
      if (month < 0) {
        month = 11;
        year -= 1;
      }
    } else if (monthFilter !== 'current') {
      // Specific month format: 'YYYY-MM'
      const [specificYear, specificMonth] = monthFilter.split('-').map(Number);
      year = specificYear;
      month = specificMonth - 1; // JavaScript months are 0-indexed
    }

    // First day of the month (always day 1)
    const firstDay = new Date(year, month, 1);
    
    // Last day of the month - automatically handles 28/29/30/31 days
    // new Date(year, month + 1, 0) gives us the last day of the current month
    const lastDay = new Date(year, month + 1, 0);
    
    // Get the day number to verify we have the complete month
    const daysInMonth = lastDay.getDate();
    
    const dateRange = {
      from: firstDay.toISOString().split('T')[0],
      to: lastDay.toISOString().split('T')[0],
      monthName: firstDay.toLocaleString('default', { month: 'long', year: 'numeric' }),
      daysInMonth: daysInMonth
    };
    
    // Log to verify we're getting the complete month
    console.log('📅 Date Range Calculation:', {
      monthFilter,
      year,
      month: month + 1, // Display as 1-12 for clarity
      monthName: dateRange.monthName,
      from: dateRange.from,
      to: dateRange.to,
      daysInMonth: daysInMonth,
      isComplete: `Month has ${daysInMonth} days - from day 1 to day ${daysInMonth}`
    });
    
    // Verify the date range includes complete month
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    
    console.log('📅 Date Range Verification:', {
      fromDay: fromDate.getDate(), // Should always be 1
      toDay: toDate.getDate(), // Should be the last day of month
      fromMonth: fromDate.getMonth() + 1,
      toMonth: toDate.getMonth() + 1,
      isFirstDayOfMonth: fromDate.getDate() === 1,
      isLastDayOfMonth: toDate.getDate() === daysInMonth,
      rangeIsValid: fromDate.getDate() === 1 && toDate.getDate() === daysInMonth
    });
    
    return dateRange;
  };

  // Test function to verify month calculations (runs once on component mount)
  const testMonthCalculations = () => {
    console.log('🧪 Testing Month Length Calculations:');
    
    const testMonths = [
      '2024-02', // February 2024 (29 days - leap year)
      '2025-02', // February 2025 (28 days - non-leap year)
      '2025-04', // April 2025 (30 days)
      '2025-01', // January 2025 (31 days)
      '2025-06', // June 2025 (30 days)
      '2025-12'  // December 2025 (31 days)
    ];
    
    testMonths.forEach(month => {
      const range = getDateRange(month);
      console.log(`  ${month}: ${range.from} to ${range.to} (${range.daysInMonth} days)`);
    });
  };

  // Translation object
  const translations = {
    en: {
      dashboard: "Content & Creative Department Dashboard",
      overview: "Team Overview",
      members: "Team Members",
      shifts: "Shift Management",
      tasks: "Task Management", 
      revenue: "Revenue Overview",
      totalMembers: "Total Members",
      activeToday: "Active Today",
      onBreak: "On Break",
      completedTasks: "Completed Tasks",
      pendingTasks: "Pending Tasks",
      totalRevenue: "Total Revenue",
      totalOrders: "Total Orders",
      name: "Name",
      position: "Position",
      checkIn: "Check In",
      checkOut: "Check Out",
      hours: "Hours",
      overtime: "Overtime",
      actions: "Actions",
      assignTask: "Assign Task",
      viewPerformance: "View Performance",
      manageShift: "Manage Shift",
      copyWriting: "Content Creator",
      designer: "Designer",
      mediaBuyer: "Media Buyer"
    },
    ar: {
      dashboard: "لوحة تحكم قسم المحتوى والإبداع",
      overview: "نظرة عامة على الفريق",
      members: "أعضاء الفريق",
      shifts: "إدارة المناوبات",
      tasks: "إدارة المهام",
      revenue: "نظرة عامة على الإيرادات",
      totalMembers: "إجمالي الأعضاء",
      activeToday: "نشط اليوم",
      onBreak: "في استراحة",
      completedTasks: "المهام المكتملة",
      pendingTasks: "المهام المعلقة",
      totalRevenue: "إجمالي الإيرادات",
      totalOrders: "إجمالي الطلبات",
      name: "الاسم",
      position: "المنصب",
      checkIn: "تسجيل الدخول",
      checkOut: "تسجيل الخروج",
      hours: "الساعات",
      overtime: "العمل الإضافي",
      actions: "الإجراءات",
      assignTask: "تعيين مهمة",
      viewPerformance: "عرض الأداء",
      manageShift: "إدارة المناوبة",
      copyWriting: "مبدع المحتوى",
      designer: "مصمم",
      mediaBuyer: "مشتري الإعلانات"
    }
  };

  // Function definitions - moved before useEffect
  const loadTeamMembers = async () => {
    try {
      console.log('🚀 Starting to load team members...');
      const members = await getContentCreativeTeamMembers();
      console.log('👥 Team members received:', members.length, members.map(m => ({ name: m.name, position: m.position })));
      setTeamMembers(members);
      
      // Fetch online status for team members from users table
      if (members.length > 0) {
        const { data: activityData } = await supabase
          .from('users')
          .select('id, last_seen')
          .in('id', members.map(m => m.id));
        
        console.log('👥 Team Members:', members.map(m => ({ id: m.id, name: m.name })));
        console.log('📊 Activity Data:', activityData);
        
        setOnlineUsers(activityData || []);
      }
    } catch (error) {
      console.error("❌ Error loading team members:", error);
    }
  };

  const loadTeamStats = async () => {
    try {
      console.log('🚀 Starting to load team stats...');
      const dateRange = getDateRange(selectedMonth);
      console.log('📅 Using date range:', dateRange);
      
      const stats = await getContentCreativeStats({
        from: dateRange.from,
        to: dateRange.to,
        monthFilter: selectedMonth // Pass the month filter like Warehouse Dashboard
      });
      console.log('📊 Received stats:', stats);
      setTeamStats(stats);
      console.log('✅ Team stats set successfully');
    } catch (error) {
      console.error("❌ Error loading team stats:", error);
      setTeamStats({
        totalMembers: 0,
        activeToday: 0,
        completedTasks: 0,
        pendingTasks: 0,
        totalRevenue: 0,
        totalOrders: 0
      });
    }
  };

  const loadShifts = async () => {
    try {
      const shiftData = await getContentCreativeShifts();
      setShifts(shiftData);
    } catch (error) {
      console.error("Error loading shifts:", error);
    }
  };

  const loadTasks = async () => {
    try {
      const taskData = await getContentCreativeTasks();
      setTasks(taskData);
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  };

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadTeamMembers(),
        loadTeamStats(),
        loadShifts(),
        loadTasks()
      ]);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const getPositionBadge = (position: string) => {
    const colorMap = {
      'Content Creator': 'bg-purple-100 text-purple-800',
      'Designer': 'bg-blue-100 text-blue-800', 
      'Media Buyer': 'bg-green-100 text-green-800',
      'Content & Creative Manager': 'bg-indigo-100 text-indigo-800',
      'Customer Retention Manager': 'bg-emerald-100 text-emerald-800',
      'IT Manager': 'bg-cyan-100 text-cyan-800',
      'Executive Director': 'bg-amber-100 text-amber-800',
      'General Manager': 'bg-amber-100 text-amber-800'
    };
    
    return (
      <Badge className={colorMap[position as keyof typeof colorMap] || 'bg-gray-100 text-gray-800'}>
        {position}
      </Badge>
    );
  };

  const getStatusBadge = (lastSeen: string) => {
    const { isOnline, statusText } = getUserStatus(lastSeen);
    
    // Debug logging
    console.log(`🕐 Status check - Last seen: ${lastSeen}, Online: ${isOnline}, Status: ${statusText}`);
    
    // Additional check: if lastSeen is more than 10 minutes ago, definitely offline
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
    const isActuallyOnline = diffMinutes < 5; // More strict: only 5 minutes
    
    return (
      <Badge className={isActuallyOnline ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${isActuallyOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
          {isActuallyOnline ? 'Online' : statusText}
        </div>
      </Badge>
    );
  };

  // useEffect hooks
  useEffect(() => {
    const storedLang = localStorage.getItem('preferredLanguage');
    if (storedLang && (storedLang === 'en' || storedLang === 'ar')) {
      setLanguage(storedLang);
    }
    
    // Test month calculations to verify complete month ranges
    testMonthCalculations();
    
    loadDashboardData();
  }, []);

  // Reload stats when month filter changes
  useEffect(() => {
    if (selectedMonth) {
      loadTeamStats();
    }
  }, [selectedMonth]);

  const t = translations[language as keyof typeof translations];

  // Check if user has access to this dashboard
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              You don't have permission to access this dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Digital Solution Manager and General Manager have access to everything
  if (user.position === 'Digital Solution Manager' || user.position === 'General Manager') {
    // Continue to render the page
  } else if (user.role !== 'content_creative_manager' && user.position !== 'Content Creator') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              You don't have permission to access this dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 w-full" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold">{t.dashboard}</h1>
          <p className="mt-2 text-purple-100">
            Manage Content Creator, Designers, and Media Buyers
          </p>
        </div>

        {/* Month Filter */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Revenue Overview</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Filter by Month:</label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current Month</SelectItem>
                <SelectItem value="previous">Previous Month</SelectItem>
                <SelectItem value="2025-01">January 2025</SelectItem>
                <SelectItem value="2025-02">February 2025</SelectItem>
                <SelectItem value="2025-03">March 2025</SelectItem>
                <SelectItem value="2025-04">April 2025</SelectItem>
                <SelectItem value="2025-05">May 2025</SelectItem>
                <SelectItem value="2025-06">June 2025</SelectItem>
                <SelectItem value="2025-07">July 2025</SelectItem>
                <SelectItem value="2025-08">August 2025</SelectItem>
                <SelectItem value="2025-09">September 2025</SelectItem>
                <SelectItem value="2025-10">October 2025</SelectItem>
                <SelectItem value="2025-11">November 2025</SelectItem>
                <SelectItem value="2025-12">December 2025</SelectItem>
                <SelectItem value="2024-01">January 2024</SelectItem>
                <SelectItem value="2024-02">February 2024</SelectItem>
                <SelectItem value="2024-03">March 2024</SelectItem>
                <SelectItem value="2024-04">April 2024</SelectItem>
                <SelectItem value="2024-05">May 2024</SelectItem>
                <SelectItem value="2024-06">June 2024</SelectItem>
                <SelectItem value="2024-07">July 2024</SelectItem>
                <SelectItem value="2024-08">August 2024</SelectItem>
                <SelectItem value="2024-09">September 2024</SelectItem>
                <SelectItem value="2024-10">October 2024</SelectItem>
                <SelectItem value="2024-11">November 2024</SelectItem>
                <SelectItem value="2024-12">December 2024</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t.totalMembers}</p>
                  <p className="text-2xl font-bold">{teamStats.totalMembers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t.activeToday}</p>
                  <p className="text-2xl font-bold text-green-600">{teamStats.activeToday}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Completed Orders ({getDateRange(selectedMonth).monthName})
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {teamStats.totalOrders.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Delivered + completed orders (like Warehouse)</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Completed Revenue ({getDateRange(selectedMonth).monthName})
                  </p>
                  <p className="text-2xl font-bold text-purple-600">
                    <RiyalIcon className="inline mr-1" />{teamStats.totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Revenue from delivered + completed orders</p>
                </div>
                <RiyalIcon className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="overview">{t.overview}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t.members}
                </CardTitle>
                <CardDescription>
                  Manage Content Creator, Designers, and Media Buyers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.name}</TableHead>
                        <TableHead>{t.position}</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">{t.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamMembers.map((member) => {
                        const userActivity = onlineUsers.find(activity => activity.id === member.id);
                        const lastSeen = userActivity?.last_seen || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago as fallback
                        
                        return (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium">{member.name}</TableCell>
                            <TableCell>{getPositionBadge(member.position)}</TableCell>
                            <TableCell>{getStatusBadge(lastSeen)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => navigate('/admin-shift-management')}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  {t.manageShift}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => navigate('/tasks')}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  {t.assignTask}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ContentCreativeDashboard;
