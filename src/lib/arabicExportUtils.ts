import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { toast } from 'sonner';

export interface ArabicExportConfig {
  filename: string;
  sheetName: string;
  data: any[];
  headers: { [key: string]: string }; // English key -> Arabic label
  includeEnglishHeaders?: boolean;
  dateFormat?: 'arabic' | 'english' | 'both';
  numberFormat?: 'arabic' | 'english' | 'both';
}

export interface CSVExportConfig {
  filename: string;
  data: any[];
  headers: { [key: string]: string }; // English key -> Arabic label
  includeEnglishHeaders?: boolean;
  dateFormat?: 'arabic' | 'english' | 'both';
  numberFormat?: 'arabic' | 'english' | 'both';
}

// Arabic number conversion
export const convertToArabicNumbers = (text: string | number): string => {
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const englishNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  
  let result = text.toString();
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(englishNumbers[i], 'g'), arabicNumbers[i]);
  }
  return result;
};

// Format numbers for Arabic locale
export const formatArabicNumber = (number: number | string, format: 'arabic' | 'english' | 'both' = 'both'): string => {
  const num = typeof number === 'string' ? parseFloat(number) || 0 : number;
  
  switch (format) {
    case 'arabic':
      return convertToArabicNumbers(num.toLocaleString('ar-SA'));
    case 'english':
      return num.toLocaleString('en-US');
    case 'both':
      return `${convertToArabicNumbers(num.toLocaleString('ar-SA'))} / ${num.toLocaleString('en-US')}`;
    default:
      return num.toString();
  }
};

// Format dates for Arabic locale
export const formatArabicDate = (date: string | Date, formatType: 'arabic' | 'english' | 'both' = 'both'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'تاريخ غير صحيح / Invalid Date';
  }
  
  switch (formatType) {
    case 'arabic':
      return dateObj.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    case 'english':
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    case 'both':
      const arabicDate = dateObj.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const englishDate = dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      return `${arabicDate} / ${englishDate}`;
    default:
      return dateObj.toLocaleDateString();
  }
};

// Escape CSV special characters and handle Arabic text
export const escapeCSVField = (field: any): string => {
  if (field === null || field === undefined) {
    return '';
  }
  
  let value = field.toString();
  
  // Handle Arabic quotes and special characters
  value = value.replace(/"/g, '""'); // Escape double quotes
  value = value.replace(/\r?\n/g, ' '); // Replace line breaks with spaces
  value = value.replace(/\t/g, ' '); // Replace tabs with spaces
  
  // Wrap in quotes if contains special characters
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    value = `"${value}"`;
  }
  
  return value;
};

// Generate bilingual headers
export const generateBilingualHeaders = (headers: { [key: string]: string }, includeEnglish: boolean = true): string[] => {
  return Object.entries(headers).map(([englishKey, arabicLabel]) => {
    if (includeEnglish) {
      return `${arabicLabel} / ${englishKey}`;
    }
    return arabicLabel;
  });
};

// Transform data with Arabic formatting
export const transformDataForArabicExport = (
  data: any[], 
  headers: { [key: string]: string },
  config: {
    dateFormat?: 'arabic' | 'english' | 'both';
    numberFormat?: 'arabic' | 'english' | 'both';
  } = {}
): any[][] => {
  const { dateFormat = 'both', numberFormat = 'both' } = config;
  
  return data.map(row => {
    return Object.keys(headers).map(key => {
      const value = row[key];
      
      if (value === null || value === undefined) {
        return '';
      }
      
      // Handle dates
      if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
        return formatArabicDate(value, dateFormat);
      }
      
      // Handle numbers (revenue, sales, price, etc.)
      if (typeof value === 'number' || 
          (typeof value === 'string' && !isNaN(parseFloat(value)) && 
           (key.toLowerCase().includes('price') || 
            key.toLowerCase().includes('revenue') || 
            key.toLowerCase().includes('sales') || 
            key.toLowerCase().includes('total') ||
            key.toLowerCase().includes('count') ||
            key.toLowerCase().includes('amount')))) {
        return formatArabicNumber(value, numberFormat);
      }
      
      // Handle text
      return value.toString();
    });
  });
};

// Export to Excel with Arabic support
export const exportToExcelWithArabicSupport = async (config: ArabicExportConfig): Promise<void> => {
  try {
    const {
      filename,
      sheetName,
      data,
      headers,
      includeEnglishHeaders = true,
      dateFormat = 'both',
      numberFormat = 'both'
    } = config;

    if (data.length === 0) {
      toast.error('لا توجد بيانات للتصدير / No data to export');
      return;
    }

    // Generate headers
    const headerRow = generateBilingualHeaders(headers, includeEnglishHeaders);
    
    // Transform data
    const transformedData = transformDataForArabicExport(data, headers, { dateFormat, numberFormat });
    
    // Create worksheet data
    const worksheetData = [headerRow, ...transformedData];
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths for better Arabic text display
    const columnWidths = headerRow.map(() => ({ wch: 20 }));
    worksheet['!cols'] = columnWidths;
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Generate filename with Arabic support
    const timestamp = new Date().toISOString().split('T')[0];
    const finalFilename = `${filename}_${timestamp}.xlsx`;
    
    // Write file
    XLSX.writeFile(workbook, finalFilename);
    
    toast.success(`✅ تم تصدير ${data.length} عنصر بنجاح / Successfully exported ${data.length} items`, {
      description: `ملف: ${finalFilename} / File: ${finalFilename}`
    });
    
  } catch (error) {
    console.error('Arabic Excel export error:', error);
    toast.error('❌ فشل في تصدير البيانات / Failed to export data');
  }
};

// Export to CSV with Arabic support
export const exportToCSVWithArabicSupport = async (config: CSVExportConfig): Promise<void> => {
  try {
    const {
      filename,
      data,
      headers,
      includeEnglishHeaders = true,
      dateFormat = 'both',
      numberFormat = 'both'
    } = config;

    if (data.length === 0) {
      toast.error('لا توجد بيانات للتصدير / No data to export');
      return;
    }

    // Generate headers
    const headerRow = generateBilingualHeaders(headers, includeEnglishHeaders);
    
    // Transform data
    const transformedData = transformDataForArabicExport(data, headers, { dateFormat, numberFormat });
    
    // Create CSV content
    const csvRows = [
      headerRow.map(escapeCSVField).join(','),
      ...transformedData.map(row => row.map(escapeCSVField).join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    
    // Add BOM (Byte Order Mark) for proper UTF-8 encoding in Excel
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;
    
    // Create blob with proper UTF-8 encoding
    const blob = new Blob([csvWithBOM], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    // Generate filename with Arabic support
    const timestamp = new Date().toISOString().split('T')[0];
    const finalFilename = `${filename}_${timestamp}.csv`;
    
    // Download file
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', finalFilename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`✅ تم تصدير ${data.length} عنصر بنجاح / Successfully exported ${data.length} items`, {
      description: `ملف: ${finalFilename} / File: ${finalFilename}`
    });
    
  } catch (error) {
    console.error('Arabic CSV export error:', error);
    toast.error('❌ فشل في تصدير البيانات / Failed to export data');
  }
};

// Predefined header mappings for common entities
export const COMMON_HEADERS = {
  // Reports headers
  REPORTS: {
    'date': 'التاريخ / Date',
    'userName': 'اسم الموظف / Employee Name',
    'department': 'القسم / Department',
    'position': 'المنصب / Position',
    'tasksDone': 'المهام المنجزة / Tasks Done',
    'issuesFaced': 'المشاكل المواجهة / Issues Faced',
    'plansForTomorrow': 'خطط الغد / Plans for Tomorrow'
  },
  
  // Products headers
  PRODUCTS: {
    'rank': 'الترتيب / Rank',
    'name': 'اسم المنتج / Product Name',
    'category': 'الفئة / Category',
    'price': 'السعر (ريال) / Price (SAR)',
    'total_sales': 'المبيعات / Sales',
    'revenue': 'الإيرادات (ريال) / Revenue (SAR)',
    'rating': 'التقييم / Rating',
    'stock_status': 'حالة المخزون / Stock Status',
    'date_created': 'تاريخ الإنشاء / Date Created'
  },
  
  // Customers headers
  CUSTOMERS: {
    'rank': 'الترتيب / Rank',
    'name': 'اسم العميل / Customer Name',
    'email': 'البريد الإلكتروني / Email',
    'phone': 'الهاتف / Phone',
    'address': 'العنوان / Address',
    'total_spent': 'إجمالي الإنفاق (ريال) / Total Spent (SAR)',
    'orders_count': 'عدد الطلبات / Orders Count',
    'avg_order_value': 'متوسط قيمة الطلب (ريال) / Average Order Value (SAR)',
    'loyalty_tier': 'مستوى الولاء / Loyalty Tier',
    'first_order_date': 'تاريخ أول طلب / First Order Date',
    'last_order_date': 'تاريخ آخر طلب / Last Order Date',
    'id': 'معرف العميل / Customer ID'
  },
  
  // Employees headers
  EMPLOYEES: {
    'name': 'الاسم / Name',
    'email': 'البريد الإلكتروني / Email',
    'department': 'القسم / Department',
    'position': 'المنصب / Position',
    'role': 'الدور / Role',
    'averageRating': 'متوسط التقييم / Average Rating',
    'lastCheckin': 'آخر تسجيل دخول / Last Check-in'
  },
  
  // Check-ins headers
  CHECKINS: {
    'date': 'التاريخ / Date',
    'checkInTime': 'وقت الدخول / Check-in Time',
    'checkOutTime': 'وقت الخروج / Check-out Time',
    'userName': 'اسم الموظف / Employee Name',
    'department': 'القسم / Department',
    'duration': 'المدة (ساعات) / Duration (Hours)'
  }
}; 