
import React, { createContext, useContext, useState, useEffect } from 'react';
import { CheckIn, User, WorkReport } from '../types';
import { mockCheckIns, mockWorkReports } from '../data/mockData';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';

interface CheckInContextType {
  checkIns: CheckIn[];
  workReports: WorkReport[];
  addCheckIn: (userId: string, userName: string, department: string, position: string) => void;
  addCheckOut: (userId: string) => void;
  addWorkReport: (report: Omit<WorkReport, 'id'>) => void;
  getUserCheckIns: (userId: string) => CheckIn[];
  getUserWorkReports: (userId: string) => WorkReport[];
  hasCheckedInToday: (userId: string) => boolean;
  hasCheckedOutToday: (userId: string) => boolean;
  hasSubmittedReportToday: (userId: string) => boolean;
}

const CheckInContext = createContext<CheckInContextType | undefined>(undefined);

export const CheckInProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [checkIns, setCheckIns] = useState<CheckIn[]>(mockCheckIns);
  const [workReports, setWorkReports] = useState<WorkReport[]>(mockWorkReports);
  const { user } = useAuth();

  useEffect(() => {
    // In a real app, we would fetch this data from an API
    // For now, we're using the mock data
    setCheckIns(mockCheckIns);
    setWorkReports(mockWorkReports);
  }, []);

  const addCheckIn = (userId: string, userName: string, department: string, position: string) => {
    const newCheckIn: CheckIn = {
      id: Date.now().toString(),
      userId,
      timestamp: new Date(),
      userName,
      department: department as any,
      position: position as any,
      checkOutTime: null
    };

    setCheckIns(prev => [newCheckIn, ...prev]);
    toast.success('Check-in recorded successfully!');
  };

  const addCheckOut = (userId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    setCheckIns(prev => 
      prev.map(checkIn => {
        const checkInDate = new Date(checkIn.timestamp);
        checkInDate.setHours(0, 0, 0, 0);
        
        if (checkIn.userId === userId && checkInDate.getTime() === today.getTime() && !checkIn.checkOutTime) {
          return {
            ...checkIn,
            checkOutTime: new Date()
          };
        }
        return checkIn;
      })
    );
    
    toast.success('Check-out recorded successfully!');
  };

  const addWorkReport = (report: Omit<WorkReport, 'id'>) => {
    const newReport: WorkReport = {
      ...report,
      id: Date.now().toString(),
    };

    setWorkReports(prev => [newReport, ...prev]);
    toast.success('Work report submitted successfully!');
  };

  const getUserCheckIns = (userId: string): CheckIn[] => {
    return checkIns.filter(checkIn => checkIn.userId === userId);
  };

  const getUserWorkReports = (userId: string): WorkReport[] => {
    return workReports.filter(report => report.userId === userId);
  };

  const hasCheckedInToday = (userId: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return checkIns.some(checkIn => {
      const checkInDate = new Date(checkIn.timestamp);
      checkInDate.setHours(0, 0, 0, 0);
      
      return checkIn.userId === userId && checkInDate.getTime() === today.getTime();
    });
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
        hasSubmittedReportToday
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
