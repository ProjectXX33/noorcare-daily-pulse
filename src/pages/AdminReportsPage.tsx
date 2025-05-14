
import React, { useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckIn } from '@/contexts/CheckInContext';

const AdminReportsPage = () => {
  const { user } = useAuth();
  const { workReports } = useCheckIn();
  const [filters, setFilters] = useState({
    employee: '',
    department: '',
    dateFrom: '',
    dateTo: '',
  });

  if (!user || user.role !== 'admin') {
    return null;
  }

  // Apply filters
  const filteredReports = workReports.filter(report => {
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
    setFilters(prev => ({ ...prev, department: value }));
  };

  const clearFilters = () => {
    setFilters({
      employee: '',
      department: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  return (
    <MainLayout>
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold mb-6">All Reports</h1>
        
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
                  value={filters.department}
                  onValueChange={handleDepartmentChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Departments</SelectItem>
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
              <Button className="bg-primary hover:bg-primary/90">
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
                      <div className="mt-2 sm:mt-0 text-sm text-gray-500">
                        {format(new Date(report.date), 'EEEE, MMMM d, yyyy')}
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
                              <div key={index} className="text-sm bg-gray-100 px-2 py-1 rounded">
                                {file}
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
      </div>
    </MainLayout>
  );
};

export default AdminReportsPage;
