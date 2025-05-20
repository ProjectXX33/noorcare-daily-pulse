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
  sendNotification, 
  updateTask 
} from '@/lib/tasksApi';
import { fetchEmployees } from '@/lib/employeesApi';
import { User, Task } from '@/types';
import { Checkbox } from "@/components/ui/checkbox";
import TaskComments from '@/components/TaskComments';

const AdminTasksPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);
  const [language, setLanguage] = useState('en');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [updatingTaskProgress, setUpdatingTaskProgress] = useState(false);
  const [currentTaskTab, setCurrentTaskTab] = useState("details");
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: '',
    status: 'Not Started' as 'Not Started' | 'On Hold' | 'In Progress' | 'Complete',
    progressPercentage: 0
  });
  
  const [editingTask, setEditingTask] = useState({
    id: '',
    title: '',
    description: '',
    assignedTo: '',
    status: 'Not Started' as 'Not Started' | 'On Hold' | 'In Progress' | 'Complete',
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
      notStarted: "Not Started",
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
      sendMessage: "Send Message",
      editTask: "Edit Task",
      updateTask: "Update Task",
      taskUpdated: "Task updated successfully!",
      viewDetails: "View Details",
      editProgress: "Edit Progress",
      comments: "Comments",
      details: "Details"
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
      notStarted: "لم تبدأ",
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
      sendMessage: "إرسال رسالة",
      editTask: "تعديل المهمة",
      updateTask: "تحديث المهمة",
      taskUpdated: "تم تحديث المهمة بنجاح!",
      viewDetails: "عرض التفاصيل",
      editProgress: "تعديل التقدم",
      comments: "التعليقات",
      details: "التفاصيل"
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

    // Automatically set status based on progress
    let status = newTask.status;
    if (newTask.progressPercentage === 0) {
      status = 'Not Started';
    } else if (newTask.progressPercentage === 100) {
      status = 'Complete';
    }

    setIsLoading(true);
    try {
      const createdTask = await createTask({
        ...newTask,
        status,
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
        status: 'Not Started',
        progressPercentage: 0
      });
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTask = async () => {
    if (!user) return;
    
    if (!editingTask.title || !editingTask.description || !editingTask.assignedTo) {
      toast.error(t.fillAllFields);
      return;
    }

    // Automatically set status based on progress
    let finalStatus = editingTask.status;
    if (editingTask.progressPercentage === 0) {
      finalStatus = 'Not Started';
    } else if (editingTask.progressPercentage === 100) {
      finalStatus = 'Complete';
    }

    setUpdatingTaskProgress(true);
    try {
      const updatedTask = await updateTask(
        editingTask.id,
        {
          title: editingTask.title,
          description: editingTask.description,
          assignedTo: editingTask.assignedTo,
          status: finalStatus,
          progressPercentage: editingTask.progressPercentage
        },
        user.id
      );
      
      setTasks(tasks.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      ));
      
      setIsEditTaskDialogOpen(false);
      toast.success(t.taskUpdated);
      
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    } finally {
      setUpdatingTaskProgress(false);
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

  const openEditTaskDialog = (task: Task) => {
    setEditingTask({
      id: task.id,
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo,
      status: task.status as 'Not Started' | 'On Hold' | 'In Progress' | 'Complete',
      progressPercentage: task.progressPercentage
    });
    setSelectedTask(task);
    setCurrentTaskTab("details");
    setIsEditTaskDialogOpen(true);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Not Started':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
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

  const handleNewTaskProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const progress = parseInt(e.target.value);
    
    // If progress is 100%, automatically update status to Complete
    // If progress is 0%, automatically update status to Not Started
    if (progress === 100) {
      setNewTask({
        ...newTask,
        progressPercentage: progress,
        status: 'Complete'
      });
    } else if (progress === 0) {
      setNewTask({
        ...newTask,
        progressPercentage: progress,
        status: 'Not Started'
      });
    } else {
      setNewTask({
        ...newTask,
        progressPercentage: progress
      });
    }
  };
  
  const handleEditTaskProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const progress = parseInt(e.target.value);
    
    // If progress is 100%, automatically update status to Complete
    // If progress is 0%, automatically update status to Not Started
    if (progress === 100) {
      setEditingTask({
        ...editingTask,
        progressPercentage: progress,
        status: 'Complete'
      });
    } else if (progress === 0) {
      setEditingTask({
        ...editingTask,
        progressPercentage: progress,
        status: 'Not Started'
      });
    } else {
      setEditingTask({
        ...editingTask,
        progressPercentage: progress
      });
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <MainLayout>
      <div className="p-6">
        <div className="flex justify-end gap-2 mb-6">
          <Button onClick={() => setIsTaskDialogOpen(true)}>
            {t.addTask}
          </Button>
          <Button variant="outline" onClick={() => setIsNotificationDialogOpen(true)}>
            {t.sendNotification}
          </Button>
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
                {/* Table for md+ screens */}
                <div className="hidden md:block overflow-x-auto">
                  <Table className="min-w-[600px]">
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
                                {task.status === 'Not Started' ? t.notStarted :
                                 task.status === 'On Hold' ? t.onHold : 
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
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditTaskDialog(task)}
                                >
                                  {t.editTask}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {/* Card layout for mobile */}
                <div className="block md:hidden space-y-4">
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                      <p className="mt-2 text-sm text-gray-500 ml-2">{t.loadingTasks}</p>
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="text-center py-8">{t.noTasks}</div>
                  ) : (
                    tasks.map(task => (
                      <Card key={task.id} className="p-4">
                        <div className="flex justify-between items-center mb-2">
                          <div className="font-bold text-base">{task.title}</div>
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(task.status)}`}>{task.status === 'Not Started' ? t.notStarted : task.status === 'On Hold' ? t.onHold : task.status === 'In Progress' ? t.inProgress : t.complete}</span>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">{task.description}</div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="text-xs">{t.assignedTo}: <span className="font-medium">{task.assignedToName}</span></span>
                          <span className="text-xs">{t.progress}: <span className="font-medium">{task.progressPercentage}%</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => openEditTaskDialog(task)}
                          >
                            {t.editTask}
                          </Button>
                        </div>
                      </Card>
                    ))
                  )}
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
        <DialogContent className="w-[95vw] max-w-[525px] p-2 sm:p-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
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
                onValueChange={(value: 'Not Started' | 'On Hold' | 'In Progress' | 'Complete') => 
                  setNewTask({...newTask, status: value})
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t.selectStatus} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Started">{t.notStarted}</SelectItem>
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
                  onChange={handleNewTaskProgressChange}
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

      {/* Edit Task Dialog - Improved UI */}
      <Dialog open={isEditTaskDialogOpen} onOpenChange={setIsEditTaskDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[600px] max-h-[85vh] overflow-y-auto p-2 sm:p-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t.editTask}</DialogTitle>
            <DialogDescription>
              {editingTask.title}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={currentTaskTab} onValueChange={setCurrentTaskTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">{t.details}</TabsTrigger>
              <TabsTrigger value="comments">{t.comments}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-task-title">{t.title}</Label>
                  <Input
                    id="edit-task-title"
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-task-description">{t.description}</Label>
                  <Textarea
                    id="edit-task-description"
                    value={editingTask.description}
                    onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                    rows={4}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-task-assigned">{t.assignedTo}</Label>
                  <Select 
                    value={editingTask.assignedTo} 
                    onValueChange={(value) => setEditingTask({...editingTask, assignedTo: value})}
                  >
                    <SelectTrigger>
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
                
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-task-status">{t.status}</Label>
                    <Select 
                      value={editingTask.status} 
                      onValueChange={(value: 'Not Started' | 'On Hold' | 'In Progress' | 'Complete') => 
                        setEditingTask({...editingTask, status: value})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t.selectStatus} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Not Started">{t.notStarted}</SelectItem>
                        <SelectItem value="On Hold">{t.onHold}</SelectItem>
                        <SelectItem value="In Progress">{t.inProgress}</SelectItem>
                        <SelectItem value="Complete">{t.complete}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-task-progress">{t.progress}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="edit-task-progress"
                        type="number"
                        min="0"
                        max="100"
                        value={editingTask.progressPercentage}
                        onChange={handleEditTaskProgressChange}
                        className="w-16"
                      />
                      <span>%</span>
                      <Progress value={editingTask.progressPercentage} className="flex-1 h-2" />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="comments" className="space-y-4 mt-4">
              {user && selectedTask && (
                <TaskComments
                  taskId={selectedTask.id}
                  user={user}
                  comments={selectedTask.comments || []}
                  onCommentAdded={(newComments) => {
                    // Update the task comments in the local state
                    setTasks(tasks.map(task => 
                      task.id === selectedTask.id 
                        ? {...task, comments: newComments} 
                        : task
                    ));
                    // Also update the selected task
                    setSelectedTask({...selectedTask, comments: newComments});
                  }}
                  language={language}
                />
              )}
            </TabsContent>
          </Tabs>
          
          <DialogFooter className={language === 'ar' ? 'flex-row-reverse' : ''}>
            <Button variant="outline" onClick={() => setIsEditTaskDialogOpen(false)}>{t.cancel}</Button>
            <Button onClick={handleUpdateTask} disabled={updatingTaskProgress}>
              {updatingTaskProgress ? (
                <div className="flex items-center">
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  {t.updateTask}
                </div>
              ) : t.updateTask}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Notification Dialog */}
      <Dialog open={isNotificationDialogOpen} onOpenChange={setIsNotificationDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[525px] p-2 sm:p-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
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
