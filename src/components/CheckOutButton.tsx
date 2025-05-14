
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useCheckIn } from '@/contexts/CheckInContext';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

const CheckOutButton = () => {
  const { user } = useAuth();
  const { addCheckOut, hasCheckedInToday, hasCheckedOutToday } = useCheckIn();
  const [isLoading, setIsLoading] = useState(false);

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
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      addCheckOut(user.id);
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
          checkedOutToday ? 'bg-green-100 text-green-800 hover:bg-green-100' : 
          canCheckOut ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-200 text-gray-500'
        }`}
        disabled={!canCheckOut || isLoading}
        onClick={handleCheckOut}
      >
        {checkedOutToday ? 'Checked Out' : isLoading ? 'Processing...' : 'Check Out'}
      </Button>
      
      {checkedOutToday && (
        <p className="mt-4 text-sm text-green-600">You have already checked out today.</p>
      )}
      {!checkedInToday && (
        <p className="mt-4 text-sm text-gray-500">You need to check in first.</p>
      )}
      {checkedInToday && !checkedOutToday && (
        <p className="mt-4 text-sm text-gray-500">Click the button to check out for today.</p>
      )}
    </div>
  );
};

export default CheckOutButton;
