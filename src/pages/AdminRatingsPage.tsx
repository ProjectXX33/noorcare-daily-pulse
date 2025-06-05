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
import { Star, Calendar, Filter, Users, Search, ChevronDown } from 'lucide-react';
import RateEmployeeModal from '@/components/RateEmployeeModal';
import StarRating from '@/components/StarRating';
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      ratingSubmittedSuccessfully: "Rating submitted successfully!",
      filters: "Filters & Search",
      clearFilters: "Clear Filters",
      rateEmployeeShort: "Rate",
      searchByName: "Search by name...",
      noEmployeesFound: "No employees found matching your criteria"
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
      ratingSubmittedSuccessfully: "تم إرسال التقييم بنجاح!",
      filters: "المرشحات والبحث",
      clearFilters: "مسح المرشحات",
      rateEmployeeShort: "تقييم",
      searchByName: "البحث بالاسم...",
      noEmployeesFound: "لا يوجد موظفون يطابقون معايير البحث"
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
      <div className="space-y-4 md:space-y-6 pb-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {/* Mobile-optimized sticky header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-2 pb-4 border-b shadow-sm">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">{t.employeeRatings}</h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground">{t.rateAndManageEmployees}</p>
          </div>
        </div>

        {/* Mobile-responsive statistics cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-center space-y-1">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 mx-auto" />
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t.totalEmployees}</p>
                <div className="text-lg sm:text-2xl font-bold">{totalEmployees}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-center space-y-1">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 mx-auto" />
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t.ratedToday}</p>
                <div className="text-lg sm:text-2xl font-bold text-green-600">{todayRated}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-center space-y-1">
                <Star className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500 mx-auto" />
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t.pendingRatings}</p>
                <div className="text-lg sm:text-2xl font-bold text-orange-600">{pendingRatings}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-center space-y-1">
                <Star className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 mx-auto" />
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t.averageRating}</p>
                <div className="text-lg sm:text-2xl font-bold">
                  {ratedEmployees > 0 
                    ? (employees.reduce((sum, e) => sum + (e.averageRating || 0), 0) / ratedEmployees).toFixed(1)
                    : '0.0'
                  }
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mobile filters sheet */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center sm:justify-between">
          <div className="block sm:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full min-h-[44px]">
                  <Filter className="h-4 w-4 mr-2" />
                  {t.filters}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[70vh]">
                <SheetHeader>
                  <SheetTitle>{t.filters}</SheetTitle>
                </SheetHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="mobile-search" className="text-sm font-medium">{t.searchEmployees}</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="mobile-search"
                        placeholder={t.searchByName}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-11 pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t.department}</Label>
                    <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={t.allDepartments} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.allDepartments}</SelectItem>
                        <SelectItem value="Engineering">Engineering</SelectItem>
                        <SelectItem value="Medical">Medical</SelectItem>
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="Management">Management</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t.filterByRating}</Label>
                    <Select value={filterRating} onValueChange={setFilterRating}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={t.allRatings} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.allRatings}</SelectItem>
                        <SelectItem value="excellent">Excellent (4+ stars)</SelectItem>
                        <SelectItem value="good">Good (3-4 stars)</SelectItem>
                        <SelectItem value="needs-improvement">Needs Improvement (&lt;3 stars)</SelectItem>
                        <SelectItem value="not-rated">{t.notRated}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setFilterDepartment('all');
                      setFilterRating('all');
                    }}
                    className="w-full h-11"
                  >
                    {t.clearFilters}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop filters */}
          <Card className="hidden sm:block">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="search" className="text-xs font-medium text-muted-foreground">{t.searchEmployees}</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-3 w-3 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder={t.searchByName}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-9 pl-9 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">{t.department}</Label>
                  <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t.allDepartments} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.allDepartments}</SelectItem>
                      <SelectItem value="Engineering">Engineering</SelectItem>
                      <SelectItem value="Medical">Medical</SelectItem>
                      <SelectItem value="General">General</SelectItem>
                      <SelectItem value="Management">Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">{t.filterByRating}</Label>
                  <Select value={filterRating} onValueChange={setFilterRating}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t.allRatings} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.allRatings}</SelectItem>
                      <SelectItem value="excellent">Excellent (4+ stars)</SelectItem>
                      <SelectItem value="good">Good (3-4 stars)</SelectItem>
                      <SelectItem value="needs-improvement">Needs Improvement (&lt;3 stars)</SelectItem>
                      <SelectItem value="not-rated">{t.notRated}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setFilterDepartment('all');
                      setFilterRating('all');
                    }}
                    className="w-full h-9 text-xs"
                  >
                    {t.clearFilters}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employee Ratings Table/Cards */}
        <Card className="flex-1">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">{t.dailyRatingManagement}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Rate employee performance and track their progress
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile cards view */}
            <div className="block lg:hidden">
              <ScrollArea className="h-[60vh]">
                <div className="space-y-3 p-4">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="flex items-center justify-center mb-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                      </div>
                      <span className="text-sm text-muted-foreground">{t.loadingEmployees}</span>
                    </div>
                  ) : filteredEmployees.length === 0 ? (
                    <div className="text-center py-8">
                      <span className="text-sm text-muted-foreground">{t.noEmployeesFound}</span>
                    </div>
                  ) : (
                    filteredEmployees.map(employee => (
                      <Card key={employee.id} className="border">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-sm">{employee.name}</h4>
                                {isRatedToday(employee) && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                    {t.today}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">@{employee.username}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {employee.department}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {employee.position}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => openRateEmployeeDialog(employee)}
                              className="h-8 px-3 text-xs min-h-[44px] sm:min-h-auto"
                            >
                              <Star className="mr-1 h-3 w-3" />
                              {t.rateEmployeeShort}
                            </Button>
                          </div>
                          
                          <div className="flex items-center justify-between pt-2 border-t">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">{t.currentRating}</p>
                              {employee.averageRating && employee.averageRating > 0 ? (
                                <div className="flex items-center gap-2">
                                  <StarRating rating={employee.averageRating} readonly size="sm" />
                                  <span className="text-xs font-medium">
                                    {employee.averageRating.toFixed(1)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">{t.noRating}</span>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground mb-1">{t.lastRated}</p>
                              <span className="text-xs">
                                {employee.latestRating ? 
                                  employee.latestRating.ratedAt.toLocaleDateString() : 
                                  t.never
                                }
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Desktop table view */}
            <div className="hidden lg:block p-4">
              <div className="mobile-table-scroll">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10 min-w-[140px]">{t.employee}</TableHead>
                      <TableHead className="min-w-[120px]">{t.department}</TableHead>
                      <TableHead className="min-w-[120px]">{t.position}</TableHead>
                      <TableHead className="min-w-[120px]">{t.currentRating}</TableHead>
                      <TableHead className="min-w-[100px]">{t.lastRated}</TableHead>
                      <TableHead className="text-right min-w-[100px]">{t.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                            <span className="ml-2 text-sm">{t.loadingEmployees}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <span className="text-sm">{t.noEmployeesFound}</span>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEmployees.map(employee => (
                        <TableRow key={employee.id}>
                          <TableCell className="sticky left-0 bg-background z-10">
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="font-medium text-sm">{employee.name}</div>
                                <div className="text-xs text-gray-500">@{employee.username}</div>
                              </div>
                              {isRatedToday(employee) && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                  {t.today}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {employee.department}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {employee.position}
                            </Badge>
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
                          <TableCell>
                            {employee.latestRating ? (
                              <span className="text-xs text-gray-600">
                                {employee.latestRating.ratedAt.toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500">{t.never}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => openRateEmployeeDialog(employee)}
                              className="h-8 px-3 text-xs"
                            >
                              <Star className="mr-1 h-3 w-3" />
                              {t.rateEmployee}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
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