
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckIn } from '@/types';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';

interface CheckInHistoryProps {
  checkIns: CheckIn[];
  title?: string;
}

const CheckInHistory: React.FC<CheckInHistoryProps> = ({ 
  checkIns,
  title = "Recent Check-ins" 
}) => {
  // Sort check-ins by timestamp (most recent first)
  const sortedCheckIns = [...checkIns].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Calculate duration between check-in and check-out
  const calculateDuration = (checkIn: CheckIn) => {
    if (!checkIn.checkOutTime) return "Not checked out";
    
    const checkInTime = new Date(checkIn.timestamp);
    const checkOutTime = new Date(checkIn.checkOutTime);
    
    const hours = differenceInHours(checkOutTime, checkInTime);
    const minutes = differenceInMinutes(checkOutTime, checkInTime) % 60;
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Your attendance history</CardDescription>
      </CardHeader>
      <CardContent>
        {sortedCheckIns.length === 0 ? (
          <p className="text-sm text-gray-500">No check-in history found.</p>
        ) : (
          <div className="space-y-4">
            {sortedCheckIns.map((checkIn) => (
              <div key={checkIn.id} className="flex justify-between border-b pb-2">
                <div>
                  <p className="font-medium">{format(new Date(checkIn.timestamp), 'EEEE, MMMM d, yyyy')}</p>
                  <p className="text-sm text-gray-500">{checkIn.userName}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="font-medium text-primary">In: {format(new Date(checkIn.timestamp), 'h:mm a')}</p>
                      {checkIn.checkOutTime && (
                        <p className="text-sm text-gray-700">Out: {format(new Date(checkIn.checkOutTime), 'h:mm a')}</p>
                      )}
                    </div>
                    <div className="ml-4 bg-gray-100 px-2 py-1 rounded">
                      <p className="text-xs font-medium">{calculateDuration(checkIn)}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">{checkIn.department}</p>
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
