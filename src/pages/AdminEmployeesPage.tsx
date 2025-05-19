import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
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
import { User, Department, Position } from '@/types';
import { fetchEmployees, createEmployee, updateEmployee, resetEmployeePassword } from '@/lib/employeesApi';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';

const AdminEmployeesPage = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isEditEmployeeOpen, setIsEditEmployeeOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [language, setLanguage] = useState('en');
  const [newEmployee, setNewEmployee] = useState({
    username: '',
    name: '',
    email: '',
    department: 'Engineering' as Department,
    position: 'Designer' as Position,
    password: '',
    role: 'employee' as 'admin' | 'employee'
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
      lastCheckIn: "Last Check-in",
      actions: "Actions",
      edit: "Edit",
      resetPassword: "Reset Password",
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
      admin: "Admin",
      employee: "Employee"
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
      lastCheckIn: "آخر تسجيل دخول",
      actions: "الإجراءات",
      edit: "تعديل",
      resetPassword: "إعادة تعيين كلمة المر����ر",
      never: "لم يسجل الدخول أبدًا",
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
      admin: "مدير",
      employee: "موظف"
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

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const data = await fetchEmployees();
      setEmployees(data.filter(u => u.id !== user?.id)); // Exclude current user
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
        department: newEmployee.department,
        position: newEmployee.position,
        role: newEmployee.role
      });
      
      // Refresh employee list
      await loadEmployees();
      
      setIsAddEmployeeOpen(false);
      toast.success(t.employeeAdded);
      
      // Reset form
      setNewEmployee({
        username: '',
        name: '',
        email: '',
        department: 'Engineering',
        position: 'Designer',
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
      await updateEmployee(selectedEmployee.id, selectedEmployee);
      
      if (showEditPassword && editPassword) {
        await resetEmployeePassword(selectedEmployee.email);
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
      await resetEmployeePassword(selectedEmployee.email);
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

  const handleEmployeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSelectedEmployee(prev => prev ? {...prev, [name]: value} : null);
  };

  const handleNewEmployeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewEmployee(prev => ({...prev, [name]: value}));
  };

  return (
    <div className="flex flex-col w-full" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center mb-6 sticky top-0 z-10 bg-background pt-2 pb-4">
        <h1 className="text-2xl font-bold">{t.employees}</h1>
        <Button 
          className="bg-primary hover:bg-primary/90"
          onClick={() => setIsAddEmployeeOpen(true)}
        >
          {t.addEmployee}
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{t.employeeDirectory}</CardTitle>
          <CardDescription>{t.manageEmployeeAccounts}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.name}</TableHead>
                  <TableHead>{t.username}</TableHead>
                  <TableHead>{t.department}</TableHead>
                  <TableHead>{t.position}</TableHead>
                  <TableHead>{t.lastCheckIn}</TableHead>
                  <TableHead className="text-right">{t.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">No employees found</TableCell>
                  </TableRow>
                ) : (
                  employees.map(employee => (
                    <TableRow key={employee.id}>
                      <TableCell>{employee.name}</TableCell>
                      <TableCell>{employee.username}</TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell>{employee.position}</TableCell>
                      <TableCell>
                        {employee.lastCheckin 
                          ? new Date(employee.lastCheckin).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US') 
                          : t.never}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              {t.actions}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => openEditDialog(employee)}>
                              {t.edit}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openResetPasswordDialog(employee)}>
                              {t.resetPassword}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

    {/* Add Employee Dialog */}
    <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
      <DialogContent className="sm:max-w-[425px]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
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
            <Label htmlFor="department" className="text-right">
              {t.department}
            </Label>
            <Select
              value={newEmployee.department}
              onValueChange={(value) => setNewEmployee(prev => ({...prev, department: value as Department}))}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder={t.department} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Engineering">Engineering</SelectItem>
                <SelectItem value="IT">IT</SelectItem>
                <SelectItem value="Doctor">Doctor</SelectItem>
                <SelectItem value="Manager">Manager</SelectItem>
              </SelectContent>
            </Select>
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
                <SelectItem value="Customer Service">Customer Service</SelectItem>
                <SelectItem value="Designer">Designer</SelectItem>
                <SelectItem value="Media Buyer">Media Buyer</SelectItem>
                <SelectItem value="Copy Writing">Copy Writing</SelectItem>
                <SelectItem value="Web Developer">Web Developer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
              {t.role}
            </Label>
            <Select
              value={newEmployee.role}
              onValueChange={(value) => setNewEmployee(prev => ({...prev, role: value as 'admin' | 'employee'}))}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder={t.role} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{t.admin}</SelectItem>
                <SelectItem value="employee">{t.employee}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className={language === 'ar' ? 'flex-row-reverse' : ''}>
          <Button variant="outline" onClick={() => setIsAddEmployeeOpen(false)}>{t.cancel}</Button>
          <Button onClick={handleAddEmployee} disabled={isLoading}>
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
      <DialogContent className="sm:max-w-[425px]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
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
              <Label htmlFor="edit-department" className="text-right">
                {t.department}
              </Label>
              <Select
                value={selectedEmployee.department}
                onValueChange={(value) => setSelectedEmployee(prev => prev ? {...prev, department: value as Department} : null)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t.department} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="IT">IT</SelectItem>
                  <SelectItem value="Doctor">Doctor</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                </SelectContent>
              </Select>
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
                  <SelectItem value="Customer Service">Customer Service</SelectItem>
                  <SelectItem value="Designer">Designer</SelectItem>
                  <SelectItem value="Media Buyer">Media Buyer</SelectItem>
                  <SelectItem value="Copy Writing">Copy Writing</SelectItem>
                  <SelectItem value="Web Developer">Web Developer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-role" className="text-right">
                {t.role}
              </Label>
              <Select
                value={selectedEmployee.role}
                onValueChange={(value) => setSelectedEmployee(prev => prev ? {...prev, role: value as 'admin' | 'employee'} : null)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t.role} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t.admin}</SelectItem>
                  <SelectItem value="employee">{t.employee}</SelectItem>
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
        <DialogFooter className={language === 'ar' ? 'flex-row-reverse' : ''}>
          <Button variant="outline" onClick={() => setIsEditEmployeeOpen(false)}>{t.cancel}</Button>
          <Button onClick={handleEditEmployee} disabled={isLoading}>
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
      <DialogContent className="sm:max-w-[425px]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
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
        <DialogFooter className={language === 'ar' ? 'flex-row-reverse' : ''}>
          <Button variant="outline" onClick={() => setIsResetPasswordOpen(false)}>{t.cancel}</Button>
          <Button onClick={handleResetPassword} disabled={isLoading}>
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
  );
};

export default AdminEmployeesPage;
