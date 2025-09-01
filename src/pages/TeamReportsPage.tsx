import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  TrendingUp, 
  Clock, 
  Star, 
  BarChart3, 
  Calendar,
  Target,
  Award,
  CheckSquare,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { fetchEmployees } from '@/lib/employeesApi';
import { fetchTasks } from '@/lib/tasksApi';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TeamMember {
  id: string;
  name: string;
  position: string;
  team: string;
  tasksCompleted: number;
  tasksInProgress: number;
  averageRating: number;
  totalCheckIns: number;
  hoursWorked: number;
  productivity: number;
}

interface TeamStats {
  totalMembers: number;
  activeToday: number;
  completedTasks: number;
  pendingTasks: number;
  averageTeamRating: number;
  totalRevenue: number;
}

const TeamReportsPage = () => {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats>({
    totalMembers: 0,
    activeToday: 0,
    completedTasks: 0,
    pendingTasks: 0,
    averageTeamRating: 0,
    totalRevenue: 0
  });
  const [dailyReports, setDailyReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const reportsPerPage = 5;

  useEffect(() => {
    if (user?.role === 'content_creative_manager') {
      loadTeamReports();
    }
  }, [user]);



  const exportToCSV = () => {
    // Export team performance data instead of just reports
    const csvData = teamMembers.map(member => {
      return {
        'اسم الموظف': member.name,
        'المنصب': member.position,
        'المهام المنجزة': member.tasksCompleted,
        'المهام قيد التنفيذ': member.tasksInProgress,
        'ساعات العمل': `${member.hoursWorked}h`,
        'متوسط التقييم': member.averageRating,
        'الإنتاجية': `${member.productivity}%`
      };
    });
    
    // Add BOM for Arabic support
    const BOM = '\uFEFF';
    const csvContent = BOM + [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).map(value => `"${value}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `أداء_الفريق_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('تم تصدير بيانات الأداء بنجاح!');
  };

  const loadTeamReports = async () => {
    setIsLoading(true);
    try {
      console.log('📊 Loading Content & Creative Team Reports...');
      
      // Fetch employees
      const employeesData = await fetchEmployees();
      
             // Filter Content & Creative team members (exclude managers)
       const teamEmployees = employeesData.filter(emp => 
         (emp.team === 'Content & Creative Department' || 
         ['Content Creator', 'Designer', 'Media Buyer'].includes(emp.position)) &&
         !['Executive Director', 'General Manager', 'Content & Creative Manager'].includes(emp.position)
       );
      
      console.log('👥 Team Members Found:', teamEmployees.length);
      
             // Fetch tasks
       const tasksData = await fetchTasks();
      
             // Calculate member statistics
       const memberStats = await Promise.all(
         teamEmployees.map(async (employee) => {
           // Get tasks for this employee
           const employeeTasks = tasksData.filter(task => task.assignedTo === employee.id);
           const completedTasks = employeeTasks.filter(task => task.status === 'Complete').length;
           const inProgressTasks = employeeTasks.filter(task => task.status === 'In Progress').length;
           
                       // Get average rating
            const { data: ratings } = await supabase
              .from('task_ratings')
              .select('rating')
              .in('task_id', employeeTasks.map(t => t.id));
            
            const averageRating = ratings && ratings.length > 0 
              ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
              : 0;
           
           // Get real hours worked from monthly_shifts
           const { data: shiftData } = await supabase
             .from('monthly_shifts')
             .select('regular_hours, overtime_hours')
             .eq('user_id', employee.id)
             .gte('work_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
           
           const hoursWorked = shiftData?.reduce((sum, shift) => 
             sum + (shift.regular_hours || 0) + (shift.overtime_hours || 0), 0
           ) || 0;
           
           // Calculate productivity (tasks completed per hour worked)
           const productivity = hoursWorked > 0 ? (completedTasks / hoursWorked) * 100 : 0;
           
                       return {
              id: employee.id,
              name: employee.name,
              position: employee.position,
              team: employee.team || 'Content & Creative Department',
              tasksCompleted: completedTasks,
              tasksInProgress: inProgressTasks,
              averageRating: Math.round(averageRating * 10) / 10,
              totalCheckIns: 0, // Removed online status logic
              hoursWorked: Math.round(hoursWorked * 100) / 100,
              productivity: Math.round(productivity * 10) / 10
            };
         })
       );
      
      // Calculate team statistics
      const stats: TeamStats = {
        totalMembers: memberStats.length,
        activeToday: memberStats.filter(m => m.totalCheckIns > 0).length,
        completedTasks: memberStats.reduce((sum, m) => sum + m.tasksCompleted, 0),
        pendingTasks: memberStats.reduce((sum, m) => sum + m.tasksInProgress, 0),
        averageTeamRating: memberStats.length > 0 
          ? Math.round((memberStats.reduce((sum, m) => sum + m.averageRating, 0) / memberStats.length) * 10) / 10
          : 0,
        totalRevenue: 0 // Will be calculated separately
      };
      
      // Fetch daily reports for team members
      const { data: reportsData, error: reportsError } = await supabase
        .from('work_reports')
        .select('*')
        .in('user_id', teamEmployees.map(emp => emp.id))
        .order('date', { ascending: false })
        .limit(50);
      
      if (reportsError) {
        console.error('❌ Error fetching work reports:', reportsError);
      } else {
        console.log('📋 Work Reports Found:', reportsData?.length || 0);
        console.log('👥 Team Member IDs:', teamEmployees.map(emp => emp.id));
        console.log('📄 Sample Report:', reportsData?.[0]);
      }
      
      setDailyReports(reportsData || []);
      
      setTeamMembers(memberStats);
      setTeamStats(stats);
      
      console.log('✅ Team Reports Loaded:', stats);
      
    } catch (error) {
      console.error('❌ Error loading team reports:', error);
      toast.error('Failed to load team reports');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter reports by selected member
  const filteredReports = selectedMember === 'all' 
    ? dailyReports 
    : dailyReports.filter(report => report.user_id === selectedMember);

  // Pagination logic
  const totalPages = Math.ceil(filteredReports.length / reportsPerPage);
  const startIndex = (currentPage - 1) * reportsPerPage;
  const endIndex = startIndex + reportsPerPage;
  const currentReports = filteredReports.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 mt-2">This page is only accessible to Content & Creative Managers.</p>
        </div>
      </div>
    );
  }

  // Digital Solution Manager has access to everything
  if (user.position === 'Digital Solution Manager') {
    // Continue to render the page
  } else if (user.role !== 'content_creative_manager') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 mt-2">This page is only accessible to Content & Creative Managers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <div className="border-b border-border/50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 text-white rounded-lg">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                  Team Reports
                </h1>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Content & Creative Department Performance Overview
              </p>
            </div>
            <Button onClick={loadTeamReports} disabled={isLoading}>
              {isLoading ? <Clock className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
              Refresh Reports
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        {/* Team Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamStats.totalMembers}</div>
              <p className="text-xs text-muted-foreground">
                {teamStats.activeToday} active today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamStats.completedTasks}</div>
              <p className="text-xs text-muted-foreground">
                {teamStats.pendingTasks} in progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamStats.averageTeamRating}</div>
              <p className="text-xs text-muted-foreground">
                Average performance rating
              </p>
            </CardContent>
          </Card>

                     <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
               <Clock className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">
                 {teamMembers.reduce((sum, m) => sum + m.hoursWorked, 0).toFixed(1)}h
               </div>
               <p className="text-xs text-muted-foreground">
                 Team hours worked
               </p>
             </CardContent>
           </Card>
        </div>

        {/* Team Members Table */}
        <Card>
          <CardHeader>
            <CardTitle>Team Performance Details</CardTitle>
            <CardDescription>
              Individual performance metrics for Content & Creative team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Clock className="w-6 h-6 animate-spin mr-2" />
                <span>Loading team reports...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">{member.position}</div>
                      </div>
                    </div>
                    
                                         <div className="flex items-center space-x-6">
                       <div className="text-center">
                         <div className="text-lg font-bold text-green-600">{member.tasksCompleted}</div>
                         <div className="text-xs text-muted-foreground">Completed</div>
                       </div>
                       
                       <div className="text-center">
                         <div className="text-lg font-bold text-blue-600">{member.hoursWorked}h</div>
                         <div className="text-xs text-muted-foreground">Hours Worked</div>
                       </div>
                       
                       <div className="text-center">
                         <div className="flex items-center gap-1">
                           <Star className="w-4 h-4 text-yellow-500 fill-current" />
                           <span className="text-lg font-bold">{member.averageRating}</span>
                         </div>
                         <div className="text-xs text-muted-foreground">Rating</div>
                       </div>
                       
                       <div className="text-center">
                         <div className="text-lg font-bold text-purple-600">{member.productivity}%</div>
                         <div className="text-xs text-muted-foreground">Productivity</div>
                       </div>
                       
                       
                     </div>
                  </div>
                ))}
                
                {teamMembers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No team members found
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Work Reports Section */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Work Reports</CardTitle>
                <CardDescription>
                  Recent work reports from Content & Creative team members
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedMember} onValueChange={(value) => {
                  setSelectedMember(value);
                  setCurrentPage(1); // Reset to first page when filtering
                }}>
                  <SelectTrigger className="w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    {teamMembers.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} ({member.position})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                                 <Button onClick={exportToCSV} variant="outline" size="sm">
                   <Download className="w-4 h-4 mr-2" />
                   Export Performance
                 </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Clock className="w-6 h-6 animate-spin mr-2" />
                <span>Loading work reports...</span>
              </div>
                         ) : (
               <div className="space-y-4">
                 {currentReports.map((report) => {
                  const member = teamMembers.find(m => m.id === report.user_id);
                  return (
                    <div key={report.id} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                        {member?.name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{member?.name || 'Unknown User'}</div>
                            <div className="text-sm text-muted-foreground">{member?.position || 'Unknown Position'}</div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(report.date).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="mt-2 text-sm">
                          <div className="font-medium mb-1">Tasks Done:</div>
                          <div className="text-muted-foreground">{report.tasks_done || 'No tasks reported'}</div>
                          
                          {report.issues_faced && (
                            <>
                              <div className="font-medium mb-1 mt-3">Issues Faced:</div>
                              <div className="text-muted-foreground">{report.issues_faced}</div>
                            </>
                          )}
                          
                          <div className="font-medium mb-1 mt-3">Plans for Tomorrow:</div>
                          <div className="text-muted-foreground">{report.plans_for_tomorrow || 'No plans reported'}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                                 {filteredReports.length === 0 && (
                   <div className="text-center py-8 text-muted-foreground">
                     No work reports found for team members
                   </div>
                 )}
                 
                 {/* Pagination */}
                 {totalPages > 1 && (
                   <div className="flex items-center justify-between mt-6 pt-4 border-t">
                     <div className="text-sm text-muted-foreground">
                       Showing {startIndex + 1} to {Math.min(endIndex, filteredReports.length)} of {filteredReports.length} reports
                     </div>
                     <div className="flex items-center gap-2">
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => handlePageChange(currentPage - 1)}
                         disabled={currentPage === 1}
                       >
                         <ChevronLeft className="w-4 h-4" />
                         Previous
                       </Button>
                       <div className="flex items-center gap-1">
                         {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                           <Button
                             key={page}
                             variant={currentPage === page ? "default" : "outline"}
                             size="sm"
                             onClick={() => handlePageChange(page)}
                             className="w-8 h-8"
                           >
                             {page}
                           </Button>
                         ))}
                       </div>
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => handlePageChange(currentPage + 1)}
                         disabled={currentPage === totalPages}
                       >
                         Next
                         <ChevronRight className="w-4 h-4" />
                       </Button>
                     </div>
                   </div>
                 )}
               </div>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamReportsPage;
