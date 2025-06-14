import React, { useState, useEffect } from 'react';
import { Clock, Flame, CheckCircle, AlertTriangle, Play, Timer, ArrowDown, AlertCircle } from 'lucide-react';
import { useCheckIn } from '@/contexts/CheckInContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const WorkShiftTimer: React.FC = () => {
  const { user } = useAuth();
  const { checkIns, checkOutUser } = useCheckIn();
  const [activeCheckIn, setActiveCheckIn] = useState<any>(null);
  const [timeWorked, setTimeWorked] = useState<number>(0);
  const [isOvertime, setIsOvertime] = useState<boolean>(false);
  const [overtimeMinutes, setOvertimeMinutes] = useState<number>(0);
  const [shiftInfo, setShiftInfo] = useState<any>(null);
  
  // New states for post-checkout tracking
  const [postCheckoutTime, setPostCheckoutTime] = useState<number>(0);
  const [isPostCheckout, setIsPostCheckout] = useState<boolean>(false);
  const [checkoutTime, setCheckoutTime] = useState<Date | null>(null);

  // Find active check-in using work day boundaries (4AM to 4AM)
  useEffect(() => {
    const findActiveCheckIn = async () => {
      if (!user?.id || !checkIns.length) return;
      
      // Calculate current work day boundaries (4AM to 4AM)
      const now = new Date();
      const currentHour = now.getHours();
      
      // Work day starts at 4AM and ends at 4AM next day
      const workDayStart = new Date(now);
      if (currentHour >= 4) {
        // After 4AM today - work day started today at 4AM
        workDayStart.setHours(4, 0, 0, 0);
      } else {
        // Before 4AM today - work day started yesterday at 4AM
        workDayStart.setDate(workDayStart.getDate() - 1);
        workDayStart.setHours(4, 0, 0, 0);
      }
      
      const workDayEnd = new Date(workDayStart);
      workDayEnd.setDate(workDayEnd.getDate() + 1);
      
             // Find check-ins within current work day
       const workDayCheckIns = checkIns.filter(ci => {
         const checkInTime = new Date(ci.timestamp);
         return ci.userId === user.id && 
                checkInTime >= workDayStart && 
                checkInTime < workDayEnd;
       });
      
      // Find the most recent check-in for current work day
      const latestCheckIn = workDayCheckIns.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];
      
      if (latestCheckIn) {
        // Check if this check-in has been checked out
        const hasCheckedOut = !!(latestCheckIn.checkOutTime || latestCheckIn.checkoutTime);
        
        
        
        if (hasCheckedOut) {
          // User has checked out - stop all tracking
          setIsPostCheckout(false);
          setPostCheckoutTime(0);
          setCheckoutTime(null);
          setActiveCheckIn(null);
        } else {
          // Still checked in
          setIsPostCheckout(false);
          setPostCheckoutTime(0);
          setCheckoutTime(null);
          setActiveCheckIn(latestCheckIn);
        }
        
                // Get user's assigned shift information with multiple lookup strategies
        try {
          // Strategy 1: Get TODAY's shift assignment from shift_assignments table
          const today = new Date().toISOString().split('T')[0];
          const { data: todayAssignment } = await supabase
            .from('shift_assignments')
            .select('assigned_shift_id, is_day_off, shifts:assigned_shift_id(*)')
            .eq('employee_id', user.id)
            .eq('work_date', today)
            .single();
          
          if (todayAssignment && !todayAssignment.is_day_off && todayAssignment.shifts) {
            setShiftInfo(todayAssignment.shifts);
            return;
          }
          
          if (todayAssignment && todayAssignment.is_day_off) {
            setShiftInfo(null);
            return;
          }
          
          // Strategy 2: Fallback to monthly_shifts table
          const { data: monthlyShift } = await supabase
            .from('monthly_shifts')
            .select('shift_id, shifts:shift_id(*)')
            .eq('user_id', user.id)
            .eq('work_date', today)
            .single();
          
          if (monthlyShift && monthlyShift.shifts) {
            setShiftInfo(monthlyShift.shifts);
            return;
          }
          
          // Strategy 3: Get the most recent shift assignment from shift_assignments
          const { data: recentAssignment } = await supabase
            .from('shift_assignments')
            .select('assigned_shift_id, is_day_off, shifts:assigned_shift_id(*)')
            .eq('employee_id', user.id)
            .not('is_day_off', 'eq', true)
            .order('work_date', { ascending: false })
            .limit(1);
          
          if (recentAssignment && recentAssignment.length > 0 && recentAssignment[0].shifts) {
            setShiftInfo(recentAssignment[0].shifts);
            return;
          }
          
          // Strategy 4: Fallback to check-in time detection
          const { data: shifts } = await supabase
            .from('shifts')
            .select('*');
          
          if (shifts && latestCheckIn) {
            const checkInTime = new Date(latestCheckIn.timestamp);
            const detectedShift = shifts.find(shift => {
              const [startHour, startMin] = shift.start_time.split(':').map(Number);
              const [endHour, endMin] = shift.end_time.split(':').map(Number);
              
              const shiftStart = new Date(checkInTime);
              shiftStart.setHours(startHour, startMin, 0, 0);
              
              const shiftEnd = new Date(checkInTime);
              shiftEnd.setHours(endHour, endMin, 0, 0);
              
              if (endHour < startHour) {
                shiftEnd.setDate(shiftEnd.getDate() + 1);
              }
              
              const tolerance = 2 * 60 * 60 * 1000; // 2 hours tolerance
              return checkInTime >= new Date(shiftStart.getTime() - tolerance) && 
                     checkInTime <= new Date(shiftStart.getTime() + tolerance);
            });
            
            setShiftInfo(detectedShift);
          }
        } catch (error) {
          console.error('Error fetching shift info:', error);
        }
      } else {
        setActiveCheckIn(null);
        setIsPostCheckout(false);
        setPostCheckoutTime(0);
        setCheckoutTime(null);
      }
    };

    findActiveCheckIn();
  }, [user, checkIns]);

  // Subscribe to real-time changes in shift_assignments to detect shift assignment changes
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel('shift_assignments_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'shift_assignments',
          filter: `employee_id=eq.${user.id}`
        }, 
        (payload) => {
          // Trigger a re-fetch of shift info when assignments change
          setTimeout(() => {
            setShiftInfo(null);
            window.location.reload();
          }, 500);
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'monthly_shifts',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          // Also listen to monthly_shifts as fallback
          setTimeout(() => {
            setShiftInfo(null);
            window.location.reload();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);



  // Enhanced timer logic - runs every second for real-time updates
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      
      // Check if it's 4AM (auto-checkout time)
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      if (currentHour === 4 && currentMinute === 0 && activeCheckIn) {
        // Auto checkout at 4AM
        handleAutoCheckout();
        return;
      }
      
      // Regular timer for active check-ins only
      if (activeCheckIn) {
        // Regular check-in tracking
        const checkInTime = new Date(activeCheckIn.timestamp);
        
        // Calculate total time worked in seconds for more precision
        const timeWorkedMs = now.getTime() - checkInTime.getTime();
        const timeWorkedSeconds = Math.floor(timeWorkedMs / 1000);
        setTimeWorked(timeWorkedSeconds);
        
        // Determine shift type based on database assignment (shiftInfo) or fallback to check-in time
        const checkInHour = checkInTime.getHours();
        let shiftType = 'night'; // Default to night shift
        
        // Use database shift assignment if available
        console.log('🔍 Shift Info Debug:', {
          shiftInfo: shiftInfo,
          shiftInfoName: shiftInfo?.name,
          hasShiftInfo: !!shiftInfo,
          activeCheckInId: activeCheckIn?.id
        });
        
        if (shiftInfo && shiftInfo.name) {
          if (shiftInfo.name.toLowerCase().includes('day')) {
            shiftType = 'day';
          } else if (shiftInfo.name.toLowerCase().includes('night')) {
            shiftType = 'night';
          }
          console.log('✅ Using database shift assignment:', shiftInfo.name, '→', shiftType);
        } else {
          // Fallback to check-in time based detection
          // Day shift: 8:30AM to 4PM (check-in window: 8:30AM+, shift: 9AM-4PM)
          // Night shift: 3:30PM to 12AM (check-in window: 3:30PM+, shift: 4PM-12AM)
          if (checkInHour >= 8 && checkInHour < 16) {
            shiftType = 'day';
          } else {
            shiftType = 'night';
          }
          console.log('⚠️ Using fallback check-in time detection:', checkInHour, '→', shiftType);
        }
        
        // Calculate shift end time based on shift type
        let shiftEndTime;
        
        if (shiftType === 'day') {
          // Day shift: 9AM to 4PM - ends at 4PM same day
          shiftEndTime = new Date(checkInTime);
          shiftEndTime.setHours(16, 0, 0, 0); // 4PM
        } else {
          // Night shift: 4PM to 12AM (midnight)
          shiftEndTime = new Date(checkInTime);
          
          if (checkInHour >= 15) {
            // Checked in during afternoon/evening (3:30PM+)
            // Shift ends at midnight (start of next day)
            shiftEndTime.setDate(shiftEndTime.getDate() + 1);
            shiftEndTime.setHours(0, 0, 0, 0); // Midnight next day
          } else if (checkInHour < 4) {
            // Checked in during early morning (12AM-3:59AM) - overtime period
            // Shift already ended at midnight, so they're in overtime
            shiftEndTime.setHours(0, 0, 0, 0); // Midnight of current day
          } else {
            // Checked in during morning (4AM-2:59PM) but classified as night shift
            // This is unusual, default to next midnight
            shiftEndTime.setDate(shiftEndTime.getDate() + 1);
            shiftEndTime.setHours(0, 0, 0, 0);
          }
        }
        
        // Check if in overtime (current time is after shift end time)
        if (now > shiftEndTime) {
          setIsOvertime(true);
          const overtimeMs = now.getTime() - shiftEndTime.getTime();
          const overtimeMinutesCalc = Math.floor(overtimeMs / (1000 * 60));
          setOvertimeMinutes(overtimeMinutesCalc);
        } else {
          setIsOvertime(false);
          setOvertimeMinutes(0);
        }
      } else {
        // No active session
        setTimeWorked(0);
        setIsOvertime(false);
        setOvertimeMinutes(0);
        setPostCheckoutTime(0);
      }
    };

    // Update immediately
    updateTimer();

    // Update every second for real-time experience
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeCheckIn, shiftInfo, isPostCheckout, checkoutTime]);

  // Auto checkout function
  const handleAutoCheckout = async () => {
    if (!user || !activeCheckIn) return;
    
    try {
      await checkOutUser(user.id);
      toast.success('⏰ Auto checked-out at 4AM (work day reset)', {
        duration: 6000,
      });
    } catch (error) {
      console.error('Auto-checkout failed:', error);
      toast.error('Failed to auto checkout. Please manually check out.');
    }
  };

  // Function to record post-checkout overtime
  const recordPostCheckoutOvertime = async () => {
    if (!user || !checkoutTime || postCheckoutTime <= 0) return;
    
    try {
      const overtimeHours = postCheckoutTime / 3600; // Convert seconds to hours
      const today = new Date().toDateString();
      const workDate = new Date(today);
      
      // First get the current overtime hours
      const { data: currentRecord, error: fetchError } = await supabase
        .from('monthly_shifts')
        .select('overtime_hours')
        .eq('user_id', user.id)
        .eq('work_date', workDate.toISOString().split('T')[0])
        .single();

      if (fetchError) {
        console.error('Error fetching current overtime:', fetchError);
        toast.error('Failed to fetch current overtime hours');
        return;
      }

      const newOvertimeTotal = (currentRecord.overtime_hours || 0) + overtimeHours;

      // Update the monthly shift record with additional overtime
      const { error: updateError } = await supabase
        .from('monthly_shifts')
        .update({
          overtime_hours: newOvertimeTotal,
          updated_at: new Date().toISOString(),
          additional_overtime_recorded: true
        })
        .eq('user_id', user.id)
        .eq('work_date', workDate.toISOString().split('T')[0]);

      if (updateError) {
        console.error('Error updating overtime:', updateError);
        toast.error('Failed to record additional overtime');
        return;
      }

      // Reset post-checkout tracking
      setPostCheckoutTime(0);
      setIsPostCheckout(false);
      setIsOvertime(false);
      setOvertimeMinutes(0);
      
      toast.success(`✅ Additional ${overtimeHours.toFixed(2)} hours of overtime recorded!`, {
        duration: 4000,
      });
      
    } catch (error) {
      console.error('Error recording post-checkout overtime:', error);
      toast.error('Failed to record additional overtime');
    }
  };

  // Enhanced time formatting with seconds
  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format countdown time (hours:minutes:seconds)
  const formatCountdown = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format time without seconds for remaining time
  const formatTimeMinutes = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Show debug info for any user during testing
  if (!user) {
    return null;
  }



  // For employees only
  if (user?.role === 'employee') {
    // Check if user has checked out today (show "Work Done!") using work day boundaries
    const now = new Date();
    const currentHour = now.getHours();
    
    // Work day starts at 4AM and ends at 4AM next day
    const workDayStart = new Date(now);
    if (currentHour >= 4) {
      // After 4AM today - work day started today at 4AM
      workDayStart.setHours(4, 0, 0, 0);
    } else {
      // Before 4AM today - work day started yesterday at 4AM
      workDayStart.setDate(workDayStart.getDate() - 1);
      workDayStart.setHours(4, 0, 0, 0);
    }
    
    const workDayEnd = new Date(workDayStart);
    workDayEnd.setDate(workDayEnd.getDate() + 1);
    
    const todayCheckIns = checkIns?.filter(ci => {
      const checkInTime = new Date(ci.timestamp);
      return ci.userId === user.id && 
             checkInTime >= workDayStart && 
             checkInTime < workDayEnd;
    }) || [];
    
    const hasCheckedOut = todayCheckIns.some(ci => !!(ci.checkOutTime || ci.checkoutTime));
    
    if (hasCheckedOut && !activeCheckIn) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-300 shadow-sm">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span>Work Complete! 🎉</span>
        </div>
      );
    }
    
    if (!activeCheckIn || timeWorked === 0) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium bg-gradient-to-r from-slate-100 to-gray-100 text-slate-600 border-slate-300 shadow-sm">
          <Clock className="h-4 w-4 text-slate-500" />
          <span>Not Checked In</span>
        </div>
      );
    }
  } else {
    return null; // Don't show for non-employees
  }

  // Enhanced timer display for active work session
  if (isOvertime) {
    // Overtime mode - no flashing, solid design
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 text-xs font-bold bg-gradient-to-r from-red-50 to-orange-50 text-red-700 border-red-400 shadow-md">
        <Flame className="h-4 w-4 text-red-600" />
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm tracking-wide text-red-800">
            +{formatTimeMinutes(overtimeMinutes * 60)}
          </span>
          <span className="hidden sm:inline text-xs font-extrabold text-red-600">OVERTIME</span>
          {/* Full timer on desktop */}
          <span className="hidden sm:inline text-xs opacity-75 ml-1">
            ({formatTime(timeWorked)} total)
          </span>
        </div>
      </div>
    );
  }

  // Regular work time mode with countdown to shift end
  const checkInTime = new Date(activeCheckIn.timestamp);
  const checkInHour = checkInTime.getHours();
  
  // Use the same shift end time calculation logic as in overtime calculation
  let shiftEndTime;
  let shiftType = 'day'; // Default
  
  // Use database shift assignment if available
  if (shiftInfo && shiftInfo.name) {
    if (shiftInfo.name.toLowerCase().includes('day')) {
      shiftType = 'day';
    } else if (shiftInfo.name.toLowerCase().includes('night')) {
      shiftType = 'night';
    }
  } else {
    // Fallback to check-in time based detection
    shiftType = (checkInHour >= 8 && checkInHour < 16) ? 'day' : 'night';
  }
  
  if (shiftType === 'day') {
    // Day shift: 9AM to 4PM - ends at 4PM same day
    shiftEndTime = new Date(checkInTime);
    shiftEndTime.setHours(16, 0, 0, 0); // 4PM
  } else {
    // Night shift: 4PM to 12AM (midnight)
    shiftEndTime = new Date(checkInTime);
    
    if (checkInHour >= 15) {
      // Checked in during afternoon/evening (3:30PM+)
      // Shift ends at midnight (start of next day)
      shiftEndTime.setDate(shiftEndTime.getDate() + 1);
      shiftEndTime.setHours(0, 0, 0, 0); // Midnight next day
    } else if (checkInHour < 4) {
      // Checked in during early morning (12AM-3:59AM) - overtime period
      shiftEndTime.setHours(0, 0, 0, 0); // Midnight of current day
    } else {
      // Checked in during morning but classified as night shift
      shiftEndTime.setDate(shiftEndTime.getDate() + 1);
      shiftEndTime.setHours(0, 0, 0, 0);
    }
  }
  
  const now = new Date();
  const remainingMs = Math.max(0, shiftEndTime.getTime() - now.getTime());
  const remainingSeconds = Math.floor(remainingMs / 1000);
  
  const totalShiftMs = shiftEndTime.getTime() - checkInTime.getTime();
  const elapsedMs = now.getTime() - checkInTime.getTime();
  const progressPercentage = Math.min(100, (elapsedMs / totalShiftMs) * 100);
  
  // Dynamic color coding based on remaining time
  let colorClass = 'from-emerald-50 to-green-50 text-emerald-700 border-emerald-300';
  let iconColor = 'text-emerald-600';
  let progressColor = 'bg-emerald-500';
  let progressBgColor = 'bg-emerald-100/50';
  
  if (remainingSeconds <= 30 * 60) { // Last 30 minutes
    colorClass = 'from-orange-50 to-amber-50 text-orange-700 border-orange-400';
    iconColor = 'text-orange-600';
    progressColor = 'bg-orange-500';
    progressBgColor = 'bg-orange-100/50';
  } else if (remainingSeconds <= 60 * 60) { // Last hour
    colorClass = 'from-yellow-50 to-amber-50 text-yellow-700 border-yellow-400';
    iconColor = 'text-yellow-600';
    progressColor = 'bg-yellow-500';
    progressBgColor = 'bg-yellow-100/50';
  }

  return (
    <div className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold bg-gradient-to-r ${colorClass} shadow-sm overflow-hidden`}>
      {/* Compact progress bar with matching colors */}
      <div className={`absolute bottom-0 left-0 h-0.5 ${progressBgColor} w-full`}>
        <div 
          className={`h-full ${progressColor} transition-all duration-1000 ease-out`}
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      
      <Timer className={`h-4 w-4 ${iconColor}`} />
      
      <div className="flex items-center gap-2">
        {/* Countdown Timer */}
        <div className="flex items-center gap-1">
          <ArrowDown className="h-3 w-3 opacity-60" />
          <span className="font-mono text-sm tracking-wide font-bold">
            {formatCountdown(remainingSeconds)}
          </span>
        </div>
        
        {/* Worked Time (smaller) - Hidden on mobile */}
        <div className="hidden sm:block text-xs opacity-75">
          ({formatTime(timeWorked)} worked)
        </div>
      </div>
    </div>
  );
};

export default WorkShiftTimer; 