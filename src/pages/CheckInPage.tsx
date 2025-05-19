
import React from 'react';
import SidebarNavigation from '@/components/SidebarNavigation';
import { useCheckIn } from '@/contexts/CheckInContext';
import { useAuth } from '@/contexts/AuthContext';
import CheckInButton from '@/components/CheckInButton';
import CheckOutButton from '@/components/CheckOutButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ArrowRightLeft, Clock, Loader2 } from 'lucide-react';

const CheckInPage = () => {
  const { user } = useAuth();
  const { 
    isLoading, 
    getUserCheckIns, 
    getCurrentCheckInStatus, 
    hasCheckedInToday 
  } = useCheckIn();
  
  if (!user) return null;
  
  const userCheckIns = getUserCheckIns(user.id); 
  const currentStatus = getCurrentCheckInStatus(user.id);
  const checkedInToday = hasCheckedInToday(user.id);
  
  // Function to format time from date
  const formatTime = (date: string) => {
    return format(new Date(date), 'h:mm a');
  };
  
  // Get today's date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Filter check-ins for today
  const todayCheckIns = userCheckIns.filter(checkIn => {
    const checkInDate = new Date(checkIn.timestamp);
    checkInDate.setHours(0, 0, 0, 0);
    return checkInDate.getTime() === today.getTime();
  });
  
  if (isLoading) {
    return (
      <SidebarNavigation>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </SidebarNavigation>
    );
  }

  return (
    <SidebarNavigation>
      <div className="space-y-6">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold mb-2">Daily Check-in</h1>
          <p className="text-muted-foreground">
            Record your daily attendance and working hours.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" /> 
                Check-in Status
              </CardTitle>
              <CardDescription>
                Your current check-in status for today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                <div>
                  <p className="mb-2 font-medium">
                    Status: 
                    <span className={
                      currentStatus === 'checked-in' 
                        ? 'text-green-500 ml-2' 
                        : 'text-amber-500 ml-2'
                    }>
                      {currentStatus === 'checked-in' ? 'Currently Working' : 'Not Checked In'}
                    </span>
                  </p>
                  
                  {todayCheckIns.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {todayCheckIns.map((checkIn, index) => (
                        <div key={index} className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{checkIn.type === 'check-in' ? 'Checked in:' : 'Checked out:'}</span>
                          <span>{formatTime(checkIn.timestamp)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-3 min-w-[120px]">
                  {currentStatus === 'checked-in' ? (
                    <CheckOutButton />
                  ) : (
                    <CheckInButton />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
                Activity Summary
              </CardTitle>
              <CardDescription>
                Your check-in activity for today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="mb-1 font-medium">Today's Check-ins:</p>
                  <p className="text-2xl font-bold">
                    {todayCheckIns.filter(c => c.type === 'check-in').length}
                  </p>
                </div>
                
                <div>
                  <p className="mb-1 font-medium">Today's Check-outs:</p>
                  <p className="text-2xl font-bold">
                    {todayCheckIns.filter(c => c.type === 'check-out').length}
                  </p>
                </div>
                
                {todayCheckIns.length === 0 && (
                  <p className="text-muted-foreground italic">
                    No activity recorded for today
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Daily Check-in Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-1">When to Check In</h3>
                <p className="text-muted-foreground">
                  Please check in at the start of your work day and check out when you finish.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-1">Multiple Check-ins</h3>
                <p className="text-muted-foreground">
                  If you take a break or leave temporarily, you can check out and check in again when you return.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-1">Daily Reports</h3>
                <p className="text-muted-foreground">
                  Remember to submit your daily report before the end of your work day.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarNavigation>
  );
};

export default CheckInPage;
