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
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  fetchTasks, 
  createTask, 
  sendNotification 
} from '@/lib/tasksApi';
import { fetchEmployees } from '@/lib/employeesApi';
import { User, Task } from '@/types';
import { Checkbox } from "@/components/ui/checkbox";

const AdminTasksPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);
  const [language, setLanguage] = useState('en');
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: '',
    status: 'On Hold' as 'On Hold' | 'In Progress' | 'Complete',
    progressPercentage: 0
  });
  
  const [notification, setNotification] = useState({
    title: '',
    message: '',
    userId: '',
    sendToAll: false
  });
  
  // Translation object for multilingual support
  const translations = {
    en: {
      tasks: "Tasks",
      addTask: "Add Task",
      sendNotification: "Send Notification",
      taskManagement: "Task Management",
      manageTasksAndNotifications: "Manage tasks and send notifications to employees",
      title: "Title",
      description: "Description",
      assignedTo: "Assigned To",
      status: "Status",
      progress: "Progress",
      actions: "Actions",
      onHold: "On Hold",
      inProgress: "In Progress",
      complete: "Complete",
      createTask: "Create Task",
      newTask: "New Task",
      createTaskDescription: "Assign a new task to an employee",
      cancel: "Cancel",
      save: "Save",
      taskAdded: "Task added successfully!",
      employeeNotifications: "Employee Notifications",
      sendToAll: "Send to All Employees",
      notificationTitle: "Notification Title",
      message: "Message",
      recipient: "Recipient",
      selectEmployee: "Select Employee",
      notificationSent: "Notification sent successfully!",
      fillAllFields: "Please fill all required fields",
      loadingTasks: "Loading tasks...",
      noTasks: "No tasks found",
      selectStatus: "Select Status",
      view: "View",
      employee: "Employee",
      sendMessage: "Send Message"
    },
    ar: {
      tasks: "المهام",
      addTask: "إضافة مهمة",
      sendNotification: "إرسال إشعار",
      taskManagement: "إدارة المهام",
      manageTasksAndNotifications: "إدارة المهام وإرسال الإشعارات للموظفين",
      title: "العنوان",
      description: "الوصف",
      assignedTo: "تم تعيينه إلى",
      status: "الحالة",
      progress: "التقدم",
      actions: "الإجراءات",
      onHold: "في الانتظار",
      inProgress: "قيد التنفيذ",
      complete: "مكتمل",
      createTask: "إنشاء مهمة",
      newTask: "مهمة جديدة",
      createTaskDescription: "تعيين مهمة جديدة لموظف",
      cancel: "إلغاء",
      save: "حفظ",
      taskAdded: "تمت إضافة المهمة بنجاح!",
      employeeNotifications: "إشعارات الموظفين",
      sendToAll: "إرسال لجميع الموظفين",
      notificationTitle: "عنوان الإشعار",
      message: "الرسالة",
      recipient: "المستلم",
      selectEmployee: "اختر موظف",
      notificationSent: "تم إرسال الإشعار بنجاح!",
      fillAllFields: "يرجى ملء جميع الحقول المطلوبة",
      loadingTasks: "جاري تحميل المهام...",
      noTasks: "لا توجد مهام",
      selectStatus: "اختر الحالة",
      view: "عرض",
      employee: "موظف",
      sendMessage: "إرسال رسالة"
    }
  };

  useEffect(() => {
    const storedLang = localStorage.getItem('preferredLanguage');
    if (storedLang && (storedLang === 'en' || storedLang === 'ar')) {
      setLanguage(storedLang);
      document.documentElement.dir = storedLang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = storedLang;
    }
  }, []);

  const t = translations[language as keyof typeof translations];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tasksData, employeesData] = await Promise.all([
        fetchTasks(),
        fetchEmployees()
      ]);
      
      setTasks(tasksData);
      setEmployees(employeesData.filter(emp => emp.id !== user?.id)); // Exclude current admin
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!user) return;
    
    if (!newTask.title || !newTask.description || !newTask.assignedTo) {
      toast.error(t.fillAllFields);
      return;
    }

    setIsLoading(true);
    try {
      const createdTask = await createTask({
        ...newTask,
        createdBy: user.id
      });
      
      setTasks([createdTask, ...tasks]);
      setIsTaskDialogOpen(false);
      toast.success(t.taskAdded);
      
      // Reset form
      setNewTask({
        title: '',
        description: '',
        assignedTo: '',
        status: 'On Hold',
        progressPercentage: 0
      });
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!user) return;
    
    if (!notification.title || !notification.message || 
        (!notification.sendToAll && !notification.userId)) {
      toast.error(t.fillAllFields);
      return;
    }

    setIsLoading(true);
    try {
      await sendNotification({
        userId: notification.sendToAll ? undefined : notification.userId,
        title: notification.title,
        message: notification.message,
        sendToAll: notification.sendToAll,
        adminId: user.id
      });
      
      setIsNotificationDialogOpen(false);
      toast.success(t.notificationSent);
      
      // Reset form
      setNotification({
        title: '',
        message: '',
        userId: '',
        sendToAll: false
      });
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Failed to send notification");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'On Hold':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'Complete':
        return 'bg-green-100 text-green-800 border border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <MainLayout>
      <div className="flex flex-col" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex justify-between items-center mb-6 sticky top-0 z-10 bg-background pt-2 pb-4">
          <h1 className="text-2xl font-bold">{t.tasks}</h1>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setIsNotificationDialogOpen(true)}
            >
              {t.sendNotification}
            </Button>
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={() => setIsTaskDialogOpen(true)}
            >
              {t.addTask}
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="tasks" className="mb-6">
          <TabsList>
            <TabsTrigger value="tasks">{t.tasks}</TabsTrigger>
            <TabsTrigger value="notifications">{t.employeeNotifications}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle>{t.taskManagement}</CardTitle>
                <CardDescription>{t.manageTasksAndNotifications}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.title}</TableHead>
                        <TableHead>{t.assignedTo}</TableHead>
                        <TableHead>{t.status}</TableHead>
                        <TableHead>{t.progress}</TableHead>
                        <TableHead className="text-right">{t.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            <div className="flex justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                            </div>
                            <p className="mt-2 text-sm text-gray-500">{t.loadingTasks}</p>
                          </TableCell>
                        </TableRow>
                      ) : tasks.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">{t.noTasks}</TableCell>
                        </TableRow>
                      ) : (
                        tasks.map(task => (
                          <TableRow key={task.id}>
                            <TableCell className="font-medium">{task.title}</TableCell>
                            <TableCell>{task.assignedToName}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(task.status)}`}>
                                {task.status === 'On Hold' ? t.onHold : 
                                 task.status === 'In Progress' ? t.inProgress : t.complete}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={task.progressPercentage} className="h-2" />
                                <span className="text-xs text-gray-500">{task.progressPercentage}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    {t.actions}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem>
                                    {t.view}
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
          </TabsContent>
          
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>{t.employeeNotifications}</CardTitle>
                <CardDescription>Send messages and notifications to employees</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {employees.map(employee => (
                      <Card key={employee.id} className="overflow-hidden">
                        <CardHeader className="p-4">
                          <CardTitle className="text-base">{employee.name}</CardTitle>
                          <CardDescription>{employee.position} · {employee.department}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              setNotification({
                                ...notification,
                                userId: employee.id,
                                sendToAll: false
                              });
                              setIsNotificationDialogOpen(true);
                            }}
                          >
                            {t.sendMessage}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="sm:max-w-[525px]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t.newTask}</DialogTitle>
            <DialogDescription>
              {t.createTaskDescription}
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
                rows={4}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="task-assigned" className="text-right">
                {t.assignedTo}
              </Label>
              <Select 
                value={newTask.assignedTo} 
                onValueChange={(value) => setNewTask({...newTask, assignedTo: value})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t.selectEmployee} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(employee => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} ({employee.department})
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
                onValueChange={(value: 'On Hold' | 'In Progress' | 'Complete') => 
                  setNewTask({...newTask, status: value})
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t.selectStatus} />
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
              <div className="col-span-3 flex items-center gap-2">
                <Progress value={newTask.progressPercentage} className="flex-1 h-2" />
                <Input
                  id="task-progress"
                  type="number"
                  min="0"
                  max="100"
                  value={newTask.progressPercentage}
                  onChange={(e) => setNewTask({
                    ...newTask, 
                    progressPercentage: parseInt(e.target.value) || 0,
                    status: parseInt(e.target.value) === 100 ? 'Complete' : newTask.status
                  })}
                  className="w-16"
                />
                <span>%</span>
              </div>
            </div>
          </div>
          <DialogFooter className={language === 'ar' ? 'flex-row-reverse' : ''}>
            <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>{t.cancel}</Button>
            <Button onClick={handleCreateTask} disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  {t.createTask}
                </div>
              ) : t.createTask}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Notification Dialog */}
      <Dialog open={isNotificationDialogOpen} onOpenChange={setIsNotificationDialogOpen}>
        <DialogContent className="sm:max-w-[525px]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t.sendNotification}</DialogTitle>
            <DialogDescription>
              Send a notification to one or all employees
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="send-to-all" 
                checked={notification.sendToAll}
                onCheckedChange={(checked) => {
                  setNotification({
                    ...notification,
                    sendToAll: checked === true,
                    userId: checked === true ? '' : notification.userId
                  });
                }}
              />
              <Label htmlFor="send-to-all">
                {t.sendToAll}
              </Label>
            </div>
            
            {!notification.sendToAll && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notification-recipient" className="text-right">
                  {t.recipient}
                </Label>
                <Select 
                  value={notification.userId} 
                  onValueChange={(value) => setNotification({...notification, userId: value})}
                  disabled={notification.sendToAll}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={t.selectEmployee} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(employee => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name} ({employee.department})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notification-title" className="text-right">
                {t.notificationTitle}
              </Label>
              <Input
                id="notification-title"
                value={notification.title}
                onChange={(e) => setNotification({...notification, title: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notification-message" className="text-right">
                {t.message}
              </Label>
              <Textarea
                id="notification-message"
                value={notification.message}
                onChange={(e) => setNotification({...notification, message: e.target.value})}
                className="col-span-3"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className={language === 'ar' ? 'flex-row-reverse' : ''}>
            <Button variant="outline" onClick={() => setIsNotificationDialogOpen(false)}>{t.cancel}</Button>
            <Button onClick={handleSendNotification} disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  {t.sendNotification}
                </div>
              ) : t.sendNotification}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default AdminTasksPage;
