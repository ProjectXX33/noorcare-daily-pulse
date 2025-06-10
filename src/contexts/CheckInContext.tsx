import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, CheckIn as CheckInType, WorkReport as WorkReportType, Shift } from '@/types';
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
  department: string;
  position: string;
  checkOutTime?: Date; // Added to match types/index.ts
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
  department: string;
  position: string;
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
    
    // Set up real-time listeners
    const checkInsSubscription = supabase
      .channel('public:check_ins')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'check_ins' }, 
        () => {
          fetchCheckIns();
        }
      )
      .subscribe();
      
    const workReportsSubscription = supabase
      .channel('public:work_reports')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'work_reports' }, 
        () => {
          fetchWorkReports();
        }
      )
      .subscribe();
    
    return () => {
      checkInsSubscription.unsubscribe();
      workReportsSubscription.unsubscribe();
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
    
    // Refresh boundaries every hour to handle day transitions
    const interval = setInterval(loadWorkDayBoundaries, 60 * 60 * 1000);
    
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

  // Subscribe to realtime check-in updates
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('check-ins-realtime')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'check_ins'
        }, 
        (payload) => {
          console.log('Check-in update received:', payload);
          // Refresh check-ins when any change occurs
          refreshCheckIns();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const fetchCheckIns = async () => {
    try {
      const { data: checkInsData, error: checkInsError } = await supabase
        .from('check_ins')
        .select('*, users:user_id(name, department, position)')
        .order('timestamp', { ascending: false });
        
      if (checkInsError) throw checkInsError;

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, department, position');

      if (usersError) throw usersError;
      
      // Create a map of user details for quick lookup
      const usersMap = usersData.reduce((acc: Record<string, any>, user) => {
        acc[user.id] = user;
        return acc;
      }, {});
      
      const formattedCheckIns: CheckIn[] = checkInsData.map(item => {
        const userInfo = usersMap[item.user_id] || {};
        return {
          id: item.id,
          userId: item.user_id,
          timestamp: new Date(item.timestamp),
          checkoutTime: item.checkout_time ? new Date(item.checkout_time) : undefined,
          checkOutTime: item.checkout_time ? new Date(item.checkout_time) : null, // Match types/index.ts which expects Date | null
          userName: userInfo.name || 'Unknown User',
          department: userInfo.department || 'Unknown',
          position: userInfo.position || 'Unknown',
        };
      });
      
      setCheckIns(formattedCheckIns);

      // Check if current user is checked in (for employees) - same logic as refreshCheckIns
      if (user && user.role !== 'admin') {
        const userCheckIns = formattedCheckIns.filter(ci => ci.userId === user.id);
        const today = new Date().toDateString();
        const todayCheckIns = userCheckIns.filter(ci => 
          new Date(ci.timestamp).toDateString() === today
        );
        const activeCheckIn = todayCheckIns.find(ci => !ci.checkOutTime);
        setIsCheckedIn(!!activeCheckIn);
        setCurrentCheckIn(activeCheckIn || null);

        // Calculate today's hours
        let totalHours = 0;
        todayCheckIns.forEach(ci => {
          if (ci.checkOutTime) {
            const checkInTime = new Date(ci.timestamp);
            const checkOutTime = new Date(ci.checkOutTime);
            const hours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
            totalHours += hours;
          }
        });
        setTodaysHours(totalHours);
      }
    } catch (error) {
      console.error('Error fetching check-ins:', error);
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
      
      // For Customer Service and Designer employees, check if today is a day off BEFORE check-in
      if (userData.position === 'Customer Service' || userData.position === 'Designer') {
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
      
      // For Customer Service and Designer employees, handle shift tracking and performance
      if (userData.position === 'Customer Service' || userData.position === 'Designer') {
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
              checkInTime
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
      
      // Update the check-in record with checkout time
      const { error } = await supabase
        .from('check_ins')
        .update({ checkout_time: checkOutTime.toISOString() })
        .eq('id', existingCheckIn.id);
        
      if (error) throw error;
      
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
        const detectedShift = await determineShift(existingCheckIn.timestamp, shifts, userId);
        console.log('🎯 Detected shift for checkout:', detectedShift ? detectedShift.name : 'None');
        
        if (detectedShift) {
          // Calculate hours
          const hoursWorked = calculateHours(existingCheckIn.timestamp, checkOutTime);
          const { regularHours, overtimeHours } = calculateRegularAndOvertimeHours(hoursWorked, detectedShift);
          
          console.log('⏱️ Hours calculation:', {
            hoursWorked: hoursWorked.toFixed(2),
            regularHours: regularHours.toFixed(2),
            overtimeHours: overtimeHours.toFixed(2)
          });

          // Update monthly shift record for Customer Service and Designer only
          if (userData.position === 'Customer Service' || userData.position === 'Designer') {
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
      if (userData.position === 'Customer Service' || userData.position === 'Designer') {
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
                file_size: fileAttachment.size
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
      
      return checkIns.some(checkIn => {
        const checkInDate = new Date(checkIn.timestamp);
        checkInDate.setHours(0, 0, 0, 0);
        return checkIn.userId === userId && checkInDate.getTime() === today.getTime();
      });
    }

    return checkIns.some(checkIn => {
      const checkInTime = new Date(checkIn.timestamp);
      return checkIn.userId === userId && 
             checkInTime >= workDayBoundaries.workDayStart && 
             checkInTime < workDayBoundaries.workDayEnd;
    });
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
      
      return todayCheckIn ? !!todayCheckIn.checkoutTime : false;
    }

    const todayCheckIn = checkIns.find(checkIn => {
      const checkInTime = new Date(checkIn.timestamp);
      return checkIn.userId === userId && 
             checkInTime >= workDayBoundaries.workDayStart && 
             checkInTime < workDayBoundaries.workDayEnd;
    });
    
    return todayCheckIn ? !!todayCheckIn.checkoutTime : false;
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

    try {
      // Use the same logic as fetchCheckIns but with potential date filtering
      const { data: checkInsData, error: checkInsError } = await supabase
        .from('check_ins')
        .select('*, users:user_id(name, department, position)')
        .order('timestamp', { ascending: false });
        
      if (checkInsError) throw checkInsError;

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, department, position');

      if (usersError) throw usersError;
      
      // Create a map of user details for quick lookup
      const usersMap = usersData.reduce((acc: Record<string, any>, user) => {
        acc[user.id] = user;
        return acc;
      }, {});
      
      const formattedCheckIns: CheckIn[] = checkInsData.map(item => {
        const userInfo = usersMap[item.user_id] || {};
        return {
          id: item.id,
          userId: item.user_id,
          timestamp: new Date(item.timestamp),
          checkoutTime: item.checkout_time ? new Date(item.checkout_time) : undefined,
          checkOutTime: item.checkout_time ? new Date(item.checkout_time) : null, // Match types/index.ts which expects Date | null
          userName: userInfo.name || 'Unknown User',
          department: userInfo.department || 'Unknown',
          position: userInfo.position || 'Unknown',
        };
      });
      
      setCheckIns(formattedCheckIns);

      // Check if current user is checked in (for employees)
      if (user.role !== 'admin') {
        const userCheckIns = formattedCheckIns.filter(ci => ci.userId === user.id);
        const today = new Date().toDateString();
        const todayCheckIns = userCheckIns.filter(ci => 
          new Date(ci.timestamp).toDateString() === today
        );
        const activeCheckIn = todayCheckIns.find(ci => !ci.checkOutTime);
        setIsCheckedIn(!!activeCheckIn);
        setCurrentCheckIn(activeCheckIn || null);

        // Calculate today's hours
        let totalHours = 0;
        todayCheckIns.forEach(ci => {
          if (ci.checkOutTime) {
            const checkInTime = new Date(ci.timestamp);
            const checkOutTime = new Date(ci.checkOutTime);
            const hours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
            totalHours += hours;
          }
        });
        setTodaysHours(totalHours);
      }
    } catch (error) {
      console.error('Error refreshing check-ins:', error);
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

  // Helper function to calculate work hours
  const calculateHours = (checkInTime: Date, checkOutTime: Date): number => {
    const diffMs = checkOutTime.getTime() - checkInTime.getTime();
    return diffMs / (1000 * 60 * 60); // Convert milliseconds to hours
  };

  // Helper function to calculate regular and overtime hours
  const calculateRegularAndOvertimeHours = (totalHours: number, shift: Shift) => {
    const standardWorkHours = 8; // 8-hour standard work day
    const regularHours = Math.min(totalHours, standardWorkHours);
    const overtimeHours = Math.max(0, totalHours - standardWorkHours);
    
    return { regularHours, overtimeHours };
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
    
    const { error } = await supabase
      .from('monthly_shifts')
      .update({
        check_out_time: checkOutTime.toISOString(),
        regular_hours: regularHours,
        overtime_hours: overtimeHours,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('work_date', workDateStr);

    if (error) {
      console.error('Error updating monthly shift checkout:', error);
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
