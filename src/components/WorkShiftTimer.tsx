import React, { useState, useEffect } from 'react';
import { Clock, Flame, CheckCircle, AlertTriangle } from 'lucide-react';
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

  // Find active check-in and get shift information
  useEffect(() => {
    console.log('WorkShiftTimer - Effect triggered:', {
      hasUser: !!user,
      userName: user?.name,
      userRole: user?.role,
      checkInsLength: checkIns?.length || 0
    });

    if (!user || user.role !== 'employee') {
      console.log('WorkShiftTimer - User not employee or no user');
      setActiveCheckIn(null);
      return;
    }

    if (!checkIns?.length) {
      console.log('WorkShiftTimer - No check-ins data');
      setActiveCheckIn(null);
      return;
    }

    // Find today's active check-in (not checked out yet) using work day boundaries
    const findActiveCheckIn = async () => {
      try {
        // Get work day boundaries
        const { getCurrentWorkDayBoundaries } = await import('@/lib/shiftsApi');
        const workDayBoundaries = await getCurrentWorkDayBoundaries();
        
        const todayCheckIns = checkIns.filter(ci => {
          const checkInTime = new Date(ci.timestamp);
          const isCurrentUser = ci.userId === user.id;
          const isInWorkDay = checkInTime >= workDayBoundaries.workDayStart && 
                            checkInTime < workDayBoundaries.workDayEnd;
          
          return isCurrentUser && isInWorkDay;
        });
        
        console.log('WorkShiftTimer - Work day check-ins found:', todayCheckIns.length);
        
        // Find the check-in without checkout time (still active)
        const active = todayCheckIns.find(ci => {
          const hasCheckOut = !!(ci.checkOutTime || ci.checkoutTime);
          return !hasCheckOut;
        });
        
        setActiveCheckIn(active || null);
        
        // Get shift assignment if we have an active check-in
        let assignment = null;
        if (active) {
          const today = new Date().toISOString().split('T')[0];
          const { data: assignmentData } = await supabase
            .from('shift_assignments')
            .select(`
              *,
              shifts:assigned_shift_id(name, start_time, end_time)
            `)
            .eq('employee_id', user.id)
            .eq('work_date', today)
            .single();
          
          assignment = assignmentData;
          setShiftInfo(assignmentData?.shifts || null);
        } else {
          setShiftInfo(null);
        }
        
        console.log('WorkShiftTimer - Final result:', {
          user: user.name,
          activeCheckIn: active ? {
            id: active.id,
            timestamp: active.timestamp,
            hasCheckOut: !!(active.checkOutTime || active.checkoutTime)
          } : null,
          shiftInfo: assignment?.shifts?.name || 'No shift'
        });
      } catch (error) {
        console.error('Error finding active check-in:', error);
      }
    };

    findActiveCheckIn();
  }, [user, checkIns]);

  // Timer logic - runs every second when there's an active check-in
  useEffect(() => {
    if (!activeCheckIn) {
      setTimeWorked(0);
      setIsOvertime(false);
      setOvertimeMinutes(0);
      return;
    }

    const updateTimer = () => {
      const checkInTime = new Date(activeCheckIn.timestamp);
      const now = new Date();
      
      // Check if it's 4AM (auto-checkout time)
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      if (currentHour === 4 && currentMinute === 0) {
        // Auto checkout at 4AM
        handleAutoCheckout();
        return;
      }
      
      // Calculate total time worked
      const timeWorkedMs = now.getTime() - checkInTime.getTime();
      const timeWorkedMinutes = Math.floor(timeWorkedMs / (1000 * 60));
      setTimeWorked(timeWorkedMinutes);
      
      // Determine shift type and standard work hours
      const checkInHour = checkInTime.getHours();
      let standardWorkHours = 8; // Default to 8 hours for night shift
      let shiftType = 'Night Shift';
      
      if (shiftInfo) {
        if (shiftInfo.name.toLowerCase().includes('day')) {
          standardWorkHours = 7; // Day shift is 7 hours
          shiftType = 'Day Shift';
        } else if (shiftInfo.name.toLowerCase().includes('night')) {
          standardWorkHours = 8; // Night shift is 8 hours
          shiftType = 'Night Shift';
        }
      } else {
        // Fallback logic based on check-in time
        if (checkInHour >= 9 && checkInHour < 16) {
          standardWorkHours = 7;
          shiftType = 'Day Shift';
        }
      }
      
      const standardWorkMinutes = standardWorkHours * 60;
      
      // Check if in overtime
      if (timeWorkedMinutes > standardWorkMinutes) {
        setIsOvertime(true);
        setOvertimeMinutes(timeWorkedMinutes - standardWorkMinutes);
      } else {
        setIsOvertime(false);
        setOvertimeMinutes(0);
      }
      
      console.log('WorkShiftTimer - Timer update:', {
        checkInTime: checkInTime.toISOString(),
        now: now.toISOString(),
        timeWorkedMinutes,
        standardWorkMinutes,
        shiftType,
        isOvertime: timeWorkedMinutes > standardWorkMinutes,
        overtimeMinutes: Math.max(0, timeWorkedMinutes - standardWorkMinutes)
      });
    };

    // Update immediately
    updateTimer();

    // Update every minute (60 seconds)
    const interval = setInterval(updateTimer, 60000);

    return () => clearInterval(interval);
  }, [activeCheckIn, shiftInfo]);

  // Auto checkout function
  const handleAutoCheckout = async () => {
    if (!user || !activeCheckIn) return;
    
    console.log('🔄 Auto-checkout triggered at 4AM');
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

  // Format time display
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Show debug info for any user during testing
  if (!user) {
    return null;
  }

  // For employees only
  if (user?.role === 'employee') {
    // Check if user has checked out today (show "Work Done!")
    const today = new Date().toDateString();
    const todayCheckIns = checkIns?.filter(ci => 
      ci.userId === user.id && 
      new Date(ci.timestamp).toDateString() === today
    ) || [];
    
    const hasCheckedOut = todayCheckIns.some(ci => !!(ci.checkOutTime || ci.checkoutTime));
    
    if (hasCheckedOut && !activeCheckIn) {
      return (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium bg-green-100 text-green-700 border-green-200 shadow-sm">
          <CheckCircle className="h-4 w-4" />
          <span>Work Complete! 🎉</span>
        </div>
      );
    }
    
    if (!activeCheckIn || timeWorked === 0) {
      return (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium bg-gray-100 text-gray-600 border-gray-200">
          <Clock className="h-4 w-4" />
          <span>Not Checked In</span>
        </div>
      );
    }
  } else {
    return null; // Don't show for non-employees
  }

  // Timer display for active work session
  if (isOvertime) {
    // Overtime mode - enhanced design with fire animation
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-bold bg-gradient-to-r from-red-100 to-orange-100 text-red-700 border-red-300 shadow-lg animate-pulse">
        <div className="relative">
          <Flame className="h-5 w-5 text-red-600 animate-bounce" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full animate-ping"></div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
          <span className="font-mono text-lg tracking-wider">
            {formatTime(overtimeMinutes)}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-xs font-extrabold">🔥 OVERTIME</span>
            <AlertTriangle className="h-3 w-3 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Regular work time mode
  const standardWorkMinutes = (shiftInfo?.name?.toLowerCase().includes('day') ? 7 : 8) * 60;
  const remainingMinutes = standardWorkMinutes - timeWorked;
  
  // Color coding based on remaining time
  let colorClass = 'bg-green-100 text-green-700 border-green-200';
  if (remainingMinutes <= 30) { // Last 30 minutes
    colorClass = 'bg-orange-100 text-orange-700 border-orange-300';
  } else if (remainingMinutes <= 60) { // Last hour
    colorClass = 'bg-yellow-100 text-yellow-700 border-yellow-300';
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-500 ${colorClass} shadow-sm`}>
      <Clock className="h-4 w-4" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
        <span className="font-mono font-bold text-base">
          {formatTime(timeWorked)}
        </span>
        <span className="text-xs opacity-75">
          worked ({formatTime(remainingMinutes)} left)
        </span>
      </div>
    </div>
  );
};

export default WorkShiftTimer; 