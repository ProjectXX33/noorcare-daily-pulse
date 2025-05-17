
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from 'date-fns';
import { CheckIn } from '@/contexts/CheckInContext';

interface CheckInHistoryProps {
  checkIns: CheckIn[];
  title: string;
}

const CheckInHistory: React.FC<CheckInHistoryProps> = ({ checkIns, title }) => {
  // Function to calculate hours worked
  const calculateHoursWorked = (checkIn: CheckIn): string => {
    if (!checkIn.checkoutTime) return "Not recorded";
    
    const checkInTime = new Date(checkIn.timestamp);
    const checkOutTime = new Date(checkIn.checkoutTime);
    
    const diffInMs = checkOutTime.getTime() - checkInTime.getTime();
    const hours = Math.floor(diffInMs / (1000 * 60 * 60));
    const minutes = Math.round((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };
  
  // Function to format time in 12-hour format
  const formatTime = (date: Date | undefined): string => {
    if (!date) return "Not recorded";
    return format(new Date(date), 'h:mm a');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {checkIns.length === 0 ? (
          <p className="text-gray-500">No check-in history available.</p>
        ) : (
          <div className="grid gap-4">
            {checkIns.map((checkIn) => (
              <div key={checkIn.id} className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex flex-col sm:flex-row justify-between mb-2">
                  <div>
                    <h3 className="font-medium">
                      {format(new Date(checkIn.timestamp), 'EEEE, MMMM d, yyyy')}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">{checkIn.userName}</span> - {checkIn.department}
                    </p>
                  </div>
                  <span className="text-gray-600 mt-2 sm:mt-0">
                    {calculateHoursWorked(checkIn)}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mt-2">
                  <div className="flex justify-between sm:justify-start gap-2">
                    <span className="text-gray-600">Check-in:</span>
                    <span className="font-medium">{formatTime(checkIn.timestamp)}</span>
                  </div>
                  <div className="flex justify-between sm:justify-start gap-2">
                    <span className="text-gray-600">Check-out:</span>
                    <span className="font-medium">{formatTime(checkIn.checkoutTime)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CheckInHistory;
