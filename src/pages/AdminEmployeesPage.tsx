
import React from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import { mockUsers } from '@/data/mockData';

const AdminEmployeesPage = () => {
  const { user } = useAuth();

  if (!user || user.role !== 'admin') {
    return null;
  }

  // Filter out the admin user
  const employees = mockUsers.filter(u => u.role !== 'admin');

  return (
    <MainLayout>
      <div className="flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Employees</h1>
          <Button className="bg-primary hover:bg-primary/90">Add Employee</Button>
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
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" className="text-secondary">
                            Reset Password
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default AdminEmployeesPage;
