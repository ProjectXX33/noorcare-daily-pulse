import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  fetchUserTasks, 
  updateTask, 
  subscribeToEmployeeTasks,
  addTaskComment 
} from '@/lib/tasksApi';
import { Task } from '@/types';
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import TaskFileUpload from '@/components/TaskFileUpload';
import TaskAttachmentsList from '@/components/TaskAttachmentsList';
import TaskComments from '@/components/TaskComments';

const EmployeeTasksPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState('en');
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskProgress, setTaskProgress] = useState(0);
  const [taskStatus, setTaskStatus] = useState<'On Hold' | 'In Progress' | 'Complete'>('On Hold');
  const [updatingTask, setUpdatingTask] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [attachmentsRefreshKey, setAttachmentsRefreshKey] = useState(0);
  const [currentTab, setCurrentTab] = useState("details");

  // Translation object for multilingual support
  const translations = {
    en: {
      myTasks: "My Tasks",
      title: "Title",
      status: "Status",
      progress: "Progress",
      actions: "Actions",
      viewDetails: "View Details",
      onHold: "On Hold",
      inProgress: "In Progress",
      complete: "Complete",
      noTasks: "You don't have any tasks assigned to you",
      loadingTasks: "Loading tasks...",
      taskDetails: "Task Details",
      updateProgress: "Update Progress",
      description: "Description",
      assignedBy: "Assigned By",
      save: "Save",
      cancel: "Cancel",
      taskUpdated: "Task updated successfully",
      updateError: "Error updating task",
      comments: "Comments",
      addComment: "Add Comment",
      postComment: "Post Comment",
      commentPlaceholder: "Write a comment...",
      commentPosted: "Comment posted successfully",
      commentError: "Error posting comment",
      update: "Update",
      updateStatus: "Update Status",
      selectStatus: "Select Status",
      attachments: "Attachments",
      details: "Details"
    },
    ar: {
      myTasks: "مهامي",
      title: "العنوان",
      status: "الحالة",
      progress: "التقدم",
      actions: "الإجراءات",
      viewDetails: "عرض التفاصيل",
      onHold: "في الانتظار",
      inProgress: "قيد التنفيذ",
      complete: "مكتمل",
      noTasks: "ليس لديك أي مهام مسندة إليك",
      loadingTasks: "جاري تحميل المهام...",
      taskDetails: "تفاصيل المهمة",
      updateProgress: "تحديث التقدم",
      description: "الوصف",
      assignedBy: "تم تعيينه بواسطة",
      save: "حفظ",
      cancel: "إلغاء",
      taskUpdated: "تم تحديث المهمة بنجاح",
      updateError: "خطأ في تحديث المهمة",
      comments: "التعليقات",
      addComment: "إضافة تعليق",
      postComment: "نشر تعليق",
      commentPlaceholder: "اكتب تعليقًا...",
      commentPosted: "تم نشر التعليق بنجاح",
      commentError: "خطأ في نشر التعليق",
      update: "تحديث",
      updateStatus: "تحديث الحالة",
      selectStatus: "اختر الحالة",
      attachments: "المرفقات",
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
    if (user) {
      const loadTasks = async () => {
        try {
          setIsLoading(true);
          const data = await fetchUserTasks(user.id);
          setTasks(data);
        } catch (error) {
          console.error("Error loading tasks:", error);
        } finally {
          setIsLoading(false);
        }
      };

      loadTasks();

      // Subscribe to task changes
      const unsubscribe = subscribeToEmployeeTasks(user.id, (updatedTasks) => {
        setTasks(updatedTasks);
      });
      
      return () => {
        unsubscribe();
      };
    }
  }, [user]);

  const handleOpenTaskDetails = (task: Task) => {
    setSelectedTask(task);
    setTaskProgress(task.progressPercentage || 0);
    setTaskStatus(task.status);
    setTaskDetailsOpen(true);
  };

  const handleUpdateTask = async () => {
    if (!user || !selectedTask) return;

    setUpdatingTask(true);
    try {
      // If progress is 100%, automatically set status to Complete
      const updatedStatus = taskProgress === 100 ? 'Complete' : taskStatus;

      await updateTask(
        selectedTask.id,
        {
          progressPercentage: taskProgress,
          status: updatedStatus
        },
        user.id
      );

      // Update local state to reflect changes
      setTasks(tasks.map(task => {
        if (task.id === selectedTask.id) {
          return { 
            ...task, 
            progressPercentage: taskProgress,
            status: updatedStatus as 'On Hold' | 'In Progress' | 'Complete'
          };
        }
        return task;
      }));

      toast.success(t.taskUpdated);
      setTaskDetailsOpen(false);
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error(t.updateError);
    } finally {
      setUpdatingTask(false);
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const progress = parseInt(e.target.value);
    setTaskProgress(progress);
    
    // If progress is 100%, automatically update status to Complete
    if (progress === 100) {
      setTaskStatus('Complete');
    }
  };

  const handleAddComment = async () => {
    if (!user || !selectedTask || !newComment.trim()) return;

    try {
      const result = await addTaskComment(
        selectedTask.id,
        newComment,
        user.id,
        user.name
      );

      if (result) {
        // Update local task comments
        const updatedComments = [
          ...(selectedTask.comments || []),
          {
            id: Date.now().toString(), // Temporary ID until we refresh
            userId: user.id,
            userName: user.name,
            text: newComment,
            createdAt: new Date().toISOString()
          }
        ];

        // Update the tasks array with the new comment
        setTasks(tasks.map(task => {
          if (task.id === selectedTask.id) {
            return { ...task, comments: updatedComments };
          }
          return task;
        }));

        // Also update the selected task
        setSelectedTask({
          ...selectedTask,
          comments: updatedComments
        });

        setNewComment('');
        toast.success(t.commentPosted);
      }
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error(t.commentError);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'On Hold':
        return 'bg-yellow-100 text-yellow-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Complete':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTranslatedStatus = (status: string) => {
    switch (status) {
      case 'On Hold':
        return t.onHold;
      case 'In Progress':
        return t.inProgress;
      case 'Complete':
        return t.complete;
      default:
        return status;
    }
  };

  if (!user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{t.myTasks}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t.myTasks}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">{t.loadingTasks}</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500">{t.noTasks}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map(task => (
                  <div key={task.id} className="border rounded-md p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{task.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(task.status)}`}>
                        {getTranslatedStatus(task.status)}
                      </span>
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex items-center text-xs text-gray-500 mb-1">
                        <span>{t.progress}: {task.progressPercentage}%</span>
                      </div>
                      <Progress value={task.progressPercentage} className="h-2" />
                    </div>
                    
                    <div className="mt-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleOpenTaskDetails(task)}
                      >
                        {t.viewDetails}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={taskDetailsOpen} onOpenChange={setTaskDetailsOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <DialogHeader>
              <DialogTitle>
                {selectedTask?.title}
              </DialogTitle>
              <DialogDescription>
                {t.taskDetails}
              </DialogDescription>
            </DialogHeader>
            
            {selectedTask && (
              <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">{t.details}</TabsTrigger>
                  <TabsTrigger value="comments">{t.comments}</TabsTrigger>
                  <TabsTrigger value="attachments">{t.attachments}</TabsTrigger>
                </TabsList>
              
                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <div>
                      <Label>{t.description}</Label>
                      <div className="mt-1 p-2 border rounded-md bg-gray-50">
                        {selectedTask.description || '-'}
                      </div>
                    </div>
                  
                    <div>
                      <Label>{t.status}</Label>
                      <Select
                        value={taskStatus}
                        onValueChange={setTaskStatus}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder={t.selectStatus} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="On Hold">{t.onHold}</SelectItem>
                          <SelectItem value="In Progress">{t.inProgress}</SelectItem>
                          <SelectItem value="Complete">{t.complete}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  
                    <div>
                      <Label>{t.progress}</Label>
                      <div className="flex items-center gap-4 mt-1">
                        <Input
                          type="range"
                          min="0"
                          max="100"
                          value={taskProgress}
                          onChange={handleProgressChange}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={taskProgress}
                          onChange={handleProgressChange}
                          className="w-20"
                        />
                        <span>%</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="comments" className="space-y-4 mt-4">
                  <TaskComments
                    taskId={selectedTask.id}
                    user={user}
                    comments={selectedTask.comments || []}
                    onCommentAdded={(newComments) => {
                      // Update the selected task comments
                      setSelectedTask({...selectedTask, comments: newComments});
                      
                      // Update the task in the tasks array
                      setTasks(tasks.map(task => 
                        task.id === selectedTask.id ? {...task, comments: newComments} : task
                      ));
                    }}
                    language={language}
                  />
                </TabsContent>
                
                <TabsContent value="attachments" className="space-y-4 mt-4">
                  {user && (
                    <TaskFileUpload
                      taskId={selectedTask.id}
                      userId={user.id}
                      onUploadComplete={() => setAttachmentsRefreshKey(prev => prev + 1)}
                      language={language}
                    />
                  )}
                  
                  <div className="mt-4">
                    <TaskAttachmentsList
                      taskId={selectedTask.id}
                      refresh={attachmentsRefreshKey}
                      language={language}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            )}
            
            <DialogFooter className={language === 'ar' ? 'flex-row-reverse' : ''}>
              <Button variant="outline" onClick={() => setTaskDetailsOpen(false)}>{t.cancel}</Button>
              <Button onClick={handleUpdateTask} disabled={updatingTask}>
                {updatingTask ? (
                  <div className="flex items-center">
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    {t.update}
                  </div>
                ) : t.update}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default EmployeeTasksPage;
