import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckSquare, Plus, Calendar, Brush, Clock, User, Eye, Star, MessageSquare, Trash2, Edit, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

// API functions
import { 
  fetchAllTasks, 
  createTask,
  addTaskComment, 
  updateTaskProgress,
  updateTask
} from '@/lib/tasksApi';
import { fetchEmployees } from '@/lib/employeesApi';
import { User as UserType, Task } from '@/types';
import { playNotificationSound } from '@/lib/notifications';
import { uploadFile, getFileUrl, isImageFile } from '@/lib/fileUpload';
import TaskComments from '@/components/TaskComments';
import CreateTaskDialog from '@/components/CreateTaskDialog';
import TaskDetailDialog from '@/components/TaskDetailDialog';
import EditTaskDialog from '@/components/EditTaskDialog';

interface TaskFormData {
  title: string;
  description: string;
  assignedTo: string;
  status: 'Not Started' | 'On Hold' | 'In Progress' | 'Complete' | 'Unfinished';
  progressPercentage: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  projectType: 'social-media' | 'web-design' | 'branding' | 'print' | 'ui-ux' | 'other';
  tacticalPlan: string;
  timeEstimate: string;
  aim: string;
  idea: string;
  copy: string;
  visualFeeding: string;
  attachmentFile: string;
  notes: string;
}

const ContentCreatorTasksPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [designers, setDesigners] = useState<UserType[]>([]);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isTaskDetailDialogOpen, setIsTaskDetailDialogOpen] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskFormData>({
    title: '',
    description: '',
    assignedTo: '',
    status: 'Not Started',
    progressPercentage: 0,
    priority: 'medium',
    projectType: 'social-media',
    tacticalPlan: '',
    timeEstimate: '',
    aim: '',
    idea: '',
    copy: '',
    visualFeeding: '',
    attachmentFile: '',
    notes: ''
  });
  const [editingTaskId, setEditingTaskId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingVisualFeeding, setIsUploadingVisualFeeding] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isUploadingEditVisualFeeding, setIsUploadingEditVisualFeeding] = useState(false);
  const [isUploadingEditAttachment, setIsUploadingEditAttachment] = useState(false);
  const [taskForm, setTaskForm] = useState<TaskFormData>({
    title: '',
    description: '',
    assignedTo: '',
    status: 'Not Started',
    progressPercentage: 0,
    priority: 'medium',
    projectType: 'social-media',
    tacticalPlan: '',
    timeEstimate: '',
    aim: '',
    idea: '',
    copy: '',
    visualFeeding: '',
    attachmentFile: '',
    notes: ''
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [tasksData, employeesData] = await Promise.all([
        fetchAllTasks(),
        fetchEmployees()
      ]);

      setTasks(tasksData);
      setDesigners(employeesData.filter(emp => emp.position === 'Designer'));
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate Creative Brief fields for Designer tasks
    const missingFields = [];
    if (!taskForm.tacticalPlan.trim()) missingFields.push('Tactical Plan');
    if (!taskForm.aim.trim()) missingFields.push('Aim/Goal');
    if (!taskForm.idea.trim()) missingFields.push('Creative Idea');
    if (!taskForm.copy.trim()) missingFields.push('Copy Text');
    
    if (missingFields.length > 0) {
      toast.error(`Creative Brief required for Designer tasks. Missing: ${missingFields.join(', ')}`);
      return;
    }

    setIsLoading(true);
    try {
      await createTask({
        title: taskForm.title,
        description: taskForm.description,
        assignedTo: taskForm.assignedTo,
        status: taskForm.status,
        progressPercentage: taskForm.progressPercentage,
        priority: taskForm.priority,
        projectType: taskForm.projectType,
        createdBy: user.id,
        // Include Creative Brief fields
        tacticalPlan: taskForm.tacticalPlan,
        timeEstimate: taskForm.timeEstimate,
        aim: taskForm.aim,
        idea: taskForm.idea,
        copy: taskForm.copy,
        visualFeeding: taskForm.visualFeeding,
        attachmentFile: taskForm.attachmentFile,
        notes: taskForm.notes
      });

      toast.success('Task assigned to designer successfully');
      setIsTaskDialogOpen(false);
      resetTaskForm();
      loadInitialData();
      playNotificationSound();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Error assigning task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTaskComment = (taskId: string, comments: any[]) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId 
          ? { ...task, comments } 
          : task
      )
    );
  };

  const resetTaskForm = () => {
    setTaskForm({
      title: '',
      description: '',
      assignedTo: '',
      status: 'Not Started',
      progressPercentage: 0,
      priority: 'medium',
      projectType: 'social-media',
      tacticalPlan: '',
      timeEstimate: '',
      aim: '',
      idea: '',
      copy: '',
      visualFeeding: '',
      attachmentFile: '',
      notes: ''
    });
  };

  // Filter tasks created by the current Content Creator
  const myCreatedTasks = useMemo(() => {
    return tasks.filter(task => task.createdBy === user?.id);
  }, [tasks, user?.id]);

  // Filter tasks by status
  const notStartedTasks = myCreatedTasks.filter(task => task.status === 'Not Started');
  const inProgressTasks = myCreatedTasks.filter(task => task.status === 'In Progress');
  const completedTasks = myCreatedTasks.filter(task => task.status === 'Complete');
  const onHoldTasks = myCreatedTasks.filter(task => task.status === 'On Hold');
  const unfinishedTasks = myCreatedTasks.filter(task => task.status === 'Unfinished');

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Not Started':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200';
      case 'Complete':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200';
      case 'On Hold':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200';
      case 'Unfinished':
        return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200';
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const handleVisualFeedingUpload = async (file: File) => {
    if (!isImageFile(file)) {
      toast.error('Please upload an image file');
      return;
    }

    setIsUploadingVisualFeeding(true);
    try {
      const result = await uploadFile(file, 'visual-feeding');
      if (result.success && result.publicUrl) {
        setTaskForm(prev => ({ ...prev, visualFeeding: result.publicUrl }));
        toast.success('Visual feeding uploaded successfully');
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading visual feeding:', error);
      toast.error('Failed to upload visual feeding');
    } finally {
      setIsUploadingVisualFeeding(false);
    }
  };

  const handleAttachmentUpload = async (file: File) => {
    setIsUploadingAttachment(true);
    try {
      const result = await uploadFile(file, 'attachments');
      if (result.success && result.publicUrl) {
        setTaskForm(prev => ({ ...prev, attachmentFile: result.publicUrl }));
        toast.success('Attachment uploaded successfully');
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading attachment:', error);
      toast.error('Failed to upload attachment');
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleEditVisualFeedingUpload = async (file: File) => {
    if (!isImageFile(file)) {
      toast.error('Please upload an image file');
      return;
    }

    setIsUploadingEditVisualFeeding(true);
    try {
      const result = await uploadFile(file, 'visual-feeding');
      if (result.success && result.publicUrl) {
        setEditingTask(prev => ({ ...prev, visualFeeding: result.publicUrl }));
        toast.success('Visual feeding uploaded successfully');
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading visual feeding:', error);
      toast.error('Failed to upload visual feeding');
    } finally {
      setIsUploadingEditVisualFeeding(false);
    }
  };

  const handleEditAttachmentUpload = async (file: File) => {
    setIsUploadingEditAttachment(true);
    try {
      const result = await uploadFile(file, 'attachments');
      if (result.success && result.publicUrl) {
        setEditingTask(prev => ({ ...prev, attachmentFile: result.publicUrl }));
        toast.success('Attachment uploaded successfully');
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading attachment:', error);
      toast.error('Failed to upload attachment');
    } finally {
      setIsUploadingEditAttachment(false);
    }
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTaskId || !user?.id) return;

    setIsLoading(true);
    try {
      await updateTask(editingTaskId, {
        title: editingTask.title,
        description: editingTask.description,
        status: editingTask.status,
        progressPercentage: editingTask.progressPercentage,
        priority: editingTask.priority,
        projectType: editingTask.projectType,
        tacticalPlan: editingTask.tacticalPlan,
        timeEstimate: editingTask.timeEstimate,
        aim: editingTask.aim,
        idea: editingTask.idea,
        copy: editingTask.copy,
        visualFeeding: editingTask.visualFeeding,
        attachmentFile: editingTask.attachmentFile,
        notes: editingTask.notes
      }, user.id);

      toast.success('Task updated successfully');
      setIsEditTaskDialogOpen(false);
      loadInitialData();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Error updating task');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditTaskDialog = (task: Task) => {
    setEditingTask({
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo,
      status: task.status,
      progressPercentage: task.progressPercentage,
      priority: task.priority || 'medium',
      projectType: task.projectType || 'social-media',
      tacticalPlan: task.tacticalPlan || '',
      timeEstimate: task.timeEstimate || '',
      aim: task.aim || '',
      idea: task.idea || '',
      copy: task.copy || '',
      visualFeeding: task.visualFeeding || '',
      attachmentFile: task.attachmentFile || '',
      notes: task.notes || ''
    });
    setEditingTaskId(task.id);
    setIsEditTaskDialogOpen(true);
  };

  const openTaskDetailDialog = (task: Task) => {
    setSelectedTaskForDetail(task);
    setIsTaskDetailDialogOpen(true);
  };

  const handleProgressUpdate = async (taskId: string, newProgress: number) => {
    if (!user?.id) return;
    
    try {
      await updateTaskProgress(taskId, newProgress, user.id);
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, progressPercentage: newProgress }
            : task
        )
      );
      toast.success('Progress updated successfully');
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Failed to update progress');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 space-y-6 sm:space-y-8 md:space-y-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">Content Creator Dashboard</h1>
            <p className="text-muted-foreground mt-2">Assign and track tasks for Designers</p>
          </div>
          
          <Button 
            onClick={() => setIsTaskDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Assign New Task
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {myCreatedTasks.length}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Total Tasks</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400 rounded-lg">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {notStartedTasks.length}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Not Started</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Brush className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {inProgressTasks.length}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">In Progress</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {completedTasks.length}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {onHoldTasks.length + unfinishedTasks.length}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">On Hold/Unfinished</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">All ({myCreatedTasks.length})</TabsTrigger>
            <TabsTrigger value="not-started">Not Started ({notStartedTasks.length})</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress ({inProgressTasks.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
            <TabsTrigger value="on-hold">On Hold ({onHoldTasks.length})</TabsTrigger>
            <TabsTrigger value="unfinished">Unfinished ({unfinishedTasks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="grid gap-4">
              {myCreatedTasks.map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onView={openTaskDetailDialog}
                  onEdit={openEditTaskDialog}
                  onProgressUpdate={handleProgressUpdate}
                  getStatusBadgeClass={getStatusBadgeClass}
                  getPriorityBadgeClass={getPriorityBadgeClass}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="not-started" className="space-y-4">
            <div className="grid gap-4">
              {notStartedTasks.map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onView={openTaskDetailDialog}
                  onEdit={openEditTaskDialog}
                  onProgressUpdate={handleProgressUpdate}
                  getStatusBadgeClass={getStatusBadgeClass}
                  getPriorityBadgeClass={getPriorityBadgeClass}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="in-progress" className="space-y-4">
            <div className="grid gap-4">
              {inProgressTasks.map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onView={openTaskDetailDialog}
                  onEdit={openEditTaskDialog}
                  onProgressUpdate={handleProgressUpdate}
                  getStatusBadgeClass={getStatusBadgeClass}
                  getPriorityBadgeClass={getPriorityBadgeClass}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <div className="grid gap-4">
              {completedTasks.map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onView={openTaskDetailDialog}
                  onEdit={openEditTaskDialog}
                  onProgressUpdate={handleProgressUpdate}
                  getStatusBadgeClass={getStatusBadgeClass}
                  getPriorityBadgeClass={getPriorityBadgeClass}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="on-hold" className="space-y-4">
            <div className="grid gap-4">
              {onHoldTasks.map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onView={openTaskDetailDialog}
                  onEdit={openEditTaskDialog}
                  onProgressUpdate={handleProgressUpdate}
                  getStatusBadgeClass={getStatusBadgeClass}
                  getPriorityBadgeClass={getPriorityBadgeClass}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="unfinished" className="space-y-4">
            <div className="grid gap-4">
              {unfinishedTasks.map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onView={openTaskDetailDialog}
                  onEdit={openEditTaskDialog}
                  onProgressUpdate={handleProgressUpdate}
                  getStatusBadgeClass={getStatusBadgeClass}
                  getPriorityBadgeClass={getPriorityBadgeClass}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Task Creation Dialog */}
        <CreateTaskDialog 
          isOpen={isTaskDialogOpen}
          onClose={() => setIsTaskDialogOpen(false)}
          onSubmit={handleTaskSubmit}
          taskForm={taskForm}
          setTaskForm={setTaskForm}
          designers={designers}
          isLoading={isLoading}
          onVisualFeedingUpload={handleVisualFeedingUpload}
          onAttachmentUpload={handleAttachmentUpload}
          isUploadingVisualFeeding={isUploadingVisualFeeding}
          isUploadingAttachment={isUploadingAttachment}
        />

        {/* Task Detail Dialog */}
        <TaskDetailDialog 
          isOpen={isTaskDetailDialogOpen}
          onClose={() => setIsTaskDetailDialogOpen(false)}
          task={selectedTaskForDetail}
          onAddComment={(comments) => {
            if (selectedTaskForDetail) {
              handleAddTaskComment(selectedTaskForDetail.id, comments);
            }
          }}
          onImageClick={(url) => {
            setSelectedImage(url);
            setIsImageModalOpen(true);
          }}
        />

        {/* Edit Task Dialog */}
        <EditTaskDialog 
          isOpen={isEditTaskDialogOpen}
          onClose={() => setIsEditTaskDialogOpen(false)}
          onSubmit={handleEditTask}
          editingTask={editingTask}
          setEditingTask={setEditingTask}
          designers={designers}
          isLoading={isLoading}
          onVisualFeedingUpload={handleEditVisualFeedingUpload}
          onAttachmentUpload={handleEditAttachmentUpload}
          isUploadingVisualFeeding={isUploadingEditVisualFeeding}
          isUploadingAttachment={isUploadingEditAttachment}
        />

        {/* Image Modal */}
        <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Visual Feeding</DialogTitle>
              <DialogDescription>
                View the full-size visual reference image for this task.
              </DialogDescription>
            </DialogHeader>
            {selectedImage && (
              <div className="flex justify-center">
                <img 
                  src={selectedImage} 
                  alt="Visual Feeding" 
                  className="max-w-full max-h-96 object-contain rounded-lg"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

// Task Card Component
const TaskCard = ({ 
  task, 
  onView, 
  onEdit, 
  onProgressUpdate,
  getStatusBadgeClass,
  getPriorityBadgeClass 
}: {
  task: Task;
  onView: (task: Task) => void;
  onEdit: (task: Task) => void;
  onProgressUpdate: (taskId: string, progress: number) => void;
  getStatusBadgeClass: (status: string) => string;
  getPriorityBadgeClass: (priority: string) => string;
}) => {
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);

  const handleProgressChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseInt(e.target.value);
    setIsUpdatingProgress(true);
    await onProgressUpdate(task.id, newProgress);
    setIsUpdatingProgress(false);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg truncate">{task.title}</h3>
              <Badge className={getStatusBadgeClass(task.status)}>
                {task.status}
              </Badge>
              {task.priority && (
                <Badge className={getPriorityBadgeClass(task.priority)}>
                  {task.priority}
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {task.description}
            </p>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>Assigned to: {task.assignedToName || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
              </div>
              {task.visualFeeding && (
                <div className="flex items-center gap-1">
                  <ImageIcon className="h-4 w-4 text-blue-500" />
                  <span className="text-blue-600">Has Image</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span>{task.progressPercentage}%</span>
              </div>
              <Progress value={task.progressPercentage} className="h-2" />
              <input
                type="range"
                min="0"
                max="100"
                value={task.progressPercentage}
                onChange={handleProgressChange}
                disabled={isUpdatingProgress}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView(task)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(task)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContentCreatorTasksPage;
