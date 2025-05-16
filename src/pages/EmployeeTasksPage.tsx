
import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import { toast } from "sonner";
import { fetchEmployeeTasks, updateTaskProgress } from '@/lib/tasksApi';
import { Task } from '@/types';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogClose
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';

const EmployeeTasksPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [language, setLanguage] = useState('en');

  // Translation object for multilingual support
  const translations = {
    en: {
      myTasks: "My Tasks",
      assignedTasks: "Assigned Tasks",
      viewAndManageYourTasks: "View and manage your assigned tasks",
      title: "Title",
      description: "Description",
      status: "Status",
      progress: "Progress",
      actions: "Actions",
      onHold: "On Hold",
      inProgress: "In Progress",
      complete: "Complete",
      updateProgress: "Update Progress",
      cancel: "Cancel",
      save: "Save Changes",
      progressUpdated: "Progress updated successfully!",
      loadingTasks: "Loading your tasks...",
      noTasks: "No tasks assigned to you",
      updateTaskProgress: "Update Task Progress",
      setProgressPercentage: "Set the progress percentage for this task",
      viewDetails: "View Details",
      taskDetails: "Task Details",
      updatingProgress: "Updating progress...",
      task: "Task"
    },
    ar: {
      myTasks: "مهامي",
      assignedTasks: "المهام المسندة",
      viewAndManageYourTasks: "عرض وإدارة المهام المسندة إليك",
      title: "العنوان",
      description: "الوصف",
      status: "الحالة",
      progress: "التقدم",
      actions: "الإجراءات",
      onHold: "في الانتظار",
      inProgress: "قيد التنفيذ",
      complete: "مكتمل",
      updateProgress: "تحديث التقدم",
      cancel: "إلغاء",
      save: "حفظ التغييرات",
      progressUpdated: "تم تحديث التقدم بنجاح!",
      loadingTasks: "جاري تحميل المهام الخاصة بك...",
      noTasks: "لا توجد مهام مسندة إليك",
      updateTaskProgress: "تحديث تقدم المهمة",
      setProgressPercentage: "حدد النسبة المئوية للتقدم في هذه المهمة",
      viewDetails: "عرض التفاصيل",
      taskDetails: "تفاصيل المهمة",
      updatingProgress: "جاري تحديث التقدم...",
      task: "مهمة"
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
      loadTasks();
    }
  }, [user]);

  const loadTasks = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const data = await fetchEmployeeTasks(user.id);
      setTasks(data);
    } catch (error) {
      console.error("Error loading tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  };

  const openProgressDialog = (task: Task) => {
    setSelectedTask(task);
    setProgressValue(task.progressPercentage);
    setIsProgressDialogOpen(true);
  };

  const openDetailsDialog = (task: Task) => {
    setSelectedTask(task);
  };

  const handleUpdateProgress = async () => {
    if (!user || !selectedTask) return;
    
    setIsLoading(true);
    try {
      const updatedTask = await updateTaskProgress(
        selectedTask.id,
        user.id,
        progressValue
      );
      
      // Update the task in the list
      setTasks(tasks.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      ));
      
      setIsProgressDialogOpen(false);
      toast.success(t.progressUpdated);
    } catch (error) {
      console.error("Error updating task progress:", error);
      toast.error("Failed to update progress");
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

  return (
    <MainLayout>
      <div className="flex flex-col" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex justify-between items-center mb-6 sticky top-0 z-10 bg-background pt-2 pb-4">
          <h1 className="text-2xl font-bold">{t.myTasks}</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>{t.assignedTasks}</CardTitle>
            <CardDescription>{t.viewAndManageYourTasks}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.title}</TableHead>
                    <TableHead>{t.status}</TableHead>
                    <TableHead>{t.progress}</TableHead>
                    <TableHead className="text-right">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                        </div>
                        <p className="mt-2 text-sm text-gray-500">{t.loadingTasks}</p>
                      </TableCell>
                    </TableRow>
                  ) : tasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">{t.noTasks}</TableCell>
                    </TableRow>
                  ) : (
                    tasks.map(task => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.title}</TableCell>
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
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline" 
                              size="sm"
                              onClick={() => openDetailsDialog(task)}
                            >
                              {t.viewDetails}
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openProgressDialog(task)}
                              disabled={task.status === 'Complete'}
                            >
                              {t.updateProgress}
                            </Button>
                          </div>
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

      {/* Update Progress Dialog */}
      <Dialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t.updateTaskProgress}</DialogTitle>
            <DialogDescription>
              {t.setProgressPercentage}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="space-y-6">
              {selectedTask && (
                <>
                  <div>
                    <h4 className="text-sm font-medium mb-1">{t.task}: {selectedTask.title}</h4>
                    <div className="text-sm text-gray-500 mb-4">{selectedTask.description}</div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex flex-col space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{t.progress}</span>
                        <span className="text-sm font-medium">{progressValue}%</span>
                      </div>
                      <Slider
                        value={[progressValue]}
                        min={0}
                        max={100}
                        step={5}
                        onValueChange={(value) => setProgressValue(value[0])}
                        className="w-full"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <DialogFooter className={language === 'ar' ? 'flex-row-reverse' : ''}>
            <Button variant="outline" onClick={() => setIsProgressDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleUpdateProgress} disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  {t.updatingProgress}
                </div>
              ) : t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Details Dialog */}
      {selectedTask && (
        <Dialog open={!!selectedTask && !isProgressDialogOpen} onOpenChange={(open) => !open && setSelectedTask(null)}>
          <DialogContent className="sm:max-w-[525px]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <DialogHeader>
              <DialogTitle>{t.taskDetails}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">{selectedTask.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{selectedTask.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div>
                    <p className="text-sm font-medium">{t.status}</p>
                    <div className="mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(selectedTask.status)}`}>
                        {selectedTask.status === 'On Hold' ? t.onHold : 
                         selectedTask.status === 'In Progress' ? t.inProgress : t.complete}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium">{t.progress}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={selectedTask.progressPercentage} className="h-2" />
                      <span className="text-xs text-gray-500">{selectedTask.progressPercentage}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className={language === 'ar' ? 'flex-row-reverse' : ''}>
              <DialogClose asChild>
                <Button variant="outline">
                  {t.cancel}
                </Button>
              </DialogClose>
              {selectedTask.status !== 'Complete' && (
                <Button onClick={() => {
                  setIsProgressDialogOpen(true);
                  setProgressValue(selectedTask.progressPercentage);
                }}>
                  {t.updateProgress}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </MainLayout>
  );
};

export default EmployeeTasksPage;
