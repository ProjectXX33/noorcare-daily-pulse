import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { User, Department, Position, Team, ManagerRole } from '@/types';
import { getTeamBadgeColor } from '@/lib/teamsApi';
import { fetchEmployees, createEmployee, updateEmployee, resetEmployeePassword, assignDiamondRank, removeDiamondRank, deleteEmployee } from '@/lib/employeesApi';
import { getEmployeeAverageRating, getLatestEmployeeRating } from '@/lib/ratingsApi';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { UserPlus, Star, Plus, Circle, CheckCircle, Crown, Trash2 } from 'lucide-react';
import RateEmployeeModal from '@/components/RateEmployeeModal';
import StarRating from '@/components/StarRating';
import { Badge } from "@/components/ui/badge";
import UserActivityTracker from '@/utils/userActivityTracker';

const AdminEmployeesPage = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [userActivity, setUserActivity] = useState<Map<string, { lastSeen: Date, activeToday: boolean }>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [isEditEmployeeOpen, setIsEditEmployeeOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isRateEmployeeOpen, setIsRateEmployeeOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [employeeToRate, setEmployeeToRate] = useState<User | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<User | null>(null);
  const [language, setLanguage] = useState('en');
  const [newEmployee, setNewEmployee] = useState({
    username: '',
    name: '',
    email: '',
    position: 'Designer' as Position,
    team: undefined as Team | undefined,
    password: '',
    role: 'employee' as 'admin' | 'employee' | 'warehouse' | 'content_creative_manager' | 'customer_retention_manager' | 'digital_solution_manager'
  });
  const [newPassword, setNewPassword] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Translation object for multilingual support
  const translations = {
    en: {
      employees: "Employees",
      addEmployee: "Add Employee",
      employeeDirectory: "Employee Directory",
      manageEmployeeAccounts: "Manage employee accounts and access",
      name: "Name",
      username: "Username",
      department: "Department",
      position: "Position",
      team: "Team",
      lastCheckIn: "Last Check-in",
      rating: "Rating",
      actions: "Actions",
      edit: "Edit",
      resetPassword: "Reset Password",
      rateEmployee: "Rate Employee",
      never: "Never checked in",
      addNewEmployee: "Add New Employee",
      createAccount: "Create a new employee account",
      editEmployee: "Edit Employee",
      updateInfo: "Update employee information",
      password: "Password",
      cancel: "Cancel",
      save: "Save Changes",
      setNewPassword: "Set New Password",
      employeeAdded: "Employee added successfully!",
      employeeUpdated: "Employee updated successfully!",
      passwordReset: "Password has been reset",
      fillAllFields: "Please fill all required fields",
      email: "Email",
      role: "Role",
      admin: "Executive Director",
      employee: "Employee",
      warehouse: "Warehouse",
      contentCreativeManager: "Content & Creative Manager",
      customerRetentionManager: "Customer Retention Manager",
      digitalSolutionManager: "Digital Solution Manager",
      noRating: "No rating",
      employeeManagement: "Employee Management",
      manageAllEmployees: "Manage all employees and their access",
      assignDiamondRank: "💎 Assign Diamond Rank",
      removeDiamondRank: "Remove Diamond Rank",
      diamondRank: "Diamond",
      diamondRankAssigned: "Diamond rank assigned successfully!",
      diamondRankRemoved: "Diamond rank removed successfully!",
      deleteEmployee: "Remove Employee",
      confirmDelete: "Confirm Employee Removal",
      deleteConfirmMessage: "Are you sure you want to remove this employee? They will lose access to the system.",
      deleteEmployeeWarning: "This will deactivate the employee while preserving all historical data.",
      employeeDeleted: "Employee removed successfully!",
      deleteEmployeeError: "Failed to remove employee"
    },
    ar: {
      employees: "الموظفين",
      addEmployee: "إضافة موظف",
      employeeDirectory: "دليل الموظفين",
      manageEmployeeAccounts: "إدارة حسابات الموظفين والوصول",
      name: "الاسم",
      username: "اسم المستخدم",
      department: "القسم",
      position: "المنصب",
      team: "الفريق",
      lastCheckIn: "آخر تسجيل دخول",
      rating: "التقييم",
      actions: "الإجراءات",
      edit: "تعديل",
      resetPassword: "إعادة تعيين كلمة المرور",
      rateEmployee: "تقييم الموظف",
      never: "لم يسجل الدخول أبداً",
      addNewEmployee: "إضافة موظف جديد",
      createAccount: "إنشاء حساب موظف جديد",
      editEmployee: "تعديل الموظف",
      updateInfo: "تحديث معلومات الموظف",
      password: "كلمة المرور",
      cancel: "إلغاء",
      save: "حفظ التغييرات",
      setNewPassword: "تعيين كلمة مرور جديدة",
      employeeAdded: "تمت إضافة الموظف بنجاح!",
      employeeUpdated: "تم تحديث الموظف بنجاح!",
      passwordReset: "تم إعادة تعيين كلمة المرور",
      fillAllFields: "يرجى ملء جميع الحقول المطلوبة",
      email: "البريد الإلكتروني",
      role: "الدور",
      admin: "المدير التنفيذي",
      employee: "موظف",
      warehouse: "مستودع",
      contentCreativeManager: "مدير المحتوى والإبداع",
      customerRetentionManager: "مدير الاحتفاظ بالعملاء",
      digitalSolutionManager: "مدير الحلول الرقمية",
      noRating: "لا يوجد تقييم",
      employeeManagement: "إدارة الموظفين",
      manageAllEmployees: "إدارة جميع الموظفين وتوفير الوصول",
      assignDiamondRank: "💎 تعيين رتبة الماس",
      removeDiamondRank: "إزالة رتبة الماس",
      diamondRank: "الماس",
      diamondRankAssigned: "تم تعيين رتبة الماس بنجاح!",
      diamondRankRemoved: "تم إزالة رتبة الماس بنجاح!",
      deleteEmployee: "إزالة الموظف",
      confirmDelete: "تأكيد إزالة الموظف",
      deleteConfirmMessage: "هل أنت متأكد من أنك تريد إزالة هذا الموظف؟ سيفقد الوصول إلى النظام.",
      deleteEmployeeWarning: "سيؤدي هذا إلى إلغاء تفعيل الموظف مع الحفاظ على جميع البيانات التاريخية.",
      employeeDeleted: "تم إزالة الموظف بنجاح!",
      deleteEmployeeError: "فشل في إزالة الموظف"
    }
  };

  useEffect(() => {
    const storedLang = localStorage.getItem('preferredLanguage');
    if (storedLang && (storedLang === 'en' || storedLang === 'ar')) {
      setLanguage(storedLang);
    }
    
    // Set up employee subscription
    const unsubscribe = subscribeToEmployeeChanges();
    return () => unsubscribe();
  }, []);
  
  const subscribeToEmployeeChanges = () => {
    loadEmployees();
    return () => {};
  };

  const t = translations[language as keyof typeof translations];

  // Helper function to determine department from team
  const getDepartmentFromTeam = (team?: Team): Department => {
    switch (team) {
      case 'Content & Creative Department':
        return 'Creative';
      case 'Customer Retention Department':
        return 'Customer Service';
      case 'IT Department':
        return 'IT & Development';
      default:
        return 'General';
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadUserActivity = async () => {
    try {
      const activity = await UserActivityTracker.getUsersActivity();
      const activityMap = new Map();
      
      activity.forEach(userAct => {
        activityMap.set(userAct.userId, {
          lastSeen: userAct.lastSeen,
          activeToday: userAct.lastSeenToday
        });
      });
      
      setUserActivity(activityMap);
    } catch (error) {
      console.error("Error loading user activity:", error);
    }
  };

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const data = await fetchEmployees();
      const filteredEmployees = data.filter(u => u.id !== user?.id); // Exclude current user
      
      // Load rating data and activity for each employee
      const [employeesWithRatings] = await Promise.all([
        Promise.all(
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
        ),
        loadUserActivity()
      ]);
      
      setEmployees(employeesWithRatings);
    } catch (error) {
      console.error("Error loading employees:", error);
      toast.error("Failed to load employees");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  const handleAddEmployee = async () => {
    if (!newEmployee.username || !newEmployee.name || !newEmployee.email || !newEmployee.password) {
      toast.error(t.fillAllFields);
      return;
    }

    setIsLoading(true);
    try {
      console.log("Adding employee with data:", {
        ...newEmployee,
        password: "***" // Don't log actual password
      });
      
      await createEmployee({
        username: newEmployee.username,
        name: newEmployee.name,
        email: newEmployee.email,
        password: newEmployee.password,
        department: getDepartmentFromTeam(newEmployee.team),
        position: newEmployee.position,
        team: newEmployee.team,
        role: newEmployee.role
      });
      
      // Refresh employee list
      await loadEmployees();
      
      setIsAddingEmployee(false);
      toast.success(t.employeeAdded);
      
      // Reset form
      setNewEmployee({
        username: '',
        name: '',
        email: '',
        position: 'Designer',
        team: undefined,
        password: '',
        role: 'employee'
      });
    } catch (error: any) {
      console.error("Error creating employee:", error);
      toast.error(`Failed to create employee: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditEmployee = async () => {
    if (!selectedEmployee || !selectedEmployee.name || !selectedEmployee.email) {
      toast.error(t.fillAllFields);
      return;
    }

    setIsLoading(true);
    try {
      // Update department based on team
      const updatedEmployee = {
        ...selectedEmployee,
        department: getDepartmentFromTeam(selectedEmployee.team),
        // Ensure team is explicitly set to null when undefined
        team: selectedEmployee.team === undefined ? null : selectedEmployee.team
      };
      await updateEmployee(selectedEmployee.id, updatedEmployee);
      
      if (showEditPassword && editPassword) {
        await resetEmployeePassword(selectedEmployee.email, editPassword);
        toast.success(`${t.passwordReset}: ${selectedEmployee.name}`);
      }
      
      await loadEmployees();
      
      setIsEditEmployeeOpen(false);
      setShowEditPassword(false);
      setEditPassword('');
      toast.success(t.employeeUpdated);
    } catch (error) {
      console.error("Error updating employee:", error);
      toast.error("Failed to update employee");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedEmployee || !newPassword) {
      toast.error(t.fillAllFields);
      return;
    }

    setIsLoading(true);
    try {
      await resetEmployeePassword(selectedEmployee.email, newPassword);
      setIsResetPasswordOpen(false);
      toast.success(`${t.passwordReset}: ${selectedEmployee.name}`);
      setNewPassword('');
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (employee: User) => {
    setSelectedEmployee({...employee});
    setShowEditPassword(false);
    setEditPassword('');
    setIsEditEmployeeOpen(true);
  };

  const openResetPasswordDialog = (employee: User) => {
    setSelectedEmployee(employee);
    setIsResetPasswordOpen(true);
  };

  const openRateEmployeeDialog = (employee: User) => {
    setEmployeeToRate(employee);
    setIsRateEmployeeOpen(true);
  };

  const handleRatingSubmitted = () => {
    loadEmployees(); // Refresh employee data to show updated ratings
  };

  const handleAssignDiamondRank = async (employee: User) => {
    if (!user?.id) return;
    
    try {
      await assignDiamondRank(employee.id, user.id);
      await loadEmployees(); // Refresh employee list
      toast.success(`💎 ${t.diamondRankAssigned} (${employee.name})`);
    } catch (error: any) {
      console.error('Error assigning Diamond rank:', error);
      toast.error(`Failed to assign Diamond rank: ${error.message || 'Unknown error'}`);
    }
  };

  const handleRemoveDiamondRank = async (employee: User) => {
    if (!user?.id) return;
    
    try {
      await removeDiamondRank(employee.id, user.id);
      await loadEmployees(); // Refresh employee list
      toast.success(`${t.diamondRankRemoved} (${employee.name})`);
    } catch (error: any) {
      console.error('Error removing Diamond rank:', error);
      toast.error(`Failed to remove Diamond rank: ${error.message || 'Unknown error'}`);
    }
  };

  const openDeleteConfirmDialog = (employee: User) => {
    setEmployeeToDelete(employee);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    setIsLoading(true);
    try {
      await deleteEmployee(employeeToDelete.id);
      await loadEmployees(); // Refresh employee list
      setIsDeleteConfirmOpen(false);
      setEmployeeToDelete(null);
      toast.success(`${t.employeeDeleted} (${employeeToDelete.name})`);
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      toast.error(`${t.deleteEmployeeError}: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmployeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSelectedEmployee(prev => prev ? {...prev, [name]: value} : null);
  };

  const handleNewEmployeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewEmployee(prev => ({...prev, [name]: value}));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 w-full max-w-full overflow-x-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Enhanced mobile-optimized header - Non-sticky, responsive layout */}
      <div className="border-b border-border/50 bg-background/98 w-full">
        <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6 w-full max-w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
            <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">{t.employeeManagement}</h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">{t.manageAllEmployees}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => setIsAddingEmployee(true)}
                className="min-h-[44px] text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t.addEmployee}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 space-y-6 sm:space-y-8 md:space-y-10 w-full max-w-full overflow-x-hidden">
        <Card className="flex-1 min-h-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{t.employeeDirectory}</CardTitle>
            <CardDescription className="text-sm">{t.manageEmployeeAccounts}</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px] sm:w-auto min-w-[120px]">{t.name}</TableHead>
                      <TableHead className="hidden md:table-cell min-w-[120px]">{t.position}</TableHead>
                      <TableHead className="hidden lg:table-cell min-w-[150px]">{t.team}</TableHead>
                      <TableHead className="hidden lg:table-cell min-w-[100px]">Active Today</TableHead>
                      <TableHead className="hidden lg:table-cell min-w-[140px]">Last Seen</TableHead>
                      <TableHead className="hidden xl:table-cell min-w-[140px]">{t.rating}</TableHead>
                      <TableHead className="hidden sm:table-cell min-w-[140px]">{t.lastCheckIn}</TableHead>
                      <TableHead className="text-right min-w-[80px]">{t.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : employees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">No employees found</TableCell>
                      </TableRow>
                    ) : (
                      employees.map(employee => (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span className="font-medium truncate">{employee.name}</span>
                              <span className="text-xs text-muted-foreground md:hidden truncate">@{employee.username}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                              {employee.position}
                            </span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {employee.team ? (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getTeamBadgeColor(employee.team)}`}>
                                {employee.team}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">No team assigned</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {(() => {
                              const activity = userActivity.get(employee.id);
                              const activeToday = activity?.activeToday || false;
                              return (
                                <div className="flex items-center gap-2">
                                  {activeToday ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-gray-400" />
                                  )}
                                  <Badge variant={activeToday ? "default" : "secondary"} className="text-xs">
                                    {activeToday ? "Yes" : "No"}
                                  </Badge>
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {(() => {
                              const activity = userActivity.get(employee.id);
                              const lastSeen = activity?.lastSeen;
                              if (!lastSeen || lastSeen.getTime() === 0) {
                                return <span className="text-xs text-muted-foreground">Never</span>;
                              }
                              return (
                                <span className="text-xs text-muted-foreground">
                                  {UserActivityTracker.formatLastSeen(lastSeen)}
                                </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            {employee.averageRating && employee.averageRating > 0 ? (
                              <div className="flex items-center gap-2">
                                <StarRating 
                                  rating={employee.averageRating} 
                                  readonly 
                                  size="sm" 
                                  spacing="tight"
                                />
                                <span className="text-xs text-muted-foreground">
                                  ({employee.averageRating.toFixed(1)})
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">{t.noRating}</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <span className="text-xs">
                              {employee.lastCheckin 
                                ? new Date(employee.lastCheckin).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
                                    dateStyle: 'short',
                                    timeStyle: 'short'
                                  })
                                : t.never}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              {/* Diamond Rank Indicator */}
                              {employee.diamondRank && (
                                <Badge variant="outline" className="bg-gradient-to-r from-cyan-100 to-purple-100 border-cyan-300 text-cyan-800 text-xs font-bold">
                                  💎 Diamond
                                </Badge>
                              )}
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                                    {t.actions}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditDialog(employee)}>
                                    {t.edit}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openResetPasswordDialog(employee)}>
                                    {t.resetPassword}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openRateEmployeeDialog(employee)}>
                                    <Star className="mr-2 h-4 w-4" />
                                    {t.rateEmployee}
                                  </DropdownMenuItem>
                                  
                                  {/* Diamond Rank Actions */}
                                  {employee.diamondRank ? (
                                    <DropdownMenuItem 
                                      onClick={() => handleRemoveDiamondRank(employee)}
                                      className="text-orange-600 hover:text-orange-700"
                                    >
                                      <Crown className="mr-2 h-4 w-4" />
                                      {t.removeDiamondRank}
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem 
                                      onClick={() => handleAssignDiamondRank(employee)}
                                      className="text-cyan-600 hover:text-cyan-700 font-semibold"
                                    >
                                      <Crown className="mr-2 h-4 w-4" />
                                      {t.assignDiamondRank}
                                    </DropdownMenuItem>
                                  )}
                                  
                                                    {/* Remove Employee Action */}
                  <DropdownMenuItem 
                    onClick={() => openDeleteConfirmDialog(employee)}
                    className="text-red-600 hover:text-red-700 font-medium"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t.deleteEmployee}
                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
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

      {/* Add Employee Dialog */}
      <Dialog open={isAddingEmployee} onOpenChange={setIsAddingEmployee}>
        <DialogContent className="sm:max-w-[425px] max-w-[95vw] max-h-[90vh] overflow-y-auto" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t.addNewEmployee}</DialogTitle>
            <DialogDescription>
              {t.createAccount}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                {t.name}
              </Label>
              <Input
                id="name"
                name="name"
                value={newEmployee.name}
                onChange={handleNewEmployeeChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                {t.username}
              </Label>
              <Input
                id="username"
                name="username"
                value={newEmployee.username}
                onChange={handleNewEmployeeChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                {t.email}
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={newEmployee.email}
                onChange={handleNewEmployeeChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                {t.password}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={newEmployee.password}
                onChange={handleNewEmployeeChange}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="position" className="text-right">
                {t.position}
              </Label>
              <Select
                value={newEmployee.position}
                onValueChange={(value) => setNewEmployee(prev => ({...prev, position: value as Position}))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t.position} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Executive Director">Executive Director</SelectItem>
                  <SelectItem value="Content & Creative Manager">Content & Creative Manager</SelectItem>
                  <SelectItem value="Customer Retention Manager">Customer Retention Manager</SelectItem>
                  <SelectItem value="IT Manager">IT Manager</SelectItem>
                  <SelectItem value="Customer Service">Customer Service</SelectItem>
                  <SelectItem value="Designer">Designer</SelectItem>
                  <SelectItem value="Media Buyer">Media Buyer</SelectItem>
                  <SelectItem value="Copy Writing">Copy Writing</SelectItem>
                  <SelectItem value="Web Developer">Web Developer</SelectItem>
                  <SelectItem value="Warehouse Staff">Warehouse Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="team" className="text-right">
                {t.team}
              </Label>
                              <Select
                  value={newEmployee.team || 'none'}
                  onValueChange={(value) => setNewEmployee(prev => ({...prev, team: value === 'none' ? undefined : value as Team}))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select team (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team assigned</SelectItem>
                  <SelectItem value="Content & Creative Department">Content & Creative Department</SelectItem>
                  <SelectItem value="Customer Retention Department">Customer Retention Department</SelectItem>
                  <SelectItem value="IT Department">IT Department</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                {t.role}
              </Label>
              <Select
                value={newEmployee.role}
                onValueChange={(value) => setNewEmployee(prev => ({...prev, role: value as 'admin' | 'employee' | 'warehouse' | 'content_creative_manager' | 'customer_retention_manager' | 'digital_solution_manager'}))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t.role} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t.admin}</SelectItem>
                  <SelectItem value="employee">{t.employee}</SelectItem>
                  <SelectItem value="warehouse">{t.warehouse}</SelectItem>
                  <SelectItem value="content_creative_manager">{t.contentCreativeManager}</SelectItem>
                  <SelectItem value="customer_retention_manager">{t.customerRetentionManager}</SelectItem>
                  <SelectItem value="digital_solution_manager">{t.digitalSolutionManager}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className={language === 'ar' ? 'flex-row-reverse' : 'flex-col space-y-2 sm:space-y-0 sm:flex-row'}>
            <Button variant="outline" onClick={() => setIsAddingEmployee(false)} className="w-full sm:w-auto">
              {t.cancel}
            </Button>
            <Button 
              onClick={handleAddEmployee} 
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  {t.addEmployee}
                </div>
              ) : t.addEmployee}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditEmployeeOpen} onOpenChange={setIsEditEmployeeOpen}>
        <DialogContent className="sm:max-w-[425px] max-w-[95vw] max-h-[90vh] overflow-y-auto" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t.editEmployee}</DialogTitle>
            <DialogDescription>
              {t.updateInfo}
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  {t.name}
                </Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={selectedEmployee.name}
                  onChange={handleEmployeeChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-email" className="text-right">
                  {t.email}
                </Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  value={selectedEmployee.email}
                  onChange={handleEmployeeChange}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-position" className="text-right">
                  {t.position}
                </Label>
                <Select
                  value={selectedEmployee.position}
                  onValueChange={(value) => setSelectedEmployee(prev => prev ? {...prev, position: value as Position} : null)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={t.position} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Executive Director">Executive Director</SelectItem>
                    <SelectItem value="Content & Creative Manager">Content & Creative Manager</SelectItem>
                    <SelectItem value="Customer Retention Manager">Customer Retention Manager</SelectItem>
                    <SelectItem value="IT Manager">IT Manager</SelectItem>
                    <SelectItem value="Customer Service">Customer Service</SelectItem>
                    <SelectItem value="Designer">Designer</SelectItem>
                    <SelectItem value="Media Buyer">Media Buyer</SelectItem>
                    <SelectItem value="Copy Writing">Copy Writing</SelectItem>
                    <SelectItem value="Web Developer">Web Developer</SelectItem>
                    <SelectItem value="Warehouse Staff">Warehouse Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-team" className="text-right">
                  {t.team}
                </Label>
                <Select
                  value={selectedEmployee.team || 'none'}
                  onValueChange={(value) => setSelectedEmployee(prev => prev ? {...prev, team: value === 'none' ? undefined : value as Team} : null)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select team (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No team assigned</SelectItem>
                    <SelectItem value="Content & Creative Department">Content & Creative Department</SelectItem>
                    <SelectItem value="Customer Retention Department">Customer Retention Department</SelectItem>
                    <SelectItem value="IT Department">IT Department</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-role" className="text-right">
                  {t.role}
                </Label>
                <Select
                  value={selectedEmployee.role}
                  onValueChange={(value) => setSelectedEmployee(prev => prev ? {...prev, role: value as 'admin' | 'employee' | 'warehouse' | 'content_creative_manager' | 'customer_retention_manager' | 'digital_solution_manager'} : null)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={t.role} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t.admin}</SelectItem>
                    <SelectItem value="employee">{t.employee}</SelectItem>
                    <SelectItem value="warehouse">{t.warehouse}</SelectItem>
                    <SelectItem value="content_creative_manager">{t.contentCreativeManager}</SelectItem>
                    <SelectItem value="customer_retention_manager">{t.customerRetentionManager}</SelectItem>
                    <SelectItem value="digital_solution_manager">{t.digitalSolutionManager}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="change-password" 
                  checked={showEditPassword} 
                  onChange={() => setShowEditPassword(!showEditPassword)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="change-password">{t.setNewPassword}</Label>
              </div>
              
              {showEditPassword && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-password" className="text-right">
                    {t.password}
                  </Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="col-span-3"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter className={language === 'ar' ? 'flex-row-reverse' : 'flex-col space-y-2 sm:space-y-0 sm:flex-row'}>
            <Button variant="outline" onClick={() => setIsEditEmployeeOpen(false)} className="w-full sm:w-auto">
              {t.cancel}
            </Button>
            <Button 
              onClick={handleEditEmployee} 
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  {t.save}
                </div>
              ) : t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent className="sm:max-w-[425px] max-w-[95vw]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t.resetPassword}</DialogTitle>
            <DialogDescription>
              {selectedEmployee ? `${t.resetPassword}: ${selectedEmployee.name}` : t.resetPassword}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-password" className="text-right">
                {t.password}
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter className={language === 'ar' ? 'flex-row-reverse' : 'flex-col space-y-2 sm:space-y-0 sm:flex-row'}>
            <Button variant="outline" onClick={() => setIsResetPasswordOpen(false)} className="w-full sm:w-auto">
              {t.cancel}
            </Button>
            <Button 
              onClick={handleResetPassword} 
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  {t.resetPassword}
                </div>
              ) : t.resetPassword}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rate Employee Modal */}
      <RateEmployeeModal
        isOpen={isRateEmployeeOpen}
        onClose={() => setIsRateEmployeeOpen(false)}
        employee={employeeToRate}
        onRatingSubmitted={handleRatingSubmitted}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px] max-w-[95vw]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              {t.confirmDelete}
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>{t.deleteConfirmMessage}</p>
              {employeeToDelete && (
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800">
                  <p className="font-medium text-red-800 dark:text-red-200">
                    {employeeToDelete.name} ({employeeToDelete.email})
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-300">
                    {employeeToDelete.position} - {employeeToDelete.department}
                  </p>
                </div>
              )}
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                {t.deleteEmployeeWarning}
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className={language === 'ar' ? 'flex-row-reverse' : 'flex-col space-y-2 sm:space-y-0 sm:flex-row'}>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleteConfirmOpen(false);
                setEmployeeToDelete(null);
              }}
              className="w-full sm:w-auto"
            >
              {t.cancel}
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteEmployee} 
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  {t.deleteEmployee}
                </div>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t.deleteEmployee}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEmployeesPage;

