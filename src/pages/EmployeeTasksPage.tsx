import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckSquare, Loader2, Star } from 'lucide-react';
import TaskComments from '@/components/TaskComments';
import StarRating from '@/components/StarRating';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { fetchUserTasks, updateTaskProgress, sendNotification } from '@/lib/tasksApi';
import { getTaskAverageRating, getLatestTaskRating } from '@/lib/ratingsApi';
import { toast } from 'sonner';

// Enhanced Task interface with creator and rating information
interface EnhancedTask {
  id: string;
  title: string;
  description: string;
  status: 'Not Started' | 'On Hold' | 'In Progress' | 'Complete';
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

  // Fetch tasks when component mounts or user changes
  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

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

  // Status badge color variants
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complete':
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900/30';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900/30';
      case 'On Hold':
        return 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900/30';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700';
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
      
      // Refresh tasks after a short delay
      setTimeout(() => {
        loadTasks();
      }, 1000);
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
    <div className="space-y-4 md:space-y-6">
      {/* Mobile-optimized header */}
      <div className="flex flex-col">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">
          My Tasks
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Track and update your assigned tasks and progress
        </p>
      </div>

      {/* Mobile-responsive task cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1">
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <CheckSquare className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-medium text-gray-700 mb-2">No tasks assigned</h3>
            <p className="text-sm sm:text-base text-gray-500">
              You don't have any tasks assigned at the moment.
            </p>
          </div>
        ) : (
          tasks.map((task) => (
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
                  <div className="flex-1">
                    <h3 className="font-semibold text-base sm:text-lg mb-1">{task.title}</h3>
                    {isMediaBuyerToDesignerTask(task) && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          📊 Media Buyer → Designer
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <Badge 
                      variant="outline" 
                      className={`${getStatusColor(task.status)} text-xs sm:text-sm px-2 py-1 w-fit`}
                    >
                      {task.status}
                    </Badge>
                  </div>
                </div>

                {/* Task description */}
                <p className="text-sm sm:text-base text-muted-foreground line-clamp-2 sm:line-clamp-3">
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
                    <div className="flex items-center gap-1">
                      <StarRating rating={task.averageRating} readonly size="sm" />
                      <span className="text-xs">({task.averageRating.toFixed(1)})</span>
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
        )}
      </div>

      {/* Mobile-optimized task dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedTask && (
            <>
              <DialogHeader className="pb-4">
                <DialogTitle className="text-lg sm:text-xl pr-8">
                  {selectedTask.title}
                </DialogTitle>
                <DialogDescription className="text-sm sm:text-base">
                  Update your task progress and add comments
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 sm:space-y-6">
                {/* Mobile-responsive task info */}
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Status</label>
                    <Badge 
                      variant="outline" 
                      className={`${getStatusColor(selectedTask.status)} mt-1 text-xs sm:text-sm`}
                    >
                      {selectedTask.status}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Current Progress</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={selectedTask.progressPercentage} className="flex-1 h-2" />
                      <span className="text-xs sm:text-sm font-medium">{selectedTask.progressPercentage}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-sm sm:text-base mt-1 p-3 bg-muted rounded-lg">
                    {selectedTask.description}
                  </p>
                </div>

                {/* Mobile-responsive progress update */}
                <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 border rounded-lg">
                  <h4 className="font-medium text-sm sm:text-base">Update Progress</h4>
                  
                  <RadioGroup value={progressType} onValueChange={(value) => setProgressType(value as 'preset' | 'custom')}>
                    <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="preset" id="preset" />
                        <Label htmlFor="preset" className="text-xs sm:text-sm">Quick Update</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="custom" id="custom" />
                        <Label htmlFor="custom" className="text-xs sm:text-sm">Custom Progress</Label>
                      </div>
                    </div>
                  </RadioGroup>

                  {progressType === 'preset' ? (
                    <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                      {[0, 25, 50, 75, 100].map((progress) => (
                        <Button
                          key={progress}
                          variant={selectedTask.progressPercentage === progress ? "default" : "outline"}
                          onClick={() => handleUpdateProgress(selectedTask.id, progress)}
                          disabled={isLoading}
                          className="h-12 sm:h-10 text-xs sm:text-sm"
                        >
                          {progress}%
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={customProgress}
                          onChange={handleCustomProgressChange}
                          className="w-20 text-sm"
                        />
                        <span className="text-xs sm:text-sm">%</span>
                        <Progress value={customProgress} className="flex-1 h-2" />
                      </div>
                      <Button
                        onClick={handleApplyCustomProgress}
                        disabled={isLoading}
                        className="w-full sm:w-auto min-h-[44px] text-sm"
                      >
                        Update to {customProgress}%
                      </Button>
                    </div>
                  )}
                </div>

                {/* Mobile-responsive comments section */}
                {user && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm sm:text-base">Comments & Discussion</h4>
                    <TaskComments
                      taskId={selectedTask.id}
                      user={user}
                      comments={taskComments[selectedTask.id] || []}
                      onCommentAdded={(newComments) => handleCommentAdded(selectedTask.id, newComments)}
                      language={language}
                    />
                  </div>
                )}

                {/* Update status display */}
                {updateStatus && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    {updateStatus}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeTasksPage;
