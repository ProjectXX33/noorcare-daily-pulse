import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { WorkReport } from '@/contexts/CheckInContext';
import { format } from 'date-fns';
import { useCheckIn } from '@/contexts/CheckInContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ReportHistoryProps {
  reports: WorkReport[];
  title?: string;
}

const ReportHistory: React.FC<ReportHistoryProps> = ({ 
  reports,
  title = "Recent Reports" 
}) => {
  const { checkIns } = useCheckIn();
  
  // Sort reports by date (most recent first)
  const sortedReports = [...reports].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Function to find check-in/check-out times for a specific user and date
  const getCheckInOutTimes = (userId: string, date: Date) => {
    const reportDate = new Date(date);
    reportDate.setHours(0, 0, 0, 0);
    
    const checkInRecord = checkIns.find(checkIn => {
      const checkInDate = new Date(checkIn.timestamp);
      checkInDate.setHours(0, 0, 0, 0);
      return checkIn.userId === userId && checkInDate.getTime() === reportDate.getTime();
    });

    if (checkInRecord) {
      return {
        checkInTime: format(new Date(checkInRecord.timestamp), 'h:mm a'),
        checkOutTime: checkInRecord.checkoutTime 
          ? format(new Date(checkInRecord.checkoutTime), 'h:mm a') 
          : 'Not recorded',
        totalHours: checkInRecord.checkoutTime 
          ? ((new Date(checkInRecord.checkoutTime).getTime() - new Date(checkInRecord.timestamp).getTime()) / (1000 * 60 * 60)).toFixed(2) 
          : 'Not recorded'
      };
    }
    
    return {
      checkInTime: 'Not recorded',
      checkOutTime: 'Not recorded',
      totalHours: 'Not recorded'
    };
  };

  // Function to download file from Supabase storage
  const handleFileDownload = async (reportId: string, fileName: string) => {
    try {
      toast.loading('Preparing file for download...');
      
      // Get file path from database
      const { data: fileData, error: fileError } = await supabase
        .from('file_attachments')
        .select('file_path')
        .eq('work_report_id', reportId)
        .eq('file_name', fileName)
        .single();
        
      if (fileError || !fileData) {
        toast.dismiss();
        toast.error('File information not found');
        console.error('File info error:', fileError);
        return;
      }
      
      console.log('Found file path:', fileData.file_path);
      
      // Download file
      const { data, error } = await supabase.storage
        .from('attachments')
        .download(fileData.file_path);
        
      if (error) {
        toast.dismiss();
        toast.error(`Error downloading file: ${error.message}`);
        console.error('Download error:', error);
        return;
      }
      
      // Create and trigger download link
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.dismiss();
      toast.success('File downloaded successfully');
    } catch (error) {
      toast.dismiss();
      console.error('File download error:', error);
      toast.error('Failed to download file');
    }
  };

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Your submitted work reports</CardDescription>
      </CardHeader>
      <CardContent>
        {sortedReports.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No report history found.</p>
        ) : (
          <div className="space-y-8">
            {sortedReports.map((report) => {
              const { checkInTime, checkOutTime, totalHours } = getCheckInOutTimes(report.userId, report.date);
              
              return (
                <div key={report.id} className="border-b border-gray-200 dark:border-gray-700 pb-6">
                  <div className="flex justify-between mb-2">
                    <div>
                      <p className="font-medium text-foreground">{format(new Date(report.date), 'EEEE, MMMM d, yyyy')}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{report.userName} - {report.department}</p>
                    </div>
                    <div className="text-right">
                      <div className="bg-gray-100 dark:bg-gray-800 rounded px-3 py-1">
                        <p className="text-sm font-medium">Check-in: <span className="text-primary">{checkInTime}</span></p>
                        <p className="text-sm font-medium">Check-out: <span className="text-primary">{checkOutTime}</span></p>
                        <p className="text-sm font-medium">Hours: <span className="text-primary">{totalHours}</span></p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-primary">Tasks Completed</h4>
                      <p className="text-sm mt-1 text-foreground">{report.tasksDone}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-primary">Issues Faced</h4>
                      <p className="text-sm mt-1 text-foreground">{report.issuesFaced || 'None reported'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-primary">Plans for Tomorrow</h4>
                      <p className="text-sm mt-1 text-foreground">{report.plansForTomorrow}</p>
                    </div>
                    {report.fileAttachments && report.fileAttachments.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-primary">Attachments</h4>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {report.fileAttachments.map((file, index) => (
                            <div key={index} className="flex items-center text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              <span className="mr-2 text-foreground">{file}</span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="p-1 h-auto"
                                onClick={() => handleFileDownload(report.id, file)}
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReportHistory;
