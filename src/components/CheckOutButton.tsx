import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useCheckIn } from '@/contexts/CheckInContext';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Check, Clock, AlertCircle } from 'lucide-react';
import { AnimatedClock } from '@/components/AnimatedClock';

const CheckOutButton = () => {
  const { user } = useAuth();
  const { checkOutUser, hasCheckedInToday, hasCheckedOutToday } = useCheckIn();
  const [isLoading, setIsLoading] = useState(false);
  const [showCheckAnimation, setShowCheckAnimation] = useState(false);

  if (!user) return null;

  const checkedInToday = hasCheckedInToday(user.id);
  const checkedOutToday = hasCheckedOutToday(user.id);
  const canCheckOut = checkedInToday && !checkedOutToday;
  
  const currentTime = format(new Date(), 'h:mm a');
  const currentDate = format(new Date(), 'EEEE, MMMM d, yyyy');

  const handleCheckOut = async () => {
    if (!canCheckOut) return;
    
    setIsLoading(true);
    
    try {
      await checkOutUser(user.id);
      setShowCheckAnimation(true);
      setTimeout(() => {
        setShowCheckAnimation(false);
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <p className="text-xl font-bold mb-1">{currentTime}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{currentDate}</p>
      
      <div className="relative">
        <Button
          className={`h-32 w-32 rounded-full text-lg font-bold transition-all duration-300 transform ${
            checkedOutToday ? 
              'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105' : 
              canCheckOut ? 
                'bg-red-500 hover:bg-red-600 hover:scale-105 hover:shadow-lg text-white' : 
                'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
          } ${showCheckAnimation ? 'scale-110' : ''}`}
          disabled={!canCheckOut || isLoading}
          onClick={handleCheckOut}
        >
          {checkedOutToday ? (
            <div className="flex flex-col items-center">
              <AnimatedClock className="h-6 w-6 mb-1" isActive={true} animationType="normal" />
              <span>Checked Out</span>
            </div>
          ) : isLoading ? (
            <span className="animate-pulse">Processing...</span>
          ) : (
            <span>Check Out</span>
          )}
        </Button>
        
        {showCheckAnimation && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-ping absolute h-full w-full rounded-full bg-blue-400 opacity-75"></div>
          </div>
        )}
      </div>
      
      {checkedOutToday && (
        <div className="mt-4 space-y-2">
          <div className="text-sm text-blue-600 dark:text-blue-400 animate-fade-in bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md border border-blue-100 dark:border-blue-800">
            <p className="flex items-center justify-center gap-1">
              <Check className="h-4 w-4" />
              You've completed your workday!
            </p>
          </div>
          
          {/* Post-checkout overtime info */}
          <div className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 p-2 rounded-md border border-purple-100 dark:border-purple-800">
            <div className="flex items-center justify-center gap-1 mb-1">
              <AlertCircle className="h-3 w-3" />
              <span className="font-semibold">Overtime Tracking Active</span>
            </div>
            <p className="text-center text-purple-500 dark:text-purple-300">
              Any additional work time will be tracked as overtime
            </p>
          </div>
        </div>
      )}
      
      {!checkedInToday && (
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>You need to check in first.</span>
        </div>
      )}
      {checkedInToday && !checkedOutToday && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Click the button to check out for today.</p>
      )}
    </div>
  );
};

export default CheckOutButton;
