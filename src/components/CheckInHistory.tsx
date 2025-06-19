
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from 'date-fns';
import { CheckIn, BreakSession } from '@/contexts/CheckInContext';
import { Coffee, Timer } from 'lucide-react';

interface CheckInHistoryProps {
  checkIns: CheckIn[];
  title: string;
}

const CheckInHistory: React.FC<CheckInHistoryProps> = ({ checkIns, title }) => {

  // Function to calculate hours worked
  const calculateHoursWorked = (checkIn: CheckIn): string => {
    if (!checkIn.checkOutTime) return "Not recorded";
    
    const checkInTime = new Date(checkIn.timestamp);
    const checkOutTime = new Date(checkIn.checkOutTime);
    
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
                    <span className="font-medium">{formatTime(checkIn.checkOutTime)}</span>
                  </div>
                </div>

                {/* Break Information - Enhanced Display with Reasons */}
                {checkIn.totalBreakMinutes && checkIn.totalBreakMinutes > 0 && (
                  <div className="mt-3 p-4 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Coffee className="h-5 w-5 text-orange-600" />
                        <span className="font-semibold text-orange-700 text-sm">
                          Break Time Summary
                        </span>
                      </div>
                      <div className="bg-orange-200 text-orange-800 px-3 py-1 rounded-full text-xs font-bold">
                        Total: {Math.floor(checkIn.totalBreakMinutes / 60)}h {checkIn.totalBreakMinutes % 60}m
                      </div>
                    </div>
                    
                    {checkIn.breakSessions && checkIn.breakSessions.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-xs font-semibold text-orange-700 mb-2 border-b border-orange-200 pb-1">
                          Break Sessions with Reasons:
                        </div>
                        {checkIn.breakSessions.map((session, index) => (
                          <div key={session.id || index} className="bg-white border border-orange-200 rounded-lg p-3 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                <span className="font-medium text-orange-800 text-sm">
                                  {format(new Date(session.start_time), 'h:mm a')} - {format(new Date(session.end_time), 'h:mm a')}
                                </span>
                              </div>
                              <span className="bg-orange-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                                {session.duration_minutes}min
                              </span>
                            </div>
                            {session.reason && (
                              <div className="bg-orange-50 border border-orange-200 rounded p-2 mt-2">
                                <div className="text-orange-700 text-xs">
                                  <span className="font-semibold">Reason:</span> <span className="italic">{session.reason}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Current break status for active sessions */}
                {checkIn.isOnBreak && (
                  <div className="mt-3 p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Timer className="h-5 w-5 text-yellow-600 animate-pulse" />
                        <span className="font-semibold text-yellow-700 text-sm">Currently on Break</span>
                      </div>
                      <div className="bg-yellow-300 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                        ACTIVE
                      </div>
                    </div>
                    
                    {checkIn.currentBreakReason && (
                      <div className="bg-white border border-yellow-200 rounded p-3 mb-2">
                        <div className="text-yellow-700 text-sm">
                          <span className="font-semibold">Current Reason:</span> 
                          <span className="italic ml-1">{checkIn.currentBreakReason}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-yellow-600 text-xs">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      <span>Break started at: {checkIn.breakStartTime ? format(new Date(checkIn.breakStartTime), 'h:mm a') : 'Unknown'}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CheckInHistory;
