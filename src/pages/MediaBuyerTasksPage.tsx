import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckSquare, Plus, Calendar, Brush, Clock, User, Eye, Star, MessageSquare, Trash2, Edit, AlertCircle } from 'lucide-react';
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

const MediaBuyerTasksPage = () => {
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

  const getTasksAssignedByUser = () => {
    return tasks.filter(task => task.createdBy === user?.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complete': return 'bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-lg hover:shadow-xl ring-2 ring-green-500/20';
      case 'In Progress': return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl ring-2 ring-blue-500/20';
      case 'On Hold': return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0 shadow-lg hover:shadow-xl ring-2 ring-yellow-500/20';
      case 'Unfinished': return 'bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-lg hover:shadow-xl ring-2 ring-red-500/20';
      default: return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0 shadow-lg hover:shadow-xl ring-2 ring-gray-400/20';
    }
  };

  // Priority display functions for design tasks
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
      case 'social-media': return '📱';
      case 'web-design': return '🌐';
      case 'branding': return '🎨';
      case 'print': return '📄';
      case 'ui-ux': return '⚡';
      default: return '📂';
    }
  };

  const getProjectTypeDisplay = (type?: string) => {
    switch (type) {
      case 'social-media': return 'Social Media';
      case 'web-design': return 'Web Design';
      case 'branding': return 'Branding';
      case 'print': return 'Print';
      case 'ui-ux': return 'UI/UX';
      default: return 'Other';
    }
  };

  const handleVisualFeedingUpload = async (file: File) => {
    setIsUploadingVisualFeeding(true);
    try {
      const result = await uploadFile(file, 'visual-feeding');
      if (result.success && result.fileName) {
        setTaskForm({...taskForm, visualFeeding: result.fileName});
        toast.success('Visual feeding uploaded successfully!');
      } else {
        toast.error(`Upload failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload visual feeding');
    } finally {
      setIsUploadingVisualFeeding(false);
    }
  };

  const handleAttachmentUpload = async (file: File) => {
    setIsUploadingAttachment(true);
    try {
      const result = await uploadFile(file, 'attachments');
      if (result.success && result.fileName) {
        setTaskForm({...taskForm, attachmentFile: result.fileName});
        toast.success('Attachment uploaded successfully!');
      } else {
        toast.error(`Upload failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload attachment');
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const openTaskDetail = (task: Task) => {
    setSelectedTaskForDetail(task);
    setIsTaskDetailDialogOpen(true);
  };

  const handleImageClick = (imagePath: string) => {
    setSelectedImage(imagePath);
    setIsImageModalOpen(true);
  };

  const openEditTaskDialog = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTask({
      title: task.title || '',
      description: task.description || '',
      assignedTo: task.assignedTo || '',
      status: (task.status || 'Not Started') as 'Not Started' | 'On Hold' | 'In Progress' | 'Complete' | 'Unfinished',
      progressPercentage: task.progressPercentage || 0,
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
    setIsEditTaskDialogOpen(true);
  };

  const handleEditTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingTaskId) return;

    // Validate Creative Brief fields for Designer tasks
    const missingFields = [];
    if (!editingTask.tacticalPlan.trim()) missingFields.push('Tactical Plan');
    if (!editingTask.aim.trim()) missingFields.push('Aim/Goal');
    if (!editingTask.idea.trim()) missingFields.push('Creative Idea');
    if (!editingTask.copy.trim()) missingFields.push('Copy Text');
    
    if (missingFields.length > 0) {
      toast.error(`Creative Brief required for Designer tasks. Missing: ${missingFields.join(', ')}`);
      return;
    }

    setIsLoading(true);
    try {
      await updateTask(editingTaskId, {
        title: editingTask.title,
        description: editingTask.description,
        assignedTo: editingTask.assignedTo,
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
      setIsTaskDetailDialogOpen(false);
      loadInitialData();
      playNotificationSound();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Error updating task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditVisualFeedingUpload = async (file: File) => {
    setIsUploadingEditVisualFeeding(true);
    try {
      const result = await uploadFile(file, 'visual-feeding');
      if (result.success && result.fileName) {
        setEditingTask(prev => ({ ...prev, visualFeeding: result.fileName }));
        toast.success('Visual feeding uploaded successfully!');
      } else {
        toast.error(`Upload failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload visual feeding');
    } finally {
      setIsUploadingEditVisualFeeding(false);
    }
  };

  const handleEditAttachmentUpload = async (file: File) => {
    setIsUploadingEditAttachment(true);
    try {
      const result = await uploadFile(file, 'attachments');
      if (result.success && result.fileName) {
        setEditingTask(prev => ({ ...prev, attachmentFile: result.fileName }));
        toast.success('Attachment uploaded successfully!');
      } else {
        toast.error(`Upload failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload attachment');
    } finally {
      setIsUploadingEditAttachment(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 w-full max-w-full overflow-x-hidden">
      {/* Enhanced mobile-optimized header - Non-sticky, responsive layout */}
      <div className="border-b border-border/50 bg-background/98 w-full">
        <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6 w-full max-w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
            <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">Media Buyer Dashboard</h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">Assign and manage design tasks for your team</p>
            </div>
          </div>
        </div>
      </div>

      <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 space-y-6 sm:space-y-8 md:space-y-10 w-full max-w-full overflow-x-hidden">
        {/* Design Tasks Section - Direct without Tabs */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Brush className="h-5 w-5" />
              Assign Tasks to Designers
            </CardTitle>
            <Button onClick={() => setIsTaskDialogOpen(true)} className="min-h-[44px] w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Assign Task
            </Button>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="grid gap-4">
              {getTasksAssignedByUser().length === 0 ? (
                <div className="text-center py-8">
                  <CheckSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">No tasks assigned yet</p>
                  <p className="text-sm text-gray-400">Start by assigning tasks to designers</p>
                </div>
              ) :
                getTasksAssignedByUser().map((task) => (
                  <Card key={task.id} className="p-4 hover:shadow-lg transition-all duration-300">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0 pr-4">
                        <h3 className="font-semibold text-lg mb-2 break-words overflow-wrap-anywhere">{task.title}</h3>
                        
                        {/* Priority and Project Type Badges */}
                        <div className="flex flex-wrap gap-2 mb-2">
                          {task.priority && (
                            <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 transform hover:scale-105 whitespace-nowrap ${getPriorityColor(task.priority)}`}>
                              {getPriorityDisplay(task.priority)}
                            </span>
                          )}
                          
                          {task.projectType && task.assignedToPosition === 'Designer' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl ring-2 ring-blue-500/20 transition-all duration-300 transform hover:scale-105 whitespace-nowrap">
                              <span className="text-sm">{getProjectTypeIcon(task.projectType)}</span>
                              <span className="text-xs font-bold uppercase tracking-wider">
                                {getProjectTypeDisplay(task.projectType)}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <span className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 transform hover:scale-105 whitespace-nowrap ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4 break-words overflow-wrap-anywhere">{task.description}</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span>Assigned to: <span className="font-medium">{task.assignedToName}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {task.progressPercentage !== undefined && (
                      <div className="mb-4">
                        <div className="flex justify-between text-xs mb-2">
                          <span className="font-medium">Progress</span>
                          <span className="font-semibold">{task.progressPercentage}%</span>
                        </div>
                        <Progress value={task.progressPercentage} className="h-2.5" />
                      </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openTaskDetail(task)}
                        className="flex items-center gap-2 min-h-[44px] text-sm hover:bg-slate-50"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                        {task.comments && task.comments.length > 0 && (
                          <span className="ml-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                            {task.comments.length}
                          </span>
                        )}
                      </Button>
                      
                      {task.status === 'Complete' && (
                        <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Completed
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              }
            </div>
          </CardContent>
        </Card>

        {/* Assign Task Dialog */}
        <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
          <DialogContent className="w-[95vw] max-w-[90vw] sm:max-w-[700px] lg:max-w-[900px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-bold">Assign Task to Designer</DialogTitle>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">Create a detailed Creative Brief for your designer</p>
            </DialogHeader>
            <div className="space-y-4 sm:space-y-6 py-4">
              {/* Basic Task Information */}
              <div className="space-y-4">
              <div className="space-y-2">
                  <Label htmlFor="taskTitle" className="text-sm font-medium">Task Title</Label>
                <Input
                  id="taskTitle"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter a clear and descriptive task title..."
                    className="min-h-[44px] text-base border-2 focus:border-primary transition-colors"
                  required
                />
              </div>
              
              <div className="space-y-2">
                  <Label htmlFor="taskDescription" className="text-sm font-medium">Task Description</Label>
                <Textarea
                  id="taskDescription"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Provide detailed requirements, specifications, and context for this design task..."
                    className="min-h-[88px] text-base border-2 focus:border-primary transition-colors resize-none"
                    rows={4}
                  required
                />
              </div>
              
                {/* Assignment and Priority - Mobile stacked, Desktop side-by-side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                    <Label htmlFor="assignedTo" className="text-sm font-medium">Assign to Designer</Label>
                <Select value={taskForm.assignedTo} onValueChange={(value) => setTaskForm(prev => ({ ...prev, assignedTo: value }))}>
                      <SelectTrigger className="min-h-[44px] text-base border-2 focus:border-primary transition-colors">
                        <SelectValue placeholder="Choose designer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {designers.map((designer) => (
                      <SelectItem key={designer.id} value={designer.id}>
                        {designer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                    <Label htmlFor="priority" className="text-sm font-medium">Task Priority</Label>
                <Select 
                  value={taskForm.priority || 'medium'} 
                  onValueChange={(value) => setTaskForm(prev => ({ ...prev, priority: value as 'low' | 'medium' | 'high' | 'urgent' }))}
                >
                      <SelectTrigger className="min-h-[44px] text-base border-2 focus:border-primary transition-colors">
                        <SelectValue placeholder="Set priority..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">⚡ Urgent</SelectItem>
                    <SelectItem value="high">🚨 High</SelectItem>
                    <SelectItem value="medium">📋 Medium</SelectItem>
                    <SelectItem value="low">✅ Low</SelectItem>
                  </SelectContent>
                </Select>
                  </div>
              </div>
              
              <div className="space-y-2">
                  <Label htmlFor="projectType" className="text-sm font-medium">Project Type</Label>
                <Select 
                  value={taskForm.projectType || ''} 
                  onValueChange={(value) => setTaskForm(prev => ({ ...prev, projectType: value as 'social-media' | 'web-design' | 'branding' | 'print' | 'ui-ux' | 'other' }))}
                >
                    <SelectTrigger className="min-h-[44px] text-base border-2 focus:border-primary transition-colors">
                      <SelectValue placeholder="Select project type..." />
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
              </div>

              {/* Creative Brief Section */}
              <div className="mt-6 border-t pt-6">
                <div className="mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">🎨</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Creative Brief</h3>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                    Designer Details
                  </span>
                </div>
                
                <div className="space-y-4">
                  {/* Tactical Plan */}
                  <div className="space-y-2">
                    <Label htmlFor="tactical-plan" className="text-sm font-medium flex items-center gap-2">
                      <span className="text-purple-600">📋</span> Tactical Plan
                      <span className="text-xs text-red-600 font-semibold">*Required</span>
                    </Label>
                    <Textarea
                      id="tactical-plan"
                      value={taskForm.tacticalPlan}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, tacticalPlan: e.target.value }))}
                      className="min-h-[80px] resize-none border-purple-200 focus:border-purple-500 focus:ring-purple-500"
                      rows={3}
                      placeholder="• What's the design strategy?&#10;• Key elements to focus on&#10;• Target audience considerations..."
                    />
                  </div>

                  {/* Time Estimate & Aim - Side by Side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="time-estimate" className="text-sm font-medium flex items-center gap-2">
                        <span className="text-blue-600">⏱️</span> Time Estimate
                      </Label>
                      <Input
                        id="time-estimate"
                        value={taskForm.timeEstimate}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, timeEstimate: e.target.value }))}
                        className="border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="e.g., 2 hours, 1 day, 3 days..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="aim" className="text-sm font-medium flex items-center gap-2">
                        <span className="text-green-600">🎯</span> Aim/Goal
                        <span className="text-xs text-red-600 font-semibold">*Required</span>
                      </Label>
                      <Input
                        id="aim"
                        value={taskForm.aim}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, aim: e.target.value }))}
                        className="border-green-200 focus:border-green-500 focus:ring-green-500"
                        placeholder="What's the main objective?"
                      />
                    </div>
                  </div>

                  {/* Creative Idea */}
                  <div className="space-y-2">
                    <Label htmlFor="idea" className="text-sm font-medium flex items-center gap-2">
                      <span className="text-yellow-600">💡</span> Creative Idea
                      <span className="text-xs text-red-600 font-semibold">*Required</span>
                    </Label>
                    <Textarea
                      id="idea"
                      value={taskForm.idea}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, idea: e.target.value }))}
                      className="min-h-[80px] resize-none border-yellow-200 focus:border-yellow-500 focus:ring-yellow-500"
                      rows={3}
                      placeholder="• What's the creative concept?&#10;• Visual style and mood&#10;• Key design elements..."
                    />
                  </div>

                  {/* Copy Text */}
                  <div className="space-y-2">
                    <Label htmlFor="copy" className="text-sm font-medium flex items-center gap-2">
                      <span className="text-indigo-600">📝</span> Copy Text
                      <span className="text-xs text-red-600 font-semibold">*Required</span>
                    </Label>
                    <Textarea
                      id="copy"
                      value={taskForm.copy}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, copy: e.target.value }))}
                      className="min-h-[80px] resize-none border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500"
                      rows={3}
                      placeholder="• Headlines and taglines&#10;• Body text content&#10;• Call-to-action text..."
                    />
                  </div>

                  {/* Visual Feeding (Image) & Attachment - Side by Side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="visual-feeding" className="text-sm font-medium flex items-center gap-2">
                        <span className="text-pink-600">🖼️</span> Visual Feeding
                        <span className="text-xs text-gray-500">(Optional Image)</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="visual-feeding"
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleVisualFeedingUpload(file);
                            }
                          }}
                          className="w-full border-pink-200 focus:border-pink-500 focus:ring-pink-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100 file:cursor-pointer overflow-hidden"
                          accept="image/*"
                          disabled={isUploadingVisualFeeding}
                        />
                        {isUploadingVisualFeeding && (
                          <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pink-600"></div>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {isUploadingVisualFeeding ? 'Uploading...' : 'Upload reference images, mood boards, style guides'}
                        </p>
                        {taskForm.visualFeeding && (
                          <div className="mt-2 p-2 bg-pink-50 rounded border border-pink-200">
                            <div className="flex items-center gap-2">
                              <span className="text-pink-600">✓</span>
                              <span className="text-xs text-pink-800">Uploaded: {taskForm.visualFeeding.split('/').pop()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="attachment-file" className="text-sm font-medium flex items-center gap-2">
                        <span className="text-orange-600">📎</span> Additional Files
                        <span className="text-xs text-gray-500">(Optional)</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="attachment-file"
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleAttachmentUpload(file);
                            }
                          }}
                          className="w-full border-orange-200 focus:border-orange-500 focus:ring-orange-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 file:cursor-pointer overflow-hidden"
                          accept=".pdf,.doc,.docx,.txt,.ai,.psd,.sketch,.fig,.zip"
                          disabled={isUploadingAttachment}
                        />
                        {isUploadingAttachment && (
                          <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600"></div>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {isUploadingAttachment ? 'Uploading...' : 'Briefs, specs, assets (.pdf, .ai, .psd, etc.)'}
                        </p>
                        {taskForm.attachmentFile && (
                          <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-200">
                            <div className="flex items-center gap-2">
                              <span className="text-orange-600">✓</span>
                              <span className="text-xs text-orange-800">Uploaded: {taskForm.attachmentFile.split('/').pop()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-sm font-medium flex items-center gap-2">
                      <span className="text-gray-600">💬</span> Additional Notes
                      <span className="text-xs text-gray-500">(Optional)</span>
                    </Label>
                    <Textarea
                      id="notes"
                      value={taskForm.notes}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="min-h-[60px] resize-none border-gray-200 focus:border-gray-500 focus:ring-gray-500"
                      rows={2}
                      placeholder="Any additional instructions, preferences, or important notes for the designer..."
                    />
                  </div>
                </div>
              </div>

            </div>
            
            <form onSubmit={handleTaskSubmit}>
              <DialogFooter className="flex-col sm:flex-row gap-2 mt-6 pt-6 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsTaskDialogOpen(false)} 
                  className="w-full sm:w-auto min-h-[44px] order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || !taskForm.assignedTo || !taskForm.title || !taskForm.description} 
                  className="w-full sm:w-auto min-h-[44px] order-1 sm:order-2 bg-primary hover:bg-primary/90"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Assigning Task...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Assign to Designer
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Task Detail Dialog */}
        <Dialog open={isTaskDetailDialogOpen} onOpenChange={setIsTaskDetailDialogOpen}>
          <DialogContent className="w-[95vw] max-w-[90vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-3 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg break-words overflow-wrap-anywhere">
                <CheckSquare className="h-5 w-5 flex-shrink-0" />
                Task Details
              </DialogTitle>
            </DialogHeader>
            
            {selectedTaskForDetail && (
              <div className="mb-4">
                <Button
                  onClick={() => {
                    setIsTaskDetailDialogOpen(false);
                    openEditTaskDialog(selectedTaskForDetail);
                  }}
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Task
                </Button>
              </div>
            )}
            
            {selectedTaskForDetail && (
              <div className="p-4 border rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-900/50 shadow-sm">
              <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 h-14 sm:h-14 mb-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-1.5 shadow-lg backdrop-blur-sm gap-2">
                    <TabsTrigger 
                      value="overview" 
                      className="relative text-xs sm:text-sm font-medium min-h-[44px] sm:min-h-auto bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-300 ease-in-out transform data-[state=active]:scale-[1.02] hover:scale-[1.01]"
                    >
                      <span className="flex items-center gap-2">
                        📊 Overview
                      </span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="creative-brief" 
                      className="relative text-xs sm:text-sm font-medium min-h-[44px] sm:min-h-auto bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-300 ease-in-out transform data-[state=active]:scale-[1.02] hover:scale-[1.01]"
                    >
                      <span className="flex items-center gap-2">
                        🎨 <span className="hidden sm:inline">Creative Brief</span><span className="sm:hidden">Brief</span>
                      </span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="comments" 
                      className="relative flex items-center justify-center gap-2 text-xs sm:text-sm font-medium min-h-[44px] sm:min-h-auto bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-300 ease-in-out transform data-[state=active]:scale-[1.02] hover:scale-[1.01]"
                    >
                      <MessageSquare className="h-4 w-4 flex-shrink-0" />
                    <span className="hidden sm:inline">Comments</span>
                      <span className="sm:hidden">Chat</span>
                    {selectedTaskForDetail.comments && selectedTaskForDetail.comments.length > 0 && (
                        <span className="absolute -top-1 -right-1 sm:relative sm:top-0 sm:right-0 sm:ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold shadow-lg animate-pulse min-w-[18px] h-[18px] flex items-center justify-center">
                        {selectedTaskForDetail.comments.length}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-6 bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg backdrop-blur-sm">
                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Task Title</Label>
                      <div className="p-3 bg-gray-50 rounded-md dark:bg-gray-800 break-words overflow-wrap-anywhere">
                        {selectedTaskForDetail.title}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Description</Label>
                      <div className="p-3 bg-gray-50 rounded-md dark:bg-gray-800 break-words overflow-wrap-anywhere">
                        {selectedTaskForDetail.description}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Assigned To</Label>
                        <div className="p-3 bg-gray-50 rounded-md dark:bg-gray-800 flex items-center gap-2">
                          <User className="h-4 w-4 flex-shrink-0" />
                          <span className="break-words">{selectedTaskForDetail.assignedToName}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Status</Label>
                        <div className="p-3 bg-gray-50 rounded-md dark:bg-gray-800">
                          <Badge className={getStatusColor(selectedTaskForDetail.status)}>
                            {selectedTaskForDetail.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Progress</Label>
                      <div className="p-3 bg-gray-50 rounded-md dark:bg-gray-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{selectedTaskForDetail.progressPercentage}%</span>
                        </div>
                        <Progress value={selectedTaskForDetail.progressPercentage} className="h-2.5 sm:h-3" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4 text-sm text-gray-500">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="font-medium">Created:</span> 
                        <span>{new Date(selectedTaskForDetail.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="font-medium">Last Updated:</span> 
                        <span>{new Date(selectedTaskForDetail.updatedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="creative-brief" className="space-y-6 bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg backdrop-blur-sm">
                  <div className="space-y-6">
                    {/* Creative Brief Information */}
                    {selectedTaskForDetail.tacticalPlan && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <span className="text-purple-600">📋</span> Tactical Plan
                        </Label>
                        <div className="p-3 bg-purple-50 rounded-md dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 break-words overflow-wrap-anywhere">
                          <p className="text-sm text-purple-800 dark:text-purple-200 whitespace-pre-wrap">{selectedTaskForDetail.tacticalPlan}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedTaskForDetail.timeEstimate && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <span className="text-blue-600">⏱️</span> Time Estimate
                          </Label>
                          <div className="p-3 bg-blue-50 rounded-md dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
                            <p className="text-sm text-blue-800 dark:text-blue-200">{selectedTaskForDetail.timeEstimate}</p>
                          </div>
                        </div>
                      )}

                      {selectedTaskForDetail.aim && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <span className="text-green-600">🎯</span> Aim/Goal
                          </Label>
                          <div className="p-3 bg-green-50 rounded-md dark:bg-green-900/20 border border-green-200 dark:border-green-700">
                            <p className="text-sm text-green-800 dark:text-green-200">{selectedTaskForDetail.aim}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedTaskForDetail.idea && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <span className="text-yellow-600">💡</span> Creative Idea
                        </Label>
                        <div className="p-3 bg-yellow-50 rounded-md dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 break-words overflow-wrap-anywhere">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200 whitespace-pre-wrap">{selectedTaskForDetail.idea}</p>
                        </div>
                      </div>
                    )}

                    {selectedTaskForDetail.copy && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <span className="text-indigo-600">📝</span> Copy Text
                        </Label>
                        <div className="p-3 bg-indigo-50 rounded-md dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 break-words overflow-wrap-anywhere">
                          <p className="text-sm text-indigo-800 dark:text-indigo-200 whitespace-pre-wrap">{selectedTaskForDetail.copy}</p>
                        </div>
                      </div>
                    )}

                    {/* File Attachments */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedTaskForDetail.visualFeeding && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <span className="text-pink-600">🖼️</span> Visual Feeding
                          </Label>
                          <div className="p-3 bg-pink-50 rounded-md dark:bg-pink-900/20 border border-pink-200 dark:border-pink-700">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-pink-600">📷</span>
                              <span className="text-sm text-pink-800 dark:text-pink-200">{selectedTaskForDetail.visualFeeding.split('/').pop()}</span>
                            </div>
                            {/* Image Preview - if it's an image file */}
                            {isImageFile(selectedTaskForDetail.visualFeeding) && (
                              <div className="mt-2">
                                <div className="relative group cursor-pointer" onClick={() => handleImageClick(getFileUrl(selectedTaskForDetail.visualFeeding))}>
                                  <img 
                                    src={getFileUrl(selectedTaskForDetail.visualFeeding)} 
                                    alt="Visual Reference" 
                                    className="max-w-full h-auto max-h-32 rounded border shadow-sm transition-transform duration-200 group-hover:scale-105 group-hover:shadow-lg"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                  {/* Overlay to indicate it's clickable */}
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded border flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                      <div className="bg-white bg-opacity-90 rounded-full p-2">
                                        <Eye className="w-4 h-4 text-gray-700" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <p className="text-xs text-pink-500 mt-1 text-center">Click to view full size</p>
                              </div>
                            )}
                            {/* If not an image, show download link */}
                            {!isImageFile(selectedTaskForDetail.visualFeeding) && (
                              <a 
                                href={getFileUrl(selectedTaskForDetail.visualFeeding)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-pink-600 dark:text-pink-400 hover:text-pink-800 dark:hover:text-pink-200 underline flex items-center gap-1"
                              >
                                📎 View File
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {selectedTaskForDetail.attachmentFile && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <span className="text-orange-600">📎</span> Additional Files
                          </Label>
                          <div className="p-3 bg-orange-50 rounded-md dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-orange-600">📄</span>
                              <span className="text-sm text-orange-800 dark:text-orange-200">{selectedTaskForDetail.attachmentFile.split('/').pop()}</span>
                            </div>
                            <a 
                              href={getFileUrl(selectedTaskForDetail.attachmentFile)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200 underline flex items-center gap-1"
                            >
                              📎 Download File
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedTaskForDetail.notes && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <span className="text-gray-600">💬</span> Additional Notes
                        </Label>
                        <div className="p-3 bg-gray-50 rounded-md dark:bg-gray-800 border border-gray-200 dark:border-gray-700 break-words overflow-wrap-anywhere">
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedTaskForDetail.notes}</p>
                        </div>
                      </div>
                    )}

                    {/* Empty state if no Creative Brief data */}
                    {!selectedTaskForDetail.tacticalPlan && !selectedTaskForDetail.aim && !selectedTaskForDetail.idea && !selectedTaskForDetail.copy && !selectedTaskForDetail.visualFeeding && !selectedTaskForDetail.attachmentFile && !selectedTaskForDetail.notes && (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">No Creative Brief information available for this task.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="comments" className="space-y-6 bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg backdrop-blur-sm">
                  <div className="min-h-[200px]">
                    <TaskComments
                      taskId={selectedTaskForDetail.id}
                      user={user}
                      comments={selectedTaskForDetail.comments || []}
                      onCommentAdded={(comments) => handleAddTaskComment(selectedTaskForDetail.id, comments)}
                      language="en"
                      isLocked={false}
                    />
                  </div>
                </TabsContent>
              </Tabs>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Task Dialog */}
        <Dialog open={isEditTaskDialogOpen} onOpenChange={setIsEditTaskDialogOpen}>
          <DialogContent className="w-[95vw] max-w-[90vw] sm:max-w-[700px] lg:max-w-[900px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-bold">Edit Task</DialogTitle>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">Modify your Creative Brief and task details</p>
            </DialogHeader>
            <form onSubmit={handleEditTaskSubmit}>
              <div className="space-y-4 sm:space-y-6 py-4">
                {/* Basic Task Information */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="editTaskTitle" className="text-sm font-medium">Task Title</Label>
                    <Input
                      id="editTaskTitle"
                      value={editingTask.title}
                      onChange={(e) => setEditingTask(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter a clear and descriptive task title..."
                      className="min-h-[44px] text-base border-2 focus:border-primary transition-colors"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="editTaskDescription" className="text-sm font-medium">Task Description</Label>
                    <Textarea
                      id="editTaskDescription"
                      value={editingTask.description}
                      onChange={(e) => setEditingTask(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Provide detailed requirements, specifications, and context for this design task..."
                      className="min-h-[88px] text-base border-2 focus:border-primary transition-colors resize-none"
                      rows={4}
                      required
                    />
                  </div>
                  
                  {/* Assignment and Priority - Mobile stacked, Desktop side-by-side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editAssignedTo" className="text-sm font-medium">Assign to Designer</Label>
                      <Select value={editingTask.assignedTo} onValueChange={(value) => setEditingTask(prev => ({ ...prev, assignedTo: value }))}>
                        <SelectTrigger className="min-h-[44px] text-base border-2 focus:border-primary transition-colors">
                          <SelectValue placeholder="Choose designer..." />
                        </SelectTrigger>
                        <SelectContent>
                          {designers.map((designer) => (
                            <SelectItem key={designer.id} value={designer.id}>
                              {designer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="editTaskPriority" className="text-sm font-medium">Priority</Label>
                      <Select 
                        value={editingTask.priority} 
                        onValueChange={(value) => setEditingTask(prev => ({ ...prev, priority: value as 'low' | 'medium' | 'high' | 'urgent' }))}
                      >
                        <SelectTrigger className="min-h-[44px] text-base border-2 focus:border-primary transition-colors">
                          <SelectValue placeholder="Select priority..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">🟢 Low</SelectItem>
                          <SelectItem value="medium">🟡 Medium</SelectItem>
                          <SelectItem value="high">🟠 High</SelectItem>
                          <SelectItem value="urgent">🔴 Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editProjectType" className="text-sm font-medium">Project Type</Label>
                    <Select 
                      value={editingTask.projectType || ''} 
                      onValueChange={(value) => setEditingTask(prev => ({ ...prev, projectType: value as 'social-media' | 'web-design' | 'branding' | 'print' | 'ui-ux' | 'other' }))}
                    >
                      <SelectTrigger className="min-h-[44px] text-base border-2 focus:border-primary transition-colors">
                        <SelectValue placeholder="Select project type..." />
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
                </div>

                {/* Creative Brief Section */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">🎨</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Creative Brief</h3>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                      Designer Details
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Tactical Plan */}
                    <div className="space-y-2">
                      <Label htmlFor="edit-tactical-plan" className="text-sm font-medium flex items-center gap-2">
                        <span className="text-purple-600">📋</span> Tactical Plan
                        <span className="text-xs text-red-600 font-semibold">*Required</span>
                      </Label>
                      <Textarea
                        id="edit-tactical-plan"
                        value={editingTask.tacticalPlan}
                        onChange={(e) => setEditingTask(prev => ({ ...prev, tacticalPlan: e.target.value }))}
                        className="min-h-[80px] resize-none border-purple-200 focus:border-purple-500 focus:ring-purple-500"
                        rows={3}
                        placeholder="• What's the design strategy?&#10;• Key elements to focus on&#10;• Target audience considerations..."
                      />
                    </div>

                    {/* Time Estimate & Aim - Side by Side */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-time-estimate" className="text-sm font-medium flex items-center gap-2">
                          <span className="text-blue-600">⏱️</span> Time Estimate
                        </Label>
                        <Input
                          id="edit-time-estimate"
                          value={editingTask.timeEstimate}
                          onChange={(e) => setEditingTask(prev => ({ ...prev, timeEstimate: e.target.value }))}
                          className="border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                          placeholder="e.g., 2 hours, 1 day, 3 days..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-aim" className="text-sm font-medium flex items-center gap-2">
                          <span className="text-green-600">🎯</span> Aim/Goal
                          <span className="text-xs text-red-600 font-semibold">*Required</span>
                        </Label>
                        <Input
                          id="edit-aim"
                          value={editingTask.aim}
                          onChange={(e) => setEditingTask(prev => ({ ...prev, aim: e.target.value }))}
                          className="border-green-200 focus:border-green-500 focus:ring-green-500"
                          placeholder="What's the main objective?"
                        />
                      </div>
                    </div>

                    {/* Creative Idea */}
                    <div className="space-y-2">
                      <Label htmlFor="edit-idea" className="text-sm font-medium flex items-center gap-2">
                        <span className="text-yellow-600">💡</span> Creative Idea
                        <span className="text-xs text-red-600 font-semibold">*Required</span>
                      </Label>
                      <Textarea
                        id="edit-idea"
                        value={editingTask.idea}
                        onChange={(e) => setEditingTask(prev => ({ ...prev, idea: e.target.value }))}
                        className="min-h-[80px] resize-none border-yellow-200 focus:border-yellow-500 focus:ring-yellow-500"
                        rows={3}
                        placeholder="• What's the creative concept?&#10;• Visual style and mood&#10;• Key design elements..."
                      />
                    </div>

                    {/* Copy Text */}
                    <div className="space-y-2">
                      <Label htmlFor="edit-copy" className="text-sm font-medium flex items-center gap-2">
                        <span className="text-indigo-600">📝</span> Copy Text
                        <span className="text-xs text-red-600 font-semibold">*Required</span>
                      </Label>
                      <Textarea
                        id="edit-copy"
                        value={editingTask.copy}
                        onChange={(e) => setEditingTask(prev => ({ ...prev, copy: e.target.value }))}
                        className="min-h-[80px] resize-none border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500"
                        rows={3}
                        placeholder="• Headlines and taglines&#10;• Body text content&#10;• Call-to-action text..."
                      />
                    </div>

                    {/* Visual Feeding (Image) & Attachment - Side by Side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-visual-feeding" className="text-sm font-medium flex items-center gap-2">
                          <span className="text-pink-600">🖼️</span> Visual Feeding
                          <span className="text-xs text-gray-500">(Optional Image)</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="edit-visual-feeding"
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleEditVisualFeedingUpload(file);
                              }
                            }}
                            className="w-full border-pink-200 focus:border-pink-500 focus:ring-pink-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100 file:cursor-pointer overflow-hidden"
                            accept="image/*"
                            disabled={isUploadingEditVisualFeeding}
                          />
                          {isUploadingEditVisualFeeding && (
                            <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pink-600"></div>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {isUploadingEditVisualFeeding ? 'Uploading...' : 'Upload reference images, mood boards, style guides'}
                          </p>
                          {editingTask.visualFeeding && (
                            <div className="mt-2 p-2 bg-pink-50 rounded border border-pink-200">
                              <div className="flex items-center gap-2">
                                <span className="text-pink-600">✓</span>
                                <span className="text-xs text-pink-800">Current: {editingTask.visualFeeding.split('/').pop()}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-attachment-file" className="text-sm font-medium flex items-center gap-2">
                          <span className="text-orange-600">📎</span> Additional Files
                          <span className="text-xs text-gray-500">(Optional)</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="edit-attachment-file"
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleEditAttachmentUpload(file);
                              }
                            }}
                            className="w-full border-orange-200 focus:border-orange-500 focus:ring-orange-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 file:cursor-pointer overflow-hidden"
                            accept=".pdf,.doc,.docx,.txt,.ai,.psd,.sketch,.fig,.zip"
                            disabled={isUploadingEditAttachment}
                          />
                          {isUploadingEditAttachment && (
                            <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600"></div>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {isUploadingEditAttachment ? 'Uploading...' : 'Briefs, specs, assets (.pdf, .ai, .psd, etc.)'}
                          </p>
                          {editingTask.attachmentFile && (
                            <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-200">
                              <div className="flex items-center gap-2">
                                <span className="text-orange-600">✓</span>
                                <span className="text-xs text-orange-800">Current: {editingTask.attachmentFile.split('/').pop()}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="edit-notes" className="text-sm font-medium flex items-center gap-2">
                        <span className="text-gray-600">💬</span> Additional Notes
                        <span className="text-xs text-gray-500">(Optional)</span>
                      </Label>
                      <Textarea
                        id="edit-notes"
                        value={editingTask.notes}
                        onChange={(e) => setEditingTask(prev => ({ ...prev, notes: e.target.value }))}
                        className="min-h-[60px] resize-none border-gray-200 focus:border-gray-500 focus:ring-gray-500"
                        rows={2}
                        placeholder="Any additional instructions, preferences, or important notes for the designer..."
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="flex-col sm:flex-row gap-2 mt-6 pt-6 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditTaskDialogOpen(false)} 
                  className="w-full sm:w-auto min-h-[44px] order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || !editingTask.assignedTo || !editingTask.title || !editingTask.description} 
                  className="w-full sm:w-auto min-h-[44px] order-1 sm:order-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Updating Task...
                    </>
                  ) : (
                    <>
                      <Edit className="mr-2 h-4 w-4" />
                      Update Task
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Image Modal */}
        <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 bg-black/90 border-none">
            <div className="relative flex items-center justify-center">
              {selectedImage && (
                <img 
                  src={selectedImage} 
                  alt="Visual Reference - Full Size" 
                  className="max-w-full max-h-[90vh] object-contain rounded"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              {/* Close button */}
              <button
                onClick={() => setIsImageModalOpen(false)}
                className="absolute top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full p-2 transition-all duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MediaBuyerTasksPage; 