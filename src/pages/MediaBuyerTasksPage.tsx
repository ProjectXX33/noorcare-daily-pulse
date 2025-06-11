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
import { CheckSquare, Plus, Calendar, PenTool, Clock, User, Eye, Star, MessageSquare, Trash2, Edit, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

// API functions
import { 
  fetchAllTasks, 
  createTask,
  addTaskComment, 
  updateTaskProgress
} from '@/lib/tasksApi';
import { fetchEmployees } from '@/lib/employeesApi';
import { User as UserType, Task } from '@/types';
import { playNotificationSound } from '@/lib/notifications';
import TaskComments from '@/components/TaskComments';

interface TaskFormData {
  title: string;
  description: string;
  assignedTo: string;
  status: 'Not Started' | 'On Hold' | 'In Progress' | 'Complete';
  progressPercentage: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  projectType: 'social-media' | 'web-design' | 'branding' | 'print' | 'ui-ux' | 'other';
}

const MediaBuyerTasksPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [designers, setDesigners] = useState<UserType[]>([]);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isTaskDetailDialogOpen, setIsTaskDetailDialogOpen] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [taskForm, setTaskForm] = useState<TaskFormData>({
    title: '',
    description: '',
    assignedTo: '',
    status: 'Not Started',
    progressPercentage: 0,
    priority: 'medium',
    projectType: 'social-media'
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
        createdBy: user.id
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
      projectType: 'social-media'
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

  const openTaskDetail = (task: Task) => {
    setSelectedTaskForDetail(task);
    setIsTaskDetailDialogOpen(true);
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
              <PenTool className="h-5 w-5" />
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
          <DialogContent className="w-[95vw] max-w-[90vw] sm:max-w-[500px] p-3 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg break-words overflow-wrap-anywhere">Assign Task to Designer</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="taskTitle" className="text-sm">Task Title</Label>
                <Input
                  id="taskTitle"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter task title"
                  className="min-h-[44px] text-base"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="taskDescription" className="text-sm">Task Description</Label>
                <Textarea
                  id="taskDescription"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the task in detail"
                  className="min-h-[88px] text-base"
                  rows={3}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="assignedTo" className="text-sm">Assign to Designer</Label>
                <Select value={taskForm.assignedTo} onValueChange={(value) => setTaskForm(prev => ({ ...prev, assignedTo: value }))}>
                  <SelectTrigger className="min-h-[44px] text-base">
                    <SelectValue placeholder="Select a designer" />
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
                <Label htmlFor="priority" className="text-sm">Task Priority</Label>
                <Select 
                  value={taskForm.priority || 'medium'} 
                  onValueChange={(value) => setTaskForm(prev => ({ ...prev, priority: value as 'low' | 'medium' | 'high' | 'urgent' }))}
                >
                  <SelectTrigger className="min-h-[44px] text-base">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">⚡ Urgent</SelectItem>
                    <SelectItem value="high">🚨 High</SelectItem>
                    <SelectItem value="medium">📋 Medium</SelectItem>
                    <SelectItem value="low">✅ Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="projectType" className="text-sm">Project Type</Label>
                <Select 
                  value={taskForm.projectType || ''} 
                  onValueChange={(value) => setTaskForm(prev => ({ ...prev, projectType: value as 'social-media' | 'web-design' | 'branding' | 'print' | 'ui-ux' | 'other' }))}
                >
                  <SelectTrigger className="min-h-[44px] text-base">
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="social-media">📱 Social Media</SelectItem>
                    <SelectItem value="web-design">🌐 Web Design</SelectItem>
                    <SelectItem value="branding">🎨 Branding</SelectItem>
                    <SelectItem value="print">📄 Print</SelectItem>
                    <SelectItem value="ui-ux">⚡ UI/UX</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => setIsTaskDialogOpen(false)} className="w-full sm:w-auto min-h-[44px]">
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || !taskForm.assignedTo} className="w-full sm:w-auto min-h-[44px]">
                  {isLoading ? 'Assigning...' : 'Assign Task'}
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
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-12 sm:h-10">
                  <TabsTrigger value="overview" className="text-xs sm:text-sm min-h-[44px] sm:min-h-auto">Overview</TabsTrigger>
                  <TabsTrigger value="comments" className="flex items-center gap-2 text-xs sm:text-sm min-h-[44px] sm:min-h-auto">
                    <MessageSquare className="h-4 w-4" />
                    <span className="hidden sm:inline">Comments</span>
                    {selectedTaskForDetail.comments && selectedTaskForDetail.comments.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full dark:bg-blue-900 dark:text-blue-200">
                        {selectedTaskForDetail.comments.length}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid gap-4">
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
                
                <TabsContent value="comments" className="space-y-4">
                  <div className="min-h-[200px]">
                    <TaskComments
                      taskId={selectedTaskForDetail.id}
                      user={user}
                      comments={selectedTaskForDetail.comments || []}
                      onCommentAdded={(comments) => handleAddTaskComment(selectedTaskForDetail.id, comments)}
                      language="en"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MediaBuyerTasksPage; 