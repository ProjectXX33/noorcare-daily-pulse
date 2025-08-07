import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useCheckIn } from '@/contexts/CheckInContext';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Check, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { AnimatedClock } from '@/components/AnimatedClock';

const CheckInButton = () => {
  const { user } = useAuth();
  const { checkInUser, hasCheckedInToday } = useCheckIn();
  const [isLoading, setIsLoading] = useState(false);
  const [showCheckAnimation, setShowCheckAnimation] = useState(false);
  const [shiftValidation, setShiftValidation] = useState<{
    canCheckIn: boolean;
    message: string;
    assignedShift?: { name: string; start_time: string };
  }>({ canCheckIn: true, message: '' });


  if (!user) return null;

  // Check shift assignment and timing validation
  const checkShiftValidation = async () => {
    if (!user || user.role !== 'employee') {
      setShiftValidation({ canCheckIn: true, message: '' });
      return;
    }

    try {
      // Get current work day boundaries (4AM reset logic)
      const { getCurrentWorkDayBoundaries } = await import('@/lib/shiftsApi');
      const { workDayStart, workDayEnd } = await getCurrentWorkDayBoundaries();
      
      // Determine the correct work date based on current time
      const currentTime = new Date();
      let workDate;
      
      if (currentTime >= workDayStart && currentTime < workDayEnd) {
        // We're within the current work day - use the calendar date
        // At 4:29 AM on Friday, this should give us Friday's date for Friday's shifts
        const calendarDate = new Date();
        workDate = calendarDate.toISOString().split('T')[0];
      } else {
        // Fallback to work day start date
        workDate = workDayStart.toISOString().split('T')[0];
      }
      
      console.log('🔍 CheckInButton - Work day logic:', {
        currentTime: currentTime.toISOString(),
        workDayStart: workDayStart.toISOString(),
        workDayEnd: workDayEnd.toISOString(),
        workDate,
        calendarDate: new Date().toISOString().split('T')[0],
        isWithinWorkDay: currentTime >= workDayStart && currentTime < workDayEnd
      });
      
      // Get shift assignment for the current work day
      const { data: assignment, error } = await supabase
        .from('shift_assignments')
        .select(`
          *,
          shifts:assigned_shift_id(name, start_time, end_time)
        `)
        .eq('employee_id', user.id)
        .eq('work_date', workDate)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching shift assignment:', error);
        setShiftValidation({ canCheckIn: true, message: '' });
        return;
      }

      if (!assignment || assignment.is_day_off) {
        setShiftValidation({ 
          canCheckIn: false, 
          message: assignment?.is_day_off ? 'Today is your day off' : 'No shift assigned for today'
        });
        return;
      }

      const shift = assignment.shifts;
      if (!shift) {
        setShiftValidation({ canCheckIn: true, message: '' });
        return;
      }

      // Check current time vs shift start time
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTotalMinutes = currentHour * 60 + currentMinute;

      const [shiftHour, shiftMinute] = shift.start_time.split(':').map(Number);
      const shiftTotalMinutes = shiftHour * 60 + shiftMinute;

      // Determine if employee can check in with specific timing rules
      let allowEarlyMinutes = 30; // Default 30 minutes early
      let canCheckIn = false;
      
      // Specific timing rules for shifts
      if (shift.name.toLowerCase().includes('day')) {
        // Day shift: Can check in from 8:30 AM (30 min before 9:00 AM)
        const allowedStartTime = 8 * 60 + 30; // 8:30 AM in minutes
        canCheckIn = currentTotalMinutes >= allowedStartTime;
      } else if (shift.name.toLowerCase().includes('night')) {
        // Night shift: Can check in from 3:30 PM (30 min before 4:00 PM)  
        const allowedStartTime = 15 * 60 + 30; // 3:30 PM in minutes
        canCheckIn = currentTotalMinutes >= allowedStartTime;
      } else {
        // Generic shift: Use 30 minutes before shift start AND check end time
        const [endHour, endMinute] = shift.end_time.split(':').map(Number);
        const shiftEndMinutes = endHour * 60 + endMinute;
        
        // Handle overnight shifts where end time is next day
        const isOvernightShift = endHour < shiftHour || (endHour === shiftHour && endMinute < shiftMinute);
        
        if (isOvernightShift) {
          // For overnight shifts, allow check-in from (start-30min) until end time next day
          canCheckIn = currentTotalMinutes >= (shiftTotalMinutes - allowEarlyMinutes) || 
                      currentTotalMinutes <= shiftEndMinutes;
        } else {
          // For same-day shifts, must be after (start-30min) AND before end time
          canCheckIn = currentTotalMinutes >= (shiftTotalMinutes - allowEarlyMinutes) && 
                      currentTotalMinutes <= shiftEndMinutes;
        }
      }

      if (!canCheckIn) {
        // Format the start time to 12-hour format
        const formatTime = (timeString: string) => {
          const [hours, minutes] = timeString.split(':').map(Number);
          const date = new Date();
          date.setHours(hours, minutes);
          return date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          });
        };

        const formattedStartTime = formatTime(shift.start_time);
        let message = `Your ${shift.name} starts at ${formattedStartTime}.`;
        
        if (shift.name.toLowerCase().includes('day')) {
          message += ' Day shift employees can check in from 8:30 AM.';
        } else if (shift.name.toLowerCase().includes('night')) {
          message += ' Night shift employees can check in from 3:30 PM.';
        } else {
          // Custom shift - check if too early or too late
          const [endHour, endMinute] = shift.end_time.split(':').map(Number);
          const shiftEndMinutes = endHour * 60 + endMinute;
          const isOvernightShift = endHour < shiftHour || (endHour === shiftHour && endMinute < shiftMinute);
          
          if (!isOvernightShift && currentTotalMinutes > shiftEndMinutes) {
            // Too late - shift has ended
            const formattedEndTime = formatTime(shift.end_time);
            message = `Your ${shift.name} has ended at ${formattedEndTime}. You cannot check in after the shift ends.`;
          } else if (currentTotalMinutes < (shiftTotalMinutes - 30)) {
            // Too early - shift hasn't started
            message += ' You can check in 30 minutes before your shift.';
          } else {
            // Generic fallback
            message += ' You can check in 30 minutes before your shift.';
          }
        }

        setShiftValidation({
          canCheckIn: false,
          message,
          assignedShift: shift
        });
      } else {
        setShiftValidation({
          canCheckIn: true,
          message: '',
          assignedShift: shift
        });
      }

    } catch (error) {
      console.error('Error checking shift validation:', error);
      setShiftValidation({ canCheckIn: true, message: '' });
    }
  };



  useEffect(() => {
    if (!user?.id) return;

    checkShiftValidation();
    
    // Check every minute for real-time updates
    const interval = setInterval(checkShiftValidation, 60000);
    
    // Create unique channel name to avoid conflicts
    const channelName = `checkin-button-${user.id}`;
    
    // Real-time subscription for shift assignment changes
    // Add delay to avoid subscription conflicts with other components
    let subscription: any = null;
    const subscriptionTimeout = setTimeout(() => {
      subscription = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'shift_assignments',
            filter: `employee_id=eq.${user.id}`
          },
          (payload) => {
            console.log('CheckInButton: Shift assignment changed, refreshing...', payload);
            // Re-check shift validation when assignment changes
            setTimeout(checkShiftValidation, 500); // Small delay to ensure DB is updated
          }
        )
        .subscribe();
      
      console.log('✅ CheckInButton subscription created with delay');
    }, 1500); // 1.5 second delay (after CheckInContext)
    
    return () => {
      clearInterval(interval);
      
      // Clear timeout if component unmounts before subscription is created
      if (subscriptionTimeout) {
        clearTimeout(subscriptionTimeout);
      }
      
      // Unsubscribe if subscription exists
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user?.id]); // Only depend on user.id to avoid unnecessary re-subscriptions

  const alreadyCheckedIn = hasCheckedInToday(user.id);
  const currentTime = format(new Date(), 'h:mm a');
  const currentDate = format(new Date(), 'EEEE, MMMM d, yyyy');
  
  // Button should be disabled if already checked in, loading, or shift hasn't started
  const isButtonDisabled = alreadyCheckedIn || isLoading || !shiftValidation.canCheckIn;

  const handleCheckIn = async () => {
    if (isButtonDisabled) {
      if (!shiftValidation.canCheckIn && shiftValidation.message) {
        toast.warning(shiftValidation.message);
      }
      return;
    }
    
    setIsLoading(true);
    
    try {
      await checkInUser(user.id);
      setShowCheckAnimation(true);
      setTimeout(() => {
        setShowCheckAnimation(false);
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonContent = () => {
    if (alreadyCheckedIn) {
      console.log('✅ User is checked in, showing AnimatedClock');
      return (
        <div className="flex flex-col items-center">
          <AnimatedClock className="h-6 w-6 mb-1" isActive={true} animationType="normal" />
          <span>Checked In</span>
        </div>
      );
    }
    
    if (isLoading) {
      return <span className="animate-pulse">Processing...</span>;
    }
    
    if (!shiftValidation.canCheckIn) {
      return (
        <div className="flex flex-col items-center">
          <Clock className="h-6 w-6 mb-1" />
          <span className="text-sm">Not Started</span>
        </div>
      );
    }
    
    return <span>Check In</span>;
  };

  const getButtonStyle = () => {
    if (alreadyCheckedIn) {
      return 'bg-green-500 text-white hover:bg-green-600 hover:scale-105';
    }
    
    if (!shiftValidation.canCheckIn) {
      return 'bg-gray-400 text-white cursor-not-allowed';
    }
    
    return 'bg-primary hover:bg-primary/90 hover:scale-105 hover:shadow-lg';
  };

  return (
    <div className="flex flex-col items-center">
      <p className="text-xl font-bold mb-1">{currentTime}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{currentDate}</p>
      

      
      <div className="relative">
        <Button
          className={`h-32 w-32 rounded-full text-lg font-bold transition-all duration-300 transform ${getButtonStyle()} ${showCheckAnimation ? 'scale-110' : ''}`}
          disabled={isButtonDisabled}
          onClick={handleCheckIn}
        >
          {getButtonContent()}
        </Button>
        
        {showCheckAnimation && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75"></div>
          </div>
        )}
      </div>
      
      {alreadyCheckedIn && (
        <div className="mt-4 text-sm text-green-600 dark:text-green-400 animate-fade-in bg-green-50 dark:bg-green-900/20 p-2 rounded-md border border-green-100 dark:border-green-800">
          <p>You have successfully checked in for today.</p>
        </div>
      )}
      
      {!alreadyCheckedIn && !shiftValidation.canCheckIn && shiftValidation.message && (
        <div className="mt-4 text-sm text-orange-600 dark:text-orange-400 animate-fade-in bg-orange-50 dark:bg-orange-900/20 p-3 rounded-md border border-orange-200 dark:border-orange-800 text-center">
          <Clock className="h-4 w-4 mx-auto mb-1" />
          <p className="font-medium">{shiftValidation.message}</p>
          {shiftValidation.assignedShift && (
            <p className="text-xs mt-1">
              {shiftValidation.assignedShift.name} ({shiftValidation.assignedShift.start_time})
            </p>
          )}
        </div>
      )}
      
      {!alreadyCheckedIn && shiftValidation.canCheckIn && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Click the button to check in for today.</p>
      )}
    </div>
  );
};

export default CheckInButton;
