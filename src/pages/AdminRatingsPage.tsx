import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { User, EmployeeRating } from '@/types';
import { fetchEmployees } from '@/lib/employeesApi';
import { 
  getEmployeeAverageRating, 
  getLatestEmployeeRating, 
  getEmployeeRatings,
  rateEmployee,
  updateEmployeeRating 
} from '@/lib/ratingsApi';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from '@/components/ui/table';
import { Star, Calendar, Filter, Users } from 'lucide-react';
import RateEmployeeModal from '@/components/RateEmployeeModal';
import StarRating from '@/components/StarRating';

const AdminRatingsPage = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRateEmployeeOpen, setIsRateEmployeeOpen] = useState(false);
  const [employeeToRate, setEmployeeToRate] = useState<User | null>(null);
  const [language, setLanguage] = useState('en');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterRating, setFilterRating] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Translation object for multilingual support
  const translations = {
    en: {
      employeeRatings: "Employee Ratings",
      dailyRatingManagement: "Daily Rating Management",
      rateAndManageEmployees: "Rate and manage employee performance daily",
      employee: "Employee",
      department: "Department", 
      position: "Position",
      currentRating: "Current Rating",
      lastRated: "Last Rated",
      actions: "Actions",
      rateEmployee: "Rate Employee",
      viewHistory: "View History",
      filterByDepartment: "Filter by Department",
      filterByRating: "Filter by Rating",
      searchEmployees: "Search employees...",
      allDepartments: "All Departments",
      allRatings: "All Ratings",
      excellent: "Excellent (4-5★)",
      good: "Good (3★)", 
      needsImprovement: "Needs Improvement (1-2★)",
      notRated: "Not Rated",
      averageRating: "Average Rating",
      totalEmployees: "Total Employees",
      ratedToday: "Rated Today",
      pendingRatings: "Pending Ratings",
      noRating: "No rating yet",
      never: "Never",
      today: "Today",
      loadingEmployees: "Loading employees...",
      ratingSubmittedSuccessfully: "Rating submitted successfully!"
    },
    ar: {
      employeeRatings: "تقييمات الموظفين",
      dailyRatingManagement: "إدارة التقييم اليومي",
      rateAndManageEmployees: "تقييم وإدارة أداء الموظفين يومياً",
      employee: "الموظف",
      department: "القسم",
      position: "المنصب", 
      currentRating: "التقييم الحالي",
      lastRated: "آخر تقييم",
      actions: "الإجراءات",
      rateEmployee: "تقييم الموظف",
      viewHistory: "عرض التاريخ",
      filterByDepartment: "تصفية حسب القسم",
      filterByRating: "تصفية حسب التقييم",
      searchEmployees: "البحث عن الموظفين...",
      allDepartments: "جميع الأقسام",
      allRatings: "جميع التقييمات",
      excellent: "ممتاز (4-5★)",
      good: "جيد (3★)",
      needsImprovement: "يحتاج تحسين (1-2★)",
      notRated: "غير مُقيم",
      averageRating: "متوسط التقييم",
      totalEmployees: "إجمالي الموظفين",
      ratedToday: "تم تقييمهم اليوم",
      pendingRatings: "التقييمات المعلقة",
      noRating: "لا يوجد تقييم بعد",
      never: "أبداً",
      today: "اليوم",
      loadingEmployees: "جاري تحميل الموظفين...",
      ratingSubmittedSuccessfully: "تم إرسال التقييم بنجاح!"
    }
  };

  useEffect(() => {
    const storedLang = localStorage.getItem('preferredLanguage');
    if (storedLang && (storedLang === 'en' || storedLang === 'ar')) {
      setLanguage(storedLang);
    }
  }, []);

  const t = translations[language as keyof typeof translations];

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const data = await fetchEmployees();
      const filteredEmployees = data.filter(u => u.id !== user?.id); // Exclude current user
      
      // Load rating data for each employee
      const employeesWithRatings = await Promise.all(
        filteredEmployees.map(async (employee) => {
          try {
            const [averageRating, latestRating] = await Promise.all([
              getEmployeeAverageRating(employee.id),
              getLatestEmployeeRating(employee.id)
            ]);
            
            return {
              ...employee,
              averageRating: averageRating > 0 ? averageRating : undefined,
              latestRating: latestRating || undefined
            };
          } catch (error) {
            console.error(`Error loading ratings for employee ${employee.id}:`, error);
            return employee;
          }
        })
      );
      
      setEmployees(employeesWithRatings);
    } catch (error) {
      console.error("Error loading employees:", error);
      toast.error("Failed to load employees");
    } finally {
      setIsLoading(false);
    }
  };

  const openRateEmployeeDialog = (employee: User) => {
    setEmployeeToRate(employee);
    setIsRateEmployeeOpen(true);
  };

  const handleRatingSubmitted = () => {
    loadEmployees(); // Refresh employee data to show updated ratings
    toast.success(t.ratingSubmittedSuccessfully);
  };

  // Filter employees based on search and filters
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = filterDepartment === 'all' || employee.department === filterDepartment;
    
    let matchesRating = true;
    if (filterRating !== 'all') {
      const rating = employee.averageRating || 0;
      switch (filterRating) {
        case 'excellent':
          matchesRating = rating >= 4;
          break;
        case 'good':
          matchesRating = rating >= 3 && rating < 4;
          break;
        case 'needs-improvement':
          matchesRating = rating > 0 && rating < 3;
          break;
        case 'not-rated':
          matchesRating = rating === 0;
          break;
      }
    }
    
    return matchesSearch && matchesDepartment && matchesRating;
  });

  // Calculate statistics
  const totalEmployees = employees.length;
  const ratedEmployees = employees.filter(e => e.averageRating && e.averageRating > 0).length;
  const todayRated = employees.filter(e => {
    if (!e.latestRating) return false;
    const ratingDate = new Date(e.latestRating.ratedAt);
    const today = new Date();
    return ratingDate.toDateString() === today.toDateString();
  }).length;
  const pendingRatings = totalEmployees - ratedEmployees;

  const isRatedToday = (employee: User) => {
    if (!employee.latestRating) return false;
    const ratingDate = new Date(employee.latestRating.ratedAt);
    const today = new Date();
    return ratingDate.toDateString() === today.toDateString();
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <>
      <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">{t.employeeRatings}</h1>
          <p className="text-muted-foreground">{t.rateAndManageEmployees}</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.totalEmployees}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEmployees}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.ratedToday}</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{todayRated}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.pendingRatings}</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{pendingRatings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.averageRating}</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {ratedEmployees > 0 
                  ? (employees.reduce((sum, e) => sum + (e.averageRating || 0), 0) / ratedEmployees).toFixed(1)
                  : '0.0'
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
              <div>
                <Input
                  placeholder={t.searchEmployees}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div>
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.filterByDepartment} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allDepartments}</SelectItem>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="IT">IT</SelectItem>
                    <SelectItem value="Doctor">Doctor</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select value={filterRating} onValueChange={setFilterRating}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.filterByRating} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allRatings}</SelectItem>
                    <SelectItem value="excellent">{t.excellent}</SelectItem>
                    <SelectItem value="good">{t.good}</SelectItem>
                    <SelectItem value="needs-improvement">{t.needsImprovement}</SelectItem>
                    <SelectItem value="not-rated">{t.notRated}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setFilterDepartment('all');
                    setFilterRating('all');
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Ratings Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t.dailyRatingManagement}</CardTitle>
            <CardDescription>
              Rate employee performance and track their progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.employee}</TableHead>
                    <TableHead className="hidden md:table-cell">{t.department}</TableHead>
                    <TableHead className="hidden md:table-cell">{t.position}</TableHead>
                    <TableHead>{t.currentRating}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t.lastRated}</TableHead>
                    <TableHead className="text-right">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                          <span className="ml-2">{t.loadingEmployees}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No employees found matching your criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map(employee => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-medium">{employee.name}</div>
                              <div className="text-sm text-gray-500">@{employee.username}</div>
                            </div>
                            {isRatedToday(employee) && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                {t.today}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {employee.department}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {employee.position}
                        </TableCell>
                        <TableCell>
                          {employee.averageRating && employee.averageRating > 0 ? (
                            <div className="flex items-center gap-2">
                              <StarRating rating={employee.averageRating} readonly size="sm" />
                              <span className="text-sm font-medium">
                                {employee.averageRating.toFixed(1)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">{t.noRating}</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {employee.latestRating ? (
                            <span className="text-sm text-gray-600">
                              {employee.latestRating.ratedAt.toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">{t.never}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => openRateEmployeeDialog(employee)}
                            className="bg-primary hover:bg-primary/90"
                          >
                            <Star className="mr-2 h-4 w-4" />
                            {t.rateEmployee}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rate Employee Modal */}
      <RateEmployeeModal
        isOpen={isRateEmployeeOpen}
        onClose={() => setIsRateEmployeeOpen(false)}
        employee={employeeToRate}
        onRatingSubmitted={handleRatingSubmitted}
      />
    </>
  );
};

export default AdminRatingsPage; 