
import React from 'react';
import MainLayout from '@/components/MainLayout';
import CheckInButton from '@/components/CheckInButton';
import CheckOutButton from '@/components/CheckOutButton';
import CheckInHistory from '@/components/CheckInHistory';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckIn } from '@/contexts/CheckInContext';

const CheckInPage = () => {
  const { user } = useAuth();
  const { getUserCheckIns } = useCheckIn();

  if (!user) return null;

  const userCheckIns = getUserCheckIns(user.id);

  return (
    <MainLayout>
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold mb-6">Check-In / Check-Out</h1>
        
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-sm border flex flex-col items-center justify-center">
            <div className="grid grid-cols-2 gap-6 w-full">
              <div className="flex flex-col items-center">
                <CheckInButton />
              </div>
              <div className="flex flex-col items-center">
                <CheckOutButton />
              </div>
            </div>
          </div>
          
          <div className="md:col-span-2">
            <CheckInHistory 
              checkIns={userCheckIns} 
              title="Your Check-in History"
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CheckInPage;
