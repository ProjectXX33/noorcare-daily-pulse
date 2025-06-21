import React, { useState, useEffect } from 'react';
import { Clock, Flame, CheckCircle, AlertTriangle, Play, Timer, ArrowDown, AlertCircle, Coffee } from 'lucide-react';
import { useCheckIn } from '@/contexts/CheckInContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { AnimatedClock } from '@/components/AnimatedClock';
import { AnimatedFire } from '@/components/AnimatedFire';

const WorkShiftTimer: React.FC = () => {
  const { user } = useAuth();
  const { checkIns, checkOutUser } = useCheckIn();
  const [activeCheckIn, setActiveCheckIn] = useState<any>(null);
  const [timeWorked, setTimeWorked] = useState<number>(0);
  const [isOvertime, setIsOvertime] = useState<boolean>(false);
  const [overtimeMinutes, setOvertimeMinutes] = useState<number>(0);
  const [shiftInfo, setShiftInfo] = useState<any>(null);
  
  // Break time tracking states (for display only, not freezing)
  const [isOnBreak, setIsOnBreak] = useState<boolean>(false);
  const [totalBreakTime, setTotalBreakTime] = useState<number>(0);
  const [currentBreakStartTime, setCurrentBreakStartTime] = useState<Date | null>(null);
  const [currentBreakDuration, setCurrentBreakDuration] = useState<number>(0);

  // Function to check break status from database
  const checkBreakStatus = async (checkInId: string) => {
    try {
      const { data, error } = await supabase
        .from('check_ins')
        .select('is_on_break, total_break_minutes, break_start_time')
        .eq('id', checkInId)
        .single();

      if (error) throw error;

      if (data) {
        const breakStatus = data.is_on_break || false;
        const breakTime = (data.total_break_minutes || 0) * 60; // Convert minutes to seconds
        const breakStartTime = data.break_start_time ? new Date(data.break_start_time) : null;
        
        console.log('🔄 Break status loaded from DB:', {
          isOnBreak: breakStatus,
          totalBreakMinutes: data.total_break_minutes,
          totalBreakSeconds: breakTime,
          breakStartTime: breakStartTime?.toISOString()
        });
        
        setIsOnBreak(breakStatus);
        setTotalBreakTime(breakTime);
        setCurrentBreakStartTime(breakStartTime);
      }
    } catch (error) {
      console.error('Error checking break status:', error);
    }
  };
  
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
          setIsOnBreak(false);
          setTotalBreakTime(0);
        } else {
          // Still checked in - check break status
          setIsPostCheckout(false);
          setPostCheckoutTime(0);
          setCheckoutTime(null);
          setActiveCheckIn(latestCheckIn);
          
          // Check break status from database
          checkBreakStatus(latestCheckIn.id);
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

  // Monitor changes in checkIns context data for break status updates
  useEffect(() => {
    if (!activeCheckIn || !checkIns.length) return;

    // Find the current check-in in the updated context data
    const updatedCheckIn = checkIns.find(ci => ci.id === activeCheckIn.id);
    
    if (updatedCheckIn) {
      // Update break status from context data
      const contextIsOnBreak = updatedCheckIn.isOnBreak || false;
      const contextTotalBreakMinutes = updatedCheckIn.totalBreakMinutes || 0;
      const contextBreakStartTime = updatedCheckIn.breakStartTime;

      console.log('🔄 Break status updated from context:', {
        checkInId: activeCheckIn.id,
        wasOnBreak: isOnBreak,
        nowOnBreak: contextIsOnBreak,
        totalBreakMinutes: contextTotalBreakMinutes,
        breakStartTime: contextBreakStartTime
      });

      // Update break state if it changed
      if (isOnBreak !== contextIsOnBreak) {
        setIsOnBreak(contextIsOnBreak);
        
        if (contextIsOnBreak && contextBreakStartTime) {
          setCurrentBreakStartTime(new Date(contextBreakStartTime));
        } else if (!contextIsOnBreak) {
          setCurrentBreakStartTime(null);
        }
      }

      // Update total break time
      setTotalBreakTime(contextTotalBreakMinutes * 60); // Convert minutes to seconds
    }
  }, [checkIns, activeCheckIn?.id, isOnBreak]);

  // Subscribe to real-time changes in shift_assignments and check_ins for break tracking
  useEffect(() => {
    if (!user?.id) return;

    // Create unique channel name to avoid conflicts with AdminShiftManagement
    const channelName = `work-shift-timer-${user.id}`;

    // Add delay to avoid subscription conflicts with other components
    let subscription: any = null;
    const subscriptionTimeout = setTimeout(() => {
      subscription = supabase
        .channel(channelName)
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
        // Note: Removed check_ins subscription to avoid conflicts with CheckInContext
        // Break status updates will be handled through CheckInContext data refresh
        .subscribe();
      
      console.log('✅ WorkShiftTimer subscription created with delay');
    }, 2000); // 2 second delay (after CheckInContext and CheckInButton)

    return () => {
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

  // Real-time break timer - updates current break duration every second
  useEffect(() => {
    if (!isOnBreak || !currentBreakStartTime) {
      setCurrentBreakDuration(0);
      return;
    }

    const updateBreakTimer = () => {
      const now = new Date();
      const breakDurationMs = now.getTime() - currentBreakStartTime.getTime();
      const breakDurationSeconds = Math.max(0, Math.floor(breakDurationMs / 1000));
      setCurrentBreakDuration(breakDurationSeconds);
    };

    // Update immediately
    updateBreakTimer();

    // Update every second
    const interval = setInterval(updateBreakTimer, 1000);

    return () => clearInterval(interval);
  }, [isOnBreak, currentBreakStartTime]);

  // Enhanced timer logic - runs every second for real-time updates
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      
      // Regular timer for active check-ins only
      if (activeCheckIn) {
        // Regular check-in tracking
        const checkInTime = new Date(activeCheckIn.timestamp);
        
        // FREEZE MODE: Work time calculation with proper break handling
        const totalElapsedTimeMs = now.getTime() - checkInTime.getTime();
        const totalElapsedSeconds = Math.floor(totalElapsedTimeMs / 1000);
        
        let actualWorkSeconds;
        
        if (isOnBreak) {
          // FROZEN: When on break, work time stops counting
          // Calculate work time up to the break start point
          if (currentBreakStartTime) {
            const workTimeBeforeBreak = Math.floor((currentBreakStartTime.getTime() - checkInTime.getTime()) / 1000);
            actualWorkSeconds = Math.max(0, workTimeBeforeBreak - totalBreakTime);
          } else {
            // Fallback if no break start time
            actualWorkSeconds = Math.max(0, totalElapsedSeconds - totalBreakTime);
          }
        } else {
          // RUNNING: When working, subtract all completed break time from total elapsed
          actualWorkSeconds = Math.max(0, totalElapsedSeconds - totalBreakTime);
        }
        
        // FREEZE MODE: Work time freezes during breaks, continues when resumed
        setTimeWorked(actualWorkSeconds);
        
        console.log('⏱️ FREEZE MODE: Work time calculation:', {
          totalElapsedSeconds,
          totalBreakTimeSeconds: totalBreakTime,
          actualWorkSeconds,
          mode: isOnBreak ? '🟡 FROZEN (on break - timer stopped)' : '🟢 RUNNING (working - timer counting)',
          breakStatus: isOnBreak ? 'Timer frozen at break start' : 'Timer running normally',
          currentBreakStartTime: currentBreakStartTime?.toISOString()
        });
        
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
          // Night shift: 4PM to 4AM (next day) - NEW LOGIC: ends at 4AM
          shiftEndTime = new Date(checkInTime);
          
          if (checkInHour >= 15) {
            // Checked in during afternoon/evening (3:30PM+)
            // Shift ends at 4AM next day (not midnight)
            shiftEndTime.setDate(shiftEndTime.getDate() + 1);
            shiftEndTime.setHours(4, 0, 0, 0); // 4AM next day
          } else if (checkInHour < 4) {
            // Checked in during early morning (12AM-3:59AM) - still in previous day's shift
            // Shift ends at 4AM current day
            shiftEndTime.setHours(4, 0, 0, 0); // 4AM current day
          } else {
            // Checked in during morning (4AM-2:59PM) but classified as night shift
            // This would be unusual, default to next 4AM
            shiftEndTime.setDate(shiftEndTime.getDate() + 1);
            shiftEndTime.setHours(4, 0, 0, 0); // 4AM next day
          }
        }
        
        // NEW OVERTIME LOGIC: Overtime starts ONLY after completing required shift hours
        // Not based on time-of-day, but on hours worked (counter-based)
        const minimumHoursForOvertime = shiftType === 'day' ? 7 : 8; // Day shift: 7 hours, Night shift: 8 hours
        const hoursWorked = actualWorkSeconds / 3600; // Convert actual work seconds (excluding breaks) to hours
        
        // Check if overtime should start (based on hours worked, not time-of-day)
        if (hoursWorked >= minimumHoursForOvertime) {
          // Completed required shift hours - NOW overtime starts
          setIsOvertime(true);
          const overtimeSeconds = actualWorkSeconds - (minimumHoursForOvertime * 3600);
          const overtimeMinutesCalc = Math.floor(overtimeSeconds / 60);
          setOvertimeMinutes(overtimeMinutesCalc);
          
          console.log('🔥 OVERTIME ACTIVATED (Counter-based):', {
            shiftType,
            minimumHoursRequired: minimumHoursForOvertime,
            hoursWorked: hoursWorked.toFixed(2),
            overtimeHours: (overtimeSeconds / 3600).toFixed(2),
            logic: 'Overtime starts after completing ' + minimumHoursForOvertime + ' hours'
          });
        } else {
          // Still working on required hours - no overtime yet
          setIsOvertime(false);
          setOvertimeMinutes(0);
          
          console.log('⏱️ REGULAR TIME (Counter-based):', {
            shiftType,
            minimumHoursRequired: minimumHoursForOvertime,
            hoursWorked: hoursWorked.toFixed(2),
            remainingHours: (minimumHoursForOvertime - hoursWorked).toFixed(2),
            logic: 'Need to complete ' + minimumHoursForOvertime + ' hours before overtime'
          });
        }
        
        // Auto-checkout at 4AM regardless of hours worked
        if (now.getHours() === 4 && now.getMinutes() === 0) {
          console.log('🕐 4AM AUTO-CHECKOUT triggered');
          handleAutoCheckout();
          return;
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
  }, [activeCheckIn, shiftInfo, isPostCheckout, checkoutTime, isOnBreak, totalBreakTime, currentBreakStartTime, currentBreakDuration]);

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



  // For employees only (excluding Media Buyers who don't use check-in/out)
  if (user?.role === 'employee' && user?.position !== 'Media Buyer') {
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
    return null; // Don't show for non-employees or Media Buyers
  }

  // Enhanced timer display for active work session
  if (isOvertime) {
    // Overtime mode - no flashing, solid design
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 text-xs font-bold bg-gradient-to-r from-red-50 to-orange-50 text-red-700 border-red-400 shadow-md">
        <AnimatedFire className="h-6 w-6 text-red-600" />
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

  // Check if working past shift hours but haven't reached minimum for overtime
  const currentTime = new Date();
  const sessionStartTime = new Date(activeCheckIn.timestamp);
  const sessionStartHour = sessionStartTime.getHours();
  
  // Determine shift type and end time
  let currentShiftType = 'day';
  let shiftEndTime = new Date(sessionStartTime);
  
  if (shiftInfo && shiftInfo.name) {
    if (shiftInfo.name.toLowerCase().includes('day')) {
      currentShiftType = 'day';
      shiftEndTime.setHours(16, 0, 0, 0); // 4PM
    } else if (shiftInfo.name.toLowerCase().includes('night')) {
      currentShiftType = 'night';
      if (sessionStartHour >= 15) {
        shiftEndTime.setDate(shiftEndTime.getDate() + 1);
        shiftEndTime.setHours(4, 0, 0, 0); // 4AM next day (not midnight)
      } else {
        shiftEndTime.setHours(4, 0, 0, 0); // 4AM current day (not midnight)
      }
    }
  } else {
    // Fallback detection
    if (sessionStartHour >= 8 && sessionStartHour < 16) {
      currentShiftType = 'day';
      shiftEndTime.setHours(16, 0, 0, 0); // 4PM
    } else {
      currentShiftType = 'night';
      if (sessionStartHour >= 15) {
        shiftEndTime.setDate(shiftEndTime.getDate() + 1);
        shiftEndTime.setHours(4, 0, 0, 0); // 4AM next day (not midnight)
      } else {
        shiftEndTime.setHours(4, 0, 0, 0); // 4AM current day (not midnight)
      }
    }
  }

  const minimumHoursForOvertime = currentShiftType === 'day' ? 7 : 8;
  const hoursWorked = timeWorked / 3600;
  
  // Show "Extended Work" state when past shift hours but haven't reached minimum overtime hours
  if (currentTime > shiftEndTime && hoursWorked < minimumHoursForOvertime) {
    const hoursNeeded = minimumHoursForOvertime - hoursWorked;
    const secondsNeeded = Math.ceil(hoursNeeded * 3600); // Convert to seconds and round up
    
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 text-xs font-bold bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border-amber-400 shadow-md">
        <AnimatedClock className="h-4 w-4 text-amber-600" isActive={true} animationType="warning" />
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm tracking-wide text-amber-800">
            {formatCountdown(secondsNeeded)}
          </span>

        </div>
      </div>
    );
  }

  // Show break time counter if currently on break
  if (isOnBreak) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 text-xs font-bold bg-gradient-to-r from-orange-50 to-yellow-50 text-orange-700 border-orange-400 shadow-md">
        <Coffee className="h-4 w-4 text-orange-600" />
        <div className="flex items-center gap-2">
          {/* Desktop: Show "ON BREAK" text */}
          <span className="hidden sm:inline text-xs font-bold text-orange-800">
            ON BREAK
          </span>
          {/* Both: Show break time counter */}
          <span className="font-mono text-sm tracking-wide text-orange-800">
            {formatTime(currentBreakDuration)}
          </span>
        </div>
      </div>
    );
  }

  // Regular work time mode with countdown from full shift duration
  const checkInTime = new Date(activeCheckIn.timestamp);
  const checkInHour = checkInTime.getHours();
  
  // Determine shift type and duration
  let shiftType = 'day'; // Default
  let shiftDurationHours = 7; // Default day shift duration
  
  // Use database shift assignment if available
  if (shiftInfo && shiftInfo.name) {
    if (shiftInfo.name.toLowerCase().includes('day')) {
      shiftType = 'day';
      shiftDurationHours = 7; // Day shift = 7 hours
    } else if (shiftInfo.name.toLowerCase().includes('night')) {
      shiftType = 'night';
      shiftDurationHours = 8; // Night shift = 8 hours
    }
  } else {
    // Fallback to check-in time based detection
    if (checkInHour >= 8 && checkInHour < 16) {
      shiftType = 'day';
      shiftDurationHours = 7; // Day shift = 7 hours
    } else {
      shiftType = 'night';
      shiftDurationHours = 8; // Night shift = 8 hours
    }
  }
  
  // Calculate countdown from full shift duration (FREEZE MODE: Use actual work time, not elapsed time)
  const shiftDurationSeconds = shiftDurationHours * 3600; // Convert hours to seconds
  
  // FREEZE MODE: Use timeWorked (actual work time excluding breaks) instead of elapsed time
  // Remaining time = Full shift duration - actual work time (this freezes during breaks)
  const remainingSeconds = Math.max(0, shiftDurationSeconds - timeWorked);
  
  // Debug logging
  console.log('⏰ Timer Debug (FREEZE MODE):', {
    shiftType,
    shiftDurationHours,
    shiftDurationSeconds,
    timeWorked: timeWorked + 's',
    timeWorkedMinutes: Math.floor(timeWorked / 60),
    remainingSeconds,
    remainingMinutes: Math.floor(remainingSeconds / 60),
    isOnBreak: isOnBreak ? '(FROZEN - on break)' : '(RUNNING)',
    checkInTime: checkInTime.toISOString(),
    shiftInfo: shiftInfo?.name
  });
  
  // Progress calculation (FREEZE MODE: Use actual work time)
  const progressPercentage = Math.min(100, (timeWorked / shiftDurationSeconds) * 100);
  
  // Dynamic color coding based on remaining time
  let colorClass = 'from-emerald-50 to-green-50 text-emerald-700 border-emerald-300';
  let iconColor = 'text-emerald-600';
  let progressColor = 'bg-emerald-500';
  let progressBgColor = 'bg-emerald-100/50';
  let isClockActive = false; // Clock animation only when time is running low
  let animationType: 'normal' | 'warning' | 'urgent' = 'normal';
  
  if (remainingSeconds <= 30 * 60) { // Last 30 minutes - URGENT (RED/ORANGE)
    colorClass = 'from-red-50 to-orange-50 text-red-700 border-red-400';
    iconColor = 'text-red-600';
    progressColor = 'bg-red-500';
    progressBgColor = 'bg-red-100/50';
    isClockActive = true;
    animationType = 'urgent'; // Use 3minuts animation
  } else if (remainingSeconds <= 60 * 60) { // Last 60 minutes - WARNING (YELLOW/AMBER)
    colorClass = 'from-yellow-50 to-amber-50 text-yellow-700 border-yellow-400';
    iconColor = 'text-yellow-600';
    progressColor = 'bg-yellow-500';
    progressBgColor = 'bg-yellow-100/50';
    isClockActive = true;
    animationType = 'warning'; // Use 1hour animation
  }
  // ELSE: Normal work time stays GREEN (emerald) - the default colors above

  // Log clock animation state for debugging
  if (isClockActive) {
    console.log(`🟡 Clock Animation ACTIVE - Type: ${animationType} - Remaining:`, Math.floor(remainingSeconds / 60), 'minutes');
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
      
      <AnimatedClock className={`h-4 w-4 ${iconColor}`} isActive={isClockActive} animationType={animationType} />
      
      <div className="flex items-center gap-2">
        {/* Countdown Timer */}
        <div className="flex items-center gap-1">
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