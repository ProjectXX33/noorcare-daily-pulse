import React, { useState, useEffect } from 'react';
import { useCheckIn } from '@/contexts/CheckInContext';
import { useAuth } from '@/contexts/AuthContext';
import CheckInButton from '@/components/CheckInButton';
import CheckOutButton from '@/components/CheckOutButton';
import CheckInHistory from '@/components/CheckInHistory';
import WorkShiftTimer from '@/components/WorkShiftTimer';
import AutoCheckoutService from '@/components/AutoCheckoutService';
import BreakTimeButton from '@/components/BreakTimeButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ArrowRightLeft, Clock, Loader2, AlertCircle, CheckCircle, LogIn, LogOut, Coffee, Timer } from 'lucide-react';
import { checkIfDayOff } from '@/lib/performanceApi';

const CheckInPage = () => {
  const { user } = useAuth();
  const { 
    isLoading, 
    getUserCheckIns, 
    hasCheckedInToday,
    hasCheckedOutToday,
    refreshCheckIns,
    currentCheckIn,
    isCheckedIn: contextIsCheckedIn,
    forceRefreshBoundaries
  } = useCheckIn();
  
  const [isDayOff, setIsDayOff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('en');
  const [activeCheckInId, setActiveCheckInId] = useState<string | null>(null);

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
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Access Restricted</h2>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
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
  
  // Get today's check-ins based on work day boundaries (resets at 4 AM)
  const { workDayBoundaries } = useCheckIn();
  
  // Filter check-ins for current work day
  const todayCheckIns = userCheckIns.filter(checkIn => {
    const checkInTime = new Date(checkIn.timestamp);
    
    if (workDayBoundaries) {
      // Use work day boundaries (4 AM reset)
      return checkInTime >= workDayBoundaries.workDayStart && 
             checkInTime < workDayBoundaries.workDayEnd;
    } else {
      // Fallback to midnight-based logic
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkInDate = new Date(checkInTime);
      checkInDate.setHours(0, 0, 0, 0);
      return checkInDate.getTime() === today.getTime();
    }
  });
  
  // Use context state for more reliable checking
  const actualIsCheckedIn = contextIsCheckedIn || isCheckedIn;
  
  // Enhanced status determination - handle manual checkout
  const hasAnyCheckoutToday = todayCheckIns.some(ci => ci.checkOutTime || ci.checkoutTime);
  const hasActiveCheckIn = actualIsCheckedIn && !isCheckedOut;
  
  // Debug logging for status determination
  console.log('🔍 CheckInPage Status Debug:', {
    currentTime: new Date().toISOString(),
    workDayBoundaries,
    todayCheckIns: todayCheckIns.length,
    actualIsCheckedIn,
    isCheckedOut,
    hasAnyCheckoutToday,
    hasActiveCheckIn,
    todayCheckInsDetails: todayCheckIns.map(ci => ({
      id: ci.id,
      timestamp: ci.timestamp,
      checkOutTime: ci.checkOutTime,
      checkoutTime: ci.checkoutTime
    }))
  });
  
  // Determine current status based on check-in AND check-out status
  let currentStatus;
  if (hasActiveCheckIn) {
    currentStatus = 'checked-in';
  } else if ((actualIsCheckedIn || todayCheckIns.length > 0) && (isCheckedOut || hasAnyCheckoutToday)) {
    currentStatus = 'workday-complete';
  } else {
    currentStatus = 'not-checked-in';
  }
  
  // Find active check-in ID for break tracking
  useEffect(() => {
    if (actualIsCheckedIn && !isCheckedOut && todayCheckIns.length > 0) {
      // Get the most recent check-in that hasn't been checked out
      const activeCheckIn = todayCheckIns
        .filter(ci => !ci.checkOutTime && !ci.checkoutTime)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      
      setActiveCheckInId(activeCheckIn?.id || null);
    } else {
      setActiveCheckInId(null);
    }
  }, [actualIsCheckedIn, isCheckedOut, todayCheckIns]);

  // Function to format time from date
  const formatTime = (date: string | Date) => {
    return format(new Date(date), 'h:mm a');
  };
  
  // Manual refresh function
  const handleManualRefresh = async () => {
    setLoading(true);
    try {
      // Force refresh work day boundaries first, then check-ins
      await forceRefreshBoundaries();
      await refreshCheckIns();
      console.log('🔄 Manual refresh completed - boundaries and check-ins updated');
    } catch (error) {
      console.error('Manual refresh failed:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 w-full max-w-full overflow-x-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Background service for auto-checkout at 4AM */}
      <AutoCheckoutService />
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
            <div className="flex justify-end sm:justify-start shrink-0">
              <button
                onClick={handleManualRefresh}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <ArrowRightLeft className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-sm">
                  {loading ? 'Refreshing...' : 'Refresh Status'}
                </span>
              </button>
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
                  
                  {/* Work Timer */}
                  <div className="mb-3">
                    <WorkShiftTimer />
                  </div>
                  
                  {todayCheckIns.length > 0 && (
                    <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                      {todayCheckIns
                        .filter((checkIn, index, array) => {
                          // Remove duplicates by checking if this is the first occurrence of this ID
                          return array.findIndex(item => item.id === checkIn.id) === index;
                        })
                        .map((checkIn) => (
                        <div key={`status-${checkIn.id}`} className="flex items-center gap-2">
                          <span className="font-medium">
                            {(checkIn.checkOutTime || checkIn.checkoutTime) ? 'Checked out:' : 'Checked in:'}
                          </span>
                          <span>
                            {(checkIn.checkOutTime || checkIn.checkoutTime)
                              ? formatTime(checkIn.checkOutTime || checkIn.checkoutTime) 
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
                    <div className="text-center p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="text-blue-600 dark:text-blue-400 font-medium mb-2 text-sm sm:text-base">
                        🏖️ Today is your day off
                      </div>
                      <div className="text-blue-500 dark:text-blue-300 text-xs sm:text-sm">
                        Enjoy your rest!
                      </div>
                    </div>
                  )}
                  
                  {/* Check-in/Check-out Buttons */}
                  {!isDayOff && (
                    <>
                      {currentStatus === 'not-checked-in' && <CheckInButton />}
                      {currentStatus === 'checked-in' && (
                        <div className="flex flex-col items-center gap-6">
                          <CheckOutButton />
                          {/* Break Time Button - Only show when checked in */}
                          <div className="w-full flex justify-center">
                            <BreakTimeButton 
                              activeCheckInId={activeCheckInId}
                              onBreakStateChange={(isOnBreak) => {
                                // You can add additional break state handling here if needed
                                console.log('Break state changed:', isOnBreak);
                              }}
                            />
                          </div>
                        </div>
                      )}
                      {currentStatus === 'workday-complete' && (
                        <div className="text-center p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="text-green-600 dark:text-green-400 font-medium text-sm sm:text-base">
                            ✅ Workday Complete
                          </div>
                          <div className="text-green-500 dark:text-green-300 text-xs sm:text-sm">
                            Thank you for your work today!
                          </div>
                          {hasAnyCheckoutToday && !actualIsCheckedIn && (
                            <div className="text-green-400 dark:text-green-300 text-xs mt-1">
                              You were checked out automatically
                            </div>
                          )}
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
                      {todayCheckIns
                        .filter((checkIn, index, array) => {
                          // Remove duplicates by checking if this is the first occurrence of this ID
                          return array.findIndex(item => item.id === checkIn.id) === index;
                        })
                        .map((checkIn) => (
                        <div key={`today-session-${checkIn.id}`} className="p-2 sm:p-3 bg-muted rounded-lg">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2">
                            <div className="text-xs sm:text-sm">
                              <span className="font-medium">Check-in:</span> {formatTime(checkIn.timestamp)}
                            </div>
                            {(checkIn.checkOutTime || checkIn.checkoutTime) && (
                              <div className="text-xs sm:text-sm">
                                <span className="font-medium">Check-out:</span> {formatTime(checkIn.checkOutTime || checkIn.checkoutTime)}
                              </div>
                            )}
                          </div>
                          
                          {/* Break Information */}
                          {(checkIn as any).totalBreakMinutes > 0 && (
                            <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded text-xs">
                              <div className="flex items-center gap-2 mb-1">
                                <Coffee className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                                <span className="font-medium text-orange-700 dark:text-orange-300">
                                  Break Time: {(checkIn as any).totalBreakMinutes} minutes
                                </span>
                              </div>
                              {(checkIn as any).breakSessions && (checkIn as any).breakSessions.length > 0 && (
                                <div className="space-y-1">
                                  {(checkIn as any).breakSessions.map((session: any, index: number) => (
                                    <div key={index} className="text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded">
                                      <span className="font-medium">
                                        {format(new Date(session.start_time), 'h:mm a')} - {format(new Date(session.end_time), 'h:mm a')} ({session.duration_minutes}m)
                                      </span>
                                      {session.reason && (
                                        <div className="text-orange-500 dark:text-orange-400 text-xs mt-1">
                                          Reason: {session.reason}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Current break status */}
                          {(checkIn as any).isOnBreak && (
                            <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs">
                              <div className="flex items-center gap-2">
                                <Timer className="h-3 w-3 text-yellow-600 dark:text-yellow-400 animate-pulse" />
                                <span className="font-medium text-yellow-700 dark:text-yellow-300">Currently on break</span>
                              </div>
                              {(checkIn as any).currentBreakReason && (
                                <div className="text-yellow-600 dark:text-yellow-400 mt-1">
                                  Reason: {(checkIn as any).currentBreakReason}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {(checkIn.checkOutTime || checkIn.checkoutTime) && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Duration: {Math.round(
                                (new Date(checkIn.checkOutTime || checkIn.checkoutTime!).getTime() - new Date(checkIn.timestamp).getTime()) / (1000 * 60 * 60)
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
                {todayCheckIns.filter((checkIn, index, array) => 
                  array.findIndex(item => item.id === checkIn.id) === index
                ).length}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                Today's Check-ins
              </div>
            </div>
          </Card>
          
          <Card className="p-3 sm:p-4">
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-blue-600">
                {currentStatus === 'workday-complete' ? '✓' : 
                 currentStatus === 'checked-in' ? '⏱️' : '⏸️'}
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
        <CheckInHistory checkIns={userCheckIns.slice(0, 10) as unknown as import('@/types').CheckIn[]} title="Recent Check-ins" />
        

      </div>
    </div>
  );
};

export default CheckInPage;
