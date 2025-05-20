import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, CheckIn as CheckInType, WorkReport as WorkReportType } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';

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
}

const CheckInContext = createContext<CheckInContextType | undefined>(undefined);

export const CheckInProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [workReports, setWorkReports] = useState<WorkReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
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
        const user = usersMap[item.user_id] || {};
        return {
          id: item.id,
          userId: item.user_id,
          timestamp: new Date(item.timestamp),
          checkoutTime: item.checkout_time ? new Date(item.checkout_time) : undefined,
          checkOutTime: item.checkout_time ? new Date(item.checkout_time) : undefined, // Also include checkOutTime to match types/index.ts
          userName: user.name || 'Unknown User',
          department: user.department || 'Unknown',
          position: user.position || 'Unknown',
        };
      });
      
      setCheckIns(formattedCheckIns);
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
      
      // Get today's date at the start of the day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Check if user already checked in today
      const existingCheckIn = checkIns.find(checkIn => {
        const checkInDate = new Date(checkIn.timestamp);
        checkInDate.setHours(0, 0, 0, 0);
        return checkIn.userId === userId && checkInDate.getTime() === today.getTime();
      });
      
      if (existingCheckIn) {
        toast.error('You have already checked in today');
        return;
      }
      
      // Create a new check-in record
      const { data, error } = await supabase
        .from('check_ins')
        .insert([{
          user_id: userId,
          timestamp: new Date().toISOString()
        }])
        .select();
        
      if (error) throw error;
      
      // Update the last_checkin time for the user
      await supabase
        .from('users')
        .update({ last_checkin: new Date().toISOString() })
        .eq('id', userId);
      
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
        toast.success('Check-in successful');
      }
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error('Failed to check in');
    }
  };
  
  const checkOutUser = async (userId: string) => {
    try {
      // Get today's date at the start of the day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Find today's check-in record
      const todayCheckIn = checkIns.find(checkIn => {
        const checkInDate = new Date(checkIn.timestamp);
        checkInDate.setHours(0, 0, 0, 0);
        return checkIn.userId === userId && checkInDate.getTime() === today.getTime();
      });
      
      if (!todayCheckIn) {
        toast.error('You need to check in before checking out');
        return;
      }
      
      if (todayCheckIn.checkoutTime) {
        toast.error('You have already checked out today');
        return;
      }
      
      // Update the check-in record with checkout time
      const { error } = await supabase
        .from('check_ins')
        .update({ checkout_time: new Date().toISOString() })
        .eq('id', todayCheckIn.id);
        
      if (error) throw error;
      
      // Update local state
      setCheckIns(prev => prev.map(checkIn => {
        if (checkIn.id === todayCheckIn.id) {
          return {
            ...checkIn,
            checkoutTime: new Date()
          };
        }
        return checkIn;
      }));
      
      toast.success('Check-out successful');
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
                file_type: fileAttachment.type
              }]);
              
            if (attachmentError) {
              console.error('Error recording file attachment:', attachmentError);
            toast.error('Failed to record attachment');
            } else {
              fileAttachments.push(fileName);
            }
          }
        }
        
      // Add the new report to the local state
      if (newReport) {
        const workReport: WorkReport = {
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
        
        setWorkReports(prev => [workReport, ...prev]);
        toast.success('Work report submitted successfully');
      }
    } catch (error) {
      console.error('Error submitting work report:', error);
      toast.error('Failed to submit work report');
    }
  };
  
  const hasCheckedInToday = (userId: string): boolean => {
    // Get today's date at the start of the day in user's local timezone
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return checkIns.some(checkIn => {
      const checkInDate = new Date(checkIn.timestamp);
      checkInDate.setHours(0, 0, 0, 0);
      return checkIn.userId === userId && checkInDate.getTime() === today.getTime();
    });
  };
  
  const hasCheckedOutToday = (userId: string): boolean => {
    // Get today's date at the start of the day in user's local timezone
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return checkIns.some(checkIn => {
      const checkInDate = new Date(checkIn.timestamp);
      checkInDate.setHours(0, 0, 0, 0);
      return (
        checkIn.userId === userId && 
        checkInDate.getTime() === today.getTime() && 
        checkIn.checkoutTime !== undefined
      );
    });
  };
  
  const getUserLatestCheckIn = (userId: string): CheckIn | null => {
    const userCheckIns = getUserCheckIns(userId);
    return userCheckIns.length > 0 ? userCheckIns[0] : null;
  };
  
  const hasSubmittedReportToday = (userId: string): boolean => {
    // Get today's date in user's local timezone
    const today = new Date();
    const formattedToday = format(today, 'yyyy-MM-dd');
    
    return workReports.some(report => {
      const reportDate = format(new Date(report.date), 'yyyy-MM-dd');
      return report.userId === userId && reportDate === formattedToday;
    });
  };
  
  const deleteWorkReport = async (reportId: string) => {
    try {
      // First delete any associated file attachments
      const { error: fileError } = await supabase
        .from('file_attachments')
        .delete()
        .eq('work_report_id', reportId);

      if (fileError) throw fileError;

      // Then delete the work report
      const { error } = await supabase
        .from('work_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      // Update local state
      setWorkReports(prev => prev.filter(report => report.id !== reportId));
      toast.success('Report deleted successfully');
    } catch (error) {
      console.error('Error deleting work report:', error);
      toast.error('Failed to delete report');
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
