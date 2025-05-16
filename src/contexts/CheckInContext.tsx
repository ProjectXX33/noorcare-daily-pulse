import React, { createContext, useContext, useState, useEffect } from 'react';
import { CheckIn, WorkReport, Department, Position } from '../types';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

interface CheckInContextType {
  checkIns: CheckIn[];
  workReports: WorkReport[];
  addCheckIn: (userId: string, userName: string, department: Department, position: Position) => Promise<void>;
  addCheckOut: (userId: string) => Promise<void>;
  addWorkReport: (report: Omit<WorkReport, 'id'>, file?: File) => Promise<void>;
  getUserCheckIns: (userId: string) => CheckIn[];
  getUserWorkReports: (userId: string) => WorkReport[];
  hasCheckedInToday: (userId: string) => boolean;
  hasCheckedOutToday: (userId: string) => boolean;
  hasSubmittedReportToday: (userId: string) => boolean;
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

const CheckInContext = createContext<CheckInContextType | undefined>(undefined);

export const CheckInProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [workReports, setWorkReports] = useState<WorkReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { user } = useAuth();

  // Fetch all data on initial load and when user changes
  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user]);

  // Function to reload all data from Supabase
  const refreshData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      await Promise.all([
        fetchCheckIns(),
        fetchWorkReports(),
      ]);
      console.log('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch check-ins from Supabase with a more explicit query
  const fetchCheckIns = async () => {
    try {
      console.log('Fetching check-ins for user:', user?.id, 'role:', user?.role);
      
      // Query based on user role
      const query = supabase.from('check_ins')
        .select(`
          *,
          users:user_id (username, name, department, position)
        `);
        
      if (user?.role !== 'admin') {
        query.eq('user_id', user?.id);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Supabase check-ins error:', error);
        throw error;
      }
      
      console.log('Check-ins fetched:', data?.length || 0, data);
      
      if (data) {
        // Transform database records to app format
        const formattedCheckIns: CheckIn[] = data.map(record => ({
          id: record.id,
          userId: record.user_id,
          timestamp: new Date(record.timestamp),
          userName: record.users?.name || 'Unknown User',
          department: record.users?.department || 'Unknown' as Department,
          position: record.users?.position || 'Unknown' as Position,
          checkOutTime: record.checkout_time ? new Date(record.checkout_time) : null
        }));
        
        setCheckIns(formattedCheckIns);
      }
    } catch (error) {
      console.error('Error fetching check-ins:', error);
      throw error;
    }
  };

  // Fetch work reports from Supabase
  const fetchWorkReports = async () => {
    try {
      // Query based on user role
      const query = user?.role === 'admin' 
        ? supabase.from('work_reports').select(`
            *,
            users:user_id (username, name, department, position),
            file_attachments (id, file_path, file_name)
          `)
        : supabase.from('work_reports').select(`
            *,
            users:user_id (username, name, department, position),
            file_attachments (id, file_path, file_name)
          `).eq('user_id', user?.id);

      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      if (data) {
        // Transform database records to app format
        const formattedReports: WorkReport[] = data.map(record => ({
          id: record.id,
          userId: record.user_id,
          userName: record.users.name,
          date: new Date(record.date),
          tasksDone: record.tasks_done,
          issuesFaced: record.issues_faced || '',
          plansForTomorrow: record.plans_for_tomorrow,
          department: record.users.department,
          position: record.users.position,
          fileAttachments: record.file_attachments?.map(file => file.file_name) || []
        }));
        
        setWorkReports(formattedReports);
      }
    } catch (error) {
      console.error('Error fetching work reports:', error);
      throw error;
    }
  };

  const addCheckIn = async (userId: string, userName: string, department: Department, position: Position) => {
    try {
      setIsLoading(true);
      
      // Insert check-in record
      const { data, error } = await supabase
        .from('check_ins')
        .insert({
          user_id: userId,
          timestamp: new Date().toISOString(),
        })
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      // Update user's last check-in
      await supabase
        .from('users')
        .update({ last_checkin: new Date().toISOString() })
        .eq('id', userId);
      
      // Add to local state
      const newCheckIn: CheckIn = {
        id: data.id,
        userId,
        timestamp: new Date(data.timestamp),
        userName,
        department,
        position,
        checkOutTime: null
      };
      
      setCheckIns(prev => [newCheckIn, ...prev]);
      toast.success('Check-in recorded successfully!');
      
      // Refresh data to ensure everything is up-to-date
      await refreshData();
    } catch (error) {
      console.error('Error adding check-in:', error);
      toast.error('Failed to record check-in');
    } finally {
      setIsLoading(false);
    }
  };

  const addCheckOut = async (userId: string) => {
    try {
      setIsLoading(true);
      
      // Find the latest check-in for this user that doesn't have a check-out time
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayISOString = today.toISOString();
      
      // First, get the most recent check-in without checkout
      const { data: checkInData, error: fetchError } = await supabase
        .from('check_ins')
        .select()
        .eq('user_id', userId)
        .gte('timestamp', todayISOString)
        .is('checkout_time', null)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();
        
      if (fetchError) {
        throw fetchError;
      }
      
      // Update the check-out time
      const { error: updateError } = await supabase
        .from('check_ins')
        .update({ checkout_time: new Date().toISOString() })
        .eq('id', checkInData.id);
        
      if (updateError) {
        throw updateError;
      }
      
      // Update local state
      setCheckIns(prev => 
        prev.map(checkIn => {
          if (checkIn.id === checkInData.id) {
            return {
              ...checkIn,
              checkOutTime: new Date()
            };
          }
          return checkIn;
        })
      );
      
      toast.success('Check-out recorded successfully!');
      
      // Refresh data to ensure everything is up-to-date
      await refreshData();
    } catch (error) {
      console.error('Error adding check-out:', error);
      toast.error('Failed to record check-out');
    } finally {
      setIsLoading(false);
    }
  };

  const addWorkReport = async (report: Omit<WorkReport, 'id'>, file?: File) => {
    try {
      setIsLoading(true);
      
      // Insert work report
      const { data, error } = await supabase
        .from('work_reports')
        .insert({
          user_id: report.userId,
          date: report.date.toISOString(),
          tasks_done: report.tasksDone,
          issues_faced: report.issuesFaced || null,
          plans_for_tomorrow: report.plansForTomorrow,
        })
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      // Upload file if provided
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `work-reports/${data.id}/${fileName}`;
        
        // Upload to storage bucket
        const { error: uploadError } = await supabase
          .storage
          .from('attachments')
          .upload(filePath, file);
          
        if (uploadError) {
          throw uploadError;
        }
        
        // Get public URL
        const { data: urlData } = supabase
          .storage
          .from('attachments')
          .getPublicUrl(filePath);
        
        // Add file reference to database
        await supabase
          .from('file_attachments')
          .insert({
            work_report_id: data.id,
            file_path: filePath,
            file_name: file.name,
            file_type: file.type,
          });
      }
      
      // Create report object for local state with generated ID
      const newReport: WorkReport = {
        id: data.id,
        userId: report.userId,
        userName: report.userName,
        date: report.date,
        tasksDone: report.tasksDone,
        issuesFaced: report.issuesFaced,
        plansForTomorrow: report.plansForTomorrow,
        fileAttachments: file ? [file.name] : undefined,
        department: report.department,
        position: report.position,
      };
      
      setWorkReports(prev => [newReport, ...prev]);
      toast.success('Work report submitted successfully!');
      
      // Refresh data to ensure everything is up-to-date
      await refreshData();
    } catch (error) {
      console.error('Error adding work report:', error);
      toast.error('Failed to submit work report');
    } finally {
      setIsLoading(false);
    }
  };

  const getUserCheckIns = (userId: string): CheckIn[] => {
    return checkIns.filter(checkIn => checkIn.userId === userId);
  };

  const getUserWorkReports = (userId: string): WorkReport[] => {
    return workReports.filter(report => report.userId === userId);
  };

  // Update hasCheckedInToday function to be more explicit about logging
  const hasCheckedInToday = (userId: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayCheckIns = checkIns.filter(checkIn => {
      const checkInDate = new Date(checkIn.timestamp);
      checkInDate.setHours(0, 0, 0, 0);
      
      return checkIn.userId === userId && checkInDate.getTime() === today.getTime();
    });
    
    console.log('Today check-ins for user', userId, ':', todayCheckIns.length, todayCheckIns);
    return todayCheckIns.length > 0;
  };

  const hasCheckedOutToday = (userId: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return checkIns.some(checkIn => {
      const checkInDate = new Date(checkIn.timestamp);
      checkInDate.setHours(0, 0, 0, 0);
      
      return checkIn.userId === userId && 
        checkInDate.getTime() === today.getTime() && 
        checkIn.checkOutTime !== null;
    });
  };

  const hasSubmittedReportToday = (userId: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return workReports.some(report => {
      const reportDate = new Date(report.date);
      reportDate.setHours(0, 0, 0, 0);
      
      return report.userId === userId && reportDate.getTime() === today.getTime();
    });
  };

  return (
    <CheckInContext.Provider 
      value={{ 
        checkIns, 
        workReports, 
        addCheckIn, 
        addCheckOut,
        addWorkReport, 
        getUserCheckIns, 
        getUserWorkReports,
        hasCheckedInToday,
        hasCheckedOutToday,
        hasSubmittedReportToday,
        isLoading,
        refreshData
      }}
    >
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
