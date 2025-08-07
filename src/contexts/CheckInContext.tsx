import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { User, WorkReport as WorkReportType, Shift, Department, Position } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fetchShifts, determineShift, createOrUpdateMonthlyShift } from '@/lib/shiftsApi';
import { useAuth } from './AuthContext';
import { createNotification } from '@/lib/notifications';

// Update interfaces to match the ones in types/index.ts
export interface CheckIn {
  id: string;
  userId: string;
  timestamp: Date;
  checkoutTime?: Date;
  userName: string;
  department: Department;
  position: Position;
  checkOutTime?: Date; // Added to match types/index.ts
  // Break time fields
  breakStartTime?: Date | null;
  breakEndTime?: Date | null;
  totalBreakMinutes?: number;
  isOnBreak?: boolean;
  currentBreakReason?: string;
  breakSessions?: BreakSession[];
}

export interface BreakSession {
  id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  reason: string;
}

export interface WorkReport {
  id: string;
  userId: string;
  userName: string;
  date: Date;
  tasksDone: string;
  issuesFaced: string | null;
  plansForTomorrow: string;
  createdAt: Date;
  department: Department;
  position: Position;
  fileAttachments?: string[];
}

interface CheckInContextType {
  checkIns: CheckIn[];
  workReports: WorkReport[];
  isLoading: boolean;
  getUserCheckIns: (userId: string) => CheckIn[];
  getUserWorkReports: (userId: string) => WorkReport[];
  checkInUser: (userId: string) => Promise<void>;
  checkOutUser: (userId: string) => Promise<void>;
  submitWorkReport: (userId: string, reportInput: {
    tasksDone: string;
    issuesFaced?: string | null;
    plansForTomorrow: string;
  }, fileAttachment?: File) => Promise<void>;
  hasCheckedInToday: (userId: string) => boolean;
  hasCheckedOutToday: (userId: string) => boolean;
  getUserLatestCheckIn: (userId: string) => CheckIn | null;
  hasSubmittedReportToday: (userId: string) => boolean;
  deleteWorkReport: (reportId: string) => Promise<void>;
  isCheckedIn: boolean;
  currentCheckIn: CheckIn | null;
  checkIn: () => Promise<void>;
  checkOut: () => Promise<void>;
  todaysHours: number;
  refreshCheckIns: () => Promise<void>;
  refreshWorkReports: () => Promise<void>;
  workDayBoundaries: { workDayStart: Date; workDayEnd: Date } | null;
  forceRefreshBoundaries: () => Promise<void>;
}

const CheckInContext = createContext<CheckInContextType | undefined>(undefined);

export const CheckInProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [workReports, setWorkReports] = useState<WorkReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [currentCheckIn, setCurrentCheckIn] = useState<CheckIn | null>(null);
  const [todaysHours, setTodaysHours] = useState(0);
  
  // Add state to track work day boundaries
  const [workDayBoundaries, setWorkDayBoundaries] = useState<{
    workDayStart: Date;
    workDayEnd: Date;
  } | null>(null);

  // Add ref to track active subscription
  const activeSubscriptionRef = useRef<any>(null);

  // Initialize with stored data
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        await Promise.all([
          fetchCheckIns(),
          fetchWorkReports()
        ]);
      } catch (error) {
        console.error('Error loading check-in data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
    
    // Set up real-time listeners with unique channel names
    // Note: check_ins subscription is handled in user-specific useEffect to avoid conflicts
    const workReportsSubscription = supabase
      .channel('checkin-context-global-reports')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'work_reports' }, 
        () => {
          fetchWorkReports();
        }
      )
      .subscribe();
    
    return () => {
      if (workReportsSubscription) {
        workReportsSubscription.unsubscribe();
      }
    };
  }, []);
  
  useEffect(() => {
    // Load work day boundaries when component mounts
    const loadWorkDayBoundaries = async () => {
      try {
        const { getCurrentWorkDayBoundaries } = await import('@/lib/shiftsApi');
        const boundaries = await getCurrentWorkDayBoundaries();
        setWorkDayBoundaries(boundaries);
        console.log('🕘 Work day boundaries loaded:', boundaries);
      } catch (error) {
        console.error('Error loading work day boundaries:', error);
        // Fallback to midnight-based boundaries
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        setWorkDayBoundaries({ workDayStart: today, workDayEnd: tomorrow });
      }
    };

    loadWorkDayBoundaries();
    
    // Refresh boundaries more frequently to handle day transitions (every 5 minutes)
    const interval = setInterval(loadWorkDayBoundaries, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Notify admins when someone checks in/out
  const notifyAdmins = async (action: 'check_in' | 'check_out', userName: string) => {
    try {
      // Get all admin users
      const { data: admins, error } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin');

      if (error) throw error;

      const title = action === 'check_in' ? 'Employee Checked In' : 'Employee Checked Out';
      const message = action === 'check_in' 
        ? `${userName} has checked in`
        : `${userName} has checked out`;

      // Send notification to all admins
      for (const admin of admins) {
        await createNotification({
          user_id: admin.id,
          title,
          message,
          related_to: 'check_in',
          related_id: user?.id,
          created_by: user?.id
        });
      }
    } catch (error) {
      console.error('Error notifying admins:', error);
    }
  };

  // Subscribe to realtime check-in updates with enhanced debugging
  // This handles BOTH global check-ins updates AND user-specific notifications
  useEffect(() => {
    if (!user?.id) return;

    // Clean up any existing subscription first
    if (activeSubscriptionRef.current) {
      console.log('🧹 Cleaning up existing subscription before creating new one');
      activeSubscriptionRef.current.unsubscribe();
      activeSubscriptionRef.current = null;
    }

    console.log('🔄 Setting up consolidated real-time check-in subscription for user:', user.name, 'ID:', user.id);

    // Create unique channel name to avoid conflicts
    const channelName = `checkin-context-consolidated-${user.id}`;
    
    console.log('📡 Creating subscription with channel:', channelName);

    // Add delay to stagger subscription creation and avoid conflicts
    const subscriptionTimeout = setTimeout(() => {
      // SIMPLIFIED SUBSCRIPTION - Back to basics approach
      const subscription = supabase
        .channel(`simple-checkin-${user.id}-${Date.now()}`) // Add timestamp to ensure uniqueness
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'check_ins'
          }, 
          () => {
            // Simple refresh without complex logic
            console.log('🔔 Simple check-in update - refreshing data');
            setTimeout(fetchCheckIns, 200);
          }
        )
        .subscribe();

      // Store the subscription in ref for cleanup
      activeSubscriptionRef.current = subscription;
      console.log('✅ Delayed subscription created successfully for channel:', channelName);
    }, 1000); // 1 second delay to let other components initialize first

    return () => {
      console.log('🔌 Unsubscribing from consolidated check-in updates, channel:', channelName);
      
      // Clear the timeout if component unmounts before subscription is created
      if (subscriptionTimeout) {
        clearTimeout(subscriptionTimeout);
      }
      
      // Unsubscribe if subscription exists
      if (activeSubscriptionRef.current) {
        activeSubscriptionRef.current.unsubscribe();
        activeSubscriptionRef.current = null;
        console.log('✅ Successfully unsubscribed from channel:', channelName);
      }
    };
  }, [user?.id]); // Only depend on user.id to avoid unnecessary re-subscriptions

  // Enhanced user state tracking with real-time updates
  useEffect(() => {
    if (!user || user.role === 'admin') return;

    const updateUserState = () => {
      const userCheckIns = checkIns.filter(ci => ci.userId === user.id);
      
      // Use work day boundaries for better accuracy
      let todayCheckIns = [];
      
      if (workDayBoundaries) {
        todayCheckIns = userCheckIns.filter(ci => {
          const checkInTime = new Date(ci.timestamp);
          return checkInTime >= workDayBoundaries.workDayStart && 
                 checkInTime < workDayBoundaries.workDayEnd;
        });
      } else {
        // Fallback to regular day check
        const today = new Date().toDateString();
        todayCheckIns = userCheckIns.filter(ci => 
          new Date(ci.timestamp).toDateString() === today
        );
      }

      // Find active check-in (not checked out yet)
      const activeCheckIn = todayCheckIns.find(ci => !ci.checkOutTime && !ci.checkoutTime);
      
      // Check if user has been manually checked out
      const manuallyCheckedOut = todayCheckIns.some(ci => 
        (ci.checkOutTime || ci.checkoutTime) && 
        !activeCheckIn
      );
      
      const hasActiveCheckIn = !!activeCheckIn;
      
      console.log('👤 User state update:', {
        userName: user.name,
        userId: user.id,
        totalCheckIns: userCheckIns.length,
        todayCheckIns: todayCheckIns.length,
        activeCheckIn: activeCheckIn ? {
          id: activeCheckIn.id,
          timestamp: activeCheckIn.timestamp,
          hasCheckOut: !!(activeCheckIn.checkOutTime || activeCheckIn.checkoutTime)
        } : null,
        hasActiveCheckIn,
        manuallyCheckedOut,
        workDayBoundaries
      });

      setIsCheckedIn(hasActiveCheckIn);
      setCurrentCheckIn(activeCheckIn || null);

      // Calculate today's hours
      let totalHours = 0;
      todayCheckIns.forEach(ci => {
        const checkOutTime = ci.checkOutTime || ci.checkoutTime;
        if (checkOutTime) {
          const checkInTime = new Date(ci.timestamp);
          const checkOut = new Date(checkOutTime);
          const hours = (checkOut.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
          totalHours += hours;
        }
      });
      setTodaysHours(totalHours);
    };

    updateUserState();
  }, [checkIns, user, workDayBoundaries]);

  // Auto-refresh every 30 seconds to ensure real-time accuracy
  useEffect(() => {
    if (!user) return;

    const autoRefresh = setInterval(() => {
      console.log('🔄 Auto-refreshing check-ins for real-time accuracy');
      refreshCheckIns();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(autoRefresh);
  }, [user]);

  // Enhanced fetch function with better error handling and debugging
  const fetchCheckIns = async () => {
    console.log('📡 Fetching check-ins...');
    
    try {
      const { data: checkInsData, error: checkInsError } = await supabase
        .from('check_ins')
        .select(`
          *, 
          users:user_id(name, department, position),
          break_sessions,
          break_start_time,
          break_end_time,
          total_break_minutes,
          is_on_break,
          current_break_reason
        `)
        .order('timestamp', { ascending: false });
        
      if (checkInsError) {
        console.error('❌ Error fetching check-ins:', checkInsError);
        throw checkInsError;
      }

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, department, position');

      if (usersError) {
        console.error('❌ Error fetching users:', usersError);
        throw usersError;
      }
      
      // Create a map of user details for quick lookup
      const usersMap = usersData.reduce((acc: Record<string, any>, user) => {
        acc[user.id] = user;
        return acc;
      }, {});
      
      const formattedCheckIns: CheckIn[] = checkInsData.map(item => {
        const userInfo = usersMap[item.user_id] || {};
        
        // Parse break sessions from JSONB
        let breakSessions: BreakSession[] = [];
        try {
          if (item.break_sessions && Array.isArray(item.break_sessions)) {
            breakSessions = item.break_sessions;
          } else if (typeof item.break_sessions === 'string') {
            breakSessions = JSON.parse(item.break_sessions);
          }
        } catch (error) {
          console.warn('Error parsing break sessions for check-in:', item.id, error);
          breakSessions = [];
        }
        
        console.log('🔍 Check-in break data for', userInfo.name || 'Unknown', ':', {
          id: item.id,
          totalBreakMinutes: item.total_break_minutes,
          isOnBreak: item.is_on_break,
          breakSessions: breakSessions,
          currentBreakReason: item.current_break_reason
        });
        
        return {
          id: item.id,
          userId: item.user_id,
          timestamp: new Date(item.timestamp),
          checkoutTime: item.checkout_time ? new Date(item.checkout_time) : undefined,
          checkOutTime: item.checkout_time ? new Date(item.checkout_time) : undefined,
          userName: userInfo.name || 'Unknown User',
          department: userInfo.department || 'Unknown',
          position: userInfo.position || 'Unknown',
          // Break time fields
          breakStartTime: item.break_start_time ? new Date(item.break_start_time) : null,
          breakEndTime: item.break_end_time ? new Date(item.break_end_time) : null,
          totalBreakMinutes: item.total_break_minutes || 0,
          isOnBreak: item.is_on_break || false,
          currentBreakReason: item.current_break_reason || '',
          breakSessions: breakSessions,
        };
      });
      
      console.log('✅ Check-ins fetched successfully:', {
        total: formattedCheckIns.length,
        recent: formattedCheckIns.slice(0, 3).map(ci => ({
          id: ci.id,
          user: ci.userName,
          timestamp: ci.timestamp,
          hasCheckOut: !!(ci.checkOutTime || ci.checkoutTime)
        }))
      });
      
      // Deduplicate check-ins by ID to prevent UI issues
      const uniqueCheckIns = formattedCheckIns.filter((checkIn, index, array) => 
        array.findIndex(item => item.id === checkIn.id) === index
      );
      
      console.log('🔍 Deduplication result:', {
        original: formattedCheckIns.length,
        deduplicated: uniqueCheckIns.length,
        duplicatesRemoved: formattedCheckIns.length - uniqueCheckIns.length
      });
      
      setCheckIns(uniqueCheckIns);
    } catch (error) {
      console.error('❌ Error in fetchCheckIns:', error);
      toast.error('Failed to load check-in data. Please refresh the page.');
    }
  };
  
  const fetchWorkReports = async () => {
    try {
      const { data: reportsData, error: reportsError } = await supabase
        .from('work_reports')
        .select('*, users:user_id(name, department, position)')
        .order('date', { ascending: false });
        
      if (reportsError) throw reportsError;
      
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('file_attachments')
        .select('*');
      
      if (attachmentsError) throw attachmentsError;
      
      // Create a map of attachments for each report
      const attachmentsByReport = attachmentsData.reduce((acc: Record<string, string[]>, file) => {
        if (!acc[file.work_report_id]) {
          acc[file.work_report_id] = [];
        }
        acc[file.work_report_id].push(file.file_name);
        return acc;
      }, {});

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, department, position');

      if (usersError) throw usersError;
      
      // Create a map of user details for quick lookup
      const usersMap = usersData.reduce((acc: Record<string, any>, user) => {
        acc[user.id] = user;
        return acc;
      }, {});
      
      const formattedReports: WorkReport[] = reportsData.map(item => {
        const user = usersMap[item.user_id] || {};
        return {
          id: item.id,
          userId: item.user_id,
          userName: user.name || 'Unknown User',
          date: new Date(item.date),
          tasksDone: item.tasks_done,
          issuesFaced: item.issues_faced,
          plansForTomorrow: item.plans_for_tomorrow,
          createdAt: new Date(item.created_at),
          department: user.department || 'Unknown',
          position: user.position || 'Unknown',
          fileAttachments: attachmentsByReport[item.id] || []
        };
      });
      
      setWorkReports(formattedReports);
    } catch (error) {
      console.error('Error fetching work reports:', error);
    }
  };
  
  const getUserCheckIns = (userId: string): CheckIn[] => {
    return checkIns.filter(checkIn => checkIn.userId === userId);
  };
  
  const getUserWorkReports = (userId: string): WorkReport[] => {
    return workReports.filter(report => report.userId === userId);
  };
  
  const checkInUser = async (userId: string) => {
    try {
      // Get the user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('name, department, position')
        .eq('id', userId)
        .single();
        
      if (userError) throw userError;
      
      // Get work day boundaries (falls back to midnight if not available)
      let currentWorkDay = workDayBoundaries;
      if (!currentWorkDay) {
        // Load work day boundaries if not already loaded
        try {
          const { getCurrentWorkDayBoundaries } = await import('@/lib/shiftsApi');
          currentWorkDay = await getCurrentWorkDayBoundaries();
        } catch (error) {
          console.error('Error loading work day boundaries for check-in:', error);
          // Fallback to midnight-based boundaries
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          currentWorkDay = { workDayStart: today, workDayEnd: tomorrow };
        }
      }
      
      // Check if user already checked in today using work day boundaries
      const existingCheckIn = checkIns.find(checkIn => {
        const checkInTime = new Date(checkIn.timestamp);
        return checkIn.userId === userId && 
               checkInTime >= currentWorkDay!.workDayStart && 
               checkInTime < currentWorkDay!.workDayEnd;
      });
      
      if (existingCheckIn) {
        toast.error('You have already checked in today');
        return;
      }
      
      // For all employee positions, check shift timing and day off BEFORE check-in
      if (['Customer Service', 'Designer', 'Copy Writing', 'Media Buyer', 'Web Developer'].includes(userData.position)) {
        try {
          const { checkIfDayOff } = await import('@/lib/performanceApi');
          // Use work day start as the reference date for day-off check
          const dayOffStatus = await checkIfDayOff(userId, currentWorkDay.workDayStart);
          
          if (dayOffStatus.isDayOff) {
            toast.info('🏖️ Happy time for you! Today is your day off. Enjoy your rest! 😊', {
              duration: 5000,
            });
            return;
          }

          // Check shift timing validation
          if (dayOffStatus.assignedShift) {
            const shift = dayOffStatus.assignedShift;
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentTotalMinutes = currentHour * 60 + currentMinute;

            const [shiftHour, shiftMinute] = shift.start_time.split(':').map(Number);
            const shiftTotalMinutes = shiftHour * 60 + shiftMinute;

            // Specific timing rules for shifts
            let canCheckIn = false;
            
            if (shift.name.toLowerCase().includes('day')) {
              // Day shift: Can check in from 8:30 AM (30 min before 9:00 AM)
              const allowedStartTime = 8 * 60 + 30; // 8:30 AM in minutes
              canCheckIn = currentTotalMinutes >= allowedStartTime;
            } else if (shift.name.toLowerCase().includes('night')) {
              // Night shift: Can check in from 3:30 PM (30 min before 4:00 PM)  
              const allowedStartTime = 15 * 60 + 30; // 3:30 PM in minutes
              canCheckIn = currentTotalMinutes >= allowedStartTime;
            } else {
              // Generic shift: Use 30 minutes before shift start AND check end time
              const allowEarlyMinutes = 30;
              const [endHour, endMinute] = shift.end_time.split(':').map(Number);
              const shiftEndMinutes = endHour * 60 + endMinute;
              
              // Handle overnight shifts where end time is next day
              const isOvernightShift = endHour < shiftHour || (endHour === shiftHour && endMinute < shiftMinute);
              
              if (isOvernightShift) {
                // For overnight shifts, allow check-in from (start-30min) until end time next day
                canCheckIn = currentTotalMinutes >= (shiftTotalMinutes - allowEarlyMinutes) || 
                            currentTotalMinutes <= shiftEndMinutes;
              } else {
                // For same-day shifts, must be after (start-30min) AND before end time
                canCheckIn = currentTotalMinutes >= (shiftTotalMinutes - allowEarlyMinutes) && 
                            currentTotalMinutes <= shiftEndMinutes;
              }
            }

            if (!canCheckIn) {
              // Format the start time to 12-hour format
              const formatTime = (timeString: string) => {
                const [hours, minutes] = timeString.split(':').map(Number);
                const date = new Date();
                date.setHours(hours, minutes);
                return date.toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit', 
                  hour12: true 
                });
              };

              const formattedStartTime = formatTime(shift.start_time);
              let message = `Your ${shift.name} starts at ${formattedStartTime}.`;
              
              if (shift.name.toLowerCase().includes('day')) {
                message += ' Day shift employees can check in from 8:30 AM.';
              } else if (shift.name.toLowerCase().includes('night')) {
                message += ' Night shift employees can check in from 3:30 PM.';
              } else {
                // Custom shift - check if too early or too late
                const [endHour, endMinute] = shift.end_time.split(':').map(Number);
                const shiftEndMinutes = endHour * 60 + endMinute;
                const isOvernightShift = endHour < shiftHour || (endHour === shiftHour && endMinute < shiftMinute);
                
                if (!isOvernightShift && currentTotalMinutes > shiftEndMinutes) {
                  // Too late - shift has ended
                  const formattedEndTime = formatTime(shift.end_time);
                  message = `Your ${shift.name} has ended at ${formattedEndTime}. You cannot check in after the shift ends.`;
                } else {
                  message += ' You can check in 30 minutes before.';
                }
              }

              toast.warning(message, {
                duration: 6000,
              });
              return;
            }
          }
        } catch (dayOffError) {
          console.error('Error checking day off status:', dayOffError);
          // Continue with check-in if day-off check fails
        }
      }
      
      const checkInTime = new Date();
      
      // Create a new check-in record
      const { data, error } = await supabase
        .from('check_ins')
        .insert([{
          user_id: userId,
          timestamp: checkInTime.toISOString()
        }])
        .select();
        
      if (error) throw error;
      
      // Update the last_checkin time for the user
      await supabase
        .from('users')
        .update({ last_checkin: checkInTime.toISOString() })
        .eq('id', userId);
      
      // For all employee positions, handle shift tracking and performance  
      if (['Customer Service', 'Designer', 'Copy Writing', 'Media Buyer', 'Web Developer'].includes(userData.position)) {
        try {
          console.log('🔄 Starting shift tracking for user:', userId);
          
          const shifts = await fetchShifts();
          console.log('📋 Available shifts:', shifts);
          
          // IMPORTANT: Pass userId to get assigned shift instead of guessing by time
          const detectedShift = await determineShift(checkInTime, shifts, userId);
          console.log('🎯 Detected shift:', detectedShift);
          
          if (detectedShift) {
            console.log('✅ Processing shift tracking for:', detectedShift.name);
            
            await createOrUpdateMonthlyShift(
              userId,
              detectedShift.id,
              currentWorkDay.workDayStart, // Use work day start as reference date
              checkInTime,
              undefined, // checkOutTime
              detectedShift // Pass shift for delay calculation
            );
            console.log('✅ Monthly shift record created/updated');

            // RESTORE: Record performance at check-in (like before)
            const { 
              recordCheckInPerformance,
              calculateDelay,
              notifyAdminsAboutDelay
            } = await import('@/lib/performanceApi');
            
            await recordCheckInPerformance(
              userId,
              currentWorkDay.workDayStart, // Use work day start as reference date
              detectedShift.id,
              detectedShift.startTime,
              checkInTime
            );
            console.log('✅ Performance tracking recorded at check-in');

            // Calculate delay for notifications and admin alerts
            const delayMinutes = calculateDelay(detectedShift.startTime, checkInTime);

            // SEND PERFORMANCE NOTIFICATION TO EMPLOYEE
            try {
              const { autoNotifyPerformanceOnCheckout } = await import('@/lib/employeeNotifications');
              
              // Calculate basic performance for check-in notification
              const performanceScore = delayMinutes <= 0 ? 100 : Math.max(0, 100 - (delayMinutes / 5));
              const punctualityScore = performanceScore; // Same as performance for check-in
              
              const feedback = {
                message: delayMinutes > 0 
                  ? `You were ${delayMinutes} minutes late. Try to arrive on time for better performance!`
                  : `Perfect! You checked in on time. Great start to your shift!`,
                recommendations: delayMinutes > 15 
                  ? ['Set multiple alarms to avoid being late', 'Plan to arrive 10 minutes early', 'Check traffic conditions before leaving']
                  : delayMinutes > 0 
                    ? ['Try to arrive 5 minutes early next time']
                    : []
              };

              await autoNotifyPerformanceOnCheckout(userId, {
                finalScore: performanceScore,
                delayMinutes,
                actualHours: 0, // Unknown at check-in
                expectedHours: 8, // Default
                overtimeHours: 0, // Unknown at check-in
                punctualityScore,
                workDurationScore: 100, // Unknown at check-in
                feedback
              });

              console.log('✅ Check-in performance notification sent to employee');
            } catch (notifyError) {
              console.error('⚠️ Error sending check-in notification:', notifyError);
            }

            // Notify admins if late
             if (delayMinutes > 5) {
              await notifyAdminsAboutDelay(delayMinutes, userData.name, userId);
              toast.warning(`⚠️ You are ${delayMinutes} minutes late for your ${detectedShift.name}`, {
                duration: 5000,
              });
            } else if (delayMinutes < -10) {
              toast.success(`⭐ You're early! Checked in ${Math.abs(delayMinutes)} minutes before your ${detectedShift.name}`, {
                duration: 3000,
              });
            } else {
              toast.success(`✅ On time check-in for ${detectedShift.name}`);
            }
          } else {
            console.warn('⚠️ No assigned shift found for user and no matching shift for check-in time');
            toast.success('Check-in successful - no shift assignment found');
          }
        } catch (shiftError) {
          console.error('❌ Error handling shift tracking:', shiftError);
          toast.success('Check-in successful (shift tracking failed - check console for details)');
          
          // Log the specific error for debugging
          if (shiftError instanceof Error) {
            console.error('Shift tracking error details:', {
              message: shiftError.message,
              stack: shiftError.stack,
              userId,
              checkInTime: checkInTime.toISOString()
            });
          }
        }
      } else {
        toast.success('Check-in successful');
      }
      
              // Add the new check-in to the local state
        if (data && data[0]) {
          const newCheckIn: CheckIn = {
            id: data[0].id,
            userId: data[0].user_id,
            timestamp: new Date(data[0].timestamp),
            checkoutTime: data[0].checkout_time ? new Date(data[0].checkout_time) : undefined,
            checkOutTime: data[0].checkout_time ? new Date(data[0].checkout_time) : undefined, // Also include checkOutTime to match types/index.ts
            userName: userData.name,
            department: userData.department,
            position: userData.position
          };
          
          setCheckIns(prev => [newCheckIn, ...prev]);
          
          // Update check-in status for current user
          if (userId === user?.id) {
            setIsCheckedIn(true);
            setCurrentCheckIn(newCheckIn);
          }
          
          // Real-time performance recording for check-in
          if (['Customer Service', 'Designer', 'Copy Writing', 'Media Buyer', 'Web Developer'].includes(userData.position)) {
            try {
              const shifts = await fetchShifts();
              const detectedShift = await determineShift(new Date(data[0].timestamp), shifts, userId);
              
              if (detectedShift) {
                const { recordCheckInPerformance } = await import('@/lib/performanceApi');
                await recordCheckInPerformance(
                  userId,
                  new Date(data[0].timestamp),
                  detectedShift.id,
                  detectedShift.startTime,
                  new Date(data[0].timestamp)
                );
                console.log('✅ Real-time check-in performance recorded');
              }
            } catch (performanceError) {
              console.error('❌ Error in real-time check-in performance recording:', performanceError);
            }
          }
        }
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error('Failed to check in');
    }
  };
  
  const checkOutUser = async (userId: string) => {
    try {
      // Get the user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('name, department, position')
        .eq('id', userId)
        .single();
        
      if (userError) throw userError;
      
      // Get work day boundaries (falls back to midnight if not available)
      let currentWorkDay = workDayBoundaries;
      if (!currentWorkDay) {
        // Load work day boundaries if not already loaded
        try {
          const { getCurrentWorkDayBoundaries } = await import('@/lib/shiftsApi');
          currentWorkDay = await getCurrentWorkDayBoundaries();
        } catch (error) {
          console.error('Error loading work day boundaries for check-out:', error);
          // Fallback to midnight-based boundaries
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          currentWorkDay = { workDayStart: today, workDayEnd: tomorrow };
        }
      }
      
      // Find today's check-in using work day boundaries
      const existingCheckIn = checkIns.find(checkIn => {
        const checkInTime = new Date(checkIn.timestamp);
        return checkIn.userId === userId && 
               checkInTime >= currentWorkDay!.workDayStart && 
               checkInTime < currentWorkDay!.workDayEnd && 
               !checkIn.checkoutTime;
      });
      
      if (!existingCheckIn) {
        toast.error('No check-in found for today');
        return;
      }
      
      const checkOutTime = new Date();
      
      // Update the check-in record with checkout time and get the updated record with break time data
      const { data: updatedCheckIn, error } = await supabase
        .from('check_ins')
        .update({ checkout_time: checkOutTime.toISOString() })
        .eq('id', existingCheckIn.id)
        .select('total_break_minutes')
        .single();
        
      if (error) throw error;
      
      // Get break time data (default to 0 if not available)
      const totalBreakMinutes = updatedCheckIn?.total_break_minutes || 0;
      console.log('🔄 Break time at checkout:', { totalBreakMinutes });
      
      // Enhanced shift tracking for all employees
      try {
        console.log('🔄 Starting shift tracking for checkout:', {
          userId,
          position: userData.position,
          checkInTime: existingCheckIn.timestamp,
          checkOutTime
        });

        const shifts = await fetchShifts();
        console.log('📋 Available shifts for tracking:', shifts.length);
        
        // IMPORTANT: Pass userId to get assigned shift instead of guessing by time
        let detectedShift;
        try {
          detectedShift = await determineShift(existingCheckIn.timestamp, shifts, userId);
          console.log('🎯 Detected shift for checkout:', detectedShift ? detectedShift.name : 'None');
        } catch (shiftLookupError) {
          console.warn('⚠️ Shift lookup failed during checkout:', shiftLookupError);
          // Fallback: try to determine shift by time without assignment lookup
          const { determineShiftByTime } = await import('@/lib/shiftsApi');
          detectedShift = determineShiftByTime(existingCheckIn.timestamp, shifts);
          console.log('🎯 Fallback shift detection:', detectedShift ? detectedShift.name : 'None');
        }
        
        if (detectedShift) {
          // Calculate hours using flexible overtime rules (excluding break time)
          const hoursWorked = calculateHours(existingCheckIn.timestamp, checkOutTime, totalBreakMinutes);
          const { regularHours, overtimeHours } = await calculateRegularAndOvertimeHours(existingCheckIn.timestamp, checkOutTime, detectedShift, totalBreakMinutes);
          
          console.log('⏱️ Hours calculation:', {
            hoursWorked: hoursWorked.toFixed(2),
            regularHours: regularHours.toFixed(2),
            overtimeHours: overtimeHours.toFixed(2)
          });

          // Update monthly shift record for all employee positions
          if (['Customer Service', 'Designer', 'Copy Writing', 'Media Buyer', 'Web Developer'].includes(userData.position)) {
            try {
              await updateMonthlyShiftCheckout(
                userId,
                detectedShift.id,
                currentWorkDay.workDayStart, // Use work day start as reference date
                checkOutTime,
                regularHours,
                overtimeHours
              );
              console.log('✅ Monthly shift record updated');

              // Record COMPLETE performance tracking for check-out (includes delay + work duration)
              const { recordCheckOutPerformance } = await import('@/lib/performanceApi');
              const performanceResult = await recordCheckOutPerformance(
                userId,
                currentWorkDay.workDayStart, // Use work day start as reference date
                checkOutTime,
                regularHours,
                overtimeHours
              );
              
              console.log('✅ Complete performance tracking recorded at checkout:', performanceResult);

              // Show performance feedback
              if (performanceResult && performanceResult.feedback) {
                const feedback = performanceResult.feedback;
                if (feedback.type === 'success') {
                  toast.success(feedback.message, {
                    duration: 5000,
                  });
                } else if (feedback.type === 'warning') {
                  toast.warning(feedback.message, {
                    duration: 4000,
                  });
                }
                
                if (feedback.recommendations && feedback.recommendations.length > 0) {
                  console.log('💡 Performance recommendations:', feedback.recommendations);
                }
              }
            } catch (performanceError) {
              console.error('❌ Error in performance tracking:', performanceError);
            }
          }

          // Show success message with hours
          if (overtimeHours > 0) {
            toast.success(`✅ Check-out successful! You worked ${hoursWorked.toFixed(1)} hours (${overtimeHours.toFixed(1)}h overtime)`, {
              duration: 4000,
            });
          } else {
            toast.success(`✅ Check-out successful! You worked ${hoursWorked.toFixed(1)} hours`);
          }
        } else {
          console.log('⚠️ No shift detected, showing basic success message');
          toast.success('✅ Check-out successful!');
        }
      } catch (shiftError) {
        console.error('❌ Detailed shift tracking error:', {
          error: shiftError,
          message: shiftError instanceof Error ? shiftError.message : 'Unknown error',
          stack: shiftError instanceof Error ? shiftError.stack : undefined
        });
        toast.success('✅ Check-out successful! (Shift tracking had issues - check console for details)');
      }
      
      // Update the local state
      setCheckIns(prev => prev.map(checkIn => 
        checkIn.id === existingCheckIn.id 
          ? { ...checkIn, checkoutTime: checkOutTime, checkOutTime: checkOutTime }
          : checkIn
      ));
      
      // Update check-in status for current user
      if (userId === user?.id) {
        setIsCheckedIn(false);
        setCurrentCheckIn(null);
      }
      
      // Send notification to admins about check-out
      if (['Customer Service', 'Designer', 'Copy Writing', 'Media Buyer', 'Web Developer'].includes(userData.position)) {
        await sendNotificationToAdmins(
          'Employee Check-out',
          `${userData.name} checked out at ${format(checkOutTime, 'HH:mm')}`,
          userId
        );
      }
    } catch (error) {
      console.error('Error checking out:', error);
      toast.error('Failed to check out');
    }
  };
  
  const submitWorkReport = async (userId: string, reportInput: {
    tasksDone: string;
    issuesFaced?: string | null;
    plansForTomorrow: string;
  }, fileAttachment?: File) => {
    try {
      // Get user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('name, department, position')
        .eq('id', userId)
        .single();
        
      if (userError) throw userError;
      
      // Use current date - this ensures the date is in the user's timezone
      const today = new Date();
      const formattedDate = format(today, 'yyyy-MM-dd');
      
      // Check if a report has already been submitted for today
      const { data: existingReport, error: checkError } = await supabase
        .from('work_reports')
        .select('id')
        .eq('user_id', userId)
        .eq('date', formattedDate)
        .single();
        
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw checkError;
      }
      
      if (existingReport) {
        toast.error('You have already submitted a report for today');
        return;
      }
      
      // Create a new work report
      const { data: newReport, error: reportError } = await supabase
        .from('work_reports')
        .insert([{
          user_id: userId,
          date: formattedDate,
          tasks_done: reportInput.tasksDone,
          issues_faced: reportInput.issuesFaced || null,
          plans_for_tomorrow: reportInput.plansForTomorrow
        }])
        .select()
        .single();
        
      if (reportError) throw reportError;
      
      let fileAttachments: string[] = [];
      
        // Handle file attachment if provided
      if (fileAttachment && newReport) {
          const fileName = fileAttachment.name;
        const filePath = `${userId}/${newReport.id}/${fileName}`;
          
          // Upload file to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('attachments')
          .upload(filePath, fileAttachment, {
            cacheControl: '3600',
            upsert: false
          });
            
          if (uploadError) {
            console.error('Error uploading file:', uploadError);
          toast.error('Failed to upload attachment');
          } else {
            // Record file attachment in the database
            const { error: attachmentError } = await supabase
              .from('file_attachments')
              .insert([{
                work_report_id: newReport.id,
                file_name: fileName,
                file_path: filePath,
                file_size: fileAttachment.size,
                file_type: fileAttachment.type || 'application/octet-stream'
              }]);
              
            if (attachmentError) {
              console.error('Error recording file attachment:', attachmentError);
            } else {
              fileAttachments = [fileName];
            }
          }
        }
      
      // Add the new report to the local state
      const formattedReport: WorkReport = {
        id: newReport.id,
        userId: newReport.user_id,
        userName: userData.name,
        date: new Date(newReport.date),
        tasksDone: newReport.tasks_done,
        issuesFaced: newReport.issues_faced,
        plansForTomorrow: newReport.plans_for_tomorrow,
        createdAt: new Date(newReport.created_at),
        department: userData.department,
        position: userData.position,
        fileAttachments
      };
      
      setWorkReports(prev => [formattedReport, ...prev]);
      toast.success('Work report submitted successfully');
    } catch (error) {
      console.error('Error submitting work report:', error);
      toast.error('Failed to submit work report');
    }
  };
  
  const hasCheckedInToday = (userId: string): boolean => {
    if (!workDayBoundaries) {
      // Fallback to midnight-based logic if boundaries not loaded yet
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const result = checkIns.some(checkIn => {
        const checkInDate = new Date(checkIn.timestamp);
        checkInDate.setHours(0, 0, 0, 0);
        return checkIn.userId === userId && checkInDate.getTime() === today.getTime();
      });
      
      console.log('📅 hasCheckedInToday (fallback):', { userId, result, today: today.toISOString() });
      return result;
    }

    const result = checkIns.some(checkIn => {
      const checkInTime = new Date(checkIn.timestamp);
      const isInRange = checkIn.userId === userId && 
             checkInTime >= workDayBoundaries.workDayStart && 
             checkInTime < workDayBoundaries.workDayEnd;
      
      if (checkIn.userId === userId) {
        console.log('🔍 Checking check-in:', {
          checkInId: checkIn.id,
          timestamp: checkInTime.toISOString(),
          workDayStart: workDayBoundaries.workDayStart.toISOString(),
          workDayEnd: workDayBoundaries.workDayEnd.toISOString(),
          isInRange
        });
      }
      
      return isInRange;
    });
    
    console.log('📅 hasCheckedInToday:', { userId, result, workDayBoundaries });
    return result;
  };
  
  const hasCheckedOutToday = (userId: string): boolean => {
    if (!workDayBoundaries) {
      // Fallback to midnight-based logic if boundaries not loaded yet
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayCheckIn = checkIns.find(checkIn => {
        const checkInDate = new Date(checkIn.timestamp);
        checkInDate.setHours(0, 0, 0, 0);
        return checkIn.userId === userId && checkInDate.getTime() === today.getTime();
      });
      
      const result = todayCheckIn ? !!(todayCheckIn.checkoutTime || todayCheckIn.checkOutTime) : false;
      console.log('📅 hasCheckedOutToday (fallback):', { 
        userId, 
        result, 
        todayCheckIn: todayCheckIn ? {
          id: todayCheckIn.id,
          checkoutTime: todayCheckIn.checkoutTime,
          checkOutTime: todayCheckIn.checkOutTime
        } : null 
      });
      return result;
    }

    const todayCheckIn = checkIns.find(checkIn => {
      const checkInTime = new Date(checkIn.timestamp);
      return checkIn.userId === userId && 
             checkInTime >= workDayBoundaries.workDayStart && 
             checkInTime < workDayBoundaries.workDayEnd;
    });
    
    const result = todayCheckIn ? !!(todayCheckIn.checkoutTime || todayCheckIn.checkOutTime) : false;
    console.log('📅 hasCheckedOutToday:', { 
      userId, 
      result, 
      todayCheckIn: todayCheckIn ? {
        id: todayCheckIn.id,
        timestamp: todayCheckIn.timestamp,
        checkoutTime: todayCheckIn.checkoutTime,
        checkOutTime: todayCheckIn.checkOutTime
      } : null,
      workDayBoundaries 
    });
    return result;
  };
  
  const getUserLatestCheckIn = (userId: string): CheckIn | null => {
    const userCheckIns = getUserCheckIns(userId);
    return userCheckIns.length > 0 ? userCheckIns[0] : null;
  };
  
  const hasSubmittedReportToday = (userId: string): boolean => {
    if (!workDayBoundaries) {
      // Fallback to midnight-based logic if boundaries not loaded yet
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return workReports.some(report => {
        const reportDate = new Date(report.date);
        reportDate.setHours(0, 0, 0, 0);
        return report.userId === userId && reportDate.getTime() === today.getTime();
      });
    }

    return workReports.some(report => {
      const reportDate = new Date(report.date);
      return report.userId === userId && 
             reportDate >= workDayBoundaries.workDayStart && 
             reportDate < workDayBoundaries.workDayEnd;
    });
  };
  
  const deleteWorkReport = async (reportId: string) => {
    try {
      // Delete file attachments first
      const { error: attachmentError } = await supabase
        .from('file_attachments')
        .delete()
        .eq('work_report_id', reportId);
        
      if (attachmentError) {
        console.error('Error deleting file attachments:', attachmentError);
      }
      
      // Delete the work report
      const { error } = await supabase
        .from('work_reports')
        .delete()
        .eq('id', reportId);
        
      if (error) throw error;
      
      // Update local state
      setWorkReports(prev => prev.filter(report => report.id !== reportId));
      toast.success('Work report deleted successfully');
    } catch (error) {
      console.error('Error deleting work report:', error);
      toast.error('Failed to delete work report');
    }
  };
  
  const refreshCheckIns = async () => {
    if (!user) return;

    console.log('🔄 Refreshing check-ins for user:', user.name);

    try {
      // Use the same logic as fetchCheckIns but with enhanced debugging
      const { data: checkInsData, error: checkInsError } = await supabase
        .from('check_ins')
        .select(`
          *, 
          users:user_id(name, department, position),
          break_sessions,
          break_start_time,
          break_end_time,
          total_break_minutes,
          is_on_break,
          current_break_reason
        `)
        .order('timestamp', { ascending: false });
        
      if (checkInsError) {
        console.error('❌ Error refreshing check-ins:', checkInsError);
        throw checkInsError;
      }

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, department, position');

      if (usersError) {
        console.error('❌ Error fetching users during refresh:', usersError);
        throw usersError;
      }
      
      // Create a map of user details for quick lookup
      const usersMap = usersData.reduce((acc: Record<string, any>, user) => {
        acc[user.id] = user;
        return acc;
      }, {});
      
      const formattedCheckIns: CheckIn[] = checkInsData.map(item => {
        const userInfo = usersMap[item.user_id] || {};
        
        // Parse break sessions from JSONB (same as fetchCheckIns)
        let breakSessions: BreakSession[] = [];
        try {
          if (item.break_sessions && Array.isArray(item.break_sessions)) {
            breakSessions = item.break_sessions;
          } else if (typeof item.break_sessions === 'string') {
            breakSessions = JSON.parse(item.break_sessions);
          }
        } catch (error) {
          console.warn('Error parsing break sessions during refresh for check-in:', item.id, error);
          breakSessions = [];
        }
        
        console.log('🔄 Refresh - Check-in break data for', userInfo.name || 'Unknown', ':', {
          id: item.id,
          totalBreakMinutes: item.total_break_minutes,
          isOnBreak: item.is_on_break,
          breakSessions: breakSessions,
          currentBreakReason: item.current_break_reason
        });
        
        return {
          id: item.id,
          userId: item.user_id,
          timestamp: new Date(item.timestamp),
          checkoutTime: item.checkout_time ? new Date(item.checkout_time) : undefined,
          checkOutTime: item.checkout_time ? new Date(item.checkout_time) : undefined,
          userName: userInfo.name || 'Unknown User',
          department: userInfo.department || 'Unknown',
          position: userInfo.position || 'Unknown',
          // Break time fields (same as fetchCheckIns)
          breakStartTime: item.break_start_time ? new Date(item.break_start_time) : null,
          breakEndTime: item.break_end_time ? new Date(item.break_end_time) : null,
          totalBreakMinutes: item.total_break_minutes || 0,
          isOnBreak: item.is_on_break || false,
          currentBreakReason: item.current_break_reason || '',
          breakSessions: breakSessions,
        };
      });
      
      console.log('✅ Check-ins refreshed successfully:', {
        total: formattedCheckIns.length,
        userCheckIns: formattedCheckIns.filter(ci => ci.userId === user.id).length,
        currentUserRecent: formattedCheckIns
          .filter(ci => ci.userId === user.id)
          .slice(0, 2)
          .map(ci => ({
            id: ci.id,
            timestamp: ci.timestamp,
            hasCheckOut: !!(ci.checkOutTime || ci.checkoutTime)
          }))
      });
      
      // Deduplicate check-ins by ID to prevent UI issues
      const uniqueCheckIns = formattedCheckIns.filter((checkIn, index, array) => 
        array.findIndex(item => item.id === checkIn.id) === index
      );
      
      console.log('🔍 Deduplication result:', {
        original: formattedCheckIns.length,
        deduplicated: uniqueCheckIns.length,
        duplicatesRemoved: formattedCheckIns.length - uniqueCheckIns.length
      });
      
      setCheckIns(uniqueCheckIns);

    } catch (error) {
      console.error('❌ Error refreshing check-ins:', error);
      toast.error('Failed to refresh check-in data');
    }
  };
  
  const refreshWorkReports = async () => {
    try {
      const { data: workReportsData, error: workReportsError } = await supabase
        .from('work_reports')
        .select('*, users:user_id(name, department, position)')
        .order('created_at', { ascending: false });
        
      if (workReportsError) throw workReportsError;

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, department, position');

      if (usersError) throw usersError;
      
      // Create a map of user details for quick lookup
      const usersMap = usersData.reduce((acc: Record<string, any>, user) => {
        acc[user.id] = user;
        return acc;
      }, {});
      
      const formattedWorkReports: WorkReport[] = workReportsData.map(item => {
        const userInfo = usersMap[item.user_id] || {};
        return {
          id: item.id,
          userId: item.user_id,
          userName: userInfo.name || 'Unknown User',
          department: userInfo.department || 'Unknown',
          position: userInfo.position || 'Unknown',
          date: new Date(item.date),
          tasksDone: item.tasks_done,
          issuesFaced: item.issues_faced,
          plansForTomorrow: item.plans_for_tomorrow,
          createdAt: new Date(item.created_at),
          fileAttachments: item.file_attachments || []
        };
      });
      
      setWorkReports(formattedWorkReports);
    } catch (error) {
      console.error('Error refreshing work reports:', error);
    }
  };
  
  // Function to check in user
  const checkIn = async () => {
    if (!user) return;
    await checkInUser(user.id);
    await notifyAdmins('check_in', user.name);
  };

  // Function to check out user  
  const checkOut = async () => {
    if (!user) return;
    await checkOutUser(user.id);
    await notifyAdmins('check_out', user.id);
  };

  // Function to force refresh work day boundaries
  const forceRefreshBoundaries = async () => {
    try {
      const { getCurrentWorkDayBoundaries } = await import('@/lib/shiftsApi');
      const boundaries = await getCurrentWorkDayBoundaries();
      setWorkDayBoundaries(boundaries);
      console.log('🔄 Work day boundaries force refreshed:', boundaries);
    } catch (error) {
      console.error('Error force refreshing work day boundaries:', error);
    }
  };

  // Helper function to calculate work hours
  const calculateHours = (checkInTime: Date, checkOutTime: Date, totalBreakMinutes: number = 0): number => {
    const diffMs = checkOutTime.getTime() - checkInTime.getTime();
    const totalHours = diffMs / (1000 * 60 * 60); // Convert milliseconds to hours
    const breakHours = totalBreakMinutes / 60; // Convert break minutes to hours
    const actualWorkHours = Math.max(0, totalHours - breakHours); // Actual work time excluding breaks
    
    console.log('⏱️ Hours calculation with break time:', {
      totalTime: totalHours.toFixed(2) + 'h',
      breakTime: breakHours.toFixed(2) + 'h',
      actualWorkTime: actualWorkHours.toFixed(2) + 'h'
    });
    
    return actualWorkHours;
  };

  // Helper function to calculate regular and overtime hours with flexible rules
  const calculateRegularAndOvertimeHours = async (checkInTime: Date, checkOutTime: Date, shift: Shift, totalBreakMinutes: number = 0) => {
    // Use the new flexible calculateWorkHours function from shiftsApi
    const { calculateWorkHours } = await import('@/lib/shiftsApi');
    
    // Calculate total time first
    const totalMinutes = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60);
    const totalHours = totalMinutes / 60;
    
    // Subtract break time to get actual work time
    const breakHours = totalBreakMinutes / 60;
    const actualWorkHours = Math.max(0, totalHours - breakHours);
    
    // Create adjusted check-out time to reflect actual work duration
    const adjustedCheckOutTime = new Date(checkInTime.getTime() + (actualWorkHours * 60 * 60 * 1000));
    
    const result = calculateWorkHours(checkInTime, adjustedCheckOutTime, shift);
    
    console.log(`📊 Flexible hours calculation for ${shift.name} (with break adjustment):`, {
      checkInTime: checkInTime.toISOString(),
      checkOutTime: checkOutTime.toISOString(),
      totalHours: totalHours.toFixed(2),
      breakHours: breakHours.toFixed(2),
      actualWorkHours: actualWorkHours.toFixed(2),
      regularHours: result.regularHours.toFixed(2),
      overtimeHours: result.overtimeHours.toFixed(2),
      rules: shift.name.toLowerCase().includes('day') 
        ? 'Day shift: Before 9AM or after 4PM = overtime'
        : 'Night shift: Between 12AM-4AM = overtime'
    });
    
    return result;
  };

  // Helper function to update monthly shift checkout
  const updateMonthlyShiftCheckout = async (
    userId: string,
    shiftId: string,
    workDate: Date,
    checkOutTime: Date,
    regularHours: number,
    overtimeHours: number
  ) => {
    const workDateStr = format(workDate, 'yyyy-MM-dd');
    
    try {
      // RECALCULATE DELAY ON CHECKOUT
      // First, get the check-in time and shift start time
      const { data: monthlyShift, error: fetchError } = await supabase
        .from('monthly_shifts')
        .select(`
          check_in_time,
          shifts:shift_id(start_time, name)
        `)
        .eq('user_id', userId)
        .eq('work_date', workDateStr)
        .single();

      if (fetchError) {
        console.error('Error fetching monthly shift for delay calculation:', fetchError);
        throw fetchError;
      }

      let delayMinutes = 0;
      let earlyCheckoutPenalty = 0;

      if (monthlyShift?.check_in_time && monthlyShift?.shifts) {
        const checkInTime = new Date(monthlyShift.check_in_time);
        const shift = monthlyShift.shifts as any; // Type assertion for the shift object
        
        // Calculate total work time and expected hours
        const totalHoursWorked = regularHours + overtimeHours;

        // Dynamically determine expected hours for the shift.
        const getExpectedHours = (shiftObj: { name: string; start_time: string; end_time: string }): number => {
          const nameLower = (shiftObj.name || '').toLowerCase();
          if (nameLower.includes('day')) return 7;
          if (nameLower.includes('night')) return 8;

          // Custom shift: derive expected hours from start/end time strings (HH:MM)
          try {
            const [startH, startM] = shiftObj.start_time.split(':').map(Number);
            const [endH, endM] = shiftObj.end_time.split(':').map(Number);

            let durationMinutes: number;

            // Handle overnight shift where end time is next day.
            if (endH < startH || (endH === startH && endM < startM)) {
              durationMinutes = (24 * 60 - (startH * 60 + startM)) + (endH * 60 + endM);
            } else {
              durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
            }

            return durationMinutes / 60;
          } catch (e) {
            console.error('Error parsing custom shift hours, falling back to 7h', e);
            return 7; // Safe fallback
          }
        };

        const expectedHours = getExpectedHours(shift);
        
        // Calculate scheduled start time (used in both scenarios)
        const [startHour, startMin] = shift.start_time.split(':').map(Number);
        const scheduledStart = new Date(checkInTime);
        scheduledStart.setHours(startHour, startMin, 0, 0);
        const rawDelayMs = checkInTime.getTime() - scheduledStart.getTime();
        const rawDelayHours = Math.max(0, rawDelayMs / (1000 * 60 * 60));
        
        // NEW LOGIC: Smart Delay Calculation Based on Work Completion
        // If worked less than expected: Delay = Expected Hours - Worked Hours
        // If worked full/overtime: Delay = Raw Delay - Overtime Hours
        
        const rawDelayMinutes = rawDelayHours * 60; // Convert to minutes
        const totalWorkedHours = regularHours + overtimeHours; // Combined hours
        
        if (totalWorkedHours < expectedHours) {
          // Early checkout: Show missing hours as delay
          const hoursShort = expectedHours - totalWorkedHours;
          delayMinutes = hoursShort * 60; // Convert to minutes
          
          console.log('⚠️ Early Checkout - Hours Short as Delay:', {
            expectedHours,
            workedHours: totalWorkedHours.toFixed(2),
            hoursShort: hoursShort.toFixed(2),
            delayMinutes: delayMinutes.toFixed(1)
          });
        } else if (totalWorkedHours >= expectedHours) {
          // Completed expected hours or more: No delay penalty
          delayMinutes = 0;
          
          console.log('✅ Full Shift Completed - No Delay Penalty:', {
            expectedHours,
            workedHours: totalWorkedHours.toFixed(2),
            rawDelayMinutes: rawDelayMinutes.toFixed(1),
            finalDelay: 0
          });
        } else {
          // Overtime work: Apply offset formula
          const overtimeOffset = overtimeHours * 60; // Convert to minutes
          delayMinutes = Math.max(0, rawDelayMinutes - overtimeOffset);
          
          console.log('✅ Overtime Work - Delay with Overtime Offset:', {
            rawDelayMinutes: rawDelayMinutes.toFixed(1),
            overtimeOffset: overtimeOffset.toFixed(1),
            finalDelay: delayMinutes.toFixed(1)
          });
        }
        
        // Track early checkout penalty separately
        if (totalHoursWorked < expectedHours) {
          earlyCheckoutPenalty = expectedHours - totalHoursWorked;
        } else {
          earlyCheckoutPenalty = 0;
        }
        
                 console.log('✅ Smart Delay Calculation Applied:', {
           totalWorkedHours: totalWorkedHours.toFixed(2),
           expectedHours: expectedHours,
           regularHours: regularHours.toFixed(2),
           overtimeHours: overtimeHours.toFixed(2),
           finalDelayMinutes: delayMinutes.toFixed(1),
           delayToFinishHours: (delayMinutes / 60).toFixed(2) + 'h',
           earlyCheckoutPenalty: earlyCheckoutPenalty.toFixed(2) + 'h'
         });
        
        console.log('🔄 Delay & Penalty Recalculated on Checkout:', {
          employee: userId,
          shift: shift.name,
          scheduledStart: scheduledStart.toLocaleTimeString(),
          actualCheckIn: checkInTime.toLocaleTimeString(),
          delayMinutes: delayMinutes.toFixed(2),
          totalWorked: totalHoursWorked.toFixed(2),
          expectedHours,
          earlyCheckoutPenalty: earlyCheckoutPenalty.toFixed(2)
        });
      }

      // Update with recalculated values
      const updateData: any = {
        check_out_time: checkOutTime.toISOString(),
        regular_hours: regularHours,
        overtime_hours: overtimeHours,
        delay_minutes: Math.round(delayMinutes * 100) / 100, // Round to 2 decimal places
        updated_at: new Date().toISOString()
      };

      // Add early checkout penalty if applicable
      if (earlyCheckoutPenalty > 0) {
        updateData.early_checkout_penalty = Math.round(earlyCheckoutPenalty * 100) / 100;
      }

      const { error } = await supabase
        .from('monthly_shifts')
        .update(updateData)
        .eq('user_id', userId)
        .eq('work_date', workDateStr);

      if (error) {
        console.error('Error updating monthly shift checkout:', error);
        throw error;
      }

      console.log('✅ Monthly shift updated with recalculated delay and penalty:', updateData);
      
    } catch (error) {
      console.error('Error in updateMonthlyShiftCheckout:', error);
      throw error;
    }
  };

  // Helper function to send notifications to admins
  const sendNotificationToAdmins = async (title: string, message: string, createdBy: string) => {
    try {
      // Get all admin users
      const { data: admins, error } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin');

      if (error) throw error;

      // Send notification to all admins
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        title,
        message,
        created_by: createdBy,
        created_at: new Date().toISOString()
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) throw notificationError;
    } catch (error) {
      console.error('Error sending notification to admins:', error);
    }
  };

  const contextValue: CheckInContextType = {
    checkIns,
    workReports,
    isLoading,
    getUserCheckIns,
    getUserWorkReports,
    checkInUser,
    checkOutUser,
    submitWorkReport,
    hasCheckedInToday,
    hasCheckedOutToday,
    getUserLatestCheckIn,
    hasSubmittedReportToday,
    deleteWorkReport,
    isCheckedIn,
    currentCheckIn,
    checkIn,
    checkOut,
    todaysHours,
    refreshCheckIns,
    refreshWorkReports,
    workDayBoundaries,
    forceRefreshBoundaries,
  };
  
  return (
    <CheckInContext.Provider value={contextValue}>
      {children}
    </CheckInContext.Provider>
  );
};

export const useCheckIn = () => {
  const context = useContext(CheckInContext);
  if (context === undefined) {
    throw new Error('useCheckIn must be used within a CheckInProvider');
  }
  return context;
};
