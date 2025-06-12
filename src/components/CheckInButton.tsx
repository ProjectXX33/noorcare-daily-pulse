import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useCheckIn } from '@/contexts/CheckInContext';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Check, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

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
  useEffect(() => {
    const checkShiftValidation = async () => {
      if (!user || user.position !== 'Customer Service' && user.position !== 'Designer') {
        setShiftValidation({ canCheckIn: true, message: '' });
        return;
      }

      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Get shift assignment for today
        const { data: assignment, error } = await supabase
          .from('shift_assignments')
          .select(`
            *,
            shifts:assigned_shift_id(name, start_time, end_time)
          `)
          .eq('employee_id', user.id)
          .eq('work_date', today)
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

        // Determine if employee can check in (allow 30 minutes before shift start)
        const allowEarlyMinutes = 30;
        const canCheckIn = currentTotalMinutes >= (shiftTotalMinutes - allowEarlyMinutes);

        if (!canCheckIn) {
          let message = '';
          if (shift.name.toLowerCase().includes('day')) {
            message = 'Your Day Shift starts at 9:00 AM';
          } else if (shift.name.toLowerCase().includes('night')) {
            message = 'Your Night Shift starts at 4:00 PM';
          } else {
            message = `Your shift starts at ${shift.start_time}`;
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

    checkShiftValidation();
    
    // Check every minute for real-time updates
    const interval = setInterval(checkShiftValidation, 60000);
    
    return () => clearInterval(interval);
  }, [user]);

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
      return (
        <div className="flex flex-col items-center">
          <Check className="h-6 w-6 mb-1" />
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
      <p className="text-sm text-gray-500 mb-4">{currentDate}</p>
      
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
        <div className="mt-4 text-sm text-green-600 animate-fade-in bg-green-50 p-2 rounded-md border border-green-100">
          <p>You have successfully checked in for today.</p>
        </div>
      )}
      
      {!alreadyCheckedIn && !shiftValidation.canCheckIn && shiftValidation.message && (
        <div className="mt-4 text-sm text-orange-600 animate-fade-in bg-orange-50 p-3 rounded-md border border-orange-200 text-center">
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
        <p className="mt-4 text-sm text-gray-500">Click the button to check in for today.</p>
      )}
    </div>
  );
};

export default CheckInButton;
