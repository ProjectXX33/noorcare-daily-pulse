
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useCheckIn } from '@/contexts/CheckInContext';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

const CheckInButton = () => {
  const { user } = useAuth();
  const { checkInUser, hasCheckedInToday } = useCheckIn();
  const [isLoading, setIsLoading] = useState(false);

  if (!user) return null;

  const alreadyCheckedIn = hasCheckedInToday(user.id);
  const currentTime = format(new Date(), 'h:mm a');
  const currentDate = format(new Date(), 'EEEE, MMMM d, yyyy');

  const handleCheckIn = async () => {
    if (alreadyCheckedIn) return;
    
    setIsLoading(true);
    
    try {
      await checkInUser(user.id);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <p className="text-xl font-bold mb-1">{currentTime}</p>
      <p className="text-sm text-gray-500 mb-4">{currentDate}</p>
      
      <Button
        className={`h-32 w-32 rounded-full text-lg font-bold ${
          alreadyCheckedIn ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-primary hover:bg-primary/90'
        }`}
        disabled={alreadyCheckedIn || isLoading}
        onClick={handleCheckIn}
      >
        {alreadyCheckedIn ? 'Checked In' : isLoading ? 'Processing...' : 'Check In'}
      </Button>
      
      {alreadyCheckedIn && (
        <p className="mt-4 text-sm text-green-600">You have already checked in today.</p>
      )}
      {!alreadyCheckedIn && (
        <p className="mt-4 text-sm text-gray-500">Click the button to check in for today.</p>
      )}
    </div>
  );
};

export default CheckInButton;
