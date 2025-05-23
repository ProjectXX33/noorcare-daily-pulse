import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckSquare, Loader2 } from 'lucide-react';
import TaskComments from '@/components/TaskComments';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { fetchUserTasks, updateTaskProgress, sendNotification } from '@/lib/tasksApi';
import { toast } from 'sonner';

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
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState("");
  const [language, setLanguage] = useState(() => localStorage.getItem('preferredLanguage') || 'en');
  const [taskComments, setTaskComments] = useState<Record<string, any[]>>({});
  const [progressType, setProgressType] = useState<'preset' | 'custom'>('preset');
  const [customProgress, setCustomProgress] = useState<number>(0);
  const [tasks, setTasks] = useState<any[]>([]);

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
      setTasks(userTasks);
      
      // Initialize comments for each task
      const initialComments: Record<string, any[]> = {};
      userTasks.forEach(task => {
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
  
  const handleOpenTask = (task: any) => {
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
          };
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
  
  return <div className="space-y-6 p-2 sm:p-4">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold mb-2">My Tasks</h1>
        <p className="text-muted-foreground">
          View and manage your assigned tasks
        </p>
      </div>
      
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {tasks.length > 0 ? tasks.map(task => <Card key={task.id} className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{task.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {task.description}
                  </p>
                </div>
                <Badge className={`${getStatusColor(task.status)} ml-4`}>
                  {task.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{task.progressPercentage}%</span>
                  </div>
                  <Progress value={task.progressPercentage} className="h-2" />
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <div className="text-xs text-muted-foreground">
                    Updated: {new Date(task.updatedAt).toLocaleDateString()}
                  </div>
                  <Button variant="outline" onClick={() => handleOpenTask(task)}>
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>) : <Card>
            <CardContent className="p-8 text-center">
              <CheckSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
              <p className="text-lg font-medium mb-2">No tasks assigned yet</p>
              <p className="text-sm text-muted-foreground">
                When you are assigned tasks, they will appear here.
              </p>
            </CardContent>
          </Card>}
      </div>
      
      {/* Task details dialog - Fixed size and responsive */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {selectedTask && <DialogContent className="w-[90vw] max-w-[500px] md:max-w-[600px] h-auto max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">{selectedTask.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                <Badge className={getStatusColor(selectedTask.status)}>
                  {selectedTask.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Created: {new Date(selectedTask.createdAt).toLocaleDateString()}
                </span>
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedTask.description}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Progress</h3>
                <div className="flex items-center gap-4">
                  <Progress value={selectedTask.progressPercentage} className="h-2 flex-1" />
                  <span className="text-sm font-medium">{selectedTask.progressPercentage}%</span>
                </div>
                
                <div className="mt-4 space-y-4">
                  <RadioGroup value={progressType} onValueChange={value => setProgressType(value as 'preset' | 'custom')} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="preset" id="preset" />
                      <Label htmlFor="preset">Use preset values</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="custom" />
                      <Label htmlFor="custom">Set custom value</Label>
                    </div>
                  </RadioGroup>
                  
                  {progressType === 'preset' ? <div className="flex flex-wrap gap-2 mt-3">
                      {progressPresets.map(progress => <Button key={progress} variant="outline" size="sm" onClick={() => handleUpdateProgress(selectedTask.id, progress)} className={selectedTask.progressPercentage === progress ? 'border-primary text-primary dark:border-primary dark:text-primary' : ''} disabled={isLoading}>
                          {progress}%
                        </Button>)}
                    </div> : <div className="flex items-center gap-2">
                      <Input type="number" min="0" max="100" value={customProgress} onChange={handleCustomProgressChange} className="w-24" disabled={isLoading} />
                      <span>%</span>
                      <Button onClick={handleApplyCustomProgress} size="sm" disabled={isLoading}>
                        {isLoading ? <span className="flex items-center">
                            <span className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></span>
                            Updating...
                          </span> : 'Apply'}
                      </Button>
                    </div>}
                </div>
                
                {updateStatus && <p className="text-xs text-green-600 dark:text-green-400 mt-2">{updateStatus}</p>}
              </div>
              
              <div>
                <TaskComments 
                  taskId={selectedTask.id} 
                  user={user} 
                  comments={taskComments[selectedTask.id] || []} 
                  onCommentAdded={newComments => handleCommentAdded(selectedTask.id, newComments)} 
                  language={language} 
                />
              </div>
            </div>
          </DialogContent>}
      </Dialog>
    </div>;
};

export default EmployeeTasksPage;
