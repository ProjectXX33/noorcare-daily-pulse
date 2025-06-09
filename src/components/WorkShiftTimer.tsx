import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useCheckIn } from '@/contexts/CheckInContext';
import { useAuth } from '@/contexts/AuthContext';

const WorkShiftTimer: React.FC = () => {
  const { user } = useAuth();
  const { checkIns } = useCheckIn();
  const [activeCheckIn, setActiveCheckIn] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Find active check-in from database data
  useEffect(() => {
    console.log('WorkShiftTimer - Effect triggered:', {
      hasUser: !!user,
      userName: user?.name,
      userRole: user?.role,
      checkInsLength: checkIns?.length || 0,
      checkInsData: checkIns?.slice(0, 3).map(ci => ({
        id: ci.id,
        userId: ci.userId,
        timestamp: ci.timestamp,
        checkOutTime: ci.checkOutTime,
        checkoutTime: ci.checkoutTime
      }))
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

    // Find today's active check-in (not checked out yet)
    const today = new Date().toDateString();
    console.log('WorkShiftTimer - Today is:', today);
    
    const todayCheckIns = checkIns.filter(ci => {
      const checkInDate = new Date(ci.timestamp).toDateString();
      const isToday = checkInDate === today;
      const isCurrentUser = ci.userId === user.id;
      
      console.log('WorkShiftTimer - Checking check-in:', {
        checkInId: ci.id,
        checkInDate,
        isToday,
        isCurrentUser,
        userId: ci.userId,
        currentUserId: user.id
      });
      
      return isCurrentUser && isToday;
    });
    
    console.log('WorkShiftTimer - Today check-ins found:', todayCheckIns.length);
    
    // Find the check-in without checkout time (still active)
    const active = todayCheckIns.find(ci => {
      const hasCheckOut = !!(ci.checkOutTime || ci.checkoutTime);
      console.log('WorkShiftTimer - Checking if active:', {
        id: ci.id,
        checkOutTime: ci.checkOutTime,
        checkoutTime: ci.checkoutTime,
        hasCheckOut
      });
      return !hasCheckOut;
    });
    
    setActiveCheckIn(active || null);
    
    console.log('WorkShiftTimer - Final result:', {
      user: user.name,
      todayCheckIns: todayCheckIns.length,
      activeCheckIn: active ? {
        id: active.id,
        timestamp: active.timestamp,
        hasCheckOut: !!(active.checkOutTime || active.checkoutTime)
      } : null
    });
  }, [user, checkIns]);

  // Calculate timer based on active check-in
  useEffect(() => {
    if (!activeCheckIn) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const checkInTime = new Date(activeCheckIn.timestamp);
      const now = new Date();
      const eightHoursInMs = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
      const endTime = new Date(checkInTime.getTime() + eightHoursInMs);
      const remaining = endTime.getTime() - now.getTime();
      
      setTimeRemaining(remaining); // Can be negative for overtime
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeCheckIn]);

  // Show debug info for any user during testing
  if (!user) {
    return null;
  }

  // For testing: always show timer for employees
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
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium bg-green-100 text-green-700 border-green-200">
          <Clock className="h-3 w-3" />
          <span>Work Done! 🎉</span>
        </div>
      );
    }
    
    if (!activeCheckIn || timeRemaining === null) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium bg-gray-100 text-gray-600 border-gray-200">
          <Clock className="h-3 w-3" />
          <span>Not Checked In</span>
        </div>
      );
    }
  } else {
    return null; // Don't show for non-employees
  }

  const formatTime = (ms: number): string => {
    const absMs = Math.abs(ms);
    const hours = Math.floor(absMs / (1000 * 60 * 60));
    const minutes = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((absMs % (1000 * 60)) / 1000);
    
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return ms < 0 ? `+${timeStr}` : timeStr; // Show + for overtime
  };

  const getTimerColor = (): string => {
    if (timeRemaining <= 0) return 'text-red-600 bg-red-100 border-red-200';
    if (timeRemaining <= 60 * 60 * 1000) return 'text-orange-600 bg-orange-100 border-orange-200'; // Last hour
    if (timeRemaining <= 2 * 60 * 60 * 1000) return 'text-yellow-600 bg-yellow-100 border-yellow-200'; // Last 2 hours
    return 'text-green-600 bg-green-100 border-green-200';
  };

  const getStatusText = (): string => {
    if (timeRemaining <= 0) return 'Overtime';
    return 'Remaining';
  };

  // Show "Work Done!" when 8 hours are completed (but still checked in)
  if (timeRemaining <= 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium bg-blue-100 text-blue-700 border-blue-200">
        <Clock className="h-3 w-3" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1">
          <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
          <span className="text-xs">Work Done! (Overtime)</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${getTimerColor()}`}>
      <Clock className="h-3 w-3" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1">
        <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
        <span className="hidden sm:inline text-xs opacity-75">{getStatusText()}</span>
      </div>
    </div>
  );
};

export default WorkShiftTimer; 