import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { createTask, fetchAllTasks, sendNotification, subscribeToTaskChanges } from '@/lib/tasksApi';
import { fetchEmployees } from '@/lib/employeesApi';
import { Task, User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface TasksAdminPanelProps {
  language: string;
}

const TasksAdminPanel = ({ language }: TasksAdminPanelProps) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: '',
    status: 'On Hold' as 'On Hold' | 'In Progress' | 'Complete',
    progressPercentage: 0
  });
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    sendToAll: false,
    selectedUsers: [] as string[]
  });

  // Translation object for multilingual support
  const translations = {
    en: {
      tasks: "Tasks",
      createTask: "Create Task",
      sendNotification: "Send Notification",
      notificationCenter: "Notification Center",
      taskManagement: "Task Management",
      title: "Title",
      description: "Description",
      assignTo: "Assign To",
      status: "Status",
      progress: "Progress (%)",
      cancel: "Cancel",
      create: "Create",
      send: "Send",
      onHold: "On Hold",
      inProgress: "In Progress",
      complete: "Complete",
      selectEmployee: "Select Employee",
      message: "Message",
      sendToAll: "Send to All Employees",
      selectEmployees: "Select Employees",
      taskCreated: "Task created successfully",
      taskError: "Error creating task",
      notificationSent: "Notification sent successfully",
      notificationError: "Error sending notification",
      fillRequired: "Please fill all required fields"
    },
    ar: {
      tasks: "المهام",
      createTask: "إنشاء مهمة",
      sendNotification: "إرسال إشعار",
      notificationCenter: "مركز الإشعارات",
      taskManagement: "إدارة المهام",
      title: "العنوان",
      description: "الوصف",
      assignTo: "تعيين إلى",
      status: "الحالة",
      progress: "التقدم (%)",
      cancel: "إلغاء",
      create: "إنشاء",
      send: "إرسال",
      onHold: "قيد الانتظار",
      inProgress: "قيد التنفيذ",
      complete: "مكتمل",
      selectEmployee: "اختر موظف",
      message: "الرسالة",
      sendToAll: "إرسال لجميع الموظفين",
      selectEmployees: "اختر الموظفين",
      taskCreated: "تم إنشاء المهمة بنجاح",
      taskError: "خطأ في إنشاء المهمة",
      notificationSent: "تم إرسال الإشعار بنجاح",
      notificationError: "خطأ في إرسال الإشعار",
      fillRequired: "يرجى ملء جميع الحقول المطلوبة"
    }
  };

  const t = translations[language as keyof typeof translations];

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        console.log('Loading employees...');
        const data = await fetchEmployees();
        console.log('Employees loaded:', data);
        setEmployees(data);
      } catch (error) {
        console.error("Error loading employees:", error);
      }
    };

    const loadTasks = async () => {
      try {
        console.log('Loading tasks...');
        const data = await fetchAllTasks();
        console.log('Tasks loaded:', data);
        setTasks(data);
      } catch (error) {
        console.error("Error loading tasks:", error);
      }
    };

    loadEmployees();
    loadTasks();

    // Subscribe to real-time task updates
    const unsubscribe = subscribeToTaskChanges((updatedTasks) => {
      console.log('Tasks updated from subscription:', updatedTasks);
      setTasks(updatedTasks);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.description || !newTask.assignedTo) {
      toast.error(t.fillRequired);
      return;
    }

    if (!user) return;

    setIsLoading(true);
    try {
      console.log('Creating task:', newTask);
      const createdTask = await createTask({
        title: newTask.title,
        description: newTask.description,
        assignedTo: newTask.assignedTo,
        status: newTask.status,
        progressPercentage: newTask.progressPercentage,
        createdBy: user.id
      });

      console.log('Task created successfully:', createdTask);
      
      // Update the tasks list with the new task
      setTasks(prevTasks => [createdTask, ...prevTasks]);

      setIsTaskDialogOpen(false);
      setNewTask({
        title: '',
        description: '',
        assignedTo: '',
        status: 'On Hold',
        progressPercentage: 0
      });
      
      toast.success(t.taskCreated);
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error(t.taskError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!newNotification.title || !newNotification.message || 
        (!newNotification.sendToAll && newNotification.selectedUsers.length === 0)) {
      toast.error(t.fillRequired);
      return;
    }

    if (!user) return;

    setIsLoading(true);
    try {
      console.log('Sending notification:', newNotification);
      
      if (newNotification.sendToAll) {
        await sendNotification({
          title: newNotification.title,
          message: newNotification.message,
          adminId: user.id,
          sendToAll: true
        });
        console.log('Notification sent to all users');
      } else {
        // Send to selected users
        for (const userId of newNotification.selectedUsers) {
          console.log(`Sending notification to user ${userId}`);
          await sendNotification({
            userId,
            title: newNotification.title,
            message: newNotification.message,
            adminId: user.id
          });
        }
      }

      setIsNotificationDialogOpen(false);
      setNewNotification({
        title: '',
        message: '',
        sendToAll: false,
        selectedUsers: []
      });
      
      toast.success(t.notificationSent);
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error(t.notificationError);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'On Hold': return 'bg-yellow-100 text-yellow-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Complete': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <Button 
          onClick={() => setIsTaskDialogOpen(true)}
          className="bg-primary hover:bg-primary/90"
        >
          {t.createTask}
        </Button>
        <Button 
          onClick={() => setIsNotificationDialogOpen(true)}
          variant="outline"
        >
          {t.sendNotification}
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.taskManagement}</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No tasks yet
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.slice(0, 5).map(task => (
                  <div key={task.id} className="p-3 border rounded-md">
                    <div className="flex justify-between">
                      <h3 className="font-medium">{task.title}</h3>
                      <Badge className={getStatusColor(task.status)}>
                        {task.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-muted-foreground">
                        Assigned to: {task.assignedToName}
                      </span>
                      <div className="flex items-center">
                        <div className="h-2 w-24 bg-gray-200 rounded-full mr-2">
                          <div 
                            className="h-2 bg-primary rounded-full" 
                            style={{ width: `${task.progressPercentage}%` }}
                          />
                        </div>
                        <span className="text-xs">{task.progressPercentage}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t.createTask}</DialogTitle>
            <DialogDescription>
              Create a new task and assign it to an employee
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-title" className="text-right">
                {t.title}
              </Label>
              <Input
                id="task-title"
                value={newTask.title}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-description" className="text-right">
                {t.description}
              </Label>
              <Textarea
                id="task-description"
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                className="col-span-3"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-assignee" className="text-right">
                {t.assignTo}
              </Label>
              <Select
                value={newTask.assignedTo}
                onValueChange={(value) => setNewTask({...newTask, assignedTo: value})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t.selectEmployee} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} ({employee.position})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-status" className="text-right">
                {t.status}
              </Label>
              <Select
                value={newTask.status}
                onValueChange={(value) => setNewTask({...newTask, status: value as 'On Hold' | 'In Progress' | 'Complete'})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="On Hold">{t.onHold}</SelectItem>
                  <SelectItem value="In Progress">{t.inProgress}</SelectItem>
                  <SelectItem value="Complete">{t.complete}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-progress" className="text-right">
                {t.progress}
              </Label>
              <Input
                id="task-progress"
                type="number"
                min="0"
                max="100"
                value={newTask.progressPercentage}
                onChange={(e) => setNewTask({...newTask, progressPercentage: parseInt(e.target.value) || 0})}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter className={language === 'ar' ? 'flex-row-reverse' : ''}>
            <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>{t.cancel}</Button>
            <Button onClick={handleCreateTask} disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  {t.create}
                </div>
              ) : t.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Notification Dialog */}
      <Dialog open={isNotificationDialogOpen} onOpenChange={setIsNotificationDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t.sendNotification}</DialogTitle>
            <DialogDescription>
              Send a notification to employees
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notification-title" className="text-right">
                {t.title}
              </Label>
              <Input
                id="notification-title"
                value={newNotification.title}
                onChange={(e) => setNewNotification({...newNotification, title: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notification-message" className="text-right">
                {t.message}
              </Label>
              <Textarea
                id="notification-message"
                value={newNotification.message}
                onChange={(e) => setNewNotification({...newNotification, message: e.target.value})}
                className="col-span-3"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="send-to-all" 
                checked={newNotification.sendToAll}
                onCheckedChange={(checked) => 
                  setNewNotification({...newNotification, sendToAll: checked as boolean})
                }
              />
              <Label htmlFor="send-to-all">{t.sendToAll}</Label>
            </div>

            {!newNotification.sendToAll && (
              <div className="grid gap-2">
                <Label>{t.selectEmployees}</Label>
                <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                  {employees.map((employee) => (
                    <div key={employee.id} className="flex items-center space-x-2 py-1">
                      <Checkbox 
                        id={`employee-${employee.id}`}
                        checked={newNotification.selectedUsers.includes(employee.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewNotification({
                              ...newNotification, 
                              selectedUsers: [...newNotification.selectedUsers, employee.id]
                            });
                          } else {
                            setNewNotification({
                              ...newNotification,
                              selectedUsers: newNotification.selectedUsers.filter(id => id !== employee.id)
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`employee-${employee.id}`}>{employee.name}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className={language === 'ar' ? 'flex-row-reverse' : ''}>
            <Button variant="outline" onClick={() => setIsNotificationDialogOpen(false)}>{t.cancel}</Button>
            <Button onClick={handleSendNotification} disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  {t.send}
                </div>
              ) : t.send}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TasksAdminPanel;
