
import React, { useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mockUsers } from '@/data/mockData';
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

const AdminEmployeesPage = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState(mockUsers.filter(u => u.role !== 'admin'));
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isEditEmployeeOpen, setIsEditEmployeeOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    username: '',
    name: '',
    email: '',
    department: 'Engineering' as Department,
    position: 'Designer' as Position,
    password: ''
  });
  const [newPassword, setNewPassword] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  if (!user || user.role !== 'admin') {
    return null;
  }

  const handleAddEmployee = () => {
    if (!newEmployee.username || !newEmployee.name || !newEmployee.email || !newEmployee.password) {
      toast.error("Please fill all required fields");
      return;
    }

    const newEmployeeData: User = {
      id: Date.now().toString(),
      username: newEmployee.username,
      name: newEmployee.name,
      email: newEmployee.email,
      department: newEmployee.department,
      position: newEmployee.position,
      role: 'employee'
    };

    setEmployees(prev => [...prev, newEmployeeData]);
    setIsAddEmployeeOpen(false);
    toast.success("Employee added successfully!");
    
    // Reset form
    setNewEmployee({
      username: '',
      name: '',
      email: '',
      department: 'Engineering',
      position: 'Designer',
      password: ''
    });
  };

  const handleEditEmployee = () => {
    if (!selectedEmployee || !selectedEmployee.name || !selectedEmployee.email) {
      toast.error("Please fill all required fields");
      return;
    }

    const updatedEmployee = {...selectedEmployee};
    
    if (showEditPassword && editPassword) {
      // In a real app, this would involve a secure password update
      toast.success(`Password updated for ${selectedEmployee.name}`);
    }

    setEmployees(prev => prev.map(emp => 
      emp.id === updatedEmployee.id ? updatedEmployee : emp
    ));
    
    setIsEditEmployeeOpen(false);
    setShowEditPassword(false);
    setEditPassword('');
    toast.success("Employee updated successfully!");
  };

  const handleResetPassword = () => {
    if (!selectedEmployee || !newPassword) {
      toast.error("Please enter a new password");
      return;
    }

    // In a real app, this would call an API to update the password
    setIsResetPasswordOpen(false);
    toast.success(`Password for ${selectedEmployee.name} has been reset`);
    setNewPassword('');
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
    <MainLayout>
      <div className="flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Employees</h1>
          <Button 
            className="bg-primary hover:bg-primary/90"
            onClick={() => setIsAddEmployeeOpen(true)}
          >
            Add Employee
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Employee Directory</CardTitle>
            <CardDescription>Manage employee accounts and access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Name</th>
                    <th className="text-left py-3 px-4">Username</th>
                    <th className="text-left py-3 px-4">Department</th>
                    <th className="text-left py-3 px-4">Position</th>
                    <th className="text-left py-3 px-4">Last Check-in</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(employee => (
                    <tr key={employee.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{employee.name}</td>
                      <td className="py-3 px-4">{employee.username}</td>
                      <td className="py-3 px-4">{employee.department}</td>
                      <td className="py-3 px-4">{employee.position}</td>
                      <td className="py-3 px-4">
                        {employee.lastCheckin 
                          ? new Date(employee.lastCheckin).toLocaleString() 
                          : 'Never checked in'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => openEditDialog(employee)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openResetPasswordDialog(employee)}>
                              Reset Password
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Employee Dialog */}
      <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>
              Create a new employee account
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
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
                Username
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
                Email
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
                Password
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
                Department
              </Label>
              <Select
                value={newEmployee.department}
                onValueChange={(value) => setNewEmployee(prev => ({...prev, department: value as Department}))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select department" />
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
                Position
              </Label>
              <Select
                value={newEmployee.position}
                onValueChange={(value) => setNewEmployee(prev => ({...prev, position: value as Position}))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select position" />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddEmployeeOpen(false)}>Cancel</Button>
            <Button onClick={handleAddEmployee}>Add Employee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditEmployeeOpen} onOpenChange={setIsEditEmployeeOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
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
                  Email
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
                  Department
                </Label>
                <Select
                  value={selectedEmployee.department}
                  onValueChange={(value) => setSelectedEmployee(prev => prev ? {...prev, department: value as Department} : null)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select department" />
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
                  Position
                </Label>
                <Select
                  value={selectedEmployee.position}
                  onValueChange={(value) => setSelectedEmployee(prev => prev ? {...prev, position: value as Position} : null)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select position" />
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
                  Role
                </Label>
                <Select
                  value={selectedEmployee.role}
                  onValueChange={(value) => setSelectedEmployee(prev => prev ? {...prev, role: value as 'admin' | 'employee'} : null)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
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
                <Label htmlFor="change-password">Set New Password</Label>
              </div>
              
              {showEditPassword && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-password" className="text-right">
                    New Password
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditEmployeeOpen(false)}>Cancel</Button>
            <Button onClick={handleEditEmployee}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              {selectedEmployee ? `Reset password for ${selectedEmployee.name}` : 'Reset employee password'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-password" className="text-right">
                New Password
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPasswordOpen(false)}>Cancel</Button>
            <Button onClick={handleResetPassword}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default AdminEmployeesPage;
