
import React from 'react';
import MainLayout from '@/components/MainLayout';
import DashboardStats from '@/components/DashboardStats';
import CheckInHistory from '@/components/CheckInHistory';
import ReportHistory from '@/components/ReportHistory';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckIn } from '@/contexts/CheckInContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const { checkIns, workReports, getUserCheckIns, getUserWorkReports, hasCheckedInToday } = useCheckIn();
  const navigate = useNavigate();

  if (!user) return null;

  const userCheckIns = user.role === 'admin' ? checkIns : getUserCheckIns(user.id);
  const userReports = user.role === 'admin' ? workReports : getUserWorkReports(user.id);
  const checkedInToday = hasCheckedInToday(user.id);

  return (
    <MainLayout>
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold mb-6">
          Welcome, {user.name}
        </h1>

        <DashboardStats 
          title="Dashboard Overview" 
          checkIns={userCheckIns} 
          workReports={userReports}
          isAdmin={user.role === 'admin'}
        />

        {!checkedInToday && user.role !== 'admin' && (
          <div className="my-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-medium text-amber-800">You haven't checked in today</h3>
                <p className="text-sm text-amber-700">Please check in to record your attendance for today.</p>
              </div>
              <Button onClick={() => navigate('/check-in')} className="bg-primary hover:bg-primary/90">
                Check In Now
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-6 mt-6">
          <CheckInHistory checkIns={userCheckIns} />
          <ReportHistory reports={userReports} />
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
