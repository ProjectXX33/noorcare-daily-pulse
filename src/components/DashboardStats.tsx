
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckIn, WorkReport } from '@/types';
import { format } from 'date-fns';

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
  // Get today's check-ins
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayCheckIns = checkIns.filter(checkIn => {
    const checkInDate = new Date(checkIn.timestamp);
    checkInDate.setHours(0, 0, 0, 0);
    return checkInDate.getTime() === today.getTime();
  });

  // Get today's reports
  const todayReports = workReports.filter(report => {
    const reportDate = new Date(report.date);
    reportDate.setHours(0, 0, 0, 0);
    return reportDate.getTime() === today.getTime();
  });

  const todayReportsText = todayReports.length > 0 
    ? todayReports.length.toString() 
    : isAdmin ? '0' : 'Not submitted today';

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Today's Check-ins</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{todayCheckIns.length || '0'}</div>
          <p className="text-xs text-muted-foreground">
            {isAdmin ? 'Total employee check-ins today' : 'You have checked in today'}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Today's Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{todayReportsText}</div>
          <p className="text-xs text-muted-foreground">
            {isAdmin ? 'Total employee reports submitted today' : 'Your report status for today'}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{workReports.length || '0'}</div>
          <p className="text-xs text-muted-foreground">
            {isAdmin ? 'All reports in the system' : 'Your total submitted reports'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardStats;
