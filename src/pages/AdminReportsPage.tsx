import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckIn } from '@/contexts/CheckInContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { exportToCSVWithArabicSupport, exportToExcelWithArabicSupport, COMMON_HEADERS } from '@/lib/arabicExportUtils';

const AdminReportsPage = () => {
  const { user } = useAuth();
  const { workReports, deleteWorkReport } = useCheckIn();
  const [reports, setReports] = useState(workReports);
  const [filters, setFilters] = useState({
    employee: '',
    department: '',
    dateFrom: '',
    dateTo: '',
  });
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  useEffect(() => {
    setReports(workReports);
  }, [workReports]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  // Apply filters
  const filteredReports = reports.filter(report => {
    if (filters.employee && !report.userName.toLowerCase().includes(filters.employee.toLowerCase())) {
      return false;
    }
    if (filters.department && report.department !== filters.department) {
      return false;
    }
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      const reportDate = new Date(report.date);
      if (reportDate < fromDate) {
        return false;
      }
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      const reportDate = new Date(report.date);
      if (reportDate > toDate) {
        return false;
      }
    }
    return true;
  });

  // Sort by date (newest first)
  const sortedReports = [...filteredReports].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleDepartmentChange = (value: string) => {
    setFilters(prev => ({ ...prev, department: value === "all" ? "" : value }));
  };

  const clearFilters = () => {
    setFilters({
      employee: '',
      department: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  // Function to handle file download
  const handleFileDownload = async (reportId: string, fileName: string) => {
    try {
      toast.loading('Preparing file for download...');
      
      // Get file path from database
      const { data: fileData, error: fileError } = await supabase
        .from('file_attachments')
        .select('file_path, file_type')
        .eq('work_report_id', reportId)
        .eq('file_name', fileName)
        .single();
        
      if (fileError) {
        toast.dismiss();
        toast.error(`Error finding file: ${fileError.message}`);
        console.error('File info error:', fileError);
        return;
      }

      if (!fileData) {
        toast.dismiss();
        toast.error('File not found in database');
        return;
      }
      
      console.log('Found file data:', fileData);
      
      // Create a signed URL for the file
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('attachments')
        .createSignedUrl(fileData.file_path, 60); // URL valid for 60 seconds
        
      if (signedUrlError) {
        toast.dismiss();
        toast.error(`Error creating download URL: ${signedUrlError.message}`);
        console.error('Signed URL error:', signedUrlError);
        return;
      }

      if (!signedUrlData?.signedUrl) {
        toast.dismiss();
        toast.error('Failed to generate download URL');
        return;
      }

      // Create and trigger download link
      const a = document.createElement("a");
      a.href = signedUrlData.signedUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast.dismiss();
      toast.success('File downloaded successfully');
    } catch (error) {
      toast.dismiss();
      console.error('File download error:', error);
      toast.error('Failed to download file');
    }
  };

  const exportReports = () => {
    exportToCSVWithArabicSupport({
      filename: 'تقارير_العمل_Work_Reports',
      data: sortedReports,
      headers: COMMON_HEADERS.REPORTS,
      includeEnglishHeaders: true,
      dateFormat: 'both',
      numberFormat: 'both'
    });
  };

  const exportReportsExcel = () => {
    exportToExcelWithArabicSupport({
      filename: 'تقارير_العمل_Work_Reports',
      sheetName: 'Work Reports / تقارير العمل',
      data: sortedReports,
      headers: COMMON_HEADERS.REPORTS,
      includeEnglishHeaders: true,
      dateFormat: 'both',
      numberFormat: 'both'
    });
  };

  const handleDeleteReport = async (reportId: string) => {
    setReportToDelete(reportId);
  };

  const confirmDelete = async () => {
    if (reportToDelete) {
      await deleteWorkReport(reportToDelete);
      setReportToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 w-full max-w-full overflow-x-hidden">
      {/* Enhanced mobile-optimized header - Non-sticky, responsive layout */}
      <div className="border-b border-border/50 bg-background/98 w-full">
        <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6 w-full max-w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
            <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">All Reports</h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">View and manage employee work reports</p>
            </div>
          </div>
        </div>
      </div>

      <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 space-y-6 sm:space-y-8 md:space-y-10 w-full max-w-full overflow-x-hidden">
        {/* Mobile-optimized filters */}
        <Card className="mb-4 md:mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Filter Reports</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Search and filter employee reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div>
                <Label htmlFor="employee" className="text-xs sm:text-sm">Employee Name</Label>
                <Input
                  id="employee"
                  name="employee"
                  placeholder="Search by name"
                  value={filters.employee}
                  onChange={handleFilterChange}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="department" className="text-xs sm:text-sm">Department</Label>
                <Select
                  value={filters.department || "all"}
                  onValueChange={handleDepartmentChange}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="IT">IT</SelectItem>
                    <SelectItem value="Doctor">Doctor</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dateFrom" className="text-xs sm:text-sm">From Date</Label>
                <Input
                  id="dateFrom"
                  name="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={handleFilterChange}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="dateTo" className="text-xs sm:text-sm">To Date</Label>
                <Input
                  id="dateTo"
                  name="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={handleFilterChange}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="h-9 min-h-[44px] text-xs sm:text-sm"
              >
                مسح المرشحات / Clear Filters
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  className="bg-green-600 hover:bg-green-700 text-white h-9 min-h-[44px] text-xs sm:text-sm"
                  onClick={exportReportsExcel}
                >
                  <Download className="h-4 w-4 mr-2" />
                  تصدير Excel / Export Excel
              </Button>
              <Button 
                className="bg-primary hover:bg-primary/90 h-9 min-h-[44px] text-xs sm:text-sm"
                onClick={exportReports}
              >
                  <Download className="h-4 w-4 mr-2" />
                  تصدير CSV / Export CSV
              </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Mobile-optimized reports display */}
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Employee Reports</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Showing {sortedReports.length} {sortedReports.length === 1 ? 'report' : 'reports'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sortedReports.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm sm:text-base text-gray-500">No reports found matching your criteria.</p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6 md:space-y-8">
                {sortedReports.map((report) => (
                  <div key={report.id} className="border-b pb-4 sm:pb-6 last:border-b-0">
                    {/* Mobile-responsive report header */}
                    <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm sm:text-base">{report.userName}</h3>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {report.department} - {report.position}
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                        <div className="text-xs sm:text-sm text-gray-500">
                          {format(new Date(report.date), 'EEEE, MMMM d, yyyy')}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0 sm:h-auto sm:w-auto sm:p-2"
                          onClick={() => handleDeleteReport(report.id)}
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Mobile-responsive report content */}
                    <div className="space-y-2 sm:space-y-3">
                      <div>
                        <h4 className="text-xs sm:text-sm font-medium text-primary mb-1">Tasks Completed</h4>
                        <p className="text-xs sm:text-sm break-words">{report.tasksDone}</p>
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-medium text-primary mb-1">Issues Faced</h4>
                        <p className="text-xs sm:text-sm break-words">{report.issuesFaced || 'None reported'}</p>
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-medium text-primary mb-1">Plans for Next Day</h4>
                        <p className="text-xs sm:text-sm break-words">{report.plansForTomorrow}</p>
                      </div>
                      {report.fileAttachments && report.fileAttachments.length > 0 && (
                        <div>
                          <h4 className="text-xs sm:text-sm font-medium text-primary mb-1">Attachments</h4>
                          <div className="flex flex-wrap gap-2">
                            {report.fileAttachments.map((file, index) => (
                              <div key={index} className="flex items-center text-xs bg-gray-100 px-2 py-1 rounded max-w-full">
                                <span className="mr-2 truncate flex-1">{file}</span>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="p-1 h-auto min-h-[32px] flex-shrink-0"
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mobile-optimized delete confirmation dialog */}
        <AlertDialog open={!!reportToDelete} onOpenChange={() => setReportToDelete(null)}>
          <AlertDialogContent className="w-[95vw] max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base sm:text-lg">Are you sure you want to delete this report?</AlertDialogTitle>
              <AlertDialogDescription className="text-xs sm:text-sm">
                This action cannot be undone. This will permanently delete the report
                and any associated file attachments.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="w-full sm:w-auto min-h-[44px]">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-500 hover:bg-red-600 w-full sm:w-auto min-h-[44px]"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default AdminReportsPage;
