
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

export interface CheckIn {
  id: string;
  userId: string;
  timestamp: Date;
  checkoutTime?: Date;
}

export interface WorkReport {
  id: string;
  userId: string;
  date: Date;
  tasksDone: string;
  issuesFaced?: string;
  plansForTomorrow: string;
  createdAt: Date;
}

interface CheckInContextType {
  checkIns: CheckIn[];
  workReports: WorkReport[];
  isLoading: boolean;
  getUserCheckIns: (userId: string) => CheckIn[];
  getUserWorkReports: (userId: string) => WorkReport[];
  checkInUser: (userId: string) => Promise<void>;
  checkOutUser: (userId: string) => Promise<void>;
  submitWorkReport: (userId: string, reportData: {
    tasksDone: string;
    issuesFaced?: string;
    plansForTomorrow: string;
  }) => Promise<void>;
  hasCheckedInToday: (userId: string) => boolean;
  hasCheckedOutToday: (userId: string) => boolean;
  getUserLatestCheckIn: (userId: string) => CheckIn | null;
  hasSubmittedReportToday: (userId: string) => boolean;
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
      const { data, error } = await supabase
        .from('check_ins')
        .select('*')
        .order('timestamp', { ascending: false });
        
      if (error) throw error;
      
      const formattedCheckIns: CheckIn[] = data.map(item => ({
        id: item.id,
        userId: item.user_id,
        timestamp: new Date(item.timestamp),
        checkoutTime: item.checkout_time ? new Date(item.checkout_time) : undefined
      }));
      
      setCheckIns(formattedCheckIns);
    } catch (error) {
      console.error('Error fetching check-ins:', error);
    }
  };
  
  const fetchWorkReports = async () => {
    try {
      const { data, error } = await supabase
        .from('work_reports')
        .select('*')
        .order('date', { ascending: false });
        
      if (error) throw error;
      
      const formattedReports: WorkReport[] = data.map(item => ({
        id: item.id,
        userId: item.user_id,
        date: new Date(item.date),
        tasksDone: item.tasks_done,
        issuesFaced: item.issues_faced,
        plansForTomorrow: item.plans_for_tomorrow,
        createdAt: new Date(item.created_at)
      }));
      
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
          checkoutTime: data[0].checkout_time ? new Date(data[0].checkout_time) : undefined
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
  
  const submitWorkReport = async (userId: string, reportData: {
    tasksDone: string;
    issuesFaced?: string;
    plansForTomorrow: string;
  }) => {
    try {
      // Use current date - this ensures the date is in the user's timezone
      const today = new Date();
      const formattedDate = format(today, 'yyyy-MM-dd');
      
      console.log('Submitting report for date:', formattedDate);
      
      // Check if a report has already been submitted for today
      const existingReport = workReports.find(report => {
        const reportDate = format(new Date(report.date), 'yyyy-MM-dd');
        return report.userId === userId && reportDate === formattedDate;
      });
      
      if (existingReport) {
        toast.error('You have already submitted a report for today');
        return;
      }
      
      // Create a new work report
      const { data, error } = await supabase
        .from('work_reports')
        .insert([{
          user_id: userId,
          date: formattedDate,
          tasks_done: reportData.tasksDone,
          issues_faced: reportData.issuesFaced || null,
          plans_for_tomorrow: reportData.plansForTomorrow
        }])
        .select();
        
      if (error) throw error;
      
      // Add the new report to the local state
      if (data && data[0]) {
        const newReport: WorkReport = {
          id: data[0].id,
          userId: data[0].user_id,
          date: new Date(data[0].date),
          tasksDone: data[0].tasks_done,
          issuesFaced: data[0].issues_faced,
          plansForTomorrow: data[0].plans_for_tomorrow,
          createdAt: new Date(data[0].created_at)
        };
        
        setWorkReports(prev => [newReport, ...prev]);
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
    hasSubmittedReportToday
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
