import React, { useState, useEffect } from 'react';
import { useCheckIn } from '@/contexts/CheckInContext';
import { useAuth } from '@/contexts/AuthContext';
import CheckInButton from '@/components/CheckInButton';
import CheckOutButton from '@/components/CheckOutButton';
import CheckInHistory from '@/components/CheckInHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ArrowRightLeft, Clock, Loader2, AlertCircle, CheckCircle, LogIn, LogOut } from 'lucide-react';
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
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    const storedLang = localStorage.getItem('preferredLanguage');
    if (storedLang && (storedLang === 'en' || storedLang === 'ar')) {
      setLanguage(storedLang);
    }
  }, []);

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
  
  // Check if user is Customer Service or Designer
  if (user.position !== 'Customer Service' && user.position !== 'Designer') {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-4 sm:p-6 text-center">
            <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-yellow-500 mx-auto mb-3 sm:mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">Access Restricted</h2>
            <p className="text-sm sm:text-base text-gray-500">
              Check-in functionality is available for Customer Service and Designer employees.
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 w-full max-w-full overflow-x-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Enhanced mobile-optimized header - Non-sticky, responsive layout */}
      <div className="border-b border-border/50 bg-background/98 w-full">
        <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6 w-full max-w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
            <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">Daily Check-in</h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                Record your daily attendance and working hours for {user.position === 'Designer' ? 'Designer shifts' : 'Customer Service shifts'}.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 space-y-6 sm:space-y-8 md:space-y-10 w-full max-w-full overflow-x-hidden">
        {/* Mobile-responsive grid layout */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
          <Card className="bg-card">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /> 
                Check-in Status
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Your current check-in status for today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex-1">
                  <p className="mb-2 font-medium text-sm sm:text-base">
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
                    <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                      {todayCheckIns.map((checkIn, index) => (
                        <div key={index} className="flex items-center gap-2">
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
                
                <div className="flex flex-col gap-3">
                  {/* Day Off Warning */}
                  {isDayOff && (
                    <div className="text-center p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-blue-600 font-medium mb-2 text-sm sm:text-base">
                        🏖️ Today is your day off
                      </div>
                      <div className="text-blue-500 text-xs sm:text-sm">
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
                        <div className="text-center p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="text-green-600 font-medium text-sm sm:text-base">
                            ✅ Workday Complete
                          </div>
                          <div className="text-green-500 text-xs sm:text-sm">
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
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <ArrowRightLeft className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Activity Summary
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Your check-in activity for today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <h4 className="font-medium mb-2 text-sm sm:text-base">Today's Sessions</h4>
                  {todayCheckIns.length === 0 ? (
                    <p className="text-xs sm:text-sm text-muted-foreground">No check-ins recorded yet today</p>
                  ) : (
                    <div className="space-y-2">
                      {todayCheckIns.map((checkIn, index) => (
                        <div key={index} className="p-2 sm:p-3 bg-muted rounded-lg">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2">
                            <div className="text-xs sm:text-sm">
                              <span className="font-medium">Check-in:</span> {formatTime(checkIn.timestamp)}
                            </div>
                            {checkIn.checkOutTime && (
                              <div className="text-xs sm:text-sm">
                                <span className="font-medium">Check-out:</span> {formatTime(checkIn.checkOutTime)}
                              </div>
                            )}
                          </div>
                          {checkIn.checkOutTime && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Duration: {Math.round(
                                (new Date(checkIn.checkOutTime).getTime() - new Date(checkIn.timestamp).getTime()) / (1000 * 60 * 60)
                              )} hours
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="pt-2 sm:pt-3 border-t">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    <strong>Note:</strong> Make sure to check out at the end of your shift to record accurate working hours.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Mobile-optimized quick stats */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4">
          <Card className="p-3 sm:p-4">
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-primary">
                {userCheckIns.filter(ci => ci.checkOutTime).length}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                Total Sessions
              </div>
            </div>
          </Card>
          
          <Card className="p-3 sm:p-4">
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-green-600">
                {todayCheckIns.length}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                Today's Check-ins
              </div>
            </div>
          </Card>
          
          <Card className="p-3 sm:p-4">
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-blue-600">
                {isCheckedIn ? (isCheckedOut ? '✓' : '⏱️') : '⏸️'}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                Current Status
              </div>
            </div>
          </Card>
          
          <Card className="p-3 sm:p-4">
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-purple-600">
                {userCheckIns.length}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                All Time
              </div>
            </div>
          </Card>
        </div>

        {/* Recent check-ins history */}
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CheckInHistory checkIns={userCheckIns.slice(0, 10)} title="" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CheckInPage;
