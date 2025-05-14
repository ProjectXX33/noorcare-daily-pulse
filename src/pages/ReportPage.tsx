
import React from 'react';
import MainLayout from '@/components/MainLayout';
import ReportForm from '@/components/ReportForm';
import ReportHistory from '@/components/ReportHistory';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckIn } from '@/contexts/CheckInContext';

const ReportPage = () => {
  const { user } = useAuth();
  const { getUserWorkReports } = useCheckIn();

  if (!user) return null;

  const userReports = getUserWorkReports(user.id);

  return (
    <MainLayout>
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold mb-6">Daily Work Report</h1>
        
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1">
            <ReportForm />
          </div>
          
          <div className="md:col-span-2">
            <ReportHistory 
              reports={userReports} 
              title="Your Report History"
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ReportPage;
