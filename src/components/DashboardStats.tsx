import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, FileText, Users } from 'lucide-react';
import DashboardCard from './DashboardCard';
import { CheckIn, WorkReport } from '@/types';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';

interface DashboardStatsProps {
  title: string;
  checkIns: CheckIn[];
  workReports: WorkReport[];
  isAdmin?: boolean;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ 
  title, 
  checkIns, 
  workReports,
  isAdmin = false 
}) => {
  const [employeeCount, setEmployeeCount] = useState<number>(0);
  const [nonAdminCheckIns, setNonAdminCheckIns] = useState<CheckIn[]>([]);
  const [nonAdminReports, setNonAdminReports] = useState<WorkReport[]>([]);

  useEffect(() => {
    const fetchEmployeeCount = async () => {
      try {
        const { count, error } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .neq('role', 'admin'); // Exclude admin users from count
          
        if (error) {
          console.error('Error fetching employee count:', error);
          return;
        }
        
        setEmployeeCount(count || 0);
      } catch (error) {
        console.error('Error fetching employee count:', error);
      }
    };

    const filterNonAdminData = async () => {
      try {
        // Get all non-admin user IDs
        const { data: nonAdminUsers, error } = await supabase
          .from('users')
          .select('id')
          .neq('role', 'admin');
          
        if (error) {
          console.error('Error fetching non-admin users:', error);
          return;
        }
        
        const nonAdminUserIds = nonAdminUsers.map(user => user.id);
        
        // Filter check-ins to exclude admin users
        const filteredCheckIns = checkIns.filter(checkIn => 
          nonAdminUserIds.includes(checkIn.userId)
        );
        
        // Filter reports to exclude admin users  
        const filteredReports = workReports.filter(report => 
          nonAdminUserIds.includes(report.userId)
        );
        
        setNonAdminCheckIns(filteredCheckIns);
        setNonAdminReports(filteredReports);
      } catch (error) {
        console.error('Error filtering non-admin data:', error);
        // Fallback to original data if filtering fails
        setNonAdminCheckIns(checkIns);
        setNonAdminReports(workReports);
      }
    };

    fetchEmployeeCount();
    filterNonAdminData();
  }, [checkIns, workReports]);
  
  // Get today's check-ins (excluding admin users)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayCheckIns = nonAdminCheckIns.filter(checkIn => {
    const checkInDate = new Date(checkIn.timestamp);
    checkInDate.setHours(0, 0, 0, 0);
    return checkInDate.getTime() === today.getTime();
  });

  // Get today's reports (excluding admin users)
  const todayReports = nonAdminReports.filter(report => {
    const reportDate = new Date(report.date);
    reportDate.setHours(0, 0, 0, 0);
    return reportDate.getTime() === today.getTime();
  });

  const todayReportsText = todayReports.length > 0 
    ? todayReports.length.toString() 
    : isAdmin ? '0' : 'Not submitted today';

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <DashboardCard
        title="Today's Check-ins"
        value={todayCheckIns.length || '0'}
        description={isAdmin ? 'Total employee check-ins today' : 'You have checked in today'}
        icon={<CalendarCheck className="h-5 w-5" />}
        variant="info"
      />
      <DashboardCard
        title="Today's Reports"
        value={todayReportsText}
        description={isAdmin ? 'Total employee reports submitted today' : 'Your report status for today'}
        icon={<FileText className="h-5 w-5" />}
        variant="warning"
      />
      <DashboardCard
        title="Total Employees"
        value={isAdmin ? employeeCount : '1'}
        description={isAdmin ? 'Active employees in the system' : 'Your account'}
        icon={<Users className="h-5 w-5" />}
        variant="success"
      />
    </div>
  );
};

export default DashboardStats;
