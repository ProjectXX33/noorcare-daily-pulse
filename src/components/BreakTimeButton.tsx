import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications';
import { toast } from 'sonner';
import { Coffee, Play, Pause, Timer, Edit3 } from 'lucide-react';
import { format } from 'date-fns';

interface BreakTimeButtonProps {
  activeCheckInId: string | null;
  onBreakStateChange?: (isOnBreak: boolean) => void;
}

const BreakTimeButton: React.FC<BreakTimeButtonProps> = ({ 
  activeCheckInId, 
  onBreakStateChange 
}) => {
  const { user } = useAuth();
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);
  const [breakDuration, setBreakDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [breakReason, setBreakReason] = useState('');
  const [currentBreakReason, setCurrentBreakReason] = useState('');
  const [showReasonDialog, setShowReasonDialog] = useState(false);

  // Check current break status when component mounts or activeCheckInId changes
  useEffect(() => {
    if (activeCheckInId) {
      checkBreakStatus();
    }
  }, [activeCheckInId]);

  // Update break duration every second when on break
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isOnBreak && breakStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const duration = Math.floor((now.getTime() - breakStartTime.getTime()) / 1000);
        setBreakDuration(duration);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOnBreak, breakStartTime]);

  const checkBreakStatus = async () => {
    if (!activeCheckInId) return;

    try {
      const { data, error } = await supabase
        .from('check_ins')
        .select('is_on_break, break_start_time, current_break_reason')
        .eq('id', activeCheckInId)
        .single();

      if (error) throw error;

      if (data) {
        setIsOnBreak(data.is_on_break || false);
        setBreakStartTime(data.break_start_time ? new Date(data.break_start_time) : null);
        setCurrentBreakReason(data.current_break_reason || '');
        
        // Calculate current break duration if on break
        if (data.is_on_break && data.break_start_time) {
          const now = new Date();
          const startTime = new Date(data.break_start_time);
          const duration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
          setBreakDuration(duration);
        }
      }
    } catch (error) {
      console.error('Error checking break status:', error);
    }
  };

  const startBreak = async () => {
    if (!activeCheckInId || !user) return;
    
    // Show dialog to get break reason
    setShowReasonDialog(true);
  };

  const confirmStartBreak = async () => {
    if (!activeCheckInId || !user || !breakReason.trim()) {
      toast.error('Please provide a reason for the break');
      return;
    }

    setIsLoading(true);
    try {
      const breakStartTime = new Date();
      
      const { error } = await supabase
        .from('check_ins')
        .update({
          is_on_break: true,
          break_start_time: breakStartTime.toISOString(),
          current_break_reason: breakReason.trim()
        })
        .eq('id', activeCheckInId);

      if (error) throw error;

      setIsOnBreak(true);
      setBreakStartTime(breakStartTime);
      setCurrentBreakReason(breakReason.trim());
      setBreakDuration(0);
      setShowReasonDialog(false);
      setBreakReason('');
      
      onBreakStateChange?.(true);
      
      toast.success(`Break started at ${format(breakStartTime, 'h:mm a')}`, {
        description: 'Work time is now completely frozen until you stop the break.'
      });

      // Notify all admins about the break
      await notifyAdminsAboutBreak(user, breakReason.trim(), breakStartTime);

    } catch (error) {
      console.error('Error starting break:', error);
      toast.error('Failed to start break');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to notify all admins when employee starts break
  const notifyAdminsAboutBreak = async (employee: any, reason: string, startTime: Date) => {
    try {
      // Get all admin users
      const { data: admins, error } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin');

      if (error) {
        console.error('Error fetching admins:', error);
        return;
      }

      if (!admins || admins.length === 0) {
        console.log('No admins found to notify');
        return;
      }

      // Create notification message
      const notificationTitle = '☕ Employee Break Started';
      const notificationMessage = `${employee.name} (${employee.position || 'Employee'}) started a break at ${format(startTime, 'h:mm a')}\n\nReason: ${reason}\n\nWork timer is now frozen until break ends.`;

      // Send notification to each admin
      for (const admin of admins) {
        await createNotification({
          user_id: admin.id,
          title: notificationTitle,
          message: notificationMessage,
          related_to: 'break',
          related_id: activeCheckInId,
          created_by: employee.id
        });
      }

      console.log(`✅ Break notification sent to ${admins.length} admin(s)`);

    } catch (error) {
      console.error('❌ Error sending break notifications to admins:', error);
    }
  };

  const stopBreak = async () => {
    if (!activeCheckInId || !user || !breakStartTime) return;

    setIsLoading(true);
    try {
      const breakEndTime = new Date();
      const breakDurationMinutes = Math.floor((breakEndTime.getTime() - breakStartTime.getTime()) / (1000 * 60));

      // Get current break sessions
      const { data: currentData, error: fetchError } = await supabase
        .from('check_ins')
        .select('break_sessions, total_break_minutes')
        .eq('id', activeCheckInId)
        .single();

      if (fetchError) throw fetchError;

      const currentBreakSessions = currentData?.break_sessions || [];
      const currentTotalMinutes = currentData?.total_break_minutes || 0;

      // Add new break session
      const newBreakSession = {
        start_time: breakStartTime.toISOString(),
        end_time: breakEndTime.toISOString(),
        duration_minutes: breakDurationMinutes,
        reason: currentBreakReason
      };

      const updatedBreakSessions = [...currentBreakSessions, newBreakSession];
      const updatedTotalMinutes = currentTotalMinutes + breakDurationMinutes;

      const { error } = await supabase
        .from('check_ins')
        .update({
          is_on_break: false,
          break_start_time: null,
          break_end_time: breakEndTime.toISOString(),
          current_break_reason: null,
          total_break_minutes: updatedTotalMinutes,
          break_sessions: updatedBreakSessions
        })
        .eq('id', activeCheckInId);

      if (error) throw error;

      setIsOnBreak(false);
      setBreakStartTime(null);
      setCurrentBreakReason('');
      setBreakDuration(0);
      
      onBreakStateChange?.(false);
      
      toast.success(`Break ended at ${format(breakEndTime, 'h:mm a')}`, {
        description: `Break: ${breakDurationMinutes} minutes (${currentBreakReason}). Work timer resumed.`
      });

      // Notify all admins about break ending
      await notifyAdminsAboutBreakEnd(user, currentBreakReason, breakStartTime, breakEndTime, breakDurationMinutes);

    } catch (error) {
      console.error('Error stopping break:', error);
      toast.error('Failed to stop break');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to notify all admins when employee ends break
  const notifyAdminsAboutBreakEnd = async (employee: any, reason: string, startTime: Date, endTime: Date, durationMinutes: number) => {
    try {
      // Get all admin users
      const { data: admins, error } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin');

      if (error) {
        console.error('Error fetching admins:', error);
        return;
      }

      if (!admins || admins.length === 0) {
        console.log('No admins found to notify');
        return;
      }

      // Create notification message
      const notificationTitle = '⏰ Employee Break Ended';
      const notificationMessage = `${employee.name} (${employee.position || 'Employee'}) ended their break at ${format(endTime, 'h:mm a')}\n\nBreak Duration: ${durationMinutes} minutes\nReason: ${reason}\n\nWork timer has resumed.`;

      // Send notification to each admin
      for (const admin of admins) {
        await createNotification({
          user_id: admin.id,
          title: notificationTitle,
          message: notificationMessage,
          related_to: 'break',
          related_id: activeCheckInId,
          created_by: employee.id
        });
      }

      console.log(`✅ Break end notification sent to ${admins.length} admin(s)`);

    } catch (error) {
      console.error('❌ Error sending break end notifications to admins:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!activeCheckInId) return null;

  return (
    <div className="flex flex-col items-center space-y-3">
      {/* Break Duration Display */}
      {isOnBreak && (
        <div className="text-center p-3 bg-orange-50 border border-orange-200 rounded-lg max-w-xs">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Timer className="h-4 w-4 text-orange-600" />
            <span className="font-medium text-orange-700">On Break</span>
          </div>
          <div className="text-2xl font-mono font-bold text-orange-600">
            {formatDuration(breakDuration)}
          </div>
          <div className="text-xs text-orange-500 mt-1">
            Started at {breakStartTime ? format(breakStartTime, 'h:mm a') : ''}
          </div>
          {currentBreakReason && (
            <div className="text-xs text-orange-600 mt-2 font-medium bg-orange-100 px-2 py-1 rounded">
              Reason: {currentBreakReason}
            </div>
          )}
        </div>
      )}

      {/* Break Button */}
      <div className="relative">
        {isOnBreak ? (
          <Button
            className="h-24 w-24 rounded-full text-sm font-bold transition-all duration-300 transform bg-orange-500 hover:bg-orange-600 hover:scale-105 text-white"
            disabled={isLoading}
            onClick={stopBreak}
          >
            <div className="flex flex-col items-center">
              {isLoading ? (
                <div className="animate-spin h-5 w-5 mb-1">
                  <Timer className="h-5 w-5" />
                </div>
              ) : (
                <Play className="h-5 w-5 mb-1" />
              )}
              <span className="text-xs">
                {isLoading ? 'Processing...' : 'Stop Break'}
              </span>
            </div>
          </Button>
        ) : (
          <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
            <DialogTrigger asChild>
              <Button
                className="h-24 w-24 rounded-full text-sm font-bold transition-all duration-300 transform bg-yellow-500 hover:bg-yellow-600 hover:scale-105 hover:shadow-lg text-white"
                disabled={isLoading}
                onClick={startBreak}
              >
                <div className="flex flex-col items-center">
                  <Coffee className="h-5 w-5 mb-1" />
                  <span className="text-xs">Break Time</span>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Coffee className="h-5 w-5 text-yellow-600" />
                  Break Time Reason
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Why are you taking a break?
                  </label>
                  <Input
                    placeholder="e.g., Lunch, Rest, Personal, Prayer, etc."
                    value={breakReason}
                    onChange={(e) => setBreakReason(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && breakReason.trim()) {
                        confirmStartBreak();
                      }
                    }}
                    className="w-full"
                    maxLength={100}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {breakReason.length}/100 characters
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowReasonDialog(false);
                      setBreakReason('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmStartBreak}
                    disabled={!breakReason.trim() || isLoading}
                    className="bg-yellow-500 hover:bg-yellow-600"
                  >
                    {isLoading ? 'Starting...' : 'Start Break'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Info Text */}
      <div className="text-center text-xs text-gray-500 max-w-xs">
        {isOnBreak ? (
          <p>Work time is completely frozen until you stop the break.</p>
        ) : (
          <p>Take a break when needed. Work timer will freeze during breaks.</p>
        )}
      </div>
    </div>
  );
};

export default BreakTimeButton; 