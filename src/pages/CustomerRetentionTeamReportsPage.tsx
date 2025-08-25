import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  TrendingUp, 
  Clock, 
  Star, 
  Download, 
  Filter,
  Calendar,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { toast } from "sonner";
import { supabase } from '@/lib/supabase';
import { fetchEmployees } from '@/lib/employeesApi';
import { fetchTasks } from '@/lib/tasksApi';

interface TeamMember {
  id: string;
  name: string;
  position: string;
  tasksCompleted: number;
  tasksInProgress: number;
  hoursWorked: number;
  averageRating: number;
  productivity: number;
}

const CustomerRetentionTeamReportsPage = () => {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [dailyReports, setDailyReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const reportsPerPage = 5;

  useEffect(() => {
    if (user?.role === 'customer_retention_manager') {
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
    link.setAttribute('download', `أداء_فريق_الاحتفاظ_بالعملاء_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('تم تصدير بيانات الأداء بنجاح!');
  };

  const loadTeamReports = async () => {
    setIsLoading(true);
    try {
      console.log('📊 Loading Customer Retention Team Reports...');
      
      // Fetch employees
      const employeesData = await fetchEmployees();
      
      // Filter Customer Retention team members (exclude managers)
      const teamEmployees = employeesData.filter(emp => 
        (emp.team === 'Customer Retention Department' || 
        ['Junior CRM Specialist', 'Customer Retention Specialist'].includes(emp.position)) &&
        !['Executive Director', 'Customer Retention Manager'].includes(emp.position)
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
            tasksCompleted: completedTasks,
            tasksInProgress: inProgressTasks,
            hoursWorked: Math.round(hoursWorked * 10) / 10,
            averageRating: Math.round(averageRating * 10) / 10,
            productivity: Math.round(productivity * 10) / 10
          };
        })
      );
      
      setTeamMembers(memberStats);
      
      // Fetch daily reports for the team
      const { data: reportsData } = await supabase
        .from('work_reports')
        .select('*')
        .in('user_id', teamEmployees.map(emp => emp.id))
        .order('created_at', { ascending: false })
        .limit(50);
      
      setDailyReports(reportsData || []);
      
    } catch (error) {
      console.error('Error loading team reports:', error);
      toast.error('Failed to load team reports');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredReports = dailyReports.filter(report => {
    if (selectedMember === 'all') return true;
    return report.user_id === selectedMember;
  });

  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * reportsPerPage,
    currentPage * reportsPerPage
  );

  const totalPages = Math.ceil(filteredReports.length / reportsPerPage);

  if (!user || user.role !== 'customer_retention_manager') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              You don't have permission to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto">
      <div className="relative w-full h-48 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg mb-6 flex items-center justify-center">
        <div className="text-center text-white p-4">
          <h1 className="text-4xl font-bold mb-2">Customer Retention Team Reports</h1>
          <p className="text-lg">Performance overview for Customer Retention Department</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <p>Loading team reports...</p>
        </div>
      ) : (
        <>
          {/* Team Performance Overview */}
          <Card className="shadow-md mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Team Performance Overview</CardTitle>
                  <CardDescription>Performance metrics for Customer Retention team members</CardDescription>
                </div>
                <Button onClick={exportToCSV} className="bg-blue-500 hover:bg-blue-600">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Completed Tasks</TableHead>
                    <TableHead>In Progress</TableHead>
                    <TableHead>Hours Worked</TableHead>
                    <TableHead>Average Rating</TableHead>
                    <TableHead>Productivity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.length > 0 ? (
                    teamMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell>{member.position}</TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            {member.tasksCompleted}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {member.tasksInProgress}
                          </Badge>
                        </TableCell>
                        <TableCell>{member.hoursWorked}h</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-500 mr-1" />
                            {member.averageRating.toFixed(1)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={member.productivity > 50 ? "default" : "destructive"}>
                            {member.productivity}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        No team members found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Daily Reports */}
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Daily Reports</CardTitle>
                  <CardDescription>Recent daily reports from team members</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedMember} onValueChange={setSelectedMember}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Members</SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {paginatedReports.length > 0 ? (
                <div className="space-y-4">
                  {paginatedReports.map((report) => (
                    <Card key={report.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                                                     <div>
                             <h4 className="font-semibold">
                               {teamMembers.find(m => m.id === report.user_id)?.name || 'Unknown Member'}
                             </h4>
                             <p className="text-sm text-muted-foreground">
                               {new Date(report.date).toLocaleDateString()}
                             </p>
                             
                             {/* Tasks Completed Today */}
                             <div className="mt-3">
                               <h5 className="font-medium text-green-700 mb-1">✅ Tasks Completed Today:</h5>
                               <p className="text-sm text-gray-700 mb-2">{report.tasks_done}</p>
                             </div>
                             
                             {/* Issues Faced */}
                             {report.issues_faced && (
                               <div className="mt-3">
                                 <h5 className="font-medium text-orange-700 mb-1">⚠️ Issues Faced:</h5>
                                 <p className="text-sm text-gray-700 mb-2">{report.issues_faced}</p>
                               </div>
                             )}
                             
                             {/* Plans for Tomorrow */}
                             <div className="mt-3">
                               <h5 className="font-medium text-blue-700 mb-1">📋 Plans for Tomorrow:</h5>
                               <p className="text-sm text-gray-700">{report.plans_for_tomorrow}</p>
                             </div>
                           </div>
                          <Badge variant="outline">
                            Daily Report
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-6">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No daily reports found for team members.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default CustomerRetentionTeamReportsPage;
