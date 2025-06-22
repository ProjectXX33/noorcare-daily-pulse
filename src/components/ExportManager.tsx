import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Download, FileText, File, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { CheckIn, WorkReport, User } from '@/types';
import { exportToCSVWithArabicSupport, exportToExcelWithArabicSupport, COMMON_HEADERS } from '@/lib/arabicExportUtils';

interface ExportManagerProps {
  data: {
    checkIns: CheckIn[];
    workReports: WorkReport[];
    users: User[];
    analytics: any;
  };
  dateRange: string;
  department: string;
}

const ExportManager: React.FC<ExportManagerProps> = ({ data, dateRange, department }) => {
  const [isExporting, setIsExporting] = useState(false);

  const generatePDFReport = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      
      // Header
      doc.setFontSize(20);
      doc.text('NoorCare Analytics Report', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Generated on: ${format(new Date(), 'PPP')}`, pageWidth / 2, 30, { align: 'center' });
      doc.text(`Date Range: ${dateRange.toUpperCase()}`, pageWidth / 2, 40, { align: 'center' });
      doc.text(`Department: ${department === 'all' ? 'All Departments' : department}`, pageWidth / 2, 50, { align: 'center' });
      
      let yPosition = 70;

      // Summary Statistics
      doc.setFontSize(16);
      doc.text('Summary Statistics', 20, yPosition);
      yPosition += 10;

      const summaryData = [
        ['Metric', 'Value'],
        ['Total Users', data.analytics.totalUsers?.toString() || '0'],
        ['Total Check-ins', data.analytics.totalCheckIns?.toString() || '0'],
        ['Total Reports', data.analytics.totalReports?.toString() || '0'],
        ['Avg Check-ins/Day', data.analytics.averageCheckInsPerDay?.toString() || '0'],
        ['Report Submission Rate', `${data.analytics.reportSubmissionRate || '0'}%`]
      ];

      autoTable(doc, {
        head: [summaryData[0]],
        body: summaryData.slice(1),
        startY: yPosition,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202] }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;

      // User List
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(16);
      doc.text('Employee Directory', 20, yPosition);
      yPosition += 10;

      const userData = [
        ['Name', 'Email', 'Department', 'Position', 'Role']
      ];

      data.users.forEach(user => {
        userData.push([
          user.name,
          user.email,
          user.department,
          user.position,
          user.role
        ]);
      });

      autoTable(doc, {
        head: [userData[0]],
        body: userData.slice(1),
        startY: yPosition,
        theme: 'striped',
        headStyles: { fillColor: [66, 139, 202] },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 50 },
          2: { cellWidth: 30 },
          3: { cellWidth: 35 },
          4: { cellWidth: 25 }
        }
      });

      // Recent Check-ins
      if (data.checkIns.length > 0) {
        doc.addPage();
        yPosition = 20;

        doc.setFontSize(16);
        doc.text('Recent Check-ins', 20, yPosition);
        yPosition += 10;

        const checkInData = [
          ['Date', 'Time', 'User', 'Check-out Time', 'Duration']
        ];

        data.checkIns.slice(0, 50).forEach(checkIn => {
          const user = data.users.find(u => u.id === checkIn.userId);
          const checkInTime = new Date(checkIn.timestamp);
          const checkOutTime = checkIn.checkOutTime ? new Date(checkIn.checkOutTime) : null;
          const duration = checkOutTime 
            ? `${Math.round((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60 * 100)) / 100}h`
            : 'Active';

          checkInData.push([
            format(checkInTime, 'MMM dd, yyyy'),
            format(checkInTime, 'HH:mm'),
            user?.name || 'Unknown',
            checkOutTime ? format(checkOutTime, 'HH:mm') : '-',
            duration
          ]);
        });

        autoTable(doc, {
          head: [checkInData[0]],
          body: checkInData.slice(1),
          startY: yPosition,
          theme: 'striped',
          headStyles: { fillColor: [66, 139, 202] },
          columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 25 },
            2: { cellWidth: 40 },
            3: { cellWidth: 25 },
            4: { cellWidth: 25 }
          }
        });
      }

      // Department Distribution
      if (data.analytics.departmentData?.length > 0) {
        doc.addPage();
        yPosition = 20;

        doc.setFontSize(16);
        doc.text('Department Distribution', 20, yPosition);
        yPosition += 10;

        const deptData = [
          ['Department', 'Employee Count', 'Percentage']
        ];

        data.analytics.departmentData.forEach((dept: any) => {
          deptData.push([
            dept.name,
            dept.value.toString(),
            `${dept.percentage}%`
          ]);
        });

        autoTable(doc, {
          head: [deptData[0]],
          body: deptData.slice(1),
          startY: yPosition,
          theme: 'grid',
          headStyles: { fillColor: [66, 139, 202] }
        });
      }

      // Save the PDF
      const fileName = `noorcare-analytics-${dateRange}-${department}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const generateExcelReport = async () => {
    setIsExporting(true);
    try {
      const workbook = XLSX.utils.book_new();

      // Summary Sheet
      const summaryData = [
        ['NoorCare Analytics Report'],
        [`Generated: ${format(new Date(), 'PPP')}`],
        [`Date Range: ${dateRange.toUpperCase()}`],
        [`Department: ${department === 'all' ? 'All Departments' : department}`],
        [''],
        ['Summary Statistics'],
        ['Metric', 'Value'],
        ['Total Users', data.analytics.totalUsers || 0],
        ['Total Check-ins', data.analytics.totalCheckIns || 0],
        ['Total Reports', data.analytics.totalReports || 0],
        ['Avg Check-ins/Day', data.analytics.averageCheckInsPerDay || 0],
        ['Report Submission Rate', `${data.analytics.reportSubmissionRate || 0}%`]
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Users Sheet
      const usersData = [
        ['Name', 'Email', 'Department', 'Position', 'Role', 'Created At']
      ];

      data.users.forEach(user => {
        usersData.push([
          user.name,
          user.email,
          user.department,
          user.position,
          user.role,
          '' // Users don't have created_at in the current type definition
        ]);
      });

      const usersSheet = XLSX.utils.aoa_to_sheet(usersData);
      XLSX.utils.book_append_sheet(workbook, usersSheet, 'Users');

      // Check-ins Sheet
      if (data.checkIns.length > 0) {
        const checkInsData = [
          ['Date', 'Check-in Time', 'Check-out Time', 'User Name', 'User Email', 'Duration (hours)']
        ];

        data.checkIns.forEach(checkIn => {
          const user = data.users.find(u => u.id === checkIn.userId);
          const checkInTime = new Date(checkIn.timestamp);
          const checkOutTime = checkIn.checkOutTime ? new Date(checkIn.checkOutTime) : null;
          const duration = checkOutTime 
            ? Math.round((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60) * 100) / 100
            : 0;

          checkInsData.push([
            format(checkInTime, 'yyyy-MM-dd'),
            format(checkInTime, 'HH:mm:ss'),
            checkOutTime ? format(checkOutTime, 'HH:mm:ss') : '',
            user?.name || 'Unknown',
            user?.email || '',
            duration.toString()
          ]);
        });

        const checkInsSheet = XLSX.utils.aoa_to_sheet(checkInsData);
        XLSX.utils.book_append_sheet(workbook, checkInsSheet, 'Check-ins');
      }

      // Work Reports Sheet
      if (data.workReports.length > 0) {
        const reportsData = [
          ['Date', 'User Name', 'User Email', 'Tasks Done', 'Issues Faced', 'Plans for Tomorrow']
        ];

        data.workReports.forEach(report => {
          const user = data.users.find(u => u.id === report.userId);
          reportsData.push([
            format(new Date(report.date), 'yyyy-MM-dd'),
            user?.name || 'Unknown',
            user?.email || '',
            report.tasksDone,
            report.issuesFaced || '',
            report.plansForTomorrow
          ]);
        });

        const reportsSheet = XLSX.utils.aoa_to_sheet(reportsData);
        XLSX.utils.book_append_sheet(workbook, reportsSheet, 'Work Reports');
      }

      // Department Distribution Sheet
      if (data.analytics.departmentData?.length > 0) {
        const deptData = [
          ['Department', 'Employee Count', 'Percentage']
        ];

        data.analytics.departmentData.forEach((dept: any) => {
          deptData.push([
            dept.name,
            dept.value,
            parseFloat(dept.percentage)
          ]);
        });

        const deptSheet = XLSX.utils.aoa_to_sheet(deptData);
        XLSX.utils.book_append_sheet(workbook, deptSheet, 'Department Distribution');
      }

      // Position Distribution Sheet
      if (data.analytics.positionData?.length > 0) {
        const posData = [
          ['Position', 'Employee Count']
        ];

        data.analytics.positionData.forEach((pos: any) => {
          posData.push([
            pos.name,
            pos.value
          ]);
        });

        const posSheet = XLSX.utils.aoa_to_sheet(posData);
        XLSX.utils.book_append_sheet(workbook, posSheet, 'Position Distribution');
      }

      // Work Hours Analysis
      if (data.analytics.workHoursData?.length > 0) {
        const hoursData = [
          ['Date', 'Regular Hours', 'Overtime Hours', 'Delay Time']
        ];

        data.analytics.workHoursData.forEach((hours: any) => {
          hoursData.push([
            hours.date,
            hours.regularHours,
            hours.overtimeHours,
            hours.delayTime || 0
          ]);
        });

        const hoursSheet = XLSX.utils.aoa_to_sheet(hoursData);
        XLSX.utils.book_append_sheet(workbook, hoursSheet, 'Work Hours');
      }

      // Save the Excel file
      const fileName = `noorcare-analytics-${dateRange}-${department}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const data_blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(data_blob, fileName);

    } catch (error) {
      console.error('Error generating Excel:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportCheckInsCSV = () => {
    const checkInsData = data.checkIns.map(checkIn => {
      const user = data.users.find(u => u.id === checkIn.userId);
      const checkInTime = new Date(checkIn.timestamp);
      const checkOutTime = checkIn.checkOutTime ? new Date(checkIn.checkOutTime) : null;
      const duration = checkOutTime 
        ? Math.round((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60) * 100) / 100
        : 0;

      return {
        date: format(checkInTime, 'yyyy-MM-dd'),
        checkInTime: format(checkInTime, 'HH:mm:ss'),
        checkOutTime: checkOutTime ? format(checkOutTime, 'HH:mm:ss') : '',
        userName: user?.name || 'Unknown',
        department: user?.department || '',
        duration: duration.toString()
      };
    });

    exportToCSVWithArabicSupport({
      filename: 'تسجيلات_الحضور_NoorCare_CheckIns',
      data: checkInsData,
      headers: COMMON_HEADERS.CHECKINS,
      includeEnglishHeaders: true,
      dateFormat: 'both',
      numberFormat: 'both'
    });
  };

  const exportUsersCSV = () => {
    const usersData = data.users.map(user => ({
      name: user.name,
      email: user.email,
      department: user.department,
      position: user.position,
      role: user.role,
      averageRating: user.averageRating || 'N/A',
      lastCheckin: user.lastCheckin || 'Never'
    }));

    exportToCSVWithArabicSupport({
      filename: 'موظفي_نور_كير_NoorCare_Employees',
      data: usersData,
      headers: COMMON_HEADERS.EMPLOYEES,
      includeEnglishHeaders: true,
      dateFormat: 'both',
      numberFormat: 'both'
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>تقارير شاملة / Complete Reports</DropdownMenuLabel>
        <DropdownMenuItem onClick={generatePDFReport} disabled={isExporting}>
          <FileText className="h-4 w-4 mr-2" />
          تصدير PDF / Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={generateExcelReport} disabled={isExporting}>
          <File className="h-4 w-4 mr-2" />
          تصدير Excel / Export as Excel
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>تصدير سريع (CSV) / Quick Exports (CSV)</DropdownMenuLabel>
        <DropdownMenuItem onClick={exportCheckInsCSV} disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          بيانات الحضور / Check-ins Data
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportUsersCSV} disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          بيانات الموظفين / Users Data
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportManager; 