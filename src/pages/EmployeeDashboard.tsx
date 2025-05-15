
import React from 'react';
import MainLayout from '@/components/MainLayout';
import DashboardStats from '@/components/DashboardStats';
import CheckInHistory from '@/components/CheckInHistory';
import ReportHistory from '@/components/ReportHistory';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckIn } from '@/contexts/CheckInContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const { 
    getUserCheckIns, 
    getUserWorkReports, 
    hasCheckedInToday,
    isLoading
  } = useCheckIn();
  const navigate = useNavigate();

  if (!user) return null;

  const userCheckIns = getUserCheckIns(user.id);
  const userReports = getUserWorkReports(user.id);
  const checkedInToday = hasCheckedInToday(user.id);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold mb-6">
          Welcome, {user.name}
        </h1>

        <DashboardStats 
          title="Your Overview" 
          checkIns={userCheckIns} 
          workReports={userReports}
          isAdmin={false}
        />

        {!checkedInToday && (
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
          <CheckInHistory 
            checkIns={userCheckIns.slice(0, 5)} 
            title="Your Recent Check-ins" 
          />
          <ReportHistory 
            reports={userReports.slice(0, 3)} 
            title="Your Recent Reports" 
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default EmployeeDashboard;
