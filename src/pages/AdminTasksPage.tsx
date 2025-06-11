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
import { getTaskAverageRating, getLatestTaskRating } from '@/lib/ratingsApi';
import { fetchEmployees } from '@/lib/employeesApi';
import { User, Task } from '@/types';
import { Checkbox } from "@/components/ui/checkbox";
import TaskComments from '@/components/TaskComments';
import RateTaskModal from '@/components/RateTaskModal';
import StarRating from '@/components/StarRating';
import { supabase } from '@/lib/supabase';
import { Star, MoreVertical, Palette, Smartphone, Globe, Award, FileText, Zap, FolderOpen, Plus, Users, TrendingUp, Clock, Calendar, Filter, Edit, Eye } from 'lucide-react';

// Enhanced Task interface with creator information
interface EnhancedTask extends Task {
  assignedToPosition?: string;
  createdByName?: string;
  createdByPosition?: string;
}

const AdminTasksPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<EnhancedTask[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);
  const [isRateTaskOpen, setIsRateTaskOpen] = useState(false);
  const [language, setLanguage] = useState('en');
  const [selectedTask, setSelectedTask] = useState<EnhancedTask | null>(null);
  const [taskToRate, setTaskToRate] = useState<EnhancedTask | null>(null);
  const [updatingTaskProgress, setUpdatingTaskProgress] = useState(false);
  const [currentTaskTab, setCurrentTaskTab] = useState("details");
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: '',
    status: 'Not Started' as 'Not Started' | 'On Hold' | 'In Progress' | 'Complete',
    progressPercentage: 0,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    projectType: 'other' as 'social-media' | 'web-design' | 'branding' | 'print' | 'ui-ux' | 'other'
  });
  
  const [editingTask, setEditingTask] = useState({
    id: '',
    title: '',
    description: '',
    assignedTo: '',
    status: 'Not Started' as 'Not Started' | 'On Hold' | 'In Progress' | 'Complete',
    progressPercentage: 0,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    projectType: 'other' as 'social-media' | 'web-design' | 'branding' | 'print' | 'ui-ux' | 'other'
  });
  
  const [notification, setNotification] = useState({
    title: '',
    message: '',
    userId: '',
    sendToAll: false
  });

  // Filter states
  const [filteredTasks, setFilteredTasks] = useState<EnhancedTask[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<EnhancedTask | null>(null);
  const [isTaskDetailsDialogOpen, setIsTaskDetailsDialogOpen] = useState(false);
  
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
      rating: "Rating",
      actions: "Actions",
      rateTask: "Rate Task",
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
      details: "Details",
      noRating: "No rating"
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
      rating: "التقييم",
      actions: "الإجراءات",
      rateTask: "تقييم المهمة",
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
      details: "التفاصيل",
      noRating: "لا يوجد تقييم"
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

  // Filter tasks when tasks, selectedEmployee, or selectedPriority changes
  useEffect(() => {
    filterTasks();
  }, [tasks, selectedEmployee, selectedPriority]);

  const filterTasks = () => {
    let filtered = [...tasks];
    
    // Filter by employee
    if (selectedEmployee !== 'all') {
      filtered = filtered.filter(task => task.assignedTo === selectedEmployee);
    }
    
    // Filter by priority
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === selectedPriority);
    }
    
    setFilteredTasks(filtered);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tasksData, employeesData] = await Promise.all([
        fetchTasks(),
        fetchEmployees()
      ]);
      
      // Load rating data for each task
      const tasksWithRatings = await Promise.all(
        tasksData.map(async (task) => {
          try {
            const [averageRating, latestRating] = await Promise.all([
              getTaskAverageRating(task.id),
              getLatestTaskRating(task.id)
            ]);
            
            return {
              ...task,
              averageRating: averageRating > 0 ? averageRating : undefined,
              latestRating: latestRating || undefined
            };
          } catch (error) {
            console.error(`Error loading ratings for task ${task.id}:`, error);
            return task;
          }
        })
      );
      
      setTasks(tasksWithRatings);
      setEmployees(employeesData);
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
        createdBy: user.id,
        priority: newTask.priority,
        projectType: newTask.projectType
      });
      
      setTasks([createdTask, ...tasks]);
      setIsTaskDialogOpen(false);
      // Note: Notification is already sent by createTask API, no need to send duplicate
      
      // Reset form
      setNewTask({
        title: '',
        description: '',
        assignedTo: '',
        status: 'Not Started',
        progressPercentage: 0,
        priority: 'medium',
        projectType: 'other'
      });
      toast.success(t.taskAdded);
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
          progressPercentage: editingTask.progressPercentage,
          priority: editingTask.priority,
          projectType: editingTask.projectType
        },
        user.id
      );
      
      setTasks(tasks.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      ));
      
      setIsEditTaskDialogOpen(false);
      // Note: Notification is already sent by updateTask API, no need to send duplicate
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

  const openEditTaskDialog = (task: EnhancedTask) => {
    setEditingTask({
      id: task.id,
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo,
      status: task.status as 'Not Started' | 'On Hold' | 'In Progress' | 'Complete',
      progressPercentage: task.progressPercentage,
      priority: task.priority || 'medium',
      projectType: task.projectType || 'other'
    });
    setSelectedTask(task);
    setCurrentTaskTab("details");
    setIsEditTaskDialogOpen(true);
  };

  const openRateTaskDialog = (task: EnhancedTask) => {
    setTaskToRate(task);
    setIsRateTaskOpen(true);
  };

  const openTaskDetailsDialog = (task: EnhancedTask) => {
    setSelectedTaskForDetails(task);
    setIsTaskDetailsDialogOpen(true);
  };

  const handleTaskRatingSubmitted = () => {
    loadData(); // Refresh task data to show updated ratings
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Complete':
        return 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl ring-2 ring-green-500/20';
      case 'In Progress':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl ring-2 ring-blue-500/20';
      case 'On Hold':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg hover:shadow-xl ring-2 ring-yellow-500/20';
      case 'Not Started':
        return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg hover:shadow-xl ring-2 ring-gray-400/20';
      default:
        return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg hover:shadow-xl ring-2 ring-gray-400/20';
    }
  };

  // Helper function to identify Media Buyer to Designer assignments
  const isMediaBuyerToDesignerTask = (task: any) => {
    return task.createdByPosition === 'Media Buyer' && task.assignedToPosition === 'Designer';
  };

  // Helper function to check if selected employee is a Designer
  const isSelectedEmployeeDesigner = () => {
    const selectedEmployee = employees.find(emp => emp.id === newTask.assignedTo);
    return selectedEmployee?.position === 'Designer';
  };

  // Helper function to check if editing task is for a Designer
  const isEditingTaskForDesigner = () => {
    const selectedEmployee = employees.find(emp => emp.id === editingTask.assignedTo);
    return selectedEmployee?.position === 'Designer';
  };

  // Helper functions for priority and project type display
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-lg hover:shadow-xl ring-2 ring-red-500/20';
      case 'high':
        return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg hover:shadow-xl ring-2 ring-orange-500/20';
      case 'medium':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0 shadow-lg hover:shadow-xl ring-2 ring-yellow-500/20';
      case 'low':
        return 'bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-lg hover:shadow-xl ring-2 ring-green-500/20';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white border-0 shadow-lg hover:shadow-xl ring-2 ring-gray-500/20';
    }
  };

  const getPriorityDisplay = (priority?: string) => {
    switch (priority) {
      case 'urgent': return '⚡ URGENT';
      case 'high': return '🚨 HIGH';
      case 'medium': return '📋 MEDIUM';
      case 'low': return '✅ LOW';
      default: return '❓ UNKNOWN';
    }
  };

  const getProjectTypeIcon = (type?: string) => {
    switch (type) {
      case 'social-media': return <Smartphone className="w-3 h-3" />;
      case 'web-design': return <Globe className="w-3 h-3" />;
      case 'branding': return <Palette className="w-3 h-3" />;
      case 'print': return <FileText className="w-3 h-3" />;
      case 'ui-ux': return <Zap className="w-3 h-3" />;
      default: return <FolderOpen className="w-3 h-3" />;
    }
  };

  const getProjectTypeDisplay = (type?: string) => {
    switch (type) {
      case 'social-media': return '📱 Social Media';
      case 'web-design': return '🌐 Web Design';
      case 'branding': return '🎨 Branding';
      case 'print': return '📄 Print';
      case 'ui-ux': return '⚡ UI/UX';
      default: return '📂 Other';
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

  // Calculate task statistics
  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'Complete').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    urgent: tasks.filter(t => t.priority === 'urgent').length,
    designerTasks: tasks.filter(t => t.assignedToPosition === 'Designer').length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 w-full max-w-full overflow-x-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Enhanced Modern Header */}
      <div className="border-b border-border/50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm w-full shadow-lg">
        <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-6 w-full max-w-full">
          {/* Header Content */}
          <div className="flex flex-col gap-6">
            {/* Title and Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 text-white rounded-lg">
                    <TrendingUp className="w-6 h-6" />
            </div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100">
                    {t.taskManagement}
                  </h1>
                </div>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl">
                  {t.manageTasksAndNotifications}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={() => setIsTaskDialogOpen(true)} 
                  className="min-h-[44px] px-6 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  size="lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                {t.addTask}
              </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsNotificationDialogOpen(true)} 
                  className="min-h-[44px] px-6 border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800 shadow-sm hover:shadow-lg transition-all duration-200"
                  size="lg"
                >
                  <Users className="w-4 h-4 mr-2" />
                {t.sendNotification}
              </Button>
            </div>
          </div>

            {/* Analytics Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{taskStats.total}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Total Tasks</div>
                  </div>
        </div>
      </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                    <Star className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{taskStats.completed}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Completed</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{taskStats.inProgress}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">In Progress</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{taskStats.urgent}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Urgent</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-6 w-full max-w-full">
        {/* Single Tab Content - Removed TabsList */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {t.taskManagement}
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  {t.manageTasksAndNotifications}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-500">
                  Last updated: {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
              </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {/* Enhanced Filter Section */}
            <div className="mb-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Filters:</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Employee Filter */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Filter by Employee</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select employee to filter tasks" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Employees</SelectItem>
                      {employees.map(employee => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name} ({employee.position})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority Filter */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Filter by Priority</Label>
                  <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select priority to filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="urgent">⚡ Urgent</SelectItem>
                      <SelectItem value="high">🚨 High</SelectItem>
                      <SelectItem value="medium">📋 Medium</SelectItem>
                      <SelectItem value="low">✅ Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Results Summary */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">Results</Label>
                  <div className="flex items-center h-10 px-3 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Showing {filteredTasks.length} of {tasks.length} tasks
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Modern Table for md+ screens */}
                <div className="hidden md:block overflow-x-auto">
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <Table className="min-w-[700px]">
                    <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300 py-4">{t.title}</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300 py-4">{t.assignedTo}</TableHead>
                      <TableHead className="hidden xl:table-cell font-semibold text-slate-700 dark:text-slate-300 py-4">Priority</TableHead>
                      <TableHead className="hidden xl:table-cell font-semibold text-slate-700 dark:text-slate-300 py-4">Type</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300 py-4">{t.status}</TableHead>
                      <TableHead className="font-semibold text-slate-700 dark:text-slate-300 py-4">{t.progress}</TableHead>
                      <TableHead className="hidden lg:table-cell font-semibold text-slate-700 dark:text-slate-300 py-4">{t.comments}</TableHead>
                      <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300 py-4">{t.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                      <TableCell colSpan={8} className="text-center py-4">
                            <div className="flex justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                            </div>
                            <p className="mt-2 text-sm text-gray-500">{t.loadingTasks}</p>
                          </TableCell>
                        </TableRow>
                  ) : filteredTasks.length === 0 ? (
                        <TableRow>
                      <TableCell colSpan={8} className="text-center py-4">{t.noTasks}</TableCell>
                        </TableRow>
                      ) : (
                    filteredTasks.map(task => (
                          <TableRow 
                            key={task.id}
                        className={`border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200 ${isMediaBuyerToDesignerTask(task) 
                              ? "bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-l-purple-500 dark:from-purple-900/20 dark:to-pink-900/20 dark:border-l-purple-400" 
                              : ""
                        }`}
                          >
                          <TableCell className="font-semibold text-slate-900 dark:text-slate-100 py-4">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <span className="truncate max-w-[200px] break-words overflow-wrap-anywhere">{task.title}</span>
                                {isMediaBuyerToDesignerTask(task) && (
                                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl ring-2 ring-purple-500/20 transition-all duration-300 transform hover:scale-105">
                                    <span className="text-xs font-bold uppercase tracking-wider">🎨 MB→D</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
                                <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                                <span>Updated: {new Date(task.updatedAt).toLocaleDateString()}</span>
                              </div>
                              </div>
                            </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-slate-800 dark:text-slate-200">{task.assignedToName}</span>
                                {isMediaBuyerToDesignerTask(task) && (
                                <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                  By: {task.createdByName}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          <TableCell className="hidden xl:table-cell py-4 pr-6">
                            {task.priority && (
                              <span className={`inline-block px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 transform hover:scale-105 whitespace-nowrap min-w-fit ${getPriorityColor(task.priority)}`}>
                                {getPriorityDisplay(task.priority)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell py-4 pr-6">
                            {task.projectType && task.assignedToPosition === 'Designer' && (
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl ring-2 ring-blue-500/20 transition-all duration-300 transform hover:scale-105 whitespace-nowrap min-w-fit">
                                <span className="text-sm">{getProjectTypeIcon(task.projectType)}</span>
                                <span className="text-xs font-bold uppercase tracking-wider">
                                  {getProjectTypeDisplay(task.projectType)}
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="py-4 pr-6">
                            <span className={`inline-block px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 transform hover:scale-105 whitespace-nowrap min-w-fit ${getStatusBadgeClass(task.status)}`}>
                                {task.status === 'Not Started' ? t.notStarted :
                                 task.status === 'On Hold' ? t.onHold : 
                                 task.status === 'In Progress' ? t.inProgress : t.complete}
                              </span>
                            </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-col gap-3 min-w-[120px]">
                              <div className="flex items-center gap-3">
                                <Progress value={task.progressPercentage} className="h-2.5 flex-1 bg-slate-200 dark:bg-slate-700" />
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 min-w-[35px]">{task.progressPercentage}%</span>
                              </div>
                              {/* Rating moved below progress */}
                              {task.averageRating && task.averageRating > 0 ? (
                                <div className="flex items-center gap-2">
                                  <StarRating 
                        rating={task.averageRating} 
                        readonly 
                        size="sm" 
                        spacing="tight"
                      />
                                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    ({task.averageRating.toFixed(1)})
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-500 dark:text-slate-400">{t.noRating}</span>
                              )}
                            </div>
                            </TableCell>
                          
                          <TableCell className="hidden lg:table-cell py-4">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                💬 {task.comments ? task.comments.length : 0}
                              </span>
                            </div>
                          </TableCell>
                          
                          <TableCell className="text-right py-4">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600 shadow-sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-lg">
                                <DropdownMenuItem onClick={() => openTaskDetailsDialog(task)} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                                  <Eye className="mr-2 h-4 w-4" />
                                  {t.viewDetails}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditTaskDialog(task)} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                                  <Edit className="mr-2 h-4 w-4" />
                                    {t.editTask}
                                  </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openRateTaskDialog(task)} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                                    <Star className="mr-2 h-4 w-4" />
                                    {t.rateTask}
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
            </div>
            {/* Card layout for mobile - Enhanced */}
                <div className="block md:hidden space-y-4">
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                      <p className="mt-2 text-sm text-gray-500 ml-2">{t.loadingTasks}</p>
                    </div>
              ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-8">{t.noTasks}</div>
                  ) : (
                filteredTasks.map(task => (
                      <Card 
                        key={task.id} 
                    className={`p-4 sm:p-5 border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white dark:bg-slate-800 rounded-xl ${isMediaBuyerToDesignerTask(task) 
                          ? "bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-l-purple-500 dark:from-purple-900/20 dark:to-pink-900/20 dark:border-l-purple-400" 
                      : "border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex flex-col gap-2 flex-1 min-w-0">
                          <div className="font-bold text-base sm:text-lg break-words overflow-wrap-anywhere">{task.title}</div>
                          
                          {/* Task metadata badges */}
                          <div className="flex flex-wrap gap-2">
                              {isMediaBuyerToDesignerTask(task) && (
                              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl ring-2 ring-purple-500/20 transition-all duration-300 transform hover:scale-105 whitespace-nowrap">
                                <span className="text-xs font-bold uppercase tracking-wider">🎨 MB→D</span>
                              </span>
                            )}
                            
                            {task.priority && (
                              <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 transform hover:scale-105 whitespace-nowrap ${getPriorityColor(task.priority)}`}>
                                {getPriorityDisplay(task.priority)}
                              </span>
                            )}
                            
                            {task.projectType && task.assignedToPosition === 'Designer' && (
                              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl ring-2 ring-blue-500/20 transition-all duration-300 transform hover:scale-105 whitespace-nowrap">
                                <span className="text-sm">{getProjectTypeIcon(task.projectType)}</span>
                                <span className="text-xs font-bold uppercase tracking-wider">{getProjectTypeDisplay(task.projectType)}</span>
                                </span>
                              )}
                            </div>
                        </div>
                        <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 transform hover:scale-105 whitespace-nowrap ${getStatusBadgeClass(task.status)}`}>
                              {task.status === 'Not Started' ? t.notStarted : 
                               task.status === 'On Hold' ? t.onHold : 
                               task.status === 'In Progress' ? t.inProgress : t.complete}
                            </span>
                          </div>
                      <div className="text-sm text-muted-foreground break-words overflow-wrap-anywhere">{task.description}</div>
                      <div className="flex flex-col gap-2">
                            <span className="text-xs">
                              {t.assignedTo}: <span className="font-medium">{task.assignedToName}</span>
                            </span>
                            {isMediaBuyerToDesignerTask(task) && (
                              <span className="text-xs text-purple-600 dark:text-purple-400">
                                Assigned by: {task.createdByName}
                              </span>
                            )}
                        <div className="flex items-center gap-3">
                          <Progress value={task.progressPercentage} className="h-2.5 flex-1 bg-slate-200 dark:bg-slate-700" />
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 min-w-[35px]">{task.progressPercentage}%</span>
                        </div>
                        {/* Rating moved below progress for mobile */}
                        {task.averageRating && task.averageRating > 0 ? (
                            <div className="flex items-center gap-2">
                            <StarRating 
                              rating={task.averageRating} 
                              readonly 
                              size="sm" 
                              spacing="tight"
                            />
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                              ({task.averageRating.toFixed(1)})
                            </span>
                            </div>
                        ) : (
                          <span className="text-xs text-slate-500 dark:text-slate-400">{t.noRating}</span>
                        )}
                        <div className="flex justify-between text-xs text-gray-500 pt-1">
                          <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                          <span>Updated: {new Date(task.updatedAt).toLocaleDateString()}</span>
                          </div>
                        <div className="flex items-center gap-2 pt-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            💬 {task.comments ? task.comments.length : 0} {task.comments?.length === 1 ? 'comment' : 'comments'}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                          className="min-h-[44px] hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600 shadow-sm font-medium text-sm"
                          onClick={() => openTaskDetailsDialog(task)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          {t.viewDetails}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-[44px] hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600 shadow-sm font-medium text-sm"
                            onClick={() => openEditTaskDialog(task)}
                          >
                          <Edit className="mr-2 h-4 w-4" />
                            {t.editTask}
                          </Button>
                      </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
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
              <Label htmlFor="task-priority" className="text-right">
                Priority
              </Label>
              <Select 
                value={newTask.priority} 
                onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => 
                  setNewTask({...newTask, priority: value})
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Low Priority</SelectItem>
                  <SelectItem value="medium">🟡 Medium Priority</SelectItem>
                  <SelectItem value="high">🟠 High Priority</SelectItem>
                  <SelectItem value="urgent">🔴 Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Project Type - Only show for Designers */}
            {isSelectedEmployeeDesigner() && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="task-project-type" className="text-right">
                  Project Type
                </Label>
                <Select 
                  value={newTask.projectType} 
                  onValueChange={(value: 'social-media' | 'web-design' | 'branding' | 'print' | 'ui-ux' | 'other') => 
                    setNewTask({...newTask, projectType: value})
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Project Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="social-media">📱 Social Media</SelectItem>
                    <SelectItem value="web-design">🌐 Web Design</SelectItem>
                    <SelectItem value="branding">🎨 Branding</SelectItem>
                    <SelectItem value="print">📄 Print</SelectItem>
                    <SelectItem value="ui-ux">⚡ UI/UX</SelectItem>
                    <SelectItem value="other">📂 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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

      {/* Edit Task Dialog - Mobile Optimized */}
        <Dialog open={isEditTaskDialogOpen} onOpenChange={setIsEditTaskDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[90vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-3 sm:p-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader className="pb-3 sm:pb-4">
            <DialogTitle className="text-lg sm:text-xl break-words">{t.editTask}</DialogTitle>
            <DialogDescription className="text-sm sm:text-base break-words overflow-wrap-anywhere">
                {editingTask.title}
              </DialogDescription>
            </DialogHeader>
            
            <Tabs value={currentTaskTab} onValueChange={setCurrentTaskTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-10 sm:h-auto">
              <TabsTrigger value="details" className="text-sm sm:text-base">{t.details}</TabsTrigger>
              <TabsTrigger value="comments" className="text-sm sm:text-base">{t.comments}</TabsTrigger>
              </TabsList>
              
            <TabsContent value="details" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
              <div className="grid gap-3 sm:gap-4">
                  <div className="space-y-2">
                  <Label htmlFor="edit-task-title" className="text-sm sm:text-base font-medium">{t.title}</Label>
                    <Input
                      id="edit-task-title"
                      value={editingTask.title}
                      onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                    className="min-h-[44px] text-sm sm:text-base"
                    />
                  </div>
                  
                  <div className="space-y-2">
                  <Label htmlFor="edit-task-description" className="text-sm sm:text-base font-medium">{t.description}</Label>
                    <Textarea
                      id="edit-task-description"
                      value={editingTask.description}
                      onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                    rows={3}
                    className="min-h-[100px] text-sm sm:text-base resize-none"
                    />
                  </div>
                  
                  <div className="space-y-2">
                  <Label htmlFor="edit-task-assigned" className="text-sm sm:text-base font-medium">{t.assignedTo}</Label>
                    <Select 
                      value={editingTask.assignedTo} 
                      onValueChange={(value) => setEditingTask({...editingTask, assignedTo: value})}
                    >
                    <SelectTrigger className="min-h-[44px] text-sm sm:text-base">
                        <SelectValue placeholder={t.selectEmployee} />
                      </SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                        {employees.map(employee => (
                        <SelectItem key={employee.id} value={employee.id} className="text-sm sm:text-base">
                            {employee.name} ({employee.department})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                    <Label htmlFor="edit-task-status" className="text-sm sm:text-base font-medium">{t.status}</Label>
                      <Select 
                        value={editingTask.status} 
                        onValueChange={(value: 'Not Started' | 'On Hold' | 'In Progress' | 'Complete') => 
                          setEditingTask({...editingTask, status: value})
                        }
                      >
                      <SelectTrigger className="min-h-[44px] text-sm sm:text-base">
                          <SelectValue placeholder={t.selectStatus} />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="Not Started" className="text-sm sm:text-base">{t.notStarted}</SelectItem>
                        <SelectItem value="On Hold" className="text-sm sm:text-base">{t.onHold}</SelectItem>
                        <SelectItem value="In Progress" className="text-sm sm:text-base">{t.inProgress}</SelectItem>
                        <SelectItem value="Complete" className="text-sm sm:text-base">{t.complete}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                    <Label htmlFor="edit-task-priority" className="text-sm sm:text-base font-medium">Priority</Label>
                    <Select 
                      value={editingTask.priority} 
                      onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => 
                        setEditingTask({...editingTask, priority: value})
                      }
                    >
                      <SelectTrigger className="min-h-[44px] text-sm sm:text-base">
                        <SelectValue placeholder="Select Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low" className="text-sm sm:text-base">🟢 Low Priority</SelectItem>
                        <SelectItem value="medium" className="text-sm sm:text-base">🟡 Medium Priority</SelectItem>
                        <SelectItem value="high" className="text-sm sm:text-base">🟠 High Priority</SelectItem>
                        <SelectItem value="urgent" className="text-sm sm:text-base">🔴 Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Project Type Selection for Designer Tasks */}
                {isEditingTaskForDesigner() && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-task-project-type" className="text-sm sm:text-base font-medium">Project Type</Label>
                    <Select 
                      value={editingTask.projectType} 
                      onValueChange={(value: 'social-media' | 'web-design' | 'branding' | 'print' | 'ui-ux' | 'other') => 
                        setEditingTask({...editingTask, projectType: value})
                      }
                    >
                      <SelectTrigger className="min-h-[44px] text-sm sm:text-base">
                        <SelectValue placeholder="Select Project Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="social-media" className="text-sm sm:text-base">📱 Social Media</SelectItem>
                        <SelectItem value="web-design" className="text-sm sm:text-base">🌐 Web Design</SelectItem>
                        <SelectItem value="branding" className="text-sm sm:text-base">🎨 Branding</SelectItem>
                        <SelectItem value="print" className="text-sm sm:text-base">📄 Print</SelectItem>
                        <SelectItem value="ui-ux" className="text-sm sm:text-base">⚡ UI/UX</SelectItem>
                        <SelectItem value="other" className="text-sm sm:text-base">📂 Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="edit-task-progress" className="text-sm sm:text-base font-medium">{t.progress}</Label>
                  <div className="flex items-center gap-2 sm:gap-3">
                        <Input
                          id="edit-task-progress"
                          type="number"
                          min="0"
                          max="100"
                          value={editingTask.progressPercentage}
                          onChange={handleEditTaskProgressChange}
                      className="w-16 sm:w-20 min-h-[44px] text-sm sm:text-base text-center"
                        />
                    <span className="text-sm sm:text-base font-medium">%</span>
                    <Progress value={editingTask.progressPercentage} className="flex-1 h-2 sm:h-3" />
                    </div>
                  </div>
                </div>
              </TabsContent>
              
            <TabsContent value="comments" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
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
            
          <DialogFooter className={`pt-4 sm:pt-6 gap-2 sm:gap-3 ${language === 'ar' ? 'flex-row-reverse' : 'flex-col sm:flex-row'}`}>
            <Button 
              variant="outline" 
              onClick={() => setIsEditTaskDialogOpen(false)}
              className="min-h-[44px] text-sm sm:text-base w-full sm:w-auto"
            >
              {t.cancel}
            </Button>
            <Button 
              onClick={handleUpdateTask} 
              disabled={updatingTaskProgress}
              className="min-h-[44px] text-sm sm:text-base w-full sm:w-auto"
            >
                {updatingTaskProgress ? (
                <div className="flex items-center justify-center">
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span className="text-sm sm:text-base">{t.updateTask}</span>
                  </div>
              ) : (
                <span className="text-sm sm:text-base">{t.updateTask}</span>
              )}
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

      {/* Task Details Dialog */}
      <Dialog open={isTaskDetailsDialogOpen} onOpenChange={setIsTaskDetailsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          {selectedTaskForDetails && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Task Details - {selectedTaskForDetails.title}</DialogTitle>
                <DialogDescription>
                  Complete task information and admin controls
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Task Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Title</Label>
                      <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                        {selectedTaskForDetails.title}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</Label>
                      <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border max-h-32 overflow-y-auto">
                        {selectedTaskForDetails.description}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Assigned To</Label>
                      <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                        {selectedTaskForDetails.assignedToName} ({selectedTaskForDetails.assignedToPosition})
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</Label>
                      <div className="mt-1">
                        <span className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${getStatusBadgeClass(selectedTaskForDetails.status)}`}>
                          {selectedTaskForDetails.status}
                        </span>
                      </div>
                    </div>
                    
                    {selectedTaskForDetails.priority && (
                      <div>
                        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Priority</Label>
                        <div className="mt-1">
                          <span className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${getPriorityColor(selectedTaskForDetails.priority)}`}>
                            {getPriorityDisplay(selectedTaskForDetails.priority)}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {selectedTaskForDetails.projectType && selectedTaskForDetails.assignedToPosition === 'Designer' && (
                      <div>
                        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Project Type</Label>
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg">
                            <span className="text-sm">{getProjectTypeIcon(selectedTaskForDetails.projectType)}</span>
                            <span className="text-xs font-bold uppercase tracking-wider">
                              {getProjectTypeDisplay(selectedTaskForDetails.projectType)}
                            </span>
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Progress</Label>
                      <div className="mt-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <Progress value={selectedTaskForDetails.progressPercentage} className="h-3 flex-1" />
                          <span className="text-sm font-semibold">{selectedTaskForDetails.progressPercentage}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Metadata */}
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 block">Task Metadata</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Created:</span>
                      <div className="font-medium">{new Date(selectedTaskForDetails.createdAt).toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Updated:</span>
                      <div className="font-medium">{new Date(selectedTaskForDetails.updatedAt).toLocaleString()}</div>
                    </div>
                    {selectedTaskForDetails.averageRating && selectedTaskForDetails.averageRating > 0 && (
                      <div>
                        <span className="text-slate-500">Rating:</span>
                        <div className="flex items-center gap-2 mt-1">
                          <StarRating 
                            rating={selectedTaskForDetails.averageRating} 
                            readonly 
                            size="sm" 
                            spacing="tight"
                          />
                          <span className="text-xs">({selectedTaskForDetails.averageRating.toFixed(1)})</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Media Buyer → Designer Info */}
                {isMediaBuyerToDesignerTask(selectedTaskForDetails) && (
                  <div className="border-t pt-4">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 block">Assignment Information</Label>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg">
                          <span className="text-xs font-bold uppercase tracking-wider">🎨 MB→D</span>
                        </span>
                      </div>
                      <div className="text-sm space-y-1">
                        <div><span className="text-purple-700 dark:text-purple-300 font-medium">Assigned by:</span> {selectedTaskForDetails.createdByName}</div>
                        <div><span className="text-purple-700 dark:text-purple-300 font-medium">Position:</span> {selectedTaskForDetails.createdByPosition}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Comments Section */}
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 block">Task Comments</Label>
                  {user && (
                    <TaskComments
                      taskId={selectedTaskForDetails.id}
                      user={user}
                      comments={selectedTaskForDetails.comments || []}
                      onCommentAdded={(newComments) => {
                        setTasks(tasks.map(task => 
                          task.id === selectedTaskForDetails.id 
                            ? {...task, comments: newComments} 
                            : task
                        ));
                        setSelectedTaskForDetails({...selectedTaskForDetails, comments: newComments});
                      }}
                      language={language}
                    />
                  )}
                </div>
              </div>
              
              <DialogFooter className={`${language === 'ar' ? 'flex-row-reverse' : ''} gap-2`}>
                <Button variant="outline" onClick={() => setIsTaskDetailsDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setIsTaskDetailsDialogOpen(false);
                  openEditTaskDialog(selectedTaskForDetails);
                }}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Task
                </Button>
                <Button variant="outline" onClick={() => {
                  setIsTaskDetailsDialogOpen(false);
                  openRateTaskDialog(selectedTaskForDetails);
                }}>
                  <Star className="mr-2 h-4 w-4" />
                  Rate Task
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

        {/* Rate Task Modal */}
        <RateTaskModal
          isOpen={isRateTaskOpen}
          onClose={() => setIsRateTaskOpen(false)}
          task={taskToRate}
          onRatingSubmitted={handleTaskRatingSubmitted}
        />
    </div>
  );
};

export default AdminTasksPage;
