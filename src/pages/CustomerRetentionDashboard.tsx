import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  CalendarDays,
  Trash2,
  Headphones,
  MessageSquare
} from 'lucide-react';

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

import { toast } from "sonner";
import { User, Task } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { 
  getCustomerRetentionTeamMembers, 
  getCustomerRetentionStats, 
  getCustomerRetentionShifts, 
  getCustomerRetentionTasks,
  populateCustomerRetentionData,
  getWooCommerceRetentionData,
  CustomerRetentionStats,
  CustomerRetentionTeamMember
} from '@/lib/customerRetentionApi';
import { getUserStatus } from '@/lib/chatUtils';

interface TeamStats {
  totalMembers: number;
  activeToday: number;
  onBreak: number;
  completedTasks: number;
  pendingTasks: number;
  totalRevenue: number;
  totalOrders: number;
  // Customer Retention specific stats
  totalTicketsToday: number;
  resolvedTicketsToday: number;
  averageSatisfactionScore: number;
  retentionRate: number;
}

const CustomerRetentionDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [teamMembers, setTeamMembers] = useState<CustomerRetentionTeamMember[]>([]);
  const [teamStats, setTeamStats] = useState<CustomerRetentionStats>({
    totalTeamMembers: 0,
    activeToday: 0,
    totalTicketsToday: 0,
    resolvedTicketsToday: 0,
    averageSatisfactionScore: 0,
    retentionRate: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

  // Translation object
  const translations = {
    en: {
      dashboard: "Customer Retention Department Dashboard",
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
      supportTickets: "Support Tickets",
      resolvedTickets: "Resolved Tickets",
      retentionRate: "Retention Rate",
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
      customerService: "Customer Service",
      customerRetentionManager: "Customer Retention Manager"
    },
    ar: {
      dashboard: "لوحة تحكم قسم الاحتفاظ بالعملاء",
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
      supportTickets: "تذاكر الدعم",
      resolvedTickets: "التذاكر المحلولة",
      retentionRate: "معدل الاحتفاظ",
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
      customerService: "خدمة العملاء",
      customerRetentionManager: "مدير الاحتفاظ بالعملاء"
    }
  };

  useEffect(() => {
    const storedLang = localStorage.getItem('preferredLanguage');
    if (storedLang && (storedLang === 'en' || storedLang === 'ar')) {
      setLanguage(storedLang);
    }
    loadDashboardData();
  }, []);

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

  // Digital Solution Manager has access to everything
  if (user.position === 'Digital Solution Manager') {
    // Continue to render the page
  } else if (user.role !== 'customer_retention_manager') {
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

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Try to get WooCommerce data first
      try {
        const wooCommerceData = await getWooCommerceRetentionData();
        if (wooCommerceData.retentionRate > 0 || wooCommerceData.averageSatisfactionScore > 0) {
          console.log('✅ Using WooCommerce data:', wooCommerceData);
          setTeamStats(prevStats => ({
            ...prevStats,
            averageSatisfactionScore: wooCommerceData.averageSatisfactionScore,
            retentionRate: wooCommerceData.retentionRate
          }));
        }
      } catch (wooError) {
        console.log('⚠️ WooCommerce not available, using fallback data');
      }
      
      // Load other data
      await Promise.all([
        loadTeamMembers(),
        loadTeamStats()
      ]);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const members = await getCustomerRetentionTeamMembers();
      setTeamMembers(members);
      
      // Fetch online status for team members from users table
      if (members.length > 0) {
        const { data: activityData } = await supabase
          .from('users')
          .select('id, last_seen')
          .in('id', members.map(m => m.id));
        
        console.log('👥 Customer Retention Team Members:', members.map(m => ({ id: m.id, name: m.name })));
        console.log('📊 Activity Data:', activityData);
        
        setOnlineUsers(activityData || []);
      }
    } catch (error) {
      console.error("Error loading team members:", error);
    }
  };

  const loadTeamStats = async () => {
    try {
      const stats = await getCustomerRetentionStats();
      setTeamStats(stats);
    } catch (error) {
      console.error("Error loading team stats:", error);
    }
  };

  const getPositionBadge = (position: string) => {
    const colorMap = {
      'Customer Service': 'bg-blue-100 text-blue-800',
      'Customer Retention Manager': 'bg-purple-100 text-purple-800',
      'Content & Creative Manager': 'bg-indigo-100 text-indigo-800',
      'IT Manager': 'bg-cyan-100 text-cyan-800',
      'Executive Director': 'bg-amber-100 text-amber-800',
      'General Manager': 'bg-amber-100 text-amber-800',
      'Warehouse Staff': 'bg-orange-100 text-orange-800'
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 w-full" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="border-b border-border/50 bg-background/98 w-full">
        <div className="safe-area-padding px-4 py-6 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                {t.dashboard}
              </h1>
                             <p className="text-sm text-muted-foreground">
                 Team Management Dashboard: Customer Service, Retention & Warehouse
               </p>
            </div>
          </div>
        </div>
      </div>

      <div className="safe-area-padding px-4 py-6 space-y-6 w-full">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t.totalMembers}</p>
                  <p className="text-2xl font-bold">{teamStats.totalTeamMembers}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
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
                  <p className="text-sm font-medium text-muted-foreground">{t.supportTickets}</p>
                  <p className="text-2xl font-bold text-blue-600">{teamStats.totalTicketsToday}</p>
                  <p className="text-xs text-muted-foreground">{teamStats.resolvedTicketsToday} resolved today</p>
                </div>
                <Headphones className="h-8 w-8 text-blue-600" />
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
                   Manage Customer Service & Warehouse Team Members
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

export default CustomerRetentionDashboard;
