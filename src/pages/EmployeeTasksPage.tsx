import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckSquare, Loader2, Star, Search, Filter } from 'lucide-react';
import TaskComments from '@/components/TaskComments';
import StarRating from '@/components/StarRating';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchUserTasks, updateTaskProgress, sendNotification } from '@/lib/tasksApi';
import { getTaskAverageRating, getLatestTaskRating } from '@/lib/ratingsApi';
import { toast } from 'sonner';

// Enhanced Task interface with creator, rating, priority and project type information
interface EnhancedTask {
  id: string;
  title: string;
  description: string;
  status: 'Not Started' | 'On Hold' | 'In Progress' | 'Complete';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  projectType?: 'social-media' | 'web-design' | 'branding' | 'print' | 'ui-ux' | 'other';
  assignedTo: string;
  assignedToName?: string;
  assignedToPosition?: string;
  createdBy: string;
  createdByName?: string;
  createdByPosition?: string;
  createdAt: Date;
  updatedAt: Date;
  progressPercentage: number;
  comments?: any[];
  averageRating?: number;
  latestRating?: any;
}

// Mock comments data for fallback
const mockComments = [{
  id: 'd4e5f6g7-h8i9-4d4e-1f2g-3h4i5j6k7l8',
  userId: '1',
  userName: 'Admin User',
  text: 'Please complete this task by Friday.',
  createdAt: '2023-05-15T09:30:00Z'
}];

const EmployeeTasksPage = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<EnhancedTask | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState("");
  const [language, setLanguage] = useState(() => localStorage.getItem('preferredLanguage') || 'en');
  const [taskComments, setTaskComments] = useState<Record<string, any[]>>({});
  const [progressType, setProgressType] = useState<'preset' | 'custom'>('preset');
  const [customProgress, setCustomProgress] = useState<number>(0);
  const [tasks, setTasks] = useState<EnhancedTask[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<EnhancedTask[]>([]);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  // Fetch tasks when component mounts or user changes
  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

  // Filter tasks based on search and filter criteria
  useEffect(() => {
    filterTasks();
  }, [tasks, searchQuery, filterStatus, filterPriority]);

  const filterTasks = () => {
    let filtered = [...tasks];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.createdByName?.toLowerCase().includes(query) ||
        task.assignedToName?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }

    // Priority filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    setFilteredTasks(filtered);
  };

  const loadTasks = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const userTasks = await fetchUserTasks(user.id);
      
      // Load rating data for each task
      const tasksWithRatings = await Promise.all(
        userTasks.map(async (task: any) => {
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
      
      // Initialize comments for each task
      const initialComments: Record<string, any[]> = {};
      tasksWithRatings.forEach(task => {
        initialComments[task.id] = task.comments || [];
      });
      setTaskComments(initialComments);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to identify Media Buyer to Designer assignments
  const isMediaBuyerToDesignerTask = (task: EnhancedTask) => {
    return task.createdByPosition === 'Media Buyer' && task.assignedToPosition === 'Designer';
  };

  // Helper functions for priority and project type display with modern design
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

  // Status badge color variants with modern design
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complete':
        return 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl ring-2 ring-green-500/20';
      case 'In Progress':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl ring-2 ring-blue-500/20';
      case 'On Hold':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg hover:shadow-xl ring-2 ring-yellow-500/20';
      default:
        return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg hover:shadow-xl ring-2 ring-gray-400/20';
    }
  };
  
  if (!user) return null;
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-gray-600">Loading your tasks...</p>
        </div>
      </div>;
  }
  
  const handleOpenTask = (task: EnhancedTask) => {
    setSelectedTask(task);
    setProgressType('preset');
    setCustomProgress(task.progressPercentage);
    setIsDialogOpen(true);
  };
  
  const handleUpdateProgress = async (taskId: string, newProgress: number) => {
    setIsLoading(true);
    try {
      await updateTaskProgress(taskId, newProgress, user.id);
      
      // Update the tasks in local state
      const updatedTasks = tasks.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            progressPercentage: newProgress,
            status: newProgress === 0 ? 'Not Started' : 
                   newProgress === 100 ? 'Complete' : 
                   'In Progress'
          } as EnhancedTask;
        }
        return task;
      });
      setTasks(updatedTasks);

      // Update the selected task with the new progress
      if (selectedTask) {
        setSelectedTask({
          ...selectedTask,
          progressPercentage: newProgress,
          status: newProgress === 0 ? 'Not Started' : 
                 newProgress === 100 ? 'Complete' : 
                 'In Progress'
        });
      }

      setUpdateStatus("Progress updated successfully");
      toast.success("Task progress updated successfully");
      
      // Close the dialog after successful update
      setIsDialogOpen(false);
      setSelectedTask(null);
      
      // Refresh tasks to ensure consistency
      loadTasks();
    } catch (error) {
      console.error("Error updating task progress:", error);
      toast.error("Failed to update task progress");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCommentAdded = (taskId: string, newComments: any[]) => {
    setTaskComments(prev => ({
      ...prev,
      [taskId]: newComments
    }));
  };
  
  const handleCustomProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setCustomProgress(isNaN(value) ? 0 : Math.max(0, Math.min(100, value)));
  };
  
  const handleApplyCustomProgress = () => {
    if (selectedTask) {
      handleUpdateProgress(selectedTask.id, customProgress);
    }
  };

  // Progress preset values with more granular options
  const progressPresets = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 w-full max-w-full overflow-x-hidden">
      {/* Enhanced mobile-optimized header - Non-sticky, responsive layout */}
      <div className="border-b border-border/50 bg-background/98 w-full">
        <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6 w-full max-w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
            <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight flex items-center gap-2">
                <CheckSquare className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
                My Tasks
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">Track and update your assigned tasks and progress</p>
            </div>
            
            {/* Task summary stats */}
            {tasks.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-bold text-blue-600">{tasks.length}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-bold text-orange-600">
                    {tasks.filter(t => t.status === 'In Progress').length}
                  </div>
                  <div className="text-xs text-muted-foreground">In Progress</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-bold text-green-600">
                    {tasks.filter(t => t.status === 'Complete').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Complete</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-bold text-red-600">
                    {tasks.filter(t => t.priority === 'urgent').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Urgent</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile-Optimized Filters */}
      <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-border/30">
        <div className="space-y-3">
          {/* Search */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search tasks, descriptions, or assignee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>

          {/* Mobile-Responsive Filters */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* First row of filters */}
            <div className="flex gap-2 flex-1">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="flex-1 min-w-0 h-10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Not Started">Not Started</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                  <SelectItem value="Complete">Complete</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="flex-1 min-w-0 h-10">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">🔴 Urgent</SelectItem>
                  <SelectItem value="high">🟠 High</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="low">🟢 Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>
        </div>
      </div>

      <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 space-y-6 sm:space-y-8 md:space-y-10 w-full max-w-full overflow-x-hidden">
        {/* Mobile-responsive task cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <CheckSquare className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-medium text-gray-700 mb-2">No tasks found</h3>
              <p className="text-sm sm:text-base text-gray-500">
                {tasks.length === 0 
                  ? "You don't have any tasks assigned at the moment."
                  : "Try adjusting your filters to see more tasks."
                }
              </p>
            </div>
          ) :
            filteredTasks.map((task) => (
              <Card 
                key={task.id} 
                className={`p-3 sm:p-4 border shadow-sm transition-all hover:shadow-md ${
                  isMediaBuyerToDesignerTask(task) 
                    ? "bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-l-purple-500 dark:from-purple-900/20 dark:to-pink-900/20 dark:border-l-purple-400" 
                    : ""
                }`}
              >
                <div className="space-y-3">
                  {/* Task header */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base sm:text-lg mb-1 break-words overflow-wrap-anywhere">{task.title}</h3>
                      
                      {/* Task metadata badges */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {isMediaBuyerToDesignerTask(task) && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            📊 Media Buyer → Designer
                          </span>
                        )}
                        

                        
                        {task.priority && (
                          <span className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 transform hover:scale-105 ${getPriorityColor(task.priority)}`}>
                            {getPriorityDisplay(task.priority)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <span className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 transform hover:scale-105 ${getStatusColor(task.status)} w-fit`}>
                        {task.status}
                      </span>
                    </div>
                  </div>

                  {/* Task description */}
                  <p className="text-sm sm:text-base text-muted-foreground line-clamp-2 sm:line-clamp-3 break-words overflow-wrap-anywhere">
                    {task.description}
                  </p>

                  {/* Progress section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-medium">Progress</span>
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {task.progressPercentage}%
                      </span>
                    </div>
                    <Progress value={task.progressPercentage} className="h-2" />
                  </div>

                  {/* Task metadata */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm text-muted-foreground border-t pt-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                      <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                      {isMediaBuyerToDesignerTask(task) && (
                        <span className="text-purple-600 dark:text-purple-400">
                          By: {task.createdByName}
                        </span>
                      )}
                    </div>
                    
                    {/* Rating display */}
                    {task.averageRating && task.averageRating > 0 && (
                      <div className="flex items-center gap-2">
                        <StarRating 
                          rating={task.averageRating} 
                          readonly 
                          size="sm" 
                          spacing="tight"
                        />
                        <span className="text-xs text-muted-foreground">
                          ({task.averageRating.toFixed(1)})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action button */}
                  <Button
                    onClick={() => handleOpenTask(task)}
                    className="w-full sm:w-auto min-h-[44px] text-sm sm:text-base"
                    variant="outline"
                  >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    View & Update Task
                  </Button>
                </div>
              </Card>
            ))
          }
        </div>

        {/* Mobile-optimized task dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="w-[95vw] max-w-[90vw] sm:max-w-[600px] lg:max-w-4xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
            {selectedTask && (
              <>
                <DialogHeader className="pb-4">
                  <DialogTitle className="text-base sm:text-lg lg:text-xl pr-8 break-words overflow-wrap-anywhere">
                    {selectedTask.title}
                  </DialogTitle>
                  
                  {/* Task metadata in dialog */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTask.priority && (
                      <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 transform hover:scale-105 ${getPriorityColor(selectedTask.priority)}`}>
                        {getPriorityDisplay(selectedTask.priority)}
                      </span>
                    )}
                    
                    {isMediaBuyerToDesignerTask(selectedTask) && (
                      <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                        📊 Media Buyer → Designer
                      </Badge>
                    )}
                  </div>
                  
                  <DialogDescription className="text-sm sm:text-base break-words overflow-wrap-anywhere">
                    {selectedTask.description}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 sm:space-y-6">
                  {/* Mobile-responsive task info */}
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs sm:text-sm font-medium text-muted-foreground">Status</label>
                      <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 transform hover:scale-105 ${getStatusColor(selectedTask.status)} self-start`}>
                        {selectedTask.status}
                      </span>
                    </div>
                    
                    {selectedTask.priority && (
                      <div className="flex flex-col gap-2">
                        <label className="text-xs sm:text-sm font-medium text-muted-foreground">Priority</label>
                        <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 transform hover:scale-105 ${getPriorityColor(selectedTask.priority)} self-start`}>
                          {getPriorityDisplay(selectedTask.priority)}
                        </span>
                      </div>
                    )}
                    
                    <div className="sm:col-span-2">
                      <label className="text-xs sm:text-sm font-medium text-muted-foreground">Current Progress</label>
                      <div className="flex items-center gap-2 mt-2">
                        <Progress value={selectedTask.progressPercentage} className="flex-1 h-2.5 sm:h-3" />
                        <span className="text-xs sm:text-sm font-medium min-w-[40px]">{selectedTask.progressPercentage}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress update - Enhanced for mobile */}
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-3 text-sm sm:text-base">Update Progress</h3>
                    <div className="space-y-4">
                      <RadioGroup 
                        value={progressType} 
                        onValueChange={(value) => setProgressType(value as 'preset' | 'custom')}
                        className="flex flex-col sm:flex-row gap-3 sm:gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="preset" id="preset" />
                          <Label htmlFor="preset" className="text-sm">Quick select</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="custom" id="custom" />
                          <Label htmlFor="custom" className="text-sm">Custom value</Label>
                        </div>
                      </RadioGroup>

                      {progressType === 'preset' ? (
                        <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-7 gap-2">
                          {progressPresets.map((preset) => (
                            <Button
                              key={preset}
                              variant={customProgress === preset ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCustomProgress(preset)}
                              className="min-h-[44px] text-xs sm:text-sm"
                            >
                              {preset}%
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label htmlFor="customProgress" className="text-sm">Progress Percentage</Label>
                          <Input
                            id="customProgress"
                            type="number"
                            min="0"
                            max="100"
                            value={customProgress}
                            onChange={(e) => setCustomProgress(parseInt(e.target.value) || 0)}
                            placeholder="Enter percentage (0-100)"
                            className="min-h-[44px] text-base"
                          />
                        </div>
                      )}

                      <Button
                        onClick={handleApplyCustomProgress}
                        disabled={isLoading}
                        className="w-full sm:w-auto min-h-[44px] text-sm sm:text-base"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          'Update Progress'
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Comments section - Enhanced for mobile */}
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-3 text-sm sm:text-base">Comments</h3>
                    <TaskComments
                      taskId={selectedTask.id}
                      user={user}
                      comments={taskComments[selectedTask.id] || []}
                      onCommentAdded={(comments) => handleCommentAdded(selectedTask.id, comments)}
                      language={language}
                    />
                  </div>

                  {/* Task metadata - Enhanced for mobile */}
                  <div className="border-t pt-4 space-y-3 text-sm text-muted-foreground">
                    <div className="grid gap-2 sm:gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="font-medium">Created:</span> 
                        <span>{new Date(selectedTask.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="font-medium">Last Updated:</span> 
                        <span>{new Date(selectedTask.updatedAt).toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="font-medium">Created By:</span> 
                        <span>{selectedTask.createdByName}</span>
                      </div>
                      {selectedTask.averageRating && selectedTask.averageRating > 0 && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className="font-medium">Average Rating:</span>
                          <div className="flex items-center gap-2">
                            <StarRating 
                              rating={selectedTask.averageRating} 
                              readonly 
                              size="sm" 
                              spacing="tight"
                            />
                            <span className="text-muted-foreground">
                              ({selectedTask.averageRating.toFixed(1)})
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default EmployeeTasksPage;
