
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useCheckIn } from '@/contexts/CheckInContext';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Check } from 'lucide-react';

const CheckInButton = () => {
  const { user } = useAuth();
  const { checkInUser, hasCheckedInToday } = useCheckIn();
  const [isLoading, setIsLoading] = useState(false);
  const [showCheckAnimation, setShowCheckAnimation] = useState(false);

  if (!user) return null;

  const alreadyCheckedIn = hasCheckedInToday(user.id);
  const currentTime = format(new Date(), 'h:mm a');
  const currentDate = format(new Date(), 'EEEE, MMMM d, yyyy');

  const handleCheckIn = async () => {
    if (alreadyCheckedIn) return;
    
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

  return (
    <div className="flex flex-col items-center">
      <p className="text-xl font-bold mb-1">{currentTime}</p>
      <p className="text-sm text-gray-500 mb-4">{currentDate}</p>
      
      <div className="relative">
        <Button
          className={`h-32 w-32 rounded-full text-lg font-bold transition-all duration-300 transform ${
            alreadyCheckedIn ? 
              'bg-green-500 text-white hover:bg-green-600 hover:scale-105' : 
              'bg-primary hover:bg-primary/90 hover:scale-105 hover:shadow-lg'
          } ${showCheckAnimation ? 'scale-110' : ''}`}
          disabled={alreadyCheckedIn || isLoading}
          onClick={handleCheckIn}
        >
          {alreadyCheckedIn ? (
            <div className="flex flex-col items-center">
              <Check className="h-6 w-6 mb-1" />
              <span>Checked In</span>
            </div>
          ) : isLoading ? (
            <span className="animate-pulse">Processing...</span>
          ) : (
            <span>Check In</span>
          )}
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
      {!alreadyCheckedIn && (
        <p className="mt-4 text-sm text-gray-500">Click the button to check in for today.</p>
      )}
    </div>
  );
};

export default CheckInButton;
