import React, { useState, useEffect } from 'react';
import { useCheckIn } from '@/contexts/CheckInContext';
import { useAuth } from '@/contexts/AuthContext';
import CheckInButton from '@/components/CheckInButton';
import CheckOutButton from '@/components/CheckOutButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ArrowRightLeft, Clock, Loader2, AlertCircle } from 'lucide-react';
import { checkIfDayOff } from '@/lib/performanceApi';

const CheckInPage = () => {
  const { user } = useAuth();
  const { 
    isLoading, 
    getUserCheckIns, 
    hasCheckedInToday,
    hasCheckedOutToday
  } = useCheckIn();
  
  const [isDayOff, setIsDayOff] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDayOffStatus() {
      if (!user) return;
      
      setLoading(true);
      const { isDayOff } = await checkIfDayOff(user.id, new Date());
      setIsDayOff(isDayOff);
      setLoading(false);
    }
    fetchDayOffStatus();
  }, [user?.id]);
  
  if (!user) return null;
  
  // Check if user is Customer Service
  if (user.position !== 'Customer Service') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Access Restricted</h2>
            <p className="text-gray-500">
              Check-in functionality is currently only available for Customer Service employees.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const userCheckIns = getUserCheckIns(user.id); 
  const isCheckedIn = hasCheckedInToday(user.id);
  const isCheckedOut = hasCheckedOutToday(user.id);
  
  // Determine current status based on check-in AND check-out status
  let currentStatus;
  if (isCheckedIn && !isCheckedOut) {
    currentStatus = 'checked-in';
  } else if (isCheckedIn && isCheckedOut) {
    currentStatus = 'workday-complete';
  } else {
    currentStatus = 'not-checked-in';
  }
  
  // Function to format time from date
  const formatTime = (date: string | Date) => {
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
  
  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold mb-2">Daily Check-in</h1>
        <p className="text-muted-foreground">
          Record your daily attendance and working hours for Customer Service shifts.
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
                      : currentStatus === 'workday-complete'
                        ? 'text-blue-500 ml-2'
                        : 'text-amber-500 ml-2'
                  }>
                    {currentStatus === 'checked-in' 
                      ? 'Currently Working' 
                      : currentStatus === 'workday-complete'
                        ? 'Workday Complete'
                        : 'Not Checked In'}
                  </span>
                </p>
                
                {todayCheckIns.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {todayCheckIns.map((checkIn, index) => (
                      <div key={index} className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {checkIn.checkOutTime ? 'Checked out:' : 'Checked in:'}
                        </span>
                        <span>
                          {checkIn.checkOutTime 
                            ? formatTime(checkIn.checkOutTime) 
                            : formatTime(checkIn.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex flex-col gap-3 min-w-[120px]">
                {/* Day Off Warning */}
                {isDayOff && (
                  <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-blue-600 font-medium mb-2">
                      🏖️ Today is your day off
                    </div>
                    <div className="text-blue-500 text-sm">
                      Enjoy your rest!
                    </div>
                  </div>
                )}
                
                {/* Check-in/Check-out Buttons */}
                {!isDayOff && (
                  <>
                    {!isCheckedIn && <CheckInButton />}
                    {isCheckedIn && !isCheckedOut && <CheckOutButton />}
                    {isCheckedIn && isCheckedOut && (
                      <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-green-600 font-medium">
                          ✅ Workday Complete
                        </div>
                        <div className="text-green-500 text-sm">
                          Thank you for your work today!
                        </div>
                      </div>
                    )}
                  </>
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
                  {todayCheckIns.filter(c => !c.checkOutTime).length}
                </p>
              </div>
              
              <div>
                <p className="mb-1 font-medium">Today's Check-outs:</p>
                <p className="text-2xl font-bold">
                  {todayCheckIns.filter(c => c.checkOutTime).length}
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
          <CardTitle>Customer Service Check-in Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Critical Warning Note */}
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg dark:bg-red-950/20 dark:border-red-900/50">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-800 dark:text-red-300 mb-1">⚠️ Important Notice</h3>
                  <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                    If you do not check in, check out, or submit your daily report, 
                    that day will <strong>NOT</strong> be collected or counted in your records.
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-1">Shift Schedule</h3>
              <p className="text-muted-foreground">
                <strong>Day Shift:</strong> 9:00 AM - 4:00 PM<br />
                <strong>Night Shift:</strong> 4:00 PM - 12:00 AM
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-1">When to Check In</h3>
              <p className="text-muted-foreground">
                Please check in at the start of your assigned shift and check out when you finish.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-1">Shift Tracking</h3>
              <p className="text-muted-foreground">
                Your shifts are automatically tracked for monthly reports and overtime calculations.
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
  );
};

export default CheckInPage;
