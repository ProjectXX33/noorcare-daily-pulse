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
    // In a real app, this would generate a CSV or PDF with the filtered reports
    // For now, we'll create a simple CSV string
    let csvContent = "Date,Employee,Department,Position,Tasks Done,Issues Faced,Plans for Tomorrow\n";
    
    sortedReports.forEach(report => {
      csvContent += `${format(new Date(report.date), 'yyyy-MM-dd')},`;
      csvContent += `"${report.userName}",`;
      csvContent += `"${report.department}",`;
      csvContent += `"${report.position}",`;
      csvContent += `"${report.tasksDone.replace(/"/g, '""')}",`;
      csvContent += `"${report.issuesFaced ? report.issuesFaced.replace(/"/g, '""') : ''}",`;
      csvContent += `"${report.plansForTomorrow.replace(/"/g, '""')}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `reports_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <div className="space-y-6">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">All Reports</h1>
          <p className="text-muted-foreground">View and manage employee work reports</p>
        </div>
        
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Filter Reports</CardTitle>
            <CardDescription>Search and filter employee reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="employee">Employee Name</Label>
                <Input
                  id="employee"
                  name="employee"
                  placeholder="Search by name"
                  value={filters.employee}
                  onChange={handleFilterChange}
                />
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Select
                  value={filters.department || "all"}
                  onValueChange={handleDepartmentChange}
                >
                  <SelectTrigger>
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
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  name="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={handleFilterChange}
                />
              </div>
              <div>
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  id="dateTo"
                  name="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={handleFilterChange}
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="mr-2"
              >
                Clear Filters
              </Button>
              <Button 
                className="bg-primary hover:bg-primary/90"
                onClick={exportReports}
              >
                Export Reports
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Employee Reports</CardTitle>
            <CardDescription>
              Showing {sortedReports.length} {sortedReports.length === 1 ? 'report' : 'reports'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sortedReports.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No reports found matching your criteria.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {sortedReports.map((report) => (
                  <div key={report.id} className="border-b pb-6">
                    <div className="flex flex-col sm:flex-row justify-between mb-4">
                      <div>
                        <h3 className="font-medium">{report.userName}</h3>
                        <p className="text-sm text-gray-500">
                          {report.department} - {report.position}
                        </p>
                      </div>
                      <div className="mt-2 sm:mt-0 flex items-center gap-4">
                        <div className="text-sm text-gray-500">
                          {format(new Date(report.date), 'EEEE, MMMM d, yyyy')}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteReport(report.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium text-primary">Tasks Completed</h4>
                        <p className="text-sm mt-1">{report.tasksDone}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-primary">Issues Faced</h4>
                        <p className="text-sm mt-1">{report.issuesFaced || 'None reported'}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-primary">Plans for Next Day</h4>
                        <p className="text-sm mt-1">{report.plansForTomorrow}</p>
                      </div>
                      {report.fileAttachments && report.fileAttachments.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-primary">Attachments</h4>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {report.fileAttachments.map((file, index) => (
                              <div key={index} className="flex items-center text-sm bg-gray-100 px-2 py-1 rounded">
                                <span className="mr-2">{file}</span>
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={!!reportToDelete} onOpenChange={() => setReportToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this report?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the report
                and any associated file attachments.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-500 hover:bg-red-600"
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
