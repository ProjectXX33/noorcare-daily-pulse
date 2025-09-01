import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ShoppingCart, 
  Users, 
  CheckSquare, 
  TrendingUp, 
  Calendar,
  Star,
  Clock,
  Building2,
  User,
  Crown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  name: string;
  email: string;
  position: string;
  team?: string;
  last_seen?: string;
  is_online?: boolean;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_to?: string;
  created_by: string;
  created_at: string;
  created_by_name?: string;
}

const EcommerceDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState({
    totalTeamMembers: 0,
    activeToday: 0,
    totalTasks: 0,
    myTasks: 0
  });
  const [loading, setLoading] = useState(true);

  // Check if user has the correct role
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Digital Solution Manager has access to everything
  if (user.position === 'Digital Solution Manager') {
    // Continue to render the page
  } else if (user.role !== 'ecommerce_manager') {
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load team members
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, position, team, last_seen')
        .or(`team.eq.E-commerce Department,position.eq.E-commerce Manager`);

      if (usersError) {
        console.error('Users query error:', usersError);
        throw usersError;
      }



      const processedUsers = users?.map(user => ({
        ...user,
        is_online: user.last_seen ? new Date(user.last_seen) > new Date(Date.now() - 5 * 60 * 1000) : false
      })) || [];

      setTeamMembers(processedUsers);

      // Load tasks - Filter for E-commerce team only
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id, title, description, status, priority, assigned_to, created_by, created_at,
          created_by_user:users!created_by(name),
          assigned_to_user:users!assigned_to(team, position)
        `)
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (tasksError) {
        console.error('Tasks query error:', tasksError);
        throw tasksError;
      }

      const processedTasks = tasksData?.map((task: any) => ({
        ...task,
        created_by_name: task.created_by_user?.name || 'Unknown'
      })) || [];
      setTasks(processedTasks);

      // Calculate stats
      const myTasks = processedTasks.filter(task => task.assigned_to === user.id).length;
      
      setStats({
        totalTeamMembers: processedUsers.length,
        activeToday: processedUsers.filter(u => u.is_online).length,
        totalTasks: processedTasks.length,
        myTasks
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complete': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'In Progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'On Hold': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'Not Started': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg">Loading E-commerce Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {language === 'ar' ? 'لوحة تحكم التجارة الإلكترونية' : 'E-commerce Dashboard'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {language === 'ar' ? 'إدارة عمليات التجارة الإلكترونية والمنتجات' : 'Manage e-commerce operations and products'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-8 w-8 text-green-600" />
          <Badge variant="outline" className="text-green-600 border-green-600">
            {language === 'ar' ? 'مدير التجارة الإلكترونية' : 'E-commerce Manager'}
          </Badge>
        </div>
      </div>

             {/* Stats Cards */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'إجمالي أعضاء الفريق' : 'Total Team Members'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeamMembers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'ar' ? 'نشط اليوم' : 'Active Today'}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeToday}</div>
          </CardContent>
        </Card>



                 <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">
               {language === 'ar' ? 'مهامي' : 'My Tasks'}
             </CardTitle>
             <User className="h-4 w-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold">{stats.myTasks}</div>
           </CardContent>
         </Card>
      </div>

             {/* Main Content Tabs */}
       <Tabs defaultValue="overview" className="space-y-4">
         <TabsList className="grid w-full grid-cols-2">
           <TabsTrigger value="overview">
             {language === 'ar' ? 'نظرة عامة' : 'Overview'}
           </TabsTrigger>
           <TabsTrigger value="tasks">
             {language === 'ar' ? 'المهام' : 'Tasks'}
           </TabsTrigger>
         </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {language === 'ar' ? 'فريق التجارة الإلكترونية' : 'E-commerce Team'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 'أعضاء فريق التجارة الإلكترونية' : 'E-commerce Department team members'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {teamMembers.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {language === 'ar' ? 'لا يوجد أعضاء في الفريق حالياً' : 'No team members found'}
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="relative">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        {member.is_online && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-gray-500">{member.position}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                {language === 'ar' ? 'مهامي' : 'My Tasks'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' ? 'المهام المخصصة لي' : 'Tasks assigned to me'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.filter(task => task.assigned_to === user.id).length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {language === 'ar' ? 'لا توجد مهام مخصصة لك' : 'No tasks assigned to you'}
                </p>
              ) : (
                <div className="space-y-4">
                  {tasks
                    .filter(task => task.assigned_to === user.id)
                    .map((task) => (
                      <div key={task.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium">{task.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className={getStatusColor(task.status)}>
                                {task.status}
                              </Badge>
                              <Badge className={getPriorityColor(task.priority)}>
                                {task.priority}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        
      </Tabs>
    </div>
  );
};

export default EcommerceDashboard;
