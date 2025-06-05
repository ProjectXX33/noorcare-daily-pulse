import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Calendar,
  Plus,
  CheckSquare,
  User,
  Clock,
  AlertCircle,
  PenTool,
  Eye,
  MessageSquare
} from 'lucide-react';
import { eventService, Event } from '@/services/eventService';
import { createTask, fetchAllTasks, updateTask } from '@/lib/tasksApi';
import { Task } from '@/types';
import { fetchEmployees } from '@/lib/employeesApi';
import { User as Employee } from '@/types';
import { playNotificationSound } from '@/lib/notifications';
import TaskComments from '@/components/TaskComments';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { supabase } from '@/lib/supabase';
import { useLocation } from 'react-router-dom';

const MediaBuyerTasksPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [designers, setDesigners] = useState<Employee[]>([]);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isTaskDetailDialogOpen, setIsTaskDetailDialogOpen] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Event form state
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    start: new Date().toISOString().slice(0, 16),
    end: ''
  });

  // Task form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    status: 'Not Started' as 'Not Started' | 'On Hold' | 'In Progress' | 'Complete',
    progressPercentage: 0
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // Handle notification navigation to specific task
    if (location.state?.taskId && tasks.length > 0) {
      const targetTask = tasks.find(task => task.id === location.state.taskId);
      if (targetTask && targetTask.createdBy === user?.id) {
        // Only open if it's a task assigned by this Media Buyer
        openTaskDetail(targetTask);
        // Clear the state to prevent reopening on re-renders
        window.history.replaceState({}, document.title);
      }
    }
  }, [location, tasks, user?.id]);

  useEffect(() => {
    // Subscribe to task updates for real-time status changes
    const taskSubscription = supabase
      .channel('tasks-updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'tasks'
        }, 
        (payload) => {
          console.log('Task updated:', payload);
          // Use debounced refresh to prevent rapid multiple refreshes
          debouncedRefreshTaskData();
        }
      )
      .subscribe();

    return () => {
      taskSubscription.unsubscribe();
    };
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [eventsData, tasksData, employeesData] = await Promise.all([
        eventService.getEvents(),
        fetchAllTasks(),
        fetchEmployees()
      ]);

      setEvents(eventsData);
      setTasks(tasksData);
      // Filter only designers
      setDesigners(employeesData.filter(emp => emp.position === 'Designer'));
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user has access (Media Buyer or Admin)
  if (!user || (user.position !== 'Media Buyer' && user.role !== 'admin')) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-4 sm:p-6 text-center">
            <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-yellow-500 mx-auto mb-3 sm:mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">Access Restricted</h2>
            <p className="text-sm sm:text-base text-gray-500">
              This functionality is only available for Media Buyers and Administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleEventClick = (info: any) => {
    const event = events.find(e => e.id === info.event.id);
    if (event) {
      setSelectedEvent(event);
      setEventForm({
        title: event.title,
        description: event.description || '',
        start: event.start,
        end: event.end || ''
      });
      setIsEventDialogOpen(true);
    }
  };

  const handleDateClick = (info: any) => {
    setSelectedEvent(null);
    setEventForm({
      title: '',
      description: '',
      start: info.dateStr,
      end: ''
    });
    setIsEventDialogOpen(true);
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      if (selectedEvent) {
        // Update existing event
        const updatedEvent = await eventService.updateEvent(selectedEvent.id, {
          ...eventForm,
          created_by: user.id,
        });
        setEvents(prev => prev.map(event => 
          event.id === selectedEvent.id ? updatedEvent : event
        ));
        toast.success('Event updated successfully');
      } else {
        // Create new event
        const newEvent = await eventService.createEvent({
          ...eventForm,
          created_by: user.id,
        } as Event);
        setEvents(prev => [...prev, newEvent]);
        toast.success('Event created successfully');
      }
      setIsEventDialogOpen(false);
      resetEventForm();
      playNotificationSound();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Error saving event');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !taskForm.assignedTo) return;

    setIsLoading(true);
    try {
      await createTask({
        title: taskForm.title,
        description: taskForm.description,
        assignedTo: taskForm.assignedTo,
        status: taskForm.status,
        progressPercentage: taskForm.progressPercentage,
        createdBy: user.id
      });

      toast.success('Task assigned to designer successfully');
      setIsTaskDialogOpen(false);
      resetTaskForm();
      playNotificationSound();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Error creating task');
    } finally {
      setIsLoading(false);
    }
  };

  const resetEventForm = () => {
    setEventForm({
      title: '',
      description: '',
      start: new Date().toISOString().slice(0, 16),
      end: ''
    });
    setSelectedEvent(null);
  };

  const resetTaskForm = () => {
    setTaskForm({
      title: '',
      description: '',
      assignedTo: '',
      status: 'Not Started',
      progressPercentage: 0
    });
  };

  const getTasksAssignedByUser = () => {
    return tasks.filter(task => task.createdBy === user?.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complete': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'On Hold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openTaskDetail = (task: Task) => {
    setSelectedTaskForDetail(task);
    setIsTaskDetailDialogOpen(true);
  };

  const refreshTaskData = useCallback(async () => {
    try {
      const tasksData = await fetchAllTasks();
      setTasks(tasksData);
    } catch (error) {
      console.error('Error refreshing tasks:', error);
    }
  }, []);

  // Debounced version to prevent rapid multiple refreshes
  const debouncedRefreshTaskData = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(refreshTaskData, 300); // 300ms debounce
    };
  }, [refreshTaskData]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Media Buyer Dashboard</h1>
          <p className="text-gray-600">Manage calendar events and assign tasks to designers</p>
        </div>
      </div>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar & Events
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Design Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Calendar Management
              </CardTitle>
              <Button onClick={() => setIsEventDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </CardHeader>
            <CardContent>
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                events={events}
                editable={true}
                eventClick={handleEventClick}
                dateClick={handleDateClick}
                height="auto"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth'
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <PenTool className="h-5 w-5" />
                Assign Tasks to Designers
              </CardTitle>
              <Button onClick={() => setIsTaskDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Assign Task
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {getTasksAssignedByUser().length === 0 ? (
                  <div className="text-center py-8">
                    <CheckSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">No tasks assigned yet</p>
                    <p className="text-sm text-gray-400">Start by assigning tasks to designers</p>
                  </div>
                ) : (
                  getTasksAssignedByUser().map((task) => (
                    <Card key={task.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{task.title}</h3>
                        <Badge className={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                      <div className="flex justify-between items-center text-sm mb-3">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>Assigned to: {task.assignedToName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {task.progressPercentage !== undefined && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Progress</span>
                            <span>{task.progressPercentage}%</span>
                          </div>
                          <Progress value={task.progressPercentage} className="h-2" />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openTaskDetail(task)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        {(task.comments && task.comments.length > 0) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openTaskDetail(task)}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            {task.comments.length}
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Event Dialog */}
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent ? 'Edit Event' : 'Create New Event'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEventSubmit} className="space-y-4">
            <div>
              <Label htmlFor="event-title">Title</Label>
              <Input
                id="event-title"
                value={eventForm.title}
                onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={eventForm.description}
                onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="event-start">Start Date & Time</Label>
              <Input
                id="event-start"
                type="datetime-local"
                value={eventForm.start}
                onChange={(e) => setEventForm(prev => ({ ...prev, start: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="event-end">End Date & Time (Optional)</Label>
              <Input
                id="event-end"
                type="datetime-local"
                value={eventForm.end}
                onChange={(e) => setEventForm(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEventDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : (selectedEvent ? 'Update Event' : 'Create Event')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Assignment Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Task to Designer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTaskSubmit} className="space-y-4">
            <div>
              <Label htmlFor="task-title">Task Title</Label>
              <Input
                id="task-title"
                value={taskForm.title}
                onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={taskForm.description}
                onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the design task in detail..."
              />
            </div>
            <div>
              <Label htmlFor="task-designer">Assign to Designer</Label>
              <Select
                value={taskForm.assignedTo}
                onValueChange={(value) => setTaskForm(prev => ({ ...prev, assignedTo: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a designer" />
                </SelectTrigger>
                <SelectContent>
                  {designers.map((designer) => (
                    <SelectItem key={designer.id} value={designer.id}>
                      {designer.name} - {designer.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="task-status">Initial Status</Label>
              <Select
                value={taskForm.status}
                onValueChange={(value) => setTaskForm(prev => ({ 
                  ...prev, 
                  status: value as 'Not Started' | 'On Hold' | 'In Progress' | 'Complete'
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Started">Not Started</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTaskDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !taskForm.assignedTo}>
                {isLoading ? 'Assigning...' : 'Assign Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Detail Dialog */}
      <Dialog open={isTaskDetailDialogOpen} onOpenChange={setIsTaskDetailDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Task Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedTaskForDetail && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="comments" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comments
                  {selectedTaskForDetail.comments && selectedTaskForDetail.comments.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {selectedTaskForDetail.comments.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Task Title</Label>
                    <div className="p-3 bg-gray-50 rounded-md dark:bg-gray-800">
                      {selectedTaskForDetail.title}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Description</Label>
                    <div className="p-3 bg-gray-50 rounded-md dark:bg-gray-800">
                      {selectedTaskForDetail.description}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Assigned To</Label>
                      <div className="p-3 bg-gray-50 rounded-md dark:bg-gray-800 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {selectedTaskForDetail.assignedToName}
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
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progress</span>
                        <span>{selectedTaskForDetail.progressPercentage}%</span>
                      </div>
                      <Progress value={selectedTaskForDetail.progressPercentage} className="h-3" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Created</Label>
                      <div className="p-3 bg-gray-50 rounded-md dark:bg-gray-800 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {new Date(selectedTaskForDetail.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Last Updated</Label>
                      <div className="p-3 bg-gray-50 rounded-md dark:bg-gray-800 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {new Date(selectedTaskForDetail.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="comments" className="space-y-4 mt-4">
                {user && selectedTaskForDetail && (
                  <TaskComments
                    taskId={selectedTaskForDetail.id}
                    user={user}
                    comments={selectedTaskForDetail.comments || []}
                    onCommentAdded={(newComments) => {
                      // Update the task comments in the local state
                      setTasks(tasks.map(task => 
                        task.id === selectedTaskForDetail.id 
                          ? {...task, comments: newComments} 
                          : task
                      ));
                      // Also update the selected task for detail
                      setSelectedTaskForDetail({...selectedTaskForDetail, comments: newComments});
                      // Refresh task data to get latest updates
                      debouncedRefreshTaskData();
                    }}
                    language="en"
                  />
                )}
              </TabsContent>
            </Tabs>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTaskDetailDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MediaBuyerTasksPage; 